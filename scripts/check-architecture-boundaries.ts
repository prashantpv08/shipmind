import { readdir, readFile } from 'node:fs/promises';
import { posix, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

export type RouteClass = 'auth' | 'platform' | 'legacy';

export type ArchitectureFile = {
  path: string;
  content: string;
};

export type ArchitectureViolation = {
  code: 'BANNED_PACKAGE' | 'BFF_LEGACY_IMPORT' | 'BLOB_IMPORT_LOCATION' | 'HANDWRITTEN_PLATFORM_CONTRACT' | 'RAW_PLATFORM_ENDPOINT' | 'UNCLASSIFIED_ROUTE' | 'UNPINNED_WORKFLOW_ACTION';
  file: string;
  message: string;
};

const ROUTE_NAMESPACES: Record<RouteClass, readonly string[]> = {
  auth: ['app/api/auth'],
  platform: ['app/api/platform'],
  legacy: [
    'app/api/analyze',
    'app/api/artifacts',
    'app/api/code',
    'app/api/demo',
    'app/api/export',
    'app/api/integrations',
    'app/api/projects',
    'app/api/verification',
    'app/api/why',
    'app/api/workspaces',
  ],
};

const LEGACY_IMPORT_ROOTS = [
  'src/projects',
  'src/ai',
  'src/integrations',
  'src/codegen',
  'src/runner',
  'src/db',
] as const;

const BANNED_PACKAGES = ['openai', '@vercel/sandbox'] as const;
const BLOB_IMPORT_ALLOWLIST = new Set([
  'src/demo/reset.ts',
  'src/projects/extract.ts',
  'src/projects/store.ts',
  'src/runner/store.ts',
]);
const SOURCE_EXTENSIONS = /\.(?:[cm]?[jt]sx?)$/;
const WORKFLOW_FILE = /^\.github\/workflows\/.*\.ya?ml$/;
const WORKFLOW_ACTION = /^\s*-?\s*uses:\s*['"]?([^'"\s#]+)/gm;
const PINNED_ACTION = /@[0-9a-fA-F]{40}$/;
const IGNORED_DIRECTORIES = new Set([
  '.git',
  '.next',
  'coverage',
  'node_modules',
  'playwright-report',
  'test-results',
]);

function isPathOrDescendant(path: string, root: string): boolean {
  return path === root || path.startsWith(`${root}/`);
}

export function classifyApiRoute(path: string): RouteClass | undefined {
  const normalized = path.replaceAll('\\', '/');
  for (const routeClass of ['auth', 'platform', 'legacy'] as const) {
    if (ROUTE_NAMESPACES[routeClass].some((root) => isPathOrDescendant(normalized, root))) {
      return routeClass;
    }
  }
  return undefined;
}

function importedModules(file: ArchitectureFile): string[] {
  const kind = file.path.endsWith('.tsx') || file.path.endsWith('.jsx')
    ? ts.ScriptKind.TSX
    : file.path.endsWith('.js') || file.path.endsWith('.mjs') || file.path.endsWith('.cjs')
      ? ts.ScriptKind.JS
      : ts.ScriptKind.TS;
  const source = ts.createSourceFile(file.path, file.content, ts.ScriptTarget.Latest, true, kind);
  const modules: string[] = [];

  function visit(node: ts.Node): void {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node))
      && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      modules.push(node.moduleSpecifier.text);
    } else if (ts.isCallExpression(node)
      && (node.expression.kind === ts.SyntaxKind.ImportKeyword
        || (ts.isIdentifier(node.expression) && node.expression.text === 'require'))
      && node.arguments.length === 1
      && ts.isStringLiteral(node.arguments[0])) {
      modules.push(node.arguments[0].text);
    } else if (ts.isImportTypeNode(node)
      && ts.isLiteralTypeNode(node.argument)
      && ts.isStringLiteral(node.argument.literal)) {
      modules.push(node.argument.literal.text);
    }
    ts.forEachChild(node, visit);
  }

  visit(source);
  return modules;
}

function packageMatches(specifier: string, packageName: string): boolean {
  return specifier === packageName || specifier.startsWith(`${packageName}/`);
}

function normalizedImportTarget(importer: string, specifier: string): string | undefined {
  if (specifier.startsWith('.')) return posix.normalize(posix.join(posix.dirname(importer), specifier));
  if (specifier.startsWith('@/')) return specifier.slice(2);
  if (specifier.startsWith('src/')) return specifier;
  return undefined;
}

function packageJsonViolations(file: ArchitectureFile): ArchitectureViolation[] {
  if (file.path !== 'package.json') return [];
  const parsed = JSON.parse(file.content) as Record<string, unknown>;
  const dependencyGroups = ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies'];
  return dependencyGroups.flatMap((group) => {
    const dependencies = parsed[group];
    if (!dependencies || typeof dependencies !== 'object') return [];
    return BANNED_PACKAGES.flatMap((packageName) => packageName in dependencies
      ? [{
          code: 'BANNED_PACKAGE' as const,
          file: file.path,
          message: `${packageName} is forbidden in web repository dependencies.`,
        }]
      : []);
  });
}

function lockfileViolations(file: ArchitectureFile): ArchitectureViolation[] {
  if (file.path !== 'pnpm-lock.yaml') return [];
  return BANNED_PACKAGES.flatMap((packageName) => {
    const escapedPackage = packageName.replace('/', '\\/');
    const packageEntry = new RegExp(`^\\s{2,}['\"]?${escapedPackage}(?:@|['\"]?:)`, 'm');
    return packageEntry.test(file.content)
      ? [{
          code: 'BANNED_PACKAGE' as const,
          file: file.path,
          message: `${packageName} is forbidden in the web repository lockfile.`,
        }]
      : [];
  });
}

function workflowViolations(file: ArchitectureFile): ArchitectureViolation[] {
  if (!WORKFLOW_FILE.test(file.path)) return [];
  return [...file.content.matchAll(WORKFLOW_ACTION)].flatMap((match) => {
    const action = match[1];
    if (!action || action.startsWith('./') || PINNED_ACTION.test(action)) return [];
    return [{
      code: 'UNPINNED_WORKFLOW_ACTION' as const,
      file: file.path,
      message: `Workflow action ${action} must be pinned to a full 40-character commit SHA.`,
    }];
  });
}

export function checkArchitectureBoundaries(files: readonly ArchitectureFile[]): ArchitectureViolation[] {
  const violations: ArchitectureViolation[] = [];

  for (const file of files) {
    violations.push(...packageJsonViolations(file));
    violations.push(...lockfileViolations(file));
    violations.push(...workflowViolations(file));
    if (!SOURCE_EXTENSIONS.test(file.path)) continue;

    if (file.path === 'src/platform/contracts.ts') {
      for (const specifier of importedModules(file)) {
        if (!specifier.startsWith('./generated/')) {
          violations.push({
            code: 'HANDWRITTEN_PLATFORM_CONTRACT',
            file: file.path,
            message: `The compatibility contract may import only generated contract modules, not ${specifier}.`,
          });
        }
      }
    }

    if ((file.path.startsWith('src/platform/') || file.path.startsWith('app/api/platform/'))
      && !file.path.startsWith('src/platform/generated/')
      && file.content.includes('/api/v1/')) {
      violations.push({
        code: 'RAW_PLATFORM_ENDPOINT',
        file: file.path,
        message: 'Commercial platform calls must use a generated SDK operation instead of a handwritten API path.',
      });
    }

    const routeClass = /(?:^|\/)app\/api\/.*\/route\.(?:ts|tsx)$/.test(file.path)
      ? classifyApiRoute(file.path)
      : undefined;
    if (file.path.startsWith('app/api/') && /\/route\.(?:ts|tsx)$/.test(file.path) && !routeClass) {
      violations.push({
        code: 'UNCLASSIFIED_ROUTE',
        file: file.path,
        message: 'API route is outside the auth, platform, and approved legacy namespaces.',
      });
    }

    for (const specifier of importedModules(file)) {
      for (const packageName of BANNED_PACKAGES) {
        if (packageMatches(specifier, packageName)) {
          violations.push({
            code: 'BANNED_PACKAGE',
            file: file.path,
            message: `${packageName} imports are forbidden in the web repository.`,
          });
        }
      }

      if (packageMatches(specifier, '@vercel/blob') && !BLOB_IMPORT_ALLOWLIST.has(file.path)) {
        violations.push({
          code: 'BLOB_IMPORT_LOCATION',
          file: file.path,
          message: '@vercel/blob is restricted to the retained legacy migration adapters.',
        });
      }

      if (routeClass === 'auth' || routeClass === 'platform') {
        const target = normalizedImportTarget(file.path, specifier);
        if (target && LEGACY_IMPORT_ROOTS.some((root) => isPathOrDescendant(target, root))) {
          violations.push({
            code: 'BFF_LEGACY_IMPORT',
            file: file.path,
            message: `${routeClass} BFF route imports legacy module ${specifier}.`,
          });
        }
      }
    }
  }

  return violations.sort((left, right) => left.file.localeCompare(right.file)
    || left.code.localeCompare(right.code)
    || left.message.localeCompare(right.message));
}

async function collectArchitectureFiles(root: string, directory = root): Promise<ArchitectureFile[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: ArchitectureFile[] = [];
  for (const entry of entries) {
    if (entry.isDirectory() && IGNORED_DIRECTORIES.has(entry.name)) continue;
    const absolutePath = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      if (relative(root, absolutePath).replaceAll(sep, '/') === 'sandbox/notification-service/workspace') continue;
      files.push(...await collectArchitectureFiles(root, absolutePath));
    } else if (entry.isFile()) {
      const path = relative(root, absolutePath).replaceAll(sep, '/');
      if (SOURCE_EXTENSIONS.test(path) || WORKFLOW_FILE.test(path) || path === 'package.json' || path === 'pnpm-lock.yaml') {
        files.push({ path, content: await readFile(absolutePath, 'utf8') });
      }
    }
  }
  return files;
}

export async function runArchitectureCheck(root = process.cwd()): Promise<ArchitectureViolation[]> {
  return checkArchitectureBoundaries(await collectArchitectureFiles(resolve(root)));
}

async function main(): Promise<void> {
  const violations = await runArchitectureCheck();
  if (violations.length > 0) {
    for (const violation of violations) {
      console.error(`${violation.file}: ${violation.code}: ${violation.message}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log('Architecture boundaries passed: API routes classified and dependency boundaries enforced.');
}

const executedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : undefined;
if (executedPath === import.meta.url) void main();

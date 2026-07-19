import 'server-only';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { lstat, readFile, readdir, rm } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { Sandbox, type CommandFinished } from '@vercel/sandbox';
import { ALLOWED_GENERATED_PATHS, FIXED_TEMPLATE_FILES } from '../codegen/contract';
import type { CodeGenerationOutput } from '../codegen/schemas';
import {
  fixedCommandRegistry,
  fixedHostedCommandRegistry,
  HOSTED_WORKSPACE_ROOT,
  VERIFICATION_ORDER,
  type FixedCommandDefinition,
} from './commands';
import { buildRequirementCoverage, parseCoverageMetrics, parseVitestMetrics } from './parsers';
import { persistVerificationReport } from './store';
import {
  VerificationReport,
  VerificationRequest,
  VerificationRun,
  type VerificationEvidence,
  type VerificationReport as VerificationReportType,
  type VerificationRequest as VerificationRequestType,
  type VerificationRun as VerificationRunType,
} from './schemas';

const MAX_OUTPUT_BYTES = 36_000;
const OUTPUT_HALF = Math.floor(MAX_OUTPUT_BYTES / 2);
const SAFE_ENV_KEYS = ['PATH', 'HOME', 'TMPDIR', 'TEMP', 'TMP', 'LANG', 'LC_ALL', 'TERM', 'SystemRoot'] as const;

type ProcessResult = {
  exitCode: number | null;
  timedOut: boolean;
  error?: string;
  output: string;
};

class BoundedOutput {
  private first = '';
  private tail = '';
  private total = 0;

  append(chunk: Buffer | string) {
    const value = chunk.toString();
    this.total += Buffer.byteLength(value);
    if (Buffer.byteLength(this.first) < OUTPUT_HALF) {
      const remaining = OUTPUT_HALF - Buffer.byteLength(this.first);
      this.first += value.slice(0, remaining);
      this.tail = value.slice(remaining);
    } else {
      this.tail += value;
    }
    if (Buffer.byteLength(this.tail) > OUTPUT_HALF) this.tail = this.tail.slice(-OUTPUT_HALF);
  }

  value() {
    if (this.total <= MAX_OUTPUT_BYTES) return `${this.first}${this.tail}`;
    return `${this.first}\n[... bounded output truncated ...]\n${this.tail}`.slice(0, 40_000);
  }
}

function secretStrippedEnvironment() {
  const environment: Record<string, string | undefined> = {};
  for (const key of SAFE_ENV_KEYS) if (process.env[key]) environment[key] = process.env[key];
  return {
    ...environment,
    CI: '1',
    NO_COLOR: '1',
    FORCE_COLOR: '0',
    NODE_ENV: 'test',
  } as NodeJS.ProcessEnv;
}

function terminate(child: ReturnType<typeof spawn>) {
  if (!child.pid) return;
  try {
    if (process.platform !== 'win32') process.kill(-child.pid, 'SIGKILL');
    else child.kill('SIGKILL');
  } catch {
    child.kill('SIGKILL');
  }
}

async function executeProcess(definition: FixedCommandDefinition): Promise<ProcessResult> {
  return new Promise((resolveResult) => {
    const output = new BoundedOutput();
    let settled = false;
    let timedOut = false;
    const child = spawn(definition.program, definition.args, {
      cwd: definition.cwd,
      env: secretStrippedEnvironment(),
      shell: false,
      windowsHide: true,
      detached: process.platform !== 'win32',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    child.stdout?.on('data', (chunk: Buffer) => output.append(chunk));
    child.stderr?.on('data', (chunk: Buffer) => output.append(chunk));

    const finish = (result: ProcessResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolveResult(result);
    };
    const timer = setTimeout(() => {
      timedOut = true;
      terminate(child);
    }, definition.timeoutMs);
    child.once('error', (cause) => finish({ exitCode: null, timedOut, error: cause.message, output: output.value() }));
    child.once('close', (exitCode) => finish({ exitCode, timedOut, output: output.value() }));
  });
}

function runMetrics(definition: FixedCommandDefinition, result: ProcessResult) {
  if (definition.id === 'unit' || definition.id === 'api') return parseVitestMetrics(result.output);
  if (definition.id === 'build') return { typecheckPassed: result.exitCode === 0 && !result.timedOut };
  return { ...parseVitestMetrics(result.output), coverageParsed: false };
}

export function createVerificationRun(
  definition: FixedCommandDefinition,
  result: ProcessResult,
  startedAt: string,
  durationMs: number,
): VerificationRunType {
  const passed = result.exitCode === 0 && !result.timedOut && !result.error;
  const diagnostic = result.error ? `${result.output}\nRunner error: ${result.error}`.trim() : result.output;
  return VerificationRun.parse({
    id: `RUN-${definition.id.toUpperCase()}-${Date.parse(startedAt)}`,
    commandId: definition.id,
    command: definition.displayCommand,
    startedAt,
    durationMs: Math.max(0, Math.round(durationMs)),
    exitCode: result.exitCode,
    status: passed ? 'passed' : result.error ? 'error' : 'failed',
    truthStatus: passed ? 'TOOL_VERIFIED' : 'FAILED',
    timedOut: result.timedOut,
    rawOutputExcerpt: diagnostic.slice(0, 40_000),
    metrics: runMetrics(definition, result),
  });
}

async function executeFixedCommand(definition: FixedCommandDefinition) {
  const startedAt = new Date().toISOString();
  const started = Date.now();
  const result = await executeProcess(definition);
  return createVerificationRun(definition, result, startedAt, Date.now() - started);
}

function boundedOutput(value: string) {
  const output = new BoundedOutput();
  output.append(value);
  return output.value();
}

function sha256(content: string) {
  return `sha256:${createHash('sha256').update(content).digest('hex')}`;
}

function assertInside(root: string, target: string) {
  const child = relative(root, target);
  if (!child || child.startsWith('..') || child.includes(`..${process.platform === 'win32' ? '\\' : '/'}`)) {
    throw new Error('Verification target escapes the controlled workspace root');
  }
}

async function assertNoSymlinks(path: string): Promise<void> {
  const stat = await lstat(path);
  if (stat.isSymbolicLink()) throw new Error(`Symlinks are not allowed in the verification workspace: ${path}`);
  if (!stat.isDirectory()) return;
  for (const entry of await readdir(path)) await assertNoSymlinks(join(path, entry));
}

async function assertApprovedWorkspace(generation: CodeGenerationOutput) {
  const root = join(/* turbopackIgnore: true */ process.cwd(), 'sandbox/notification-service/workspace');
  await assertNoSymlinks(root);
  for (const file of generation.files) {
    const target = resolve(root, file.path);
    assertInside(root, target);
    const stat = await lstat(target);
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`Generated file is not a regular file: ${file.path}`);
    const content = await readFile(target, 'utf8');
    if (sha256(content) !== file.hash) throw new Error(`Generated workspace hash mismatch: ${file.path}`);
  }
}

function assertApprovedGeneration(generation: CodeGenerationOutput) {
  const allowedPaths = new Set<string>(ALLOWED_GENERATED_PATHS);
  const paths = new Set<string>();
  for (const file of generation.files) {
    if (!allowedPaths.has(file.path)) throw new Error(`Generated file is outside the controlled allowlist: ${file.path}`);
    if (paths.has(file.path)) throw new Error(`Generated workspace contains a duplicate path: ${file.path}`);
    if (sha256(file.content) !== file.hash) throw new Error(`Generated workspace hash mismatch: ${file.path}`);
    paths.add(file.path);
  }
  const manifestHash = sha256(generation.files.map((file) => `${file.id}:${file.hash}`).join('|'));
  if (manifestHash !== generation.manifestHash) throw new Error('Generated workspace manifest hash mismatch');
  if (
    generation.templateFiles.length !== FIXED_TEMPLATE_FILES.length
    || FIXED_TEMPLATE_FILES.some((file) => !generation.templateFiles.includes(file))
  ) {
    throw new Error('Generated workspace does not reference the approved fixed template');
  }
}

async function attachCoverageMetrics(run: VerificationRunType, hostedSummary?: unknown) {
  if (run.commandId !== 'coverage' || run.status !== 'passed') return run;
  const summaryPath = join(/* turbopackIgnore: true */ process.cwd(), 'sandbox/notification-service/workspace/coverage/coverage-summary.json');
  try {
    const summary: unknown = hostedSummary ?? JSON.parse(await readFile(summaryPath, 'utf8'));
    const coverage = parseCoverageMetrics(summary);
    if (!coverage || coverage.lines === null) throw new Error('Coverage summary did not contain numeric line coverage');
    return VerificationRun.parse({
      ...run,
      metrics: {
        ...parseVitestMetrics(run.rawOutputExcerpt),
        coverageParsed: true,
        ...coverage,
        lineThreshold: 80,
        lineThresholdMet: coverage.lines >= 80,
      },
    });
  } catch (cause) {
    return VerificationRun.parse({
      ...run,
      status: 'error',
      truthStatus: 'FAILED',
      rawOutputExcerpt: `${run.rawOutputExcerpt}\nCoverage parser failure: ${cause instanceof Error ? cause.message : String(cause)}`.trim().slice(0, 40_000),
      metrics: { ...run.metrics, coverageParsed: false },
    });
  }
}

async function readFixedTemplate() {
  const root = join(/* turbopackIgnore: true */ process.cwd(), 'sandbox/notification-service/template');
  const [packageJson, tsconfig, vitestConfig] = await Promise.all([
    readFile(join(root, 'package.json'), 'utf8'),
    readFile(join(root, 'tsconfig.json'), 'utf8'),
    readFile(join(root, 'vitest.config.ts'), 'utf8'),
  ]);
  return [
    { path: `${HOSTED_WORKSPACE_ROOT}/package.json`, content: packageJson },
    { path: `${HOSTED_WORKSPACE_ROOT}/tsconfig.json`, content: tsconfig },
    { path: `${HOSTED_WORKSPACE_ROOT}/vitest.config.ts`, content: vitestConfig },
  ];
}

async function sandboxProcessResult(command: CommandFinished): Promise<ProcessResult> {
  return {
    exitCode: command.exitCode,
    timedOut: false,
    output: boundedOutput(await command.output('both')),
  };
}

async function executeHostedCommand(sandbox: Sandbox, definition: FixedCommandDefinition) {
  const startedAt = new Date().toISOString();
  const started = Date.now();
  let result: ProcessResult;
  try {
    const command = await sandbox.runCommand({
      cmd: definition.program,
      args: definition.args,
      cwd: definition.cwd,
      timeoutMs: definition.timeoutMs,
    });
    result = await sandboxProcessResult(command);
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    result = {
      exitCode: null,
      timedOut: /timed?\s*out|timeout/i.test(message),
      error: message,
      output: '',
    };
  }
  return createVerificationRun(definition, result, startedAt, Date.now() - started);
}

async function executeHostedRuns(generation: CodeGenerationOutput) {
  assertApprovedGeneration(generation);
  const sandbox = await Sandbox.create({
    runtime: 'node22',
    resources: { vcpus: 1 },
    timeout: 5 * 60_000,
    networkPolicy: { allow: ['registry.npmjs.org'] },
    env: {
      CI: '1',
      NO_COLOR: '1',
      FORCE_COLOR: '0',
      NODE_ENV: 'test',
    },
  });

  try {
    await sandbox.writeFiles([
      ...await readFixedTemplate(),
      ...generation.files.map((file) => ({
        path: `${HOSTED_WORKSPACE_ROOT}/${file.path}`,
        content: file.content,
      })),
    ]);
    const install = await sandbox.runCommand({
      cmd: 'npm',
      args: ['install', '--no-audit', '--no-fund'],
      cwd: HOSTED_WORKSPACE_ROOT,
      timeoutMs: 30_000,
    });
    if (install.exitCode !== 0) {
      const output = boundedOutput(await install.output('both')).slice(-4_000);
      throw new Error(`Controlled sandbox dependency bootstrap failed with exit code ${install.exitCode}\n${output}`.trim());
    }
    await sandbox.updateNetworkPolicy('deny-all');

    const registry = fixedHostedCommandRegistry();
    const runs: VerificationRunType[] = [];
    for (const id of VERIFICATION_ORDER) {
      const run = await executeHostedCommand(sandbox, registry[id]);
      if (id !== 'coverage' || run.status !== 'passed') {
        runs.push(run);
        continue;
      }
      const coverage = await sandbox.readFileToBuffer({
        path: `${HOSTED_WORKSPACE_ROOT}/coverage/coverage-summary.json`,
      });
      runs.push(await attachCoverageMetrics(run, coverage ? JSON.parse(coverage.toString('utf8')) : undefined));
    }
    return runs;
  } finally {
    await sandbox.stop().catch(() => undefined);
  }
}

function evidenceForRun(run: VerificationRunType, generation: CodeGenerationOutput, createdAt: string): VerificationEvidence {
  const testFile = run.commandId === 'unit'
    ? generation.files.find((file) => file.path.includes('.unit.test.'))
    : run.commandId === 'api'
      ? generation.files.find((file) => file.path.includes('.api.test.'))
      : undefined;
  const type = run.commandId === 'unit' ? 'unit-test' as const : run.commandId === 'api' ? 'api-test' as const : run.commandId;
  const lines = typeof run.metrics.lines === 'number' ? run.metrics.lines : null;
  const claim = run.truthStatus === 'FAILED'
    ? `The fixed ${run.commandId} command did not pass; proof is unavailable for this run.`
    : run.commandId === 'coverage' && lines !== null
      ? `The fixed V8 coverage run measured ${lines}% line coverage for the generated slice.`
      : `The fixed ${run.commandId} command completed with exit code 0.`;
  return {
    id: `EVID-${run.commandId.toUpperCase()}-${Date.parse(createdAt)}`,
    verificationRunId: run.id,
    type,
    truthStatus: run.truthStatus,
    claim,
    measurements: run.metrics,
    linkedEntityIds: testFile
      ? [...testFile.linkedEntityIds, testFile.id]
      : run.commandId === 'coverage'
        ? ['QUAL-001', ...generation.files.filter((file) => file.path.startsWith('tests/')).map((file) => file.id)]
        : generation.files.map((file) => file.id),
    createdAt,
  };
}

async function runOnce(request: VerificationRequestType): Promise<VerificationReportType> {
  const startedAt = new Date().toISOString();
  let runs: VerificationRunType[];
  if (process.env.VERCEL) {
    runs = await executeHostedRuns(request.generation);
  } else {
    await assertApprovedWorkspace(request.generation);
    await rm(join(/* turbopackIgnore: true */ process.cwd(), 'sandbox/notification-service/workspace/coverage'), { recursive: true, force: true });
    const registry = fixedCommandRegistry();
    runs = [];
    for (const id of VERIFICATION_ORDER) {
      const run = await executeFixedCommand(registry[id]);
      runs.push(id === 'coverage' ? await attachCoverageMetrics(run) : run);
    }
  }
  const completedAt = new Date().toISOString();
  const evidence = runs.map((run) => evidenceForRun(run, request.generation, completedAt));
  const overallStatus = runs.every((run) => run.status === 'passed') ? 'passed' as const : 'failed' as const;
  const report = VerificationReport.parse({
    id: `VERIFY-${Date.parse(startedAt)}`,
    generationId: request.generation.generationId,
    manifestHash: request.generation.manifestHash,
    startedAt,
    completedAt,
    overallStatus,
    truthStatus: overallStatus === 'passed' ? 'TOOL_VERIFIED' : 'FAILED',
    runs,
    evidence,
    requirementCoverage: buildRequirementCoverage(request.generation, evidence),
  });
  await persistVerificationReport(report);
  return report;
}

let verificationQueue: Promise<unknown> = Promise.resolve();

export function runControlledVerification(input: unknown) {
  const request = VerificationRequest.parse(input);
  const result = verificationQueue.then(() => runOnce(request));
  verificationQueue = result.catch(() => undefined);
  return result;
}

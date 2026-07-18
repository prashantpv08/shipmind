import 'server-only';
import { join } from 'node:path';
import type { VerificationCommandId } from './schemas';

export type FixedCommandDefinition = {
  id: VerificationCommandId;
  label: string;
  displayCommand: string;
  program: string;
  args: string[];
  cwd: string;
  timeoutMs: number;
};

const workspace = 'sandbox/notification-service/workspace';
const vitestConfig = `${workspace}/vitest.config.ts`;

function repositoryRoot() {
  return /* turbopackIgnore: true */ process.cwd();
}

function nodeModule(root: string, path: string) {
  return join(root, 'node_modules', path);
}

export function fixedCommandRegistry(): Record<VerificationCommandId, FixedCommandDefinition> {
  const root = repositoryRoot();
  const node = process.execPath;
  const vitest = nodeModule(root, 'vitest/vitest.mjs');
  const tsc = nodeModule(root, 'typescript/lib/tsc.js');

  return {
    build: {
      id: 'build',
      label: 'TypeScript build',
      displayCommand: 'pnpm sandbox:build',
      program: node,
      args: [tsc, '-p', `${workspace}/tsconfig.json`, '--noEmit'],
      cwd: root,
      timeoutMs: 60_000,
    },
    unit: {
      id: 'unit',
      label: 'Unit tests',
      displayCommand: 'pnpm sandbox:test:unit',
      program: node,
      args: [vitest, 'run', '--config', vitestConfig, `${workspace}/tests/notification-service.unit.test.ts`],
      cwd: root,
      timeoutMs: 60_000,
    },
    api: {
      id: 'api',
      label: 'API tests',
      displayCommand: 'pnpm sandbox:test:api',
      program: node,
      args: [vitest, 'run', '--config', vitestConfig, `${workspace}/tests/notification-service.api.test.ts`],
      cwd: root,
      timeoutMs: 60_000,
    },
    coverage: {
      id: 'coverage',
      label: 'Coverage',
      displayCommand: 'pnpm sandbox:coverage',
      program: node,
      args: [
        vitest,
        'run',
        '--config',
        vitestConfig,
        `${workspace}/tests`,
        '--coverage.enabled=true',
        '--coverage.provider=v8',
        '--coverage.reporter=json-summary',
        '--coverage.reporter=text',
        `--coverage.reportsDirectory=${workspace}/coverage`,
      ],
      cwd: root,
      timeoutMs: 90_000,
    },
  };
}

export const VERIFICATION_ORDER: VerificationCommandId[] = ['build', 'unit', 'api', 'coverage'];

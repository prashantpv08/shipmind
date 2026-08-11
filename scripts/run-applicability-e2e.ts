import { spawn, type ChildProcess } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import { Client } from 'pg';

const TEST_DATABASE_NAME = 'axiom_test_applicability_e2e';
const DEFAULT_ADMIN_URL = 'postgresql://axiom:axiom-local-only@localhost:54329/postgres';
const PLATFORM_PORT = 4110;
const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(scriptDirectory, '..');
const platformRoot = resolve(webRoot, '../axiom-platform');

function checkedAdminUrl(): URL {
  const url = new URL(process.env.AXIOM_E2E_ADMIN_DATABASE_URL ?? DEFAULT_ADMIN_URL);
  if (!['127.0.0.1', 'localhost', '::1'].includes(url.hostname) || url.pathname !== '/postgres') {
    throw new Error('Applicability E2E database administration is restricted to a loopback postgres database.');
  }
  return url;
}

function testDatabaseUrl(adminUrl: URL): string {
  const value = new URL(adminUrl);
  value.pathname = `/${TEST_DATABASE_NAME}`;
  return value.toString();
}

async function recreateDatabase(adminUrl: URL): Promise<void> {
  const client = new Client({ connectionString: adminUrl.toString() });
  await client.connect();
  try {
    await client.query(
      `select pg_terminate_backend(pid) from pg_stat_activity
       where datname = $1 and pid <> pg_backend_pid()`,
      [TEST_DATABASE_NAME],
    );
    await client.query(`drop database if exists ${TEST_DATABASE_NAME}`);
    await client.query(`create database ${TEST_DATABASE_NAME}`);
  } finally {
    await client.end();
  }
}

async function dropDatabase(adminUrl: URL): Promise<void> {
  const client = new Client({ connectionString: adminUrl.toString() });
  await client.connect();
  try {
    await client.query(
      `select pg_terminate_backend(pid) from pg_stat_activity
       where datname = $1 and pid <> pg_backend_pid()`,
      [TEST_DATABASE_NAME],
    );
    await client.query(`drop database if exists ${TEST_DATABASE_NAME}`);
  } finally {
    await client.end();
  }
}

function run(command: string, args: string[], options: { cwd: string; env: NodeJS.ProcessEnv }): Promise<number> {
  return new Promise((resolveResult, reject) => {
    const child = spawn(command, args, { ...options, stdio: 'inherit' });
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (signal) reject(new Error(`${command} stopped by ${signal}.`));
      else resolveResult(code ?? 1);
    });
  });
}

async function waitForPlatform(child: ChildProcess): Promise<void> {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Local fixture platform exited with code ${child.exitCode}.`);
    try {
      const response = await fetch(`http://127.0.0.1:${PLATFORM_PORT}/api/v1/health`, { signal: AbortSignal.timeout(1_000) });
      if (response.ok) return;
    } catch {
      // The bounded local platform is still starting.
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 250));
  }
  throw new Error('Timed out waiting for the local fixture platform.');
}

async function stop(child: ChildProcess | undefined): Promise<void> {
  if (!child || child.exitCode !== null) return;
  child.kill('SIGTERM');
  await Promise.race([
    new Promise<void>((resolveExit) => child.once('exit', () => resolveExit())),
    new Promise<void>((resolveTimeout) => setTimeout(() => {
      if (child.exitCode === null) child.kill('SIGKILL');
      resolveTimeout();
    }, 5_000)),
  ]);
}

async function main(): Promise<void> {
  const adminUrl = checkedAdminUrl();
  const databaseUrl = testDatabaseUrl(adminUrl);
  const sharedEnvironment = {
    ...process.env,
    DATABASE_URL: databaseUrl,
    AXIOM_E2E_DATABASE_URL: databaseUrl,
    AXIOM_PLATFORM_URL: `http://127.0.0.1:${PLATFORM_PORT}`,
    AXIOM_LOCAL_AUTH_ENABLED: 'true',
    AXIOM_APPLICABILITY_E2E: 'true',
  };
  let platform: ChildProcess | undefined;

  try {
    await recreateDatabase(adminUrl);
    const migrationExit = await run(
      process.execPath,
      ['--import', 'tsx', 'scripts/db-migrate.ts'],
      { cwd: platformRoot, env: sharedEnvironment },
    );
    if (migrationExit !== 0) throw new Error(`Platform migrations failed with exit code ${migrationExit}.`);

    platform = spawn(process.execPath, ['--import', 'tsx', 'src/main.ts'], {
      cwd: platformRoot,
      env: { ...sharedEnvironment, PORT: `${PLATFORM_PORT}` },
      stdio: 'inherit',
    });
    await waitForPlatform(platform);

    const testExit = await run(
      resolve(webRoot, 'node_modules/.bin/playwright'),
      ['test', 'e2e/experience-applicability.spec.ts', '--workers=1'],
      { cwd: webRoot, env: sharedEnvironment },
    );
    if (testExit !== 0) process.exitCode = testExit;
  } finally {
    await stop(platform);
    await dropDatabase(adminUrl);
  }
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});

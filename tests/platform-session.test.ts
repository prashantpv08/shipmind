import { chmod, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { POST as installLocalSession } from '../app/api/auth/local-session/route';
import { CurrentUserOrganizationsSchema } from '../src/platform/contracts';
import { safeRequestId } from '../src/platform/request';
import { validatedSessionToken } from '../src/platform/session';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  vi.unstubAllEnvs();
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true })));
});

async function privateTokenFile(): Promise<{ path: string; token: string }> {
  const directory = await mkdtemp(join(tmpdir(), 'axiom-session-'));
  temporaryDirectories.push(directory);
  const path = join(directory, 'session-token');
  const token = 'A'.repeat(43);
  await writeFile(path, `${token}\n`, { mode: 0o600 });
  return { path, token };
}

describe('platform session boundary', () => {
  it('accepts only 256-bit base64url session tokens', () => {
    expect(validatedSessionToken('A'.repeat(43))).toBe('A'.repeat(43));
    expect(validatedSessionToken('short')).toBeNull();
    expect(validatedSessionToken(`${'A'.repeat(42)}+`)).toBeNull();
  });

  it('accepts the platform organization contract with stable hyphenated IDs', () => {
    expect(CurrentUserOrganizationsSchema.safeParse({
      organizations: [{
        id: 'ORG-LOCAL-DEVELOPMENT',
        slug: 'local-development',
        name: 'Local Development',
        status: 'ACTIVE',
        role: 'OWNER',
      }],
    }).success).toBe(true);
  });

  it('preserves a safe request ID and replaces untrusted values', () => {
    expect(safeRequestId('request_123')).toBe('request_123');
    expect(safeRequestId('unsafe request id')).not.toBe('unsafe request id');
  });

  it('installs a private local token as an HTTP-only same-site cookie without returning it', async () => {
    const { path, token } = await privateTokenFile();
    vi.stubEnv('AXIOM_LOCAL_AUTH_ENABLED', 'true');
    vi.stubEnv('AXIOM_LOCAL_SESSION_TOKEN_FILE', path);

    const response = await installLocalSession(new Request('http://127.0.0.1/api/auth/local-session', {
      method: 'POST',
      headers: { host: '127.0.0.1', origin: 'http://127.0.0.1' },
    }));

    expect(response.status).toBe(200);
    expect(response.headers.get('set-cookie')).toContain('HttpOnly');
    expect(response.headers.get('set-cookie')?.toLowerCase()).toContain('samesite=strict');
    expect(await response.text()).not.toContain(token);
  });

  it('rejects cross-origin installation and non-private token files', async () => {
    const { path } = await privateTokenFile();
    vi.stubEnv('AXIOM_LOCAL_AUTH_ENABLED', 'true');
    vi.stubEnv('AXIOM_LOCAL_SESSION_TOKEN_FILE', path);

    const crossOrigin = await installLocalSession(new Request('http://127.0.0.1/api/auth/local-session', {
      method: 'POST',
      headers: { host: '127.0.0.1', origin: 'http://attacker.invalid' },
    }));
    expect(crossOrigin.status).toBe(403);

    await chmod(path, 0o644);
    const unsafeFile = await installLocalSession(new Request('http://127.0.0.1/api/auth/local-session', {
      method: 'POST',
      headers: { host: '127.0.0.1', origin: 'http://127.0.0.1' },
    }));
    expect(unsafeFile.status).toBe(503);
  });
});

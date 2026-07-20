import 'server-only';

import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

import { localAuthenticationEnabled } from './config';
import { validatedSessionToken } from './session';

const DEFAULT_TOKEN_FILE = '../axiom-platform/.local/session-token';

function requestOrigin(request: Request): string {
  const forwardedProto = request.headers.get('x-forwarded-proto');
  const protocol = forwardedProto === 'https' ? 'https:' : 'http:';
  return `${protocol}//${request.headers.get('host') ?? new URL(request.url).host}`;
}

export function isLoopbackRequest(request: Request): boolean {
  const hostname = new URL(request.url).hostname;
  return hostname === '127.0.0.1' || hostname === 'localhost' || hostname === '::1';
}

export function isSameOriginMutation(request: Request): boolean {
  const origin = request.headers.get('origin');
  return origin !== null && origin === requestOrigin(request);
}

export async function readLocalSessionToken(): Promise<string> {
  if (!localAuthenticationEnabled()) {
    throw new Error('Local authentication is disabled.');
  }

  const tokenPath = resolve(process.cwd(), process.env.AXIOM_LOCAL_SESSION_TOKEN_FILE ?? DEFAULT_TOKEN_FILE);
  const file = await stat(tokenPath);

  if (!file.isFile() || (file.mode & 0o077) !== 0) {
    throw new Error('Local session token file must be a private regular file.');
  }

  const token = validatedSessionToken((await readFile(tokenPath, 'utf8')).trim());
  if (!token) {
    throw new Error('Local session token is invalid.');
  }

  return token;
}

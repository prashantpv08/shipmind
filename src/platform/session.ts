import 'server-only';

import { cookies } from 'next/headers';

import { localAuthenticationEnabled } from './config';

export const PRODUCTION_SESSION_COOKIE = '__Host-axiom';
export const LOCAL_SESSION_COOKIE = 'axiom-local-session';

const SESSION_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export function validatedSessionToken(value: string | undefined): string | null {
  return value && SESSION_TOKEN_PATTERN.test(value) ? value : null;
}

export async function currentSessionToken(): Promise<string | null> {
  const cookieStore = await cookies();
  const productionToken = validatedSessionToken(cookieStore.get(PRODUCTION_SESSION_COOKIE)?.value);
  const localToken = localAuthenticationEnabled()
    ? validatedSessionToken(cookieStore.get(LOCAL_SESSION_COOKIE)?.value)
    : null;

  if (productionToken && localToken && productionToken !== localToken) {
    return null;
  }

  return productionToken ?? localToken;
}

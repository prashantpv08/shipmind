import 'server-only';

const DEFAULT_PLATFORM_URL = 'http://127.0.0.1:4100';

export function platformBaseUrl(): URL {
  const url = new URL(process.env.AXIOM_PLATFORM_URL ?? DEFAULT_PLATFORM_URL);

  if (url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('AXIOM_PLATFORM_URL must contain only a scheme, host, and optional port.');
  }

  if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') {
    throw new Error('AXIOM_PLATFORM_URL must use HTTPS in production.');
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('AXIOM_PLATFORM_URL must use HTTP or HTTPS.');
  }

  return url;
}

export function localAuthenticationEnabled(): boolean {
  return process.env.NODE_ENV !== 'production' && process.env.AXIOM_LOCAL_AUTH_ENABLED === 'true';
}

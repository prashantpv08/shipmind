const LOOPBACK_HOSTNAMES = new Set(['127.0.0.1', '::1', 'localhost']);
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

type LegacyRouteEnvironment = {
  AXIOM_LEGACY_PROTOTYPE_ENABLED?: string;
  NODE_ENV?: string;
};

export type LegacyRouteDecision = 'ALLOW' | 'NOT_FOUND' | 'REDIRECT_ACCOUNT';

function normalizedAddress(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (normalized.startsWith('[') && normalized.endsWith(']')) return normalized.slice(1, -1);
  return normalized.endsWith('.') ? normalized.slice(0, -1) : normalized;
}

function isLoopbackAddress(value: string): boolean {
  const address = normalizedAddress(value);
  return LOOPBACK_HOSTNAMES.has(address)
    || address.startsWith('127.')
    || address.startsWith('::ffff:127.');
}

function forwardedClientIsLoopback(headers: Headers): boolean {
  const forwardedFor = headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const realIp = headers.get('x-real-ip')?.trim();
  return (!forwardedFor || isLoopbackAddress(forwardedFor))
    && (!realIp || isLoopbackAddress(realIp));
}

function isSameOrigin(url: URL, headers: Headers): boolean {
  const origin = headers.get('origin');
  if (!origin) return false;

  try {
    const suppliedOrigin = new URL(origin).origin;
    if (suppliedOrigin === url.origin) return true;

    const protocol = headers.get('x-forwarded-proto')?.split(',')[0]?.trim() || url.protocol;
    const requestHosts = [
      headers.get('x-forwarded-host')?.split(',')[0]?.trim(),
      headers.get('host')?.trim(),
    ].filter((host): host is string => Boolean(host));

    return requestHosts.some((host) => {
      try {
        return new URL(`${protocol.replace(/:$/, '')}://${host}`).origin === suppliedOrigin;
      } catch {
        return false;
      }
    });
  } catch {
    return false;
  }
}

function isPathOrDescendant(pathname: string, root: string): boolean {
  return pathname === root || pathname.startsWith(`${root}/`);
}

function isCommercialApi(pathname: string): boolean {
  return isPathOrDescendant(pathname, '/api/auth')
    || isPathOrDescendant(pathname, '/api/platform');
}

function isLegacySurface(pathname: string): boolean {
  return isPathOrDescendant(pathname, '/prototype')
    || isPathOrDescendant(pathname, '/api');
}

export function decideLegacyRoute(
  request: Pick<Request, 'headers' | 'method' | 'url'>,
  environment: LegacyRouteEnvironment = process.env,
): LegacyRouteDecision {
  const url = new URL(request.url);

  if (url.pathname === '/') return 'REDIRECT_ACCOUNT';
  if (isCommercialApi(url.pathname)) return 'ALLOW';
  if (!isLegacySurface(url.pathname)) return 'ALLOW';

  const enabled = environment.AXIOM_LEGACY_PROTOTYPE_ENABLED === 'true'
    && environment.NODE_ENV !== 'production';
  if (!enabled) return 'NOT_FOUND';
  if (!isLoopbackAddress(url.hostname) || !forwardedClientIsLoopback(request.headers)) {
    return 'NOT_FOUND';
  }
  if (!SAFE_METHODS.has(request.method.toUpperCase()) && !isSameOrigin(url, request.headers)) {
    return 'NOT_FOUND';
  }

  return 'ALLOW';
}

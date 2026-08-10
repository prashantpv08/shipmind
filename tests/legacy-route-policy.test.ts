import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';

import { proxy } from '../proxy';
import { decideLegacyRoute } from '../src/legacy/route-policy';

const disabled = { AXIOM_LEGACY_PROTOTYPE_ENABLED: 'false', NODE_ENV: 'development' };
const enabled = { AXIOM_LEGACY_PROTOTYPE_ENABLED: 'true', NODE_ENV: 'development' };

function request(
  path: string,
  options: { headers?: Record<string, string>; host?: string; method?: string } = {},
): Request {
  const host = options.host ?? '127.0.0.1:3000';
  return new Request(`http://${host}${path}`, {
    method: options.method ?? 'GET',
    headers: options.headers,
  });
}

describe('legacy route policy', () => {
  it('redirects the root to the commercial account surface', () => {
    expect(decideLegacyRoute(request('/'), disabled)).toBe('REDIRECT_ACCOUNT');
  });

  it('allows only the explicit commercial API namespaces without the legacy flag', () => {
    expect(decideLegacyRoute(request('/api/auth/local-session'), disabled)).toBe('ALLOW');
    expect(decideLegacyRoute(request('/api/platform/me/organizations'), disabled)).toBe('ALLOW');
    expect(decideLegacyRoute(request('/api/authentication'), disabled)).toBe('NOT_FOUND');
    expect(decideLegacyRoute(request('/api/platform-admin'), disabled)).toBe('NOT_FOUND');
  });

  it('hides the prototype and legacy APIs by default', () => {
    expect(decideLegacyRoute(request('/prototype'), disabled)).toBe('NOT_FOUND');
    expect(decideLegacyRoute(request('/api/projects'), disabled)).toBe('NOT_FOUND');
    expect(decideLegacyRoute(request('/api/projects/PROJ-ONE'), disabled)).toBe('NOT_FOUND');
  });

  it('never enables legacy surfaces in production', () => {
    const production = { AXIOM_LEGACY_PROTOTYPE_ENABLED: 'true', NODE_ENV: 'production' };
    expect(decideLegacyRoute(request('/prototype'), production)).toBe('NOT_FOUND');
    expect(decideLegacyRoute(request('/api/projects'), production)).toBe('NOT_FOUND');
  });

  it('requires a loopback URL and rejects a non-loopback forwarded client', () => {
    expect(decideLegacyRoute(request('/prototype'), enabled)).toBe('ALLOW');
    expect(decideLegacyRoute(request('/prototype', { host: '192.168.1.10:3000' }), enabled)).toBe('NOT_FOUND');
    expect(decideLegacyRoute(request('/prototype', {
      headers: { 'x-forwarded-for': '192.168.1.10' },
    }), enabled)).toBe('NOT_FOUND');
  });

  it('requires an exact same-origin header for enabled local mutations', () => {
    expect(decideLegacyRoute(request('/api/projects', {
      method: 'POST',
      headers: { origin: 'http://127.0.0.1:3000' },
    }), enabled)).toBe('ALLOW');
    expect(decideLegacyRoute(request('/api/projects', { method: 'POST' }), enabled)).toBe('NOT_FOUND');
    expect(decideLegacyRoute(request('/api/projects', {
      method: 'POST',
      headers: { origin: 'http://attacker.invalid' },
    }), enabled)).toBe('NOT_FOUND');
  });

  it('uses the request host when Next development normalizes the request URL hostname', () => {
    expect(decideLegacyRoute(request('/api/analyze', {
      host: 'localhost:3000',
      method: 'POST',
      headers: {
        host: '127.0.0.1:3000',
        origin: 'http://127.0.0.1:3000',
      },
    }), enabled)).toBe('ALLOW');
  });

  it('returns an empty no-store 404 for a blocked route', async () => {
    const response = proxy(new NextRequest('http://127.0.0.1:3000/api/projects'));
    expect(response.status).toBe(404);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.text()).toBe('');
  });

  it('uses a temporary no-store redirect for the root', () => {
    const response = proxy(new NextRequest('http://127.0.0.1:3000/'));
    expect(response.status).toBe(307);
    expect(new URL(response.headers.get('location')!).pathname).toBe('/account');
    expect(response.headers.get('cache-control')).toBe('no-store');
  });
});

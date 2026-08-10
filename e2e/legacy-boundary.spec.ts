import { expect, test } from '@playwright/test';

test.describe('default-deny legacy boundary', () => {
  test.skip(
    process.env.AXIOM_LEGACY_PROTOTYPE_ENABLED === 'true',
    'The default-deny boundary is verified only when the local migration prototype is disabled.',
  );

  test('defaults to the commercial surface and stops legacy handlers before execution', async ({ request }) => {
    const root = await request.get('/', { maxRedirects: 0 });
    expect(root.status()).toBe(307);
    expect(root.headers().location).toBe('/account');
    expect(root.headers()['cache-control']).toBe('no-store');

    const prototype = await request.get('/prototype');
    expect(prototype.status()).toBe(404);
    expect(prototype.headers()['cache-control']).toBe('no-store');
    expect(await prototype.text()).toBe('');

    const legacyApi = await request.get('/api/projects');
    expect(legacyApi.status()).toBe(404);
    expect(legacyApi.headers()['cache-control']).toBe('no-store');
    expect(await legacyApi.text()).toBe('');

    const commercialApi = await request.get('/api/platform/me/organizations');
    expect(commercialApi.status()).toBe(401);
    await expect(commercialApi.json()).resolves.toMatchObject({
      error: { code: 'UNAUTHENTICATED' },
    });

    const sessionApi = await request.delete('/api/auth/session', {
      headers: { origin: 'http://127.0.0.1:3000' },
    });
    expect(sessionApi.status()).toBe(204);
  });
});

test.describe('explicit local migration mode', () => {
  test.skip(
    process.env.AXIOM_LEGACY_PROTOTYPE_ENABLED !== 'true',
    'Requires the explicit local-only legacy prototype flag.',
  );

  test('serves the prototype on loopback but rejects cross-origin mutations', async ({ request }) => {
    const prototype = await request.get('/prototype');
    expect(prototype.status()).toBe(200);
    expect(await prototype.text()).toContain('approved product');

    const rejected = await request.post('/api/analyze', {
      headers: { origin: 'http://attacker.invalid' },
      data: { brief: 'This handler must not execute.', useFixture: true },
    });
    expect(rejected.status()).toBe(404);
    expect(rejected.headers()['cache-control']).toBe('no-store');
    expect(await rejected.text()).toBe('');
  });
});

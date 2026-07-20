import { expect, test } from '@playwright/test';

test.describe('commercial web session boundary', () => {
  test.skip(process.env.AXIOM_COMMERCIAL_E2E !== 'true', 'Requires the local Node platform and local session fixture.');

  test('connects a local session, reads organization access through the BFF, and signs out', async ({ page }) => {
    await page.goto('/account');
    await expect(page.getByRole('heading', { name: 'Authentication required' })).toBeVisible();

    await page.getByRole('button', { name: 'Connect local session' }).click();
    await expect(page.getByRole('heading', { name: 'Authenticated' })).toBeVisible();
    await expect(page.getByText('Local Development')).toBeVisible();
    await expect(page.getByText('OWNER')).toBeVisible();

    const response = await page.request.get('/api/platform/me/organizations');
    expect(response.status()).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      organizations: [{ name: 'Local Development', role: 'OWNER' }],
    });

    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page.getByRole('heading', { name: 'Authentication required' })).toBeVisible();
  });
});

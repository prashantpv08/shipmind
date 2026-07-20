import { expect, test } from '@playwright/test';

test.describe('commercial web session boundary', () => {
  test.skip(process.env.AXIOM_COMMERCIAL_E2E !== 'true', 'Requires the local Node platform and local session fixture.');

  test('connects locally, reads tenant-scoped organizations and projects, and signs out', async ({ page }) => {
    await page.goto('/account');
    await expect(page.getByRole('heading', { name: 'Authentication required' })).toBeVisible();

    await page.getByRole('button', { name: 'Connect local session' }).click();
    await expect(page.getByRole('heading', { name: 'Authenticated' })).toBeVisible();
    await expect(page.getByText('Local Development')).toBeVisible();
    await expect(page.getByText('OWNER')).toBeVisible();

    const organizationsResponse = await page.request.get('/api/platform/me/organizations');
    expect(organizationsResponse.status()).toBe(200);
    await expect(organizationsResponse.json()).resolves.toMatchObject({
      organizations: [{ name: 'Local Development', role: 'OWNER' }],
    });

    await page.getByRole('link', { name: 'View projects' }).click();
    await expect(page.getByRole('heading', { name: 'Authorized project metadata' })).toBeVisible();
    await expect(page.locator('.project-access-list > li').first()).toBeVisible();

    const projectsResponse = await page.request.get(
      '/api/platform/organizations/ORG-LOCAL-DEVELOPMENT/projects?limit=2',
    );
    expect(projectsResponse.status()).toBe(200);
    const projectPage = await projectsResponse.json() as { projects: Array<{ id: string; name: string }> };
    expect(projectPage.projects.length).toBeGreaterThan(0);
    expect(projectPage.projects.length).toBeLessThanOrEqual(2);

    const project = projectPage.projects[0]!;
    const detailResponse = await page.request.get(
      `/api/platform/organizations/ORG-LOCAL-DEVELOPMENT/projects/${encodeURIComponent(project.id)}`,
    );
    expect(detailResponse.status()).toBe(200);
    await expect(detailResponse.json()).resolves.toMatchObject({ id: project.id, name: project.name });

    const denied = await page.request.get('/api/platform/organizations/ORG-NOT-A-MEMBER/projects');
    expect(denied.status()).toBe(403);
    expect(await denied.text()).not.toContain(project.name);

    await page.goto('/account');
    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page.getByRole('heading', { name: 'Authentication required' })).toBeVisible();
  });
});

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

  test('preserves the project creation retry key after a network failure', async ({ page }) => {
    await page.goto('/account');
    await page.getByRole('button', { name: 'Connect local session' }).click();
    await expect(page.getByRole('heading', { name: 'Authenticated' })).toBeVisible();
    await page.getByRole('link', { name: 'View projects' }).click();
    await expect(page.getByRole('heading', { name: 'Create project' })).toBeVisible();

    const idempotencyKeys: string[] = [];
    let attempts = 0;
    await page.route('**/api/platform/organizations/ORG-LOCAL-DEVELOPMENT/projects', async (route) => {
      if (route.request().method() !== 'POST') return route.continue();
      attempts += 1;
      idempotencyKeys.push(route.request().headers()['idempotency-key'] ?? '');
      if (attempts === 1) return route.abort('failed');

      return route.fulfill({
        status: 201,
        contentType: 'application/json',
        headers: { etag: '"PROJ-UI-RETRY:1"', 'idempotency-replayed': 'false' },
        body: JSON.stringify({
          id: 'PROJ-UI-RETRY',
          workspaceId: 'WS-PRODUCT-ENGINEERING',
          name: 'Retry-safe UI project',
          status: 'DRAFT',
          graphVersion: 0,
          rowVersion: 1,
          archivedAt: null,
          createdAt: '2026-07-21T00:00:00.000Z',
          updatedAt: '2026-07-21T00:00:00.000Z',
        }),
      });
    });

    await page.getByLabel('Project name').fill('Retry-safe UI project');
    await page.getByRole('button', { name: 'Create project' }).click();
    await expect(
      page.getByText('The platform could not be reached. Your input and retry key were preserved.'),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Create project' }).click();
    await expect(page.getByText('Created Retry-safe UI project.')).toBeVisible();

    expect(idempotencyKeys).toHaveLength(2);
    expect(idempotencyKeys[0]).toBeTruthy();
    expect(idempotencyKeys[1]).toBe(idempotencyKeys[0]);
  });

  test('requires archive confirmation and reconciles a stale project version', async ({ page }) => {
    await page.goto('/account');
    await page.getByRole('button', { name: 'Connect local session' }).click();
    await expect(page.getByRole('heading', { name: 'Authenticated' })).toBeVisible();
    await page.getByRole('link', { name: 'View projects' }).click();

    const projectItem = page.locator('.project-access-list > li').first();
    await expect(projectItem.getByRole('button', { name: 'Archive' })).toBeVisible();
    const metadata = await projectItem.locator('small').textContent();
    const projectId = metadata?.split(' · ')[0];
    expect(projectId).toMatch(/^PROJ-/);

    let capturedIfMatch = '';
    await page.route(`**/api/platform/organizations/ORG-LOCAL-DEVELOPMENT/projects/${projectId}/archive`, async (route) => {
      capturedIfMatch = route.request().headers()['if-match'] ?? '';
      await route.fulfill({
        status: 412,
        contentType: 'application/json',
        body: JSON.stringify({ error: { code: 'PRECONDITION_FAILED', message: 'Project changed.' } }),
      });
    });

    await projectItem.getByRole('button', { name: 'Archive' }).click();
    await expect(projectItem.getByText(`Archive ${await projectItem.locator('b').first().textContent()}?`)).toBeVisible();
    await projectItem.getByRole('button', { name: 'Confirm archive' }).click();
    await expect(projectItem.getByText('The project changed before this action completed. Refresh the list before deciding again.')).toBeVisible();
    expect(capturedIfMatch).toMatch(new RegExp(`^"${projectId}:[1-9][0-9]*"$`));
  });
});

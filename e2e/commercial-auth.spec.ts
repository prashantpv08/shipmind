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

    await page.getByRole('link', { name: 'View budget' }).click();
    await expect(page.getByRole('heading', { name: 'Plan and AI usage' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Local development' })).toBeVisible();
    await expect(page.getByText('Budget available')).toBeVisible();
    await expect(page.getByText('No chargeable usage recorded')).toBeVisible();

    await page.goto('/account');

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

  test('shows organization access and preserves an invitation retry key', async ({ page }) => {
    await page.goto('/account');
    await page.getByRole('button', { name: 'Connect local session' }).click();
    await expect(page.getByRole('heading', { name: 'Authenticated' })).toBeVisible();
    await page.getByRole('link', { name: 'Manage access' }).click();
    await expect(page.getByRole('heading', { name: 'Members and invitations' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Members', exact: true })).toBeVisible();

    const keys: string[] = [];
    let attempts = 0;
    await page.route('**/api/platform/organizations/ORG-LOCAL-DEVELOPMENT/invitations', async (route) => {
      if (route.request().method() !== 'POST') return route.continue();
      attempts += 1;
      keys.push(route.request().headers()['idempotency-key'] ?? '');
      if (attempts === 1) return route.abort('failed');
      return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({
        invitation: { id: 'INV-UI-RETRY', email: 'invitee@example.test', role: 'VIEWER', status: 'PENDING', expiresAt: '2026-07-30T00:00:00.000Z', rowVersion: 1, createdAt: '2026-07-23T00:00:00.000Z', updatedAt: '2026-07-23T00:00:00.000Z' },
        delivery: { mode: 'MANUAL_LOCAL', acceptanceToken: `INV-UI-RETRY.${'A'.repeat(43)}` }, replayed: false,
      }) });
    });

    await page.getByLabel('Email').fill('invitee@example.test');
    await page.getByRole('button', { name: 'Create invitation' }).click();
    await expect(page.getByText('The result is unknown. Retry without changing the input so the same idempotency key is used.')).toBeVisible();
    await page.getByRole('button', { name: 'Create invitation' }).click();
    await expect(page.locator('.invitation-token code')).toContainText('INV-UI-RETRY.');
    expect(keys).toHaveLength(2);
    expect(keys[0]).toBeTruthy();
    expect(keys[1]).toBe(keys[0]);
  });

  test('renders the exact quality-gated backlog and preserves generation retries', async ({ page }) => {
    await page.goto('/account');
    await page.getByRole('button', { name: 'Connect local session' }).click();
    await expect(page.getByRole('heading', { name: 'Authenticated' })).toBeVisible();
    const projectsResponse = await page.request.get('/api/platform/organizations/ORG-LOCAL-DEVELOPMENT/projects?limit=50');
    const projectPage = await projectsResponse.json() as { projects: Array<{ id: string }> };
    let selected: { projectId: string; preview: Record<string, unknown> } | null = null;
    for (const project of projectPage.projects) {
      const previewResponse = await page.request.get(`/api/platform/organizations/ORG-LOCAL-DEVELOPMENT/projects/${encodeURIComponent(project.id)}/work-item-generations`);
      if (previewResponse.status() !== 200) continue;
      selected = { projectId: project.id, preview: await previewResponse.json() as Record<string, unknown> };
      break;
    }
    expect(selected).not.toBeNull();
    await page.goto(`/account/organizations/ORG-LOCAL-DEVELOPMENT/projects/${selected!.projectId}/backlog`);
    await expect(page.getByRole('heading', { name: 'Agile backlog preview' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Deterministic quality result' })).toBeVisible();
    await expect(page.getByText('DRAFT · awaiting human review')).toBeVisible();
    await expect(page.locator('.backlog-items article').first()).toBeVisible();

    const keys: string[] = [];
    let attempts = 0;
    await page.route(`**/api/platform/organizations/ORG-LOCAL-DEVELOPMENT/projects/${selected!.projectId}/work-item-generations`, async (route) => {
      if (route.request().method() !== 'POST') return route.continue();
      attempts += 1;
      keys.push(route.request().headers()['idempotency-key'] ?? '');
      if (attempts === 1) return route.abort('failed');
      return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(selected!.preview) });
    });
    await page.getByRole('button', { name: 'Regenerate draft version' }).click();
    await expect(page.getByText('The result is unknown. Retry without changing the graph so the same idempotency key is reused.')).toBeVisible();
    await page.getByRole('button', { name: 'Regenerate draft version' }).click();
    expect(keys).toHaveLength(2);
    expect(keys[0]).toBeTruthy();
    expect(keys[1]).toBe(keys[0]);

    const preview = selected!.preview as { id: string; contentHash: string; generationContentHash: string };
    const reviewKeys: string[] = [];
    const reviewEtags: string[] = [];
    let reviewAttempts = 0;
    await page.route(`**/api/platform/organizations/ORG-LOCAL-DEVELOPMENT/projects/${selected!.projectId}/work-item-generations/${preview.id}/reviews`, async (route) => {
      if (route.request().method() !== 'POST') return route.continue();
      reviewAttempts += 1;
      reviewKeys.push(route.request().headers()['idempotency-key'] ?? '');
      reviewEtags.push(route.request().headers()['if-match'] ?? '');
      if (reviewAttempts === 1) return route.abort('failed');
      return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({
        ...selected!.preview,
        status: 'APPROVED',
        review: {
          id: 'WIREVIEW-UI-RETRY', generationId: preview.id, decision: 'ACCEPT', reasonCategory: 'MEETS_REQUIREMENTS',
          comment: 'The exact grounded backlog is ready for controlled connector preparation.',
          generationContentHash: preview.generationContentHash, reviewedContentHash: preview.contentHash,
          reviewedByUserId: 'USER-LOCAL-OWNER', reviewedAt: '2026-07-23T01:00:00.000Z',
        },
      }) });
    });
    await page.getByLabel('Approval explanation').fill('The exact grounded backlog is ready for controlled connector preparation.');
    await page.getByRole('button', { name: 'Accept exact backlog' }).click();
    await expect(page.getByText('The result is unknown. Retry the unchanged decision so the same idempotency key is reused.')).toBeVisible();
    await page.getByRole('button', { name: 'Accept exact backlog' }).click();
    expect(reviewKeys).toHaveLength(2);
    expect(reviewKeys[0]).toBeTruthy();
    expect(reviewKeys[1]).toBe(reviewKeys[0]);
    expect(reviewEtags).toEqual([`"${preview.id}:${preview.generationContentHash}"`, `"${preview.id}:${preview.generationContentHash}"`]);
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

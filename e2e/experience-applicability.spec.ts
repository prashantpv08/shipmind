import { expect, test, type BrowserContext, type Page } from '@playwright/test';

import {
  applicabilityFixture,
  ExperienceApplicabilityFixtureDatabase,
} from './helpers/experience-applicability-fixture';

const enabled = process.env.AXIOM_APPLICABILITY_E2E === 'true';
const organizationId = applicabilityFixture.primaryOrganizationId;
const baseOrigin = 'http://127.0.0.1:3000';
const database = enabled ? new ExperienceApplicabilityFixtureDatabase() : null;

function fixtureDatabase(): ExperienceApplicabilityFixtureDatabase {
  if (!database) throw new Error('The applicability fixture database is available only in the dedicated E2E runner.');
  return database;
}

function projectPath(projectId: string, targetOrganizationId: string = organizationId): string {
  return `/account/organizations/${targetOrganizationId}/projects/${projectId}/business-context`;
}

function apiPath(projectId: string, targetOrganizationId: string = organizationId): string {
  return `/api/platform/organizations/${targetOrganizationId}/projects/${projectId}/business-context/applicability-decisions`;
}

async function authenticate(context: BrowserContext, token = applicabilityFixture.ownerToken): Promise<void> {
  await context.addCookies([{
    name: 'axiom-local-session',
    value: token,
    domain: '127.0.0.1',
    path: '/',
    httpOnly: true,
    sameSite: 'Strict',
  }]);
}

async function renderedPreview(page: Page): Promise<{ sourceGraphVersion: number; contentHash: string }> {
  const contentHash = (await page.locator('.business-context-applicability code').textContent())?.trim();
  expect(contentHash).toMatch(/^[a-f0-9]{64}$/);
  return { sourceGraphVersion: 1, contentHash: contentHash! };
}

function decisionRadio(page: Page, decision: 'APPLICABLE' | 'NOT_APPLICABLE') {
  return page.getByRole('radio', {
    name: decision === 'APPLICABLE' ? /^APPLICABLE Require an/ : /^NOT APPLICABLE Record an/,
  });
}

async function decide(page: Page, decision: 'APPLICABLE' | 'NOT_APPLICABLE', rationale: string): Promise<void> {
  await decisionRadio(page, decision).check();
  await page.getByLabel('Decision rationale').fill(rationale);
  await page.getByRole('button', { name: 'Review decision' }).click();
  const exactPreview = page.getByRole('region', { name: 'Exact experience applicability decision preview' });
  await expect(exactPreview).toBeVisible();
  await expect(exactPreview).toContainText(decision.replaceAll('_', ' '));
}

test.describe('governed experience applicability browser matrix', () => {
  test.skip(!enabled, 'Requires AXIOM_APPLICABILITY_E2E=true with the local platform and PostgreSQL.');
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(async () => {
    await fixtureDatabase().seed();
  });

  test.afterAll(async () => {
    await fixtureDatabase().close();
  });

  test('renders the migration queue and deterministic applicable, not-applicable, and needs-decision states', async ({ context, page }) => {
    await authenticate(context);

    await page.goto(`/account/organizations/${organizationId}/projects`);
    const migrationQueue = page.getByRole('region', { name: 'P0 Business Context migration queue' });
    await expect(migrationQueue).toBeVisible();
    await expect(migrationQueue).toContainText('Pending7');
    const undecidedProject = page.getByRole('listitem').filter({ hasText: applicabilityFixture.projects.needsDecision });
    await expect(undecidedProject).toContainText('DECISION REQUIRED');
    await expect(undecidedProject.getByRole('link', { name: 'Open exact review' })).toHaveAttribute('href', projectPath(applicabilityFixture.projects.needsDecision));
    const explicitProject = page.getByRole('listitem').filter({ hasText: applicabilityFixture.projects.applicable });
    await expect(explicitProject).toContainText('GENERATION REQUIRED');

    await page.goto(projectPath(applicabilityFixture.projects.applicable));
    await expect(page.getByRole('heading', { name: 'APPLICABLE', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Resolve experience applicability' })).toHaveCount(0);

    await page.goto(projectPath(applicabilityFixture.projects.notApplicable));
    await expect(page.getByRole('heading', { name: 'NOT APPLICABLE', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Resolve experience applicability' })).toHaveCount(0);

    await page.goto(projectPath(applicabilityFixture.projects.needsDecision));
    await expect(page.getByRole('heading', { name: 'NEEDS DECISION', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Resolve experience applicability' })).toBeVisible();
    await expect(page.getByText('UNKNOWN_EXPERIENCE_APPLICABILITY')).toBeVisible();
  });

  test('records APPLICABLE from the exact keyboard-operable preview and persists it after reload', async ({ context, page }) => {
    const projectId = applicabilityFixture.projects.applicableSuccess;
    await authenticate(context);
    await page.goto(projectPath(projectId));

    const applicable = decisionRadio(page, 'APPLICABLE');
    await applicable.focus();
    await page.keyboard.press('ArrowRight');
    await expect(decisionRadio(page, 'NOT_APPLICABLE')).toBeChecked();
    await page.keyboard.press('ArrowLeft');
    await expect(applicable).toBeChecked();

    const rationale = 'This approved scope includes an operator-facing workflow that requires a governed user experience.';
    await decide(page, 'APPLICABLE', rationale);
    const exactPreview = page.getByRole('region', { name: 'Exact experience applicability decision preview' });
    await expect(exactPreview).toContainText('v1 → v2');
    await expect(exactPreview).toContainText('HUMAN CONFIRMED');
    await expect(exactPreview).toContainText('An exact compatible approved Experience Baseline will be required.');

    await page.getByRole('button', { name: 'Change decision' }).click();
    await expect(page.getByLabel('Decision rationale')).toHaveValue(rationale);
    await page.getByRole('button', { name: 'Review decision' }).click();
    await page.getByRole('button', { name: 'Confirm applicability decision' }).click();

    await expect(page.getByRole('heading', { name: 'APPLICABLE', exact: true })).toBeVisible();
    await expect(page.getByText(`${projectId} · graph v2`)).toBeVisible();
    await page.reload();
    await expect(page.getByRole('heading', { name: 'APPLICABLE', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Resolve experience applicability' })).toHaveCount(0);
    await expect(fixtureDatabase().decisionEvidence(projectId)).resolves.toEqual({ decisions: 1, audits: 1, graphVersion: 2, rowVersion: 2 });
  });

  test('retries NOT_APPLICABLE with the unchanged idempotency key and persists one result', async ({ context, page }) => {
    const projectId = applicabilityFixture.projects.notApplicableRetry;
    await authenticate(context);
    await page.goto(projectPath(projectId));

    const idempotencyKeys: string[] = [];
    let attempts = 0;
    await page.route(`**${apiPath(projectId)}`, async (route) => {
      if (route.request().method() !== 'POST') return route.continue();
      attempts += 1;
      idempotencyKeys.push(route.request().headers()['idempotency-key'] ?? '');
      if (attempts === 1) return route.abort('failed');
      return route.continue();
    });

    await decide(
      page,
      'NOT_APPLICABLE',
      'This approved scope is a headless integration and must not cause Axiom to invent screens.',
    );
    await page.getByRole('button', { name: 'Confirm applicability decision' }).click();
    await expect(page.locator('p[role="alert"]')).toContainText('The decision result is unknown.');
    await page.getByRole('button', { name: 'Retry unchanged' }).click();

    await expect(page.getByRole('heading', { name: 'NOT APPLICABLE', exact: true })).toBeVisible();
    expect(idempotencyKeys).toHaveLength(2);
    expect(idempotencyKeys[0]).toBeTruthy();
    expect(idempotencyKeys[1]).toBe(idempotencyKeys[0]);
    await page.reload();
    await expect(page.getByRole('heading', { name: 'NOT APPLICABLE', exact: true })).toBeVisible();
    await expect(fixtureDatabase().decisionEvidence(projectId)).resolves.toEqual({ decisions: 1, audits: 1, graphVersion: 2, rowVersion: 2 });
  });

  test('rejects a stale project version without recording a decision', async ({ context, page }) => {
    const projectId = applicabilityFixture.projects.stale;
    await authenticate(context);
    await page.goto(projectPath(projectId));
    await fixtureDatabase().setProjectRowVersion(projectId, 2);

    await decide(
      page,
      'APPLICABLE',
      'The approved scope requires a user-facing review workflow for finance operators.',
    );
    await page.getByRole('button', { name: 'Confirm applicability decision' }).click();
    await expect(page.locator('p[role="alert"]')).toContainText('Project changed before the experience applicability decision');
    await expect(page.getByRole('button', { name: 'Confirm applicability decision' })).toHaveCount(0);
    await expect(fixtureDatabase().decisionEvidence(projectId)).resolves.toEqual({ decisions: 0, audits: 0, graphVersion: 1, rowVersion: 2 });
  });

  test('rejects invalid and already-explicit decisions without presenting success', async ({ context, page }) => {
    const needsDecisionProject = applicabilityFixture.projects.needsDecision;
    await authenticate(context);
    await page.goto(projectPath(needsDecisionProject));
    await page.getByLabel('Decision rationale').fill('too short');
    await page.getByRole('button', { name: 'Review decision' }).click();
    await expect(page.getByRole('region', { name: 'Exact experience applicability decision preview' })).toHaveCount(0);
    expect(await page.getByLabel('Decision rationale').evaluate(
      (element) => (element as HTMLTextAreaElement).validity.tooShort,
    )).toBe(true);

    const projectId = applicabilityFixture.projects.applicable;
    await page.goto(projectPath(projectId));
    const currentPreview = await renderedPreview(page);
    const response = await page.request.post(apiPath(projectId), {
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        origin: baseOrigin,
        'idempotency-key': 'e2e-already-explicit-decision',
        'if-match': `"${projectId}:1"`,
      },
      data: {
        sourceGraphVersion: currentPreview.sourceGraphVersion,
        previewContentHash: currentPreview.contentHash,
        decision: 'APPLICABLE',
        rationale: 'This exact graph already contains an explicit user-facing experience decision.',
      },
    });
    expect(response.status()).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: { message: 'Experience applicability is already explicit in the current graph' },
    });
    await expect(fixtureDatabase().decisionEvidence(projectId)).resolves.toEqual({ decisions: 0, audits: 0, graphVersion: 1, rowVersion: 1 });
  });

  test('fails closed for anonymous, viewer, and cross-tenant browser access', async ({ browser, context, page }) => {
    const projectId = applicabilityFixture.projects.viewer;

    await page.goto(projectPath(projectId));
    await expect(page.getByRole('heading', { name: 'Authentication required' })).toBeVisible();

    await authenticate(context, applicabilityFixture.viewerToken);
    await page.goto(projectPath(projectId));
    await expect(page.getByRole('heading', { name: 'Resolve experience applicability' })).toBeVisible();
    await expect(page.getByText('An authorized product decision-maker or Reviewer must record')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Review decision' })).toHaveCount(0);

    const currentPreview = await renderedPreview(page);
    const viewerResponse = await page.request.post(apiPath(projectId), {
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        origin: baseOrigin,
        'idempotency-key': 'e2e-viewer-denied-decision',
        'if-match': `"${projectId}:1"`,
      },
      data: {
        sourceGraphVersion: currentPreview.sourceGraphVersion,
        previewContentHash: currentPreview.contentHash,
        decision: 'APPLICABLE',
        rationale: 'A viewer must not be able to record this consequential product decision.',
      },
    });
    expect(viewerResponse.status()).toBe(403);

    const ownerContext = await browser.newContext();
    try {
      await authenticate(ownerContext);
      const ownerPage = await ownerContext.newPage();
      await ownerPage.goto(projectPath(projectId, applicabilityFixture.secondaryOrganizationId));
      await expect(ownerPage.getByRole('heading', { name: 'Access denied' })).toBeVisible();
      const crossTenantResponse = await ownerPage.request.post(
        apiPath(projectId, applicabilityFixture.secondaryOrganizationId),
        {
          headers: {
            accept: 'application/json',
            'content-type': 'application/json',
            origin: baseOrigin,
            'idempotency-key': 'e2e-cross-tenant-denied-decision',
            'if-match': `"${projectId}:1"`,
          },
          data: {
            sourceGraphVersion: currentPreview.sourceGraphVersion,
            previewContentHash: currentPreview.contentHash,
            decision: 'NOT_APPLICABLE',
            rationale: 'Cross-tenant access must fail before any applicability decision can be recorded.',
          },
        },
      );
      expect(crossTenantResponse.status()).toBe(403);
    } finally {
      await ownerContext.close();
    }

    await expect(fixtureDatabase().decisionEvidence(projectId)).resolves.toEqual({ decisions: 0, audits: 0, graphVersion: 1, rowVersion: 1 });
  });
});

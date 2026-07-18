import { test, expect } from '@playwright/test';
import { fixtureAnalysisResult } from '../src/domain/day2';

const now = new Date().toISOString();

test.setTimeout(180_000);

test('Axiom guides a project from landing through documents, optional wireflow, and approved architecture', async ({ page }) => {
  await page.route('**/api/integrations/notion/status', async (route) => route.fulfill({ json: { configured: false, mode: 'internal-connection', missing: ['E2E_NOTION_DISABLED'] } }));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Turn raw intent into an approved product system/ })).toBeVisible();
  await page.getByRole('button', { name: /Experience Axiom/ }).click();
  await expect(page.getByRole('heading', { name: /Upload the context/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Create project system/ })).toBeDisabled();
  await page.getByLabel('Project name').fill('Digital lending modernization');
  await page.getByRole('button', { name: 'Paste transcript' }).click();
  await page.getByLabel('Paste meeting transcript').fill('The service must preserve lending policy decisions. The API response time must remain below 500 milliseconds. The team agreed to review regulatory constraints before architecture approval.');
  await page.getByRole('button', { name: 'Add transcript' }).click();
  await expect(page.getByLabel('Added sources')).toContainText('Meeting transcript 1');
  await page.getByRole('button', { name: /Create project system/ }).click();
  await expect(page.getByRole('status').filter({ hasText: /project system is ready/i })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole('heading', { name: 'Review what Axiom understood.' })).toBeVisible();
  await expect(page.locator('.review-document-grid article')).toHaveCount(4);
  await page.locator('.review-document-grid article').filter({ hasText: 'Proposed High-Level Design' }).getByRole('button', { name: /Review & modify/ }).click();
  await expect(page.getByRole('dialog', { name: 'Proposed High-Level Design' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Architecture diagrams' })).toBeVisible();
  await page.getByRole('button', { name: 'System context diagram', exact: true }).click();
  const renderedMermaid = page.getByTestId('mermaid-diagram');
  await expect(renderedMermaid).toBeVisible();
  await expect(renderedMermaid.locator('svg')).toBeVisible({ timeout: 15_000 });
  await expect(renderedMermaid.getByText('View Mermaid source')).toBeVisible();
  await expect(renderedMermaid.getByText('flowchart LR')).not.toBeVisible();
  await page.getByRole('button', { name: 'Close document review' }).click();
  for (let index = 0; index < 2; index += 1) {
    await page.locator('.decision-questions details').first().locator('.question-answer-area > div button').first().click();
    await expect(page.getByRole('status').filter({ hasText: 'Decision recorded' })).toBeVisible();
  }
  await page.getByRole('button', { name: /Approve documents/ }).click();
  await expect(page.getByRole('heading', { name: 'See the product before choosing the stack.' })).toBeVisible();
  await expect(page.locator('.template-gallery > button')).toHaveCount(12);
  await page.locator('.template-gallery > button').filter({ hasText: 'AI copilot' }).click();
  await page.getByRole('button', { name: /Generate product flow/ }).click();
  await expect(page.locator('.flow-map article')).toHaveCount(4);
  await page.getByRole('button', { name: 'Open editable studio' }).click();
  await expect(page.getByRole('dialog', { name: 'Axiom Wireframe Studio' })).toBeVisible();
  await expect(page.getByLabel('Wireframe screens').getByRole('button')).toHaveCount(4);
  await expect(page.getByLabel('Copilot home editable wireframe canvas')).toBeVisible();
  await expect(page.locator('.wireframe-excalidraw .excalidraw')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save revision' })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Export SVG' })).toBeEnabled();
  await page.getByRole('button', { name: 'Prototype' }).click();
  await expect(page.getByLabel('Copilot home prototype preview')).toBeVisible();
  await page.getByRole('button', { name: 'Close Wireframe Studio' }).click();
  await page.getByRole('button', { name: /Architecture/ }).click();
  await expect(page.getByRole('heading', { name: 'Choose with context, not fashion.' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Architecture diagrams' })).toBeVisible();
  await page.getByLabel('Ask an architecture question').fill('Why not event-driven services?');
  await page.getByRole('button', { name: 'Ask →' }).click();
  await expect(page.getByText(/grounded answer/)).toBeVisible({ timeout: 20_000 });
  await page.getByRole('button', { name: /Approve architecture/ }).click();
  await expect(page.getByRole('heading', { name: 'Your product system is ready for handoff.' })).toBeVisible();
  await expect(page.locator('.handoff-documents article')).toHaveCount(2);
  await page.locator('.experience-topbar').getByRole('button', { name: /^Projects/ }).click();
  await expect(page.getByRole('dialog', { name: 'Your projects' })).toContainText('Digital lending modernization');
  await page.getByRole('button', { name: 'Close project library' }).click();
  await page.getByRole('button', { name: 'Axiom' }).click();
  await page.getByRole('button', { name: /Explore the live sample/ }).click();
  await expect(page.getByRole('heading', { name: 'Axiom', exact: true })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Axiom product lifecycle' }).getByRole('listitem')).toHaveCount(8);
  await page.getByRole('button', { name: 'Run demo fixture instead' }).click();

  await expect(page.getByRole('heading', { name: 'Grounded requirements and evidence', exact: true })).toBeVisible();
  await expect(page.getByLabel('analysis mode')).toContainText('Demo fixture');
  await expect(page.getByLabel('analysis mode')).toContainText('SUCCEEDED');
  await page.getByRole('button', { name: /SP-001/ }).click();
  await expect(page.getByRole('button', { name: /SP-001/ })).toHaveClass(/mark/);

  for (const name of [/100 requests\/sec/, /At-least-once/, /Metadata 90 days/, /Tenant ID from authenticated token/]) {
    await page.getByRole('button', { name }).first().click();
  }

  await expect(page.getByText('Ready for decision')).toBeVisible();
  await expect(page.getByText('Transparent weighted comparison')).toBeVisible();
  await page.getByRole('button', { name: 'Explicitly approve selected option' }).click();
  await expect(page.getByText(/Versioned ADR ADR-001/)).toBeVisible();

  await page.getByRole('button', { name: 'Generate artifact pack' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Artifact pack ready' })).toContainText('9 validated artifacts', { timeout: 30_000 });
  await expect(page.getByRole('tab')).toHaveCount(9);
  await page.getByRole('tab', { name: /OpenAPI 3.1/ }).click();
  await expect(page.getByRole('tabpanel')).toContainText('"openapi": "3.1.0"');
  await expect(page.getByRole('tabpanel')).toContainText('sha256:');

  await page.getByRole('button', { name: 'Generate implementation' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Controlled implementation generated' })).toContainText('5 validated writes', { timeout: 30_000 });
  await expect(page.getByLabel('Generated file tree').getByRole('button')).toHaveCount(5);
  await page.getByRole('button', { name: /src\/notification-service.ts/ }).click();
  await expect(page.getByText(/Unified diff · src\/notification-service.ts/)).toBeVisible();
  await expect(page.getByLabel('selected file trace links')).toContainText('NFR-SEC-001');
  await page.getByRole('button', { name: 'Approve generated code for verification' }).click();
  await expect(page.getByText(/Verification is now authorized but has not been executed/)).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Axiom product lifecycle' }).getByRole('listitem').filter({ hasText: 'Build' })).toContainText('Approved');

  await page.getByRole('button', { name: 'Run fixed verification' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'All fixed commands passed' })).toBeVisible({ timeout: 120_000 });
  await expect(page.locator('.verification-run-card')).toHaveCount(4);
  await expect(page.getByLabel('TypeScript build verification result')).toContainText('TOOL_VERIFIED');
  await expect(page.getByLabel('Unit tests verification result')).toContainText('Tests Passed');
  await expect(page.getByLabel('API tests verification result')).toContainText('Tests Passed');
  await expect(page.getByLabel('V8 coverage verification result')).toContainText('Lines');
  await expect(page.locator('.coverage-matrix')).toContainText('UNKNOWN');
  await expect(page.getByRole('navigation', { name: 'Axiom product lifecycle' }).getByRole('listitem').filter({ hasText: 'Verify' })).toContainText('Evidence verified');

  await page.getByRole('button', { name: /100 requests\/sec/ }).first().click();
  await expect(page.getByText(/Potentially stale/)).toBeVisible();
  await expect(page.getByText(/The ADR is stale/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Generate artifact pack' })).toBeDisabled();
  await expect(page.getByText(/Generate the governed artifact pack first/)).toBeVisible();
});

test('renders server-returned live mode metadata from a mocked API response', async ({ page }) => {
  const response = fixtureAnalysisResult({
    label: 'Live AI',
    providerName: 'openai-responses',
    modelName: 'mock-live-model',
    mode: 'live',
    startedAt: now,
    completedAt: now,
    outcome: 'SUCCEEDED',
  });
  response.architectureOptions = response.architectureOptions.map((option, index) => ({
    ...option,
    id: `ARCH-LIVE-${index + 1}`,
  }));

  await page.route('**/api/analyze', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(response) });
  });
  await page.goto('/');
  await page.getByRole('button', { name: /Explore the live sample/ }).click();
  await page.getByRole('button', { name: 'Analyze intent' }).click();

  await expect(page.getByLabel('analysis mode')).toContainText('Live AI · openai-responses · mock-live-model · SUCCEEDED');
  await expect(page.getByRole('heading', { name: 'Grounded requirements and evidence', exact: true })).toBeVisible();
});

test('preserves the last valid analysis and displays failed live-run metadata', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Explore the live sample/ }).click();
  await page.getByRole('button', { name: 'Run demo fixture instead' }).click();
  await expect(page.getByRole('heading', { name: 'Grounded requirements and evidence', exact: true })).toBeVisible();

  await page.route('**/api/analyze', async (route) => {
    await route.fulfill({
      status: 502,
      contentType: 'application/json',
      body: JSON.stringify({
        error: 'Mock live provider failure',
        run: {
          label: 'Live AI failed · no fixture substituted',
          providerName: 'openai-responses',
          modelName: 'mock-live-model',
          mode: 'live',
          startedAt: now,
          completedAt: now,
          outcome: 'FAILED',
          error: 'Mock live provider failure',
        },
      }),
    });
  });
  await page.getByRole('button', { name: 'Analyze intent' }).click();

  const analysisAlert = page.getByRole('alert').filter({ hasText: 'Analysis failed.' });
  await expect(analysisAlert).toContainText('Mock live provider failure');
  await expect(analysisAlert).toContainText('last valid analysis remains visible');
  await expect(page.getByRole('heading', { name: 'Grounded requirements and evidence', exact: true })).toBeVisible();
  await expect(page.getByLabel('analysis mode')).toContainText('Live AI failed · no fixture substituted');
  await expect(page.getByLabel('analysis mode')).toContainText('FAILED');
});

import { test, expect } from '@playwright/test';
import { fixtureAnalysisResult } from '../src/domain/day2';

const now = new Date().toISOString();

test('NotifyFlow Day 2 fixture happy path through API', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Run demo fixture instead' }).click();

  await expect(page.getByRole('heading', { name: 'Grounded analysis', exact: true })).toBeVisible();
  await expect(page.getByLabel('analysis mode')).toContainText('Demo fixture');
  await expect(page.getByLabel('analysis mode')).toContainText('SUCCEEDED');
  await page.getByRole('button', { name: /SP-001/ }).click();
  await expect(page.getByRole('button', { name: /SP-001/ })).toHaveClass(/mark/);

  for (const name of [/100 requests\/sec/, /At-least-once/, /Metadata 90 days/, /Tenant ID from authenticated token/]) {
    await page.getByRole('button', { name }).first().click();
  }

  await expect(page.getByText('Unlocked')).toBeVisible();
  await expect(page.getByText('Transparent weighted comparison')).toBeVisible();
  await page.getByRole('button', { name: 'Explicitly approve selected option' }).click();
  await expect(page.getByText(/Versioned ADR ADR-001/)).toBeVisible();

  await page.getByRole('button', { name: 'Generate artifact pack' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Artifact pack ready' })).toContainText('9 validated artifacts');
  await expect(page.getByRole('tab')).toHaveCount(9);
  await page.getByRole('tab', { name: /OpenAPI 3.1/ }).click();
  await expect(page.getByRole('tabpanel')).toContainText('"openapi": "3.1.0"');
  await expect(page.getByRole('tabpanel')).toContainText('sha256:');

  await page.getByRole('button', { name: /100 requests\/sec/ }).first().click();
  await expect(page.getByText(/Potentially stale/)).toBeVisible();
  await expect(page.getByText(/The ADR is stale/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Generate artifact pack' })).toBeDisabled();
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
  await page.getByRole('button', { name: 'Analyze Brief' }).click();

  await expect(page.getByLabel('analysis mode')).toContainText('Live AI · openai-responses · mock-live-model · SUCCEEDED');
  await expect(page.getByRole('heading', { name: 'Grounded analysis', exact: true })).toBeVisible();
});

test('preserves the last valid analysis and displays failed live-run metadata', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Run demo fixture instead' }).click();
  await expect(page.getByRole('heading', { name: 'Grounded analysis', exact: true })).toBeVisible();

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
  await page.getByRole('button', { name: 'Analyze Brief' }).click();

  const analysisAlert = page.getByRole('alert').filter({ hasText: 'Analysis failed.' });
  await expect(analysisAlert).toContainText('Mock live provider failure');
  await expect(analysisAlert).toContainText('last valid analysis remains visible');
  await expect(page.getByRole('heading', { name: 'Grounded analysis', exact: true })).toBeVisible();
  await expect(page.getByLabel('analysis mode')).toContainText('Live AI failed · no fixture substituted');
  await expect(page.getByLabel('analysis mode')).toContainText('FAILED');
});

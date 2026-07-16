import { expect, test } from '@playwright/test';

test('complete NotifyFlow Day 1 happy path', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Turn ambiguous intent into grounded requirements.' })).toBeVisible();
  await expect(page.getByText('Build a multi-tenant customer notification service')).toBeVisible();
  await page.getByRole('button', { name: 'Analyze Brief' }).click();
  await expect(page.getByRole('status')).toContainText('Validating fixture output');
  await expect(page.getByText('Implementation-readiness score')).toBeVisible();
  await expect(page.getByText('Support email and SMS channels')).toBeVisible();
  await page.getByRole('button', { name: 'Missing decisions' }).click();
  await expect(page.getByText('Tenant identity and authorization are undefined')).toBeVisible();
  await page.getByRole('button', { name: /Open supporting excerpt span-3/ }).click();
  await expect(page.getByTestId('evidence-drawer')).toContainText('retries');
  await page.getByRole('button', { name: 'Reset demo' }).click();
  await expect(page.getByText('Analysis not started')).toBeVisible();
});


import { defineConfig, devices } from '@playwright/test';

const localBaseUrl = 'http://127.0.0.1:3000';
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? localBaseUrl;

export default defineConfig({
  testDir: './e2e',
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: 'pnpm dev',
        url: localBaseUrl,
        reuseExistingServer: true,
        timeout: 120_000,
      },
  use: { baseURL, ...devices['Desktop Chrome'] },
});


import { defineConfig, devices } from '@playwright/test';

const port = process.env.AXIOM_E2E_PORT ?? '3000';
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './e2e',
  webServer: {
    command: `pnpm dev --port ${port}`,
    url: baseURL,
    reuseExistingServer: true,
    timeout: 120000,
  },
  use: { baseURL, ...devices['Desktop Chrome'] },
});

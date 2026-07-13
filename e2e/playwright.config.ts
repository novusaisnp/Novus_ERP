import { defineConfig, devices } from '@playwright/test';

/**
 * NOVUS ERP — E2E Playwright configuration.
 * Baseado no plano P16.2.
 *
 * Variáveis de ambiente esperadas:
 * - E2E_BASE_URL (default: http://localhost:8080)
 * - E2E_USER, E2E_PASS (credenciais do tenant E2E TEST CO)
 */

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:8080';

export default defineConfig({
  testDir: './tests',
  outputDir: '../test-results',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [
    ['list'],
    ['html', { outputFolder: '../playwright-report', open: 'never' }],
  ],
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
  ],
});

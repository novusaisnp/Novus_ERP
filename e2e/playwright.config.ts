import { defineConfig, devices } from '@playwright/test';

/**
 * NOVUS ERP — E2E Playwright configuration.
 * Baseado no plano P16.2 / consolidado em P16.4.
 *
 * Variáveis de ambiente esperadas:
 * - E2E_BASE_URL (default: http://localhost:3000 — porta fixa do ERP, ver CLAUDE.md raiz)
 * - E2E_USER, E2E_PASS (credenciais do tenant E2E TEST CO)
 * - E2E_START_DEV_SERVER=1 para subir o Vite via Playwright (CI opcional)
 */

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:3000';
const START_DEV = process.env.E2E_START_DEV_SERVER === '1';

export default defineConfig({
  testDir: './tests',
  outputDir: '../test-results',
  fullyParallel: false, // P16.4: seriar para evitar contenção no dbReset por tenant único.
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // P16.4: um worker garante idempotência do tenant `E2E TEST CO`.
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI
    ? [['github'], ['list'], ['html', { outputFolder: '../playwright-report', open: 'never' }]]
    : [['list'], ['html', { outputFolder: '../playwright-report', open: 'never' }]],
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 20_000,
  },
  ...(START_DEV
    ? {
        webServer: {
          command: 'npm run dev',
          url: BASE_URL,
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
        },
      }
    : {}),
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

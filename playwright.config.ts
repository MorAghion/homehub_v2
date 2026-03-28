import { defineConfig, devices } from '@playwright/test';

/**
 * HomeHub v2 — Playwright E2E configuration
 *
 * Tests run on merge to `master` via GitHub Actions (see .github/workflows/e2e.yml).
 * Locally: `npx playwright test`
 *
 * Base URL: process.env.BASE_URL (CI injects Vercel preview URL) or localhost:5173.
 * Auth storage: each test file that needs an authenticated session uses the
 * `authenticatedPage` fixture defined in e2e/fixtures.ts, which calls
 * the Supabase test helpers to seed + authenticate a fresh test user.
 */

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',

  /* Run tests in files in parallel */
  fullyParallel: true,

  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,

  /* Opt out of parallel tests on CI */
  workers: process.env.CI ? 1 : undefined,

  /* Reporter */
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    ...(process.env.CI ? [['github'] as [string]] : []),
  ],

  /* Shared settings for all the projects below */
  use: {
    /* Base URL to use in tests */
    baseURL: process.env.BASE_URL ?? 'http://localhost:5173',

    /* Collect trace when retrying the failed test */
    trace: 'on-first-retry',

    /* Screenshot on failure */
    screenshot: 'only-on-failure',

    /* Video on failure */
    video: 'retain-on-failure',

    /* Default timeout per action */
    actionTimeout: 10_000,

    /* Navigation timeout */
    navigationTimeout: 30_000,
  },

  /* Configure projects for major browsers + mobile */
  projects: [
    /* --- setup: seed a global test user (email verified, household created) --- */
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },

    /* --- Desktop browsers --- */
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      dependencies: ['setup'],
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      dependencies: ['setup'],
    },

    /* --- Mobile viewports --- */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
      dependencies: ['setup'],
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
      dependencies: ['setup'],
    },
  ],

  /* Run your local dev server before starting the tests when not in CI */
  webServer: process.env.CI
    ? undefined
    : {
        command: 'npm run dev',
        url: 'http://localhost:5173',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});

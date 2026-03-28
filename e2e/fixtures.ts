/**
 * HomeHub v2 — Playwright test fixtures
 *
 * Provides:
 *   - `page`             — raw Playwright page (unauthenticated)
 *   - `authenticatedPage` — page with a signed-in test user (fresh per test)
 *   - `householdPage`    — page signed in as the primary test user who already
 *                          has a household set up (reuses the global test user
 *                          created in global.setup.ts)
 *
 * Supabase test helpers use the service-role key to bypass RLS and set up
 * deterministic test data. All test users are cleaned up by the teardown step.
 */

import { test as base, expect, type Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Test credentials and env helpers
// ---------------------------------------------------------------------------

export const TEST_EMAIL = process.env.TEST_USER_EMAIL ?? 'e2e-primary@homehub.test';
export const TEST_PASSWORD = process.env.TEST_USER_PASSWORD ?? 'E2eTestPass!1';

export const TEST_PARTNER_EMAIL =
  process.env.TEST_PARTNER_EMAIL ?? 'e2e-partner@homehub.test';
export const TEST_PARTNER_PASSWORD =
  process.env.TEST_PARTNER_PASSWORD ?? 'E2ePartnerPass!1';

function supabaseAdmin() {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      'Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars. ' +
        'Copy .env.test.example → .env.test and fill in the values.'
    );
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

// ---------------------------------------------------------------------------
// Page-level helpers (sign in / out via the UI)
// ---------------------------------------------------------------------------

export async function signInViaUI(page: Page, email: string, password: string) {
  await page.goto('/');
  // App redirects unauthenticated users to /auth
  await page.waitForURL('**/auth**');

  await page.getByRole('tab', { name: /sign in/i }).click();
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();

  // Wait for redirect to dashboard after successful auth
  await page.waitForURL('**/');
  await expect(page.getByTestId('home-dashboard')).toBeVisible();
}

export async function signOutViaUI(page: Page) {
  await page.goto('/settings');
  await page.getByRole('button', { name: /sign out/i }).click();
  await page.waitForURL('**/auth**');
}

// ---------------------------------------------------------------------------
// Custom fixture types
// ---------------------------------------------------------------------------

type Fixtures = {
  /** Unauthenticated page — navigate to /auth to start auth flow tests. */
  freshPage: Page;

  /**
   * Page signed in as the primary test user.
   * This user has a household with no sub-hubs (clean slate per test).
   */
  authenticatedPage: Page;

  /**
   * Supabase admin client — bypasses RLS, useful for seeding / reading data
   * to assert on without going through the UI.
   */
  supabaseAdmin: ReturnType<typeof supabaseAdmin>;
};

// ---------------------------------------------------------------------------
// Fixture implementations
// ---------------------------------------------------------------------------

export const test = base.extend<Fixtures>({
  freshPage: async ({ page }, use) => {
    // Navigate away from any saved state
    await page.goto('/auth');
    await use(page);
  },

  authenticatedPage: async ({ page }, use) => {
    await signInViaUI(page, TEST_EMAIL, TEST_PASSWORD);
    await use(page);
    // Cleanup: sign out so the browser state is fresh for the next test
    await signOutViaUI(page).catch(() => {
      // ignore — test may have already signed out
    });
  },

  supabaseAdmin: async ({}, use) => {
    const client = supabaseAdmin();
    await use(client);
  },
});

export { expect };

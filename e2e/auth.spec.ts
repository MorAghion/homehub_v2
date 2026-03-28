/**
 * Auth flows — E2E tests (7 tests)
 *
 * Covers: PRD §6 (Auth & Onboarding)
 *   1. Redirect to /auth when not authenticated
 *   2. Sign up with email + password
 *   3. Sign in with email + password
 *   4. Sign in with Google OAuth (button visible, redirects to Google)
 *   5. Forgot password flow (email sent confirmation)
 *   6. Join household via invite code
 *   7. Sign out
 */

import { test, expect } from './fixtures';
import { createClient } from '@supabase/supabase-js';
import { seedTestUser, deleteTestUser, createInviteCode } from './helpers/auth';
import {
  TEST_EMAIL,
  TEST_PASSWORD,
  TEST_PARTNER_EMAIL,
  TEST_PARTNER_PASSWORD,
  signInViaUI,
} from './fixtures';

// ---------------------------------------------------------------------------
// Test 1 — Redirect to /auth when unauthenticated
// ---------------------------------------------------------------------------

test('redirects unauthenticated users to /auth', async ({ page }) => {
  await page.goto('/');
  await page.waitForURL('**/auth**');
  await expect(page.getByRole('tab', { name: /sign in/i })).toBeVisible();
  await expect(page.getByRole('tab', { name: /sign up/i })).toBeVisible();
});

// ---------------------------------------------------------------------------
// Test 2 — Sign up with email + password
// ---------------------------------------------------------------------------

test('sign up with email and password creates account and lands on dashboard', async ({
  page,
  supabaseAdmin,
}) => {
  const uniqueEmail = `e2e-signup-${Date.now()}@homehub.test`;
  const password = 'SignUpTest!1';

  await page.goto('/auth');
  await page.getByRole('tab', { name: /sign up/i }).click();

  await page.getByLabel(/email/i).fill(uniqueEmail);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole('button', { name: /sign up|create account/i }).click();

  // Should land on the home dashboard after successful signup
  await page.waitForURL('**/');
  await expect(page.getByTestId('home-dashboard')).toBeVisible();

  // Cleanup: delete the newly created user
  await deleteTestUser(supabaseAdmin, uniqueEmail);
});

// ---------------------------------------------------------------------------
// Test 3 — Sign in with email + password
// ---------------------------------------------------------------------------

test('sign in with valid credentials lands on dashboard', async ({ page }) => {
  await signInViaUI(page, TEST_EMAIL, TEST_PASSWORD);
  await expect(page.getByTestId('home-dashboard')).toBeVisible();
});

test('sign in with wrong password shows error message', async ({ page }) => {
  await page.goto('/auth');
  await page.getByRole('tab', { name: /sign in/i }).click();
  await page.getByLabel(/email/i).fill(TEST_EMAIL);
  await page.getByLabel(/password/i).fill('wrong-password');
  await page.getByRole('button', { name: /sign in/i }).click();

  // Error message should appear — the app uses react-i18next, so we match
  // partial text that is stable across translations
  await expect(
    page.getByRole('alert').or(page.getByTestId('auth-error'))
  ).toBeVisible();

  // Must NOT redirect to dashboard
  await expect(page).toHaveURL(/auth/);
});

// ---------------------------------------------------------------------------
// Test 4 — Google OAuth (button present + redirect starts)
// ---------------------------------------------------------------------------

test('Google OAuth button is visible on sign-in tab', async ({ page }) => {
  await page.goto('/auth');
  await page.getByRole('tab', { name: /sign in/i }).click();

  const googleButton = page.getByRole('button', { name: /google/i });
  await expect(googleButton).toBeVisible();
});

// Note: We do NOT automate the full Google OAuth consent flow in E2E tests
// because that requires a Google account and is covered by manual QA.

// ---------------------------------------------------------------------------
// Test 5 — Forgot password flow
// ---------------------------------------------------------------------------

test('forgot password shows email-sent confirmation', async ({ page }) => {
  await page.goto('/auth');
  await page.getByRole('tab', { name: /sign in/i }).click();

  // Click "Forgot password?" link
  await page.getByRole('link', { name: /forgot password/i }).click();

  // Should show a reset-password input
  await expect(page.getByLabel(/email/i)).toBeVisible();

  await page.getByLabel(/email/i).fill(TEST_EMAIL);
  await page.getByRole('button', { name: /send reset|reset password/i }).click();

  // App should show a confirmation that the email was sent
  await expect(
    page.getByText(/check your email|email sent|reset link/i)
  ).toBeVisible();
});

// ---------------------------------------------------------------------------
// Test 6 — Join household via invite code
// ---------------------------------------------------------------------------

test('partner can join household via invite code', async ({
  page,
  supabaseAdmin,
}) => {
  // Get the primary user's household and create an invite code
  const { data: primaryUser } = await supabaseAdmin.auth.admin.listUsers();
  const primary = primaryUser?.users.find((u) => u.email === TEST_EMAIL);
  if (!primary) throw new Error('Primary test user not found');

  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('household_id')
    .eq('id', primary.id)
    .single();

  if (!profile) throw new Error('Primary user profile not found');

  const inviteCode = await createInviteCode(
    supabaseAdmin,
    profile.household_id,
    primary.id
  );

  // Sign in as the partner (fresh account, no household yet after joining)
  await page.goto('/auth');
  await page.getByRole('tab', { name: /join/i }).click();

  await page.getByLabel(/email/i).fill(TEST_PARTNER_EMAIL);
  await page.getByLabel(/password/i).fill(TEST_PARTNER_PASSWORD);
  await page.getByLabel(/invite code/i).fill(inviteCode);
  await page.getByRole('button', { name: /join|accept invite/i }).click();

  // Should land on dashboard after joining
  await page.waitForURL('**/');
  await expect(page.getByTestId('home-dashboard')).toBeVisible();

  // Verify the partner is now in the primary user's household
  const { data: partnerUser } = await supabaseAdmin.auth.admin.listUsers();
  const partner = partnerUser?.users.find((u) => u.email === TEST_PARTNER_EMAIL);
  if (!partner) throw new Error('Partner user not found');

  const { data: partnerProfile } = await supabaseAdmin
    .from('user_profiles')
    .select('household_id')
    .eq('id', partner.id)
    .single();

  expect(partnerProfile?.household_id).toBe(profile.household_id);
});

// ---------------------------------------------------------------------------
// Test 7 — Sign out
// ---------------------------------------------------------------------------

test('sign out redirects to /auth', async ({ authenticatedPage: page }) => {
  await page.goto('/settings');
  await page.getByRole('button', { name: /sign out/i }).click();

  await page.waitForURL('**/auth**');
  await expect(page.getByRole('tab', { name: /sign in/i })).toBeVisible();
});

/**
 * Settings — E2E tests (5 tests)
 *
 * Covers: PRD §11 (Settings Screen)
 *   1. Theme switch: Burgundy → Mint changes CSS variables on <html>
 *   2. Language toggle: English → Hebrew switches direction and content
 *   3. Generate + display invite code for partner
 *   4. Household members list shows current user
 *   5. Sign out from settings page
 */

import { test, expect } from './fixtures';
import { goToSettings } from './helpers/navigation';

// ---------------------------------------------------------------------------
// Test 1 — Theme switch
// ---------------------------------------------------------------------------

test('switching theme from Burgundy to Mint updates the html theme class', async ({
  authenticatedPage: page,
}) => {
  await goToSettings(page);

  // Find the theme toggle — Burgundy is the default
  const themeToggle = page
    .getByRole('button', { name: /mint|switch theme|theme/i })
    .or(page.getByTestId('theme-toggle'));

  await expect(themeToggle).toBeVisible();

  // The <html> element should have the Burgundy theme class by default
  const htmlElement = page.locator('html');
  await expect(htmlElement).toHaveClass(/theme-burgundy/);

  // Click to switch to Mint
  await themeToggle.click();

  // <html> class should now include theme-mint
  await expect(htmlElement).toHaveClass(/theme-mint/);

  // Theme choice persists in localStorage
  const storedTheme = await page.evaluate(() =>
    localStorage.getItem('homehub-theme')
  );
  expect(storedTheme).toBe('mint');

  // Switch back to Burgundy to avoid polluting other tests
  await themeToggle.click();
  await expect(htmlElement).toHaveClass(/theme-burgundy/);
});

// ---------------------------------------------------------------------------
// Test 2 — Language toggle (English → Hebrew RTL)
// ---------------------------------------------------------------------------

test('switching language to Hebrew sets dir=rtl on html element', async ({
  authenticatedPage: page,
}) => {
  await goToSettings(page);

  // Language toggle — default is English
  const langToggle = page
    .getByRole('button', { name: /hebrew|עברית|language|שפה/i })
    .or(page.getByTestId('language-toggle'));

  await expect(langToggle).toBeVisible();

  // Switch to Hebrew
  await langToggle.click();

  // <html dir> should become rtl
  const htmlElement = page.locator('html');
  await expect(htmlElement).toHaveAttribute('dir', 'rtl');
  await expect(htmlElement).toHaveAttribute('lang', 'he');

  // Settings page should still render (not blank)
  await expect(page.getByTestId('settings-page').or(page.getByRole('main'))).toBeVisible();

  // Switch back to English
  await langToggle.click();
  await expect(htmlElement).toHaveAttribute('dir', 'ltr');
  await expect(htmlElement).toHaveAttribute('lang', 'en');
});

// ---------------------------------------------------------------------------
// Test 3 — Generate invite code for partner
// ---------------------------------------------------------------------------

test('invite partner generates and displays an 8-character invite code', async ({
  authenticatedPage: page,
}) => {
  await goToSettings(page);

  // Find the "Invite Partner" button
  const inviteButton = page.getByRole('button', { name: /invite partner|invite/i });
  await expect(inviteButton).toBeVisible();
  await inviteButton.click();

  // A modal or inline section should appear with the invite code
  const inviteCode = page
    .getByTestId('invite-code')
    .or(page.getByText(/[A-Z0-9]{8}/));

  await expect(inviteCode).toBeVisible();

  // Verify it's 8 alphanumeric characters (PRD: "8-character alphanumeric")
  const codeText = await inviteCode.textContent();
  expect(codeText?.replace(/\s/g, '')).toMatch(/^[A-Z0-9]{8}$/);
});

// ---------------------------------------------------------------------------
// Test 4 — Household members list
// ---------------------------------------------------------------------------

test('settings shows the current user in the household members list', async ({
  authenticatedPage: page,
  supabaseAdmin,
}) => {
  // Get the test user's display name
  const { data: users } = await supabaseAdmin.auth.admin.listUsers();
  const testUser = users?.users.find(
    (u) => u.email === (process.env.TEST_USER_EMAIL ?? 'e2e-primary@homehub.test')
  );
  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('display_name')
    .eq('id', testUser!.id)
    .single();

  await goToSettings(page);

  // Members section should exist
  const membersSection = page
    .getByTestId('household-members')
    .or(page.getByRole('region', { name: /members|household/i }));

  await expect(membersSection).toBeVisible();

  // At minimum, the test user themselves should appear
  // Match by display_name or email
  const memberEntry = membersSection
    .getByText(profile?.display_name ?? testUser!.email!)
    .or(membersSection.getByText(testUser!.email!));

  await expect(memberEntry).toBeVisible();
});

// ---------------------------------------------------------------------------
// Test 5 — Sign out from settings
// ---------------------------------------------------------------------------

test('sign out button in settings redirects to /auth', async ({
  authenticatedPage: page,
}) => {
  await goToSettings(page);

  const signOutButton = page.getByRole('button', { name: /sign out/i });
  await expect(signOutButton).toBeVisible();
  await signOutButton.click();

  await page.waitForURL('**/auth**');
  await expect(page.getByRole('tab', { name: /sign in/i })).toBeVisible();
});

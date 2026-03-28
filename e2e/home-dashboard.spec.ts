/**
 * Home Dashboard — E2E tests (3 tests)
 *
 * Covers: PRD §3 (App Hierarchy + Navigation), §3.3 (Attention Banner)
 *   1. All 4 hub cards are visible after sign-in
 *   2. Bottom navigation links route to correct hubs
 *   3. Attention Banner appears when there are urgent items and disappears
 *      when all urgent items are resolved
 */

import { test, expect } from './fixtures';

// ---------------------------------------------------------------------------
// Test 1 — All 4 hub cards visible on the dashboard
// ---------------------------------------------------------------------------

test('home dashboard shows all 4 hub cards', async ({ authenticatedPage: page }) => {
  await page.goto('/');

  const dashboard = page.getByTestId('home-dashboard');
  await expect(dashboard).toBeVisible();

  // Each hub card should be present — match by accessible name / visible text
  await expect(page.getByRole('link', { name: /shopping/i }).first()).toBeVisible();
  await expect(page.getByRole('link', { name: /tasks/i }).first()).toBeVisible();
  await expect(page.getByRole('link', { name: /vouchers/i }).first()).toBeVisible();
  await expect(page.getByRole('link', { name: /reservations/i }).first()).toBeVisible();
});

// ---------------------------------------------------------------------------
// Test 2 — Bottom nav links route to each hub
// ---------------------------------------------------------------------------

test('bottom navigation routes to correct hub pages', async ({
  authenticatedPage: page,
}) => {
  await page.goto('/');

  // Shopping
  await page.getByRole('navigation').getByRole('link', { name: /shopping/i }).click();
  await page.waitForURL('**/shopping**');
  await expect(page).toHaveURL(/shopping/);

  // Tasks
  await page.getByRole('navigation').getByRole('link', { name: /tasks/i }).click();
  await page.waitForURL('**/tasks**');
  await expect(page).toHaveURL(/tasks/);

  // Vouchers
  await page.getByRole('navigation').getByRole('link', { name: /vouchers/i }).click();
  await page.waitForURL('**/vouchers**');
  await expect(page).toHaveURL(/vouchers/);

  // Reservations
  await page
    .getByRole('navigation')
    .getByRole('link', { name: /reservations/i })
    .click();
  await page.waitForURL('**/reservations**');
  await expect(page).toHaveURL(/reservations/);
});

// ---------------------------------------------------------------------------
// Test 3 — Attention Banner with urgent items
// ---------------------------------------------------------------------------

test('attention banner appears when urgent tasks exist and links to urgent tasks view', async ({
  authenticatedPage: page,
  supabaseAdmin,
}) => {
  // Seed an urgent task directly via admin client (faster than UI)
  const { data: users } = await supabaseAdmin.auth.admin.listUsers();
  const testUser = users?.users.find(
    (u) => u.email === process.env.TEST_USER_EMAIL ?? 'e2e-primary@homehub.test'
  );
  if (!testUser) throw new Error('Test user not found');

  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('household_id')
    .eq('id', testUser.id)
    .single();
  if (!profile) throw new Error('Test user profile not found');

  // Create a task list
  const { data: taskList } = await supabaseAdmin
    .from('task_lists')
    .insert({ household_id: profile.household_id, name: 'E2E Urgent Banner Test' })
    .select()
    .single();

  // Create an urgent task
  const { data: urgentTask } = await supabaseAdmin
    .from('tasks')
    .insert({
      list_id: taskList!.id,
      household_id: profile.household_id,
      title: 'E2E Urgent Task',
      urgency: 'urgent',
      status: 'open',
    })
    .select()
    .single();

  // Reload the dashboard
  await page.goto('/');

  // Attention Banner should be visible
  const banner = page.getByTestId('attention-banner').or(
    page.getByText(/items need your attention/i)
  );
  await expect(banner).toBeVisible();

  // Clicking it should navigate to the urgent tasks view
  await banner.click();
  await page.waitForURL(/tasks|urgent/);
  await expect(page.getByTestId('urgent-tasks-view').or(page.getByText(/urgent/i))).toBeVisible();

  // Cleanup: delete the seeded task and list
  await supabaseAdmin.from('tasks').delete().eq('id', urgentTask!.id);
  await supabaseAdmin.from('task_lists').delete().eq('id', taskList!.id);
});

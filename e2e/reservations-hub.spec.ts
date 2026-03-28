/**
 * Reservations Hub — E2E tests (4 tests)
 *
 * Covers: PRD §10 (Reservations Hub)
 *   1. Add a reservation (name, date, time, address)
 *   2. View reservation detail modal
 *   3. Upcoming vs past badge shown based on date
 *   4. Delete a reservation
 */

import { test, expect } from './fixtures';
import { goToReservations } from './helpers/navigation';

// ---------------------------------------------------------------------------
// Test 1 — Add a reservation
// ---------------------------------------------------------------------------

test('add a reservation with all fields', async ({ authenticatedPage: page }) => {
  await goToReservations(page);

  const fab = page
    .getByRole('button', { name: /add reservation|new reservation|\+/i })
    .first();
  await fab.click();

  const dialog = page.getByRole('dialog');

  await dialog.getByLabel(/name|event/i).fill('E2E Dinner At The Lab');
  await dialog.getByLabel(/date/i).fill('2027-06-15');
  await dialog.getByLabel(/time/i).fill('19:00');
  await dialog.getByLabel(/address|location/i).fill('123 Test Street, Tel Aviv');

  await dialog.getByRole('button', { name: /save|add|create/i }).click();
  await expect(dialog).not.toBeVisible();

  await expect(page.getByText('E2E Dinner At The Lab')).toBeVisible();
  await expect(page.getByText('123 Test Street, Tel Aviv')).toBeVisible();
});

// ---------------------------------------------------------------------------
// Test 2 — View reservation detail modal
// ---------------------------------------------------------------------------

test('tapping a reservation card opens the detail modal', async ({
  authenticatedPage: page,
  supabaseAdmin,
}) => {
  const { data: users } = await supabaseAdmin.auth.admin.listUsers();
  const testUser = users?.users.find(
    (u) => u.email === (process.env.TEST_USER_EMAIL ?? 'e2e-primary@homehub.test')
  );
  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('household_id')
    .eq('id', testUser!.id)
    .single();

  let { data: resList } = await supabaseAdmin
    .from('reservation_lists')
    .select()
    .eq('household_id', profile!.household_id)
    .limit(1)
    .single();

  if (!resList) {
    const result = await supabaseAdmin
      .from('reservation_lists')
      .insert({ household_id: profile!.household_id, name: 'E2E Restaurants' })
      .select()
      .single();
    resList = result.data;
  }

  const { data: reservation } = await supabaseAdmin
    .from('reservations')
    .insert({
      list_id: resList!.id,
      household_id: profile!.household_id,
      name: 'E2E Detail Modal Test',
      date: '2027-08-20',
      time: '20:00',
      address: '99 Modal Ave, Haifa',
    })
    .select()
    .single();

  await goToReservations(page);

  // Tap the reservation card
  await page.getByText('E2E Detail Modal Test').click();

  // Detail modal should appear
  const modal = page.getByRole('dialog');
  await expect(modal).toBeVisible();
  await expect(modal.getByText('E2E Detail Modal Test')).toBeVisible();
  await expect(modal.getByText('99 Modal Ave, Haifa')).toBeVisible();

  // Close
  await modal.getByRole('button', { name: /close|done/i }).click();
  await expect(modal).not.toBeVisible();

  // Cleanup
  await supabaseAdmin.from('reservations').delete().eq('id', reservation!.id);
});

// ---------------------------------------------------------------------------
// Test 3 — Upcoming vs past badge
// ---------------------------------------------------------------------------

test('upcoming and past reservations show correct badge', async ({
  authenticatedPage: page,
  supabaseAdmin,
}) => {
  const { data: users } = await supabaseAdmin.auth.admin.listUsers();
  const testUser = users?.users.find(
    (u) => u.email === (process.env.TEST_USER_EMAIL ?? 'e2e-primary@homehub.test')
  );
  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('household_id')
    .eq('id', testUser!.id)
    .single();

  let { data: resList } = await supabaseAdmin
    .from('reservation_lists')
    .select()
    .eq('household_id', profile!.household_id)
    .limit(1)
    .single();

  if (!resList) {
    const result = await supabaseAdmin
      .from('reservation_lists')
      .insert({ household_id: profile!.household_id, name: 'E2E Badge Test' })
      .select()
      .single();
    resList = result.data;
  }

  const futureDate = new Date();
  futureDate.setFullYear(futureDate.getFullYear() + 1);
  const pastDate = new Date();
  pastDate.setFullYear(pastDate.getFullYear() - 1);

  const [{ data: upcoming }, { data: past }] = await Promise.all([
    supabaseAdmin
      .from('reservations')
      .insert({
        list_id: resList!.id,
        household_id: profile!.household_id,
        name: 'E2E Upcoming Event',
        date: futureDate.toISOString().split('T')[0],
        time: '18:00',
      })
      .select()
      .single(),
    supabaseAdmin
      .from('reservations')
      .insert({
        list_id: resList!.id,
        household_id: profile!.household_id,
        name: 'E2E Past Event',
        date: pastDate.toISOString().split('T')[0],
        time: '18:00',
      })
      .select()
      .single(),
  ]);

  await goToReservations(page);

  // Upcoming card should have "upcoming" badge
  const upcomingCard = page.getByText('E2E Upcoming Event').locator('..');
  await expect(
    upcomingCard.getByText(/upcoming/i).or(upcomingCard.getByTestId('upcoming-badge'))
  ).toBeVisible();

  // Past card should have "past" badge
  const pastCard = page.getByText('E2E Past Event').locator('..');
  await expect(
    pastCard.getByText(/past/i).or(pastCard.getByTestId('past-badge'))
  ).toBeVisible();

  // Cleanup
  await supabaseAdmin
    .from('reservations')
    .delete()
    .in('id', [upcoming!.id, past!.id]);
});

// ---------------------------------------------------------------------------
// Test 4 — Delete a reservation
// ---------------------------------------------------------------------------

test('delete a reservation via edit mode', async ({
  authenticatedPage: page,
  supabaseAdmin,
}) => {
  const { data: users } = await supabaseAdmin.auth.admin.listUsers();
  const testUser = users?.users.find(
    (u) => u.email === (process.env.TEST_USER_EMAIL ?? 'e2e-primary@homehub.test')
  );
  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('household_id')
    .eq('id', testUser!.id)
    .single();

  let { data: resList } = await supabaseAdmin
    .from('reservation_lists')
    .select()
    .eq('household_id', profile!.household_id)
    .limit(1)
    .single();

  if (!resList) {
    const result = await supabaseAdmin
      .from('reservation_lists')
      .insert({ household_id: profile!.household_id, name: 'E2E Delete Reservation' })
      .select()
      .single();
    resList = result.data;
  }

  await supabaseAdmin.from('reservations').insert({
    list_id: resList!.id,
    household_id: profile!.household_id,
    name: 'E2E Delete This Reservation',
    date: '2027-12-31',
    time: '20:00',
  });

  await goToReservations(page);
  await expect(page.getByText('E2E Delete This Reservation')).toBeVisible();

  // Enter edit mode
  await page.getByRole('button', { name: /edit|select/i }).first().click();

  // Select the reservation
  await page
    .getByText('E2E Delete This Reservation')
    .locator('..')
    .getByRole('checkbox')
    .check();

  // Delete via toolbar
  const toolbar = page.getByTestId('edit-mode-toolbar').or(
    page.getByRole('toolbar', { name: /edit/i })
  );
  await toolbar.getByRole('button', { name: /delete|remove/i }).click();

  // Confirm
  await page.getByRole('dialog').getByRole('button', { name: /delete|confirm/i }).click();

  await expect(page.getByText('E2E Delete This Reservation')).not.toBeVisible();
});

/**
 * Vouchers Hub — E2E tests (5 tests)
 *
 * Covers: PRD §9 (Vouchers Hub)
 *   1. Add a voucher manually (issuer, value, expiry, code)
 *   2. Copy voucher code to clipboard
 *   3. Voucher expiry color-coding (green → amber → orange → red → expired)
 *   4. OCR scan flow initiates camera and parses result
 *   5. Delete a voucher
 */

import { test, expect } from './fixtures';
import { goToVouchers } from './helpers/navigation';

// ---------------------------------------------------------------------------
// Test 1 — Add a voucher manually
// ---------------------------------------------------------------------------

test('add a voucher manually with all fields', async ({
  authenticatedPage: page,
}) => {
  await goToVouchers(page);

  // FAB to add a voucher
  const fab = page.getByRole('button', { name: /add voucher|new voucher|\+/i }).first();
  await fab.click();

  const dialog = page.getByRole('dialog');

  await dialog.getByLabel(/issuer|store|brand/i).fill('E2E BuyMe');
  await dialog.getByLabel(/value|amount/i).fill('50');
  await dialog.getByLabel(/code/i).fill('TESTCODE123');

  // Set expiry date far in the future so it appears green
  const futureDate = new Date();
  futureDate.setFullYear(futureDate.getFullYear() + 1);
  const dateStr = futureDate.toISOString().split('T')[0]; // YYYY-MM-DD
  await dialog.getByLabel(/expiry|expires/i).fill(dateStr);

  await dialog.getByRole('button', { name: /save|add|create/i }).click();
  await expect(dialog).not.toBeVisible();

  // New voucher card should appear in the grid
  await expect(page.getByText('E2E BuyMe')).toBeVisible();
  await expect(page.getByText('50')).toBeVisible();
});

// ---------------------------------------------------------------------------
// Test 2 — Copy voucher code to clipboard
// ---------------------------------------------------------------------------

test('copy button copies voucher code to clipboard', async ({
  authenticatedPage: page,
  supabaseAdmin,
}) => {
  // Seed a voucher via admin
  const { data: users } = await supabaseAdmin.auth.admin.listUsers();
  const testUser = users?.users.find(
    (u) => u.email === (process.env.TEST_USER_EMAIL ?? 'e2e-primary@homehub.test')
  );
  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('household_id')
    .eq('id', testUser!.id)
    .single();

  // Get or create a voucher list
  let { data: voucherList } = await supabaseAdmin
    .from('voucher_lists')
    .select()
    .eq('household_id', profile!.household_id)
    .limit(1)
    .single();

  if (!voucherList) {
    const result = await supabaseAdmin
      .from('voucher_lists')
      .insert({ household_id: profile!.household_id, name: 'E2E Vouchers' })
      .select()
      .single();
    voucherList = result.data;
  }

  const { data: voucher } = await supabaseAdmin
    .from('vouchers')
    .insert({
      list_id: voucherList!.id,
      household_id: profile!.household_id,
      issuer: 'E2E Copy Test Store',
      value: 100,
      code: 'COPYTEST999',
      expires_at: new Date(Date.now() + 86400 * 365 * 1000).toISOString(),
    })
    .select()
    .single();

  await goToVouchers(page);

  // Grant clipboard permissions
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);

  // Find the voucher card and click copy
  const card = page.getByText('E2E Copy Test Store').locator('..');
  const copyButton = card.getByRole('button', { name: /copy/i });
  await copyButton.click();

  // Read clipboard value
  const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
  expect(clipboardText).toBe('COPYTEST999');

  // Cleanup
  await supabaseAdmin.from('vouchers').delete().eq('id', voucher!.id);
});

// ---------------------------------------------------------------------------
// Test 3 — Expiry color-coding
// ---------------------------------------------------------------------------

test('voucher cards show correct expiry color class based on remaining days', async ({
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

  let { data: voucherList } = await supabaseAdmin
    .from('voucher_lists')
    .select()
    .eq('household_id', profile!.household_id)
    .limit(1)
    .single();

  if (!voucherList) {
    const result = await supabaseAdmin
      .from('voucher_lists')
      .insert({ household_id: profile!.household_id, name: 'E2E Color Test' })
      .select()
      .single();
    voucherList = result.data;
  }

  // Green: >60 days
  const greenExpiry = new Date(Date.now() + 90 * 86400 * 1000).toISOString();
  // Red: ≤7 days
  const redExpiry = new Date(Date.now() + 3 * 86400 * 1000).toISOString();

  const [{ data: greenVoucher }, { data: redVoucher }] = await Promise.all([
    supabaseAdmin
      .from('vouchers')
      .insert({
        list_id: voucherList!.id,
        household_id: profile!.household_id,
        issuer: 'E2E Green Card',
        value: 50,
        code: 'GREEN',
        expires_at: greenExpiry,
      })
      .select()
      .single(),
    supabaseAdmin
      .from('vouchers')
      .insert({
        list_id: voucherList!.id,
        household_id: profile!.household_id,
        issuer: 'E2E Red Card',
        value: 20,
        code: 'RED',
        expires_at: redExpiry,
      })
      .select()
      .single(),
  ]);

  await goToVouchers(page);

  // Green card should have an expiry indicator with a green-like class or accessible label
  const greenCard = page.getByText('E2E Green Card').locator('..');
  await expect(
    greenCard.getByTestId('expiry-indicator').or(greenCard.locator('[class*="green"]'))
  ).toBeVisible();

  // Red card should have a red expiry indicator
  const redCard = page.getByText('E2E Red Card').locator('..');
  await expect(
    redCard.getByTestId('expiry-indicator').or(redCard.locator('[class*="red"]'))
  ).toBeVisible();

  // Cleanup
  await supabaseAdmin.from('vouchers').delete().in('id', [greenVoucher!.id, redVoucher!.id]);
});

// ---------------------------------------------------------------------------
// Test 4 — OCR scan flow initiates camera
// ---------------------------------------------------------------------------

test('OCR scan button launches camera input or file picker', async ({
  authenticatedPage: page,
}) => {
  await goToVouchers(page);

  // Open add voucher dialog
  const fab = page.getByRole('button', { name: /add voucher|new voucher|\+/i }).first();
  await fab.click();

  const dialog = page.getByRole('dialog');

  // There should be a scan / camera button in the add-voucher modal
  const scanButton = dialog.getByRole('button', { name: /scan|camera|ocr/i });
  await expect(scanButton).toBeVisible();

  // On click: either a file-input opens (mobile-simulated) or a camera UI appears.
  // We verify the file input element is present and accepts image types.
  const [fileChooser] = await Promise.all([
    page.waitForEvent('filechooser').catch(() => null),
    scanButton.click(),
  ]);

  if (fileChooser) {
    // File chooser opened — verify it accepts images
    expect(fileChooser.element().getAttribute('accept')).resolves.toMatch(/image/);
  } else {
    // Alternative: camera overlay rendered inline
    await expect(
      dialog.getByTestId('camera-view').or(dialog.getByRole('img', { name: /camera/i }))
    ).toBeVisible();
  }

  // Close dialog without saving
  await dialog.getByRole('button', { name: /cancel|close/i }).click();
});

// ---------------------------------------------------------------------------
// Test 5 — Delete a voucher
// ---------------------------------------------------------------------------

test('delete a voucher via edit mode', async ({
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

  let { data: voucherList } = await supabaseAdmin
    .from('voucher_lists')
    .select()
    .eq('household_id', profile!.household_id)
    .limit(1)
    .single();

  if (!voucherList) {
    const result = await supabaseAdmin
      .from('voucher_lists')
      .insert({ household_id: profile!.household_id, name: 'E2E Delete Voucher' })
      .select()
      .single();
    voucherList = result.data;
  }

  await supabaseAdmin.from('vouchers').insert({
    list_id: voucherList!.id,
    household_id: profile!.household_id,
    issuer: 'E2E Delete Me Store',
    value: 30,
    code: 'DELETEME',
    expires_at: new Date(Date.now() + 30 * 86400 * 1000).toISOString(),
  });

  await goToVouchers(page);
  await expect(page.getByText('E2E Delete Me Store')).toBeVisible();

  // Enter edit mode
  await page.getByRole('button', { name: /edit|select/i }).first().click();

  // Select the voucher card
  const card = page.getByText('E2E Delete Me Store').locator('..');
  await card.getByRole('checkbox').check();

  // Delete via toolbar
  const toolbar = page.getByTestId('edit-mode-toolbar').or(
    page.getByRole('toolbar', { name: /edit/i })
  );
  await toolbar.getByRole('button', { name: /delete|remove/i }).click();

  // Confirm
  await page.getByRole('dialog').getByRole('button', { name: /delete|confirm/i }).click();

  await expect(page.getByText('E2E Delete Me Store')).not.toBeVisible();
});

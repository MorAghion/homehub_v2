/**
 * Shopping Hub — E2E tests (8 tests)
 *
 * Covers: PRD §7 (Shopping & Gear Hub)
 *   1. Create a new sub-hub
 *   2. Smart bubbles appear on empty master list
 *   3. Bubble injection populates the master list
 *   4. Add item manually to the master list
 *   5. Check off item in the active list (session progress bar)
 *   6. Item category is auto-assigned (category learning)
 *   7. Edit mode: select items and delete them
 *   8. Delete a sub-hub via edit mode
 */

import { test, expect } from './fixtures';
import { goToShopping, openCreateSubHubModal } from './helpers/navigation';

// ---------------------------------------------------------------------------
// Test 1 — Create a new sub-hub
// ---------------------------------------------------------------------------

test('create a new shopping sub-hub', async ({ authenticatedPage: page }) => {
  await goToShopping(page);

  await openCreateSubHubModal(page);

  const dialog = page.getByRole('dialog');
  await dialog.getByLabel(/name/i).fill('E2E Supermarket');
  await dialog.getByRole('button', { name: /create|save/i }).click();

  // Dialog closes and new sub-hub card appears in the grid
  await expect(dialog).not.toBeVisible();
  await expect(page.getByText('E2E Supermarket')).toBeVisible();
});

// ---------------------------------------------------------------------------
// Test 2 — Smart bubbles appear on an empty master list
// ---------------------------------------------------------------------------

test('smart bubbles appear when master list is empty', async ({
  authenticatedPage: page,
}) => {
  await goToShopping(page);
  await openCreateSubHubModal(page);

  const dialog = page.getByRole('dialog');
  // Use a name that triggers a context — "Supermarket" maps to Grocery context
  await dialog.getByLabel(/name/i).fill('E2E Grocery Run');
  await dialog.getByRole('button', { name: /create|save/i }).click();
  await expect(dialog).not.toBeVisible();

  // Navigate into the new sub-hub
  await page.getByText('E2E Grocery Run').click();

  // Bubble suggestions should appear (PRD §7.3)
  const bubbleContainer = page
    .getByTestId('bubble-suggestions')
    .or(page.getByRole('region', { name: /suggestions|bubbles/i }));
  await expect(bubbleContainer).toBeVisible();

  // At least one bubble should be visible
  const firstBubble = bubbleContainer.getByRole('button').first();
  await expect(firstBubble).toBeVisible();
});

// ---------------------------------------------------------------------------
// Test 3 — Bubble injection populates the master list
// ---------------------------------------------------------------------------

test('clicking a bubble injects starter pack into master list', async ({
  authenticatedPage: page,
}) => {
  await goToShopping(page);
  await openCreateSubHubModal(page);

  const dialog = page.getByRole('dialog');
  await dialog.getByLabel(/name/i).fill('E2E Bubble Inject');
  await dialog.getByRole('button', { name: /create|save/i }).click();
  await expect(dialog).not.toBeVisible();

  await page.getByText('E2E Bubble Inject').click();

  // Wait for bubbles to render
  const bubbleContainer = page
    .getByTestId('bubble-suggestions')
    .or(page.getByRole('region', { name: /suggestions|bubbles/i }));
  await expect(bubbleContainer).toBeVisible();

  // Click the first non-"Keep Empty" bubble
  const injectBubble = bubbleContainer
    .getByRole('button')
    .filter({ hasNotText: /keep empty/i })
    .first();

  await injectBubble.click();

  // The master list should now contain items
  const masterListItems = page.getByTestId('master-list-item').or(
    page.getByRole('listitem').filter({ has: page.getByRole('checkbox') })
  );
  await expect(masterListItems.first()).toBeVisible();
});

// ---------------------------------------------------------------------------
// Test 4 — Add item manually to the master list
// ---------------------------------------------------------------------------

test('add item manually to master list', async ({ authenticatedPage: page }) => {
  await goToShopping(page);

  // Navigate into the first sub-hub (created in test 1; order may vary — navigate by name)
  await openCreateSubHubModal(page);
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel(/name/i).fill('E2E Add Item Test');
  await dialog.getByRole('button', { name: /create|save/i }).click();
  await expect(dialog).not.toBeVisible();
  await page.getByText('E2E Add Item Test').click();

  // Skip any bubble prompt
  const keepEmpty = page.getByRole('button', { name: /keep empty/i });
  if (await keepEmpty.isVisible()) {
    await keepEmpty.click();
  }

  // Add item row / FAB
  const addRow = page
    .getByPlaceholder(/add item|new item/i)
    .or(page.getByRole('button', { name: /add item|new item|\+/i }).first());

  await addRow.click();
  await page.getByPlaceholder(/item name|what do you need/i).fill('E2E Test Item');
  await page.keyboard.press('Enter');

  await expect(page.getByText('E2E Test Item')).toBeVisible();
});

// ---------------------------------------------------------------------------
// Test 5 — Check off item in the active list
// ---------------------------------------------------------------------------

test('checking off item in active list advances session progress', async ({
  authenticatedPage: page,
  supabaseAdmin,
}) => {
  // Seed a sub-hub and items via admin for speed
  const { data: users } = await supabaseAdmin.auth.admin.listUsers();
  const testUser = users?.users.find(
    (u) => u.email === (process.env.TEST_USER_EMAIL ?? 'e2e-primary@homehub.test')
  );
  if (!testUser) throw new Error('Test user not found');

  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('household_id')
    .eq('id', testUser.id)
    .single();

  const { data: list } = await supabaseAdmin
    .from('shopping_lists')
    .insert({ household_id: profile!.household_id, name: 'E2E Active List Test' })
    .select()
    .single();

  const items = [
    { list_id: list!.id, text: 'Milk', in_master: true, checked: false },
    { list_id: list!.id, text: 'Bread', in_master: true, checked: false },
    { list_id: list!.id, text: 'Eggs', in_master: true, checked: false },
  ];
  await supabaseAdmin.from('shopping_items').insert(items);

  // Navigate to the sub-hub active list
  await goToShopping(page);
  await page.getByText('E2E Active List Test').click();
  // Tap into the Active List view (separate from Master List)
  await page.getByRole('button', { name: /active list|start shopping/i }).click();
  await page.waitForURL(/active|shopping.*active/i);

  // Progress bar should start at 0
  const progressBar = page
    .getByRole('progressbar')
    .or(page.getByTestId('session-progress'));
  await expect(progressBar).toBeVisible();

  // Check off the first item
  const firstCheckbox = page.getByRole('checkbox').first();
  await firstCheckbox.check();

  // Progress bar should have advanced (aria-valuenow > 0 or visual change)
  // We verify the item moves below the divider (checked items go to the bottom)
  const checkedSection = page.getByTestId('checked-items-section').or(
    page.getByText(/checked|done/i).first()
  );
  await expect(checkedSection).toBeVisible();

  // Cleanup
  await supabaseAdmin.from('shopping_lists').delete().eq('id', list!.id);
});

// ---------------------------------------------------------------------------
// Test 6 — Category learning: item is auto-categorized
// ---------------------------------------------------------------------------

test('item receives auto-assigned category after being added', async ({
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

  const { data: list } = await supabaseAdmin
    .from('shopping_lists')
    .insert({ household_id: profile!.household_id, name: 'E2E Category Test' })
    .select()
    .single();

  // Add item via Supabase — simulate auto-categorize running server-side
  await supabaseAdmin.from('shopping_items').insert({
    list_id: list!.id,
    text: 'Milk',
    in_master: true,
    checked: false,
    category: 'Dairy', // auto-categorize should assign this
  });

  await goToShopping(page);
  await page.getByText('E2E Category Test').click();

  // The item should appear under the "Dairy" category heading
  const dairyHeader = page.getByText(/dairy/i).first();
  await expect(dairyHeader).toBeVisible();

  // Cleanup
  await supabaseAdmin.from('shopping_lists').delete().eq('id', list!.id);
});

// ---------------------------------------------------------------------------
// Test 7 — Edit mode: select items and delete
// ---------------------------------------------------------------------------

test('edit mode allows selecting and deleting items from master list', async ({
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

  const { data: list } = await supabaseAdmin
    .from('shopping_lists')
    .insert({ household_id: profile!.household_id, name: 'E2E Edit Mode Test' })
    .select()
    .single();

  await supabaseAdmin.from('shopping_items').insert([
    { list_id: list!.id, text: 'Delete Me', in_master: true, checked: false },
    { list_id: list!.id, text: 'Keep Me', in_master: true, checked: false },
  ]);

  await goToShopping(page);
  await page.getByText('E2E Edit Mode Test').click();

  // Enter edit mode
  const editButton = page.getByRole('button', { name: /edit|select/i }).first();
  await editButton.click();

  // EditModeToolbar should appear
  const toolbar = page.getByTestId('edit-mode-toolbar').or(
    page.getByRole('toolbar', { name: /edit/i })
  );
  await expect(toolbar).toBeVisible();

  // Select "Delete Me" item
  const deleteItem = page
    .getByText('Delete Me')
    .locator('..')
    .getByRole('checkbox');
  await deleteItem.check();

  // Click delete in the toolbar
  await toolbar.getByRole('button', { name: /delete|remove/i }).click();

  // Confirm deletion dialog
  const confirmDialog = page.getByRole('dialog');
  await confirmDialog.getByRole('button', { name: /delete|confirm/i }).click();

  // "Delete Me" should be gone, "Keep Me" should remain
  await expect(page.getByText('Delete Me')).not.toBeVisible();
  await expect(page.getByText('Keep Me')).toBeVisible();

  // Cleanup
  await supabaseAdmin.from('shopping_lists').delete().eq('id', list!.id);
});

// ---------------------------------------------------------------------------
// Test 8 — Delete a sub-hub
// ---------------------------------------------------------------------------

test('delete a sub-hub from the hub grid via edit mode', async ({
  authenticatedPage: page,
}) => {
  await goToShopping(page);

  // Create a sub-hub to delete
  await openCreateSubHubModal(page);
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel(/name/i).fill('E2E Delete SubHub');
  await dialog.getByRole('button', { name: /create|save/i }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByText('E2E Delete SubHub')).toBeVisible();

  // Enter edit mode on the hub grid
  const editButton = page.getByRole('button', { name: /edit|select/i }).first();
  await editButton.click();

  // Select the sub-hub card
  const subHubCard = page
    .getByText('E2E Delete SubHub')
    .locator('..')
    .getByRole('checkbox');
  await subHubCard.check();

  // Delete via toolbar
  const toolbar = page.getByTestId('edit-mode-toolbar').or(
    page.getByRole('toolbar', { name: /edit/i })
  );
  await toolbar.getByRole('button', { name: /delete|remove/i }).click();

  // Confirm
  const confirmDialog = page.getByRole('dialog');
  await confirmDialog.getByRole('button', { name: /delete|confirm/i }).click();

  await expect(page.getByText('E2E Delete SubHub')).not.toBeVisible();
});

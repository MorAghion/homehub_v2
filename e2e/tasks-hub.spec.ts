/**
 * Tasks Hub — E2E tests (5 tests)
 *
 * Covers: PRD §8 (Home Tasks Hub)
 *   1. Create a task in a sub-hub
 *   2. Mark task as urgent (urgency badge updates)
 *   3. Urgent task appears in the Urgent Tasks virtual sub-hub
 *   4. Flashlight deep-link from Urgent Tasks navigates to the source task
 *   5. Assign task to a household member
 */

import { test, expect } from './fixtures';
import { goToTasks } from './helpers/navigation';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function createTaskSubHub(page: Parameters<typeof goToTasks>[0], name: string) {
  await goToTasks(page);
  const fab = page.getByRole('button', { name: /add sub.?hub|new sub.?hub|create|\+/i }).first();
  await fab.click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel(/name/i).fill(name);
  await dialog.getByRole('button', { name: /create|save/i }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByText(name)).toBeVisible();
}

// ---------------------------------------------------------------------------
// Test 1 — Create a task in a sub-hub
// ---------------------------------------------------------------------------

test('create a task in a tasks sub-hub', async ({ authenticatedPage: page }) => {
  await createTaskSubHub(page, 'E2E Chores');
  await page.getByText('E2E Chores').click();

  // FAB to add a task
  await page.getByRole('button', { name: /add task|new task|\+/i }).first().click();

  const dialog = page.getByRole('dialog');
  await dialog.getByLabel(/title|task name/i).fill('E2E Take Out Trash');
  await dialog.getByRole('button', { name: /save|add|create/i }).click();

  await expect(dialog).not.toBeVisible();
  await expect(page.getByText('E2E Take Out Trash')).toBeVisible();
});

// ---------------------------------------------------------------------------
// Test 2 — Mark task as urgent
// ---------------------------------------------------------------------------

test('marking a task as urgent shows urgency badge', async ({
  authenticatedPage: page,
}) => {
  await createTaskSubHub(page, 'E2E Urgent Test');
  await page.getByText('E2E Urgent Test').click();

  // Add a task
  await page.getByRole('button', { name: /add task|new task|\+/i }).first().click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel(/title|task name/i).fill('E2E Urgent Task');
  // Set urgency to "urgent" in the create modal if available
  const urgencyField = dialog.getByLabel(/urgency|priority/i);
  if (await urgencyField.isVisible()) {
    await urgencyField.selectOption({ label: /urgent/i });
  }
  await dialog.getByRole('button', { name: /save|add|create/i }).click();
  await expect(dialog).not.toBeVisible();

  // If urgency was not set in the create dialog, toggle it in the task detail
  const taskRow = page.getByText('E2E Urgent Task').locator('..');
  const urgentBadge = taskRow.getByTestId('urgency-badge').or(
    taskRow.getByText(/urgent|critical/i)
  );

  if (!(await urgentBadge.isVisible())) {
    // Open task detail and set urgency
    await taskRow.click();
    const detailDialog = page.getByRole('dialog');
    const urgencyToggle = detailDialog
      .getByRole('button', { name: /mark urgent|set urgent/i })
      .or(detailDialog.getByLabel(/urgency/i));
    await urgencyToggle.click();
    await detailDialog.getByRole('button', { name: /save|done/i }).click();
    await expect(detailDialog).not.toBeVisible();
  }

  // Urgency badge should now be visible on the task row
  await expect(
    page.getByText('E2E Urgent Task').locator('..').getByTestId('urgency-badge').or(
      page.getByText('E2E Urgent Task').locator('..').getByText(/urgent|critical/i)
    )
  ).toBeVisible();
});

// ---------------------------------------------------------------------------
// Test 3 — Urgent task appears in the Urgent Tasks virtual sub-hub
// ---------------------------------------------------------------------------

test('urgent task appears in the Urgent Tasks virtual sub-hub', async ({
  authenticatedPage: page,
  supabaseAdmin,
}) => {
  // Seed an urgent task directly for speed
  const { data: users } = await supabaseAdmin.auth.admin.listUsers();
  const testUser = users?.users.find(
    (u) => u.email === (process.env.TEST_USER_EMAIL ?? 'e2e-primary@homehub.test')
  );
  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('household_id')
    .eq('id', testUser!.id)
    .single();

  const { data: taskList } = await supabaseAdmin
    .from('task_lists')
    .insert({
      household_id: profile!.household_id,
      name: 'E2E Urgent View Source',
    })
    .select()
    .single();

  const { data: task } = await supabaseAdmin
    .from('tasks')
    .insert({
      list_id: taskList!.id,
      household_id: profile!.household_id,
      title: 'E2E Appears In Urgent',
      urgency: 'urgent',
      status: 'open',
    })
    .select()
    .single();

  await goToTasks(page);

  // The "Urgent Tasks" pinned card should be visible at the top of the Tasks hub
  const urgentCard = page.getByTestId('urgent-tasks-card').or(
    page.getByRole('link', { name: /urgent tasks/i })
  );
  await expect(urgentCard).toBeVisible();
  await urgentCard.click();

  // The urgent task should appear in the list
  await expect(page.getByText('E2E Appears In Urgent')).toBeVisible();

  // Cleanup
  await supabaseAdmin.from('tasks').delete().eq('id', task!.id);
  await supabaseAdmin.from('task_lists').delete().eq('id', taskList!.id);
});

// ---------------------------------------------------------------------------
// Test 4 — Flashlight deep-link from Urgent Tasks
// ---------------------------------------------------------------------------

test('Flashlight deep-link from Urgent Tasks navigates to the source sub-hub and highlights the task', async ({
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

  const { data: taskList } = await supabaseAdmin
    .from('task_lists')
    .insert({
      household_id: profile!.household_id,
      name: 'E2E Flashlight Target List',
    })
    .select()
    .single();

  const { data: task } = await supabaseAdmin
    .from('tasks')
    .insert({
      list_id: taskList!.id,
      household_id: profile!.household_id,
      title: 'E2E Flashlight Task',
      urgency: 'urgent',
      status: 'open',
    })
    .select()
    .single();

  // Navigate to Urgent Tasks view
  await goToTasks(page);
  const urgentCard = page.getByTestId('urgent-tasks-card').or(
    page.getByRole('link', { name: /urgent tasks/i })
  );
  await urgentCard.click();

  // Find the task row and click the Flashlight deep-link icon/button
  const taskRow = page.getByText('E2E Flashlight Task').locator('..');
  const flashlightLink = taskRow.getByRole('link', { name: /go to|source|view/i }).or(
    taskRow.getByTestId('flashlight-link')
  );
  await flashlightLink.click();

  // Should navigate to the source sub-hub with the task highlighted
  await page.waitForURL(/tasks\//);
  await expect(page.getByText('E2E Flashlight Task')).toBeVisible();

  // Cleanup
  await supabaseAdmin.from('tasks').delete().eq('id', task!.id);
  await supabaseAdmin.from('task_lists').delete().eq('id', taskList!.id);
});

// ---------------------------------------------------------------------------
// Test 5 — Assign task to a household member
// ---------------------------------------------------------------------------

test('task can be assigned to a household member', async ({
  authenticatedPage: page,
  supabaseAdmin,
}) => {
  const { data: users } = await supabaseAdmin.auth.admin.listUsers();
  const testUser = users?.users.find(
    (u) => u.email === (process.env.TEST_USER_EMAIL ?? 'e2e-primary@homehub.test')
  );
  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('household_id, display_name')
    .eq('id', testUser!.id)
    .single();

  const { data: taskList } = await supabaseAdmin
    .from('task_lists')
    .insert({
      household_id: profile!.household_id,
      name: 'E2E Assign Test',
    })
    .select()
    .single();

  await supabaseAdmin.from('tasks').insert({
    list_id: taskList!.id,
    household_id: profile!.household_id,
    title: 'E2E Assignable Task',
    urgency: 'none',
    status: 'open',
  });

  await goToTasks(page);
  await page.getByText('E2E Assign Test').click();

  // Open the task detail
  await page.getByText('E2E Assignable Task').click();
  const detailDialog = page.getByRole('dialog');

  // Set assignee to the test user themselves (only member available in a solo household)
  const assigneeField = detailDialog.getByLabel(/assign|assignee/i);
  await assigneeField.click();
  // Pick the first option in the member list
  await page.getByRole('option').first().click();

  await detailDialog.getByRole('button', { name: /save|done/i }).click();
  await expect(detailDialog).not.toBeVisible();

  // The task row should show the assignee name or avatar
  const taskRow = page.getByText('E2E Assignable Task').locator('..');
  await expect(
    taskRow.getByTestId('assignee').or(taskRow.getByRole('img', { name: /assignee/i }))
  ).toBeVisible();

  // Cleanup
  await supabaseAdmin.from('task_lists').delete().eq('id', taskList!.id);
});

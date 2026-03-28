/**
 * Navigation helpers — wait for hub pages to be fully loaded.
 */

import type { Page } from '@playwright/test';

export async function goToShopping(page: Page) {
  await page.getByRole('link', { name: /shopping/i }).click();
  await page.waitForURL('**/shopping**');
}

export async function goToTasks(page: Page) {
  await page.getByRole('link', { name: /tasks/i }).click();
  await page.waitForURL('**/tasks**');
}

export async function goToVouchers(page: Page) {
  await page.getByRole('link', { name: /vouchers/i }).click();
  await page.waitForURL('**/vouchers**');
}

export async function goToReservations(page: Page) {
  await page.getByRole('link', { name: /reservations/i }).click();
  await page.waitForURL('**/reservations**');
}

export async function goToSettings(page: Page) {
  await page.goto('/settings');
}

/**
 * Open the FAB (Floating Action Button) to create a new sub-hub.
 * Waits for the "create sub-hub" modal to appear.
 */
export async function openCreateSubHubModal(page: Page) {
  await page.getByRole('button', { name: /add sub.?hub|new sub.?hub|create/i }).click();
  await page.getByRole('dialog').waitFor({ state: 'visible' });
}

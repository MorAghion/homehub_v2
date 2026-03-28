/**
 * Global setup — runs once before all test suites.
 *
 * Creates the primary and partner test users in Supabase.
 * Test users are deleted in global.teardown.ts after the full suite finishes.
 *
 * Environment variables required (see ENV.md and .env.test.example):
 *   VITE_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   TEST_USER_EMAIL      (default: e2e-primary@homehub.test)
 *   TEST_USER_PASSWORD   (default: E2eTestPass!1)
 *   TEST_PARTNER_EMAIL   (default: e2e-partner@homehub.test)
 *   TEST_PARTNER_PASSWORD (default: E2ePartnerPass!1)
 */

import { test as setup } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { seedTestUser, deleteTestUser } from './helpers/auth';
import { TEST_EMAIL, TEST_PASSWORD, TEST_PARTNER_EMAIL, TEST_PARTNER_PASSWORD } from './fixtures';

setup('create test users', async () => {
  const url = process.env.VITE_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!url || !key) {
    throw new Error(
      'VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set for E2E tests. ' +
        'See docs/ENV.md and copy .env.test.example → .env.test'
    );
  }

  const admin = createClient(url, key, { auth: { persistSession: false } });

  // Clean up any leftover users from a previous run
  await deleteTestUser(admin, TEST_EMAIL).catch(() => {});
  await deleteTestUser(admin, TEST_PARTNER_EMAIL).catch(() => {});

  // Create fresh test users
  await seedTestUser(admin, TEST_EMAIL, TEST_PASSWORD);
  await seedTestUser(admin, TEST_PARTNER_EMAIL, TEST_PARTNER_PASSWORD);

  console.log('✓ Test users created');
});

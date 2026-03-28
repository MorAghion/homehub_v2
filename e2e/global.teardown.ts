/**
 * Global teardown — runs once after all test suites complete.
 * Deletes the test users created in global.setup.ts.
 */

import { test as teardown } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { deleteTestUser } from './helpers/auth';
import { TEST_EMAIL, TEST_PARTNER_EMAIL } from './fixtures';

teardown('delete test users', async () => {
  const url = process.env.VITE_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !key) return; // skip if env not configured

  const admin = createClient(url, key, { auth: { persistSession: false } });
  await deleteTestUser(admin, TEST_EMAIL).catch(() => {});
  await deleteTestUser(admin, TEST_PARTNER_EMAIL).catch(() => {});

  console.log('✓ Test users deleted');
});

/**
 * Auth helpers shared across E2E test files.
 * These interact with Supabase directly via the admin client to set up
 * test state without going through the UI.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Create a test user and household via Supabase Admin API.
 * Returns the user's email and a generated invite code for the household.
 *
 * NOTE: The `handle_new_user` trigger on auth.users automatically creates a
 * household + user_profile row on sign-up. If that trigger is not present in
 * your test Supabase instance, you will need to insert these rows manually.
 */
export async function seedTestUser(
  adminClient: SupabaseClient,
  email: string,
  password: string
): Promise<{ userId: string; householdId: string }> {
  // Create the auth user
  const { data: userData, error: userError } =
    await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // skip email verification in tests
    });

  if (userError || !userData.user) {
    throw new Error(`Failed to create test user ${email}: ${userError?.message}`);
  }

  const userId = userData.user.id;

  // The handle_new_user trigger should have created a household + user_profile.
  // Retrieve the household_id.
  const { data: profile, error: profileError } = await adminClient
    .from('user_profiles')
    .select('household_id')
    .eq('id', userId)
    .single();

  if (profileError || !profile) {
    throw new Error(
      `user_profile not found for ${email} — check that handle_new_user trigger exists: ${profileError?.message}`
    );
  }

  return { userId, householdId: profile.household_id };
}

/**
 * Delete a test user and all their associated data.
 * The ON DELETE CASCADE on the schema handles the cascade.
 */
export async function deleteTestUser(
  adminClient: SupabaseClient,
  email: string
): Promise<void> {
  const { data: users } = await adminClient.auth.admin.listUsers();
  const user = users?.users.find((u) => u.email === email);
  if (!user) return; // already deleted

  await adminClient.auth.admin.deleteUser(user.id);
}

/**
 * Generate and insert a household invite code for the given household.
 * Returns the raw 8-character invite code.
 */
export async function createInviteCode(
  adminClient: SupabaseClient,
  householdId: string,
  createdBy: string
): Promise<string> {
  const code = Math.random().toString(36).slice(2, 10).toUpperCase();

  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24);

  const { error } = await adminClient.from('household_invites').insert({
    household_id: householdId,
    invite_code: code,
    created_by: createdBy,
    expires_at: expiresAt.toISOString(),
  });

  if (error) {
    throw new Error(`Failed to create invite code: ${error.message}`);
  }

  return code;
}

-- HomeHub v2 — RLS Policies Migration 002
-- Enable Row Level Security on all tables and create access policies.

-- ---------------------------------------------------------------------------
-- Helper: household isolation pattern
-- Used by any table that carries household_id directly.
-- ---------------------------------------------------------------------------

-- households
-- Members can read their own household; only the owner can update it.
ALTER TABLE households ENABLE ROW LEVEL SECURITY;

CREATE POLICY "household_member_read" ON households
  FOR SELECT
  USING (
    id IN (
      SELECT household_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "household_owner_update" ON households
  FOR UPDATE
  USING (
    id IN (
      SELECT household_id FROM user_profiles
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY "household_owner_delete" ON households
  FOR DELETE
  USING (
    id IN (
      SELECT household_id FROM user_profiles
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

-- INSERT is handled by handle_new_user() which runs as the service role.
-- No client-side INSERT policy is needed.

-- ---------------------------------------------------------------------------
-- user_profiles
-- ---------------------------------------------------------------------------
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Any household member can read all profiles in the same household.
CREATE POLICY "household_member_read_profiles" ON user_profiles
  FOR SELECT
  USING (
    household_id IN (
      SELECT household_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Users can only update their own profile.
CREATE POLICY "own_profile_update" ON user_profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- INSERT handled by handle_new_user() trigger (service role). No client policy.

-- ---------------------------------------------------------------------------
-- sub_hubs
-- ---------------------------------------------------------------------------
ALTER TABLE sub_hubs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "household_member_access_sub_hubs" ON sub_hubs
  FOR ALL
  USING (
    household_id IN (
      SELECT household_id FROM user_profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    household_id IN (
      SELECT household_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- shopping_lists
-- ---------------------------------------------------------------------------
ALTER TABLE shopping_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "household_member_access_shopping_lists" ON shopping_lists
  FOR ALL
  USING (
    household_id IN (
      SELECT household_id FROM user_profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    household_id IN (
      SELECT household_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- shopping_items
-- ---------------------------------------------------------------------------
ALTER TABLE shopping_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "household_member_access_shopping_items" ON shopping_items
  FOR ALL
  USING (
    household_id IN (
      SELECT household_id FROM user_profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    household_id IN (
      SELECT household_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- custom_category_mappings
-- ---------------------------------------------------------------------------
ALTER TABLE custom_category_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "household_member_access_category_mappings" ON custom_category_mappings
  FOR ALL
  USING (
    household_id IN (
      SELECT household_id FROM user_profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    household_id IN (
      SELECT household_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- tasks
-- ---------------------------------------------------------------------------
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "household_member_access_tasks" ON tasks
  FOR ALL
  USING (
    household_id IN (
      SELECT household_id FROM user_profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    household_id IN (
      SELECT household_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- vouchers
-- ---------------------------------------------------------------------------
ALTER TABLE vouchers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "household_member_access_vouchers" ON vouchers
  FOR ALL
  USING (
    household_id IN (
      SELECT household_id FROM user_profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    household_id IN (
      SELECT household_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- reservations
-- ---------------------------------------------------------------------------
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "household_member_access_reservations" ON reservations
  FOR ALL
  USING (
    household_id IN (
      SELECT household_id FROM user_profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    household_id IN (
      SELECT household_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- oauth_tokens  — strictly user-scoped (not household-scoped)
-- A user's Gmail token is private; household partners cannot read it.
-- ---------------------------------------------------------------------------
ALTER TABLE oauth_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_scoped_oauth_tokens" ON oauth_tokens
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- bills
-- ---------------------------------------------------------------------------
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "household_member_access_bills" ON bills
  FOR ALL
  USING (
    household_id IN (
      SELECT household_id FROM user_profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    household_id IN (
      SELECT household_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- user_approved_vendors — strictly user-scoped
-- ---------------------------------------------------------------------------
ALTER TABLE user_approved_vendors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_scoped_approved_vendors" ON user_approved_vendors
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- invite_attempt_log — user-scoped
-- ---------------------------------------------------------------------------
ALTER TABLE invite_attempt_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_scoped_invite_attempts" ON invite_attempt_log
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

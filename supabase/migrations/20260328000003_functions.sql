-- HomeHub v2 — DB Functions & Triggers Migration 003

-- ---------------------------------------------------------------------------
-- handle_new_user()
-- Fires on INSERT to auth.users.
-- Creates a household and a user_profile (role=owner) for every new sign-up.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
  new_household_id UUID;
  display_name_val TEXT;
BEGIN
  -- Prefer display_name from user metadata, fall back to email prefix.
  display_name_val := COALESCE(
    NEW.raw_user_meta_data->>'display_name',
    split_part(NEW.email, '@', 1)
  );

  -- Create household named after the user.
  INSERT INTO households (name)
  VALUES (display_name_val || '''s Home')
  RETURNING id INTO new_household_id;

  -- Create user_profile linked to the new household.
  INSERT INTO user_profiles (id, household_id, display_name, role)
  VALUES (NEW.id, new_household_id, display_name_val, 'owner');

  RETURN NEW;
END;
$$;

-- Attach trigger to auth.users.
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ---------------------------------------------------------------------------
-- create_household_invite(p_household_id UUID)
-- Generates an 8-character alphanumeric invite code (unambiguous charset:
-- no 0, O, 1, I, L), sets expiry to 24 hours from now, and returns the code.
-- Caller must be the household owner (enforced by RLS on households UPDATE).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION create_household_invite(p_household_id UUID)
RETURNS TEXT
SECURITY INVOKER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
  charset TEXT := '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  code    TEXT := '';
  i       INTEGER;
BEGIN
  -- Verify caller is the owner of this household.
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
      AND household_id = p_household_id
      AND role = 'owner'
  ) THEN
    RAISE EXCEPTION 'forbidden: only the household owner can generate invite codes';
  END IF;

  -- Generate 8-character code from unambiguous charset.
  FOR i IN 1..8 LOOP
    code := code || substr(charset, floor(random() * length(charset))::integer + 1, 1);
  END LOOP;

  -- Persist code and 24-hour expiry on the household row.
  UPDATE households
  SET invite_code       = code,
      invite_expires_at = NOW() + INTERVAL '24 hours'
  WHERE id = p_household_id;

  RETURN code;
END;
$$;

-- ---------------------------------------------------------------------------
-- join_household_via_invite(p_code TEXT)
-- Validates invite code and moves the caller into the target household.
--
-- Flow:
--   1. Rate-limit check (5 failures per 15 min per user → reject).
--   2. Look up household by code + expiry.
--   3. On failure: log attempt, raise error.
--   4. On success:
--      a. Update caller's user_profile: new household_id, role='member'.
--      b. Delete the auto-created empty household from sign-up.
--      c. Clear invite_code + invite_expires_at from target household.
--      d. Clear attempt log for caller.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION join_household_via_invite(p_code TEXT)
RETURNS UUID
SECURITY INVOKER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
  target_household_id  UUID;
  old_household_id     UUID;
  caller_id            UUID := auth.uid();
BEGIN
  -- 1. Rate-limit check.
  IF (
    SELECT COUNT(*) FROM invite_attempt_log
    WHERE user_id = caller_id
      AND attempted_at > NOW() - INTERVAL '15 minutes'
  ) >= 5 THEN
    RAISE EXCEPTION 'rate_limited: too many failed attempts, try again in 15 minutes';
  END IF;

  -- 2. Look up household by valid, unexpired code.
  SELECT id INTO target_household_id
  FROM households
  WHERE invite_code = p_code
    AND invite_expires_at > NOW();

  -- 3. Code not found or expired → log attempt and fail.
  IF target_household_id IS NULL THEN
    INSERT INTO invite_attempt_log (user_id)
    VALUES (caller_id);

    RAISE EXCEPTION 'invalid_invite: code not found or expired';
  END IF;

  -- 4a. Capture caller's current (auto-created) household.
  SELECT household_id INTO old_household_id
  FROM user_profiles
  WHERE id = caller_id;

  -- Update caller's profile to join the target household as member.
  UPDATE user_profiles
  SET household_id = target_household_id,
      role         = 'member',
      updated_at   = NOW()
  WHERE id = caller_id;

  -- 4b. Delete old auto-created household if it belonged only to this user.
  IF old_household_id IS NOT NULL
    AND old_household_id <> target_household_id
    AND NOT EXISTS (
      SELECT 1 FROM user_profiles
      WHERE household_id = old_household_id
        AND id <> caller_id
    )
  THEN
    DELETE FROM households WHERE id = old_household_id;
  END IF;

  -- 4c. Clear invite code so it cannot be reused.
  UPDATE households
  SET invite_code       = NULL,
      invite_expires_at = NULL
  WHERE id = target_household_id;

  -- 4d. Clear attempt log (counter reset on success).
  DELETE FROM invite_attempt_log
  WHERE user_id = caller_id;

  RETURN target_household_id;
END;
$$;

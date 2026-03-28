-- HomeHub v2 — Schema Migration 001
-- All core tables

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- households
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS households (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,
  invite_code      TEXT,
  invite_expires_at TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- user_profiles
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  household_id UUID REFERENCES households(id) ON DELETE SET NULL,
  display_name TEXT,
  role         TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'member')),
  avatar_url   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- sub_hubs
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sub_hubs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  hub_type     TEXT NOT NULL CHECK (hub_type IN ('shopping', 'tasks', 'vouchers', 'reservations')),
  name         TEXT NOT NULL,
  position     INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- shopping_lists
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS shopping_lists (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sub_hub_id   UUID NOT NULL REFERENCES sub_hubs(id) ON DELETE CASCADE,
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  position     INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- shopping_items
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS shopping_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id      UUID NOT NULL REFERENCES shopping_lists(id) ON DELETE CASCADE,
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  category     TEXT,
  quantity     TEXT,
  unit         TEXT,
  notes        TEXT,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  checked_at   TIMESTAMPTZ,
  added_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- custom_category_mappings
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS custom_category_mappings (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id   UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  item_name_lower TEXT NOT NULL,
  category       TEXT NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (household_id, item_name_lower)
);

-- ---------------------------------------------------------------------------
-- tasks
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tasks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sub_hub_id   UUID NOT NULL REFERENCES sub_hubs(id) ON DELETE CASCADE,
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  description  TEXT,
  status       TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done')),
  urgency      TEXT CHECK (urgency IN ('low', 'medium', 'high', 'critical')),
  is_urgent    BOOLEAN NOT NULL DEFAULT false,
  assignee_id  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  due_date     DATE,
  notes        TEXT,
  created_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- vouchers
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vouchers (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sub_hub_id   UUID NOT NULL REFERENCES sub_hubs(id) ON DELETE CASCADE,
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  code         TEXT,
  expiry_date  DATE,
  value        TEXT,
  image_url    TEXT,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- reservations
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reservations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sub_hub_id       UUID NOT NULL REFERENCES sub_hubs(id) ON DELETE CASCADE,
  household_id     UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  restaurant_name  TEXT NOT NULL,
  reservation_date DATE,
  party_size       INTEGER,
  notes            TEXT,
  image_url        TEXT,
  smart_paste_url  TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- oauth_tokens
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS oauth_tokens (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider        TEXT NOT NULL DEFAULT 'google',
  access_token    TEXT,
  refresh_token   TEXT,
  expires_at      TIMESTAMPTZ,
  last_scanned_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, provider)
);

-- ---------------------------------------------------------------------------
-- bills
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bills (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id   UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  vendor_name    TEXT NOT NULL,
  amount         DECIMAL(12, 2),
  due_date       DATE,
  billing_period TEXT,
  payment_url    TEXT,
  pdf_url        TEXT,
  status         TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
  source_email_id TEXT,
  imported_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (household_id, vendor_name, billing_period)
);

-- ---------------------------------------------------------------------------
-- user_approved_vendors
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_approved_vendors (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vendor_name  TEXT NOT NULL,
  sender_email TEXT NOT NULL,
  approved     BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, vendor_name)
);

-- ---------------------------------------------------------------------------
-- invite_attempt_log  (rate limiting for join_household_via_invite)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS invite_attempt_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- updated_at auto-maintenance trigger
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_user_profiles
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_shopping_items
  BEFORE UPDATE ON shopping_items
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_tasks
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_vouchers
  BEFORE UPDATE ON vouchers
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_reservations
  BEFORE UPDATE ON reservations
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_oauth_tokens
  BEFORE UPDATE ON oauth_tokens
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_bills
  BEFORE UPDATE ON bills
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

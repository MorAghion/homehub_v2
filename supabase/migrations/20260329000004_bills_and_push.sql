-- ---------------------------------------------------------------------------
-- bills table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bills (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id    UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  vendor          TEXT NOT NULL,
  vendor_id       TEXT,
  category        TEXT,
  amount          NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  currency        TEXT NOT NULL DEFAULT 'ILS' CHECK (currency IN ('ILS', 'USD', 'EUR')),
  date            DATE NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'ignored')),
  gmail_message_id TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bills_household_date ON bills (household_id, date DESC);

CREATE TRIGGER set_updated_at_bills
  BEFORE UPDATE ON bills
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE bills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "household_member_access_bills" ON bills
  FOR ALL
  USING (household_id = get_my_household_id());

-- ---------------------------------------------------------------------------
-- push_subscriptions table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint  TEXT NOT NULL UNIQUE,
  p256dh    TEXT NOT NULL,
  auth      TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_push_subscription" ON push_subscriptions
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

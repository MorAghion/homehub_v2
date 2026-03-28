# HomeHub — Security Rules

**Status:** Living document | **Last updated:** 2026-03-28
**Source of truth for:** token storage rules, RLS enforcement, OAuth handling, invite code security, input sanitization, session policy

This document contains actionable rules for coding agents. Every rule is a constraint — not a suggestion.

---

## 1. Token Storage Rules

### What is NEVER stored in localStorage

| Item | Reason |
|------|--------|
| Gmail OAuth `access_token` | Sensitive credential — stored encrypted in `oauth_tokens` table via Edge Function only |
| Gmail OAuth `refresh_token` | Long-lived credential — same rule |
| Supabase JWT session token | Managed exclusively by `supabase-js` — do not read or write it directly |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only secret — never touches the browser |
| `GOOGLE_CLIENT_SECRET` | Server-only secret — never touches the browser |
| Any secret or API key | No exceptions — secrets live in Edge Function environment variables |

**Rule:** Agents must never write OAuth tokens, JWTs, or any secret to `localStorage`, `sessionStorage`, `indexedDB`, or cookies. If a value requires encryption at rest, it belongs in the database, not in browser storage.

### What goes in Supabase encrypted storage (`oauth_tokens` table)

- Gmail `access_token` — encrypted column, written only by `gmail-auth` Edge Function
- Gmail `refresh_token` — encrypted column, written only by `gmail-auth` Edge Function
- Both tokens are scoped to `user_id = auth.uid()` — never `household_id`

The `oauth_tokens` table schema:
```sql
oauth_tokens (
  id UUID PRIMARY KEY,
  user_id UUID → auth.users(id),   -- strict per-user ownership
  provider TEXT DEFAULT 'google',
  access_token TEXT,               -- encrypted at rest
  refresh_token TEXT,              -- encrypted at rest
  expires_at TIMESTAMPTZ,
  scopes TEXT[],
  created_at, updated_at TIMESTAMPTZ
)
```

### What is acceptable in localStorage

Only non-sensitive UI state is permitted in localStorage:

| Key | Value | Purpose |
|-----|-------|---------|
| `i18next` | `"en"` / `"he"` | Language preference |
| `theme` | `"burgundy"` / `"mint"` | Theme preference |
| `homehub-pending-invite` | 8-char invite code | Temporary: stored before email confirmation, removed immediately after `join_household_via_invite()` succeeds |

**Rule:** The pending invite code is the only transient token-like value permitted in localStorage. It is not a secret (it is user-typed), but agents must ensure it is removed from localStorage as soon as the join flow completes — whether success or error.

---

## 2. RLS Enforcement Checklist

### Every table must have RLS enabled

**Rule:** No table may be created or migrated without enabling RLS. There is no public read or write access to any table.

Verify RLS is enabled on a table:
```sql
SELECT relname, relrowsecurity
FROM pg_class
WHERE relname = 'your_table_name';
-- relrowsecurity must be TRUE
```

Enable RLS on a new table:
```sql
ALTER TABLE your_table ENABLE ROW LEVEL SECURITY;
```

### The household isolation pattern

Use this exact pattern for all tables that carry `household_id` directly (`shopping_lists`, `task_lists`, `vouchers`, `reservations`, `bills`):

```sql
-- SELECT / UPDATE / DELETE
CREATE POLICY "household_member_access" ON your_table
  FOR ALL
  USING (
    household_id IN (
      SELECT household_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- INSERT
CREATE POLICY "household_member_insert" ON your_table
  FOR INSERT
  WITH CHECK (
    household_id IN (
      SELECT household_id FROM user_profiles WHERE id = auth.uid()
    )
  );
```

### The child table pattern

For tables that inherit household access through a parent (`shopping_items` → `shopping_lists`, `tasks` → `task_lists`):

```sql
-- shopping_items
CREATE POLICY "shopping_items_household_access" ON shopping_items
  FOR ALL
  USING (
    list_id IN (
      SELECT id FROM shopping_lists
      WHERE household_id IN (
        SELECT household_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );
```

Child tables do not carry `household_id` — access cascades from the parent. Never add a direct `household_id` column to child tables as a shortcut; use the join pattern.

### The user-scoped pattern (`oauth_tokens`, `push_subscriptions`)

For tables that belong to a single user, not the household:

```sql
CREATE POLICY "user_scoped_access" ON oauth_tokens
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```

**Rule:** `oauth_tokens` must never use the household isolation pattern. A user's Gmail token is not visible to their household partner — even though the extracted bill records are shared. This is a deliberate privacy boundary.

### Owner-only operations

Some operations are restricted to the household owner (invite generation, member removal, household deletion). Enforce at RLS level:

```sql
-- household_invites: owner-only INSERT
CREATE POLICY "owner_only_invite" ON household_invites
  FOR INSERT
  WITH CHECK (
    household_id IN (
      SELECT household_id FROM user_profiles
      WHERE id = auth.uid() AND role = 'owner'
    )
  );
```

**Rule:** Owner-only restrictions must be enforced in RLS policies, not just in the UI. A UI check alone is not a security control.

### Never bypass RLS with the service role key in frontend code

**Rule:** `SUPABASE_SERVICE_ROLE_KEY` is an Edge Function environment variable only. It must never appear in:
- Any file under `src/`
- Any Vite env var (no `VITE_SUPABASE_SERVICE_ROLE_KEY`)
- Any client-side Supabase client initialisation

The admin client (`createAdminClient()`) exists only in `supabase/functions/_shared/supabase-admin.ts`. When using the admin client inside an Edge Function, always add explicit `.eq("user_id", userId)` or `.eq("household_id", householdId)` filters manually — RLS is off and there is no implicit scoping.

### How to verify RLS is working

```sql
-- Impersonate a user and verify isolation
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "<user-uuid>", "role": "authenticated"}';

SELECT * FROM bills;          -- must show only their household's bills
SELECT * FROM oauth_tokens;   -- must show only this user's token
SELECT * FROM shopping_items WHERE id = '<other-household-item-id>';  -- must return empty
```

---

## 3. Supabase Storage Signed URLs

### All file access must use signed URLs

**Rule:** Every file served from Supabase Storage to the browser must use a signed URL. There are no public buckets for user content.

Generate a signed URL:
```typescript
const { data, error } = await supabase.storage
  .from("bills")
  .createSignedUrl(`${householdId}/bills/${filename}`, 3600); // 1 hour expiry

if (error || !data) throw new Error("Could not generate signed URL");
const url = data.signedUrl;
```

### URL expiry rules

| Content type | Expiry |
|--------------|--------|
| Bill PDF (view invoice) | 3600 seconds (1 hour) |
| Voucher / reservation image | 3600 seconds (1 hour) |
| Any other user file | 3600 seconds (1 hour) — default |

**Rule:** Do not use `getPublicUrl()` for user-uploaded content. Public URLs bypass access control and expose files to anyone who has the URL. `createSignedUrl()` is the only permitted access method for user content.

### No public buckets for user content

**Rule:** Storage buckets containing user-uploaded files (`bills`, voucher images, reservation images) must not have public access enabled. Verify in the Supabase Dashboard: Storage → Bucket → Settings → "Public bucket" must be unchecked.

---

## 4. OAuth Token Handling

### Tokens encrypted at rest

Gmail `access_token` and `refresh_token` are stored in encrypted columns in the `oauth_tokens` table. Encryption is handled at the Supabase platform level. Agents do not implement encryption manually — do not write plaintext tokens to any unencrypted column or log.

### Scoped to `user_id` only

**Rule:** OAuth tokens are always associated with `user_id`, never `household_id`. Even when two household members both connect Gmail, their tokens are entirely separate rows scoped to their individual `user_id`. Neither user can trigger a scan or read tokens belonging to the other.

### Refresh token rotation

Token refresh is handled exclusively by the `gmail-fetch` Edge Function:

1. Read `oauth_tokens` for the given `user_id`
2. If `expires_at < NOW()`: call Google token refresh endpoint
3. UPSERT `oauth_tokens` with new `access_token` and `expires_at`
4. Return the fresh token to the calling Edge Function

**Rule:** No component of the frontend refreshes OAuth tokens. Token refresh happens server-side only, inside `gmail-fetch`.

### Never log or expose tokens

**Rule:** `access_token` and `refresh_token` values must never appear in:
- `console.log()` / `console.error()` output in Edge Functions
- Error response bodies returned to the client
- Edge Function JSON responses (the `gmail-fetch` response returns `access_token` only to other server-side Edge Functions, never to the browser client)
- Supabase function logs (use token IDs or masked prefixes for debugging if needed)

### Token flow overview

```
Client (Settings) → gmail-auth Edge Function
  → Google OAuth code exchange
  → UPSERT oauth_tokens (encrypted access_token, refresh_token)
  → Returns { connected: true, email } — no token values

pg_cron → bill-scanner Edge Function
  → gmail-fetch Edge Function (server-to-server)
    → Read oauth_tokens WHERE user_id = <id>
    → Refresh if expired
    → Return access_token to bill-scanner (server only)
  → Gmail API call using access_token
  → bill-extractor → bills table
```

The browser never receives an OAuth token value at any point in this flow.

---

## 5. Invite Code Security

### Code generation

- Codes are 8 characters using an unambiguous charset (no `0`, `O`, `1`, `I`, `L`)
- Generated by `create_household_invite()` SQL function
- Only the household **Owner** can generate invite codes (enforced by RLS — see §2)

### Expiry and single-use enforcement

- Codes expire 24 hours after creation (`expires_at = NOW() + INTERVAL '24 hours'`)
- Codes are single-use: `used_by` and `used_at` are set on first valid use
- `join_household_via_invite()` must check all three conditions before accepting a code:

```sql
-- Validation inside join_household_via_invite()
WHERE invite_code = $1
  AND expires_at > NOW()         -- not expired
  AND used_by IS NULL            -- not already used
  AND household_id IS NOT NULL   -- exists
```

**Rule:** Agents must not accept an invite code that fails any of these conditions. Partial validation (e.g., checking expiry but not used status) is a security defect.

### Rate limiting

**Rule:** 5 consecutive failed invite code attempts from the same user must trigger a 15-minute lockout. Implement this at the Edge Function or database function level — not just in the UI. The lockout prevents brute-force guessing of invite codes.

Implementation checklist:
- Track failed attempts per `user_id` (or IP if unauthenticated) with a timestamp
- On the 5th failure within the lockout window, return an error and block further attempts for 15 minutes
- Reset the counter on a successful join

### RLS on `household_invites`

```sql
-- SELECT: household members can read their own household's invites (to check status)
CREATE POLICY "household_member_read_invites" ON household_invites
  FOR SELECT
  USING (
    household_id IN (
      SELECT household_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- INSERT: owner only
CREATE POLICY "owner_insert_invites" ON household_invites
  FOR INSERT
  WITH CHECK (
    household_id IN (
      SELECT household_id FROM user_profiles
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

-- UPDATE: owner only (to mark invites as used or delete them)
CREATE POLICY "owner_update_invites" ON household_invites
  FOR UPDATE
  USING (
    household_id IN (
      SELECT household_id FROM user_profiles
      WHERE id = auth.uid() AND role = 'owner'
    )
  );
```

---

## 6. Input Sanitization

### All user inputs sanitized before DB insert

**Rule:** Every field received from user input must be validated before being passed to a Supabase query. The Supabase JS client uses parameterized queries — SQL injection via the PostgREST layer is not possible. However, agents must still validate:

- **Type**: Is the value the expected type? (string, number, UUID, date)
- **Length**: Are strings within reasonable bounds? (e.g., display name ≤ 100 chars, invite code = 8 chars exactly)
- **Format**: Does the value match the expected pattern? (UUID format for IDs, ISO8601 for dates)
- **Enum membership**: For fields with a fixed set of values, reject anything outside the set

Example validation pattern in an Edge Function:
```typescript
const { user_id, mode } = await req.json();

if (!user_id || typeof user_id !== "string" || !UUID_REGEX.test(user_id)) {
  return errorResponse(400, "missing_user_id", "user_id must be a valid UUID");
}
if (mode !== "initial" && mode !== "incremental") {
  return errorResponse(400, "invalid_mode", "mode must be 'initial' or 'incremental'");
}
```

### XSS prevention in rendered content

**Rule:** React's JSX rendering escapes string values by default. Do not use `dangerouslySetInnerHTML` with any user-supplied content. If HTML rendering is required (e.g., bill email body), sanitize with a library like `DOMPurify` before rendering. Never render raw HTML from external sources (Gmail email body, vendor data) without sanitization.

### SQL injection prevention

The Supabase JS client sends all queries through PostgREST's parameterized interface. Direct SQL injection via the client is not possible. However:

- **Edge Functions** that construct raw SQL strings must use parameterized queries (`$1`, `$2` placeholders), never string interpolation
- **pg_cron** job bodies that include dynamic values must use `format()` or `quote_literal()` — never string concatenation with user-controlled values

### File upload validation

**Rule:** All file uploads (bill PDFs, voucher images, reservation images) must be validated before storage:

| Check | Rule |
|-------|------|
| MIME type | Must match expected type (`application/pdf`, `image/jpeg`, `image/png`, `image/webp`) |
| File size | PDFs ≤ 10 MB; images ≤ 5 MB |
| Extension | Validate extension matches MIME type — do not trust the filename alone |
| Content scan | For PDFs processed by `bill-extractor`, extraction failure on malformed files should return `extraction_failed` (422) — do not crash the function |

---

## 7. Google OAuth Scope

### `gmail.readonly` only — no write scopes

**Rule:** The Gmail OAuth scope is `gmail.readonly`. Agents must never request or add any of the following scopes:
- `gmail.modify`
- `gmail.compose`
- `gmail.send`
- `gmail.insert`
- `https://mail.google.com/` (full access)

If a future feature appears to require write access to Gmail, file a bead for discussion — do not silently add write scopes to the OAuth request.

### Popup flow — not redirect

**Rule:** Google OAuth sign-in must use the popup flow (`window.open` + `skipBrowserRedirect: true`), not a full-page redirect. This preserves app state (unsaved form inputs, scroll position, route context).

```typescript
// CORRECT — popup flow
const { data } = await supabase.auth.signInWithOAuth({
  provider: "google",
  options: {
    skipBrowserRedirect: true,
    scopes: "openid email profile",  // sign-in only — no Gmail scope here
  },
});
window.open(data.url, "_blank", "width=500,height=600");
```

The Gmail `gmail.readonly` scope is requested separately during the Bills setup flow (`gmail-auth` Edge Function), not at sign-in time.

### Scope separation

| Flow | Scopes requested | When |
|------|-----------------|------|
| Sign in with Google | `openid email profile` | Auth screen |
| Connect Gmail for Bills | `gmail.readonly` | Settings → Bills setup |

**Rule:** Do not bundle Gmail scopes into the sign-in OAuth request. Users who sign in with Google should not be prompted for Gmail access until they explicitly choose to connect Gmail for bill scanning.

---

## 8. Session Policy

### No auto-logout — intentional

HomeHub uses Supabase's default JWT refresh behavior. Users stay signed in indefinitely on their device. This is intentional: the app is designed for household use where members trust each other.

**Rule:** Do not add auto-logout timers, session timeouts, or inactivity-based sign-out. This is a deliberate product decision (PRD §6.7b).

### JWT refresh default behavior

The Supabase JS client handles JWT refresh automatically. The access token is stored in localStorage by the Supabase client (this is Supabase's internal mechanism — agents must not interfere with it). Token refresh happens transparently when the token approaches expiry.

**Rule:** Do not call `supabase.auth.refreshSession()` manually. Let the client handle this.

### Shared device policy

**Phase 1 rule:** No PIN lock, no biometric gate, no per-session authentication prompt.

A "Require PIN to open app" feature is tracked in the backlog for a future phase. **Agents must not implement PIN or session-lock UI** for Phase 1 — it is explicitly out of scope.

### Sign-out is explicit only

Users are signed out only when:
1. They click "Sign Out" in Settings
2. The household owner deletes the household (all members are force-signed out)
3. A member's account is deleted

There is no other sign-out trigger. The app never signs a user out due to inactivity, JWT age, or background state.

# HomeHub — Backend Reference

**Status:** Living document | **Last updated:** 2026-03-26
**Source of truth for:** Edge Function catalogue, file structure, RLS patterns, Supabase client rules, pg_cron, error handling, API response format

---

## 1. Edge Function Catalogue

All Edge Functions run in the **Supabase Deno runtime**. They are invoked either:
- From the client via `supabase.functions.invoke(name, { body })`
- From `pg_cron` via `net.http_post` (server-side, no client JWT)
- From other Edge Functions (server-to-server, using the service role key)

All functions accept `POST`. Authentication is verified via the `Authorization: Bearer <JWT>` header (populated automatically by the Supabase JS client for client-initiated calls). Server-side callers (pg_cron, other Edge Functions) pass the `SUPABASE_SERVICE_ROLE_KEY` in the `Authorization` header instead.

---

### 1.1 `gmail-auth`

**Purpose:** Complete the OAuth 2.0 authorization code exchange with Google. Stores encrypted tokens in `oauth_tokens` so Gmail can be scanned for bills.

**Triggered by:** Client — Settings → "Connect Gmail" button

**Auth required:** User JWT

**HTTP method:** `POST`

**Request body:**
```json
{
  "code": "string",         // Authorization code from Google OAuth callback
  "redirect_uri": "string"  // Must match the registered OAuth redirect URI exactly
}
```

**Success response** `200`:
```json
{
  "success": true,
  "data": {
    "connected": true,
    "email": "string"       // Gmail address that was authorized
  }
}
```

**Error responses:**
| HTTP | `error.code` | Meaning |
|------|-------------|---------|
| `400` | `invalid_code` | Authorization code missing or malformed |
| `400` | `redirect_mismatch` | `redirect_uri` does not match registered URI |
| `502` | `google_token_exchange_failed` | Google rejected the code exchange |
| `500` | `db_write_failed` | Could not upsert into `oauth_tokens` |

**Side effects:**
- UPSERT into `oauth_tokens`: `access_token`, `refresh_token`, `expires_at`, `scopes`, `last_scanned_at = NOW() - INTERVAL '90 days'`
- Row scoped to `auth.uid()` — no other user can read or modify it

---

### 1.2 `gmail-disconnect`

**Purpose:** Revoke Gmail access and remove stored tokens.

**Triggered by:** Client — Settings → "Disconnect Gmail"

**Auth required:** User JWT

**HTTP method:** `POST`

**Request body:** None (user identified from JWT)

**Success response** `200`:
```json
{
  "success": true,
  "data": {
    "disconnected": true
  }
}
```

**Error responses:**
| HTTP | `error.code` | Meaning |
|------|-------------|---------|
| `404` | `token_not_found` | No Gmail token exists for this user |
| `502` | `google_revoke_failed` | Google token revocation endpoint returned an error (token is still deleted locally) |
| `500` | `db_delete_failed` | Could not delete from `oauth_tokens` |

**Side effects:**
- DELETE from `oauth_tokens` WHERE `user_id = auth.uid()` AND `provider = 'google'`
- Calls Google token revocation endpoint (`https://oauth2.googleapis.com/revoke`)

---

### 1.3 `gmail-fetch`

**Purpose:** Return a valid Gmail access token for a user. Refreshes it automatically if expired. Called by other Edge Functions — never directly by the client.

**Triggered by:** `bill-scanner`, `bill-extractor` (server-to-server)

**Auth required:** Service role key

**HTTP method:** `POST`

**Request body:**
```json
{
  "user_id": "uuid"
}
```

**Success response** `200`:
```json
{
  "success": true,
  "data": {
    "access_token": "string",
    "expires_at": "ISO8601 timestamp"
  }
}
```

**Error responses:**
| HTTP | `error.code` | Meaning |
|------|-------------|---------|
| `400` | `missing_user_id` | `user_id` not provided |
| `404` | `token_missing` | No OAuth token found for this user |
| `502` | `refresh_failed` | Google rejected the refresh request (user may need to reconnect) |
| `500` | `db_update_failed` | Could not persist the refreshed token |

**Side effects:**
- If `expires_at < NOW()`: calls Google token refresh endpoint and UPSERT `oauth_tokens` with new `access_token` and `expires_at`
- If token is still valid: returns it directly with no side effects

---

### 1.4 `bill-scanner`

**Purpose:** Scan Gmail for emails from known vendors (from `bill-vendors.json`). On initial activation, returns a vendor list for the user to review. On daily cron invocation, processes and imports new bills automatically.

**Triggered by:**
- Client (initial activation, `mode: "initial"`)
- pg_cron (daily at 06:00, `mode: "incremental"`)

**Auth required:** User JWT (client-initiated) or service role key (pg_cron)

**HTTP method:** `POST`

**Request body:**
```json
{
  "user_id": "uuid",                // Required when called by pg_cron; derived from JWT when client-initiated
  "mode": "initial" | "incremental"
}
```

**Success response — `initial` mode** `200`:
```json
{
  "success": true,
  "data": {
    "vendors": [
      {
        "vendor_name": "string",
        "sender_email": "string",
        "sample_subjects": ["string"],
        "email_count": 42
      }
    ]
  }
}
```

**Success response — `incremental` mode** `200`:
```json
{
  "success": true,
  "data": {
    "imported": 3,
    "skipped_duplicates": 1,
    "errors": []
  }
}
```

**Error responses:**
| HTTP | `error.code` | Meaning |
|------|-------------|---------|
| `400` | `invalid_mode` | `mode` is not `initial` or `incremental` |
| `401` | `no_gmail_token` | User has no Gmail connected |
| `502` | `gmail_api_error` | Gmail API returned an error |
| `502` | `token_refresh_failed` | `gmail-fetch` could not return a valid token |
| `500` | `vendor_db_load_failed` | Could not load `bill-vendors.json` |

**Side effects:**
- Calls `gmail-fetch` to obtain a valid access token before querying Gmail
- Queries Gmail API `users.messages.list` with sender filter for each known vendor
- On `incremental` mode: calls `bill-extractor` for each new email, then `UPDATE oauth_tokens SET last_scanned_at = NOW()`

---

### 1.5 `bill-extractor`

**Purpose:** Download and parse a single bill email or attachment. Extract structured fields (amount, due date, billing period). Store the PDF in Supabase Storage. Insert a record into the `bills` table.

**Triggered by:** `bill-scanner` (server-to-server)

**Auth required:** Service role key

**HTTP method:** `POST`

**Request body:**
```json
{
  "user_id": "uuid",
  "household_id": "uuid",
  "gmail_message_id": "string",
  "vendor_name": "string",
  "payment_url": "string"
}
```

**Success response** `200`:
```json
{
  "success": true,
  "data": {
    "bill_id": "uuid",
    "amount": 320.00,
    "due_date": "2026-04-15",
    "billing_period": "2026-03",
    "pdf_path": "household_id/bills/filename.pdf"
  }
}
```

**Skip response (duplicate)** `200`:
```json
{
  "success": true,
  "data": {
    "skipped": true,
    "reason": "duplicate: vendor_name+billing_period already exists"
  }
}
```

**Error responses:**
| HTTP | `error.code` | Meaning |
|------|-------------|---------|
| `400` | `missing_fields` | Required fields absent from request body |
| `502` | `gmail_fetch_failed` | Could not download message from Gmail API |
| `422` | `extraction_failed` | Could not extract amount or due_date from the content |
| `500` | `storage_upload_failed` | PDF upload to Supabase Storage failed |
| `500` | `db_insert_failed` | Could not insert into `bills` table |

**Side effects:**
- Calls Gmail API `users.messages.get` + `users.messages.attachments.get`
- Attempts PDF text extraction (pdfjs); falls back to Tesseract OCR for image-based PDFs
- Applies vendor-specific regex from `bill-vendors.json` to extract fields
- `storage.upload()` to `household_id/bills/` bucket
- INSERT into `bills` (skips on composite key conflict: `vendor_name + billing_period`)

---

### 1.6 `push-dispatcher` *(Phase 1.3)*

**Purpose:** Deliver Web Push notifications to subscribed devices for a household.

**Triggered by:**
- pg_cron (daily digest at 08:00)
- Supabase DB webhook on relevant table changes (new bill, urgent task, expiring voucher)

**Auth required:** Service role key

**HTTP method:** `POST`

**Request body:**
```json
{
  "household_id": "uuid",
  "event_type": "bill_arrived" | "task_urgent" | "voucher_expiring" | "daily_digest",
  "payload": {
    "title": "string",
    "body": "string",
    "url": "string"
  }
}
```

**Success response** `200`:
```json
{
  "success": true,
  "data": {
    "sent": 2,
    "failed": 0
  }
}
```

**Error responses:**
| HTTP | `error.code` | Meaning |
|------|-------------|---------|
| `400` | `invalid_event_type` | `event_type` not in the allowed set |
| `400` | `missing_household_id` | `household_id` not provided |
| `500` | `push_send_failed` | Web Push API call failed for all subscriptions |

**Side effects:**
- Reads `push_subscriptions` for all household members with notifications enabled
- Respects `quiet_hours` per user — skips delivery if current time is in quiet window
- Calls Web Push API per subscribed device endpoint

---

## 2. Edge Function File Structure

Supabase Edge Functions live under `supabase/functions/` in the repo root. Each function is a directory containing an `index.ts` entry point. Shared code lives in `supabase/functions/_shared/`.

```
supabase/
└── functions/
    ├── _shared/                     # Shared utilities — imported by all functions
    │   ├── cors.ts                  # CORS headers helper
    │   ├── response.ts              # Standard success/error response builders
    │   ├── supabase-admin.ts        # Creates service-role Supabase client
    │   └── google-oauth.ts          # Google token exchange + revocation helpers
    ├── gmail-auth/
    │   └── index.ts
    ├── gmail-disconnect/
    │   └── index.ts
    ├── gmail-fetch/
    │   └── index.ts
    ├── bill-scanner/
    │   └── index.ts
    ├── bill-extractor/
    │   └── index.ts
    └── push-dispatcher/
        └── index.ts
```

**Naming convention:**
- Function directories: `kebab-case` matching the invocation name exactly
- Shared modules: `kebab-case.ts`, imported with a relative path
- Entry point is always `index.ts` — Supabase requires this

**Importing shared code:**

```typescript
// Inside supabase/functions/gmail-auth/index.ts
import { corsHeaders } from "../_shared/cors.ts";
import { successResponse, errorResponse } from "../_shared/response.ts";
import { createAdminClient } from "../_shared/supabase-admin.ts";
```

Deno resolves relative imports at runtime. All shared utilities must use Deno-compatible imports (no Node `require`). External packages are imported from `npm:` or `jsr:` specifiers, or pinned via `deno.json`.

**Deploying a single function:**
```bash
supabase functions deploy gmail-auth
supabase functions deploy bill-scanner
# etc.
```

Deployment is manual (outside CI). Run from the repo root.

---

## 3. RLS Policy Patterns

All tables enforce Row Level Security. RLS is **always on** — there is no public read or write access without a valid JWT.

### 3.1 Household-Scoped Tables

For tables that carry their own `household_id` column (`shopping_lists`, `task_lists`, `vouchers`, `reservations`, `bills`):

```sql
-- SELECT / UPDATE / DELETE
USING (
  household_id IN (
    SELECT household_id FROM user_profiles WHERE id = auth.uid()
  )
);

-- INSERT
WITH CHECK (
  household_id IN (
    SELECT household_id FROM user_profiles WHERE id = auth.uid()
  )
);
```

This pattern ensures a user can only access rows that belong to their own household. It works for all CRUD operations by substituting `USING` for reads/updates/deletes and `WITH CHECK` for inserts.

### 3.2 User-Scoped Tables

For tables that belong to a single user, not the household (`oauth_tokens`, `push_subscriptions`):

```sql
-- SELECT / UPDATE / DELETE
USING (user_id = auth.uid());

-- INSERT
WITH CHECK (user_id = auth.uid());
```

No household lookup — strict one-to-one ownership. A user's Gmail token is never visible to their household partner, even though bills (the extracted output) are shared.

### 3.3 Child Tables

For tables that inherit household access through a parent (`shopping_items` → `shopping_lists`, `tasks` → `task_lists`):

```sql
-- shopping_items: access via parent list's household_id
USING (
  list_id IN (
    SELECT id FROM shopping_lists
    WHERE household_id IN (
      SELECT household_id FROM user_profiles WHERE id = auth.uid()
    )
  )
);

-- tasks: access via parent list's household_id
USING (
  list_id IN (
    SELECT id FROM task_lists
    WHERE household_id IN (
      SELECT household_id FROM user_profiles WHERE id = auth.uid()
    )
  )
);
```

Child table rows do not carry `household_id` themselves — access cascades from the parent.

### 3.4 Owner-Only Operations

Some operations are restricted to the household owner (invite code generation, member removal, household deletion). Enforce at the RLS level using `user_profiles.role`:

```sql
-- household_invites INSERT: owner only
WITH CHECK (
  household_id IN (
    SELECT household_id FROM user_profiles
    WHERE id = auth.uid() AND role = 'owner'
  )
);
```

### 3.5 How to Test RLS

**Via Supabase SQL editor — impersonate a user:**
```sql
-- Set the role to authenticated and supply a test user's JWT sub
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "<user-uuid>", "role": "authenticated"}';

-- Now run queries — RLS applies as if this user is logged in
SELECT * FROM bills;                          -- should only show their household's bills
SELECT * FROM oauth_tokens;                   -- should only show this user's token
SELECT * FROM shopping_items WHERE id = 'X'; -- should be empty if wrong household
```

**Via Supabase Dashboard:** Table Editor → RLS tab → "Test policies" with a specific user JWT.

**Via integration tests (Vitest):** Use `supabase.auth.signInWithPassword()` with a seeded test user, then make queries through the anon client. Assert that cross-household reads return empty results.

---

## 4. Supabase Client Usage Rules

### 4.1 Anon Client (Browser)

The **anon client** is used in all React components. It authenticates automatically with the user's JWT stored by Supabase Auth.

```typescript
// src/lib/supabase.ts
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
```

- Always goes through RLS — users can only see their own household's data
- Safe to use in the browser — `ANON_KEY` is public and RLS-protected
- **Never use the service role key in the browser**

### 4.2 Admin Client (Edge Functions)

The **admin client** bypasses RLS. Use only inside Edge Functions for operations that need cross-user access (e.g., `bill-scanner` reading `oauth_tokens` for a specific `user_id` when invoked by pg_cron without a user JWT).

```typescript
// supabase/functions/_shared/supabase-admin.ts
import { createClient } from "npm:@supabase/supabase-js";

export function createAdminClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}
```

- `SUPABASE_SERVICE_ROLE_KEY` is an Edge Function environment variable — never exposed to the browser
- Always scope queries manually when using the admin client (add `.eq("user_id", userId)` etc.) — RLS is off

### 4.3 Calling Edge Functions from the Frontend

```typescript
// Invoke with user JWT (automatically attached by the client)
const { data, error } = await supabase.functions.invoke("gmail-auth", {
  body: { code, redirect_uri: redirectUri },
});

if (error) {
  // error.message is the error.message from the function's JSON error response
  console.error(error);
}
```

- The Supabase JS client attaches the current user's JWT as `Authorization: Bearer <token>` automatically
- The function name must match the directory name under `supabase/functions/` exactly
- All functions return JSON — parse `data` for success, `error` for failures

### 4.4 Realtime Subscriptions

Subscribe to household-scoped changes on component mount; unsubscribe on unmount. Channel names follow the pattern `household:{household_id}:{domain}`.

```typescript
// Example: subscribing to bills changes
useEffect(() => {
  const channel = supabase
    .channel(`household:${householdId}:bills`)
    .on(
      "postgres_changes",
      {
        event: "*",               // INSERT | UPDATE | DELETE | *
        schema: "public",
        table: "bills",
        filter: `household_id=eq.${householdId}`,
      },
      (payload) => {
        // Re-fetch or apply optimistic update based on payload
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [householdId]);
```

**Rules:**
- Always filter by `household_id` — Supabase validates JWT but filtering reduces unnecessary payloads
- Always clean up channels on unmount to avoid subscription leaks
- Realtime requires a valid JWT; anonymous subscriptions are rejected by RLS

| Channel | Tables | Filter |
|---------|--------|--------|
| `household:{id}:shopping` | `shopping_lists`, `shopping_items` | `household_id=eq.{id}` |
| `household:{id}:tasks` | `task_lists`, `tasks` | `household_id=eq.{id}` |
| `household:{id}:vouchers` | `vouchers` | `household_id=eq.{id}` |
| `household:{id}:reservations` | `reservations` | `household_id=eq.{id}` |
| `household:{id}:bills` | `bills` | `household_id=eq.{id}` |
| `household:{id}:members` | `user_profiles` | `household_id=eq.{id}` |

---

## 5. pg_cron Setup

pg_cron is built into Supabase Pro. It runs scheduled jobs as PostgreSQL cron jobs that call Edge Functions via `net.http_post`.

### 5.1 Registering a Job

Jobs are registered via SQL, typically in a migration file:

```sql
-- Enable the pg_cron extension (one-time, done in Supabase Dashboard or migration)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Register the daily bill-scan job
SELECT cron.schedule(
  'daily-bill-scan',          -- unique job name
  '0 6 * * *',                -- cron expression: 06:00 UTC daily
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_functions_url') || '/bill-scanner',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := jsonb_build_object('mode', 'incremental')
  ) AS request_id;
  $$
);
```

**Notes:**
- `current_setting('app.settings.*')` reads from Supabase database secrets — set these in the Supabase Dashboard under Project Settings → Database → Configuration
- `net.http_post` is provided by the `pg_net` extension (enabled automatically on Supabase Pro)
- `bill-scanner` in `incremental` mode iterates over all users who have Gmail connected by querying `oauth_tokens` internally

### 5.2 Daily Bill-Scan Job Specification

| Property | Value |
|----------|-------|
| Job name | `daily-bill-scan` |
| Schedule | `0 6 * * *` (06:00 UTC daily) |
| Function called | `bill-scanner` |
| Mode | `incremental` |
| Auth | Service role key in `Authorization` header |
| Error handling | pg_cron logs failures to `cron.job_run_details`; `bill-scanner` returns per-user `errors[]` in its response |

**Error handling for the cron job:**

- `bill-scanner` processes users independently. A failure for one user (e.g., expired token) does not abort processing for other users — errors are collected and returned in the `errors` array.
- pg_cron logs the HTTP response status in `cron.job_run_details`. Non-2xx responses are recorded as failures.
- On `token_refresh_failed`: the user's Gmail is marked as needing reconnection. The Settings UI reflects this state by checking `oauth_tokens.is_valid` (or absence of a token row).
- Inspect failed runs:

```sql
SELECT * FROM cron.job_run_details
WHERE jobname = 'daily-bill-scan'
ORDER BY start_time DESC
LIMIT 10;
```

### 5.3 Unregistering a Job

```sql
SELECT cron.unschedule('daily-bill-scan');
```

---

## 6. Error Handling Strategy

### 6.1 Edge Function Error Response Format

All Edge Functions return the same JSON envelope for errors:

```json
{
  "success": false,
  "error": {
    "code": "snake_case_error_code",
    "message": "Human-readable description"
  }
}
```

HTTP status codes follow standard conventions:
- `400` — bad request (client provided invalid input)
- `401` — unauthorized (missing or invalid JWT)
- `404` — not found (resource doesn't exist)
- `422` — unprocessable entity (valid input but processing failed, e.g., extraction couldn't find amount)
- `500` — internal server error (unexpected failure)
- `502` — bad gateway (upstream service — Google API, pg_cron — returned an error)

### 6.2 Retry Logic

**Client-initiated functions** (`gmail-auth`, `gmail-disconnect`): no automatic retry. The Supabase JS client surfaces the error directly. The UI shows an error message and lets the user retry manually.

**Server-initiated functions** (`bill-scanner` in incremental mode, `push-dispatcher`):
- `bill-scanner` retries failed token refreshes zero times — if `gmail-fetch` fails, the user's entry is added to `errors[]` in the response and logged; the next daily run will retry automatically.
- `push-dispatcher` makes one attempt per device subscription. Failed device endpoints (410 Gone) are pruned from `push_subscriptions`.

**pg_cron** does not retry failed job runs automatically. The next scheduled execution is the retry mechanism for daily jobs.

### 6.3 Surfacing Errors to the Frontend

| Scenario | How the frontend receives it |
|----------|------------------------------|
| `gmail-auth` fails | `error` object from `supabase.functions.invoke` — show toast with `error.message` |
| `bill-scanner` initial scan fails | Same — show toast, user can retry from Settings |
| Daily cron fails silently | `oauth_tokens` may have a stale `last_scanned_at`; Settings UI shows "Last synced: X days ago" derived from this field |
| Token expired (user needs to reconnect) | `gmail-fetch` returns `refresh_failed`; `bill-scanner` propagates this; Settings UI shows "Gmail disconnected — please reconnect" |
| Extraction failure for one bill | Bill is not inserted; error logged server-side; does not surface to user (silent skip) |

---

## 7. API Response Format

Every Edge Function returns a JSON body with the same top-level envelope. This is the contract all functions must follow.

### 7.1 Success Envelope

```json
{
  "success": true,
  "data": { ... }    // function-specific payload
}
```

### 7.2 Error Envelope

```json
{
  "success": false,
  "error": {
    "code": "snake_case_error_code",
    "message": "Human-readable description suitable for logging"
  }
}
```

### 7.3 Rules

- `success` is always a boolean — never omitted
- On success: `data` is present, `error` is absent
- On error: `error` is present, `data` is absent
- `error.code` is machine-readable (`snake_case`) — used by the frontend to branch on specific failures if needed
- `error.message` is for logging and developer diagnostics — do not display raw to users
- HTTP status code always matches the semantic meaning (see §6.1) — never return a 200 with `"success": false`
- The `Content-Type` header is always `application/json`

### 7.4 CORS Headers

All Edge Functions must include CORS headers to allow invocation from the Vercel-hosted frontend:

```typescript
// supabase/functions/_shared/cors.ts
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",   // restrict to production domain in prod
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// In each function's index.ts, handle OPTIONS preflight:
if (req.method === "OPTIONS") {
  return new Response("ok", { headers: corsHeaders });
}
```

Every response — success and error — must include `corsHeaders`.

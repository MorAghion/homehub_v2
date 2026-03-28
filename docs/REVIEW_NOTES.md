# HomeHub — Architect Review Notes
**Reviewer:** dementus (Wave 0 cross-doc audit)
**Date:** 2026-03-28
**Scope:** PRD_v3.md · ARCHITECTURE.md · BACKEND.md · ENV.md · UI_DESIGN_SYSTEM.md · FRONTEND.md

---

## Legend

| Severity | Meaning |
|----------|---------|
| 🔴 Blocking | Must resolve before coding starts — ambiguous or contradictory spec will cause bugs |
| 🟡 Should Fix | Real gap or inconsistency; won't block a single sprint but will cause rework if ignored |
| 🟢 Minor | Small omission or polish issue; can be deferred |

---

## 1. Contradictions Between Documents

### 1.1 Invite code expiry: 7 days vs 24 hours — 🔴 Blocking
**Document:** PRD_v3.md §11.1 vs §11.2

§11.1 Settings table says: *"Generates an 8-char invite code valid for **7 days**."*
§11.2 Invite Code Generation says: *"Code displayed prominently with a copy button. Expires in **24 hours**."*
§6.6 Household Safety Guards says: *"Invite codes expire after **24 hours**."*
The changelog says: *"2026-03-17 | 5 | Fixed invite code expiry: 7 days → 24 hours"*

The changelog confirms 24 hours is the intended value, but §11.1 was not updated and still says 7 days. Any engineer building the Settings UI will get the wrong value from §11.1.

**Suggested fix:** Update PRD §11.1 table entry to say "24 hours" for the Invite Partner setting description.

---

### 1.2 Smart Bubble colours hardcoded to Burgundy, violating CSS variable rule — 🔴 Blocking
**Documents:** PRD_v3.md §7.3 vs UI_DESIGN_SYSTEM.md §1.1

PRD §7.3 specifies: *"Bubble Style: `bg-[#630606]/10`, `border-[#630606]`, `text-[#630606]`"*

UI_DESIGN_SYSTEM §1.1 states: *"All components reference CSS variables only — never raw hex values."* The `--color-bubble-bg` token exists precisely for this purpose.

The hardcoded hex is the Burgundy primary. In the Mint theme, bubbles will remain Burgundy red — visually broken.

**Suggested fix:** PRD §7.3 should reference `bg-[--color-bubble-bg] border-[--color-primary] text-[--color-primary]` (CSS variables) instead of the hardcoded hex values.

---

### 1.3 pg_cron invocation omits `user_id` that the function requires — 🔴 Blocking
**Document:** BACKEND.md §5.1 vs §1.4

BACKEND.md §1.4 (`bill-scanner`) states: *"Required when called by pg_cron"* for the `user_id` field in the request body.

But the pg_cron SQL in §5.1 sends:
```sql
body := jsonb_build_object('mode', 'incremental')
```
…with no `user_id`. The explanatory note in §5.1 says "bill-scanner in incremental mode iterates over all users by querying `oauth_tokens` internally," which implies `user_id` is NOT needed. But §1.4 says it IS required for pg_cron calls.

**Suggested fix:** Decide whether `user_id` is required or optional when called by pg_cron. If the function iterates all users internally (the intended design), remove the "Required when called by pg_cron" note from §1.4 and mark `user_id` as "omitted in cron mode." Update §5.1's SQL accordingly.

---

### 1.4 Branch naming convention is inconsistent — 🟢 Minor
**Documents:** PRD_v3.md §16 vs ARCHITECTURE.md §6

PRD §16 Coding Conventions says: *"Branch naming: `agent/{task-id}-{short-description}`"*
ARCHITECTURE.md §6 Deployment Pipeline table says feature branch prefix: `feature/*`

**Suggested fix:** Clarify which convention applies to which contributor type (agents vs. human developers), or consolidate to one convention.

---

### 1.5 Duplicate section number "15" in PRD — 🟢 Minor
**Document:** PRD_v3.md

The PRD has two `## 15.` sections: "Gmail OAuth Integration" and "Testing Strategy." Everything from §15 onwards is mis-numbered, making cross-references ambiguous.

**Suggested fix:** Renumber the Testing Strategy and all subsequent sections.

---

## 2. Gaps — PRD Requirements Not Addressed in Planning Docs

### 2.1 `user_profiles.role` column missing from schema definition — 🔴 Blocking
**Document:** PRD_v3.md §5.1 vs §6.4

PRD §6.4 states: *"The Owner role is stored on `user_profiles.role` (`owner` / `member`)."* BACKEND.md §3.4 (Owner-only RLS) also references `user_profiles.role`.

However, the schema definition in PRD §5.1 shows:
```sql
user_profiles (
  id UUID PRIMARY KEY → auth.users(id),
  household_id UUID → households(id),
  display_name TEXT,
  created_at, updated_at TIMESTAMPTZ
)
```
The `role` column is absent from the definition.

**Suggested fix:** Add `role TEXT DEFAULT 'owner' CHECK (role IN ('owner', 'member'))` to the `user_profiles` schema in PRD §5.1.

---

### 2.2 `oauth_tokens.is_valid` field referenced but never defined — 🔴 Blocking
**Document:** BACKEND.md §5.2 vs PRD_v3.md §5.5

BACKEND.md §5.2 says: *"the Settings UI reflects this state by checking `oauth_tokens.is_valid`"* when a token refresh fails. This field does not appear in the `oauth_tokens` schema in PRD §5.5, nor is it mentioned in BACKEND.md's own schema references.

**Suggested fix:** Either add `is_valid BOOLEAN DEFAULT true` to the `oauth_tokens` schema and describe how it is set to `false` on refresh failure, or document an alternative mechanism (e.g. absent row = disconnected, presence = connected) and remove the `is_valid` reference.

---

### 2.3 `oauth_tokens.last_scanned_at` described as an "addition" but not in base schema — 🟡 Should Fix
**Document:** PRD_v3.md §5.5 vs §18.1

PRD §5.5 defines `oauth_tokens` without `last_scanned_at`. PRD §18.1 says: *"`oauth_tokens` table addition: `last_scanned_at TIMESTAMPTZ`"* as if it is a migration addendum.

Since `last_scanned_at` is required by the billing pipeline (the primary use case for `oauth_tokens`), it should be in the base schema — not listed as a Phase 1.1 addition to avoid confusion about when it exists.

**Suggested fix:** Move `last_scanned_at TIMESTAMPTZ` into the `oauth_tokens` table definition in PRD §5.

---

### 2.4 `push_subscriptions` table used by push-dispatcher but not defined anywhere — 🟡 Should Fix
**Documents:** BACKEND.md §1.6, §3.2, §4.4 vs PRD_v3.md §5

BACKEND.md references a `push_subscriptions` table in the RLS patterns section (§3.2), the Realtime subscription rules (§4.4), and the push-dispatcher description (§1.6). This table has no schema definition in PRD §5, and no RLS policy defined.

**Suggested fix:** Add a `push_subscriptions` table schema to PRD §5 (even marked as Phase 1.3) with at minimum: `id`, `user_id`, `endpoint`, `keys`, `quiet_hours_start`, `quiet_hours_end`, `categories_enabled`, `created_at`.

---

### 2.5 Bills deduplication relies on a UNIQUE constraint that is not in the schema — 🟡 Should Fix
**Document:** PRD_v3.md §18.1 vs BACKEND.md §1.5

PRD §18.1 bills table definition:
```sql
bills (
  ...
  vendor_name    TEXT,
  billing_period TEXT,
  ...
)
```
No UNIQUE constraint is declared. Yet BACKEND.md §1.5 says: *"INSERT into `bills` (skips on composite key conflict: `vendor_name + billing_period`)"* — which requires a DB-level UNIQUE constraint to function correctly (otherwise conflicts are not detectable by INSERT alone).

**Suggested fix:** Add `UNIQUE (household_id, vendor_name, billing_period)` to the `bills` table definition in PRD §18.1.

---

### 2.6 No UI flow defined for Owner removing a household member — 🟡 Should Fix
**Documents:** PRD_v3.md §6.4, §11.1

PRD §6.4 table shows Owner can "Remove a member." PRD §11.1 Settings screen lists available settings, but none describe a "Remove Member" flow. There is no UI path: no page, modal, or settings entry that explains how the Owner reaches the remove-member action.

**Suggested fix:** Add a "Household Members" subsection to Settings §11 describing the UI flow: list of members → Owner can tap a member → confirm removal dialog → member removed and signed out.

---

### 2.7 Attention Banner component not specified in FRONTEND.md or UI_DESIGN_SYSTEM — 🟡 Should Fix
**Documents:** PRD_v3.md §3.3 vs FRONTEND.md §2, UI_DESIGN_SYSTEM

PRD §3.3 defines an Attention Banner shown at the top of the landing page when urgent items exist. Neither FRONTEND.md §2 (Shared Components) nor UI_DESIGN_SYSTEM contains a spec for this component — no props interface, no visual treatment, no z-index placement, no dismiss behavior beyond "auto-dismissed when count = 0."

**Suggested fix:** Add `AttentionBanner` to FRONTEND.md §2 with a props interface and to UI_DESIGN_SYSTEM §2 or §4 with visual treatment (layout, animation, z-index).

---

### 2.8 Smart Bubbles component not specified in FRONTEND.md — 🟡 Should Fix
**Documents:** PRD_v3.md §7.3 vs FRONTEND.md §2

PRD §7.3 describes Smart Bubbles in detail (suggestion bubbles, smart merge, Keep Empty bubble, styles). UI_DESIGN_SYSTEM §4.2 (Empty States) mentions bubbles as the CTA for empty Shopping sub-hubs. But FRONTEND.md §2 has no `SmartBubbles` (or similar) component spec — no props interface, no slot pattern, no description of how context matching results are passed in.

**Suggested fix:** Add `SmartBubbles` to FRONTEND.md §2 with a props interface accepting the list of matched contexts and an `onInject(context)` callback.

---

### 2.9 Toast component missing from FRONTEND.md shared component inventory — 🟡 Should Fix
**Documents:** UI_DESIGN_SYSTEM §4.3 vs FRONTEND.md §2

UI_DESIGN_SYSTEM §4.3 gives a detailed visual spec for Toast notifications (structure, variants, auto-dismiss rules). FRONTEND.md §2 lists 8 shared components but does not include a `Toast` component. There is no props interface, no shared component contract, and no mention of how toasts are triggered from hooks (FRONTEND.md §5.2 says "Components display errors via toast").

**Suggested fix:** Add `Toast` / `ToastProvider` to FRONTEND.md §2 with props interface (message, type, duration, onDismiss) and a `useToast()` hook entry in §5.1.

---

### 2.10 Flashlight Deep-Link animation not in UI_DESIGN_SYSTEM animation inventory — 🟡 Should Fix
**Documents:** PRD_v3.md §8.5 vs UI_DESIGN_SYSTEM §6.3

PRD §8.5 describes: *"App navigates to source Sub-Hub, scrolls task into view, applies a pulsing glow animation (3 seconds) to highlight the task visually."* UI_DESIGN_SYSTEM §6.3 Animation Inventory does not include this animation.

**Suggested fix:** Add the Flashlight animation spec to UI_DESIGN_SYSTEM §6.3 (keyframe, duration, color, trigger).

---

### 2.11 Vendor Review Screen (Bills activation) not addressed in FRONTEND.md — 🟡 Should Fix
**Documents:** PRD_v3.md §18.1 (step 3) vs FRONTEND.md

PRD §18.1 step 3 defines a "Review Screen" where the user approves/rejects detected vendors with sample subject lines and can add manual vendors. This is a non-trivial UI flow but FRONTEND.md has no component or page spec for it. There is no hook for this (no `useBillVendors` or similar in the hook inventory).

**Suggested fix:** Add a `BillVendorReviewScreen` (or equivalent) to FRONTEND.md and add a `useBillVendors` hook to §5.1.

---

## 3. Missing Edge Functions — PRD §18.1 Bills Pipeline Audit

| Edge Function | PRD §18.1 requirement | BACKEND.md coverage |
|---|---|---|
| `gmail-auth` | OAuth token storage | ✅ §1.1 |
| `gmail-disconnect` | Token revocation | ✅ §1.2 |
| `gmail-fetch` | Token refresh for inter-function use | ✅ §1.3 |
| `bill-scanner` | Initial + incremental Gmail scan | ✅ §1.4 |
| `bill-extractor` | PDF download, parse, storage, insert | ✅ §1.5 |
| `push-dispatcher` | Push notifications (Phase 1.3) | ✅ §1.6 |

All required Edge Functions are catalogued. See item 1.3 above for the `user_id` contradiction in the pg_cron invocation of `bill-scanner`.

**No missing Edge Functions.** However, the pg_cron invocation body inconsistency (§1.3 above) must be resolved before the daily scan will work correctly.

---

## 4. RLS Coverage Audit

Tables from PRD §5 checked against BACKEND.md §3 patterns:

| Table | RLS pattern in BACKEND.md | Notes |
|---|---|---|
| `shopping_lists` | ✅ §3.1 household-scoped | |
| `shopping_items` | ✅ §3.3 child table | |
| `task_lists` | ✅ §3.1 household-scoped | |
| `tasks` | ✅ §3.3 child table | |
| `vouchers` | ✅ §3.1 household-scoped | |
| `reservations` | ✅ §3.1 household-scoped | |
| `bills` | ✅ §3.1 household-scoped | |
| `oauth_tokens` | ✅ §3.2 user-scoped | |
| `household_invites` | ✅ §3.4 owner-only INSERT | SELECT/UPDATE policy not defined (see below) |
| `push_subscriptions` | ✅ §3.2 user-scoped | Table not defined in PRD — see item 2.4 |
| `households` | ❌ Not covered | |
| `user_profiles` | ❌ Not covered | |
| `custom_category_mappings` | ❌ Not covered | |

### 4.1 `households` — no RLS pattern defined — 🟡 Should Fix
BACKEND.md §3 does not define an RLS policy for the `households` table itself. During household deletion and the join flow, direct access to the `households` table is required. Without a defined RLS policy, either the table has no protection or it relies on undocumented service-role-only access.

**Suggested fix:** Add an RLS section for `households` to BACKEND.md §3: SELECT allowed for household members, DELETE/UPDATE restricted to owner.

### 4.2 `user_profiles` — no RLS pattern defined — 🟡 Should Fix
`user_profiles` is read widely (e.g., by the RLS patterns themselves: `SELECT household_id FROM user_profiles WHERE id = auth.uid()`). Its own RLS policy is not specified. Who can SELECT all profiles? Who can UPDATE `display_name` or `role`?

**Suggested fix:** Define RLS for `user_profiles`: SELECT for all household members, UPDATE restricted to `id = auth.uid()` (own profile), UPDATE of `role` restricted to the owner.

### 4.3 `custom_category_mappings` — no RLS pattern defined — 🟡 Should Fix
PRD §7.7 states: *"RLS: household members can read and insert mappings for their own household."* BACKEND.md §3 has no entry for this table.

**Suggested fix:** Add `custom_category_mappings` to BACKEND.md §3.1 (household-scoped, SELECT + INSERT for members, no DELETE for members unless they created it).

### 4.4 `household_invites` — SELECT/UPDATE RLS not defined — 🟡 Should Fix
BACKEND.md §3.4 only defines the INSERT (owner-only) policy. It does not specify who can SELECT invite rows (needed during the join flow when `join_household_via_invite()` validates the code) or UPDATE (to mark as used/expired).

**Suggested fix:** Add SELECT (owner can read their invites; the join function uses service role) and UPDATE (service role only, to mark used_by/used_at) policies for `household_invites`.

---

## 5. ENV Gaps

All services in ARCHITECTURE.md §7 are covered by ENV.md with one gap:

### 5.1 pg_cron database settings not documented in ENV.md — 🟢 Minor
**Documents:** BACKEND.md §5.1 vs ENV.md

BACKEND.md §5.1 pg_cron setup SQL references:
- `current_setting('app.settings.supabase_functions_url')`
- `current_setting('app.settings.service_role_key')`

These are Supabase PostgreSQL database configuration variables (set in the Supabase Dashboard under Database → Configuration), not standard env vars. ENV.md does not document them, leaving future developers unclear on how to configure pg_cron.

**Suggested fix:** Add a note in ENV.md §1 (Supabase) or a new §8 (pg_cron Database Config) documenting these settings and how to set them.

---

## 6. Component Gaps

### 6.1 Bills Hub has no component or hook specifications — 🟡 Should Fix
**Documents:** PRD_v3.md §18.1 vs FRONTEND.md §2, §5.1

PRD §18.1 is detailed about Bills Hub behaviour (bill cards, history tab, pay now, view invoice, mark as paid). FRONTEND.md has zero coverage:
- No `useBills` hook in §5.1 hook inventory
- No bill card component
- No bills hub page structure
- `useUrgentItems` in §5.1 exports `overdueBills` but there is no bills data source defined to feed it

**Suggested fix:** Add to FRONTEND.md §5.1: `useBills` hook. Add to FRONTEND.md §2 (or a new hub-specific section): `BillCard` component spec including the Pay Now, View Invoice, Mark as Paid actions.

### 6.2 `DetailModal` spec does not extend to Bills — 🟢 Minor
**Document:** FRONTEND.md §2.7

`DetailModal` accepts `item: Voucher | Reservation`. Bills have a distinct data shape and distinct actions (Pay Now → external URL, View Invoice → signed Storage URL, Mark as Paid). Extending `DetailModal` to handle bills would make its type union unwieldy.

**Suggested fix:** Either extend `DetailModal` with a `'bill'` type and conditional rendering, or define a separate `BillDetailModal` spec in FRONTEND.md.

---

## 7. i18n Gaps

### 7.1 `bills` namespace missing from FRONTEND.md and PRD — 🟡 Should Fix
**Documents:** PRD_v3.md §12.2 vs FRONTEND.md §1.1, §6.2

PRD §12.2 defines namespaces: `common`, `shopping`, `tasks`, `vouchers`, `reservations`, `auth`, `settings`. FRONTEND.md §1.1 mirrors this list. There is no `bills` namespace despite the Bills Hub being a Phase 1.1 deliverable with substantial user-facing strings (vendor names, statuses, review screen prompts, payment UI).

**Suggested fix:** Add `bills` to the namespace list in PRD §12.2, FRONTEND.md §1.1 folder layout, and §6.2 namespace assignment table.

### 7.2 Empty state copy for Bills Hub missing from UI_DESIGN_SYSTEM — 🟢 Minor
**Document:** UI_DESIGN_SYSTEM §4.2

The empty states table covers Shopping, Tasks, Vouchers, Reservations. No entry for Bills (empty bills view, no bills pending, all bills paid).

**Suggested fix:** Add Bills empty state entries to UI_DESIGN_SYSTEM §4.2.

---

## Summary Table

| # | Document(s) | Issue | Severity |
|---|-------------|-------|----------|
| 1.1 | PRD §11.1 vs §11.2, §6.6 | Invite code expiry: §11.1 says 7 days, §11.2 and §6.6 say 24 hours | 🔴 Blocking |
| 1.2 | PRD §7.3 vs UI_DESIGN_SYSTEM §1.1 | Smart Bubble colours hardcoded to Burgundy hex, not CSS variables | 🔴 Blocking |
| 1.3 | BACKEND.md §5.1 vs §1.4 | pg_cron invocation omits `user_id` that §1.4 marks as required for pg_cron | 🔴 Blocking |
| 2.1 | PRD §5.1 vs §6.4 | `user_profiles.role` column missing from schema definition | 🔴 Blocking |
| 2.2 | BACKEND.md §5.2 vs PRD §5.5 | `oauth_tokens.is_valid` referenced but never defined in schema | 🔴 Blocking |
| 1.4 | PRD §16 vs ARCHITECTURE.md §6 | Branch naming convention inconsistency (`agent/` vs `feature/`) | 🟢 Minor |
| 1.5 | PRD_v3.md | Duplicate "## 15" section heading, rest of doc mis-numbered | 🟢 Minor |
| 2.3 | PRD §5.5 vs §18.1 | `oauth_tokens.last_scanned_at` described as an addition, not in base schema | 🟡 Should Fix |
| 2.4 | BACKEND.md §1.6, §3.2 vs PRD §5 | `push_subscriptions` table used everywhere, not defined in PRD | 🟡 Should Fix |
| 2.5 | PRD §18.1 vs BACKEND.md §1.5 | `bills` deduplication requires UNIQUE constraint not in schema | 🟡 Should Fix |
| 2.6 | PRD §6.4 vs §11.1 | No UI path defined for Owner removing a household member | 🟡 Should Fix |
| 2.7 | PRD §3.3 vs FRONTEND.md §2 | `AttentionBanner` component not specified in FRONTEND.md or UI_DESIGN_SYSTEM | 🟡 Should Fix |
| 2.8 | PRD §7.3 vs FRONTEND.md §2 | `SmartBubbles` component not specified in FRONTEND.md | 🟡 Should Fix |
| 2.9 | UI_DESIGN_SYSTEM §4.3 vs FRONTEND.md §2 | `Toast` component not in FRONTEND.md shared component inventory | 🟡 Should Fix |
| 2.10 | PRD §8.5 vs UI_DESIGN_SYSTEM §6.3 | Flashlight Deep-Link animation not in UI_DESIGN_SYSTEM animation inventory | 🟡 Should Fix |
| 2.11 | PRD §18.1 vs FRONTEND.md | Vendor Review Screen for Bills activation has no component or hook spec | 🟡 Should Fix |
| 3 | BACKEND.md §5.1 vs §1.4 | Bills pipeline Edge Functions all present; pg_cron body inconsistency is item 1.3 | (see 1.3) |
| 4.1 | BACKEND.md §3 | `households` table — no RLS policy defined | 🟡 Should Fix |
| 4.2 | BACKEND.md §3 | `user_profiles` table — no RLS policy defined | 🟡 Should Fix |
| 4.3 | BACKEND.md §3 vs PRD §7.7 | `custom_category_mappings` — PRD mentions RLS, BACKEND.md has no pattern | 🟡 Should Fix |
| 4.4 | BACKEND.md §3.4 | `household_invites` — only INSERT policy defined; SELECT/UPDATE unspecified | 🟡 Should Fix |
| 5.1 | BACKEND.md §5.1 vs ENV.md | pg_cron `app.settings.*` DB config variables not documented in ENV.md | 🟢 Minor |
| 6.1 | PRD §18.1 vs FRONTEND.md §2, §5 | Bills Hub has no component spec, no hook, `useUrgentItems.overdueBills` has no source | 🟡 Should Fix |
| 6.2 | FRONTEND.md §2.7 | `DetailModal` type union doesn't cover Bills; no bill detail modal spec | 🟢 Minor |
| 7.1 | PRD §12.2, FRONTEND.md §1.1 | `bills` i18n namespace missing | 🟡 Should Fix |
| 7.2 | UI_DESIGN_SYSTEM §4.2 | Empty state copy for Bills Hub not defined | 🟢 Minor |

**Total: 5 × 🔴 Blocking · 14 × 🟡 Should Fix · 6 × 🟢 Minor**

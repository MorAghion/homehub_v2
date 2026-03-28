# HomeHub — Wave 0 Architect Review Notes

**Reviewed by:** nux (Wave 0 full cross-doc audit, hv-x3r)
**Date:** 2026-03-28
**Docs reviewed:** PRD_v3.md, ARCHITECTURE.md, BACKEND.md, ENV.md, UI_DESIGN_SYSTEM.md, FRONTEND.md, SECURITY.md, SCREENS.md

This is the last gate before coding polecats are spawned. Every 🔴 Blocking issue must be resolved and the relevant document updated before any implementation work begins.

---

## Legend

| Severity | Meaning |
|----------|---------|
| 🔴 Blocking | Must be resolved before coding starts. Ambiguity or incorrectness here will cause implementation bugs or structural defects. |
| 🟡 Should Fix | Fix before the relevant phase starts. Not urgent if Phase 1+ feature, but must not be deferred indefinitely. |
| 🟢 Minor | Low risk. Fix opportunistically. |

---

## 1. Contradictions Between Documents

### C-01 — Invite code expiry: 7 days vs 24 hours
**Docs:** PRD_v3.md §11.1 vs PRD_v3.md §6.6, §11.2, SECURITY.md §5
**Severity:** 🔴 Blocking
**Problem:** PRD §11.1 Settings table says "Generates an 8-char invite code valid for **7 days**". PRD §11.2 text immediately below says "Expires in **24 hours**". PRD §6.6 and SECURITY.md §5 also say 24 hours. The table cell in §11.1 is wrong and will cause the invite generation UI to display the wrong expiry.
**Fix:** Change PRD §11.1 table value from "7 days" to "24 hours". One source of truth: 24 hours.

---

### C-02 — Edge Function response envelopes: flat vs wrapped
**Docs:** ARCHITECTURE.md §5 vs BACKEND.md §7
**Severity:** 🔴 Blocking
**Problem:** ARCHITECTURE.md §5 shows flat response objects for all Edge Functions:
- `gmail-auth` → `{ "connected": true, "email": "string" }`
- `gmail-disconnect` → `{ "disconnected": true }`
- `gmail-fetch` → `{ "access_token": "string", "expires_at": "..." }`
- `bill-scanner` → `{ "vendors": [...] }`
- `bill-extractor` → `{ "bill_id": "uuid", ... }`

BACKEND.md §7 mandates the envelope `{ "success": true, "data": { ... } }` for all functions, and §1.1–1.5 show the correctly-wrapped contract. This is a systematic inconsistency — agents using ARCHITECTURE.md will produce code returning the wrong response shape, breaking callers that expect the BACKEND.md envelope.
**Fix:** Update ARCHITECTURE.md §5.1–5.5 to match the BACKEND.md §7 envelope, or add a prominent note at §5 header: "Response shapes below are illustrative — see BACKEND.md §1.x for the full contract including the `success`/`data` envelope."

---

### C-03 — localStorage theme key name
**Docs:** PRD_v3.md §4.1, UI_DESIGN_SYSTEM.md §1.1 vs SECURITY.md §1
**Severity:** 🟡 Should Fix
**Problem:** PRD §4.1 and UI_DESIGN_SYSTEM §1.1 both specify `localStorage` key `homehub-theme`. SECURITY.md §1 whitelist shows the key as `theme`. These are different strings — the `useTheme` hook will use one name and the SECURITY.md allowlist documents a different one.
**Fix:** Update SECURITY.md §1 to use `homehub-theme` as the key name.

---

### C-04 — Feature branch naming convention conflict
**Docs:** PRD_v3.md §16 vs ARCHITECTURE.md §6
**Severity:** 🟢 Minor
**Problem:** PRD §16 coding conventions say branches should be named `agent/{task-id}-{short-description}`. ARCHITECTURE.md §6 deployment pipeline shows branches under `feature/*`. Neither doc clarifies whether these are for different actors (agents vs human developers).
**Fix:** Add a clarifying note to both docs: agent branches use `polecat/<name>` or `agent/{task-id}` format; human developer branches use `feature/*`. Both ultimately merge to `master`.

---

### C-05 — Duplicate section "15" in PRD_v3.md
**Docs:** PRD_v3.md
**Severity:** 🟢 Minor
**Problem:** PRD_v3.md has two top-level sections both numbered "15" — one for "Gmail OAuth Integration" (§15.1) and one for "Testing Strategy" (§15.1, §15.2, §15.3). The Testing Strategy section should be §16, which pushes current §16–§21 up by one.
**Fix:** Renumber sections from §16 onward. Update the table of contents if one is added.

---

## 2. Gaps — PRD Requirements Not Addressed in Any Planning Doc

### G-01 — Vendor approval persistence: no table defined
**Doc:** PRD_v3.md §18.1 (Review Screen flow)
**Severity:** 🔴 Blocking
**Problem:** PRD §18.1 describes a "Review Screen" where users approve or reject detected vendors before bill extraction begins. The daily `bill-scanner` cron job (incremental mode) must know which vendors are approved so it doesn't re-prompt the review screen. There is no table defined anywhere to persist this approval state. Without it, the incremental mode either ignores user preferences or the design is fundamentally under-specified.
**Fix:** Add a `user_approved_vendors` table to PRD §18.1 schema:
```sql
user_approved_vendors (
  id           UUID PRIMARY KEY,
  user_id      UUID → auth.users(id) ON DELETE CASCADE,
  vendor_name  TEXT NOT NULL,
  sender_email TEXT NOT NULL,
  approved     BOOLEAN DEFAULT true,  -- false = user explicitly rejected
  created_at   TIMESTAMPTZ,
  UNIQUE (user_id, vendor_name)
)
```
RLS: user-scoped (`user_id = auth.uid()`). The `bill-scanner` incremental mode filters against this table to know which vendors to process automatically.

---

### G-02 — Force sign-out on household deletion: mechanism undefined
**Doc:** PRD_v3.md §6.5
**Severity:** 🔴 Blocking
**Problem:** PRD §6.5 requires that when the household owner deletes the household, "All active sessions belonging to household members are invalidated" and members are signed out with a message. Supabase does not provide server-side JWT revocation for other users' sessions. Neither SECURITY.md nor ARCHITECTURE.md defines a technical mechanism for this. Without a design, agents will skip the requirement or implement it incorrectly.
**Fix:** Document the mechanism in ARCHITECTURE.md §9 or SECURITY.md §8:
1. On household DELETE, a Supabase DB trigger broadcasts a Realtime deletion event on `household:{id}:members` channel.
2. All connected clients subscribe to this channel. On receiving the event (or a `REMOVE` payload on the `user_profiles` channel), they call `supabase.auth.signOut()` locally and display the message "Your household was deleted by the owner."
3. Alternatively: add `is_deleted BOOLEAN DEFAULT false` to `households`. Clients poll on session restore. If `is_deleted = true`, sign out.
Chosen mechanism must be added to ARCHITECTURE.md §9 Realtime channel design.

---

### G-03 — Invite code rate-limit state: no persistence mechanism
**Doc:** SECURITY.md §5, PRD_v3.md §6.6
**Severity:** 🟡 Should Fix
**Problem:** SECURITY.md §5 mandates a 15-minute lockout after 5 failed invite code attempts, "at the Edge Function or database function level." The `join_household_via_invite()` is a SQL function (per ARCHITECTURE.md §3.4) — not an Edge Function. No table or mechanism exists to track failed attempts, so the lockout cannot be implemented as specified.
**Fix:** Add a `invite_attempt_log (user_id, attempted_at TIMESTAMPTZ)` table or a counter column on `user_profiles`. The `join_household_via_invite()` SQL function checks this before proceeding. Document in BACKEND.md or SECURITY.md §5.

---

### G-04 — Ownership transfer: no Edge Function defined
**Doc:** PRD_v3.md §6.7 (Owner with other members)
**Severity:** 🟡 Should Fix
**Problem:** PRD §6.7 requires that a departing owner first selects a new owner from the member list, triggering immediate role transfer, then the account is deleted. This requires atomically updating `user_profiles.role` for two users, then deleting the departing user. No Edge Function or SQL function for ownership transfer is defined in BACKEND.md.
**Fix:** Add `transfer_household_ownership(new_owner_id UUID)` to BACKEND.md §1 as an Edge Function or to the SQL function catalogue, with an RLS constraint that the caller must be the current owner.

---

### G-05 — Bills Hub: no i18n namespace, hook, or component stubs
**Doc:** PRD_v3.md §18.1, FRONTEND.md §5.1, §1.1
**Severity:** 🟡 Should Fix
**Problem:** PRD §18.1 describes a full Bills Hub (cards, history tab, vendor review screen, Pay Now, View Invoice). FRONTEND.md makes no mention of Bills:
- No `useBillLists` or `useBills` hooks in §5.1
- No `bills` namespace in §1.1 locales structure or §6.2 namespace assignments
- No `BillCard` component reference
Bills are Phase 1.1 — but missing stubs means the frontend agent for Phase 1.1 has no guidance documents.
**Fix:** Add a placeholder "Phase 1.1 — Bills" section to FRONTEND.md for hooks, components, and locales. Add `bills.json` stubs to the locales structure.

---

## 3. Schema Issues

### S-01 — `user_profiles` missing `role` column in schema definition
**Doc:** PRD_v3.md §5.1 (schema definition) vs §6.4, §6.7, SECURITY.md §2, BACKEND.md §3.4
**Severity:** 🔴 Blocking
**Problem:** PRD §5.1 schema definition for `user_profiles` is:
```sql
user_profiles (
  id UUID PRIMARY KEY → auth.users(id),
  household_id UUID → households(id),
  display_name TEXT,
  created_at, updated_at TIMESTAMPTZ
)
```
But PRD §6.4 states: "The Owner role is stored on `user_profiles.role` (`owner` / `member`)." SECURITY.md §2 and BACKEND.md §3.4 both reference this column in RLS owner-only policies. The column is missing from the authoritative schema definition. A DB migration agent reading §5.1 will create the wrong table.
**Fix:** Add to `user_profiles` in PRD §5.1:
```sql
role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'member'))
```
The `handle_new_user()` trigger creates all new users as `'owner'`. The `join_household_via_invite()` function sets the joining user's role to `'member'`.

---

### S-02 — `oauth_tokens` missing `last_scanned_at` column in schema definition
**Doc:** PRD_v3.md §5.5 (schema) vs §18.1 usage, ARCHITECTURE.md §5.1, BACKEND.md §1.1
**Severity:** 🔴 Blocking
**Problem:** PRD §5.5 defines `oauth_tokens` without `last_scanned_at`. However, PRD §18.1 explicitly states "The `oauth_tokens` table stores `last_scanned_at TIMESTAMPTZ` per user," and ARCHITECTURE.md §5.1 and BACKEND.md §1.1 both reference UPSERT-ing this field. A DB migration agent reading §5.5 will omit the column.
**Fix:** Add `last_scanned_at TIMESTAMPTZ` to the `oauth_tokens` schema in PRD §5.5.

---

### S-03 — `oauth_tokens.is_valid` column referenced but undefined
**Doc:** BACKEND.md §5.2
**Severity:** 🟡 Should Fix
**Problem:** BACKEND.md §5.2 says "the Settings UI reflects this state by checking `oauth_tokens.is_valid` (or absence of a token row)." No `is_valid` column exists in any schema definition. The parenthetical fallback suggests it may not be needed, but the column reference will confuse the frontend agent.
**Fix:** Remove the `is_valid` reference from BACKEND.md §5.2. Rely solely on token row presence (connected) vs absence (disconnected). If the token refresh fails permanently, delete the row.

---

### S-04 — `bills` table missing UNIQUE constraint for deduplication
**Doc:** PRD_v3.md §18.1, BACKEND.md §1.5
**Severity:** 🔴 Blocking
**Problem:** PRD §18.1 and BACKEND.md §1.5 specify deduplication using "composite key: `vendor_name + billing_period`" — the `bill-extractor` skips on conflict. The `bills` table schema has no `UNIQUE` constraint on these columns. Without a DB-level constraint, deduplication must be implemented in application code, which is fragile under concurrent imports from two household members.
**Fix:** Add to `bills` table in PRD §18.1:
```sql
UNIQUE (household_id, vendor_name, billing_period)
```

---

### S-05 — `push_subscriptions` table: no schema defined
**Doc:** BACKEND.md §1.6, §3.2, §6.2
**Severity:** 🟡 Should Fix
**Problem:** BACKEND.md references `push_subscriptions` in 3 places (push-dispatcher reads it, §3.2 lists it as user-scoped, §6.2 prunes stale endpoints). No table schema is defined anywhere. The push-dispatcher (Phase 1.3) cannot be implemented without this.
**Fix:** Add `push_subscriptions` schema to PRD §18.3 or BACKEND.md:
```sql
push_subscriptions (
  id              UUID PRIMARY KEY,
  user_id         UUID → auth.users(id) ON DELETE CASCADE,
  endpoint        TEXT NOT NULL,
  p256dh_key      TEXT NOT NULL,
  auth_key        TEXT NOT NULL,
  notify_bills    BOOLEAN DEFAULT true,
  notify_tasks    BOOLEAN DEFAULT true,
  notify_vouchers BOOLEAN DEFAULT true,
  quiet_hours_start TIME,
  quiet_hours_end   TIME,
  created_at      TIMESTAMPTZ,
  UNIQUE (user_id, endpoint)
)
```
RLS: user-scoped (`user_id = auth.uid()`).

---

### S-06 — Child table Realtime filter on non-existent `household_id` column
**Doc:** ARCHITECTURE.md §9, BACKEND.md §4.4
**Severity:** 🟡 Should Fix
**Problem:** BACKEND.md §4.4 shows subscribing to `shopping_items` with `filter: household_id=eq.{id}`. But `shopping_items` has no `household_id` column — it inherits household access through `shopping_lists`. Supabase Realtime filter parameters only work on the subscribed table's own columns. Filtering `shopping_items` by `household_id` will either silently fail or error, meaning all household members receive all other households' item changes.
**Fix:** Two options to document in ARCHITECTURE.md §9:
- Option A (preferred): Subscribe to `shopping_lists` changes; on any change, re-fetch items for the affected list. Simple but results in an extra read per mutation.
- Option B: Add a denormalized `household_id` column to `shopping_items` and `tasks`, populated by trigger. Enables direct Realtime filter. More complex migration, better Realtime filtering.
Document the chosen approach. Same issue applies to `tasks` filtering.

---

## 4. ENV Gaps

### E-01 — `SUPABASE_URL` (no VITE_ prefix) missing from ENV.md
**Doc:** BACKEND.md §4.2 vs ENV.md
**Severity:** 🔴 Blocking
**Problem:** BACKEND.md §4.2 shows Edge Function admin client code using `Deno.env.get("SUPABASE_URL")`. ENV.md §1 lists only `VITE_SUPABASE_URL` (frontend). There is no `SUPABASE_URL` entry in ENV.md for Edge Functions. The Backend agent has no documentation on this variable.
**Note:** Supabase auto-injects `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` into the Edge Function runtime environment — no manual configuration is required. But ENV.md should document this explicitly so agents do not try to set it themselves or use the wrong variable name.
**Fix:** Add a note to ENV.md §1 Supabase section: "`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are automatically injected into Edge Function environments by Supabase — no manual configuration needed. Do not create a `VITE_` variant of these."

---

### E-02 — pg_cron database-level secrets undocumented
**Doc:** BACKEND.md §5.1 vs ENV.md
**Severity:** 🟡 Should Fix
**Problem:** BACKEND.md §5.1 shows pg_cron invoking Edge Functions via `current_setting('app.settings.supabase_functions_url')` and `current_setting('app.settings.service_role_key')`. These are database-level configuration values (set via `ALTER DATABASE` or Supabase Dashboard → Database → Configuration). ENV.md contains no mention of them. The Backend agent will have no guidance on how to configure them.
**Fix:** Add §8 to ENV.md: "Database-level settings for pg_cron" listing `app.settings.supabase_functions_url` and `app.settings.service_role_key`, with instructions to set them in Supabase Dashboard → Database → Configuration.

---

## 5. Component Gaps

### P-01 — No `AttentionBanner` component defined in FRONTEND.md
**Doc:** PRD_v3.md §3.3, UI_DESIGN_SYSTEM.md §5.3 vs FRONTEND.md §2
**Severity:** 🔴 Blocking
**Problem:** PRD §3.3 defines the Attention Banner as a key UI element shown at the top of the landing screen when urgent items exist. UI_DESIGN_SYSTEM §5.3 explicitly calls out RTL treatment (the `→` arrow must flip). FRONTEND.md §2 (Shared Components) does not define this component — no file path, no props interface, no behavior spec. The Frontend agent has no contract to implement from.
**Fix:** Add `AttentionBanner` to FRONTEND.md §2:
- **File:** `src/components/shared/AttentionBanner.tsx`
- **Props:** `{ count: number; onTap: () => void; }`
- **Behavior:** Renders when `count > 0`. Tapping navigates to Urgent Tasks view. Arrow icon must be RTL-aware — use a CSS-flipped SVG, not a hardcoded `→` character. Auto-hides when `count` drops to 0.

---

### P-02 — No `BottomNavBar` component defined in FRONTEND.md
**Doc:** UI_DESIGN_SYSTEM.md §2.6 vs FRONTEND.md §2
**Severity:** 🔴 Blocking
**Problem:** UI_DESIGN_SYSTEM §2.6 fully specifies the bottom navigation bar (structure, 4 tabs, active states, urgent count badge, RTL tab order). FRONTEND.md §2 does not include it as a shared component. The Frontend agent has no component contract to implement from.
**Fix:** Add `BottomNavBar` to FRONTEND.md §2:
- **File:** `src/components/shared/BottomNavBar.tsx`
- **Props:** `{ urgentCount: number; }`
- **Behavior:** Per UI_DESIGN_SYSTEM §2.6. Derives active tab from `useLocation()`. Badge on Tasks tab when `urgentCount > 0`.

---

### P-03 — No `Toast` / `ToastProvider` component defined in FRONTEND.md
**Doc:** UI_DESIGN_SYSTEM.md §4.3, FRONTEND.md §5.2 (error pattern)
**Severity:** 🔴 Blocking
**Problem:** UI_DESIGN_SYSTEM §4.3 fully specifies toast behavior (3 variants, auto-dismiss rules, positioning above bottom nav, RTL `border-s-4`). FRONTEND.md §5.2 says "Components display errors via toast (called in the component on `useEffect` watching `error`)." No `Toast` component or `useToast` hook is defined in FRONTEND.md. Every hub page will need to independently implement toasting without a shared contract.
**Fix:** Add to FRONTEND.md §2:
- `Toast.tsx` — single toast element per UI_DESIGN_SYSTEM §4.3 spec
- `ToastProvider.tsx` + `useToast` hook — global toast queue with `show(message: string, type: 'error' | 'success' | 'info')` API, auto-dismiss for success/info (4s), sticky for errors.

---

### P-04 — No `SmartBubbles` component defined in FRONTEND.md
**Doc:** PRD_v3.md §7.3 vs FRONTEND.md
**Severity:** 🟡 Should Fix
**Problem:** PRD §7.3 specifies Smart Bubbles in detail (suggestion bubbles, Keep Empty bubble, smart merge, bubble styling with `--color-bubble-bg` at 10% opacity). This is a complex Shopping-specific component. FRONTEND.md does not define it.
**Fix:** Add `SmartBubbles` to FRONTEND.md under `components/hubs/shopping/`:
- **File:** `src/components/hubs/shopping/SmartBubbles.tsx`
- **Props:** `{ contexts: string[]; onSelectContext: (ctx: string) => void; onDismiss: () => void; }`
- **Behavior:** Shown when Master List is empty. One bubble per matched context + Keep Empty (dashed). Multiple selections merge starter packs without duplicates. Bubble style: `bg-[--color-bubble-bg]/10 border border-[--color-primary] text-[--color-primary] rounded-full`.

---

### P-05 — `useUrgentItems` hook: `overdueBills` dependency before Phase 1.1
**Doc:** FRONTEND.md §5.1 vs PRD_v3.md §8.4
**Severity:** 🟢 Minor
**Problem:** `useUrgentItems` in FRONTEND.md §5.1 returns `{ urgentTasks, overdueBills, totalCount }`. The `bills` table does not exist until Phase 1.1. The hook will error on the `bills` query in Phase 1.
**Fix:** Add a note to `useUrgentItems` in FRONTEND.md §5.1: "`overdueBills` returns `[]` until Phase 1.1 ships. The hook must handle the case where the `bills` table does not exist (catch the relation-not-found error and return an empty array)."

---

## 6. Security Gaps

### SEC-01 — No mechanism defined for member session invalidation on household deletion
**Doc:** PRD_v3.md §6.5 vs SECURITY.md, ARCHITECTURE.md
**Severity:** 🔴 Blocking
**Problem:** PRD §6.5 requires that household deletion immediately invalidates all member sessions. Supabase does not support server-side JWT revocation for other users' active sessions. No mechanism (Realtime event, DB trigger, polling) is defined in SECURITY.md or ARCHITECTURE.md. Agents will either skip this requirement or implement an insecure workaround.
**Fix:** Document the implementation in ARCHITECTURE.md §9 or SECURITY.md:
1. **Recommended:** Add `household:{id}:members` channel to ARCHITECTURE.md §9. The household deletion DB trigger (or Edge Function called during deletion) broadcasts a `HOUSEHOLD_DELETED` event on this channel.
2. All connected clients subscribe on app mount. On receiving this event, call `supabase.auth.signOut()` and display: "Your household was deleted by the owner."
3. For clients not currently connected (offline): on next app open, the app reads the household and finds it deleted (query returns empty) → sign out with the same message.
Add the signing-out sequence to ARCHITECTURE.md §3 auth flows.

---

### SEC-02 — CORS wildcard origin in Edge Functions
**Doc:** BACKEND.md §7.4
**Severity:** 🟡 Should Fix
**Problem:** BACKEND.md §7.4 shows `"Access-Control-Allow-Origin": "*"` with a comment "restrict to production domain in prod." If deployed to production with the wildcard, any origin can call Edge Functions using a stolen user JWT.
**Fix:** Specify in BACKEND.md §7.4 that in production, `ALLOWED_ORIGIN` env var must be set to `https://our-homehub.vercel.app`. The CORS helper reads this env var and falls back to `*` only in local development. Add `ALLOWED_ORIGIN` to ENV.md §7 matrix (Edge Functions, not public).

---

### SEC-03 — No rate limiting on `gmail-auth` Edge Function
**Doc:** SECURITY.md, BACKEND.md §1.1
**Severity:** 🟢 Minor
**Problem:** `gmail-auth` accepts OAuth codes and is not rate-limited. An attacker with a valid JWT could flood it to exhaust Google API quota. Only invite code attempts are documented with rate limiting in SECURITY.md.
**Fix:** Add a note to BACKEND.md §1.1: "`gmail-auth` should limit to 5 calls per `user_id` per 10 minutes. Implement via a DB counter or Supabase rate-limiting header."

---

### SEC-04 — Gmail attachment MIME type spoofing in `bill-extractor`
**Doc:** SECURITY.md §6, BACKEND.md §1.5
**Severity:** 🟢 Minor
**Problem:** SECURITY.md §6 says validate MIME type for file uploads. For `bill-extractor`, PDFs come from Gmail — the MIME type is from the Gmail API `parts[].mimeType` (declared by the email sender). SECURITY.md §6's "validate extension matches MIME type" rule does not cleanly apply to email attachments.
**Fix:** Add a note to BACKEND.md §1.5: "Validate attachment MIME type from Gmail API response: if `parts[].mimeType` is not `application/pdf`, skip the attachment and return `extraction_failed`. Do not trust the content-disposition filename."

---

## 7. SCREENS Gaps

### SCR-01 — No Smart Bubbles screen
**Doc:** PRD_v3.md §7.3, SCREENS.md
**Severity:** 🔴 Blocking
**Problem:** PRD §7.3 describes Smart Bubbles as the primary UX for an empty Shopping Sub-Hub. This is a differentiating, complex interaction. SCREENS.md lists 10 screens — none shows Smart Bubbles. Frontend agents have no visual reference for this feature.
**Fix:** Add `screens/shopping-bubbles.html` showing an empty Master List with 2–3 suggestion bubbles (e.g., "Grocery", "Pharma") and the "Keep Empty" dashed bubble. Apply `--color-bubble-bg` at 10% opacity. Update SCREENS.md table.

---

### SCR-02 — No Urgent Tasks view screen
**Doc:** PRD_v3.md §8.4, SCREENS.md
**Severity:** 🔴 Blocking
**Problem:** PRD §8.4 describes the Urgent Tasks view as a virtual Sub-Hub showing a flat combined list of urgent tasks and overdue bills (with distinct visual treatments — bill icon + red label + "Pay Now" shortcut). `tasks-hub.html` shows the Urgent Tasks card in the grid, but not the actual view after tapping it. Agents have no reference for this screen.
**Fix:** Add `screens/urgent-tasks.html` showing: urgent task rows (with source sub-hub label, urgency badge, Flashlight deep-link affordance), overdue bill rows (bill icon, vendor name, amount, due date in red, "Pay Now" button). Update SCREENS.md table.

---

### SCR-03 — No Join Household / invite code generated state screen
**Doc:** PRD_v3.md §6.3, §6.6, §11.2, SCREENS.md
**Severity:** 🟡 Should Fix
**Problem:** The invite code generation UX (Settings → "Invite Partner" → generated code display with copy button and expiry timer) and the new member's first-time join experience (welcome screen, partner notification) have no mockups. `settings.html` shows the "Invite Partner" row but not the generated code state.
**Fix:** Extend `settings.html` to show the generated code state: prominent 8-char code block, copy button, "Expires in 24 hours" label. Add a toast mockup to `auth.html` or home-dashboard showing "Partner joined!" in-app notification.

---

### SCR-04 — Attention Banner arrow will break in RTL
**Doc:** `docs/screens/home-dashboard.html` line 219, UI_DESIGN_SYSTEM.md §5.3
**Severity:** 🟡 Should Fix
**Problem:** `home-dashboard.html` renders the Attention Banner with a hardcoded `→` character. UI_DESIGN_SYSTEM §5.3 explicitly calls this out as requiring RTL treatment ("Replace with `→` / `←` based on `dir`, or use a CSS-flipped icon"). The static mockup demonstrates the bug and may be copied verbatim by agents.
**Fix:** Update `home-dashboard.html` to use an SVG chevron with `style="transform: scaleX(-1)"` applied under `dir="rtl"`, or add a code comment: `<!-- ⚠ Do NOT use hardcoded → here — use a CSS-flipped SVG arrow that respects dir attribute -->`.

---

### SCR-05 — Missing empty Active List screen
**Doc:** UI_DESIGN_SYSTEM.md §4.2 (empty states), SCREENS.md
**Severity:** 🟢 Minor
**Problem:** UI_DESIGN_SYSTEM §4.2 defines the empty Active List state ("Ready to shop? Tap items from your master list to add them here."). `active-list.html` shows a populated list only. Agents have no visual reference for the zero-item state.
**Fix:** Add a second section to `active-list.html` or a new `active-list-empty.html` showing the empty Active List state per UI_DESIGN_SYSTEM §4.2 empty state spec.

---

## 8. i18n Gaps

### I-01 — No `bills` namespace defined for Phase 1.1
**Doc:** FRONTEND.md §1.1, §6.2, PRD_v3.md §18.1
**Severity:** 🟡 Should Fix
**Problem:** FRONTEND.md §1.1 defines 7 namespaces: `common`, `shopping`, `tasks`, `vouchers`, `reservations`, `auth`, `settings`. Phase 1.1 Bills Hub requires strings for: bill card labels, vendor approval UI, "Pay Now", "Mark as Paid", "History", "Pending", the opt-in disclaimer, and all error messages. No `bills` namespace or `locales/en/bills.json` is defined.
**Fix:** Add `bills` to FRONTEND.md §1.1 locales structure and §6.2 namespace table. Create `locales/en/bills.json` and `locales/he/bills.json` stubs listing expected keys.

---

### I-02 — List-Category names not in any translation namespace
**Doc:** PRD_v3.md §7.4, §7.7, §12.3
**Severity:** 🟡 Should Fix
**Problem:** PRD §7.4 defines 10 List-Categories: `Dairy`, `Meat`, `Fish`, `Pantry`, `Vegetables`, `Fruit`, `Cleaning`, `Pharma & Hygiene`, `Documents & Money`, `Other`. These appear in the Master List grouping headers, the re-categorize popup, and the Smart Category Learning nudge. PRD §12.3 requires all user-facing strings through `t()`. No translation keys for these categories are defined in any namespace.
**Fix:** Add category translation keys to `shopping` namespace. Key pattern: `shopping:category.dairy`, `shopping:category.pharmaHygiene`, etc. Add Hebrew translations for all 10 to `locales/he/shopping.json`.

---

### I-03 — Smart Bubble context labels and starter pack items untranslated
**Doc:** PRD_v3.md §7.2, §7.3, §12.3
**Severity:** 🟡 Should Fix
**Problem:** PRD §7.2 defines 12 context labels (Grocery, Camping, Travel Abroad, Pharma, Baby, Cleaning, etc.) that appear as bubble button labels. PRD §12.3 explicitly says "Bubble labels and starter pack item names translated." No translation keys for these are defined.
**Fix:** Add context label keys to `shopping` namespace: `shopping:context.grocery`, `shopping:context.camping`, `shopping:context.travelAbroad`, etc. Document the mapping from context key → namespace key in FRONTEND.md or the SmartBubbles component spec.

---

### I-04 — Task urgency level labels not in any namespace definition
**Doc:** PRD_v3.md §8.2, UI_DESIGN_SYSTEM.md §2.5
**Severity:** 🟢 Minor
**Problem:** Task urgency levels (`low`, `medium`, `high`, `critical`) appear in urgency badges (UI_DESIGN_SYSTEM §2.5) and the task create/edit form. No translation keys for these are defined in the `tasks` namespace.
**Fix:** Add `tasks:urgency.low`, `tasks:urgency.medium`, `tasks:urgency.high`, `tasks:urgency.critical` with Hebrew equivalents to `locales/he/tasks.json`.

---

### I-05 — Voucher expiry status labels not defined
**Doc:** PRD_v3.md §9.2, `docs/screens/vouchers-hub.html`
**Severity:** 🟢 Minor
**Problem:** Voucher expiry dates are "prominently shown, color-coded when near expiry." `vouchers-hub.html` shows states (green/amber/orange/red/expired). No i18n keys are defined for expiry status labels (e.g., "Expires soon", "Expired", "Expiring in X days").
**Fix:** Add expiry status keys to `vouchers` namespace: `vouchers:expiry.expired`, `vouchers:expiry.expiringSoon`, `vouchers:expiry.expiresInDays` (with count interpolation) and Hebrew equivalents.

---

## Summary Table

| ID | Category | Severity | One-line description |
|----|----------|----------|----------------------|
| C-01 | Contradiction | 🔴 | Invite expiry: 7 days (§11.1 table) vs 24 hours everywhere else |
| C-02 | Contradiction | 🔴 | ARCH §5 response format flat vs BACKEND §7 envelope |
| C-03 | Contradiction | 🟡 | localStorage key: `theme` vs `homehub-theme` |
| C-04 | Contradiction | 🟢 | Branch naming: agent/ vs feature/* |
| C-05 | Contradiction | 🟢 | Duplicate section 15 in PRD |
| G-01 | Gap | 🔴 | No `user_approved_vendors` table for bill vendor review persistence |
| G-02 | Gap | 🔴 | Force sign-out on household deletion has no implementation design |
| G-03 | Gap | 🟡 | Invite code rate-limit has no state table |
| G-04 | Gap | 🟡 | Ownership transfer has no Edge Function |
| G-05 | Gap | 🟡 | Bills Hub has no FRONTEND.md stubs (hooks, namespace, components) |
| S-01 | Schema | 🔴 | `user_profiles` missing `role` column |
| S-02 | Schema | 🔴 | `oauth_tokens` missing `last_scanned_at` column |
| S-03 | Schema | 🟡 | `oauth_tokens.is_valid` referenced but not in schema |
| S-04 | Schema | 🔴 | `bills` missing UNIQUE(household_id, vendor_name, billing_period) |
| S-05 | Schema | 🟡 | `push_subscriptions` has no schema defined |
| S-06 | Schema | 🟡 | Child table Realtime filter on non-existent `household_id` column |
| E-01 | ENV | 🔴 | `SUPABASE_URL` (Edge Function) undocumented in ENV.md |
| E-02 | ENV | 🟡 | pg_cron database-level secrets undocumented |
| P-01 | Component | 🔴 | No `AttentionBanner` component in FRONTEND.md |
| P-02 | Component | 🔴 | No `BottomNavBar` component in FRONTEND.md |
| P-03 | Component | 🔴 | No `Toast`/`ToastProvider` component in FRONTEND.md |
| P-04 | Component | 🟡 | No `SmartBubbles` component in FRONTEND.md |
| P-05 | Component | 🟢 | `useUrgentItems` needs Phase 1.1 guard for missing `bills` table |
| SEC-01 | Security | 🔴 | Session invalidation on household deletion: no mechanism |
| SEC-02 | Security | 🟡 | CORS wildcard origin in Edge Functions |
| SEC-03 | Security | 🟢 | No rate limiting on `gmail-auth` |
| SEC-04 | Security | 🟢 | Gmail attachment MIME spoofing not addressed |
| SCR-01 | Screens | 🔴 | No Smart Bubbles screen mockup |
| SCR-02 | Screens | 🔴 | No Urgent Tasks view screen mockup |
| SCR-03 | Screens | 🟡 | No invite code generated state / join flow mockup |
| SCR-04 | Screens | 🟡 | Attention Banner `→` arrow hardcoded (RTL-broken) |
| SCR-05 | Screens | 🟢 | No empty Active List state mockup |
| I-01 | i18n | 🟡 | No `bills` namespace for Phase 1.1 |
| I-02 | i18n | 🟡 | List-Category names not in translation namespace |
| I-03 | i18n | 🟡 | Smart Bubble context labels not in translation namespace |
| I-04 | i18n | 🟢 | Task urgency labels not in `tasks` namespace |
| I-05 | i18n | 🟢 | Voucher expiry status labels not in `vouchers` namespace |

**Total: 37 findings.**

| Severity | Count |
|----------|-------|
| 🔴 Blocking | 14 |
| 🟡 Should Fix | 15 |
| 🟢 Minor | 8 |

**All 14 🔴 Blocking issues must be resolved before any coding polecat is spawned.**

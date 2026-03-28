# HomeHub v2 — Agent Rules & Startup Guide

**Version:** 1.0 | **Last updated:** 2026-03-28
**Audience:** All coding agents (polecats) working on this repo

This is the first thing every agent reads before touching code. It contains rules, conventions, and role-specific reading lists. Every rule here is a constraint — not a suggestion.

---

## 1. Project Overview

HomeHub is a shared home management PWA for households of 1–4 people. It reduces cognitive load through visual serenity, smart automation, and rapid actions.

**Tech stack:**

| Layer | Technology |
|-------|-----------|
| Frontend Framework | React 18 + TypeScript (strict) |
| Build Tool | Vite 5 |
| Styling | Tailwind CSS 4 — utility-first, no CSS files |
| Routing | React Router 6 |
| Backend | Supabase (PostgreSQL + Auth + Storage + Edge Functions + Realtime) |
| State | Supabase JS client for server state; `useState` for local UI state only |
| i18n | react-i18next — English + Hebrew, RTL switching |
| PWA | vite-plugin-pwa — service worker, manifest, offline cache |
| Testing | Vitest + React Testing Library + Playwright |
| CI/CD | GitHub Actions → Vercel |
| Hosting | Vercel (preview per PR; production auto-deploys from `main`) |

**Two color themes:** Burgundy (default) and Mint. All color values are CSS variables — never hardcoded hex. Theme persists in `localStorage` key `homehub-theme`.

**Two languages:** English (`en`) and Hebrew (`he`). Hebrew is RTL. All layout must use logical CSS properties.

**Production URL:** `https://our-homehub.vercel.app`

---

## 2. Naming Conventions

| Artifact | Convention | Example |
|----------|-----------|---------|
| Component files | PascalCase | `ShoppingHub.tsx`, `BaseModal.tsx` |
| Component names | PascalCase, matches filename | `export default function BaseModal` |
| Hook files | camelCase, `use` prefix | `useShoppingList.ts` |
| Hook exports | Named export only | `export function useShoppingList()` |
| Utility / lib files | camelCase | `autoCategorize.ts`, `supabase.ts` |
| Type files | PascalCase types, one domain per file | `types/shopping.ts` → `ShoppingItem` |
| Test files | Co-located, same name + `.test.tsx` | `BaseModal.test.tsx` |
| Edge Function directories | kebab-case under `supabase/functions/` | `supabase/functions/gmail-auth/` |
| DB tables | snake_case | `shopping_lists`, `user_profiles` |
| i18n namespace files | `<namespace>.json` | `shopping.json`, `common.json` |
| Locale directories | ISO code | `locales/en/`, `locales/he/` |

**No index barrel files for individual components.** Import directly from the component file.

---

## 3. File Structure

```
src/
├── components/
│   ├── shared/          # Reusable components used across ≥ 2 hubs or on every page
│   │   ├── HubGrid.tsx
│   │   ├── SubHubCard.tsx
│   │   ├── EditModeToolbar.tsx
│   │   ├── BaseModal.tsx
│   │   ├── AttentionBanner.tsx
│   │   ├── BottomNavBar.tsx
│   │   ├── Toast.tsx
│   │   └── ...
│   └── hubs/            # Hub-specific feature components
│       ├── shopping/
│       ├── tasks/
│       ├── vouchers/
│       └── reservations/
├── hooks/               # Custom React hooks (one per data domain)
├── lib/                 # Pure utilities and third-party wrappers
│   ├── supabase.ts      # Supabase JS client init
│   └── autoCategorize.ts
├── pages/               # Route-level page components (thin — delegates to components/hooks)
├── contexts/            # React context providers
│   ├── AuthContext.tsx
│   ├── EditModeContext.tsx
│   └── ...
├── locales/
│   ├── en/
│   │   ├── common.json
│   │   ├── shopping.json
│   │   ├── tasks.json
│   │   ├── vouchers.json
│   │   ├── reservations.json
│   │   ├── auth.json
│   │   ├── settings.json
│   │   └── bills.json
│   └── he/              # Mirror of en/
└── types/               # Shared TypeScript interfaces derived from DB schema

supabase/
└── functions/
    ├── _shared/         # Shared utilities for Edge Functions
    │   └── supabase-admin.ts
    ├── gmail-auth/
    ├── gmail-disconnect/
    ├── gmail-fetch/
    ├── bill-scanner/
    ├── bill-extractor/
    └── push-dispatcher/

docs/                    # All planning documents (you are here)
├── CLAUDE.md            # This file
├── PRD_v3.md
├── ARCHITECTURE.md
├── BACKEND.md
├── SECURITY.md
├── ENV.md
├── UI_DESIGN_SYSTEM.md
├── FRONTEND.md
├── SCREENS.md
└── screens/             # Static HTML mockups per screen
```

---

## 4. Coding Conventions

### 4.1 Styling

- **No inline styles.** Tailwind utility classes only.
- **No raw hex values in components.** Reference CSS variables: `text-[--color-primary]`, `bg-[--color-surface]`.
- **No custom CSS files** — Tailwind only.
- **RTL logical properties required.** Use `ms-` / `me-` / `ps-` / `pe-` — never `ml-` / `mr-` / `pl-` / `pr-`. Hebrew RTL must work without conditional class switching.

### 4.2 TypeScript

- **No `any`.** Strict types required at all times.
- `tsconfig.json` has `"strict": true` — do not weaken it.
- Type all component props with interfaces. Type all hook return values.
- Shared types live in `src/types/`. One domain per file.

### 4.3 i18n

- **All user-visible strings must use `t('key')` from react-i18next.**
- No hardcoded English strings in JSX.
- Translation keys live in namespace JSON files under `src/locales/`.
- Use the `useTranslation('namespace')` hook at the top of each component.

### 4.4 Supabase Client

- **Always use `supabase.auth.getSession()` server-side** — never trust JWTs sent from the client.
- **Never call `supabase.auth.refreshSession()` manually** — the client handles this automatically.
- The Supabase JS client is initialized once in `src/lib/supabase.ts` and imported everywhere.
- `SUPABASE_SERVICE_ROLE_KEY` never appears in `src/` — it is an Edge Function secret only.

### 4.5 RLS

- **Every Supabase query in frontend code must be RLS-enforced.** Never bypass with the service role key in client code.
- All tables use the household isolation pattern or the user-scoped pattern (see SECURITY.md §2).
- The admin client (`createAdminClient()`) exists only in `supabase/functions/_shared/supabase-admin.ts`.

### 4.6 Storage

- **Always use signed URLs** for serving files from Supabase Storage. Never use `getPublicUrl()`.
- Default signed URL expiry: 3600 seconds (1 hour) for all user content.

### 4.7 Token Storage

- **No OAuth tokens in localStorage, sessionStorage, or cookies.** Gmail tokens live encrypted in the `oauth_tokens` DB table, written only by the `gmail-auth` Edge Function.
- The only acceptable localStorage keys are: `homehub-theme`, `i18next`, `homehub-pending-invite` (temporary, removed after invite join completes).

### 4.8 Component Rules

- **Functional components + hooks only.** No class components.
- **No re-implementing shared components.** `AttentionBanner`, `BottomNavBar`, `Toast`, `BaseModal`, `HubGrid`, `SubHubCard`, `EditModeToolbar` are shared — import them from `src/components/shared/`.
- Page components are thin. No business logic in `src/pages/` — import hooks and components there.

### 4.9 Realtime (Child Tables)

`shopping_items` and `tasks` do not carry a `household_id` column. Do **not** subscribe to child tables with a `household_id` filter — this silently fails. Instead, subscribe to the parent table (`shopping_lists`, `task_lists`) and re-fetch child items on any change event.

```typescript
// CORRECT
supabase
  .channel(`household:${householdId}:shopping`)
  .on("postgres_changes", { event: "*", schema: "public", table: "shopping_lists",
      filter: `household_id=eq.${householdId}` },
    () => refetchItemsForAllLists())
  .subscribe();

// WRONG — household_id does not exist on shopping_items
// .on("postgres_changes", { table: "shopping_items", filter: `household_id=eq.${householdId}` })
```

---

## 5. Git Workflow

- **Branch off `master`** — not `main`. `main` is production.
- **Branch naming:** `<bead-id>-<short-description>` (polecats: branch is auto-named by Gas Town harness as `polecat/<name>`)
- **One feature per branch.** No mixing unrelated changes.
- **Commit format:** Conventional commits — `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`
- **`main` is human-only.** Polecats never push to `main` or create PRs targeting `main`. Merge flow: `feature → master → main` (human merge).
- **CI gates (must pass before merge):**
  1. `eslint` — lint check
  2. `tsc --noEmit` — TypeScript typecheck
  3. `vitest run` — unit + component tests (>80% business logic coverage)
  4. `vite build` — production build
  5. Playwright E2E (runs on merge to `master`)

---

## 6. Agent Permissions

| Permission | Rule |
|-----------|------|
| File edits | Polecats write to their own worktree only |
| `docs/PRD_v3.md` | Human-owned — no polecat edits |
| `docs/CLAUDE.md` | Human-approved changes only |
| Security-sensitive changes | RLS policies, auth flows, OAuth scopes → require Mayor review before merge |
| `SUPABASE_SERVICE_ROLE_KEY` | Edge Functions only — never in `src/`, never in a `VITE_` variable |
| `GOOGLE_CLIENT_SECRET` | Edge Functions only — never in `src/` or any browser-accessible location |
| Gmail OAuth scopes | `gmail.readonly` only — never add write scopes without Mayor discussion |
| Google sign-in OAuth flow | Popup flow only (`skipBrowserRedirect: true`) — never full-page redirect |
| Session management | No auto-logout, no PIN lock, no inactivity timeouts (Phase 1 — out of scope) |
| `dangerouslySetInnerHTML` | Forbidden with any user-supplied content |

---

## 7. Role-Specific Reading Lists

Read your full list before writing any code.

### Architect

- `docs/PRD_v3.md` (full)
- `docs/ARCHITECTURE.md` (full)

### Backend Agent

- `docs/PRD_v3.md` → sections: Tech Stack, Database Schema, Auth, Integration Privacy Model, Bills
- `docs/ARCHITECTURE.md` (full)
- `docs/BACKEND.md` (full)
- `docs/SECURITY.md` (full)
- `docs/ENV.md` (full)

### Frontend Agent

- `docs/PRD_v3.md` → sections: Vision, Glossary, Tech Stack, all Hub specs, i18n, PWA, Coding Conventions
- `docs/UI_DESIGN_SYSTEM.md` (full)
- `docs/FRONTEND.md` (full)
- `docs/SCREENS.md` → your assigned screen(s)
- `docs/SECURITY.md` (full)

### UX/UI Designer

- `docs/PRD_v3.md` → sections: Vision, Glossary, all Hub specs, Settings, i18n
- `docs/UI_DESIGN_SYSTEM.md` (full)
- `docs/FRONTEND.md` (full)

### Security Agent

- `docs/PRD_v3.md` → sections: Auth, Integration Privacy Model, Security
- `docs/ARCHITECTURE.md` (full)
- `docs/BACKEND.md` (full)
- `docs/SECURITY.md` (full)

### QA Agent

- `docs/PRD_v3.md` (full)
- `docs/ARCHITECTURE.md` (full)
- `docs/UI_DESIGN_SYSTEM.md` (full)
- `docs/SCREENS.md` (full)

---

## 8. Common Pitfalls

### Auth & Sessions

- **Never trust client-sent JWTs.** Always call `supabase.auth.getSession()` server-side to verify the session.
- **Never call `refreshSession()` manually.** The Supabase JS client handles token refresh automatically.
- **Household deletion must force sign-out all members.** Implemented via Realtime broadcast (`HOUSEHOLD_DELETED` event on `household:{id}:members` channel) for online clients and a session-restore household existence check for offline clients. Both paths must be implemented — see SECURITY.md §8 for the full pattern.

### RLS & Data Isolation

- **Child tables (`shopping_items`, `tasks`) do not carry `household_id`.** Their RLS policies join through the parent table. Never add a direct `household_id` column to child tables as a shortcut.
- **`oauth_tokens` uses user-scoped RLS, not household RLS.** A user's Gmail token is private — their household partner cannot read it even though the extracted bill records are shared. Do not change this.
- **Never use `getPublicUrl()` for user content.** Use `createSignedUrl()` instead.

### Bills Pipeline

- **Bills scanning uses `pg_cron` at 06:00 daily.** It calls the `bill-scanner` Edge Function via `net.http_post`. See BACKEND.md §5 for the pg_cron job definition.
- **The `gmail-fetch` Edge Function is server-to-server only.** It is called by `bill-scanner` and `bill-extractor`, never directly by the client browser.
- **Token refresh is server-side only.** The browser never receives an OAuth access token or refresh token at any point in the bills pipeline.
- **Deduplication is by composite key** `vendor_name + billing_period`. Do not insert a bill if this key already exists.

### Realtime Subscriptions

- **Never subscribe to `shopping_items` or `tasks` with a `household_id` filter.** Those columns don't exist on the child tables. Subscribe to the parent (`shopping_lists`, `task_lists`) and re-fetch children.
- **Unsubscribe on component unmount.** Call `supabase.removeChannel(channel)` in the cleanup function of every `useEffect` that subscribes.

### Shared Components — Do Not Re-Implement

These components already exist in `src/components/shared/`. Import them — do not create hub-local copies:

- `AttentionBanner` — urgent items banner on the home dashboard
- `BottomNavBar` — the 4-tab bottom navigation
- `Toast` — notification toasts
- `BaseModal` — all modal/bottom-sheet wrappers
- `HubGrid` — responsive Sub-Hub card grid
- `SubHubCard` — individual card in the hub grid
- `EditModeToolbar` — bulk-action toolbar when in edit mode

### Smart Bubbles (Shopping Hub)

The Smart Bubbles screen (mockup: `docs/screens/shopping-bubbles.html`) shows context suggestions when a Master List is empty. Bubbles are derived from keyword matching the Sub-Hub name against a context mapping. See PRD §7.3 for the full specification. Do not hard-code context suggestions — they come from the mapping engine in `src/lib/autoCategorize.ts`.

### Invite Codes

- Invite codes are 8-character alphanumeric (unambiguous charset: no `0`, `O`, `1`, `I`, `L`).
- Codes expire after 24 hours and are single-use.
- `join_household_via_invite()` must check expiry, used status, and existence — partial validation is a security defect.
- Rate limiting: 5 failed attempts within 15 minutes triggers a lockout enforced inside the DB function, not just the UI. See SECURITY.md §5 for the full implementation.
- The pending invite code is stored in `localStorage` key `homehub-pending-invite` only between sign-up and the join call. Remove it immediately on success or error.

### Environment Variables

- Variables prefixed `VITE_` are bundled into the browser build and are safe to expose publicly.
- `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_CLIENT_SECRET`, `SUPABASE_JWT_SECRET`, `VAPID_PRIVATE_KEY` are server-only — never prefix them with `VITE_`.
- `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_URL` are **auto-injected** into every Edge Function runtime by Supabase. Do not add them to the Edge Function secrets panel.
- For local Edge Function development, use `supabase functions serve --env-file supabase/.env.local`.

---

## 9. Database Schema Quick Reference

*(Full schema in PRD_v3.md §5)*

```
households ──< user_profiles ──< oauth_tokens (user-scoped)
     │
     ├──< shopping_lists ──< shopping_items
     ├──< task_lists ──< tasks
     ├──< vouchers
     ├──< reservations
     ├──< bills
     ├──< custom_category_mappings
     └──< household_invites

auth.users → ON INSERT → handle_new_user() trigger
  → CREATE households row
  → CREATE user_profiles row (role=owner)
```

**Universal household RLS pattern:**
```sql
USING (household_id IN (
  SELECT household_id FROM user_profiles WHERE id = auth.uid()
))
```

**Child table RLS pattern (no `household_id` column on child):**
```sql
-- shopping_items
USING (list_id IN (
  SELECT id FROM shopping_lists
  WHERE household_id IN (
    SELECT household_id FROM user_profiles WHERE id = auth.uid()
  )
))
```

---

## 10. Edge Functions Quick Reference

All Edge Functions live in `supabase/functions/<name>/`. They run in the Supabase Deno runtime.

| Function | Triggered By | Purpose |
|----------|-------------|---------|
| `gmail-auth` | Client (Settings → Connect Gmail) | OAuth 2.0 code exchange; stores tokens in `oauth_tokens` |
| `gmail-disconnect` | Client (Settings → Disconnect Gmail) | Revokes token, deletes from `oauth_tokens` |
| `gmail-fetch` | Other Edge Functions (server-to-server) | Returns valid access token, refreshing if expired |
| `bill-scanner` | Client (initial) or pg_cron daily at 06:00 | Scans Gmail for vendor emails; returns vendor list (initial) or imports bills (incremental) |
| `bill-extractor` | `bill-scanner` (server-to-server) | Downloads + parses bill email/attachment; stores PDF; inserts `bills` row |
| `push-dispatcher` | pg_cron or DB webhook (Phase 1.3) | Sends Web Push notifications to subscribed devices |

**Response envelope for all Edge Functions:**
```json
{ "success": true, "data": { ... } }
{ "success": false, "error": { "code": "...", "message": "..." } }
```

See BACKEND.md §1 for full request/response contracts per function.

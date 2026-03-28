# HomeHub — Master PRD v3.0
**Status:** Living document | **Last updated:** 2026-03-17
**Supersedes:** PRD.md (v2.0), PRDV2.txt, HomeHub_Technical_Plan.md, context.md, TECH_STACK.md

---

## 1. Vision

HomeHub is a shared home management PWA designed to reduce cognitive load. The system focuses on **visual serenity, smart automation, and rapid actions**, making home administration feel light, intuitive, and effortless for households of 1–4 people.

**Core principle:** Every interaction should feel faster than writing a note on a fridge magnet.

---

## 2. Glossary

| Term | Definition |
|------|------------|
| **Home Hub** | The root dashboard containing all activity domains |
| **Hub** | A top-level domain card (e.g., Shopping & Gear, Home Tasks, Vouchers, Reservations) |
| **Sub-Hub** | A specific list instance within a Hub (e.g., "Supermarket", "Camping Trip") |
| **Context** | The inferred topic of a Sub-Hub based on keyword matching of its name |
| **Mapping** | Lookup table connecting a Context to a starter pack of Master Items |
| **Bubbles** | Transparent interactive buttons that inject starter packs into the Master List |
| **Master List** | The permanent item template database for a Sub-Hub (the blueprint) |
| **Active List** | The dynamic execution list of items currently needed/in-progress |
| **List-Category** | Internal grouping label for items (e.g., Dairy, Documents & Money) |
| **Household** | A group of users sharing the same data space |
| **Invite Code** | An 8-character alphanumeric code used to add a partner to a household |

---

## 3. System Architecture

### 3.1 App Hierarchy

```
Home Hub (Dashboard)
├── Shopping & Gear Hub
│   └── Sub-Hubs (e.g., Supermarket, Camping, Pharma)
│       ├── Master List (blueprint items, categorized)
│       └── Active List (items needed now, checked off)
├── Home Tasks Hub
│   ├── Urgent Tasks (virtual aggregation view)
│   └── Sub-Hubs (e.g., Weekly Chores, Repairs)
│       └── Tasks (title, urgency, assignee, status)
├── Vouchers Hub
│   └── Sub-Hubs (e.g., BuyMe Cards, Gift Cards)
│       └── Voucher Cards (value, issuer, expiry, code)
└── Reservations Hub
    └── Sub-Hubs (e.g., Restaurants, Shows)
        └── Reservation Cards (event date, time, address)
```

### 3.2 Navigation

- Bottom navigation bar with 4 tabs: Shopping, Tasks, Vouchers, Reservations
- Each hub has a grid of Sub-Hub cards
- Tapping a Sub-Hub card navigates into that list
- Back button returns to the hub grid
- Urgent Tasks card in the Tasks Hub deep-links to individual tasks (Flashlight effect)
- The **Tasks tab** in the bottom nav shows a red badge with the total count of urgent items (urgent tasks + overdue bills) when the count is > 0

### 3.3 Attention Banner (Landing Page)

When there are urgent items (urgent tasks or overdue bills), a non-blocking **Attention Banner** appears at the top of the first screen the user lands on after sign-in:

```
⚠️  2 items need your attention  →
```

- Tapping it navigates directly to the Urgent Tasks view
- Dismissed automatically once all urgent items are resolved (count = 0)
- Does not block interaction — it's a banner, not a modal

---

## 4. Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend Framework | React 18 + TypeScript | Functional components + hooks only |
| Build Tool | Vite 5+ | HMR, code splitting by hub |
| Styling | Tailwind CSS 4+ | Utility-first, no CSS files, logical RTL properties |
| Backend | Supabase | PostgreSQL + Auth + Storage + Edge Functions + Realtime |
| State | Supabase JS client | Server state via Supabase; minimal local UI state via useState |
| Routing | React Router 6+ | Client-side SPA routing |
| Hosting | Vercel | Auto-deploy from `main` branch |
| PWA | vite-plugin-pwa | Service worker, manifest, offline support |
| i18n | react-i18next + i18next | English + Hebrew, RTL switching |
| Testing | Vitest + React Testing Library + Playwright | Unit, component, integration, E2E |
| CI/CD | GitHub Actions | Lint → test → build → deploy preview |

### 4.1 Design System — Themes

The app ships with two selectable color themes. The user picks their theme in Settings and the choice persists in `localStorage`. All color values are driven by CSS variables — swapping the theme class on `<html>` is all it takes to recolor the entire app.

#### Theme A — Burgundy (Default)
*Warm, rich, domestic feel*

| Token | Value | Usage |
|-------|-------|-------|
| `--color-primary` | `#630606` (Deep Burgundy) | Headers, buttons, icons, active borders |
| `--color-background` | `#F5F2E7` (Cream/Taupe) | App background, page surfaces |
| `--color-surface` | `#FFFFFF` | Cards, modals, inputs |
| `--color-muted` | `#8E806A` | Secondary text, dividers, placeholders |
| `--color-bubble-bg` | `#630606/10` | Bubble suggestion backgrounds |
| `--color-error` | `#991B1B` | Error states |
| `--color-success` | `#065F46` | Success states |

#### Theme B — Mint
*Fresh, light, airy feel*

| Token | Value | Usage |
|-------|-------|-------|
| `--color-primary` | `#1A6B5A` (Deep Mint) | Headers, buttons, icons, active borders |
| `--color-background` | `#F0F7F5` (Soft Mint White) | App background, page surfaces |
| `--color-surface` | `#FFFFFF` | Cards, modals, inputs |
| `--color-muted` | `#6B8C86` | Secondary text, dividers, placeholders |
| `--color-bubble-bg` | `#1A6B5A/10` | Bubble suggestion backgrounds |
| `--color-error` | `#991B1B` | Error states (same across themes) |
| `--color-success` | `#065F46` | Success states (same across themes) |

#### Implementation Rules
- All components reference CSS variables, never hardcoded hex values
- Theme class (`theme-burgundy` / `theme-mint`) applied to `<html>` element
- Theme persists in `localStorage` key `homehub-theme`
- Default: Burgundy
- Switching theme is instant — no reload required

**Animation:** `duration-300` transitions throughout. No jarring jumps.

**RTL rule:** Always use logical Tailwind properties (`ms-`, `me-`, `ps-`, `pe-`) never directional (`ml-`, `mr-`, `pl-`, `pr-`).

---

## 5. Database Schema

### 5.1 Auth & Household Tables

```sql
households (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  created_at, updated_at TIMESTAMPTZ
)

user_profiles (
  id UUID PRIMARY KEY → auth.users(id),
  household_id UUID → households(id),
  display_name TEXT,
  role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'member')),
  created_at, updated_at TIMESTAMPTZ
)

household_invites (
  id UUID PRIMARY KEY,
  household_id UUID → households(id),
  invite_code TEXT UNIQUE,          -- 8-char alphanumeric
  created_by UUID → auth.users(id),
  expires_at TIMESTAMPTZ,           -- 24 hours from creation
  used_by UUID → auth.users(id),
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)
```

**Auto-trigger:** On `auth.users` INSERT → `handle_new_user()` creates a household and user_profile automatically.

### 5.2 Shopping Hub Tables

```sql
shopping_lists (
  id UUID PRIMARY KEY,
  household_id UUID,
  name TEXT,
  context TEXT,                     -- inferred context key
  created_at, updated_at TIMESTAMPTZ
)

shopping_items (
  id UUID PRIMARY KEY,
  list_id UUID → shopping_lists(id) ON DELETE CASCADE,
  text TEXT,
  quantity TEXT,
  checked BOOLEAN DEFAULT false,
  category TEXT,                    -- auto-categorized
  in_master BOOLEAN DEFAULT true,  -- true = master list, false = active only
  created_at, updated_at TIMESTAMPTZ
)
```

### 5.3 Tasks Hub Tables

```sql
task_lists (
  id UUID PRIMARY KEY,
  household_id UUID,
  name TEXT,
  context TEXT,
  created_at, updated_at TIMESTAMPTZ
)

tasks (
  id UUID PRIMARY KEY,
  list_id UUID → task_lists(id) ON DELETE CASCADE,
  title TEXT,
  description TEXT,
  status TEXT DEFAULT 'todo',       -- todo | in_progress | done
  urgency TEXT,                     -- low | medium | high | critical
  is_urgent BOOLEAN DEFAULT false,
  assignee_id UUID → user_profiles(id),
  due_date DATE,
  notes TEXT,
  source_subhub_id UUID,            -- for Flashlight deep-link
  created_at, updated_at TIMESTAMPTZ
)
```

### 5.4 Vouchers & Reservations Tables

```sql
vouchers (
  id UUID PRIMARY KEY,
  household_id UUID,
  name TEXT,
  value TEXT,                       -- e.g. "₪500"
  issuer TEXT,                      -- e.g. "BuyMe"
  expiry_date DATE,
  code TEXT,
  image_url TEXT,                   -- Supabase Storage URL
  notes TEXT,
  created_by UUID,
  created_at, updated_at TIMESTAMPTZ
)

reservations (
  id UUID PRIMARY KEY,
  household_id UUID,
  name TEXT,
  event_date DATE,
  time TEXT,
  address TEXT,
  image_url TEXT,
  notes TEXT,
  created_by UUID,
  created_at, updated_at TIMESTAMPTZ
)
```

### 5.5 Gmail OAuth Tokens Table

```sql
oauth_tokens (
  id UUID PRIMARY KEY,
  user_id UUID → auth.users(id),
  provider TEXT DEFAULT 'google',
  access_token TEXT,                -- encrypted
  refresh_token TEXT,               -- encrypted
  expires_at TIMESTAMPTZ,
  scopes TEXT[],
  last_scanned_at TIMESTAMPTZ,      -- updated after each successful bill scan run
  created_at, updated_at TIMESTAMPTZ
)
```

### 5.6 RLS Policy Pattern

All tables enforce **household-level isolation** via RLS. Pattern:
```sql
USING (household_id IN (
  SELECT household_id FROM user_profiles WHERE id = auth.uid()
))
```
Child tables (items) inherit access by joining to their parent list's `household_id`.

---

## 6. Authentication & Household System

### 6.1 Auth Modes

The `AuthScreen` component supports 5 modes via tabs and flows:

| Mode | Entry Point | Description |
|------|-------------|-------------|
| `signin` | Default tab | Email + password sign-in. Includes "Continue with Google" |
| `signup` | Tab | Display name + email + password. Requires email confirmation |
| `join` | Tab | Invite code + display name + email + password. Joins an existing household |
| `forgot` | Link from sign-in | Email input → sends Supabase reset link |
| `reset` | URL hash detection | New password input → shown when redirect URL contains `type=recovery` |

### 6.2 Sign-Up Flow

1. User enters display name, email, password (min 6 chars)
2. Supabase creates auth user + sends confirmation email
3. `handle_new_user()` trigger fires: creates household + user_profile
4. User sees "Check your email" message, remains on auth screen
5. After confirming email, user can sign in

### 6.3 Join Household Flow

1. User enters invite code (8-char), display name, email, password
2. Invite code stored in `localStorage` as `homehub-pending-invite`
3. Supabase creates auth user
4. After email confirmation + sign-in, `join_household_via_invite()` runs:
   - Validates invite code (not expired, not used)
   - Updates `user_profiles.household_id` to the inviter's household
   - Marks invite as used
   - Deletes the new user's auto-created empty household
5. Welcome screen shown to new member
6. In-app notification shown to existing household member: "Partner joined!"

### 6.4 Owner vs Member Roles

Every household has exactly one **Owner** (the user who created it) and zero or more **Members** (users who joined via invite code).

| Permission | Owner | Member |
|---|---|---|
| View all household data | ✅ | ✅ |
| Add / edit / delete items | ✅ | ✅ |
| Generate invite codes | ✅ | ❌ |
| Remove a member | ✅ | ❌ |
| Delete the household | ✅ | ❌ |

The Owner role is stored on `user_profiles.role` (`owner` / `member`). RLS policies enforce these restrictions at the database level — not just the UI.

### 6.5 Household Deletion (Danger Zone)

Only the Owner can delete the household. The flow:

1. Owner navigates to Settings → **Danger Zone**
2. Warning is shown clearly:
   - *"This will permanently delete all household data: shopping lists, tasks, vouchers, reservations, bills, and all uploaded images."*
   - *"All members will be signed out immediately with no prior notice."*
   - *"This action cannot be undone."*
3. Owner must type **"DELETE"** into a confirmation input to proceed
4. On confirm:
   - All household data is wiped instantly via database cascade (one chain reaction: household deleted → all linked tables deleted automatically)
   - All active sessions belonging to household members are invalidated
   - Members are signed out and shown the message: *"Your household was deleted by the owner."*
   - Members land on the auth screen — their accounts remain intact, they can create a new household or join another
5. Owner's own account is also signed out and their profile is deleted

### 6.6 Household Safety Guards

- Only the Owner can generate invite codes
- Invite codes expire after **24 hours** and are single-use
- Rate limiting: 5 failed invite code attempts → 15-minute lockout
- A Member cannot delete the household
- A user cannot join a household they're already a member of → shows "Sign in instead" message

### 6.7 Account Deletion

Account deletion is available in Settings. What gets deleted depends on the user's role.

#### What always gets deleted with the account
- `auth.users` record (Supabase Auth)
- `user_profiles` record
- All OAuth tokens (`oauth_tokens` table)
- All custom category mappings they created
- All vouchers they added
- All reservations they added
- All bills they imported

#### What is NOT deleted with the account
Shopping items and tasks are **shared household data** with no ownership tracking. They remain in the household when a member or owner leaves, and are only deleted if the entire household is deleted.

#### If the user is a Member
1. Confirmation prompt shown
2. Account and personal data deleted (see above)
3. Household remains intact — shopping items and tasks they added stay in the household
4. Remaining members see no disruption to household data

#### If the user is the Owner with other members
1. App prompts: *"Choose a new owner before deleting your account"*
2. Owner selects a member from the list → ownership transfers immediately
3. New owner notified: *"You are now the household owner"*
4. Account and personal data deleted
5. Household remains intact — shopping items and tasks they added stay in the household

#### If the user is the Owner alone (solo use)
1. Confirmation prompt shown: *"This will permanently delete your account and all household data including shopping lists, tasks, vouchers, reservations, and bills"*
2. User types **"DELETE"** to confirm
3. Account + household + all household data deleted via cascade

---

### 6.7b Shared Device Policy

HomeHub uses Supabase's default JWT refresh behavior — users stay signed in indefinitely on their device. This is intentional: the app is designed for household use where members trust each other.

**Phase 1 behavior:** No auto-logout, no session timeout, no PIN lock.

**Agents: do not add auto-logout or session timeout logic.** A future Settings option ("Require PIN to open app") is tracked in the backlog but is out of scope for Phase 1.

---

### 6.8 Password Reset & Change

Password changes are handled exclusively via the email reset flow — there is no in-app "Change Password" form in Settings.

1. User clicks "Forgot password?" on the sign-in screen
2. Enters email → Supabase sends reset link to `/reset-password`
3. User clicks link → app detects `type=recovery` in URL hash → switches to `reset` mode
4. User enters new password (min 6 chars) → Supabase updates credentials
5. Redirected to sign-in

**Agents: do not add a change password option to Settings.**

### 6.9 Google OAuth

- Available on Sign In and Sign Up tabs
- Opens Google consent screen in a **popup window** (not redirect, to preserve app state)
- Main window polls `localStorage` for Supabase auth token every 500ms
- On token detection, calls `supabase.auth.getSession()` to complete sign-in
- 5-minute safety timeout on the polling loop

### 6.10 Email Template Branding

Supabase Auth email templates are customized with HomeHub branding (configured in Supabase Dashboard, not code).

---

## 7. Shopping Hub

### 7.1 Overview

The Shopping Hub manages household shopping lists. Each Sub-Hub is a named list (e.g., "Supermarket", "Camping Trip", "Pharmacy") with its own Master List and Active List.

### 7.2 Context Engine

When a Sub-Hub is created or opened, the system scans its name for keywords to identify its **Context**:

| Context | Sample Keywords | Starter Pack Examples |
|---------|----------------|----------------------|
| Grocery | supermarket, market, food, weekly | Milk, Eggs, Bread, Butter |
| Camping | camping, camp, outdoor, tent | Tent, Flashlight, Sleeping Bag |
| Travel Abroad | travel, abroad, flight, passport | Passport, Adaptor, Documents |
| Pharma | pharmacy, pharma, drug, medicine | Paracetamol, Bandages |
| Baby | baby, infant, diaper, newborn | Diapers, Formula, Wipes |
| Cleaning | cleaning, clean, home | Detergent, Mop, Sponge |
| *(12 contexts total — EN + HE keywords)* | | |

Context keywords work in **both English and Hebrew**.

### 7.3 Smart Bubbles

When opening a Sub-Hub with an **empty Master List**, transparent Bubble buttons appear in the center of the screen:

- **Suggestion Bubbles:** One per matched context. Clicking injects that context's starter pack into the Master List.
- **Smart Merge:** Clicking multiple bubbles sequentially adds all items without duplicates.
- **"Keep Empty" Bubble:** Dashed border. Dismisses bubbles for manual entry.
- **Bubble Style:** `bg-[#630606]/10`, `border-[#630606]`, `text-[#630606]`

### 7.4 Master List

The permanent blueprint for a Sub-Hub:
- Items organized into **List-Categories**: `Dairy`, `Meat`, `Fish`, `Pantry`, `Vegetables`, `Fruit`, `Cleaning`, `Pharma & Hygiene`, `Documents & Money`, `Other`
- **Auto-categorization:** New items are automatically assigned a category via keyword matching
- **Duplicate prevention:** Case-insensitive check blocks adding the same item twice
- Items can be added manually, edited, or deleted
- **Bulk Delete Mode:** Multi-select for rapid removal
- "Select All" and "Clear All" shortcuts

### 7.5 Active List

The current session's working list:
- Items toggled from Master List into the Active List
- **Checking off:** Checked items move to the bottom of their category section
- **Ordering:** Active (unchecked) items stay at the top; checked items sink
- Active items can be un-checked to move back up
- Active list is cleared when a shopping session ends

### 7.6 List Persistence

- Master List persists in Supabase per Sub-Hub
- Sub-Hubs with similar names (e.g., "Stock" and "Home Stock") can share context but have independent lists

### 7.7 Smart Category Learning

When `autoCategorize()` cannot classify an item it falls back to `Other`. Instead of leaving it silently uncategorized, the app prompts the user to teach it. Users can also correct any item that was auto-categorized incorrectly.

#### Level 1 — Unrecognized Items (Active Nudge)

1. An item lands in the `Other` category
2. A small **tag icon** appears next to the item name
3. Tapping the icon opens a compact popup: *"Which category does this belong to?"* with all List-Categories as options
4. User selects a category → item moves immediately
5. The mapping is saved to Supabase for the whole household

#### Level 2 — Miscategorized Items (On Demand)

- Any item, regardless of its current category, can be re-categorized
- The option is accessible via the item's **edit flow** (long press or edit mode) — no icon shown, no nudge
- Same popup and same save behavior as Level 1

#### Behavior Rules

- The Level 1 prompt is non-blocking — the user can ignore it, the item stays in `Other`
- Once a mapping is saved, all future items with the same name (case-insensitive) are auto-categorized correctly — no prompt shown again
- Mappings are **household-level**: all household members benefit from each other's corrections
- Stored in Supabase, **not localStorage** — survives cache clears, device switches, new browsers
- `autoCategorize()` checks household custom mappings **before** its built-in keyword pass

#### New DB Table: `custom_category_mappings`

```sql
custom_category_mappings (
  id           UUID PRIMARY KEY,
  household_id UUID → households(id) ON DELETE CASCADE,
  item_name    TEXT NOT NULL,          -- normalized: lowercase, trimmed
  category     TEXT NOT NULL,          -- must be a valid List-Category
  created_by   UUID → user_profiles(id),
  created_at   TIMESTAMPTZ,
  UNIQUE (household_id, item_name)     -- one mapping per item per household
)
```

RLS: household members can read and insert mappings for their own household.

---

## 8. Home Tasks Hub

### 8.1 Overview

The Tasks Hub manages household to-do items organized into Sub-Hubs (e.g., "Weekly Chores", "Repairs", "Urgent"). Each Sub-Hub contains tasks with rich metadata.

### 8.2 Task Fields

| Field | Type | Description |
|-------|------|-------------|
| `title` | Text | Required. Short task description |
| `description` | Text | Optional. Additional detail |
| `status` | Enum | `todo` / `in_progress` / `done` |
| `urgency` | Enum | `low` / `medium` / `high` / `critical` |
| `is_urgent` | Boolean | If true, task appears in Urgent aggregation view |
| `assignee_id` | UUID | Optional. Links to a household member's profile |
| `due_date` | Date | Optional |
| `notes` | Text | Optional freeform notes |

### 8.3 Urgency System

- Tasks can be flagged as **urgent** on creation or via inline toggle
- Urgency levels: `low` (default), `medium`, `high`, `critical`
- `is_urgent` flag aggregates the task into the Urgent Tasks view

### 8.4 Urgent Tasks View

- A **virtual Sub-Hub** pinned at the top of the Tasks Hub grid
- Shows a count badge of all urgent items (tasks + overdue bills)
- Tapping it shows a flat list combining:
  - All `is_urgent = true` tasks from all sub-hubs (shows which Sub-Hub each belongs to)
  - All `overdue` bills (shown with vendor name, amount, due date, and a "Pay Now" shortcut)
- Overdue bills are visually distinguished from tasks (e.g., a bill icon + red label)

### 8.5 Flashlight Deep-Link

When tapping a task in the Urgent Tasks view:
1. App navigates to the source Sub-Hub
2. Scrolls the task into view
3. Applies a **pulsing glow animation** (3 seconds) to highlight the task visually

### 8.6 Task Actions

- **Create:** Modal with title, urgency, assignee, due date, notes
- **Edit:** Inline or modal
- **Complete:** Toggle status → `done`. Checked tasks move to bottom of list
- **Delete:** Individual or bulk via Edit Mode
- **Clear Completed:** Button in hub header removes all `done` tasks with confirmation showing count
- **Assignee:** Dropdown of household members (pulled from `user_profiles`)

---

## 9. Vouchers Hub

### 9.1 Overview

A digital wallet for monetary assets. Sub-Hubs group vouchers by type (e.g., "BuyMe Cards", "Gift Cards", "Store Credit").

### 9.2 Voucher Card

Displays in grid view:
- **Name** (e.g., "Zara Gift Card")
- **Value** (e.g., ₪500)
- **Issuer** (e.g., BuyMe)
- **Expiry Date** — prominently shown, color-coded when near expiry
- **Photo icon** — shown if image is attached
- **Copy icon** — copies code to clipboard

Tapping card opens **Detail Modal** showing all fields + full-size image.

### 9.3 Create Voucher Form

Fields: name, value, issuer, expiry date, code/barcode, image upload, notes

**Smart Paste:** If user pastes a BuyMe or supported URL, the form auto-fills fields and selects the correct type.

**Screenshot OCR:** Tesseract.js scans uploaded images for voucher codes and values to auto-populate fields.

### 9.4 Default Sub-Hub Templates

| Sub-Hub Name | Default Type |
|---|---|
| BuyMe | Voucher |
| Shopping Vouchers | Voucher |
| Digital Cards | Voucher |
| Physical Cards | Voucher |

---

## 10. Reservations Hub

### 10.1 Overview

A separate hub (4th nav tab) for time-bound events: restaurant bookings, shows, appointments. Split from Vouchers in Phase 0.1.

### 10.2 Reservation Card

Displays in grid view:
- **Name** (e.g., "Dinner at Manta Ray")
- **Event Date** + **Time**
- **Address**
- **Photo icon** — if image attached
- **Link icon** — if booking URL attached

Tapping card opens **Detail Modal**.

### 10.3 Create Reservation Form

Fields: name, event date, time, address, image upload, notes

**Default Sub-Hub Templates:**

| Sub-Hub Name | Default Type |
|---|---|
| Ontopo | Reservation |
| Movies & Shows | Reservation |

### 10.4 Custom Sub-Hubs

When creating a new Sub-Hub in either Vouchers or Reservations, the user selects the type via radio buttons if it doesn't match a default template.

---

## 11. Settings Screen

### 11.1 Available Settings

| Setting | Description |
|---------|-------------|
| **Theme** | Toggle between Burgundy and Mint color themes. Switches instantly, persisted in localStorage |
| **Language** | Toggle between English and Hebrew. Switches app `dir` attribute and all translations without reload |
| **Gmail Connection** | Connect / disconnect Gmail OAuth. Shows connection status (Connected / Not Connected) |
| **Invite Partner** | Generates an 8-char invite code valid for 24 hours. User shares it via any channel |
| **Household Info** | Shows household name, list of members with display names |
| **Sign Out** | Signs out current user. Supabase session is cleared |

### 11.2 Invite Code Generation

- Clicking "Invite Partner" calls `create_household_invite()` SQL function
- Returns 8-character code using unambiguous characters (no 0/O, 1/I/L)
- Code displayed prominently with a copy button
- Expires in **24 hours**

---

## 12. Internationalization (i18n)

### 12.1 Supported Languages

| Language | Code | Direction |
|----------|------|-----------|
| English | `en` | LTR |
| Hebrew | `he` | RTL |

### 12.2 Implementation

- **Library:** `react-i18next` + `i18next`
- **Namespace files:** `common`, `shopping`, `tasks`, `vouchers`, `reservations`, `auth`, `settings`
- Language toggle in Settings switches `<html dir>` attribute and language instantly (no reload)
- All user-facing strings go through `t()` — no hardcoded strings in components

### 12.3 Hebrew-Specific

- Context engine keyword matching works in Hebrew
- Auto-categorization works with Hebrew item names
- All Tailwind layout uses logical properties for RTL compatibility
- Bubble labels and starter pack item names translated
- All error messages, confirmation dialogs, form labels translated

### 12.4 Auto-Categorization Requirements

The `autoCategorize()` function must correctly classify items in **both English and Hebrew**, including:
- Singular and plural forms (e.g., `בצל` / `בצלים`)
- Colloquial Israeli terms (e.g., `גמבה` for bell pepper, `ג'ויה` for dish soap)
- Common abbreviations (e.g., `תפו"א` for potato)
- Brand names commonly used as generic terms (e.g., `אקמול` for paracetamol)

**Agent task (Frontend):** Before implementing `autoCategorize()`, produce a full keyword mapping document (`docs/autoCategorize-keywords.md`) covering all List-Categories in both languages, validated against real shopping use cases. The PRD does not dictate the keyword list — the agent owns that research.

---

## 13. PWA

### 13.1 Current Status (Complete)

- `manifest.json` with full icon set (72px → 512px), theme `#630606`, background `#F5F2E7`
- `display: standalone` mode (no browser chrome)
- Service worker via `vite-plugin-pwa`
- App shell precached — loads offline
- Offline fallback page shown when disconnected and cache misses
- Installable to home screen on Android and iOS

### 13.2 Cache Strategy

| Resource | Strategy |
|----------|----------|
| App shell (HTML, JS, CSS) | Precache |
| API calls (Supabase) | Network-first |
| Images | Cache-first |
| Offline fallback | Cache |

---

## 14. Integration Privacy Model

HomeHub is a **shared household app** — but many integrations connect to personal accounts. The rule is simple:

> **Connections are always personal. Extracted data is shared with the household — unless the user chooses otherwise.**

### 14.1 Privacy Rules Per Integration

| Integration | OAuth connection | What is shared with household | User controls |
|---|---|---|---|
| **Gmail / Bills** | Per-user, stored on their profile only | Extracted bill data only (vendor, amount, due date) — never email content | On/off per vendor in review screen |
| **BuyMe** | Per-user, stored on their profile only | User chooses per item: Share or Keep private | Share / Keep private toggle on import |
| **Ontopo / Tabit** | Per-user, stored on their profile only | User chooses per item: Share or Keep private | Share / Keep private toggle on import |
| **Google Calendar** | Per-user, stored on their profile only | Never shared — always personal | On/off in Settings |

### 14.2 Multi-Account Bills

Both household members can connect their own Gmail independently. The bill scanner runs separately on each connected Gmail and merges extracted bills into the shared household Bills hub with deduplication. No user ever sees another user's inbox — only the extracted bill records.

### 14.3 What "Per-User" Means Technically

- OAuth tokens stored in `oauth_tokens` table scoped to `user_id`, not `household_id`
- No other household member can trigger a scan or read tokens belonging to another user
- RLS policy: `user_id = auth.uid()` on the `oauth_tokens` table — strict, no household lookup

---

## 15. Gmail OAuth Integration

### 15.1 Status: Complete (Phase 0.3)

- Registered in Google Cloud Console with `gmail.readonly` scope
- OAuth 2.0 authorization code flow via Supabase Edge Function `gmail-auth`
- Access + refresh tokens stored encrypted in `oauth_tokens` table, scoped to `user_id`
- Token refresh handled automatically by Edge Function `gmail-fetch`
- Settings UI: "Connect Gmail" button → Google consent screen → returns Connected status
- Disconnect option with confirmation

---

## 16. Testing Strategy

### 15.1 Test Layers

| Layer | Tool | Scope | Status |
|-------|------|-------|--------|
| Unit | Vitest | Context engine, auto-categorize, smart-merge, utils | ✅ ~400 tests |
| Component | Vitest + RTL | Cards, forms, modals, bubbles | ✅ Covered |
| Integration | Vitest + RTL | Hub flows, CRUD, auth flows | ✅ Covered |
| E2E | Playwright | Full user journeys, all hubs, auth | ✅ 35 tests |
| Manual/Sanity | Checklist | Device matrix: iOS, Android, Desktop | ✅ 116 checks |

### 15.2 CI/CD

GitHub Actions pipeline on every PR:
1. Lint (ESLint)
2. Type check (TypeScript)
3. Unit + component tests (Vitest)
4. Build (Vite)
5. Deploy preview (Vercel)
6. E2E tests run on merge to `master`

### 15.3 Coverage Targets

- Business logic: >80%
- Component render paths: >70%
- Critical auth flows: 100% (32 edge-case tests)

---

## 17. Coding Conventions

```
- All components: functional with hooks (no class components)
- TypeScript strict mode — no `any`
- Tailwind for all styling — no CSS files, no inline styles
- RTL: use ms-/me-/ps-/pe- not ml-/mr-/pl-/pr-
- All strings: through i18n t() — no hardcoded user-facing text
- Supabase RLS: household-level isolation on all tables
- Sensitive tokens: never in localStorage (use Supabase encrypted storage)
- Git: feature branches only. Never commit to main or master directly.
- Branch naming: agent/{task-id}-{short-description}
```

---

## 18. Current Implementation Status

All Phase 0 and Phase 1.0 work is **complete and deployed to production** at `our-homehub.vercel.app`.

| Phase | Description | Status |
|-------|-------------|--------|
| 0.1 | Vouchers/Reservations split into separate tables + components | ✅ Done |
| 0.2 | Full test suite (Vitest + Playwright + Sanity checklist) | ✅ Done |
| 0.3 | Gmail OAuth integration | ✅ Done |
| 0.4 | Hebrew i18n + RTL layout | ✅ Done |
| 0.5 | Responsive design + PWA foundation | ✅ Done |
| 1.0 | Auth & Onboarding hardening (forgot password, join flow, household guards) | ✅ Done |

**Deployment:**
- `main` branch → production (Vercel auto-deploy)
- `master` branch → working branch (all PRs merge here)
- Human merges `master` → `main` to ship to production

---

## 19. Roadmap — Phase 1 Features (Not Yet Built)

### 18.1 Bill Management (Phase 1.1)
**Depends on:** Gmail OAuth (complete)

**Privacy model:** See Section 14. Each user connects their own Gmail privately. Only extracted bill data reaches the household — never email content or PDF content. Multiple household members can each connect their Gmail; bills are merged and deduplicated.

**No external LLM required.** All extraction is done locally inside the Edge Function using a vendor database + PDF parsing + OCR. Nothing is sent to a third-party AI service.

**Architecture:**
```
Gmail API (per user)
→ Edge Function: bill-scanner
  → match sender against known vendor database
  → download PDF attachment
  → extract text (PDF parser for text-based, Tesseract OCR for image-based)
  → regex patterns per vendor → extract: amount, due date, billing period
  → store PDF in Supabase Storage
→ Bills table (household_id)
→ Bills hub
```

**Ongoing import — daily polling via pg_cron:**
A Supabase `pg_cron` job runs daily at 06:00 for every user who has Gmail connected. It invokes the `bill-scanner` Edge Function, which queries Gmail for new emails from known vendors received since the user's `last_scanned_at` timestamp. On completion, `last_scanned_at` is updated. Bills typically appear within 24 hours of arriving in Gmail.

The `oauth_tokens` table stores `last_scanned_at TIMESTAMPTZ` per user to track the scan window. On first activation this is set to 90 days ago (retroactive scan); on every subsequent daily run it advances to the current time.

**Flow:**
1. User activates "Bills" in Settings (opt-in, with disclaimer: *"Your Gmail will be scanned for bills from known vendors. Email content is never stored."*)
2. Edge Function `bill-scanner` performs 90-day retroactive scan — searches for emails from known vendor sender addresses
3. **Review Screen:** user sees detected vendors with sample subject lines, approves/rejects each; can add a vendor manually by sender email
4. On approval, Edge Function `bill-extractor` processes each vendor's emails:
   - Finds PDF attachment → downloads it
   - Attempts text extraction (PDF parser); falls back to Tesseract OCR if image-based
   - Applies vendor-specific regex to extract: amount, due date, billing period
   - Stores PDF in Supabase Storage under `household_id/bills/`
5. **Deduplication:** composite key `vendor_name + billing_period` — if two household members receive the same bill, only one record is kept
6. Bill card appears in Bills hub showing:
   - Vendor icon + name
   - Amount (e.g., ₪320)
   - Due date
   - **"Pay Now"** button → opens vendor's payment website in browser
   - **"View Invoice"** button → opens the stored PDF via a time-limited signed URL
   - **"Mark as Paid"** button → moves bill to History (status: `paid`)

**Bill status lifecycle:**
- `pending` — newly imported, not yet paid
- `paid` — user tapped "Mark as Paid". Bill moves to **History tab** and is hidden from the main view.

**Overdue is a derived state, not stored.** A bill is considered overdue when `due_date < today AND status = 'pending'`. No cron job required — the query that fetches bills computes this at read time. Overdue bills are styled in red and surface in the Urgent Tasks view (see Section 8.4).

**Bills hub layout:**
- **Main view:** shows only `pending` and `overdue` bills, sorted by due date (soonest first). Overdue bills shown with red styling.
- **History tab:** shows all `paid` bills, sorted by paid date descending.

**Vendor Database (Backend agent task):**
The Backend agent must build and maintain `docs/bill-vendors.json` — a list of known Israeli bill vendors including:

| Field | Example |
|---|---|
| `vendor_name` | "HOT Mobile" |
| `sender_email` | `@hot.net.il` |
| `payment_url` | `https://www.hot.net.il/pay` |
| `pdf_regex` | patterns to extract amount + due date |

Minimum vendors to support at launch: HOT, Bezeq, IEC (חברת חשמל), water authorities, Arnona, internet providers (Partner, Cellcom, 012).

**Additional DB table required:**
```sql
bills (
  id             UUID PRIMARY KEY,
  household_id   UUID,
  vendor_name    TEXT,
  amount         DECIMAL,
  due_date       DATE,
  billing_period TEXT,
  payment_url    TEXT,       -- vendor's payment website URL
  pdf_url        TEXT,       -- signed Supabase Storage URL
  status         TEXT,       -- pending | paid (overdue is derived: due_date < today AND status = pending)
  source_email_id TEXT,      -- Gmail message ID, for deduplication
  imported_by    UUID,       -- which household member's Gmail
  created_at, updated_at TIMESTAMPTZ,
  UNIQUE (household_id, vendor_name, billing_period)  -- deduplication: one bill per vendor per period per household
)
```

**`user_approved_vendors` table (persists vendor approval state from Review Screen):**
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
RLS: user-scoped (`user_id = auth.uid()`). The `bill-scanner` incremental mode filters against this table to know which vendors to process automatically without re-prompting the Review Screen.

**Acceptance criteria:**
- 90-day scan identifies all vendors from the supported vendor database
- Daily pg_cron job runs at 06:00 and imports any new bills since last scan
- User approves/rejects vendors with full control; manual vendor add works
- No duplicate records when two members receive the same bill
- PDF attached to bill card and viewable via signed URL
- "Pay Now" opens correct vendor payment page
- No email or PDF content ever stored in the database — only extracted fields + the PDF file itself in Storage
- No external AI/LLM service called during extraction

---

### 18.1b Third-Party Integrations Research (Phase 1.1b)
**Depends on:** nothing — can run in parallel with any phase
**Agent:** Backend

Before any implementation, the Backend agent must research whether the following Israeli platforms offer public or partner APIs:

| Platform | Used for | Research questions |
|---|---|---|
| **BuyMe** | Vouchers | Is there an API or OAuth flow to read a user's voucher balance and codes? |
| **Ontopo** | Reservations | Is there an API to read a user's upcoming reservations? |
| **Tabit** | Reservations | Is there an API or integration point for reservation data? |

**Output:** A short findings doc (`docs/third-party-api-research.md`) per platform covering: API availability, auth method (OAuth / API key / none), data accessible, rate limits, terms of service restrictions.

**Privacy model applies regardless of implementation approach:** See Section 14. Each user connects their own account. Extracted data (voucher codes, reservation details) is surfaced in the app per user's sharing preference — the platform account credentials are never shared with the household.

**If no public API exists:** document scraping/workaround options and flag to human for decision before building anything.

---

### 18.2 Shared Calendar & Deadlines Carousel (Phase 1.2)
**Depends on:** Phase 0.1 (Vouchers refactor — complete), Phase 1.1 (Bill Management)

Horizontal scrollable carousel pinned at top of Home Hub showing:

| Card Type | Data Source | Label |
|-----------|-------------|-------|
| Bill due | Bills table | "Home" |
| Voucher expiring | Vouchers table (within 30 days) | "Home" |
| Urgent task count | Tasks table | "Home" |
| Google Calendar event | Google Calendar API (opt-in, Today + Tomorrow only) | "Personal" |

- Swipeable on mobile, arrow navigation on desktop
- Each card deep-links to its source item
- Google Calendar: opt-in OAuth, read-only, events rendered locally only (never stored or shared)
- "Home" vs "Personal" labels distinguish household data from personal calendar

---

### 18.3 Push Notifications (Phase 1.3)
**Depends on:** Phase 0.5 PWA (complete), Phase 1.1 Bill Management

**Infrastructure:** Web Push API via service worker + Supabase Edge Function `push-dispatcher`

**Privacy model:**
- Lock screen: generic text only (e.g., "A new household bill has arrived")
- In-app: full details

**Triggers:**

| Event | Notification |
|-------|-------------|
| New bill detected | "Bill from [vendor] arrived" |
| Task marked urgent | "New urgent task: [title]" |
| Voucher expiring in 7 days | "Your [name] voucher expires soon" |
| Daily 08:00 | Digest of urgent tasks |

**User controls:**
- Quiet Hours: configurable window — notifications queued and delivered in batch afterward
- Category toggles: Bills / Tasks / Vouchers — independent on/off
- Daily digest: configurable time (default 08:00)

---


### 18.5 Native PWA Finalization (Phase 1.5)
**Depends on:** Phase 0.5 PWA foundation (complete)

- Full offline support: cached app shell + all recently viewed data
- Background sync: queue mutations offline, replay on reconnect
- Cache versioning + "New version available" prompt
- iOS Safari PWA quirks fixed (viewport, status bar, gestures)
- Code splitting by hub (lazy load each hub's chunk)
- Image optimization (WebP, lazy loading, Supabase image transforms)
- **Lighthouse targets:** PWA score >90, Performance >85

---

## 20. Risk Register

| Risk | Impact | Mitigation |
|------|--------|------------|
| Gmail API quota limits | Bill scanning throttled | Batch scans during off-peak, cache results |
| iOS PWA push notification limitations | Notifications not delivered on iOS < 16.4 | Verify iOS 16.4+ support, fallback to in-app |
| Google Calendar privacy | Personal events leaked | Render locally only, never store or share |
| Scope creep | Timeline slips | Strict acceptance criteria per phase milestone |

---

## 21. Phase 1 Dependency Map

```
Gmail OAuth (0.3) ✅ ──────────────────→ 1.1 Bill Management
Vouchers Refactor (0.1) ✅ ─────────────→ 1.2 Calendar Carousel (voucher expiry cards)
1.1 Bill Management ────────────────────→ 1.2 Calendar Carousel (bill due cards)
PWA Foundation (0.5) ✅ ────────────────→ 1.3 Push Notifications
1.1 Bill Management ────────────────────→ 1.3 Push Notifications (bill alerts)
PWA Foundation (0.5) ✅ ────────────────→ 1.5 PWA Finalization

PARALLEL (can run simultaneously):
  1.1 Bill Management + 1.2 Calendar + 1.5 PWA Finalization

SEQUENTIAL (must wait):
  1.3 Push Notifications → after 1.1 + 1.5
```

---

## 22. Phase 1 Milestone Summary

| Milestone | Tasks | Gate |
|-----------|-------|------|
| M1: Bills | 1.1 Bill Management | Bills auto-extracted + displayed |
| M2: Calendar + PWA | 1.2 Carousel + 1.5 PWA Finalization | Carousel live, full offline, Lighthouse >90 |
| M3: Notifications | 1.3 Push Notifications | Notifications delivered on Android + iOS PWA |

---

---

## 23. How to Update This PRD

This document is the **single source of truth** for all agents. Code follows the PRD — never the other way around.

### Rules for All Agents

- **Agents do NOT edit this document.** Only the human updates the PRD.
- Implement exactly what the PRD says — nothing more, nothing less
- If a section is unclear, missing detail, or seems wrong — **stop and flag it to the human** before making any assumption or starting work
- If you think something should be added or changed, surface it as a suggestion to the human — do not implement it and do not edit the PRD yourself

### When to Update

| Situation | Who updates | What to do |
|-----------|-------------|------------|
| Small change (wording, field name, behavior tweak) | Human or Coordinator | Edit the relevant section, note the change in `HomeHub_GT.md` |
| New feature added mid-build | Human first, then Coordinator | Add the feature section to PRD, then tell the Mayor |
| Feature already built needs to change | Human first | Update PRD, Mayor creates a bead to fix the code |
| Feature turns out to be impossible | Human + Mayor discuss, Human decides | Update PRD to reflect new decision, log reason in `HomeHub_GT.md` |

### How to Update

1. Edit `PRD_v3.md` directly — update the relevant section
2. Add a one-line entry to the changelog below with the date and what changed
3. If the change affects an agent currently working, notify the Mayor: *"PRD updated, section X — re-read before continuing"*

### Changelog

| Date | Section | Change |
|------|---------|--------|
| 2026-03-17 | All | Initial v3.0 — consolidated from all previous PRDs and source code review |
| 2026-03-17 | 4.1 | Added Burgundy and Mint theme system with CSS variables |
| 2026-03-17 | 7.7 | Added Smart Category Learning feature (tag icon + household mappings in Supabase) |
| 2026-03-17 | 12.4 | Added auto-categorization requirements, delegated keyword research to Frontend agent |
| 2026-03-17 | 14 | Added Integration Privacy Model section (per-user connections, household-level extracted data) |
| 2026-03-17 | 18.1 | Updated Bills to reflect multi-user Gmail privacy model |
| 2026-03-17 | 18.1b | Added Third-Party Integrations Research task (BuyMe, Ontopo, Tabit) |
| 2026-03-17 | 6.4–6.6 | Added Owner/Member roles, Danger Zone deletion flow, household safety guards |
| 2026-03-17 | 18.1 | Removed LLM dependency from Bills — replaced with vendor DB + PDF parser + Tesseract OCR |
| 2026-03-17 | 5.2, 5.3 | Shopping items and tasks have no ownership tracking — shared household data, never deleted on member removal |
| 2026-03-17 | 6.7 | Added Account Deletion flows (Member / Owner with members / solo Owner) |
| 2026-03-17 | 5 | Fixed invite code expiry: 7 days → 24 hours |
| 2026-03-28 | 5.1 | Added `role` column to `user_profiles` schema (owner/member) |
| 2026-03-28 | 5.5 | Added `last_scanned_at` to `oauth_tokens` schema |
| 2026-03-28 | 11.1 | Fixed invite code expiry in Settings table: 7 days → 24 hours |
| 2026-03-28 | 19.1 | Added `user_approved_vendors` table schema for bill vendor review persistence |
| 2026-03-28 | 19.1 | Added UNIQUE constraint to `bills` table (household_id, vendor_name, billing_period) |
| 2026-03-28 | All | Renumbered duplicate §15 (Testing Strategy → §16), shifted §16–§22 → §17–§23 |

---

*Document consolidates: PRD.md v2.0, PRDV2.txt, HomeHub_Technical_Plan.md, context.md, TECH_STACK.md, BOARD.md, supabase/01-schema.sql, supabase/02-auth-schema.sql, AuthScreen.tsx, CLAUDE.md*
*Generated: 2026-03-17*

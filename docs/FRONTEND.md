# HomeHub Frontend Architecture
**Status:** Living document | **Last updated:** 2026-03-26
**Companion to:** PRD_v3.md, UI_DESIGN_SYSTEM.md

This document is the frontend engineer's reference for file organisation, component contracts, state management, hooks, i18n, and testing patterns. Read it alongside the PRD (specs) and UI Design System (tokens/visual rules). Do **not** introduce patterns not listed here without updating this document first.

---

## 1. File Structure

### 1.1 Folder Layout

```
src/
├── components/
│   ├── shared/          # Reusable UI components used across ≥ 2 hubs or routes
│   └── hubs/            # Hub-specific feature components
│       ├── shopping/
│       ├── tasks/
│       ├── vouchers/
│       └── reservations/
├── hooks/               # Custom React hooks (one per data domain)
├── lib/                 # Pure utilities and third-party wrappers
├── pages/               # Route-level page components (thin — delegate to components/hooks)
├── contexts/            # React context providers
├── locales/             # i18n translation files
│   ├── en/
│   │   ├── common.json
│   │   ├── shopping.json
│   │   ├── tasks.json
│   │   ├── vouchers.json
│   │   ├── reservations.json
│   │   ├── auth.json
│   │   ├── settings.json
│   │   └── bills.json        ← Phase 1.1 stub (see §8)
│   └── he/
│       └── (mirror of en/)
└── types/               # Shared TypeScript types and interfaces
```

### 1.2 What Goes Where

| Folder | Contains | Naming convention |
|--------|----------|-------------------|
| `components/shared/` | Components used in ≥ 2 hubs **or** on every page (nav, modals, FAB) | PascalCase file = component name, e.g. `BaseModal.tsx` |
| `components/hubs/<hub>/` | Components that render hub-specific data structures | PascalCase, prefixed with hub when disambiguation helps, e.g. `TaskCard.tsx` |
| `hooks/` | Custom hooks returning data + mutations for one data domain | camelCase with `use` prefix, e.g. `useShoppingList.ts` |
| `lib/` | Pure functions, Supabase client init, auto-categorize, context engine | camelCase, e.g. `autoCategorize.ts`, `supabase.ts` |
| `pages/` | One file per route. No business logic — import hooks + components only | PascalCase matching route, e.g. `ShoppingPage.tsx` |
| `contexts/` | React context providers for cross-cutting state (auth, household, theme, language) | PascalCase + `Context` suffix, e.g. `AuthContext.tsx` |
| `locales/` | JSON namespace files per language | `<namespace>.json` matching i18next namespace strings |
| `types/` | Shared TypeScript interfaces/types derived from DB schema | PascalCase, e.g. `ShoppingItem`, `Task`, `Voucher` |

### 1.3 Naming Conventions

- **Components:** PascalCase filename, default export, filename = component name. No index barrels for individual components.
- **Hooks:** camelCase, `use` prefix, named export.
- **Types:** PascalCase interface names. One domain per file (e.g. `types/shopping.ts`, `types/tasks.ts`).
- **Test files:** Co-located as `ComponentName.test.tsx` or `hookName.test.ts` next to the source file.
- **No default exports for hooks, utils, or types** — named exports only.

---

## 2. Shared Application Components

These components live in `src/components/shared/` and are used across multiple hubs or routes. Each entry below defines the contract (props, slots, usage) that all hub implementations must follow.

### 2.1 HubGrid

Renders the responsive grid of Sub-Hub cards inside any hub page.

**File:** `src/components/shared/HubGrid.tsx`

**Props interface:**
```typescript
interface HubGridProps {
  children: React.ReactNode;      // SubHubCard elements
  isEditMode?: boolean;           // Passed down to each child via context (see §4.1)
  onReorder?: (ids: string[]) => void; // Future: drag-to-reorder (no-op in Phase 1)
}
```

**Layout:** `grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 lg:gap-5` (see UI_DESIGN_SYSTEM §3.2).

**Slot / injection pattern:** Children are `SubHubCard` components. `HubGrid` does not know about hub data — the parent page maps sub-hubs to cards. Edit mode state is injected via `EditModeContext` (see §4.1), not through the children prop.

**Usage example:**
```tsx
<HubGrid>
  {subHubs.map(hub => (
    <SubHubCard
      key={hub.id}
      subHub={hub}
      onTap={() => navigate(`/shopping/${hub.id}`)}
    />
  ))}
</HubGrid>
```

---

### 2.2 SubHubCard

Displays a single Sub-Hub entry in the hub grid. Handles tap navigation, selection state in edit mode, and the long-press edit trigger.

**File:** `src/components/shared/SubHubCard.tsx`

**Props interface:**
```typescript
interface SubHubCardProps {
  subHub: SubHub;                         // from types/subHub.ts
  onTap: () => void;                      // navigate into the sub-hub
  onLongPress?: () => void;               // enter edit mode (optional — hub may manage this)
}
```

**Edit mode behavior:** When `EditModeContext.isEditMode` is true, the card shows a checkbox overlay. Tap selects/deselects it. The selection state is managed by `EditModeContext` (see §4.1), not by the card itself.

**Slot / injection pattern:** None. Content is derived entirely from the `subHub` prop.

**Usage example:**
```tsx
<SubHubCard
  subHub={{ id: 'abc', name: 'Supermarket', itemCount: 12, context: 'grocery' }}
  onTap={() => navigate('/shopping/abc')}
  onLongPress={enterEditMode}
/>
```

---

### 2.3 EditModeToolbar

The toolbar that appears at the bottom of the screen when the hub is in edit mode. Provides bulk select-all, bulk delete, and exit-edit-mode actions.

**File:** `src/components/shared/EditModeToolbar.tsx`

**Props interface:**
```typescript
interface EditModeToolbarProps {
  selectedCount: number;                  // number of currently selected items
  totalCount: number;                     // total selectable items
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onDelete: () => void;                   // triggers ConfirmDialog, then bulk delete
  onClose: () => void;                    // exits edit mode
}
```

**Layout:** Fixed to bottom of screen above the bottom nav. Uses `z-[--z-toast]` (below modals, above content).

**Slot / injection pattern:** None. All actions are callback props. The toolbar has no knowledge of what it is deleting.

**Usage example:**
```tsx
{isEditMode && (
  <EditModeToolbar
    selectedCount={selected.size}
    totalCount={subHubs.length}
    onSelectAll={() => selectAll()}
    onDeselectAll={() => clearSelection()}
    onDelete={handleBulkDelete}
    onClose={exitEditMode}
  />
)}
```

---

### 2.4 BaseModal

The shared bottom-sheet / centered-card wrapper for all modals. Provides overlay, animation, focus trap, keyboard close, and accessibility attributes. No business logic.

**File:** `src/components/shared/BaseModal.tsx`

**Props interface:**
```typescript
interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;                          // rendered in header; also used for aria-labelledby
  children: React.ReactNode;             // scrollable body content
  footer?: React.ReactNode;             // sticky footer (typically action buttons)
  size?: 'sm' | 'md' | 'lg';            // max-width override; default 'md' (max-w-lg)
}
```

**Slot / injection pattern:** `children` is the scrollable body. `footer` is an optional sticky footer slot (rendered below the body, above the safe-area inset). The header (title + close button) is always rendered by `BaseModal`.

**Behaviour:**
- Overlay click → `onClose`
- `Escape` key → `onClose`
- Focus trapped inside while open (`focus-trap-react` or equivalent)
- `aria-modal="true"`, `role="dialog"`, `aria-labelledby` pointing to the `<h2>` in the header

**Usage example:**
```tsx
<BaseModal
  isOpen={isCreateOpen}
  onClose={() => setIsCreateOpen(false)}
  title={t('shopping:createList')}
  footer={
    <>
      <Button variant="secondary" onClick={() => setIsCreateOpen(false)}>{t('common:cancel')}</Button>
      <Button variant="primary" onClick={handleSubmit} className="flex-1">{t('common:save')}</Button>
    </>
  }
>
  <CreateListForm ... />
</BaseModal>
```

---

### 2.5 CreateItemFAB

The floating action button for creating a new item within a list or hub. Fixed to the bottom-right, above the bottom nav.

**File:** `src/components/shared/CreateItemFAB.tsx`

**Props interface:**
```typescript
interface CreateItemFABProps {
  onClick: () => void;                    // opens the relevant create modal
  label: string;                          // aria-label and optional visible text
  icon?: React.ReactNode;                // defaults to a "+" icon
  isVisible?: boolean;                   // hide during edit mode (default true)
}
```

**Layout:** `fixed bottom-[calc(64px+env(safe-area-inset-bottom)+16px)] end-4` — logical `end-4` auto-flips in RTL.

**Slot / injection pattern:** None. Parent controls visibility and the onClick handler.

**Usage example:**
```tsx
<CreateItemFAB
  onClick={() => setIsCreateModalOpen(true)}
  label={t('shopping:addItem')}
  isVisible={!isEditMode}
/>
```

---

### 2.6 SubHubManagerModal

A modal for creating, renaming, or deleting a Sub-Hub. Shared across all four hubs.

**File:** `src/components/shared/SubHubManagerModal.tsx`

**Props interface:**
```typescript
type SubHubManagerMode = 'create' | 'rename' | 'delete';

interface SubHubManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: SubHubManagerMode;
  subHub?: SubHub;                        // required for rename/delete, omit for create
  onSuccess: (subHub: SubHub) => void;   // called after successful create/rename
  onDelete?: (id: string) => void;       // called after confirmed delete
  hubType: 'shopping' | 'tasks' | 'vouchers' | 'reservations';
}
```

**Behaviour:**
- `create`: shows a name input field + submit. Calls the relevant hook's `createSubHub` mutation.
- `rename`: pre-fills the input with `subHub.name`. Calls `renameSubHub`.
- `delete`: shows a ConfirmDialog pattern (see §2.8) inside the modal.

**Slot / injection pattern:** Uses `BaseModal` internally. No external slots.

**Usage example:**
```tsx
<SubHubManagerModal
  isOpen={isManaging}
  onClose={() => setIsManaging(false)}
  mode="create"
  hubType="shopping"
  onSuccess={(newHub) => navigate(`/shopping/${newHub.id}`)}
/>
```

---

### 2.7 DetailModal

A read-only detail view modal for Voucher and Reservation cards. Shows all fields and the full-size image.

**File:** `src/components/shared/DetailModal.tsx`

**Props interface:**
```typescript
interface DetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: Voucher | Reservation;            // from types/vouchers.ts or types/reservations.ts
  onEdit: () => void;                     // switches to edit mode (parent opens edit modal)
  onDelete: () => void;                   // triggers confirm, then deletes
  type: 'voucher' | 'reservation';
}
```

**Slot / injection pattern:** Uses `BaseModal` internally. The body layout adapts to `type`. No external slots.

**Usage example:**
```tsx
<DetailModal
  isOpen={!!selectedVoucher}
  onClose={() => setSelectedVoucher(null)}
  item={selectedVoucher}
  type="voucher"
  onEdit={() => openEditModal(selectedVoucher)}
  onDelete={() => handleDelete(selectedVoucher.id)}
/>
```

---

### 2.8 ConfirmDialog

A lightweight confirmation dialog for destructive actions. Rendered as a small centered modal via `BaseModal`.

**File:** `src/components/shared/ConfirmDialog.tsx`

**Props interface:**
```typescript
interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;                        // body text
  confirmLabel?: string;                  // default: t('common:delete')
  confirmVariant?: 'danger' | 'primary'; // default: 'danger'
  isLoading?: boolean;                    // disables confirm button while mutation is in-flight
}
```

**Slot / injection pattern:** None. All content through props. `title` + `message` must be passed as translated strings by the caller — this component does not call `t()` internally for content (only for the default `confirmLabel`).

**Usage example:**
```tsx
<ConfirmDialog
  isOpen={isConfirmOpen}
  onClose={() => setIsConfirmOpen(false)}
  onConfirm={deleteSubHub}
  title={t('shopping:deleteListTitle')}
  message={t('shopping:deleteListMessage', { name: subHub.name })}
  isLoading={isDeleting}
/>
```

---

### 2.9 AttentionBanner

Persistent banner shown at the top of the landing (home) screen when urgent items exist. Navigates to the Urgent Tasks view on tap.

**File:** `src/components/shared/AttentionBanner.tsx`

**Props interface:**
```typescript
interface AttentionBannerProps {
  count: number;      // total urgent items (tasks + overdue bills)
  onTap: () => void;  // navigate to Urgent Tasks view
}
```

**Behaviour:**
- Renders only when `count > 0`. Auto-hides (returns `null`) when `count` drops to 0.
- Arrow icon must be RTL-aware — use a CSS-flipped SVG (`transform: scaleX(-1)` under `dir="rtl"`), **never** a hardcoded `→` character (see UI_DESIGN_SYSTEM §5.3).
- Tapping anywhere on the banner calls `onTap`.

**Usage example:**
```tsx
<AttentionBanner
  count={urgentCount}
  onTap={() => navigate('/tasks/urgent')}
/>
```

---

### 2.10 BottomNavBar

Fixed bottom navigation bar. Always visible on all routes. See UI_DESIGN_SYSTEM §2.6 for the full visual spec.

**File:** `src/components/shared/BottomNavBar.tsx`

**Props interface:**
```typescript
interface BottomNavBarProps {
  urgentCount: number;  // badge count on Tasks tab (tasks + overdue bills)
}
```

**Behaviour:**
- Derives the active tab from `useLocation()` — no active-tab prop needed.
- Renders four tabs in order: Shopping, Tasks, Vouchers, Reservations (see UI_DESIGN_SYSTEM §2.6 tab table).
- Displays a count badge on the Tasks tab when `urgentCount > 0`.
- Tab order is visually reversed in RTL via `direction: rtl` CSS on the nav — **do not** reverse the DOM order (see UI_DESIGN_SYSTEM §5.3).
- Uses `pb-safe` for iOS safe-area bottom inset (see UI_DESIGN_SYSTEM §3.4).

**Usage example:**
```tsx
<BottomNavBar urgentCount={totalUrgentCount} />
```

---

### 2.11 Toast and ToastProvider

Global toast notification system. UI_DESIGN_SYSTEM §4.3 specifies visual style (variants, positioning, animation).

#### Toast.tsx

Single toast element. Not used directly — rendered by `ToastProvider`.

**File:** `src/components/shared/Toast.tsx`

**Props interface:**
```typescript
interface ToastProps {
  message: string;
  type: 'error' | 'success' | 'info';
  onDismiss: () => void;
}
```

#### ToastProvider.tsx + useToast

**File:** `src/components/shared/ToastProvider.tsx`

Wraps the app (mounted once in the root layout). Maintains a queue of active toasts. Exposes `useToast` hook for all components.

**`useToast` API:**
```typescript
interface ToastAPI {
  show: (message: string, type: 'error' | 'success' | 'info') => void;
}
export function useToast(): ToastAPI;
```

**Behaviour:**
- `success` and `info` toasts auto-dismiss after **4 seconds**.
- `error` toasts are **sticky** — user must dismiss manually.
- Queue support: multiple `show()` calls stack toasts (display one at a time or stacked — implementation choice, but order must be preserved).
- Slide-in animation from bottom; RTL: `translateX(-100%)` on enter, LTR: `translateX(100%)` (see UI_DESIGN_SYSTEM animation table).

**Usage example:**
```tsx
// In root layout:
<ToastProvider>
  <App />
</ToastProvider>

// In any component:
const { show } = useToast();
// ...
show(t('common:saveError'), 'error');
show(t('common:saved'), 'success');
```

---

### 2.12 SmartBubbles (Shopping Hub)

Suggestion bubbles shown when a Shopping Sub-Hub has an empty Master List. This component is **shopping-specific** — it lives in `components/hubs/shopping/`, not in `components/shared/`.

**File:** `src/components/hubs/shopping/SmartBubbles.tsx`

**Props interface:**
```typescript
interface SmartBubblesProps {
  contexts: string[];                        // matched context keys (e.g. ['grocery', 'pharma'])
  onSelectContext: (ctx: string) => void;    // inject starter pack for the selected context
  onDismiss: () => void;                     // user chose "Keep Empty" — hide bubbles
}
```

**Behaviour (per PRD §7.3):**
- Shown when the Master List is empty and at least one context matches the Sub-Hub name.
- One bubble per matched context + one "Keep Empty" bubble (dashed border style).
- **Smart Merge:** selecting multiple bubbles sequentially merges starter packs without duplicates — call `onSelectContext` for each selected context; deduplication is handled in the hook.
- **Keep Empty:** calls `onDismiss()`. Bubbles are hidden until the Sub-Hub is reopened with an empty list.
- **Bubble labels** must use translation keys from the `shopping` namespace (see §6 i18n note below):
  `shopping:context.grocery`, `shopping:context.camping`, `shopping:context.travelAbroad`, etc.

**Bubble style (CSS variables, not hardcoded hex):**
```
bg-[--color-bubble-bg]/10  border border-[--color-primary]  text-[--color-primary]  rounded-full
```
Keep Empty bubble adds `border-dashed`.

**i18n context keys (shopping namespace):**

| Context key | `shopping:context.*` key | EN label | HE translation needed |
|-------------|--------------------------|----------|-----------------------|
| `grocery` | `shopping:context.grocery` | Grocery | קניות |
| `camping` | `shopping:context.camping` | Camping | קמפינג |
| `travelAbroad` | `shopping:context.travelAbroad` | Travel Abroad | נסיעה לחו"ל |
| `pharma` | `shopping:context.pharma` | Pharma | בית מרקחת |
| `baby` | `shopping:context.baby` | Baby | תינוק |
| `cleaning` | `shopping:context.cleaning` | Cleaning | ניקיון |
| *(all 12 contexts from PRD §7.2)* | | | |

**i18n category keys (shopping namespace):**

List-Category names appear in Master List section headers, the re-categorize popup, and Smart Category nudge. All must go through `t()`:

| Category | `shopping:category.*` key |
|----------|--------------------------|
| Dairy | `shopping:category.dairy` |
| Meat | `shopping:category.meat` |
| Fish | `shopping:category.fish` |
| Pantry | `shopping:category.pantry` |
| Vegetables | `shopping:category.vegetables` |
| Fruit | `shopping:category.fruit` |
| Cleaning | `shopping:category.cleaning` |
| Pharma & Hygiene | `shopping:category.pharmaHygiene` |
| Documents & Money | `shopping:category.documentsAndMoney` |
| Other | `shopping:category.other` |

Hebrew translations for all 10 categories must be added to `locales/he/shopping.json`.

---

## 3. Hub-Specific vs Shared — The Decision Rule

> **A component is shared if two or more hubs need it, OR if it is part of the global chrome (nav, FAB, modals).**

| Condition | Goes in |
|-----------|---------|
| Used in ≥ 2 hubs | `components/shared/` |
| Used in exactly 1 hub | `components/hubs/<hub>/` |
| Renders hub-specific data shape (e.g. a `ShoppingItem` row) | `components/hubs/<hub>/` |
| Wraps global navigation, overlay, or utility chrome | `components/shared/` |
| Contains hub-specific business logic even if visually similar to another | `components/hubs/<hub>/` — do NOT abstract prematurely |

**Anti-pattern to avoid:** Do not create a generic `ItemRow` just because Shopping, Tasks, Vouchers, and Reservations all have rows. The data shapes and interactions are different enough to warrant separate components. Abstract only when two components end up with identical or near-identical code.

---

## 4. State Management Patterns

### 4.1 Edit Mode

Edit mode is scoped per hub page. It is **not** global app state.

**Pattern:** Each hub page manages `isEditMode: boolean` and `selectedIds: Set<string>` with `useState`. These are passed via `EditModeContext` to descendant components, avoiding prop drilling through `HubGrid` → `SubHubCard`.

```tsx
// contexts/EditModeContext.tsx
interface EditModeContextValue {
  isEditMode: boolean;
  selectedIds: Set<string>;
  toggleSelection: (id: string) => void;
  selectAll: (ids: string[]) => void;
  clearSelection: () => void;
  exitEditMode: () => void;
}
export const EditModeContext = createContext<EditModeContextValue | null>(null);
```

**Activation:** Long-press on a `SubHubCard` calls the hub page's `enterEditMode()`, which sets `isEditMode = true` and adds the long-pressed item to `selectedIds`.

**Deactivation:** `EditModeToolbar.onClose` or after a successful bulk delete calls `exitEditMode()`, which resets both `isEditMode` and `selectedIds`.

**Rule:** Do not lift edit mode state to a global context. If the user navigates away, edit mode is implicitly exited.

---

### 4.2 Modals

Modals receive data from their parent and return results via callbacks. They never fetch their own data.

**Pattern:**
```
Parent page owns: isModalOpen + selectedItem
  → passes isOpen + item to modal
  → modal calls onClose() or onSuccess(result)
  → parent updates its own state
```

**Rule:** A modal that needs to submit data accepts an `onSuccess` callback. It does **not** navigate, modify global state, or call a toast directly — it delegates all side effects to the parent via the callback.

**Anti-pattern:** Do not store `modalState` in a global context. Each page controls its own modals.

---

### 4.3 Supabase Queries in Hooks

All Supabase queries live inside custom hooks (see §5). Components never import `supabase` directly.

**Structural pattern inside a hook:**
```typescript
// hooks/useShoppingList.ts
export function useShoppingList(listId: string) {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Initial fetch
  useEffect(() => {
    fetchItems();
    // Subscribe to Realtime changes
    const channel = supabase
      .channel(`shopping_items:${listId}`)
      .on('postgres_changes', { ... }, handleChange)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [listId]);

  const addItem = async (text: string) => { /* ... */ };
  const deleteItem = async (id: string) => { /* ... */ };

  return { items, isLoading, error, addItem, deleteItem };
}
```

**Rules:**
- One hook per data domain (one per Sub-Hub type, one for household, one for auth, etc.).
- Hooks handle loading, error, and Realtime subscription teardown.
- Mutations (`addItem`, `deleteItem`, etc.) are async functions exposed from the hook. They update local state optimistically when appropriate and fall back on error.
- **No prop drilling:** Components at any depth call `useShoppingList(listId)` directly. React guarantees hooks with the same argument share no state — each call is independent.

---

### 4.4 No Prop Drilling Rule

If a piece of state is needed more than two component levels away from where it is owned, it must be moved to a context. Examples:

| State | Where owned | Where consumed | Pattern |
|-------|-------------|----------------|---------|
| Authenticated user | `AuthContext` | Any page/component | `useAuth()` hook consuming context |
| Edit mode + selection | Hub page (`useState`) | `SubHubCard` (grandchild) | `EditModeContext` |
| Current household | `HouseholdContext` | Hooks needing `household_id` | `useHousehold()` hook |
| Theme / language | `ThemeContext` | Any component needing CSS class | `useTheme()` hook |

---

## 5. Hook Patterns

One custom hook per data domain. Each hook is the **only** place that imports `supabase` for its domain.

### 5.1 Hook Inventory

| Hook | File | Data domain | Key exports |
|------|------|-------------|-------------|
| `useAuth` | `hooks/useAuth.ts` | Supabase auth session, user profile | `user`, `profile`, `signIn`, `signUp`, `signOut`, `isLoading` |
| `useHousehold` | `hooks/useHousehold.ts` | Household info, members, invite codes | `household`, `members`, `generateInvite`, `removeMember` |
| `useShoppingLists` | `hooks/useShoppingLists.ts` | Sub-Hub list for the Shopping hub | `lists`, `isLoading`, `createList`, `renameList`, `deleteList` |
| `useShoppingList` | `hooks/useShoppingList.ts` | Items in one Shopping Sub-Hub | `masterItems`, `activeItems`, `isLoading`, `addItem`, `toggleActive`, `deleteItem`, `bulkDelete`, `recategorize` |
| `useTaskLists` | `hooks/useTaskLists.ts` | Sub-Hub list for the Tasks hub | `lists`, `isLoading`, `createList`, `renameList`, `deleteList` |
| `useTasks` | `hooks/useTasks.ts` | Tasks in one Tasks Sub-Hub | `tasks`, `urgentTasks`, `isLoading`, `createTask`, `updateTask`, `deleteTask`, `bulkDelete` |
| `useVoucherLists` | `hooks/useVoucherLists.ts` | Sub-Hub list for the Vouchers hub | `lists`, `isLoading`, `createList`, `renameList`, `deleteList` |
| `useVouchers` | `hooks/useVouchers.ts` | Vouchers in one Sub-Hub | `vouchers`, `isLoading`, `createVoucher`, `updateVoucher`, `deleteVoucher` |
| `useReservationLists` | `hooks/useReservationLists.ts` | Sub-Hub list for Reservations hub | `lists`, `isLoading`, `createList`, `renameList`, `deleteList` |
| `useReservations` | `hooks/useReservations.ts` | Reservations in one Sub-Hub | `reservations`, `isLoading`, `createReservation`, `updateReservation`, `deleteReservation` |
| `useUrgentItems` | `hooks/useUrgentItems.ts` | Aggregate urgent tasks + overdue bills | `urgentTasks`, `overdueBills`, `totalCount`, `isLoading` | **Note:** `overdueBills` returns `[]` until Phase 1.1 ships. The hook must catch the `relation-not-found` Supabase error on the `bills` query and return an empty array — the `bills` table does not exist in Phase 1. |
| `useTheme` | `hooks/useTheme.ts` | Theme selection + `localStorage` persistence | `theme`, `setTheme` (`'burgundy' \| 'mint'`) |
| `useLanguage` | `hooks/useLanguage.ts` | Language selection, `<html dir>` sync | `language`, `setLanguage` (`'en' \| 'he'`) |

### 5.2 Hook Conventions

- **Return shape:** Always return a plain object `{ data, isLoading, error, ...mutations }`. Never return an array (ambiguous positional values).
- **Error handling:** Hooks catch Supabase errors and expose them as `error: Error | null`. Components display errors via toast (called in the component on `useEffect` watching `error`).
- **Realtime:** Hooks that need live updates subscribe to Supabase Realtime channels in `useEffect` and unsubscribe on cleanup.
- **`listId` / `subHubId` argument:** List-scoped hooks (e.g. `useShoppingList`) take the Sub-Hub ID as a required argument. They do not read it from router params themselves — the page passes it in.

---

## 6. i18n Usage Rules

### 6.1 How to Call `t()`

Always call `t()` with a namespace prefix:
```tsx
const { t } = useTranslation('shopping');
// Then:
t('addItem')           // ✅ key in the 'shopping' namespace
t('common:cancel')     // ✅ cross-namespace reference
```

Never:
```tsx
t('Add item')          // ❌ raw string as key
t('addItem')           // ❌ if you imported useTranslation('tasks') — wrong namespace
```

### 6.2 Namespace Imports

Each component (or hook) imports only the namespace(s) it needs:

```tsx
// Single namespace:
const { t } = useTranslation('shopping');

// Multiple namespaces (use sparingly — prefer passing translated strings as props):
const { t } = useTranslation(['shopping', 'common']);
```

Namespace assignment by component location:

| Location | Primary namespace |
|----------|-----------------|
| `pages/ShoppingPage.tsx` | `shopping` |
| `pages/TasksPage.tsx` | `tasks` |
| `pages/VouchersPage.tsx` | `vouchers` |
| `pages/ReservationsPage.tsx` | `reservations` |
| `pages/SettingsPage.tsx` | `settings` |
| `components/shared/*` | `common` |
| Auth components | `auth` |
| `pages/BillsPage.tsx` (Phase 1.1) | `bills` |

### 6.3 No Hardcoded Strings Rule

**Every user-facing string must go through `t()`.** This includes:
- Button labels
- Placeholder text
- Error messages
- Modal titles
- Empty state headings and body copy
- ARIA labels

Strings that are **not** user-facing (console logs, internal error codes, CSS class names) do not need translation.

### 6.4 RTL Considerations in Translations

- Hebrew translations live in `locales/he/<namespace>.json`.
- The language switch sets `<html dir="rtl" lang="he">` — all Tailwind logical properties flip automatically.
- Do not hard-code directional arrows (`→`) in translation values. Use a variable + component-level direction check instead.

---

## 7. Component Testing Patterns

Testing follows Vitest + React Testing Library (RTL). Tests live co-located with the component they test.

### 7.1 What to Test in Shared Components

| Component | Focus of tests |
|-----------|---------------|
| `BaseModal` | Renders when `isOpen=true`, hides when `isOpen=false`, calls `onClose` on overlay click and Escape key, focus trap active |
| `ConfirmDialog` | Confirm button calls `onConfirm`, Cancel calls `onClose`, loading state disables confirm |
| `EditModeToolbar` | Select-all/deselect-all callbacks fire, delete triggers confirm, close calls `onClose` |
| `SubHubCard` | Renders name + count, calls `onTap`, shows checkbox in edit mode (via context) |
| `HubGrid` | Renders children in a grid, correct column count class |
| `CreateItemFAB` | Renders, calls `onClick`, hidden when `isVisible=false` |

### 7.2 Test Setup

Wrap components that consume context with the appropriate provider:
```tsx
// test-utils/renderWithProviders.tsx
export function renderWithProviders(
  ui: React.ReactElement,
  {
    editMode = { isEditMode: false, selectedIds: new Set(), ... },
    locale = 'en',
  } = {}
) {
  return render(
    <I18nextProvider i18n={i18nForTests}>
      <EditModeContext.Provider value={editMode}>
        {ui}
      </EditModeContext.Provider>
    </I18nextProvider>
  );
}
```

Use this helper in all shared-component tests instead of bare `render()`.

### 7.3 Test File Structure

```
src/components/shared/
├── BaseModal.tsx
├── BaseModal.test.tsx      ← co-located
├── ConfirmDialog.tsx
├── ConfirmDialog.test.tsx
...
```

### 7.4 RTL Queries — Priority Order

Follow the RTL accessibility query priority:
1. `getByRole` — preferred for interactive elements
2. `getByLabelText` — inputs, form fields
3. `getByText` — visible text content
4. `getByTestId` — last resort; use `data-testid` sparingly

Never query by CSS class name or internal implementation details.

### 7.5 Async Mutations

For tests that trigger a mutation (save, delete):
```tsx
// Always wrap in act() and await for mutation effects
userEvent.click(screen.getByRole('button', { name: /save/i }));
await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(expect.objectContaining({ id: expect.any(String) })));
```

Mock Supabase at the module level (`vi.mock('../lib/supabase')`), not inside individual tests. This ensures all mutations in a test file use the same mock without side effects between tests.

### 7.6 i18n in Tests

Use a real (but minimal) `i18next` instance in tests — do not use key-echo mocks that return the key as the translation. This prevents false positives where a component renders a raw key instead of a translated string.

---

## 8. Phase 1.1 — Bills Hub (Placeholder)

> **Status:** Not yet built. This section provides stubs so the Phase 1.1 frontend agent has a starting point. Expand as Phase 1.1 design firms up.

### 8.1 Hook Stubs

| Hook | File | Data domain | Key exports (planned) |
|------|------|-------------|----------------------|
| `useBills` | `hooks/useBills.ts` | Bills in one Bills Sub-Hub | `bills`, `isLoading`, `error`, `markAsPaid` |

### 8.2 Component Stubs

| Component | File | Notes |
|-----------|------|-------|
| `BillCard` | `src/components/hubs/bills/BillCard.tsx` | Displays vendor name, amount, due date, status badge; "Pay Now" shortcut |

### 8.3 i18n Namespace — `bills`

**File:** `locales/en/bills.json` (stub — expand when Phase 1.1 design is finalised)

Expected keys:
```json
{
  "billCard": {
    "vendor": "Vendor",
    "amount": "Amount",
    "dueDate": "Due Date",
    "status": {
      "pending": "Pending",
      "paid": "Paid",
      "overdue": "Overdue"
    },
    "payNow": "Pay Now",
    "markAsPaid": "Mark as Paid",
    "history": "History"
  },
  "vendorApproval": {
    "title": "New Vendor Detected",
    "approve": "Approve",
    "reject": "Reject",
    "disclaimer": "Approving allows HomeHub to extract bill data from emails from this sender."
  },
  "errors": {
    "fetchFailed": "Couldn't load bills. Please try again.",
    "markPaidFailed": "Couldn't mark bill as paid. Please try again."
  }
}
```

Mirror all keys in `locales/he/bills.json`.

---

## Appendix — Glossary

| Term | Definition |
|------|------------|
| Sub-Hub | A named list instance within a Hub (e.g. "Supermarket") |
| Hub | A top-level domain (Shopping, Tasks, Vouchers, Reservations) |
| Edit mode | State where the grid enters bulk-select for delete/manage operations |
| Master List | Permanent item template for a Shopping Sub-Hub |
| Active List | Current-session working list derived from the Master List |
| Data domain hook | A custom hook owning all Supabase queries for one entity type |
| Namespace | An i18next JSON file scoping translations to one feature area |

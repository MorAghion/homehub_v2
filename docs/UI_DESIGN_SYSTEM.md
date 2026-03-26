# HomeHub UI Design System
**Status:** Living document | **Last updated:** 2026-03-26
**Supersedes:** any ad-hoc styling notes in PRD_v3.md

This document is the single source of truth for visual design decisions in HomeHub. All component implementation must reference tokens and rules defined here. Do **not** hardcode hex values, spacing numbers, or font sizes in components — reference the CSS variable or Tailwind token instead.

---

## 1. Design Tokens

### 1.1 Color Themes

Two themes are supported. The active theme class is applied to the `<html>` element (`theme-burgundy` or `theme-mint`). All components reference CSS variables only — never raw hex values.

**Theme persistence:** `localStorage` key `homehub-theme`. Default: `theme-burgundy`.

#### Theme A — Burgundy (Default)

```css
:root,
.theme-burgundy {
  --color-primary:     #630606;  /* Deep Burgundy — headers, buttons, icons, active borders */
  --color-background:  #F5F2E7;  /* Cream/Taupe — app background, page surfaces */
  --color-surface:     #FFFFFF;  /* Cards, modals, inputs */
  --color-muted:       #8E806A;  /* Secondary text, dividers, placeholders */
  --color-bubble-bg:   #630606;  /* Used at 10% opacity: rgba(99, 6, 6, 0.10) */
  --color-error:       #991B1B;  /* Error states */
  --color-success:     #065F46;  /* Success states */
}
```

#### Theme B — Mint

```css
.theme-mint {
  --color-primary:     #1A6B5A;  /* Deep Mint — headers, buttons, icons, active borders */
  --color-background:  #F0F7F5;  /* Soft Mint White — app background, page surfaces */
  --color-surface:     #FFFFFF;  /* Cards, modals, inputs */
  --color-muted:       #6B8C86;  /* Secondary text, dividers, placeholders */
  --color-bubble-bg:   #1A6B5A;  /* Used at 10% opacity: rgba(26, 107, 90, 0.10) */
  --color-error:       #991B1B;  /* Error states — same across themes */
  --color-success:     #065F46;  /* Success states — same across themes */
}
```

#### Semantic Color Aliases

These do not change with theme but are defined as variables to allow future updates in one place.

```css
:root {
  --color-urgency-low:      #6B7280;  /* gray-500 */
  --color-urgency-medium:   #D97706;  /* amber-600 */
  --color-urgency-high:     #EA580C;  /* orange-600 */
  --color-urgency-critical: #DC2626;  /* red-600 */

  --color-overlay:          rgba(0, 0, 0, 0.50);  /* Modal backdrop */
  --color-skeleton:         rgba(0, 0, 0, 0.08);  /* Skeleton shimmer base */
  --color-skeleton-shine:   rgba(255, 255, 255, 0.60);  /* Skeleton shimmer highlight */
}
```

---

### 1.2 Spacing Scale

HomeHub uses an 8-point grid. All spacing (padding, margin, gap) must be a multiple of 4px. Tailwind's default spacing scale maps cleanly to this system.

| Token | px | Tailwind |
|-------|----|----------|
| `--space-1` | 4px | `p-1` / `m-1` |
| `--space-2` | 8px | `p-2` / `m-2` |
| `--space-3` | 12px | `p-3` / `m-3` |
| `--space-4` | 16px | `p-4` / `m-4` |
| `--space-5` | 20px | `p-5` / `m-5` |
| `--space-6` | 24px | `p-6` / `m-6` |
| `--space-8` | 32px | `p-8` / `m-8` |
| `--space-10` | 40px | `p-10` / `m-10` |
| `--space-12` | 48px | `p-12` / `m-12` |
| `--space-16` | 64px | `p-16` / `m-16` |

**Page content padding:** `px-4` (16px) on mobile, `px-6` (24px) on `sm:` and above.

---

### 1.3 Typography Scale

**Font stack:** System UI stack — no custom fonts in Phase 1.
```css
font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
```

| Role | Size | Weight | Line Height | Tailwind |
|------|------|--------|-------------|---------|
| Page title | 24px / 1.5rem | 700 | 1.25 | `text-2xl font-bold leading-tight` |
| Section title | 20px / 1.25rem | 600 | 1.3 | `text-xl font-semibold leading-snug` |
| Card title | 16px / 1rem | 600 | 1.4 | `text-base font-semibold leading-snug` |
| Body | 16px / 1rem | 400 | 1.5 | `text-base font-normal leading-normal` |
| Body small | 14px / 0.875rem | 400 | 1.5 | `text-sm leading-normal` |
| Label / caption | 12px / 0.75rem | 500 | 1.4 | `text-xs font-medium` |
| Badge | 11px / 0.6875rem | 700 | 1 | `text-[11px] font-bold` |
| Button (default) | 16px / 1rem | 600 | 1 | `text-base font-semibold` |
| Button (small) | 14px / 0.875rem | 600 | 1 | `text-sm font-semibold` |

**Hebrew note:** Line heights should increase by 0.1 for Hebrew (`dir="rtl"`) to accommodate the script's descenders. Apply via a CSS rule scoped to `[dir="rtl"]`.

---

### 1.4 Border Radius

```css
:root {
  --radius-sm:   4px;   /* Tailwind: rounded-sm — badges, chips, tags */
  --radius-md:   8px;   /* Tailwind: rounded-md — inputs, small buttons */
  --radius-lg:   12px;  /* Tailwind: rounded-xl — cards, modals */
  --radius-full: 9999px; /* Tailwind: rounded-full — count badges, avatar circles */
}
```

| Component | Radius |
|-----------|--------|
| Hub card | `rounded-xl` (12px) |
| Sub-hub card | `rounded-xl` (12px) |
| Item card / row | `rounded-md` (8px) |
| Modal | `rounded-xl` (12px) top, `rounded-none` bottom on mobile sheet |
| Input | `rounded-md` (8px) |
| Button (default) | `rounded-md` (8px) |
| Button (pill / ghost) | `rounded-full` |
| Badge (count) | `rounded-full` |
| Badge (text) | `rounded-sm` (4px) |
| Bubble | `rounded-full` |
| Toast | `rounded-lg` (8px) |

---

### 1.5 Shadow Levels

```css
:root {
  --shadow-sm:  0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md:  0 4px 6px -1px rgba(0, 0, 0, 0.10), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  --shadow-lg:  0 10px 15px -3px rgba(0, 0, 0, 0.10), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  --shadow-xl:  0 20px 25px -5px rgba(0, 0, 0, 0.10), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}
```

| Use case | Shadow level |
|----------|-------------|
| Card (resting) | `shadow-sm` |
| Card (hover / pressed) | `shadow-md` |
| Modal | `shadow-xl` |
| Toast | `shadow-lg` |
| Bottom nav | `shadow-lg` (upward: `0 -4px 12px rgba(0,0,0,0.08)`) |
| Input (focus ring) | Not a shadow — use `ring-2 ring-[--color-primary]` |

---

### 1.6 Z-Index Scale

```css
:root {
  --z-base:       0;
  --z-raised:     10;   /* Elevated cards, tooltips inline */
  --z-sticky:     20;   /* Sticky headers, attention banner */
  --z-bottom-nav: 30;   /* Bottom navigation bar */
  --z-toast:      40;   /* Toast notifications */
  --z-overlay:    50;   /* Modal backdrop */
  --z-modal:      60;   /* Modal content */
  --z-popover:    70;   /* Dropdowns, date pickers */
}
```

---

## 2. Shared Components Spec

### 2.1 Button

Buttons come in 4 variants × 2 sizes × 4 states.

#### Variants

| Variant | Default bg | Text | Border | Notes |
|---------|-----------|------|--------|-------|
| `primary` | `bg-[--color-primary]` | `text-white` | none | Main CTAs |
| `secondary` | `bg-[--color-surface]` | `text-[--color-primary]` | `border border-[--color-primary]` | Secondary actions |
| `ghost` | `bg-transparent` | `text-[--color-primary]` | none | Tertiary / inline actions |
| `danger` | `bg-[--color-error]` | `text-white` | none | Destructive actions only |

#### Sizes

| Size | Padding | Height | Font |
|------|---------|--------|------|
| `md` (default) | `px-4 py-2.5` | `h-11` (44px — touch target) | `text-base font-semibold` |
| `sm` | `px-3 py-1.5` | `h-9` (36px) | `text-sm font-semibold` |

Minimum touch target is always 44×44px. Use padding or `min-w-[44px] min-h-[44px]` for icon-only buttons.

#### States

| State | Visual treatment |
|-------|-----------------|
| Default | Base variant styles |
| Hover | `hover:opacity-90` (primary/danger), `hover:bg-[--color-primary]/5` (secondary/ghost) |
| Active / Pressed | `active:scale-95 transition-transform duration-150` |
| Loading | Replace label with spinner (16px white spinner for primary/danger, primary-colored for others). Disable click. Show `cursor-not-allowed`. |
| Disabled | `opacity-50 cursor-not-allowed pointer-events-none` |

**Loading spinner:** 16px SVG circle stroke animation, white for filled buttons, primary color for outlined/ghost. Do not change button size when loading.

#### Tailwind reference (primary / md)

```
rounded-md px-4 py-2.5 h-11 min-w-[44px]
bg-[--color-primary] text-white
text-base font-semibold
transition-all duration-300
hover:opacity-90
active:scale-95
disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none
```

---

### 2.2 Card

Three card types share the same base styles with different content layouts.

#### Base card styles

```
bg-[--color-surface]
rounded-xl
shadow-sm hover:shadow-md
transition-shadow duration-300
overflow-hidden
```

#### Hub Card

Displayed in the main hub grid (Shopping, Tasks, Vouchers, Reservations pages).

```
w-full
aspect-[4/3]                 ← keeps consistent proportions across breakpoints
p-4
flex flex-col justify-between
cursor-pointer
```

Anatomy:
- **Icon area** (top): Hub icon (32px) in `text-[--color-primary]`
- **Title** (bottom): Hub name in `text-base font-semibold`
- **Badge** (top-right, optional): count badge for urgent items

#### Sub-Hub Card

Grid of Sub-Hub entries within a Hub.

```
w-full
p-4
flex flex-col gap-2
cursor-pointer
min-h-[80px]
```

Anatomy:
- **Title** (primary text): Sub-hub name, `text-base font-semibold`
- **Count** (secondary text): e.g., "12 items", `text-sm text-[--color-muted]`
- **Context chip** (optional): small badge showing inferred context

#### Item Card / Row

Used for list items (shopping items, tasks, vouchers, reservations).

```
w-full
px-4 py-3
flex items-center gap-3
rounded-md
border-b border-[--color-muted]/20
```

Anatomy:
- **Leading area**: checkbox or icon (24px), `shrink-0`
- **Content area**: title + optional subtitle, `flex-1 min-w-0`
- **Trailing area**: action icons, badges, urgency indicator, `shrink-0`

Item title uses `truncate` to prevent overflow. Subtitle uses `text-sm text-[--color-muted] truncate`.

---

### 2.3 Modal

Modals are used for create/edit forms and detail views.

#### Structure

```
<!-- Overlay -->
<div class="fixed inset-0 bg-black/50 z-[--z-overlay] flex items-end sm:items-center justify-center">

  <!-- Modal panel -->
  <div class="
    bg-[--color-surface]
    w-full sm:max-w-lg sm:mx-4
    rounded-t-xl sm:rounded-xl        ← bottom sheet on mobile, centered card on desktop
    shadow-xl
    max-h-[90dvh]                     ← dvh avoids iOS bottom bar overlap
    flex flex-col
    z-[--z-modal]
  ">

    <!-- Header -->
    <div class="flex items-center justify-between px-4 py-4 border-b border-[--color-muted]/20 shrink-0">
      <h2 class="text-xl font-semibold">Modal Title</h2>
      <button aria-label="Close" class="...">✕</button>
    </div>

    <!-- Scrollable body -->
    <div class="overflow-y-auto flex-1 px-4 py-4">
      <!-- Content -->
    </div>

    <!-- Footer (sticky actions) -->
    <div class="flex gap-3 px-4 py-4 border-t border-[--color-muted]/20 shrink-0">
      <Button variant="secondary">Cancel</Button>
      <Button variant="primary" class="flex-1">Save</Button>
    </div>

  </div>
</div>
```

#### Overlay / close behavior

- Clicking the **overlay** closes the modal (calls `onClose`)
- Pressing **Escape** closes the modal
- The **✕ close button** always present in header
- Focus is trapped inside modal while open (`focus-trap`)
- Modal content does NOT close on scroll
- `aria-modal="true"`, `role="dialog"`, `aria-labelledby` on the header title

#### Animation

```
<!-- Overlay: fade in/out -->
transition-opacity duration-300

<!-- Panel: slide up on mobile, scale+fade on desktop -->
sm: transition-[opacity,transform] duration-300 origin-bottom
mobile: translate-y from 100% → 0
```

---

### 2.4 Input

#### Text Input

```
w-full
px-3 py-2.5
h-11
bg-[--color-surface]
border border-[--color-muted]/40
rounded-md
text-base
placeholder:text-[--color-muted]
transition-all duration-300
focus:outline-none focus:ring-2 focus:ring-[--color-primary] focus:border-transparent
disabled:opacity-50 disabled:cursor-not-allowed
```

#### Search Input

Extends text input with a leading search icon (16px, `text-[--color-muted]`) absolutely positioned at `start-3` (logical property). Input has `ps-9` to avoid text overlap.

```
<!-- wrapper: relative -->
<div class="relative">
  <SearchIcon class="absolute start-3 top-1/2 -translate-y-1/2 text-[--color-muted] w-4 h-4" />
  <input type="search" class="... ps-9" />
</div>
```

#### Date Input

Same as text input, `type="date"`. On iOS, tapping opens the native date picker. Ensure `min` attribute is set where applicable (e.g., reservation date cannot be in the past).

#### Select

```
w-full
px-3 py-2.5
h-11
bg-[--color-surface]
border border-[--color-muted]/40
rounded-md
text-base
appearance-none                  ← remove native arrow
background-image: chevron SVG    ← custom arrow via bg-image or trailing icon
pe-9                             ← logical padding for arrow icon
```

#### Input States

| State | Treatment |
|-------|-----------|
| Default | `border-[--color-muted]/40` |
| Focus | `ring-2 ring-[--color-primary] border-transparent` |
| Error | `border-[--color-error] ring-2 ring-[--color-error]/20` |
| Disabled | `opacity-50 cursor-not-allowed bg-[--color-muted]/5` |
| Read-only | `bg-[--color-muted]/5 cursor-default` |

Error message displayed below the input in `text-sm text-[--color-error]` with `mt-1`.

---

### 2.5 Badge

#### Urgency Badge

Text labels indicating task urgency level.

| Level | Color | Tailwind bg | Tailwind text |
|-------|-------|-------------|---------------|
| `low` | Gray | `bg-gray-100` | `text-gray-600` |
| `medium` | Amber | `bg-amber-100` | `text-amber-700` |
| `high` | Orange | `bg-orange-100` | `text-orange-700` |
| `critical` | Red | `bg-red-100` | `text-red-700` |

Base badge styles:
```
inline-flex items-center
px-2 py-0.5
rounded-sm
text-xs font-medium
```

#### Count Badge

Used on the Tasks tab in the bottom nav and on Hub Cards.

```
inline-flex items-center justify-center
min-w-[20px] h-5
px-1.5
rounded-full
bg-[--color-error]
text-white
text-[11px] font-bold
leading-none
```

Minimum width `min-w-[20px]` ensures the circle is not squeezed on single-digit numbers. Render nothing (not an empty badge) when count is 0.

---

### 2.6 Bottom Navigation

Fixed to the bottom of the viewport. Always visible on all routes.

#### Structure

```
<nav class="
  fixed bottom-0 inset-x-0
  z-[--z-bottom-nav]
  bg-[--color-surface]
  border-t border-[--color-muted]/20
  shadow-[0_-4px_12px_rgba(0,0,0,0.08)]
  pb-safe                          ← iOS safe area inset (env(safe-area-inset-bottom))
">
  <div class="flex h-16 items-center">
    <!-- 4 × NavTab -->
  </div>
</nav>
```

`pb-safe` resolves to `padding-bottom: env(safe-area-inset-bottom)`. Define it in the global CSS:
```css
.pb-safe { padding-bottom: env(safe-area-inset-bottom, 0px); }
```

#### Tab Item

```
<button class="
  flex-1 flex flex-col items-center justify-center
  gap-1
  min-h-[44px]
  transition-colors duration-300
  [active]: text-[--color-primary]
  [inactive]: text-[--color-muted]
">
  <!-- Icon: 24px, relative to hold badge -->
  <div class="relative">
    <TabIcon class="w-6 h-6" />
    <!-- Count badge — Tasks tab only, when count > 0 -->
    <span class="absolute -top-1 -end-1 count-badge">3</span>
  </div>
  <!-- Label -->
  <span class="text-[10px] font-medium leading-none">Shopping</span>
</button>
```

#### Tabs

| Index | Label (EN) | Label (HE) | Icon | Badge |
|-------|------------|------------|------|-------|
| 0 | Shopping | קניות | ShoppingCart | — |
| 1 | Tasks | משימות | CheckSquare | Urgent count (tasks + overdue bills) |
| 2 | Vouchers | שוברים | Tag | — |
| 3 | Reservations | הזמנות | Calendar | — |

#### Active state

Active tab: `text-[--color-primary]`, icon filled or thicker stroke.
Inactive tab: `text-[--color-muted]`, icon outlined.

No underline or bar indicator — color change only.

---

## 3. Layout Rules

### 3.1 Breakpoints (Mobile-First)

HomeHub is a mobile-first PWA. All base styles are for mobile. Breakpoint overrides add tablet/desktop refinements.

| Breakpoint | Min width | Tailwind prefix | Target device |
|------------|-----------|-----------------|---------------|
| (base) | 0px | — | Mobile portrait |
| `sm` | 640px | `sm:` | Mobile landscape / small tablet |
| `md` | 768px | `md:` | Tablet |
| `lg` | 1024px | `lg:` | Desktop |

The app is primarily used on mobile. Tablet and desktop layouts provide a comfortable reading experience but are not the primary design target.

### 3.2 Hub Grid

The grid of Sub-Hub cards inside each Hub.

| Breakpoint | Columns | Gap |
|------------|---------|-----|
| (base) | 2 | `gap-3` (12px) |
| `sm` | 3 | `gap-4` (16px) |
| `md` | 3 | `gap-4` (16px) |
| `lg` | 4 | `gap-5` (20px) |

Tailwind: `grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 lg:gap-5`

### 3.3 Page Layout

```
<div class="
  min-h-[100dvh]
  bg-[--color-background]
  pb-20                       ← space above bottom nav (h-16 + some breathing room)
">

  <!-- Page header (sticky) -->
  <header class="
    sticky top-0
    z-[--z-sticky]
    bg-[--color-background]/95
    backdrop-blur-sm
    px-4 pt-4 pb-3
    border-b border-[--color-muted]/15
  ">
    <h1 class="text-2xl font-bold text-[--color-primary]">Page Title</h1>
  </header>

  <!-- Page content -->
  <main class="px-4 sm:px-6 py-4">
    <!-- Content -->
  </main>

</div>
```

### 3.4 Bottom Nav Height and Safe Area Insets

| Property | Value |
|----------|-------|
| Bottom nav bar height | `h-16` (64px) |
| iOS safe area bottom padding | `env(safe-area-inset-bottom)` |
| Effective bottom nav height (iPhone with home indicator) | 64px + ~34px = ~98px |
| Page bottom padding | `pb-20` minimum (80px) — or `pb-[calc(64px+env(safe-area-inset-bottom)+16px)]` for precision |

**PWA viewport meta tag** (required for correct safe area behavior):
```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
```

### 3.5 Page Padding / Margin Scale

| Location | Value |
|----------|-------|
| Horizontal page padding (mobile) | `px-4` (16px) |
| Horizontal page padding (sm+) | `sm:px-6` (24px) |
| Section gap (between page sections) | `gap-6` or `space-y-6` (24px) |
| Card grid gap (mobile) | `gap-3` (12px) |
| Card grid gap (sm+) | `gap-4` (16px) |
| List item vertical padding | `py-3` (12px top + bottom) |
| Form field gap | `gap-4` (16px) |
| Modal body padding | `px-4 py-4` |

---

## 4. Interaction Patterns

### 4.1 Loading States

Two loading patterns: **skeleton** and **spinner**. Each has a distinct use case.

#### Skeleton

Used when: **replacing a known content area** that has not yet loaded (page content, lists, card grids). The skeleton mirrors the shape of the real content so the user knows what is coming.

```
bg-[--color-skeleton]
rounded-[inherit]
animate-pulse
```

Skeleton rules:
- Match the approximate dimensions of the content it replaces
- Use the same border radius as the target element
- **Do not** use a spinner when a skeleton is appropriate
- Fade in: no entrance animation. Fade out: `transition-opacity duration-300` as real content replaces it

**Per-hub skeleton layouts:**
- Hub grid: 4–6 skeleton cards in a grid, same aspect ratio as hub cards
- Sub-hub list: 3–5 skeleton rows, ~80px tall each
- Item list: 5–8 skeleton rows, ~56px tall each with leading circle (checkbox/avatar) and two lines

#### Spinner

Used when: **an action is in progress** (form submission, button loading state, pull-to-refresh). The spinner represents activity without implying a particular layout.

- Size: 20px for button-internal spinners, 32px for page-level loading
- Color: white on filled buttons, `text-[--color-primary]` otherwise
- Full-page spinner (e.g., auth redirect): centered 32px spinner on `bg-[--color-background]`
- Do not use a spinner for initial page/list loads — use skeleton instead

**Decision guide:**

| Situation | Use |
|-----------|-----|
| Page first load | Skeleton |
| List / grid first load | Skeleton |
| Button action (submit, save) | Spinner inside button |
| Pull-to-refresh | Spinner at top |
| Polling / background refresh | No indicator (silent) |
| Route transition | Skeleton of destination page |

---

### 4.2 Empty States

Shown when a hub, sub-hub, or list has no items yet. Each has a unique message and an illustration placeholder (real illustrations to be designed; use a placeholder box in Phase 1).

| Context | Heading | Body text | CTA |
|---------|---------|-----------|-----|
| Hub (no sub-hubs) | "Nothing here yet" | "Create your first list to get started." | "Create List" (primary button) |
| Shopping sub-hub (no master items) | "Your list is empty" | "Add items or choose a starter pack." | Smart Bubbles (see PRD §7.3) |
| Active list (no items toggled) | "Ready to shop?" | "Tap items from your master list to add them here." | — |
| Tasks sub-hub (no tasks) | "All clear!" | "No tasks in this list." | "Add Task" (primary button) |
| Urgent Tasks (nothing urgent) | "No urgent items" | "You're all caught up." | — |
| Vouchers sub-hub (no vouchers) | "No vouchers yet" | "Add a voucher to keep track of gift cards and credits." | "Add Voucher" (primary button) |
| Reservations sub-hub (no reservations) | "Nothing booked" | "Save your upcoming reservations here." | "Add Reservation" (primary button) |

**Empty state layout:**

```
flex flex-col items-center justify-center
py-16 px-4
gap-4
text-center
```

Illustration placeholder: `w-24 h-24 rounded-full bg-[--color-muted]/10` (gray circle).
Heading: `text-xl font-semibold text-[--color-primary]`
Body: `text-base text-[--color-muted]`
CTA: primary Button, `mt-2`

---

### 4.3 Error States

Two error presentation modes: **toast** (transient) and **inline** (persistent until resolved).

#### Toast (Transient Errors)

Used for: network errors, action failures (save failed, delete failed), session warnings.

```
fixed bottom-[calc(64px+env(safe-area-inset-bottom)+8px)] inset-x-4
z-[--z-toast]
```

Structure:
```
bg-[--color-surface]
rounded-lg
shadow-lg
px-4 py-3
flex items-start gap-3
max-w-sm mx-auto
```

Anatomy:
- **Icon** (20px): error icon in `text-[--color-error]` for errors, checkmark for success, info icon for info
- **Message** (`text-sm`): brief description of what happened
- **Dismiss** (optional): `✕` button in top-right corner

Auto-dismiss: 4 seconds for success toasts. Error toasts stay until dismissed.

**Toast variants:**

| Type | Icon color | Left border |
|------|-----------|-------------|
| error | `text-[--color-error]` | `border-s-4 border-[--color-error]` |
| success | `text-[--color-success]` | `border-s-4 border-[--color-success]` |
| info | `text-[--color-primary]` | `border-s-4 border-[--color-primary]` |

Note: `border-s-4` is a logical property — automatically flips to the right in RTL.

#### Inline Errors

Used for: form field validation, empty required fields, invalid input.

- Display below the relevant input field
- `text-sm text-[--color-error] mt-1`
- Input field gets error state styles (red border + ring)
- Never replace input placeholder with error text — keep them separate

#### Error format

```
[What happened]: [Brief reason if helpful]
```

Examples:
- "Couldn't save item. Please try again."
- "Name is required."
- "Invite code has expired."

Avoid technical error codes in user-facing messages.

---

### 4.4 Success Feedback

| Action | Feedback type | Duration |
|--------|-------------|---------|
| Item added to list | Green toast | 2s auto-dismiss |
| Task completed | Check animation on the item row | — |
| Form saved | Green toast "Saved" | 2s auto-dismiss |
| Item deleted | Brief fade-out animation | — |
| Invite code copied | "Copied!" label replacing copy icon | 2s then revert |
| Theme changed | Instant — no toast needed | — |
| Language changed | Instant — no toast needed | — |

**Copy confirmation pattern:** The copy icon button label changes to "Copied!" for 2 seconds, then reverts. No toast required for clipboard copies.

---

## 5. RTL Rules

### 5.1 Core Principle

HomeHub uses Tailwind CSS 4+ logical properties exclusively. No directional classes (`ml-`, `mr-`, `pl-`, `pr-`, `left-`, `right-`, `border-l-`, `border-r-`) are permitted in any component. All spacing, positioning, and border properties must use their logical equivalents.

### 5.2 Logical Property Equivalents

| LTR class (FORBIDDEN) | Logical equivalent (USE THIS) |
|-----------------------|-------------------------------|
| `ml-*` | `ms-*` (margin-inline-start) |
| `mr-*` | `me-*` (margin-inline-end) |
| `pl-*` | `ps-*` (padding-inline-start) |
| `pr-*` | `pe-*` (padding-inline-end) |
| `left-*` (positioning) | `start-*` |
| `right-*` (positioning) | `end-*` |
| `border-l-*` | `border-s-*` |
| `border-r-*` | `border-e-*` |
| `rounded-l-*` | `rounded-s-*` |
| `rounded-r-*` | `rounded-e-*` |
| `text-left` | `text-start` |
| `text-right` | `text-end` |
| `float-left` | `float-start` |
| `float-right` | `float-end` |
| `inset-x-*` + `left-*` manually | use `start-*` / `end-*` for sides |

**Exception:** `inset-x-*` (full horizontal) and `inset-y-*` (full vertical) are logical and OK to use.

### 5.3 Components Needing RTL-Specific Treatment

| Component | RTL concern | Solution |
|-----------|-------------|---------|
| BottomNav | Tab order reversal | Do NOT reverse tab order in DOM — CSS `direction: rtl` on the nav handles visual flip |
| Toast | Slide-in direction | `translate-x` animation must use `translateX(100%)` in LTR and `translateX(-100%)` in RTL. Use `dir`-aware animation class or check `document.dir` |
| Badge on nav tab | Position (top-right in LTR, top-left in RTL) | Use `end-0` instead of `right-0` |
| Attention Banner | Arrow `→` | Replace with `→` / `←` based on `dir`, or use a CSS-flipped icon |
| Input trailing/leading icons | Position | Use `start-*` for leading, `end-*` for trailing |
| Modal close button (top-right) | Should be top-end | `end-4 top-4` (logical) |
| Flashlight glow animation | Directional shadow | Use symmetric glow (`ring-*`) rather than directional shadows |
| Smart Bubbles | Layout direction | `flex-wrap` is bidirectional — no change needed |
| Category tags / chips | Left border accent | Use `border-s-*` |
| Skeleton shimmer gradient | LTR `to-right` | Use `to-end-*` or apply `[dir=rtl]:bg-gradient-to-l` |

### 5.4 Language Switching

Switching to Hebrew (`he`) must:
1. Set `<html dir="rtl" lang="he">`
2. Logical properties automatically flip — no component-level changes needed beyond the exceptions listed above
3. Font line-height increase: add `[dir=rtl] { line-height: 1.6; }` to global CSS

Switching back to English (`en`):
1. Set `<html dir="ltr" lang="en">`
2. All logical properties revert automatically

---

## 6. Animation Rules

### 6.1 Core Principle

All animations use `transition-duration: 300ms` unless specified otherwise. No jarring jumps. Animations should reinforce spatial relationships (slide in from direction of origin) and confirm user actions (scale on press).

### 6.2 Transition Properties

```css
/* Default transition — apply via Tailwind `transition-all duration-300` */
transition-property: color, background-color, border-color, opacity, transform, box-shadow;
transition-duration: 300ms;
transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);  /* Tailwind ease-in-out */
```

Use `transition-all duration-300` for most interactive elements (buttons, cards, inputs, nav tabs).

Use `transition-[property] duration-300` when animating only specific properties for performance.

### 6.3 Animation Inventory

| Element | Animation | Trigger | Duration |
|---------|-----------|---------|---------|
| Button press | `scale-95` | `active:` state | 150ms |
| Card hover | `shadow-sm → shadow-md` | `hover:` state | 300ms |
| Modal open | slide up (mobile) / scale+fade (desktop) | mount | 300ms |
| Modal close | reverse of open | unmount | 200ms |
| Toast appear | slide up from bottom | mount | 300ms |
| Toast dismiss | fade + slide down | auto-dismiss or close | 200ms |
| Nav tab change | color transition | route change | 300ms |
| Skeleton pulse | `animate-pulse` (Tailwind built-in) | loading | continuous |
| Flashlight glow | `ring-4 ring-[--color-primary]/60 animate-pulse` | Urgent Task deep-link | 3 seconds, then off |
| Checked item sink | `opacity-60 order-last` with `transition-all` | checkbox toggle | 300ms |
| Theme switch | all CSS variable consumers | class change on `<html>` | 300ms (via `transition-all duration-300` on body) |
| Route transition | fade out / fade in | navigation | 200ms each |
| Delete row | `opacity-0 max-h-0` collapse | delete action | 300ms |
| Bubble appear | `scale-0 → scale-100 opacity-0 → opacity-100` | first empty state render | 300ms, staggered 50ms per bubble |

### 6.4 Reduced Motion

Respect the user's system preference for reduced motion. Wrap all non-essential animations.

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

**Exceptions — always animate even with reduced-motion:**
- Loading spinners (users need to know loading is in progress)
- The Flashlight glow (functional feedback, not decorative)

**Tailwind approach:** use `motion-safe:` and `motion-reduce:` prefixes on individual classes:
```
motion-safe:transition-all motion-safe:duration-300
motion-reduce:transition-none
```

Apply `motion-reduce:transition-none motion-reduce:animate-none` on decorative animation wrappers.

---

## 7. Implementation Notes

### 7.1 CSS Variable Setup

Define all CSS variables in `index.css` or a dedicated `tokens.css` file imported at the root:

```css
/* tokens.css */
:root,
.theme-burgundy { /* ... */ }
.theme-mint { /* ... */ }
```

The `<html>` element's class drives the active theme. A `useTheme()` hook reads from `localStorage` and applies the class on mount and on toggle.

### 7.2 Tailwind Config Extensions

Extend `tailwind.config.ts` to surface CSS variables as Tailwind color tokens:

```ts
theme: {
  extend: {
    colors: {
      primary: 'var(--color-primary)',
      background: 'var(--color-background)',
      surface: 'var(--color-surface)',
      muted: 'var(--color-muted)',
      error: 'var(--color-error)',
      success: 'var(--color-success)',
    },
  },
},
```

This allows using `bg-primary`, `text-muted`, etc. in class names rather than `bg-[--color-primary]`. Either approach is acceptable — choose one and be consistent within the codebase.

### 7.3 Component Library Scope

HomeHub does **not** use an external component library (no shadcn, no MUI, no Radix). All components are hand-built following this spec. This keeps the bundle lean and ensures full RTL + theme compatibility.

Exception: Headless utility libraries (e.g., `@headlessui/react` for accessible modal focus trapping) are acceptable if they add accessibility value without styling constraints.

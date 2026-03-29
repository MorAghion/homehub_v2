/**
 * shopping — business logic for the Shopping Hub.
 *
 * PRD §7: Shopping Hub
 * - §7.3: Smart Bubbles (empty Master List → bubble injection)
 * - §7.4: Master List (categories, auto-categorize, duplicate prevention, bulk delete)
 * - §7.5: Active List (checked items sink to bottom per category)
 * - §7.7: Smart Category Learning (Level 1 tag nudge, Level 2 re-categorize)
 *
 * Pure business logic — no Supabase, no React, no side-effects.
 */

import type { ShoppingItem } from '../types/shopping'
import type { ListCategory } from './autoCategorize'
import { ALL_CATEGORIES } from './autoCategorize'

// ─── Category Display Order ───────────────────────────────────────────────────

/** Display order for category sections in Master and Active lists. */
export const CATEGORY_ORDER: ListCategory[] = [
  'dairy',
  'meat',
  'fish',
  'pantry',
  'vegetables',
  'fruit',
  'cleaning',
  'pharma_hygiene',
  'documents_money',
  'other',
]

// Guard: all 10 categories must be in the display order.
if (process.env.NODE_ENV !== 'production') {
  for (const cat of ALL_CATEGORIES) {
    if (!CATEGORY_ORDER.includes(cat)) {
      console.warn(`Shopping: CATEGORY_ORDER missing category "${cat}"`)
    }
  }
}

// ─── Grouping ─────────────────────────────────────────────────────────────────

/** Groups items by category, returning only non-empty groups in display order. */
export function groupByCategory(
  items: readonly ShoppingItem[],
): Array<{ category: ListCategory; items: ShoppingItem[] }> {
  const map = new Map<ListCategory, ShoppingItem[]>()
  for (const item of items) {
    const existing = map.get(item.category) ?? []
    existing.push(item)
    map.set(item.category, existing)
  }

  return CATEGORY_ORDER
    .filter((cat) => map.has(cat))
    .map((cat) => ({ category: cat, items: map.get(cat)! }))
}

// ─── Active List Sort ─────────────────────────────────────────────────────────

/**
 * Sorts items for the Active List:
 * - Unchecked items first (active, top of category)
 * - Checked items last (found/in cart, bottom of category)
 * - Within each group, preserves original creation order.
 */
export function sortItemsForActiveList(items: readonly ShoppingItem[]): ShoppingItem[] {
  return [...items].sort((a, b) => {
    if (a.checked === b.checked) {
      return a.created_at < b.created_at ? -1 : 1
    }
    return a.checked ? 1 : -1
  })
}

/**
 * Groups items for the Active List view:
 * - Each category section has unchecked items first, checked items at bottom.
 * - Returns only non-empty category groups.
 */
export function groupForActiveList(
  items: readonly ShoppingItem[],
): Array<{ category: ListCategory; unchecked: ShoppingItem[]; checked: ShoppingItem[] }> {
  const map = new Map<ListCategory, { unchecked: ShoppingItem[]; checked: ShoppingItem[] }>()

  for (const item of items) {
    if (!map.has(item.category)) {
      map.set(item.category, { unchecked: [], checked: [] })
    }
    const group = map.get(item.category)!
    if (item.checked) {
      group.checked.push(item)
    } else {
      group.unchecked.push(item)
    }
  }

  return CATEGORY_ORDER
    .filter((cat) => map.has(cat))
    .map((cat) => ({ category: cat, ...map.get(cat)! }))
}

// ─── Duplicate Prevention ─────────────────────────────────────────────────────

/**
 * Checks if an item name already exists in the list (case-insensitive).
 * PRD §7.4: "Duplicate prevention: Case-insensitive check blocks adding the same item twice."
 */
export function isDuplicate(
  newText: string,
  existingItems: readonly ShoppingItem[],
): boolean {
  const normalized = newText.toLowerCase().trim()
  return existingItems.some((item) => item.text.toLowerCase().trim() === normalized)
}

// ─── Active List Clear ────────────────────────────────────────────────────────

/**
 * Returns the IDs of all checked items (for clearing the active session).
 * PRD §7.5: "Active list is cleared when a shopping session ends."
 */
export function getCheckedItemIds(items: readonly ShoppingItem[]): string[] {
  return items.filter((i) => i.checked).map((i) => i.id)
}

// ─── Smart Category Learning helpers ─────────────────────────────────────────

/**
 * Returns items that landed in the 'other' category and have not been
 * manually re-categorized (i.e., still in 'other').
 * These are candidates for the Level 1 tag nudge (PRD §7.7).
 */
export function getUncategorizedItems(items: readonly ShoppingItem[]): ShoppingItem[] {
  return items.filter((i) => i.category === 'other')
}

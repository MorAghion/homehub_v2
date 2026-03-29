/**
 * Shopping Hub domain types.
 * Derived from the DB schema in PRD_v3.md §5.2.
 */

import type { ListCategory } from '../lib/autoCategorize'

export interface ShoppingList {
  id: string
  household_id: string
  name: string
  /** Inferred context key (from contextEngine). */
  context: string | null
  created_at: string
  updated_at: string
}

export interface ShoppingItem {
  id: string
  list_id: string
  text: string
  quantity: string | null
  /** True if item has been checked off in the Active List (found/put in cart). */
  checked: boolean
  /** Auto-categorized list-category. */
  category: ListCategory
  /** True = permanent Master List item. False = active-session-only item. */
  in_master: boolean
  created_at: string
  updated_at: string
}

/** Household-level custom category mapping (PRD §7.7). */
export interface CustomCategoryMapping {
  id: string
  household_id: string
  /** Normalized: lowercase, trimmed. */
  item_name: string
  category: ListCategory
  created_by: string
  created_at: string
}

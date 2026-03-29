import { describe, it, expect } from 'vitest'
import {
  groupByCategory,
  groupForActiveList,
  sortItemsForActiveList,
  isDuplicate,
  getCheckedItemIds,
  getUncategorizedItems,
  CATEGORY_ORDER,
} from '../shopping'
import type { ShoppingItem } from '../../types/shopping'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeItem(overrides: Partial<ShoppingItem> = {}): ShoppingItem {
  return {
    id: 'item-1',
    list_id: 'list-1',
    text: 'Milk',
    quantity: null,
    checked: false,
    category: 'dairy',
    in_master: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

// ─── CATEGORY_ORDER ───────────────────────────────────────────────────────────

describe('CATEGORY_ORDER', () => {
  it('has exactly 10 categories', () => {
    expect(CATEGORY_ORDER).toHaveLength(10)
  })

  it('ends with "other" as fallback', () => {
    expect(CATEGORY_ORDER[CATEGORY_ORDER.length - 1]).toBe('other')
  })
})

// ─── groupByCategory ──────────────────────────────────────────────────────────

describe('groupByCategory', () => {
  it('returns empty array for empty items', () => {
    expect(groupByCategory([])).toEqual([])
  })

  it('groups items by category', () => {
    const items: ShoppingItem[] = [
      makeItem({ id: '1', category: 'dairy', text: 'Milk' }),
      makeItem({ id: '2', category: 'dairy', text: 'Cheese' }),
      makeItem({ id: '3', category: 'vegetables', text: 'Tomato' }),
    ]
    const result = groupByCategory(items)
    expect(result).toHaveLength(2)
    expect(result[0]!.category).toBe('dairy')
    expect(result[0]!.items).toHaveLength(2)
    expect(result[1]!.category).toBe('vegetables')
    expect(result[1]!.items).toHaveLength(1)
  })

  it('returns groups in CATEGORY_ORDER order (dairy before vegetables)', () => {
    const items: ShoppingItem[] = [
      makeItem({ id: '1', category: 'vegetables', text: 'Tomato' }),
      makeItem({ id: '2', category: 'dairy', text: 'Milk' }),
    ]
    const result = groupByCategory(items)
    expect(result[0]!.category).toBe('dairy')
    expect(result[1]!.category).toBe('vegetables')
  })

  it('omits empty categories', () => {
    const items: ShoppingItem[] = [
      makeItem({ id: '1', category: 'pantry', text: 'Bread' }),
    ]
    const result = groupByCategory(items)
    expect(result).toHaveLength(1)
    expect(result[0]!.category).toBe('pantry')
  })
})

// ─── sortItemsForActiveList ───────────────────────────────────────────────────

describe('sortItemsForActiveList', () => {
  it('returns empty for empty input', () => {
    expect(sortItemsForActiveList([])).toEqual([])
  })

  it('puts unchecked items before checked items', () => {
    const items: ShoppingItem[] = [
      makeItem({ id: '1', text: 'A', checked: true, created_at: '2026-01-01T00:00:00Z' }),
      makeItem({ id: '2', text: 'B', checked: false, created_at: '2026-01-02T00:00:00Z' }),
      makeItem({ id: '3', text: 'C', checked: false, created_at: '2026-01-03T00:00:00Z' }),
    ]
    const result = sortItemsForActiveList(items)
    expect(result[0]!.id).toBe('2')
    expect(result[1]!.id).toBe('3')
    expect(result[2]!.id).toBe('1')
  })

  it('preserves creation order within same checked state', () => {
    const items: ShoppingItem[] = [
      makeItem({ id: '3', text: 'C', checked: false, created_at: '2026-01-03T00:00:00Z' }),
      makeItem({ id: '1', text: 'A', checked: false, created_at: '2026-01-01T00:00:00Z' }),
      makeItem({ id: '2', text: 'B', checked: false, created_at: '2026-01-02T00:00:00Z' }),
    ]
    const result = sortItemsForActiveList(items)
    expect(result.map((i) => i.id)).toEqual(['1', '2', '3'])
  })

  it('does not mutate the input array', () => {
    const items: ShoppingItem[] = [
      makeItem({ id: '1', text: 'A', checked: true }),
      makeItem({ id: '2', text: 'B', checked: false }),
    ]
    const original = [...items]
    sortItemsForActiveList(items)
    expect(items).toEqual(original)
  })
})

// ─── groupForActiveList ───────────────────────────────────────────────────────

describe('groupForActiveList', () => {
  it('returns empty for empty items', () => {
    expect(groupForActiveList([])).toEqual([])
  })

  it('separates unchecked and checked per category', () => {
    const items: ShoppingItem[] = [
      makeItem({ id: '1', category: 'dairy', text: 'Milk', checked: false }),
      makeItem({ id: '2', category: 'dairy', text: 'Cheese', checked: true }),
      makeItem({ id: '3', category: 'dairy', text: 'Butter', checked: false }),
    ]
    const result = groupForActiveList(items)
    expect(result).toHaveLength(1)
    expect(result[0]!.category).toBe('dairy')
    expect(result[0]!.unchecked).toHaveLength(2)
    expect(result[0]!.checked).toHaveLength(1)
    expect(result[0]!.checked[0]!.id).toBe('2')
  })

  it('orders groups by CATEGORY_ORDER', () => {
    const items: ShoppingItem[] = [
      makeItem({ id: '1', category: 'other', text: 'Misc' }),
      makeItem({ id: '2', category: 'dairy', text: 'Milk' }),
    ]
    const result = groupForActiveList(items)
    expect(result[0]!.category).toBe('dairy')
    expect(result[1]!.category).toBe('other')
  })
})

// ─── isDuplicate ──────────────────────────────────────────────────────────────

describe('isDuplicate', () => {
  it('returns false for empty list', () => {
    expect(isDuplicate('Milk', [])).toBe(false)
  })

  it('detects exact duplicates', () => {
    const items: ShoppingItem[] = [makeItem({ text: 'Milk' })]
    expect(isDuplicate('Milk', items)).toBe(true)
  })

  it('is case-insensitive', () => {
    const items: ShoppingItem[] = [makeItem({ text: 'milk' })]
    expect(isDuplicate('MILK', items)).toBe(true)
    expect(isDuplicate('Milk', items)).toBe(true)
  })

  it('trims whitespace', () => {
    const items: ShoppingItem[] = [makeItem({ text: 'Milk' })]
    expect(isDuplicate('  Milk  ', items)).toBe(true)
  })

  it('returns false for different item', () => {
    const items: ShoppingItem[] = [makeItem({ text: 'Milk' })]
    expect(isDuplicate('Cheese', items)).toBe(false)
  })
})

// ─── getCheckedItemIds ────────────────────────────────────────────────────────

describe('getCheckedItemIds', () => {
  it('returns empty for empty list', () => {
    expect(getCheckedItemIds([])).toEqual([])
  })

  it('returns ids of checked items only', () => {
    const items: ShoppingItem[] = [
      makeItem({ id: '1', checked: true }),
      makeItem({ id: '2', checked: false }),
      makeItem({ id: '3', checked: true }),
    ]
    expect(getCheckedItemIds(items)).toEqual(['1', '3'])
  })
})

// ─── getUncategorizedItems ────────────────────────────────────────────────────

describe('getUncategorizedItems', () => {
  it('returns items with "other" category', () => {
    const items: ShoppingItem[] = [
      makeItem({ id: '1', category: 'dairy' }),
      makeItem({ id: '2', category: 'other' }),
      makeItem({ id: '3', category: 'other' }),
    ]
    const result = getUncategorizedItems(items)
    expect(result).toHaveLength(2)
    expect(result.map((i) => i.id)).toEqual(['2', '3'])
  })

  it('returns empty when no "other" items', () => {
    const items: ShoppingItem[] = [
      makeItem({ id: '1', category: 'dairy' }),
    ]
    expect(getUncategorizedItems(items)).toEqual([])
  })
})

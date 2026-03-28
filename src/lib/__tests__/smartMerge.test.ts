import { describe, it, expect } from 'vitest'
import { smartMerge, mergeMultiplePacks } from '../smartMerge'

// ─── smartMerge — core behaviour ─────────────────────────────────────────────

describe('smartMerge — basic deduplication', () => {
  it('adds new items to an empty list', () => {
    const result = smartMerge([], ['Milk', 'Eggs', 'Bread'])
    expect(result).toEqual(['Milk', 'Eggs', 'Bread'])
  })

  it('appends new items after existing ones', () => {
    const result = smartMerge(['Milk'], ['Eggs', 'Bread'])
    expect(result).toEqual(['Milk', 'Eggs', 'Bread'])
  })

  it('does not add items already in the list (exact match)', () => {
    const result = smartMerge(['Milk', 'Eggs'], ['Eggs', 'Bread'])
    expect(result).toEqual(['Milk', 'Eggs', 'Bread'])
  })

  it('deduplication is case-insensitive', () => {
    const result = smartMerge(['Milk', 'Eggs'], ['milk', 'EGGS', 'Bread'])
    expect(result).toEqual(['Milk', 'Eggs', 'Bread'])
  })

  it('trims whitespace before comparison', () => {
    const result = smartMerge(['Milk'], ['  Milk  ', 'Eggs'])
    expect(result).toEqual(['Milk', 'Eggs'])
  })

  it('preserves insertion order of new items', () => {
    const result = smartMerge(['A'], ['C', 'B', 'D'])
    expect(result).toEqual(['A', 'C', 'B', 'D'])
  })

  it('does not mutate the existing array', () => {
    const existing = ['Milk', 'Eggs']
    smartMerge(existing, ['Bread'])
    expect(existing).toEqual(['Milk', 'Eggs'])
  })

  it('handles empty incoming array (returns copy of existing)', () => {
    const result = smartMerge(['Milk', 'Eggs'], [])
    expect(result).toEqual(['Milk', 'Eggs'])
  })

  it('handles empty existing array', () => {
    const result = smartMerge([], ['Milk'])
    expect(result).toEqual(['Milk'])
  })

  it('handles both arrays empty', () => {
    expect(smartMerge([], [])).toEqual([])
  })
})

// ─── smartMerge — Hebrew items ────────────────────────────────────────────────

describe('smartMerge — Hebrew deduplication', () => {
  it('deduplicates Hebrew items', () => {
    const result = smartMerge(['חלב', 'ביצים'], ['ביצים', 'לחם'])
    expect(result).toEqual(['חלב', 'ביצים', 'לחם'])
  })

  it('case-insensitivity does not break Hebrew (no casing in Hebrew)', () => {
    const result = smartMerge(['עגבניות'], ['עגבניות', 'מלפפונים'])
    expect(result).toEqual(['עגבניות', 'מלפפונים'])
  })
})

// ─── smartMerge — bubble pack simulation (PRD §7.3) ──────────────────────────

describe('smartMerge — bubble pack simulation (PRD §7.3)', () => {
  const groceryPack = ['Milk', 'Eggs', 'Bread', 'Butter']
  const campingPack = ['Torch', 'Tent', 'Water Bottle', 'Milk'] // "Milk" overlaps

  it('first bubble click injects grocery pack into empty list', () => {
    const result = smartMerge([], groceryPack)
    expect(result).toEqual(groceryPack)
  })

  it('second bubble click adds camping items, skipping duplicate "Milk"', () => {
    const afterFirst = smartMerge([], groceryPack)
    const afterSecond = smartMerge(afterFirst, campingPack)

    expect(afterSecond).toContain('Milk')
    expect(afterSecond).toContain('Torch')
    expect(afterSecond).toContain('Tent')
    // Milk should appear only once
    expect(afterSecond.filter((i) => i.toLowerCase() === 'milk')).toHaveLength(1)
  })

  it('clicking a bubble pack that fully overlaps adds no items', () => {
    const initial = ['Milk', 'Eggs', 'Bread']
    const result = smartMerge(initial, ['Milk', 'Eggs', 'Bread'])
    expect(result).toEqual(initial)
  })
})

// ─── mergeMultiplePacks ───────────────────────────────────────────────────────

describe('mergeMultiplePacks', () => {
  it('merges three packs without duplicates', () => {
    const result = mergeMultiplePacks(
      [],
      [
        ['Milk', 'Eggs'],
        ['Eggs', 'Bread'],
        ['Butter', 'Bread'],
      ],
    )
    expect(result).toEqual(['Milk', 'Eggs', 'Bread', 'Butter'])
  })

  it('preserves existing items, appends new', () => {
    const result = mergeMultiplePacks(['Coffee'], [['Milk'], ['Coffee', 'Tea']])
    expect(result).toEqual(['Coffee', 'Milk', 'Tea'])
  })

  it('handles empty packs array', () => {
    const result = mergeMultiplePacks(['Milk', 'Eggs'], [])
    expect(result).toEqual(['Milk', 'Eggs'])
  })

  it('handles empty existing + multiple packs', () => {
    const result = mergeMultiplePacks([], [['A', 'B'], ['B', 'C'], ['D']])
    expect(result).toEqual(['A', 'B', 'C', 'D'])
  })

  it('does not mutate existing array', () => {
    const existing = ['Milk']
    mergeMultiplePacks(existing, [['Eggs']])
    expect(existing).toEqual(['Milk'])
  })

  it('Hebrew items — merge multiple packs', () => {
    const result = mergeMultiplePacks(
      [],
      [
        ['חלב', 'ביצים'],
        ['ביצים', 'לחם', 'גבינה'],
      ],
    )
    expect(result).toEqual(['חלב', 'ביצים', 'לחם', 'גבינה'])
  })
})

// ─── Large-scale deduplication ────────────────────────────────────────────────

describe('smartMerge — large-scale test', () => {
  it('handles 100-item lists correctly', () => {
    const existing = Array.from({ length: 50 }, (_, i) => `Item ${i}`)
    const incoming = Array.from({ length: 100 }, (_, i) => `Item ${i}`) // 50 overlap + 50 new
    const result = smartMerge(existing, incoming)

    expect(result).toHaveLength(100)
    // No duplicates
    const unique = new Set(result.map((s) => s.toLowerCase()))
    expect(unique.size).toBe(100)
  })
})

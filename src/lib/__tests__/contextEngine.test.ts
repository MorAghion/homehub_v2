import { describe, it, expect } from 'vitest'
import {
  detectContext,
  getStarterPack,
  ALL_CONTEXTS,
  STARTER_PACKS,
  type Context,
} from '../contextEngine'

// ─── Constant assertions ──────────────────────────────────────────────────────

describe('contextEngine — ALL_CONTEXTS', () => {
  it('exports exactly 12 contexts (PRD §7.2)', () => {
    expect(ALL_CONTEXTS).toHaveLength(12)
  })

  it('every context has a starter pack', () => {
    for (const ctx of ALL_CONTEXTS) {
      expect(() => getStarterPack(ctx)).not.toThrow()
    }
  })

  it('every starter pack has at least 4 items', () => {
    for (const pack of STARTER_PACKS) {
      expect(pack.items.length).toBeGreaterThanOrEqual(4)
    }
  })

  it('every starter pack item has both EN and HE translations', () => {
    for (const pack of STARTER_PACKS) {
      for (const item of pack.items) {
        expect(item.en.length).toBeGreaterThan(0)
        expect(item.he.length).toBeGreaterThan(0)
      }
    }
  })
})

// ─── English keyword matching ─────────────────────────────────────────────────

describe('detectContext — English keywords', () => {
  const cases: [string, Context][] = [
    ['Supermarket run', 'grocery'],
    ['Weekly grocery shop', 'grocery'],
    ['Rami Levi', 'grocery'],
    ['Camping trip packing', 'camping'],
    ['Outdoor hike supplies', 'camping'],
    ['Travel abroad packing', 'travel_abroad'],
    ['Flight to London', 'travel_abroad'],
    ['Passport documents', 'travel_abroad'],
    ['Pharmacy restock', 'pharma'],
    ['Medicine cabinet', 'pharma'],
    ['Baby supplies', 'baby'],
    ['Newborn essentials', 'baby'],
    ['Diaper run', 'baby'],
    ['Home cleaning supplies', 'cleaning'],
    ['Laundry day shopping', 'cleaning'],
    ['Gym bag', 'sports'],
    ['Fitness supplies', 'sports'],
    ['School supplies', 'school_office'],
    ['Office stationery', 'school_office'],
    ['Electronics cables', 'electronics'],
    ['Gadget accessories', 'electronics'],
    ['Hardware tools', 'hardware'],
    ['DIY repair parts', 'hardware'],
    ['Pet food run', 'pets'],
    ['Dog and cat supplies', 'pets'],
    ["Birthday party supplies", 'party'],
    ['Wedding celebration shopping', 'party'],
  ]

  for (const [name, expectedContext] of cases) {
    it(`"${name}" → includes '${expectedContext}'`, () => {
      const result = detectContext(name)
      expect(result).toContain(expectedContext)
    })
  }
})

// ─── Hebrew keyword matching ──────────────────────────────────────────────────

describe('detectContext — Hebrew keywords', () => {
  const cases: [string, Context][] = [
    ['קניות שבועיות', 'grocery'],
    ['רמי לוי', 'grocery'],
    ['שופרסל', 'grocery'],
    ['טיול קמפינג', 'camping'],
    ['ציוד לטיול', 'camping'],
    ['נסיעה לחו"ל', 'travel_abroad'],
    ['טיסה לברלין', 'travel_abroad'],
    ['בית מרקחת', 'pharma'],
    ['תרופות לבית', 'pharma'],
    ['ציוד לתינוק', 'baby'],
    ['חיתולים ומוצצים', 'baby'],
    ['ניקיון הבית', 'cleaning'],
    ['חומרי ניקיון', 'cleaning'],
    ['חדר כושר', 'sports'],
    ['ציוד לספורט', 'sports'],
    ['ציוד לבית ספר', 'school_office'],
    ['אלקטרוניקה', 'electronics'],
    ['כלי עבודה', 'hardware'],
    ['חיות מחמד', 'pets'],
    ['מסיבת יום הולדת', 'party'],
    ['ציוד לאירוע', 'party'],
  ]

  for (const [name, expectedContext] of cases) {
    it(`"${name}" → includes '${expectedContext}'`, () => {
      const result = detectContext(name)
      expect(result).toContain(expectedContext)
    })
  }
})

// ─── Multiple-context detection ───────────────────────────────────────────────

describe('detectContext — multiple contexts', () => {
  it('returns multiple contexts when name matches several', () => {
    // "camping pharmacy" should match both
    const result = detectContext('camping pharma kit')
    expect(result).toContain('camping')
    expect(result).toContain('pharma')
  })

  it('Hebrew multi-context: camping + baby', () => {
    const result = detectContext('ציוד לתינוק לטיול')
    expect(result).toContain('camping')
    expect(result).toContain('baby')
  })
})

// ─── No-match / edge cases ────────────────────────────────────────────────────

describe('detectContext — edge cases', () => {
  it('returns empty array for a name with no keywords', () => {
    expect(detectContext('List 1')).toEqual([])
    expect(detectContext('misc')).toEqual([])
  })

  it('is case-insensitive for English', () => {
    expect(detectContext('SUPERMARKET')).toContain('grocery')
    expect(detectContext('Camping')).toContain('camping')
  })

  it('handles extra whitespace', () => {
    expect(detectContext('  supermarket  ')).toContain('grocery')
  })

  it('returns an array (even for a single match)', () => {
    const result = detectContext('gym')
    expect(Array.isArray(result)).toBe(true)
    expect(result).toContain('sports')
  })

  it('does not return duplicates', () => {
    const result = detectContext('supermarket shopping groceries food')
    const groceryMatches = result.filter((c) => c === 'grocery')
    expect(groceryMatches).toHaveLength(1)
  })
})

// ─── getStarterPack ───────────────────────────────────────────────────────────

describe('getStarterPack', () => {
  it('returns the grocery pack', () => {
    const pack = getStarterPack('grocery')
    expect(pack.context).toBe('grocery')
    expect(pack.label.en).toBeTruthy()
    expect(pack.label.he).toBeTruthy()
  })

  it('throws for an unknown context', () => {
    expect(() => getStarterPack('unknown' as Context)).toThrow()
  })

  it('all 12 packs are accessible', () => {
    for (const ctx of ALL_CONTEXTS) {
      const pack = getStarterPack(ctx)
      expect(pack.context).toBe(ctx)
    }
  })
})

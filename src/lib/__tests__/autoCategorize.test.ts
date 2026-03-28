import { describe, it, expect } from 'vitest'
import { autoCategorize, ALL_CATEGORIES, type ListCategory } from '../autoCategorize'

// ─── ALL_CATEGORIES completeness ──────────────────────────────────────────────

describe('autoCategorize — ALL_CATEGORIES', () => {
  it('exports exactly 10 list-categories (PRD §7.4)', () => {
    expect(ALL_CATEGORIES).toHaveLength(10)
  })

  it('includes the "other" fallback category', () => {
    expect(ALL_CATEGORIES).toContain('other')
  })
})

// ─── English classification ───────────────────────────────────────────────────

describe('autoCategorize — English items', () => {
  const cases: [string, ListCategory][] = [
    // Dairy
    ['Milk', 'dairy'],
    ['Cheese', 'dairy'],
    ['Butter', 'dairy'],
    ['Yogurt', 'dairy'],
    ['Sour cream', 'dairy'],
    ['Whipping cream', 'dairy'],
    // Meat
    ['Chicken breast', 'meat'],
    ['Ground beef', 'meat'],
    ['Turkey', 'meat'],
    ['Sausage', 'meat'],
    ['Lamb chops', 'meat'],
    // Fish
    ['Salmon fillet', 'fish'],
    ['Tuna can', 'fish'],
    ['Sardines', 'fish'],
    ['Tilapia', 'fish'],
    // Pantry
    ['Bread', 'pantry'],
    ['Pasta', 'pantry'],
    ['Rice', 'pantry'],
    ['Olive oil', 'pantry'],
    ['Ketchup', 'pantry'],
    ['Chocolate', 'pantry'],
    ['Coffee', 'pantry'],
    ['Cereal', 'pantry'],
    // Vegetables
    ['Tomatoes', 'vegetables'],
    ['Cucumbers', 'vegetables'],
    ['Onion', 'vegetables'],
    ['Garlic', 'vegetables'],
    ['Bell pepper', 'vegetables'],
    ['Potatoes', 'vegetables'],
    ['Broccoli', 'vegetables'],
    ['Eggplant', 'vegetables'],
    // Fruit
    ['Apples', 'fruit'],
    ['Bananas', 'fruit'],
    ['Oranges', 'fruit'],
    ['Grapes', 'fruit'],
    ['Strawberries', 'fruit'],
    ['Mango', 'fruit'],
    ['Avocado', 'fruit'],
    ['Watermelon', 'fruit'],
    // Cleaning
    ['Detergent', 'cleaning'],
    ['Dish soap', 'cleaning'],
    ['Bleach', 'cleaning'],
    ['Trash bags', 'cleaning'],
    ['Sponges', 'cleaning'],
    ['Toilet paper', 'cleaning'],
    // Pharma & Hygiene
    ['Paracetamol', 'pharma_hygiene'],
    ['Ibuprofen', 'pharma_hygiene'],
    ['Bandages', 'pharma_hygiene'],
    ['Toothpaste', 'pharma_hygiene'],
    ['Shampoo', 'pharma_hygiene'],
    ['Vitamins', 'pharma_hygiene'],
    ['Sunscreen', 'pharma_hygiene'],
    // Documents & Money
    ['Passport', 'documents_money'],
    ['Insurance documents', 'documents_money'],
    ['Travel currency', 'documents_money'],
  ]

  for (const [item, expected] of cases) {
    it(`"${item}" → '${expected}'`, () => {
      expect(autoCategorize(item)).toBe(expected)
    })
  }
})

// ─── Hebrew classification — standard terms ───────────────────────────────────

describe('autoCategorize — Hebrew standard terms', () => {
  const cases: [string, ListCategory][] = [
    // Dairy
    ['חלב', 'dairy'],
    ['גבינה צהובה', 'dairy'],
    ['חמאה', 'dairy'],
    ['יוגורט', 'dairy'],
    ['שמנת', 'dairy'],
    ['קוטג', 'dairy'],
    ['לאבנה', 'dairy'],
    // Meat
    ['עוף', 'meat'],
    ['בשר טחון', 'meat'],
    ['פרגית', 'meat'],
    ['שניצל', 'meat'],
    ['נקניקייה', 'meat'],
    // Fish
    ['סלמון', 'fish'],
    ['טונה', 'fish'],
    ['דג', 'fish'],
    ['פורל', 'fish'],
    // Pantry
    ['לחם', 'pantry'],
    ['אורז', 'pantry'],
    ['פסטה', 'pantry'],
    ['שמן זית', 'pantry'],
    ['דבש', 'pantry'],
    ['שוקולד', 'pantry'],
    ['קפה', 'pantry'],
    ['ביצים', 'pantry'],
    ['פתיתים', 'pantry'],
    // Vegetables
    ['עגבניות', 'vegetables'],
    ['מלפפונים', 'vegetables'],
    ['בצל', 'vegetables'],
    ['גזר', 'vegetables'],
    ['תרד', 'vegetables'],
    ['חציל', 'vegetables'],
    ['פלפל', 'vegetables'],
    // Fruit
    ['תפוחים', 'fruit'],
    ['בננות', 'fruit'],
    ['תפוזים', 'fruit'],
    ['ענבים', 'fruit'],
    ['תותים', 'fruit'],
    ['אבוקדו', 'fruit'],
    ['אבטיח', 'fruit'],
    ['רימון', 'fruit'],
    // Cleaning
    ['אבקת כביסה', 'cleaning'],
    ['סבון כלים', 'cleaning'],
    ['אקונומיקה', 'cleaning'],
    ['ספוגים', 'cleaning'],
    ['שקיות אשפה', 'cleaning'],
    ['נייר טואלט', 'cleaning'],
    // Pharma & Hygiene
    ['פרצטמול', 'pharma_hygiene'],
    ['פלסטרים', 'pharma_hygiene'],
    ['ויטמינים', 'pharma_hygiene'],
    ['משחת שיניים', 'pharma_hygiene'],
    ['שמפו', 'pharma_hygiene'],
    ['קרם הגנה', 'pharma_hygiene'],
    ['חיתולים', 'pharma_hygiene'],
    // Documents & Money
    ['דרכון', 'documents_money'],
    ['ביטוח', 'documents_money'],
    ['כרטיסים', 'documents_money'],
  ]

  for (const [item, expected] of cases) {
    it(`"${item}" → '${expected}'`, () => {
      expect(autoCategorize(item)).toBe(expected)
    })
  }
})

// ─── Hebrew colloquialisms (PRD §12.4) ───────────────────────────────────────

describe('autoCategorize — Hebrew colloquialisms and abbreviations (PRD §12.4)', () => {
  it('"גמבה" (colloquial for bell pepper) → vegetables', () => {
    expect(autoCategorize('גמבה')).toBe('vegetables')
  })

  it('"תפו"א" (abbreviation for potato) → vegetables', () => {
    expect(autoCategorize('תפו"א')).toBe('vegetables')
  })

  it('"בטטה" (sweet potato, commonly used in Israeli kitchen) → vegetables', () => {
    expect(autoCategorize('בטטה')).toBe('vegetables')
  })

  it('"אקמול" (brand name for paracetamol, PRD §12.4 example) → pharma_hygiene', () => {
    expect(autoCategorize('אקמול')).toBe('pharma_hygiene')
  })

  it('"אדויל" (brand name for ibuprofen) → pharma_hygiene', () => {
    expect(autoCategorize('אדויל')).toBe('pharma_hygiene')
  })

  it('"ג\'ויה" / "ג׳ויה" (brand name for dish soap, PRD §12.4 example) → cleaning', () => {
    expect(autoCategorize("ג'ויה")).toBe('cleaning')
    expect(autoCategorize('ג׳ויה')).toBe('cleaning')
  })

  it('"דומסטוס" (bleach brand) → cleaning', () => {
    expect(autoCategorize('דומסטוס')).toBe('cleaning')
  })

  it('"לבן" (leben — fermented milk drink) → dairy', () => {
    expect(autoCategorize('לבן')).toBe('dairy')
  })

  it('"תנובה" (major dairy brand used generically) → dairy', () => {
    expect(autoCategorize('תנובה')).toBe('dairy')
  })
})

// ─── Singular / plural forms (PRD §12.4) ─────────────────────────────────────

describe('autoCategorize — singular and plural forms (PRD §12.4)', () => {
  const pluralPairs: [string, string, ListCategory][] = [
    ['בצל', 'בצלים', 'vegetables'],
    ['ביצה', 'ביצים', 'pantry'],
    ['עגבנייה', 'עגבניות', 'vegetables'],
    ['מלפפון', 'מלפפונים', 'vegetables'],
    ['תות', 'תותים', 'fruit'],
    ['ענב', 'ענבים', 'fruit'],
    ['ויטמין', 'ויטמינים', 'pharma_hygiene'],
    ['ספוג', 'ספוגים', 'cleaning'],
    ['פלסטר', 'פלסטרים', 'pharma_hygiene'],
    ['apple', 'apples', 'fruit'],
    ['banana', 'bananas', 'fruit'],
    ['tomato', 'tomatoes', 'vegetables'],
    ['cucumber', 'cucumbers', 'vegetables'],
  ]

  for (const [singular, plural, expected] of pluralPairs) {
    it(`singular "${singular}" → '${expected}'`, () => {
      expect(autoCategorize(singular)).toBe(expected)
    })
    it(`plural "${plural}" → '${expected}'`, () => {
      expect(autoCategorize(plural)).toBe(expected)
    })
  }
})

// ─── Case-insensitivity ───────────────────────────────────────────────────────

describe('autoCategorize — case-insensitivity', () => {
  it('MILK → dairy', () => expect(autoCategorize('MILK')).toBe('dairy'))
  it('Chicken Breast → meat', () => expect(autoCategorize('Chicken Breast')).toBe('meat'))
  it('TOOTHPASTE → pharma_hygiene', () => expect(autoCategorize('TOOTHPASTE')).toBe('pharma_hygiene'))
  it('  BREAD  (with spaces) → pantry', () => expect(autoCategorize('  BREAD  ')).toBe('pantry'))
})

// ─── Fallback to "other" ──────────────────────────────────────────────────────

describe('autoCategorize — fallback', () => {
  it('unrecognised item → "other"', () => {
    expect(autoCategorize('xylophone parts')).toBe('other')
    expect(autoCategorize('random-thing-xyz')).toBe('other')
    expect(autoCategorize('קלחת סינגפורית')).toBe('other')
  })

  it('empty string → "other"', () => {
    expect(autoCategorize('')).toBe('other')
  })
})

// ─── Custom household mappings (PRD §7.7) ────────────────────────────────────

describe('autoCategorize — custom household mappings', () => {
  it('custom mapping overrides built-in (e.g. "milk" remapped to pantry)', () => {
    const custom = new Map<string, ListCategory>([['milk', 'pantry']])
    expect(autoCategorize('milk', custom)).toBe('pantry')
  })

  it('custom mapping is case-insensitive (key normalized)', () => {
    // Keys stored normalized; lookup normalizes the input
    const custom = new Map<string, ListCategory>([['גמבה', 'fruit']]) // household override
    expect(autoCategorize('גמבה', custom)).toBe('fruit')
    expect(autoCategorize('גמבה', custom)).not.toBe('vegetables')
  })

  it('custom mapping for previously-"other" item works', () => {
    const custom = new Map<string, ListCategory>([['specialty item', 'pantry']])
    expect(autoCategorize('specialty item', custom)).toBe('pantry')
  })

  it('falls through to built-in when item not in custom map', () => {
    const custom = new Map<string, ListCategory>([['something else', 'pantry']])
    expect(autoCategorize('milk', custom)).toBe('dairy')
  })

  it('without custom map, built-in still works', () => {
    expect(autoCategorize('tomatoes')).toBe('vegetables')
  })
})

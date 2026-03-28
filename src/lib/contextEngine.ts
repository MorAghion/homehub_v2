/**
 * Context Engine — infers shopping-list context from a Sub-Hub name.
 * PRD §7.2: scans the name for keywords in both English and Hebrew.
 */

export type Context =
  | 'grocery'
  | 'camping'
  | 'travel_abroad'
  | 'pharma'
  | 'baby'
  | 'cleaning'
  | 'sports'
  | 'school_office'
  | 'electronics'
  | 'hardware'
  | 'pets'
  | 'party'

export interface StarterPack {
  context: Context
  label: { en: string; he: string }
  items: { en: string; he: string }[]
}

// Each context maps to an array of lowercase trigger keywords (EN + HE).
const CONTEXT_KEYWORDS: Record<Context, string[]> = {
  grocery: [
    // English
    'supermarket', 'super', 'market', 'grocery', 'groceries', 'food',
    'weekly', 'shopping', 'shufersal', 'rami levi', 'yochananof',
    // Hebrew
    'סופר', 'שופרסל', 'מכולת', 'שוק', 'מזון', 'מוצרים', 'קניות שבועיות',
    'רמי לוי', 'יוחננוף', 'ויקטורי', 'קניות',
  ],
  camping: [
    // English
    'camping', 'camp', 'outdoor', 'tent', 'hike', 'hiking', 'trek', 'trekking',
    'nature', 'trail', 'backpacking',
    // Hebrew
    'קמפינג', 'טיול', 'אוהל', 'שטח', 'טבע', 'מסלול', 'כיור', 'צעדה',
  ],
  travel_abroad: [
    // English
    'travel', 'abroad', 'flight', 'passport', 'trip', 'vacation', 'holiday',
    'airport', 'international', 'abroad', 'overseas',
    // Hebrew
    'נסיעה', 'חול', 'טיסה', 'פספורט', 'דרכון', 'חופשה', 'נופש', 'טיול לחו"ל',
    'נסיעה לחו"ל', 'חו"ל', 'חוץ לארץ',
  ],
  pharma: [
    // English
    'pharmacy', 'pharma', 'drug', 'medicine', 'medical', 'health', 'chemist',
    'prescription', 'vitamins', 'supplements', 'super-pharm',
    // Hebrew
    'בית מרקחת', 'פארמה', 'תרופה', 'תרופות', 'רפואה', 'רפואי', 'סופר פארם',
    'ניאופארם', 'טבע', 'ויטמינים',
  ],
  baby: [
    // English
    'baby', 'infant', 'diaper', 'newborn', 'toddler', 'child', 'kids',
    'nursery', 'formula', 'stroller',
    // Hebrew
    'תינוק', 'תינוקת', 'חיתולים', 'פעוט', 'ילד', 'ילדים', 'תינוקים',
    'מוצצים', 'עגלה', 'אמא ואני',
  ],
  cleaning: [
    // English
    'cleaning', 'clean', 'household', 'laundry', 'mop', 'detergent', 'hygiene',
    'disinfect', 'bleach', 'scrub',
    // Hebrew
    'ניקיון', 'ניקוי', 'כביסה', 'לניקיון', 'חומרי ניקיון', 'לניקיון הבית',
    'סבון', 'אקונומיקה', 'ג׳ויה', "ג'ויה",
  ],
  sports: [
    // English
    'gym', 'sport', 'sports', 'fitness', 'workout', 'training', 'exercise',
    'yoga', 'running', 'cycling', 'swimming',
    // Hebrew
    'חדר כושר', 'ספורט', 'אימון', 'כושר', 'יוגה', 'ריצה', 'אופניים',
    'שחייה', 'פיטנס',
  ],
  school_office: [
    // English
    'school', 'office', 'stationery', 'study', 'classroom', 'university',
    'college', 'supplies', 'art supplies', 'notebook',
    // Hebrew
    'בית ספר', 'משרד', 'לימודים', 'ציוד משרדי', 'ציוד לבית ספר', 'כיתה',
    'אוניברסיטה', 'מחברת', 'ספרים',
  ],
  electronics: [
    // English
    'electronics', 'tech', 'gadget', 'computer', 'phone', 'mobile', 'tablet',
    'charger', 'cable', 'hardware', 'device', 'best buy',
    // Hebrew
    'אלקטרוניקה', 'טכנולוגיה', "גאדג'ט", 'מחשב', 'טלפון',
    'נייד', 'טאבלט', 'טעינה', 'כבל', 'אביזרים', 'idigital',
  ],
  hardware: [
    // English
    'hardware', 'tools', 'diy', 'repair', 'plumbing', 'electric',
    'home improvement', 'builder', 'drill', 'paint',
    // Hebrew
    'כלי עבודה', 'אינסטלציה', 'תיקון', 'שיפוץ', 'חשמל', 'צבע',
    'מסגריה', 'בנייה', 'בורג', 'הום סנטר', 'home center',
  ],
  pets: [
    // English
    'pet', 'pets', 'dog', 'cat', 'animal', 'vet', 'veterinary', 'fish',
    'bird', 'hamster', 'kibble', 'petshop',
    // Hebrew
    'חיות מחמד', 'כלב', 'חתול', 'בעלי חיים', 'וטרינר', 'דגים', 'ציפור',
    'פטשופ', 'pet shop', 'מזון לכלב', 'מזון לחתול',
  ],
  party: [
    // English
    'party', 'event', 'birthday', 'celebration', 'wedding', 'holiday',
    'halloween', 'christmas', 'hanukah', 'passover',
    // Hebrew
    'מסיבה', 'אירוע', 'יום הולדת', 'חגיגה', 'חתונה', 'חג', 'חנוכה',
    'פסח', 'פורים', 'ראש השנה',
  ],
}

export const STARTER_PACKS: StarterPack[] = [
  {
    context: 'grocery',
    label: { en: 'Grocery', he: 'סופרמרקט' },
    items: [
      { en: 'Milk', he: 'חלב' },
      { en: 'Eggs', he: 'ביצים' },
      { en: 'Bread', he: 'לחם' },
      { en: 'Butter', he: 'חמאה' },
      { en: 'Cheese', he: 'גבינה' },
      { en: 'Yogurt', he: 'יוגורט' },
      { en: 'Chicken', he: 'עוף' },
      { en: 'Tomatoes', he: 'עגבניות' },
      { en: 'Cucumbers', he: 'מלפפונים' },
      { en: 'Onions', he: 'בצל' },
    ],
  },
  {
    context: 'camping',
    label: { en: 'Camping', he: 'קמפינג' },
    items: [
      { en: 'Tent', he: 'אוהל' },
      { en: 'Sleeping Bag', he: 'שק שינה' },
      { en: 'Flashlight', he: 'פנס' },
      { en: 'Water Bottle', he: 'בקבוק מים' },
      { en: 'First Aid Kit', he: 'ערכת עזרה ראשונה' },
      { en: 'Insect Repellent', he: 'דוחה חרקים' },
      { en: 'Matches', he: 'גפרורים' },
      { en: 'Sunscreen', he: 'קרם הגנה' },
    ],
  },
  {
    context: 'travel_abroad',
    label: { en: 'Travel Abroad', he: 'נסיעה לחו"ל' },
    items: [
      { en: 'Passport', he: 'דרכון' },
      { en: 'Adaptor', he: 'מתאם חשמל' },
      { en: 'Travel Insurance', he: 'ביטוח נסיעות' },
      { en: 'Currency', he: 'מטבע חוץ' },
      { en: 'Neck Pillow', he: 'כרית לצוואר' },
      { en: 'Noise-Cancelling Headphones', he: 'אוזניות מבטלות רעש' },
    ],
  },
  {
    context: 'pharma',
    label: { en: 'Pharmacy', he: 'בית מרקחת' },
    items: [
      { en: 'Paracetamol', he: 'פרצטמול' },
      { en: 'Bandages', he: 'פלסטרים' },
      { en: 'Antiseptic', he: 'חומר חיטוי' },
      { en: 'Vitamins', he: 'ויטמינים' },
      { en: 'Antihistamine', he: 'אנטי-היסטמין' },
    ],
  },
  {
    context: 'baby',
    label: { en: 'Baby', he: 'תינוק' },
    items: [
      { en: 'Diapers', he: 'חיתולים' },
      { en: 'Formula', he: 'אבקת מזון לתינוק' },
      { en: 'Baby Wipes', he: 'מגבונים לחים' },
      { en: 'Pacifier', he: 'מוצץ' },
      { en: 'Baby Shampoo', he: 'שמפו לתינוק' },
    ],
  },
  {
    context: 'cleaning',
    label: { en: 'Cleaning', he: 'ניקיון' },
    items: [
      { en: 'Detergent', he: 'אבקת כביסה' },
      { en: 'Dish Soap', he: 'סבון כלים' },
      { en: 'Mop', he: 'מגב' },
      { en: 'Sponges', he: 'ספוגים' },
      { en: 'Trash Bags', he: 'שקיות אשפה' },
      { en: 'Bleach', he: 'אקונומיקה' },
    ],
  },
  {
    context: 'sports',
    label: { en: 'Sports / Gym', he: 'ספורט וכושר' },
    items: [
      { en: 'Water Bottle', he: 'בקבוק מים' },
      { en: 'Protein Powder', he: 'אבקת חלבון' },
      { en: 'Gym Towel', he: 'מגבת לחדר כושר' },
      { en: 'Sports Socks', he: 'גרביים לספורט' },
    ],
  },
  {
    context: 'school_office',
    label: { en: 'School / Office', he: 'בית ספר ומשרד' },
    items: [
      { en: 'Notebooks', he: 'מחברות' },
      { en: 'Pens', he: 'עטים' },
      { en: 'Pencils', he: 'עפרונות' },
      { en: 'Ruler', he: 'סרגל' },
      { en: 'Scissors', he: 'מספריים' },
    ],
  },
  {
    context: 'electronics',
    label: { en: 'Electronics', he: 'אלקטרוניקה' },
    items: [
      { en: 'Charging Cable', he: 'כבל טעינה' },
      { en: 'Power Bank', he: 'סוללה ניידת' },
      { en: 'Earphones', he: 'אוזניות' },
      { en: 'Screen Protector', he: 'מגן מסך' },
    ],
  },
  {
    context: 'hardware',
    label: { en: 'Hardware / DIY', he: 'כלי עבודה ושיפוץ' },
    items: [
      { en: 'Screwdriver', he: 'מברג' },
      { en: 'Drill Bits', he: 'מקדחים' },
      { en: 'Tape Measure', he: 'סרט מדידה' },
      { en: 'Sandpaper', he: 'נייר זכוכית' },
    ],
  },
  {
    context: 'pets',
    label: { en: 'Pets', he: 'חיות מחמד' },
    items: [
      { en: 'Dog Food', he: 'מזון לכלב' },
      { en: 'Cat Food', he: 'מזון לחתול' },
      { en: 'Litter', he: 'חול לחתול' },
      { en: 'Treats', he: 'חטיפים לכלב' },
      { en: 'Shampoo', he: 'שמפו לחיות' },
    ],
  },
  {
    context: 'party',
    label: { en: 'Party / Events', he: 'מסיבות ואירועים' },
    items: [
      { en: 'Balloons', he: 'בלונים' },
      { en: 'Plates', he: 'צלחות חד-פעמיות' },
      { en: 'Cups', he: 'כוסות חד-פעמיות' },
      { en: 'Napkins', he: 'מפיות' },
      { en: 'Candles', he: 'נרות יומולדת' },
    ],
  },
]

/**
 * Detects one or more contexts from a Sub-Hub name.
 * Returns an empty array if no keywords match.
 */
export function detectContext(subHubName: string): Context[] {
  const normalized = subHubName.toLowerCase().trim()
  const matched: Context[] = []

  for (const [context, keywords] of Object.entries(CONTEXT_KEYWORDS) as [Context, string[]][]) {
    const isMatch = keywords.some((kw) => normalized.includes(kw.toLowerCase()))
    if (isMatch) {
      matched.push(context)
    }
  }

  return matched
}

/**
 * Returns the starter pack for a given context.
 */
export function getStarterPack(context: Context): StarterPack {
  const pack = STARTER_PACKS.find((p) => p.context === context)
  if (!pack) throw new Error(`No starter pack defined for context: ${context}`)
  return pack
}

export const ALL_CONTEXTS: Context[] = [
  'grocery',
  'camping',
  'travel_abroad',
  'pharma',
  'baby',
  'cleaning',
  'sports',
  'school_office',
  'electronics',
  'hardware',
  'pets',
  'party',
]

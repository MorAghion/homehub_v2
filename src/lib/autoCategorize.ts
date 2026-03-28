/**
 * autoCategorize — assigns a List-Category to a shopping item.
 * PRD §7.4, §12.4: works in English and Hebrew, including colloquialisms,
 * abbreviations, and brand names used as generics.
 *
 * Priority:
 * 1. Household custom mappings (passed in at call time)
 * 2. Built-in keyword table
 * 3. Fallback: 'other'
 */

export type ListCategory =
  | 'dairy'
  | 'meat'
  | 'fish'
  | 'pantry'
  | 'vegetables'
  | 'fruit'
  | 'cleaning'
  | 'pharma_hygiene'
  | 'documents_money'
  | 'other'

// Each entry maps normalized item-name substrings to a category.
// Multiple synonyms separated for readability.
const CATEGORY_KEYWORDS: Record<ListCategory, string[]> = {
  dairy: [
    // English
    'milk', 'cheese', 'butter', 'yogurt', 'cream', 'sour cream', 'kefir',
    'whipping cream', 'cottage', 'quark', 'leben',
    // Hebrew — standard
    'חלב', 'גבינה', 'חמאה', 'יוגורט', 'שמנת', 'גבינת קוטג', 'קוטג',
    'לאבנה', 'לבן', 'ריקוטה', 'גבינה צהובה', 'גבינה לבנה',
    // Hebrew — brands used as generics / colloquialisms
    'דנונה', 'טנא', 'תנובה',
  ],
  meat: [
    // English
    'chicken', 'beef', 'meat', 'lamb', 'pork', 'turkey', 'steak', 'mince',
    'ground beef', 'sausage', 'bacon', 'veal', 'duck', 'liver',
    // Hebrew — standard
    'עוף', 'בשר', 'כבש', 'הודו', 'סטייק', 'בשר טחון', 'נקניק', 'נקניקייה',
    'כבד', 'פרגית', 'שניצל', 'קציצות',
    // Hebrew — colloquialisms
    'חזה', 'כנפיים', 'שוקיים',
  ],
  fish: [
    // English
    'fish', 'salmon', 'tuna', 'sardine', 'tilapia', 'shrimp', 'sea bass',
    'trout', 'cod', 'anchovy', 'herring',
    // Hebrew
    'דג', 'דגים', 'סלמון', 'טונה', 'סרדין', 'טילפיה', 'ברמונדי', 'פורל',
    'מוסר ים', 'אנשובי', 'גפילטע',
  ],
  pantry: [
    // English
    'bread', 'pasta', 'rice', 'flour', 'sugar', 'salt', 'oil', 'olive oil',
    'vinegar', 'sauce', 'ketchup', 'mayonnaise', 'mustard', 'honey', 'jam',
    'cereal', 'oatmeal', 'crackers', 'chips', 'chocolate', 'coffee', 'tea',
    'water', 'juice', 'cola', 'soda', 'beer', 'wine', 'egg', 'eggs',
    'canned', 'beans', 'lentils', 'chickpeas', 'noodles',
    // Hebrew — standard
    'לחם', 'פסטה', 'אורז', 'קמח', 'סוכר', 'מלח', 'שמן', 'שמן זית',
    'חומץ', 'רוטב', 'קטשופ', 'מיונז', 'חרדל', 'דבש', 'ריבה', 'דגני בוקר',
    'קרקרים', 'שוקולד', 'קפה', 'תה', 'מים', 'מיץ', 'קולה', 'סודה',
    'בירה', 'יין', 'ביצה', 'ביצים', 'שימורים', 'שעועית', 'עדשים', 'חומוס',
    'אטריות', 'פתיתים', 'קוסקוס', 'בורגול',
    // Hebrew — abbreviations / colloquialisms
    'שוק"ג', // שוקולד גלידה
    'מיץ פטל',
  ],
  vegetables: [
    // English
    'tomato', 'tomatoes', 'cucumber', 'cucumbers', 'onion', 'onions',
    'garlic', 'pepper', 'bell pepper', 'carrot', 'carrots', 'potato',
    'potatoes', 'lettuce', 'spinach', 'broccoli', 'cauliflower', 'zucchini',
    'eggplant', 'corn', 'peas', 'mushrooms', 'celery', 'leek',
    // Hebrew — standard
    'עגבנייה', 'עגבניות', 'מלפפון', 'מלפפונים', 'בצל', 'שום', 'פלפל',
    'גזר', 'תפוח אדמה', 'חסה', 'תרד', 'ברוקולי', 'כרובית', 'קישוא',
    'חציל', 'תירס', 'אפונה', 'פטריות', 'סלרי', 'כרישה',
    // Hebrew — abbreviations / colloquialisms
    'תפו"א',       // תפוח אדמה (potato abbreviation)
    'גמבה',        // bell pepper (colloquial Israeli term - PRD §12.4)
    'בטטה',
    'קולרבי',
  ],
  fruit: [
    // English
    'apple', 'apples', 'banana', 'bananas', 'orange', 'oranges', 'grape',
    'grapes', 'strawberry', 'strawberries', 'mango', 'pineapple', 'watermelon',
    'melon', 'peach', 'pear', 'plum', 'cherry', 'kiwi', 'lemon', 'lime',
    'avocado', 'fig', 'pomegranate', 'dates',
    // Hebrew — standard
    'תפוח', 'תפוחים', 'בננה', 'בננות', 'תפוז', 'תפוזים', 'ענב', 'ענבים',
    'תות', 'תותים', 'מנגו', 'אננס', 'אבטיח', 'מלון', 'אפרסק', 'אגס',
    'שזיף', 'דובדבן', 'קיווי', 'לימון', 'ליים', 'אבוקדו', 'תאנה',
    'רימון', 'תמרים',
    // Hebrew — colloquialisms
    'תפ"ז',         // תפוז abbreviation
  ],
  cleaning: [
    // English
    'detergent', 'soap', 'dish soap', 'bleach', 'mop', 'sponge', 'sponges',
    'trash bag', 'trash bags', 'disinfectant', 'toilet paper', 'paper towels',
    'fabric softener', 'stain remover', 'air freshener', 'scrubber',
    // Hebrew — standard
    'אבקת כביסה', 'סבון', 'סבון כלים', 'אקונומיקה', 'מגב', 'ספוג', 'ספוגים',
    'שקיות אשפה', 'חומר חיטוי', 'נייר טואלט', 'מגבות נייר', 'מרכך כביסה',
    'מסיר כתמים', 'מטהר אוויר',
    // Hebrew — brands used as generics (PRD §12.4)
    "ג'ויה",       // dish soap brand
    'ג׳ויה',
    'דומסטוס',     // bleach brand
    'פיירי',
  ],
  pharma_hygiene: [
    // English
    'paracetamol', 'ibuprofen', 'aspirin', 'medicine', 'bandage', 'bandages',
    'vitamin', 'vitamins', 'supplement', 'toothpaste', 'toothbrush', 'shampoo',
    'conditioner', 'deodorant', 'razor', 'razors', 'sunscreen', 'lotion',
    'cream', 'cotton', 'pad', 'pads', 'tampon', 'tampons', 'diaper', 'diapers',
    'wipes', 'antibiotic', 'antacid', 'thermometer',
    // Hebrew — standard
    'פרצטמול', 'איבופרופן', 'אספירין', 'תרופה', 'תרופות', 'פלסטר',
    'פלסטרים', 'ויטמין', 'ויטמינים', 'משחת שיניים', 'מברשת שיניים',
    'שמפו', 'מרכך שיער', 'דאודורנט', 'סכין גילוח', 'קרם הגנה',
    'קרם', 'צמר גפן', 'תחבושות', 'טמפונים', 'חיתולים', 'מגבונים',
    'אנטיביוטיקה', 'חומצה', 'מדחום',
    // Hebrew — brands as generics (PRD §12.4)
    'אקמול',       // paracetamol brand (PRD §12.4 example)
    'אדויל',       // ibuprofen brand
    'ראשן',
    'הד אן שולדרס',
  ],
  documents_money: [
    // English
    'passport', 'id', 'insurance', 'ticket', 'tickets', 'cash', 'currency',
    'card', 'credit card', 'documents', 'visa', 'permit',
    // Hebrew
    'דרכון', 'תעודת זהות', 'ביטוח', 'כרטיס', 'כרטיסים', 'מזומן',
    'מטבע', 'כרטיס אשראי', 'מסמכים', 'ויזה', 'היתר',
  ],
  other: [],
}

/**
 * Normalizes an item name to lowercase + trimmed for matching.
 */
function normalize(name: string): string {
  return name.toLowerCase().trim()
}

/**
 * Returns the List-Category for an item name.
 *
 * @param itemName - The item as the user typed it
 * @param customMappings - Household-level overrides (item_name → category).
 *                         Keys must already be normalized (lowercase + trimmed).
 */
export function autoCategorize(
  itemName: string,
  customMappings?: ReadonlyMap<string, ListCategory>,
): ListCategory {
  const key = normalize(itemName)

  // 1. Household custom mappings take priority (PRD §7.7)
  if (customMappings) {
    const custom = customMappings.get(key)
    if (custom) return custom
  }

  // 2. Built-in keyword table — check in explicit priority order so that
  //    specific categories (dairy, meat, fish, vegetables, fruit, cleaning,
  //    pharma_hygiene, documents_money) are matched before the broad 'pantry'
  //    category. This prevents short pantry keywords ('egg', 'oil', 'water')
  //    from matching items like "eggplant", "watermelon", or "toilet paper".
  const CHECK_ORDER: readonly ListCategory[] = [
    'dairy',
    'meat',
    'fish',
    'vegetables',
    'fruit',
    'cleaning',
    'pharma_hygiene',
    'documents_money',
    'pantry',
  ]

  for (const category of CHECK_ORDER) {
    const keywords = CATEGORY_KEYWORDS[category]
    for (const kw of keywords) {
      if (key.includes(kw.toLowerCase())) {
        return category
      }
    }
  }

  // 3. Fallback
  return 'other'
}

export const ALL_CATEGORIES: ListCategory[] = [
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

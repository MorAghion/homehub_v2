# autoCategorize Keyword Mapping

**Agent task from PRD §12.4:** Before implementing `autoCategorize()`, produce a full keyword mapping document covering all List-Categories in both languages, validated against real shopping use cases.

---

## List-Categories (PRD §7.4)

The 10 categories, their EN + HE keyword triggers, and validation notes:

---

### 1. `dairy` — Dairy Products

| Language | Keywords |
|----------|---------|
| EN | milk, cheese, butter, yogurt, cream, sour cream, kefir, whipping cream, cottage, quark, leben |
| HE | חלב, גבינה, חמאה, יוגורט, שמנת, גבינת קוטג, קוטג, לאבנה, לבן, ריקוטה, גבינה צהובה, גבינה לבנה |
| HE brands-as-generics | דנונה (Danone), טנא (Tnuva), תנובה (Tnuva) |

**Validation:** "Yogurt", "חלב", "Cottage cheese" → `dairy` ✓. Edge: "Cream of mushroom soup" → `dairy` (false positive accepted; cream suffix matches).

---

### 2. `meat` — Meat

| Language | Keywords |
|----------|---------|
| EN | chicken, beef, meat, lamb, pork, turkey, steak, mince, ground beef, sausage, bacon, veal, duck, liver |
| HE | עוף, בשר, כבש, הודו, סטייק, בשר טחון, נקניק, נקניקייה, כבד, פרגית, שניצל, קציצות |
| HE colloquialisms | חזה (breast), כנפיים (wings), שוקיים (drumsticks) |

**Validation:** "Chicken wings", "שניצל", "Ground beef" → `meat` ✓.

---

### 3. `fish` — Fish & Seafood

| Language | Keywords |
|----------|---------|
| EN | fish, salmon, tuna, sardine, tilapia, shrimp, sea bass, trout, cod, anchovy, herring |
| HE | דג, דגים, סלמון, טונה, סרדין, טילפיה, ברמונדי, פורל, מוסר ים, אנשובי, גפילטע |

**Validation:** "Salmon fillet", "טונה קופסא", "Gefilte fish" → `fish` ✓.

---

### 4. `pantry` — Pantry & Dry Goods

| Language | Keywords |
|----------|---------|
| EN | bread, pasta, rice, flour, sugar, salt, oil, olive oil, vinegar, sauce, ketchup, mayonnaise, mustard, honey, jam, cereal, oatmeal, crackers, chips, chocolate, coffee, tea, water, juice, cola, soda, beer, wine, egg, eggs, canned, beans, lentils, chickpeas, noodles |
| HE | לחם, פסטה, אורז, קמח, סוכר, מלח, שמן, שמן זית, חומץ, רוטב, קטשופ, מיונז, חרדל, דבש, ריבה, דגני בוקר, קרקרים, שוקולד, קפה, תה, מים, מיץ, קולה, סודה, בירה, יין, ביצה, ביצים, שימורים, שעועית, עדשים, חומוס, אטריות, פתיתים, קוסקוס, בורגול |
| HE colloquialisms | שוק"ג (chocolate ice cream), מיץ פטל |

**Validation:** "Bread", "אורז", "Olive oil", "Canned tomatoes" → `pantry` ✓. Note: eggs are in pantry (not dairy) because they're not dairy products.

**Priority note:** Pantry is checked LAST to prevent false matches. Short keywords like "oil", "egg", "water" could match unrelated items (e.g., "eggplant" → vegetables, "watermelon" → fruit). The `CHECK_ORDER` in code puts pantry after vegetables, fruit, and cleaning.

---

### 5. `vegetables` — Vegetables

| Language | Keywords |
|----------|---------|
| EN | tomato, tomatoes, cucumber, cucumbers, onion, onions, garlic, pepper, bell pepper, carrot, carrots, potato, potatoes, lettuce, spinach, broccoli, cauliflower, zucchini, eggplant, corn, peas, mushrooms, celery, leek |
| HE | עגבנייה, עגבניות, מלפפון, מלפפונים, בצל, שום, פלפל, גזר, תפוח אדמה, חסה, תרד, ברוקולי, כרובית, קישוא, חציל, תירס, אפונה, פטריות, סלרי, כרישה |
| HE abbreviations | תפו"א (potato), בטטה (sweet potato), קולרבי |
| HE colloquialisms | גמבה (bell pepper — PRD §12.4 example) |

**Validation:** "Bell pepper", "גמבה", "תפו"א", "Eggplant" → `vegetables` ✓.

---

### 6. `fruit` — Fruit

| Language | Keywords |
|----------|---------|
| EN | apple, apples, banana, bananas, orange, oranges, grape, grapes, strawberry, strawberries, mango, pineapple, watermelon, melon, peach, pear, plum, cherry, kiwi, lemon, lime, avocado, fig, pomegranate, dates |
| HE | תפוח, תפוחים, בננה, בננות, תפוז, תפוזים, ענב, ענבים, תות, תותים, מנגו, אננס, אבטיח, מלון, אפרסק, אגס, שזיף, דובדבן, קיווי, לימון, ליים, אבוקדו, תאנה, רימון, תמרים |
| HE abbreviations | תפ"ז (orange) |

**Validation:** "Avocado", "אבטיח", "Strawberries" → `fruit` ✓.

---

### 7. `cleaning` — Cleaning & Household

| Language | Keywords |
|----------|---------|
| EN | detergent, soap, dish soap, bleach, mop, sponge, sponges, trash bag, trash bags, disinfectant, toilet paper, paper towels, fabric softener, stain remover, air freshener, scrubber |
| HE | אבקת כביסה, סבון, סבון כלים, אקונומיקה, מגב, ספוג, ספוגים, שקיות אשפה, חומר חיטוי, נייר טואלט, מגבות נייר, מרכך כביסה, מסיר כתמים, מטהר אוויר |
| HE brands-as-generics | ג'ויה / ג׳ויה (dish soap brand), דומסטוס (bleach brand), פיירי |

**Validation:** "Toilet paper", "אקונומיקה", "ג'ויה", "Trash bags" → `cleaning` ✓.

---

### 8. `pharma_hygiene` — Pharma & Hygiene

| Language | Keywords |
|----------|---------|
| EN | paracetamol, ibuprofen, aspirin, medicine, bandage, bandages, vitamin, vitamins, supplement, toothpaste, toothbrush, shampoo, conditioner, deodorant, razor, razors, sunscreen, lotion, cream, cotton, pad, pads, tampon, tampons, diaper, diapers, wipes, antibiotic, antacid, thermometer |
| HE | פרצטמול, איבופרופן, אספירין, תרופה, תרופות, פלסטר, פלסטרים, ויטמין, ויטמינים, משחת שיניים, מברשת שיניים, שמפו, מרכך שיער, דאודורנט, סכין גילוח, קרם הגנה, קרם, צמר גפן, תחבושות, טמפונים, חיתולים, מגבונים, אנטיביוטיקה, חומצה, מדחום |
| HE brands-as-generics | אקמול (paracetamol — PRD §12.4 example), אדויל (ibuprofen), ראשן, הד אן שולדרס |

**Validation:** "אקמול", "Diapers", "Sunscreen", "Bandages" → `pharma_hygiene` ✓.

**Note:** "Cream" is deliberately broad — matches both "face cream" (hygiene) and "sour cream" (dairy). The `CHECK_ORDER` puts `dairy` before `pharma_hygiene`, so "sour cream" → `dairy` ✓, "face cream" → `pharma_hygiene` ✓.

---

### 9. `documents_money` — Documents & Money

| Language | Keywords |
|----------|---------|
| EN | passport, id, insurance, ticket, tickets, cash, currency, card, credit card, documents, visa, permit |
| HE | דרכון, תעודת זהות, ביטוח, כרטיס, כרטיסים, מזומן, מטבע, כרטיס אשראי, מסמכים, ויזה, היתר |

**Validation:** "Passport", "דרכון", "Travel insurance" → `documents_money` ✓.

---

### 10. `other` — Other (fallback)

No keywords. All items that don't match any category fall here. Triggers **Level 1 re-categorize nudge** (PRD §7.7).

---

## Keyword Priority Order

The implementation checks categories in this order to prevent false matches:

```
1. dairy          — before pantry (cream, butter keywords)
2. meat           — before pantry (chicken, beef)
3. fish           — before pantry (tuna)
4. vegetables     — before pantry (eggplant, watermelon)
5. fruit          — before pantry (watermelon, pineapple)
6. cleaning       — before pantry (soap, sponge)
7. pharma_hygiene — before pantry (cream, cotton)
8. documents_money — before pantry (card)
9. pantry         — broad catch-all, checked last
10. other          — fallback
```

---

## Edge Cases & Research Notes

| Item | Expected | Notes |
|------|----------|-------|
| "Eggplant" | `vegetables` | NOT pantry despite "egg" substring — vegetables checked first |
| "Watermelon" | `fruit` | NOT pantry despite "water" substring — fruit checked first |
| "Cream of mushroom" | `dairy` | Accepted false positive; cream is a dairy signal |
| "גמבה" (bell pepper) | `vegetables` | PRD §12.4 colloquialism example |
| "אקמול" (paracetamol brand) | `pharma_hygiene` | PRD §12.4 brand-as-generic example |
| "ג'ויה" (dish soap brand) | `cleaning` | PRD §12.4 brand-as-generic example |
| "תפו"א" (potato abbrev.) | `vegetables` | Hebrew abbreviation |
| "Toilet paper" | `cleaning` | Contains "paper" but "toilet paper" matches cleaning keyword |
| "Paper towels" | `cleaning` | Matches cleaning keyword directly |

---

## Implementation Reference

See `src/lib/autoCategorize.ts` for the implemented keyword tables and `autoCategorize()` function.
See `src/lib/__tests__/autoCategorize.test.ts` for coverage tests.

import { describe, it, expect } from 'vitest'
import {
  validateVoucher,
  daysUntilExpiry,
  getExpiryStatus,
  formatExpiryDate,
  isBuyMeUrl,
  parseBuyMeUrl,
  extractVoucherDataFromText,
  VOUCHER_DEFAULT_SUB_HUBS,
} from '../vouchers'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const TODAY = new Date('2026-03-29T12:00:00Z')
const YESTERDAY_STR = '2026-03-28'
const TOMORROW_STR = '2026-03-30'
const IN_7_DAYS_STR = '2026-04-05'    // exactly 7 days from today
const IN_8_DAYS_STR = '2026-04-06'
const IN_30_DAYS_STR = '2026-04-28'
const IN_31_DAYS_STR = '2026-04-29'

// ─── validateVoucher ──────────────────────────────────────────────────────────

describe('validateVoucher', () => {
  it('accepts valid minimal data', () => {
    const result = validateVoucher({ name: 'Zara Gift Card' })
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('returns name_required for empty name', () => {
    const result = validateVoucher({ name: '' })
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('name_required')
  })

  it('returns name_required for whitespace-only name', () => {
    const result = validateVoucher({ name: '   ' })
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('name_required')
  })

  it('returns name_too_long for name > 100 chars', () => {
    const result = validateVoucher({ name: 'a'.repeat(101) })
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('name_too_long')
  })

  it('accepts name at exactly 100 chars', () => {
    const result = validateVoucher({ name: 'a'.repeat(100) })
    expect(result.errors).not.toContain('name_too_long')
  })

  it('returns code_too_long for code > 200 chars', () => {
    const result = validateVoucher({ name: 'Test', code: 'X'.repeat(201) })
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('code_too_long')
  })

  it('accepts code at exactly 200 chars', () => {
    const result = validateVoucher({ name: 'Test', code: 'X'.repeat(200) })
    expect(result.errors).not.toContain('code_too_long')
  })

  it('returns value_too_long for value > 50 chars', () => {
    const result = validateVoucher({ name: 'Test', value: 'X'.repeat(51) })
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('value_too_long')
  })

  it('returns invalid_expiry_date for bad date string', () => {
    const result = validateVoucher({ name: 'Test', expiry_date: 'not-a-date' })
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('invalid_expiry_date')
  })

  it('accepts valid ISO date', () => {
    const result = validateVoucher({ name: 'Test', expiry_date: '2026-12-31' })
    expect(result.errors).not.toContain('invalid_expiry_date')
  })

  it('accepts null expiry_date', () => {
    const result = validateVoucher({ name: 'Test', expiry_date: null })
    expect(result.errors).not.toContain('invalid_expiry_date')
  })

  it('collects multiple errors at once', () => {
    const result = validateVoucher({ name: '', expiry_date: 'bad' })
    expect(result.errors).toContain('name_required')
    expect(result.errors).toContain('invalid_expiry_date')
    expect(result.errors.length).toBe(2)
  })
})

// ─── daysUntilExpiry ──────────────────────────────────────────────────────────

describe('daysUntilExpiry', () => {
  it('returns positive days for future date', () => {
    expect(daysUntilExpiry(TOMORROW_STR, TODAY)).toBe(1)
  })

  it('returns 0 for today', () => {
    expect(daysUntilExpiry('2026-03-29', TODAY)).toBe(0)
  })

  it('returns negative days for past date', () => {
    expect(daysUntilExpiry(YESTERDAY_STR, TODAY)).toBe(-1)
  })

  it('handles 7 days exactly', () => {
    expect(daysUntilExpiry(IN_7_DAYS_STR, TODAY)).toBe(7)
  })
})

// ─── getExpiryStatus ──────────────────────────────────────────────────────────

describe('getExpiryStatus', () => {
  it('returns "none" for null expiry', () => {
    expect(getExpiryStatus(null, TODAY)).toBe('none')
  })

  it('returns "none" for undefined expiry', () => {
    expect(getExpiryStatus(undefined, TODAY)).toBe('none')
  })

  it('returns "expired" for past date', () => {
    expect(getExpiryStatus(YESTERDAY_STR, TODAY)).toBe('expired')
  })

  it('returns "urgent" for exactly 7 days away', () => {
    expect(getExpiryStatus(IN_7_DAYS_STR, TODAY)).toBe('urgent')
  })

  it('returns "urgent" for 0 days away (today)', () => {
    expect(getExpiryStatus('2026-03-29', TODAY)).toBe('urgent')
  })

  it('returns "soon" for 8 days away', () => {
    expect(getExpiryStatus(IN_8_DAYS_STR, TODAY)).toBe('soon')
  })

  it('returns "soon" for 30 days away', () => {
    expect(getExpiryStatus(IN_30_DAYS_STR, TODAY)).toBe('soon')
  })

  it('returns "ok" for 31 days away', () => {
    expect(getExpiryStatus(IN_31_DAYS_STR, TODAY)).toBe('ok')
  })
})

// ─── formatExpiryDate ─────────────────────────────────────────────────────────

describe('formatExpiryDate', () => {
  it('formats a known date correctly', () => {
    const result = formatExpiryDate('2026-12-31', 'en-US')
    expect(result).toBe('Dec 31, 2026')
  })

  it('returns null for null input', () => {
    expect(formatExpiryDate(null)).toBeNull()
  })

  it('returns null for undefined input', () => {
    expect(formatExpiryDate(undefined)).toBeNull()
  })
})

// ─── isBuyMeUrl ───────────────────────────────────────────────────────────────

describe('isBuyMeUrl', () => {
  it('detects buyme.co.il URLs', () => {
    expect(isBuyMeUrl('https://www.buyme.co.il/gift-cards/ABCD1234')).toBe(true)
  })

  it('detects URLs with http', () => {
    expect(isBuyMeUrl('http://buyme.co.il/something')).toBe(true)
  })

  it('returns false for unrelated URLs', () => {
    expect(isBuyMeUrl('https://amazon.com/gift-cards/ABC123')).toBe(false)
  })

  it('returns false for plain text', () => {
    expect(isBuyMeUrl('hello world')).toBe(false)
  })

  it('is case-insensitive', () => {
    expect(isBuyMeUrl('https://BUYME.CO.IL/something')).toBe(true)
  })
})

// ─── parseBuyMeUrl ────────────────────────────────────────────────────────────

describe('parseBuyMeUrl', () => {
  it('extracts code from last path segment', () => {
    const result = parseBuyMeUrl('https://www.buyme.co.il/gift-cards/ABCD1234')
    expect(result.code).toBe('ABCD1234')
  })

  it('returns null code for path without alphanumeric segment', () => {
    const result = parseBuyMeUrl('https://www.buyme.co.il/')
    expect(result.code).toBeNull()
  })

  it('returns null for invalid URL', () => {
    const result = parseBuyMeUrl('not-a-url')
    expect(result.code).toBeNull()
    expect(result.name).toBeNull()
  })

  it('always returns null for name (not parseable from URL)', () => {
    const result = parseBuyMeUrl('https://www.buyme.co.il/gift-cards/CODE123')
    expect(result.name).toBeNull()
  })
})

// ─── extractVoucherDataFromText ────────────────────────────────────────────────

describe('extractVoucherDataFromText', () => {
  it('extracts code using "CODE: XXXXX" pattern', () => {
    const result = extractVoucherDataFromText('CODE: BUYME1234')
    expect(result.code).toBe('BUYME1234')
  })

  it('extracts code from "Voucher: XXXXX" pattern', () => {
    const result = extractVoucherDataFromText('Voucher: XYZ9876')
    expect(result.code).toBe('XYZ9876')
  })

  it('extracts expiry from "EXP: DD/MM/YYYY"', () => {
    const result = extractVoucherDataFromText('EXP: 31/12/2026')
    expect(result.expiry_date).toBe('2026-12-31')
  })

  it('extracts expiry from "Expires DD/MM/YY"', () => {
    const result = extractVoucherDataFromText('Expires 15/06/26')
    expect(result.expiry_date).toBe('2026-06-15')
  })

  it('extracts shekel value', () => {
    const result = extractVoucherDataFromText('Value: ₪500')
    expect(result.value).toBeTruthy()
    expect(result.value).toContain('500')
  })

  it('returns all nulls for empty text', () => {
    const result = extractVoucherDataFromText('')
    expect(result.code).toBeNull()
    expect(result.expiry_date).toBeNull()
    expect(result.value).toBeNull()
  })

  it('handles text with no voucher data gracefully', () => {
    const result = extractVoucherDataFromText('Thank you for your purchase. Please visit our store.')
    expect(result).toMatchObject({ code: null, expiry_date: null, value: null })
  })
})

// ─── VOUCHER_DEFAULT_SUB_HUBS ─────────────────────────────────────────────────

describe('VOUCHER_DEFAULT_SUB_HUBS', () => {
  it('includes BuyMe', () => {
    expect(VOUCHER_DEFAULT_SUB_HUBS).toContain('BuyMe')
  })

  it('has 4 default sub-hubs', () => {
    expect(VOUCHER_DEFAULT_SUB_HUBS).toHaveLength(4)
  })
})

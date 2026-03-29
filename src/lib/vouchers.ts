/**
 * Voucher business logic — pure utility functions.
 *
 * Contains: validation, expiry helpers, BuyMe smart-paste parser, OCR stub.
 * No React, no Supabase — pure functions, fully testable.
 */

import type { ExpiryStatus, VoucherFormData } from '../types/vouchers'

// ─── Validation ───────────────────────────────────────────────────────────────

export type VoucherValidationError =
  | 'name_required'
  | 'name_too_long'
  | 'code_too_long'
  | 'value_too_long'
  | 'invalid_expiry_date'

export interface VoucherValidationResult {
  valid: boolean
  errors: VoucherValidationError[]
}

export function validateVoucher(
  data: Partial<VoucherFormData>,
): VoucherValidationResult {
  const errors: VoucherValidationError[] = []

  if (!data.name || data.name.trim().length === 0) {
    errors.push('name_required')
  } else if (data.name.trim().length > 100) {
    errors.push('name_too_long')
  }

  if (data.code && data.code.length > 200) {
    errors.push('code_too_long')
  }

  if (data.value && data.value.length > 50) {
    errors.push('value_too_long')
  }

  if (data.expiry_date !== null && data.expiry_date !== undefined) {
    if (!isValidISODate(data.expiry_date)) {
      errors.push('invalid_expiry_date')
    }
  }

  return { valid: errors.length === 0, errors }
}

function isValidISODate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const d = new Date(value + 'T00:00:00Z')
  return !isNaN(d.getTime())
}

// ─── Expiry helpers ────────────────────────────────────────────────────────────

/**
 * Days until expiry (negative = already expired).
 * Returns null when expiry_date is null/undefined.
 */
export function daysUntilExpiry(expiryDate: string, now: Date = new Date()): number {
  const expiry = new Date(expiryDate + 'T00:00:00Z')
  const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  const expiryUtc = expiry.getTime()
  return Math.floor((expiryUtc - todayUtc) / (1000 * 60 * 60 * 24))
}

/**
 * Maps an expiry_date to a display status.
 * Thresholds: expired (<0), urgent (≤7), soon (≤30), ok (>30), none (no date).
 */
export function getExpiryStatus(
  expiryDate: string | null | undefined,
  now: Date = new Date(),
): ExpiryStatus {
  if (!expiryDate) return 'none'
  const days = daysUntilExpiry(expiryDate, now)
  if (days < 0) return 'expired'
  if (days <= 7) return 'urgent'
  if (days <= 30) return 'soon'
  return 'ok'
}

/**
 * Formats an expiry date for display (e.g. "Apr 5, 2026").
 * Returns null when expiryDate is null/undefined.
 */
export function formatExpiryDate(
  expiryDate: string | null | undefined,
  locale = 'en-US',
): string | null {
  if (!expiryDate) return null
  const d = new Date(expiryDate + 'T00:00:00Z')
  if (isNaN(d.getTime())) return null
  return d.toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

// ─── BuyMe Smart Paste ────────────────────────────────────────────────────────

/**
 * Parsed data extracted from a BuyMe gift card URL.
 */
export interface BuyMeParsedData {
  code: string | null
  name: string | null
}

/**
 * Detects whether a string is a BuyMe URL.
 * BuyMe gift card URLs typically follow: https://www.buyme.co.il/gift-cards/...
 */
export function isBuyMeUrl(text: string): boolean {
  return /buyme\.co\.il/i.test(text)
}

/**
 * Parses a BuyMe URL to extract voucher data.
 * Returns { code, name } — any field may be null if not extractable.
 *
 * BuyMe URL example: https://www.buyme.co.il/gift-cards/ABCD1234
 * The last path segment is treated as the voucher code.
 */
export function parseBuyMeUrl(url: string): BuyMeParsedData {
  try {
    const parsed = new URL(url)
    const segments = parsed.pathname.split('/').filter(Boolean)
    const lastSegment = segments[segments.length - 1] ?? null

    // Last segment is the code if it looks like one (alphanumeric, 4-20 chars)
    const code =
      lastSegment && /^[A-Z0-9]{4,20}$/i.test(lastSegment) ? lastSegment : null

    return { code, name: null }
  } catch {
    return { code: null, name: null }
  }
}

// ─── OCR (Tesseract.js stub) ───────────────────────────────────────────────────

/**
 * Extracts structured voucher data from raw OCR text.
 *
 * NOTE: This function processes text already extracted by Tesseract.js.
 * The Tesseract.js integration is in the useVouchers hook, not here.
 * This function is a pure text parser — fully testable without a browser.
 */
export interface OcrExtractedData {
  code: string | null
  expiry_date: string | null   // ISO YYYY-MM-DD if found
  value: string | null
}

/**
 * Attempts to extract voucher code, expiry date, and value from OCR text.
 *
 * Patterns searched:
 *   - Code: "CODE: XXXXX", "Voucher: XXXXX", "Gift Card: XXXXX", or standalone alphanumeric 8–20 chars
 *   - Expiry: "EXP: DD/MM/YYYY", "Valid until DD/MM/YYYY", "Expires DD/MM/YYYY"
 *   - Value: "₪NNN", "$NNN", "€NNN", "NNN NIS", "NNN ILS"
 */
export function extractVoucherDataFromText(text: string): OcrExtractedData {
  const result: OcrExtractedData = { code: null, expiry_date: null, value: null }

  if (!text || text.trim().length === 0) return result

  // ── Code extraction ──────────────────────────────────────────────────────
  const codePatterns = [
    /(?:code|voucher|gift\s*card|coupon)[:\s]+([A-Z0-9\-]{4,20})/i,
    /\b([A-Z0-9]{8,20})\b/,
  ]
  for (const pattern of codePatterns) {
    const m = text.match(pattern)
    if (m?.[1]) {
      result.code = m[1].trim()
      break
    }
  }

  // ── Expiry date extraction ─────────────────────────────────────────────
  const expiryPatterns = [
    /(?:exp(?:iry|ires?)?|valid\s*until|use\s*by)[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
    /\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\b/,
  ]
  for (const pattern of expiryPatterns) {
    const m = text.match(pattern)
    if (m?.[1]) {
      const iso = parseDateToISO(m[1])
      if (iso) {
        result.expiry_date = iso
        break
      }
    }
  }

  // ── Value extraction ────────────────────────────────────────────────────
  const valuePattern =
    /(?:₪|NIS|\$|€|GBP|ILS)\s*(\d+(?:[.,]\d{1,2})?)|(\d+(?:[.,]\d{1,2})?)\s*(?:₪|NIS|ILS)/i
  const vm = text.match(valuePattern)
  if (vm) {
    result.value = vm[0].trim()
  }

  return result
}

/** Converts common date formats to ISO YYYY-MM-DD. Returns null if unparseable. */
function parseDateToISO(dateStr: string): string | null {
  // Normalise separators
  const parts = dateStr.split(/[\/\-]/)
  if (parts.length !== 3) return null

  const [a, b, c] = parts.map((p) => parseInt(p, 10))
  if (a === undefined || b === undefined || c === undefined) return null
  if (isNaN(a) || isNaN(b) || isNaN(c)) return null

  // Determine year
  let year: number
  let month: number
  let day: number

  if (c > 31) {
    // DD/MM/YYYY
    year = c
    month = b
    day = a
  } else if (a > 31) {
    // YYYY/MM/DD
    year = a
    month = b
    day = c
  } else {
    // Ambiguous — assume DD/MM/YY
    year = c < 100 ? 2000 + c : c
    month = b
    day = a
  }

  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  const d = new Date(iso + 'T00:00:00Z')
  return isNaN(d.getTime()) ? null : iso
}

// ─── Sub-Hub defaults ─────────────────────────────────────────────────────────

/**
 * Default Sub-Hub template names for the Vouchers hub.
 * PRD §9.4
 */
export const VOUCHER_DEFAULT_SUB_HUBS = [
  'BuyMe',
  'Shopping Vouchers',
  'Digital Cards',
  'Physical Cards',
] as const

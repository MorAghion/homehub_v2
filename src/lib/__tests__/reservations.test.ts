import { describe, it, expect } from 'vitest'
import {
  validateReservation,
  getReservationStatus,
  formatReservationDateBlock,
  sortReservations,
  RESERVATION_DEFAULT_SUB_HUBS,
} from '../reservations'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const TODAY = new Date('2026-03-29T12:00:00Z')
const YESTERDAY_STR = '2026-03-28'
const TOMORROW_STR = '2026-03-30'
const TODAY_STR = '2026-03-29'

// ─── validateReservation ──────────────────────────────────────────────────────

describe('validateReservation', () => {
  it('accepts valid minimal data', () => {
    const result = validateReservation({ restaurant_name: 'Manta Ray' })
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('returns name_required for empty restaurant_name', () => {
    const result = validateReservation({ restaurant_name: '' })
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('name_required')
  })

  it('returns name_required for whitespace-only name', () => {
    const result = validateReservation({ restaurant_name: '   ' })
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('name_required')
  })

  it('returns name_too_long for name > 100 chars', () => {
    const result = validateReservation({ restaurant_name: 'a'.repeat(101) })
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('name_too_long')
  })

  it('accepts name at exactly 100 chars', () => {
    const result = validateReservation({ restaurant_name: 'a'.repeat(100) })
    expect(result.errors).not.toContain('name_too_long')
  })

  it('returns invalid_date for bad date string', () => {
    const result = validateReservation({
      restaurant_name: 'Test',
      reservation_date: 'not-a-date',
    })
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('invalid_date')
  })

  it('accepts valid ISO date', () => {
    const result = validateReservation({
      restaurant_name: 'Test',
      reservation_date: '2026-04-05',
    })
    expect(result.errors).not.toContain('invalid_date')
  })

  it('accepts null reservation_date', () => {
    const result = validateReservation({
      restaurant_name: 'Test',
      reservation_date: null,
    })
    expect(result.errors).not.toContain('invalid_date')
  })

  it('returns party_size_invalid for party_size = 0', () => {
    const result = validateReservation({
      restaurant_name: 'Test',
      party_size: 0,
    })
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('party_size_invalid')
  })

  it('returns party_size_invalid for party_size > 100', () => {
    const result = validateReservation({
      restaurant_name: 'Test',
      party_size: 101,
    })
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('party_size_invalid')
  })

  it('accepts party_size = 1', () => {
    const result = validateReservation({
      restaurant_name: 'Test',
      party_size: 1,
    })
    expect(result.errors).not.toContain('party_size_invalid')
  })

  it('accepts party_size = 100', () => {
    const result = validateReservation({
      restaurant_name: 'Test',
      party_size: 100,
    })
    expect(result.errors).not.toContain('party_size_invalid')
  })

  it('returns notes_too_long for notes > 500 chars', () => {
    const result = validateReservation({
      restaurant_name: 'Test',
      notes: 'a'.repeat(501),
    })
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('notes_too_long')
  })

  it('collects multiple errors at once', () => {
    const result = validateReservation({
      restaurant_name: '',
      reservation_date: 'bad',
      party_size: 0,
    })
    expect(result.errors).toContain('name_required')
    expect(result.errors).toContain('invalid_date')
    expect(result.errors).toContain('party_size_invalid')
    expect(result.errors.length).toBe(3)
  })
})

// ─── getReservationStatus ─────────────────────────────────────────────────────

describe('getReservationStatus', () => {
  it('returns "upcoming" for a future date', () => {
    expect(getReservationStatus(TOMORROW_STR, TODAY)).toBe('upcoming')
  })

  it('returns "upcoming" for today', () => {
    expect(getReservationStatus(TODAY_STR, TODAY)).toBe('upcoming')
  })

  it('returns "past" for yesterday', () => {
    expect(getReservationStatus(YESTERDAY_STR, TODAY)).toBe('past')
  })

  it('returns "upcoming" for null date (no date = treat as upcoming)', () => {
    expect(getReservationStatus(null, TODAY)).toBe('upcoming')
  })

  it('returns "upcoming" for undefined date', () => {
    expect(getReservationStatus(undefined, TODAY)).toBe('upcoming')
  })
})

// ─── formatReservationDateBlock ───────────────────────────────────────────────

describe('formatReservationDateBlock', () => {
  it('formats a known date into day + month', () => {
    const result = formatReservationDateBlock('2026-04-05', 'en-US')
    expect(result).not.toBeNull()
    expect(result!.day).toBe('05')
    expect(result!.month).toBe('APR')
  })

  it('returns null for null date', () => {
    expect(formatReservationDateBlock(null)).toBeNull()
  })

  it('returns null for undefined date', () => {
    expect(formatReservationDateBlock(undefined)).toBeNull()
  })
})

// ─── sortReservations ─────────────────────────────────────────────────────────

describe('sortReservations', () => {
  it('places upcoming before past', () => {
    const items = [
      { reservation_date: YESTERDAY_STR },
      { reservation_date: TOMORROW_STR },
    ]
    const sorted = sortReservations(items, TODAY)
    expect(sorted[0]!.reservation_date).toBe(TOMORROW_STR)
    expect(sorted[1]!.reservation_date).toBe(YESTERDAY_STR)
  })

  it('sorts upcoming ascending (nearest first)', () => {
    const items = [
      { reservation_date: '2026-04-10' },
      { reservation_date: '2026-04-01' },
      { reservation_date: '2026-05-01' },
    ]
    const sorted = sortReservations(items, TODAY)
    expect(sorted[0]!.reservation_date).toBe('2026-04-01')
    expect(sorted[1]!.reservation_date).toBe('2026-04-10')
    expect(sorted[2]!.reservation_date).toBe('2026-05-01')
  })

  it('sorts past descending (most recent past first)', () => {
    const items = [
      { reservation_date: '2026-03-01' },
      { reservation_date: '2026-03-20' },
      { reservation_date: '2026-02-01' },
    ]
    const sorted = sortReservations(items, TODAY)
    expect(sorted[0]!.reservation_date).toBe('2026-03-20')
    expect(sorted[1]!.reservation_date).toBe('2026-03-01')
    expect(sorted[2]!.reservation_date).toBe('2026-02-01')
  })

  it('does not mutate the input array', () => {
    const items = [
      { reservation_date: YESTERDAY_STR },
      { reservation_date: TOMORROW_STR },
    ]
    const original = [...items]
    sortReservations(items, TODAY)
    expect(items[0]!.reservation_date).toBe(original[0]!.reservation_date)
  })

  it('returns empty array for empty input', () => {
    expect(sortReservations([], TODAY)).toEqual([])
  })

  it('treats null date as upcoming and puts it after dated upcoming items', () => {
    const items = [
      { reservation_date: null },
      { reservation_date: TOMORROW_STR },
    ]
    const sorted = sortReservations(items, TODAY)
    // TOMORROW_STR is upcoming and should sort before null (null sorts last within upcoming)
    expect(sorted[0]!.reservation_date).toBe(TOMORROW_STR)
  })
})

// ─── RESERVATION_DEFAULT_SUB_HUBS ─────────────────────────────────────────────

describe('RESERVATION_DEFAULT_SUB_HUBS', () => {
  it('includes Ontopo', () => {
    expect(RESERVATION_DEFAULT_SUB_HUBS).toContain('Ontopo')
  })

  it('has 2 default sub-hubs', () => {
    expect(RESERVATION_DEFAULT_SUB_HUBS).toHaveLength(2)
  })
})

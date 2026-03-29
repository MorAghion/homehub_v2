/**
 * Reservations business logic — pure utility functions.
 *
 * Contains: validation, date helpers, status computation.
 * No React, no Supabase — pure functions, fully testable.
 */

import type { ReservationFormData, ReservationStatus } from '../types/reservations'

// ─── Validation ───────────────────────────────────────────────────────────────

export type ReservationValidationError =
  | 'name_required'
  | 'name_too_long'
  | 'invalid_date'
  | 'party_size_invalid'
  | 'notes_too_long'

export interface ReservationValidationResult {
  valid: boolean
  errors: ReservationValidationError[]
}

export function validateReservation(
  data: Partial<ReservationFormData>,
): ReservationValidationResult {
  const errors: ReservationValidationError[] = []

  if (!data.restaurant_name || data.restaurant_name.trim().length === 0) {
    errors.push('name_required')
  } else if (data.restaurant_name.trim().length > 100) {
    errors.push('name_too_long')
  }

  if (data.reservation_date !== null && data.reservation_date !== undefined) {
    if (!isValidISODate(data.reservation_date)) {
      errors.push('invalid_date')
    }
  }

  if (data.party_size !== null && data.party_size !== undefined) {
    if (
      !Number.isInteger(data.party_size) ||
      data.party_size < 1 ||
      data.party_size > 100
    ) {
      errors.push('party_size_invalid')
    }
  }

  if (data.notes && data.notes.length > 500) {
    errors.push('notes_too_long')
  }

  return { valid: errors.length === 0, errors }
}

function isValidISODate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const d = new Date(value + 'T00:00:00Z')
  return !isNaN(d.getTime())
}

// ─── Status helpers ────────────────────────────────────────────────────────────

/**
 * Returns 'upcoming' or 'past' for a reservation based on its date.
 * A reservation with no date is treated as 'upcoming'.
 */
export function getReservationStatus(
  reservationDate: string | null | undefined,
  now: Date = new Date(),
): ReservationStatus {
  if (!reservationDate) return 'upcoming'
  const date = new Date(reservationDate + 'T00:00:00Z')
  const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  return date.getTime() >= todayUtc ? 'upcoming' : 'past'
}

/**
 * Formats a reservation date into { day, month } for the date block.
 * Returns null when reservationDate is null/undefined.
 */
export function formatReservationDateBlock(
  reservationDate: string | null | undefined,
  locale = 'en-US',
): { day: string; month: string } | null {
  if (!reservationDate) return null
  const d = new Date(reservationDate + 'T00:00:00Z')
  if (isNaN(d.getTime())) return null
  return {
    day: d.toLocaleDateString(locale, { day: '2-digit', timeZone: 'UTC' }),
    month: d.toLocaleDateString(locale, { month: 'short', timeZone: 'UTC' }).toUpperCase(),
  }
}

/**
 * Sorts reservations: upcoming first (ascending by date), past last (descending by date).
 * Does not mutate the input array.
 */
export function sortReservations<T extends { reservation_date: string | null }>(
  reservations: T[],
  now: Date = new Date(),
): T[] {
  const upcoming: T[] = []
  const past: T[] = []

  for (const r of reservations) {
    if (getReservationStatus(r.reservation_date, now) === 'upcoming') {
      upcoming.push(r)
    } else {
      past.push(r)
    }
  }

  const asc = (a: T, b: T): number => {
    if (!a.reservation_date) return 1
    if (!b.reservation_date) return -1
    return new Date(a.reservation_date).getTime() - new Date(b.reservation_date).getTime()
  }

  const desc = (a: T, b: T): number => {
    if (!a.reservation_date) return -1
    if (!b.reservation_date) return 1
    return new Date(b.reservation_date).getTime() - new Date(a.reservation_date).getTime()
  }

  return [...upcoming.sort(asc), ...past.sort(desc)]
}

// ─── Sub-Hub defaults ─────────────────────────────────────────────────────────

/**
 * Default Sub-Hub template names for the Reservations hub.
 * PRD §10.3
 */
export const RESERVATION_DEFAULT_SUB_HUBS = [
  'Ontopo',
  'Movies & Shows',
] as const

/**
 * Reservation domain types.
 * Derived from the reservations table in the DB schema (PRD §5).
 */

export interface Reservation {
  id: string
  sub_hub_id: string
  household_id: string
  restaurant_name: string
  reservation_date: string | null  // ISO date: YYYY-MM-DD
  party_size: number | null
  notes: string | null
  image_url: string | null
  smart_paste_url: string | null
  created_at: string
  updated_at: string
}

export type ReservationFormData = Pick<
  Reservation,
  'restaurant_name' | 'reservation_date' | 'party_size' | 'notes' | 'smart_paste_url'
> & {
  image_file?: File | null
}

export type ReservationStatus = 'upcoming' | 'past'

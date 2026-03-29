/**
 * Reservation and ReservationList domain types.
 * Derived from the DB schema in PRD_v3.md §5.4
 */

export interface ReservationList {
  id: string
  household_id: string
  name: string
  created_at: string
  updated_at: string
}

export interface Reservation {
  id: string
  household_id: string
  name: string                   // restaurant / venue name
  event_date: string | null      // ISO date string "YYYY-MM-DD"
  time: string | null            // e.g. "19:30"
  address: string | null
  party_size: number | null
  image_url: string | null       // Supabase Storage URL
  notes: string | null
  list_id: string | null         // Sub-Hub grouping
  created_by: string | null
  created_at: string
  updated_at: string
}

export type ReservationInput = Pick<Reservation, 'name' | 'event_date' | 'time' | 'address' | 'party_size' | 'notes'>

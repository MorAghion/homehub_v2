/**
 * Voucher and VoucherList domain types.
 * Derived from the DB schema in PRD_v3.md §5.4
 */

export interface VoucherList {
  id: string
  household_id: string
  name: string
  created_at: string
  updated_at: string
}

export interface Voucher {
  id: string
  household_id: string
  name: string
  value: string | null        // e.g. "₪500"
  issuer: string | null       // e.g. "BuyMe"
  expiry_date: string | null  // ISO date string "YYYY-MM-DD"
  code: string | null
  image_url: string | null    // Supabase Storage URL
  notes: string | null
  list_id: string | null      // Sub-Hub grouping (not in base schema — added for UI)
  created_by: string | null
  created_at: string
  updated_at: string
}

export type VoucherInput = Pick<Voucher, 'name' | 'value' | 'issuer' | 'expiry_date' | 'code' | 'notes'>

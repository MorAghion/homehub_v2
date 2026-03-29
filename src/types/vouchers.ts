/**
 * Voucher domain types.
 * Derived from the vouchers table in the DB schema (PRD §5).
 */

export interface Voucher {
  id: string
  sub_hub_id: string
  household_id: string
  name: string
  code: string | null
  expiry_date: string | null  // ISO date: YYYY-MM-DD
  value: string | null
  image_url: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type VoucherFormData = Pick<
  Voucher,
  'name' | 'code' | 'expiry_date' | 'value' | 'notes'
> & {
  image_file?: File | null
}

export type ExpiryStatus = 'expired' | 'urgent' | 'soon' | 'ok' | 'none'

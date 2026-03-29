export type BillStatus = 'pending' | 'paid' | 'ignored'
export type BillCurrency = 'ILS' | 'USD' | 'EUR'

export interface Bill {
  id: string
  household_id: string
  vendor: string
  vendor_id: string | null
  category: string | null
  amount: number
  currency: BillCurrency
  date: string             // ISO date string YYYY-MM-DD
  status: BillStatus
  gmail_message_id: string | null
  created_at: string
  updated_at: string
}

export type BillInput = Pick<Bill, 'vendor' | 'amount' | 'currency' | 'date'> &
  Partial<Pick<Bill, 'vendor_id' | 'category' | 'gmail_message_id'>>

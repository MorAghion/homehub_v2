/**
 * SubHub domain type.
 * Derived from the sub_hubs table in the DB schema.
 */

export type HubType = 'shopping' | 'tasks' | 'vouchers' | 'reservations'

export interface SubHub {
  id: string
  household_id: string
  hub_type: HubType
  name: string
  position: number
  created_at: string
}

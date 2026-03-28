/**
 * User and household domain types.
 * Derived from the DB schema in PRD_v3.md §5.
 */

export type UserRole = 'owner' | 'member'

export interface Household {
  id: string
  name: string
  created_at: string
}

export interface UserProfile {
  id: string
  household_id: string
  display_name: string
  role: UserRole
  created_at: string
}

/** A household member as returned by the settings query (joined with auth.users for email). */
export interface HouseholdMember {
  id: string
  display_name: string
  role: UserRole
  email: string
}

/** Gmail OAuth connection status for the current user (from oauth_tokens table). */
export interface GmailConnectionStatus {
  connected: boolean
  /** Gmail email address, if connected. */
  email: string | null
}

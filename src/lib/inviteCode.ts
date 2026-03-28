/**
 * inviteCode — validation helpers for household invite codes.
 *
 * PRD §6.3, §6.6, §5.1:
 * - Format: 8-character alphanumeric string
 * - Expiry: 24 hours from creation (expires_at stored on the record)
 * - Single-use: used_by / used_at must be null
 * - Rate limiting enforced elsewhere (5 failed attempts → 15-min lockout)
 */

/** The shape of a row from `household_invites`. */
export interface InviteRecord {
  invite_code: string
  expires_at: string      // ISO-8601 timestamp
  used_by: string | null  // UUID or null
  used_at: string | null  // ISO-8601 timestamp or null
}

export type InviteValidationError =
  | 'invalid_format'   // not 8 alphanumeric chars
  | 'expired'          // expires_at is in the past
  | 'already_used'     // used_by is not null

export interface InviteValidationResult {
  valid: boolean
  error?: InviteValidationError
}

/** Regex: exactly 8 alphanumeric characters (case-insensitive). */
const INVITE_CODE_REGEX = /^[A-Za-z0-9]{8}$/

/**
 * Validates the format of a raw invite code string.
 * Does not touch the database — purely structural check.
 */
export function validateInviteCodeFormat(code: string): boolean {
  return INVITE_CODE_REGEX.test(code)
}

/**
 * Full validation of an invite code against a database record.
 * Returns `{ valid: true }` only when all three conditions pass:
 *  1. Format is 8 alphanumeric chars
 *  2. Record has not expired (expires_at > now)
 *  3. Record has not been used (used_by is null)
 *
 * @param code   - Raw code string entered by the user
 * @param record - The matching row from `household_invites`
 * @param now    - Current timestamp (injectable for testing; defaults to Date.now())
 */
export function validateInviteCode(
  code: string,
  record: InviteRecord,
  now: number = Date.now(),
): InviteValidationResult {
  if (!validateInviteCodeFormat(code)) {
    return { valid: false, error: 'invalid_format' }
  }

  if (new Date(record.expires_at).getTime() <= now) {
    return { valid: false, error: 'expired' }
  }

  if (record.used_by !== null) {
    return { valid: false, error: 'already_used' }
  }

  return { valid: true }
}

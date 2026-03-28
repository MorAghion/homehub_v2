import { describe, it, expect } from 'vitest'
import {
  validateInviteCodeFormat,
  validateInviteCode,
  type InviteRecord,
} from '../inviteCode'

// ─── Helper factory ───────────────────────────────────────────────────────────

const NOW = new Date('2026-03-28T12:00:00Z').getTime()

function makeRecord(overrides: Partial<InviteRecord> = {}): InviteRecord {
  return {
    invite_code: 'ABCD1234',
    expires_at: new Date(NOW + 60 * 60 * 1000).toISOString(), // +1 hour (valid)
    used_by: null,
    used_at: null,
    ...overrides,
  }
}

// ─── validateInviteCodeFormat ─────────────────────────────────────────────────

describe('validateInviteCodeFormat — valid formats', () => {
  it('accepts exactly 8 alphanumeric uppercase chars', () => {
    expect(validateInviteCodeFormat('ABCD1234')).toBe(true)
  })

  it('accepts 8 lowercase alphanumeric chars', () => {
    expect(validateInviteCodeFormat('abcd1234')).toBe(true)
  })

  it('accepts mixed-case 8-char code', () => {
    expect(validateInviteCodeFormat('Ab3Cd5Ef')).toBe(true)
  })

  it('accepts all-digit 8-char code', () => {
    expect(validateInviteCodeFormat('12345678')).toBe(true)
  })

  it('accepts all-letter 8-char code', () => {
    expect(validateInviteCodeFormat('ABCDEFGH')).toBe(true)
  })
})

describe('validateInviteCodeFormat — invalid formats', () => {
  it('rejects code shorter than 8 chars', () => {
    expect(validateInviteCodeFormat('ABC123')).toBe(false)
    expect(validateInviteCodeFormat('')).toBe(false)
    expect(validateInviteCodeFormat('A')).toBe(false)
  })

  it('rejects code longer than 8 chars', () => {
    expect(validateInviteCodeFormat('ABCD12345')).toBe(false)
    expect(validateInviteCodeFormat('ABCDEFGHI')).toBe(false)
  })

  it('rejects code with special characters', () => {
    expect(validateInviteCodeFormat('ABCD-234')).toBe(false)
    expect(validateInviteCodeFormat('ABCD 234')).toBe(false)
    expect(validateInviteCodeFormat('ABCD_234')).toBe(false)
    expect(validateInviteCodeFormat('ABCD.234')).toBe(false)
  })

  it('rejects code with unicode / Hebrew characters', () => {
    expect(validateInviteCodeFormat('ABCD123א')).toBe(false)
    expect(validateInviteCodeFormat('אבגד1234')).toBe(false)
  })

  it('rejects whitespace-only or whitespace-padded', () => {
    expect(validateInviteCodeFormat('ABCD123 ')).toBe(false)
    expect(validateInviteCodeFormat(' ABCD123')).toBe(false)
  })
})

// ─── validateInviteCode — valid path ─────────────────────────────────────────

describe('validateInviteCode — valid code', () => {
  it('returns { valid: true } for a fresh, unexpired, unused code', () => {
    const result = validateInviteCode('ABCD1234', makeRecord(), NOW)
    expect(result).toEqual({ valid: true })
  })

  it('accepts code that expires in exactly 1 second', () => {
    const record = makeRecord({ expires_at: new Date(NOW + 1000).toISOString() })
    const result = validateInviteCode('ABCD1234', record, NOW)
    expect(result.valid).toBe(true)
  })

  it('does not require error field on valid result', () => {
    const result = validateInviteCode('ABCD1234', makeRecord(), NOW)
    expect('error' in result).toBe(false)
  })
})

// ─── validateInviteCode — format failures ────────────────────────────────────

describe('validateInviteCode — format validation', () => {
  it('returns invalid_format for a 6-char code', () => {
    const result = validateInviteCode('ABCD12', makeRecord({ invite_code: 'ABCD12' }), NOW)
    expect(result.valid).toBe(false)
    expect(result.error).toBe('invalid_format')
  })

  it('returns invalid_format for a 9-char code', () => {
    const result = validateInviteCode('ABCD12345', makeRecord(), NOW)
    expect(result.valid).toBe(false)
    expect(result.error).toBe('invalid_format')
  })

  it('returns invalid_format for a code with hyphens', () => {
    const result = validateInviteCode('ABCD-234', makeRecord(), NOW)
    expect(result.valid).toBe(false)
    expect(result.error).toBe('invalid_format')
  })

  it('returns invalid_format for empty string', () => {
    const result = validateInviteCode('', makeRecord(), NOW)
    expect(result.valid).toBe(false)
    expect(result.error).toBe('invalid_format')
  })
})

// ─── validateInviteCode — expiry (PRD §6.6: 24-hour expiry) ──────────────────

describe('validateInviteCode — expiry (PRD §6.6)', () => {
  it('returns expired when expires_at is in the past', () => {
    const record = makeRecord({ expires_at: new Date(NOW - 1000).toISOString() })
    const result = validateInviteCode('ABCD1234', record, NOW)
    expect(result.valid).toBe(false)
    expect(result.error).toBe('expired')
  })

  it('returns expired when expires_at == now (boundary: exactly expired)', () => {
    const record = makeRecord({ expires_at: new Date(NOW).toISOString() })
    const result = validateInviteCode('ABCD1234', record, NOW)
    expect(result.valid).toBe(false)
    expect(result.error).toBe('expired')
  })

  it('returns expired when code is 24h + 1s old', () => {
    const createdAt = NOW - (24 * 60 * 60 * 1000 + 1000)
    const record = makeRecord({
      expires_at: new Date(createdAt + 24 * 60 * 60 * 1000).toISOString(),
    })
    const result = validateInviteCode('ABCD1234', record, NOW)
    expect(result.valid).toBe(false)
    expect(result.error).toBe('expired')
  })

  it('is valid when code is exactly 23h 59m old (within 24h window)', () => {
    const expiresAt = NOW + 1 * 60 * 1000 // expires in 1 minute
    const record = makeRecord({ expires_at: new Date(expiresAt).toISOString() })
    const result = validateInviteCode('ABCD1234', record, NOW)
    expect(result.valid).toBe(true)
  })
})

// ─── validateInviteCode — single-use (PRD §6.6) ───────────────────────────────

describe('validateInviteCode — single-use (PRD §6.6)', () => {
  it('returns already_used when used_by is set', () => {
    const record = makeRecord({
      used_by: 'some-uuid-here',
      used_at: new Date(NOW - 3600000).toISOString(),
    })
    const result = validateInviteCode('ABCD1234', record, NOW)
    expect(result.valid).toBe(false)
    expect(result.error).toBe('already_used')
  })

  it('returns already_used when used_by is set but code is not yet expired', () => {
    const record = makeRecord({
      expires_at: new Date(NOW + 23 * 60 * 60 * 1000).toISOString(),
      used_by: 'another-uuid',
      used_at: new Date(NOW - 60000).toISOString(),
    })
    const result = validateInviteCode('ABCD1234', record, NOW)
    expect(result.valid).toBe(false)
    expect(result.error).toBe('already_used')
  })

  it('is valid when used_by is null (not yet used)', () => {
    const record = makeRecord({ used_by: null })
    const result = validateInviteCode('ABCD1234', record, NOW)
    expect(result.valid).toBe(true)
  })
})

// ─── validateInviteCode — error priority ─────────────────────────────────────

describe('validateInviteCode — error priority', () => {
  it('format error reported before expiry check', () => {
    const record = makeRecord({ expires_at: new Date(NOW - 1000).toISOString() })
    // invalid format AND expired — format should be reported
    const result = validateInviteCode('BAD', record, NOW)
    expect(result.error).toBe('invalid_format')
  })

  it('format error reported before used check', () => {
    const record = makeRecord({ used_by: 'some-uuid' })
    const result = validateInviteCode('BAD', record, NOW)
    expect(result.error).toBe('invalid_format')
  })

  it('expiry reported before used check when both fail', () => {
    const record = makeRecord({
      expires_at: new Date(NOW - 1000).toISOString(),
      used_by: 'some-uuid',
    })
    const result = validateInviteCode('ABCD1234', record, NOW)
    expect(result.error).toBe('expired')
  })
})

// ─── validateInviteCode — default `now` parameter ────────────────────────────

describe('validateInviteCode — default now (wall clock)', () => {
  it('works without a "now" argument (uses Date.now())', () => {
    // Code expires far in the future — should be valid right now
    const record = makeRecord({
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      used_by: null,
    })
    const result = validateInviteCode('ABCD1234', record)
    expect(result.valid).toBe(true)
  })
})

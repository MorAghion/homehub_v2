/**
 * useSettings — hook for Settings page data and mutations.
 *
 * Provides:
 *   - Current user profile + household info + members
 *   - Gmail connection status
 *   - Invite code generation
 *   - Sign out
 *   - Account deletion (member / owner-with-members / solo-owner flows)
 *   - Household deletion (owner only)
 *   - Ownership transfer
 */

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type {
  GmailConnectionStatus,
  Household,
  HouseholdMember,
  UserProfile,
} from '../types/user'

export interface GeneratedInviteCode {
  code: string
  expiresAt: string // ISO-8601
}

export interface SettingsData {
  profile: UserProfile | null
  household: Household | null
  members: HouseholdMember[]
  gmail: GmailConnectionStatus
  isLoading: boolean
  error: string | null
}

export interface SettingsMutations {
  generateInviteCode: () => Promise<GeneratedInviteCode>
  connectGmail: () => Promise<void>
  disconnectGmail: () => Promise<void>
  transferOwnership: (newOwnerId: string) => Promise<void>
  deleteAccount: () => Promise<void>
  deleteHousehold: () => Promise<void>
  signOut: () => Promise<void>
}

export function useSettings(): SettingsData & SettingsMutations {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [household, setHousehold] = useState<Household | null>(null)
  const [members, setMembers] = useState<HouseholdMember[]>([])
  const [gmail, setGmail] = useState<GmailConnectionStatus>({
    connected: false,
    email: null,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // -------------------------------------------------------------------------
  // Initial data load
  // -------------------------------------------------------------------------

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        setIsLoading(true)
        setError(null)

        const {
          data: { user },
          error: authErr,
        } = await supabase.auth.getUser()
        if (authErr || !user) throw authErr ?? new Error('Not authenticated')

        // Load user profile
        const { data: profileData, error: profileErr } = await supabase
          .from('user_profiles')
          .select('id, household_id, display_name, role, created_at')
          .eq('id', user.id)
          .single()
        if (profileErr) throw profileErr

        // Load household
        const { data: householdData, error: householdErr } = await supabase
          .from('households')
          .select('id, name, created_at')
          .eq('id', profileData.household_id)
          .single()
        if (householdErr) throw householdErr

        // Load members (join user_profiles + auth.users email via RPC or view)
        // The DB exposes a household_members_view that joins user_profiles with auth.users.
        const { data: membersData, error: membersErr } = await supabase
          .from('household_members_view')
          .select('id, display_name, role, email')
          .eq('household_id', profileData.household_id)
        if (membersErr) throw membersErr

        // Load Gmail connection status from oauth_tokens
        const { data: tokenData } = await supabase
          .from('oauth_tokens')
          .select('provider_email')
          .eq('user_id', user.id)
          .eq('provider', 'google')
          .maybeSingle()

        if (!cancelled) {
          setProfile(profileData as UserProfile)
          setHousehold(householdData as Household)
          setMembers((membersData ?? []) as HouseholdMember[])
          setGmail({
            connected: tokenData !== null,
            email: tokenData?.provider_email ?? null,
          })
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load settings')
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  // -------------------------------------------------------------------------
  // Mutations
  // -------------------------------------------------------------------------

  const generateInviteCode = useCallback(async (): Promise<GeneratedInviteCode> => {
    const { data, error: rpcErr } = await supabase.rpc('create_household_invite')
    if (rpcErr) throw rpcErr
    // RPC returns { invite_code: string, expires_at: string }
    return {
      code: (data as { invite_code: string; expires_at: string }).invite_code,
      expiresAt: (data as { invite_code: string; expires_at: string }).expires_at,
    }
  }, [])

  const connectGmail = useCallback(async (): Promise<void> => {
    // Trigger the gmail-auth Edge Function OAuth redirect.
    // The Edge Function returns a redirect URL to the Google consent screen.
    const { data, error: fnErr } = await supabase.functions.invoke('gmail-auth', {
      body: { action: 'get_auth_url' },
    })
    if (fnErr) throw fnErr
    const authUrl = (data as { auth_url: string }).auth_url
    // Open in popup per PRD §3.3 (skipBrowserRedirect pattern)
    window.open(authUrl, 'gmail-auth', 'width=600,height=700,popup=yes')
  }, [])

  const disconnectGmail = useCallback(async (): Promise<void> => {
    const { error: fnErr } = await supabase.functions.invoke('gmail-disconnect')
    if (fnErr) throw fnErr
    setGmail({ connected: false, email: null })
  }, [])

  const transferOwnership = useCallback(
    async (newOwnerId: string): Promise<void> => {
      const { error: rpcErr } = await supabase.rpc('transfer_household_ownership', {
        new_owner_id: newOwnerId,
      })
      if (rpcErr) throw rpcErr
    },
    [],
  )

  const deleteAccount = useCallback(async (): Promise<void> => {
    const { error: rpcErr } = await supabase.rpc('delete_my_account')
    if (rpcErr) throw rpcErr
    // Supabase session is now invalid; sign out locally
    await supabase.auth.signOut()
  }, [])

  const deleteHousehold = useCallback(async (): Promise<void> => {
    const { error: rpcErr } = await supabase.rpc('delete_household')
    if (rpcErr) throw rpcErr
    await supabase.auth.signOut()
  }, [])

  const signOut = useCallback(async (): Promise<void> => {
    await supabase.auth.signOut()
  }, [])

  return {
    profile,
    household,
    members,
    gmail,
    isLoading,
    error,
    generateInviteCode,
    connectGmail,
    disconnectGmail,
    transferOwnership,
    deleteAccount,
    deleteHousehold,
    signOut,
  }
}

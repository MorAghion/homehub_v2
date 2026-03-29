import { createContext, useContext, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Household, UserProfile } from '../types/user'

const PENDING_INVITE_KEY = 'homehub-pending-invite'

interface AuthContextValue {
  session: Session | null
  profile: UserProfile | null
  household: Household | null
  isLoading: boolean
  /** True when user is signed in but has no household yet. */
  needsHousehold: boolean
  signOut: () => Promise<void>
  /** Refresh profile + household from DB (e.g. after joining a household). */
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  profile: null,
  household: null,
  isLoading: true,
  needsHousehold: false,
  signOut: async () => {},
  refreshProfile: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [household, setHousehold] = useState<Household | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    void supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s)
      if (!s) setIsLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      if (!s) {
        setProfile(null)
        setHousehold(null)
        setIsLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function loadProfile(userId: string): Promise<void> {
    try {
      const { data: profileData, error: profileErr } = await supabase
        .from('user_profiles')
        .select('id, household_id, display_name, role, created_at')
        .eq('id', userId)
        .single()
      if (profileErr || !profileData) return

      const typedProfile = profileData as UserProfile

      // If household_id is null and there's a pending invite, attempt to join.
      if (!typedProfile.household_id) {
        const pendingInvite = localStorage.getItem(PENDING_INVITE_KEY)
        if (pendingInvite) {
          const { error: rpcErr } = await supabase.rpc('join_household_via_invite', {
            p_code: pendingInvite,
          })
          if (!rpcErr) {
            localStorage.removeItem(PENDING_INVITE_KEY)
            // Reload profile after join
            const { data: refreshed } = await supabase
              .from('user_profiles')
              .select('id, household_id, display_name, role, created_at')
              .eq('id', userId)
              .single()
            if (refreshed) {
              const refreshedProfile = refreshed as UserProfile
              setProfile(refreshedProfile)
              if (refreshedProfile.household_id) {
                const { data: householdData } = await supabase
                  .from('households')
                  .select('id, name, created_at')
                  .eq('id', refreshedProfile.household_id)
                  .single()
                setHousehold(householdData as Household | null)
              }
              return
            }
          } else {
            // RPC failed — leave pending invite, show error via needsHousehold guard
            localStorage.removeItem(PENDING_INVITE_KEY)
          }
        }
        // No household — set profile without household
        setProfile(typedProfile)
        setHousehold(null)
        return
      }

      const { data: householdData } = await supabase
        .from('households')
        .select('id, name, created_at')
        .eq('id', typedProfile.household_id)
        .single()

      setProfile(typedProfile)
      setHousehold(householdData as Household | null)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!session) return

    let cancelled = false
    setIsLoading(true)

    void loadProfile(session.user.id).then(() => {
      if (cancelled) {
        setProfile(null)
        setHousehold(null)
        setIsLoading(false)
      }
    })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session])

  async function signOut() {
    await supabase.auth.signOut()
  }

  async function refreshProfile() {
    if (!session) return
    await loadProfile(session.user.id)
  }

  const needsHousehold = !!session && !isLoading && !!profile && !profile.household_id

  return (
    <AuthContext.Provider
      value={{ session, profile, household, isLoading, needsHousehold, signOut, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useSession() {
  return useContext(AuthContext)
}

import { createContext, useContext, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Household, UserProfile } from '../types/user'

interface AuthContextValue {
  session: Session | null
  profile: UserProfile | null
  household: Household | null
  isLoading: boolean
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  profile: null,
  household: null,
  isLoading: true,
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [household, setHousehold] = useState<Household | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    void supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s)
      if (!s) setIsLoading(false)
    })

    // Subscribe to auth state changes
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

  useEffect(() => {
    if (!session) return

    let cancelled = false

    async function loadProfile() {
      try {
        const { data: profileData, error: profileErr } = await supabase
          .from('user_profiles')
          .select('id, household_id, display_name, role, created_at')
          .eq('id', session!.user.id)
          .single()
        if (profileErr || !profileData) return

        const { data: householdData } = await supabase
          .from('households')
          .select('id, name, created_at')
          .eq('id', (profileData as UserProfile).household_id)
          .single()

        if (!cancelled) {
          setProfile(profileData as UserProfile)
          setHousehold(householdData as Household | null)
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void loadProfile()
    return () => {
      cancelled = true
    }
  }, [session])

  return (
    <AuthContext.Provider value={{ session, profile, household, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useSession() {
  return useContext(AuthContext)
}

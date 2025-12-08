'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/lib/types/database'

type WebUser = Database['public']['Tables']['web_users']['Row'] & {
  profile?: {
    full_name: string | null
    avatar_url: string | null
    unit: string | null
    police_id: string | null
  }
}

interface AuthContextType {
  user: User | null
  webUser: WebUser | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ webUser: WebUser | null; error: Error | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [webUser, setWebUser] = useState<WebUser | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  // Helper to clear auth state
  const clearAuth = useCallback(() => {
    setUser(null)
    setSession(null)
    setWebUser(null)
  }, [])

  // Helper to fetch web user
  const fetchWebUser = useCallback(async (supabase: ReturnType<typeof createClient>, userId: string) => {
    try {
      const { data, error } = await supabase
        .from('web_users')
        .select(`
          *,
          profile:profiles (
            full_name,
            avatar_url,
            unit,
            police_id
          )
        `)
        .eq('profile_id', userId)
        .single()

      if (error) return null
      return data
    } catch {
      return null
    }
  }, [])

  // Initialize auth on mount
  useEffect(() => {
    const supabase = createClient()
    let isMounted = true

    const init = async () => {
      try {
        // Race between getUser and a timeout to prevent infinite loading
        const userPromise = supabase.auth.getUser()
        const timeoutPromise = new Promise<{ data: { user: null }, error: Error }>((resolve) => {
          setTimeout(() => resolve({ data: { user: null }, error: new Error('Auth timeout') }), 8000)
        })

        const { data: { user: validUser }, error } = await Promise.race([userPromise, timeoutPromise])

        if (!isMounted) return

        // If there's an auth error, timeout, or no user - clear and sign out
        if (error || !validUser) {
          // Sign out to clear any bad tokens
          await supabase.auth.signOut().catch(() => { })
          clearAuth()
          setLoading(false)
          return
        }

        // Get the session for the valid user
        const { data: { session: currentSession } } = await supabase.auth.getSession()

        if (!isMounted) return

        setUser(validUser)
        setSession(currentSession)

        // Fetch web user data
        const wu = await fetchWebUser(supabase, validUser.id)
        if (isMounted && wu) {
          setWebUser(wu)
        }
      } catch {
        if (isMounted) {
          // Sign out to clear any bad tokens
          await supabase.auth.signOut().catch(() => { })
          clearAuth()
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    init()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!isMounted) return
        if (event === 'INITIAL_SESSION') return

        // Handle token refresh failure - clear auth and redirect
        if (event === 'TOKEN_REFRESHED' && !newSession) {
          clearAuth()
          return
        }

        // Handle sign out
        if (event === 'SIGNED_OUT') {
          clearAuth()
          return
        }

        setSession(newSession)
        setUser(newSession?.user ?? null)

        if (newSession?.user) {
          const wu = await fetchWebUser(supabase, newSession.user.id)
          if (isMounted) {
            setWebUser(wu)
          }
        } else {
          setWebUser(null)
        }
      }
    )

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [clearAuth, fetchWebUser])

  const signIn = useCallback(async (email: string, password: string) => {
    const supabase = createClient()

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error || !data.user) {
      return { webUser: null, error: error || new Error('Sign in failed') }
    }

    const { data: wu, error: wuError } = await supabase
      .from('web_users')
      .select(`
        *,
        profile:profiles (
          full_name,
          avatar_url,
          unit,
          police_id
        )
      `)
      .eq('profile_id', data.user.id)
      .single()

    if (wuError) {
      return { webUser: null, error: new Error('Không tìm thấy vai trò người dùng.') }
    }

    setUser(data.user)
    setSession(data.session)
    setWebUser(wu)

    return { webUser: wu, error: null }
  }, [])

  const signOut = useCallback(async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    setUser(null)
    setSession(null)
    setWebUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, webUser, session, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

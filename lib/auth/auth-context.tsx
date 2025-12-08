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

  // Initialize auth on mount
  useEffect(() => {
    const supabase = createClient()
    let isMounted = true

    // Force loading to false after 3 seconds no matter what
    const forceTimeout = setTimeout(() => {
      if (isMounted && loading) {
        console.warn('[Auth] Force timeout - stopping loading')
        setLoading(false)
      }
    }, 3000)

    const init = async () => {
      try {
        // Get current session
        const { data: { session: currentSession } } = await supabase.auth.getSession()

        if (!isMounted) return

        if (currentSession?.user) {
          setSession(currentSession)
          setUser(currentSession.user)

          // Try to fetch web user (don't block on this)
          const { data: wu } = await supabase
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
            .eq('profile_id', currentSession.user.id)
            .single()

          if (isMounted && wu) {
            setWebUser(wu)
          }
        }
      } catch (err) {
        console.error('[Auth] Init error:', err)
      } finally {
        if (isMounted) {
          clearTimeout(forceTimeout)
          setLoading(false)
        }
      }
    }

    init()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!isMounted) return

        // Ignore INITIAL_SESSION - we handle that above
        if (event === 'INITIAL_SESSION') return

        console.log('[Auth] State changed:', event)

        setSession(newSession)
        setUser(newSession?.user ?? null)

        if (newSession?.user) {
          const { data: wu } = await supabase
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
            .eq('profile_id', newSession.user.id)
            .single()

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
      clearTimeout(forceTimeout)
      subscription.unsubscribe()
    }
  }, [])

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

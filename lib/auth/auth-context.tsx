'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { User, Session, AuthChangeEvent } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/lib/types/database'

type WebUser = Database['public']['Tables']['web_users']['Row']

interface AuthContextType {
  user: User | null
  webUser: WebUser | null
  session: Session | null
  loading: boolean
  initialized: boolean
  signIn: (email: string, password: string) => Promise<{ webUser: WebUser | null; error: Error | null }>
  signOut: () => Promise<void>
  refreshWebUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Create supabase client as singleton
const supabase = createClient()

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [webUser, setWebUser] = useState<WebUser | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [initialized, setInitialized] = useState(false)

  // Fetch web user data from database - simple direct query
  const fetchWebUser = useCallback(async (userId: string): Promise<WebUser | null> => {
    try {
      const { data, error } = await supabase
        .from('web_users')
        .select('*')
        .eq('profile_id', userId)
        .single()

      if (error) {
        console.error('Error fetching web_user:', error.message)
        return null
      }
      return data
    } catch (error) {
      console.error('Unexpected error in fetchWebUser:', error)
      return null
    }
  }, [])

  // Initialize auth state
  useEffect(() => {
    let mounted = true

    const initializeAuth = async () => {
      try {
        // Get initial session
        const { data: { session: initialSession }, error } = await supabase.auth.getSession()

        if (error) {
          console.error('Error getting session:', error.message)
          if (mounted) {
            setLoading(false)
            setInitialized(true)
          }
          return
        }

        if (mounted) {
          setSession(initialSession)
          setUser(initialSession?.user ?? null)

          if (initialSession?.user) {
            const webUserData = await fetchWebUser(initialSession.user.id)
            if (mounted) {
              setWebUser(webUserData)
            }
          }

          setLoading(false)
          setInitialized(true)
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
        if (mounted) {
          setLoading(false)
          setInitialized(true)
        }
      }
    }

    initializeAuth()

    // Listen for auth state changes (sign in, sign out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, newSession: Session | null) => {
        if (!mounted) return

        // Skip INITIAL_SESSION as we handle it above with getSession()
        if (event === 'INITIAL_SESSION') {
          return
        }

        console.log('Auth state changed:', event)

        setSession(newSession)
        setUser(newSession?.user ?? null)

        if (newSession?.user) {
          // For token refresh, preserve existing webUser if re-fetch fails
          const isTokenRefresh = event === 'TOKEN_REFRESHED'
          const webUserData = await fetchWebUser(newSession.user.id)

          if (mounted) {
            if (webUserData) {
              setWebUser(webUserData)
            } else if (!isTokenRefresh) {
              // Only clear webUser on sign-in failure, not on token refresh failure
              setWebUser(null)
            }
            // If token refresh and webUserData is null, keep existing webUser
          }
        } else {
          // User signed out
          setWebUser(null)
        }

        // Make sure loading is false after any auth change
        setLoading(false)
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [fetchWebUser])

  const signIn = useCallback(async (email: string, password: string) => {
    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error || !data.user) {
        setLoading(false)
        return { webUser: null, error: error || new Error('Sign in failed') }
      }

      // Fetch web user data after successful login
      const { data: webUserData, error: webUserError } = await supabase
        .from('web_users')
        .select('*')
        .eq('profile_id', data.user.id)
        .single()

      if (webUserError) {
        console.error('Error fetching web_user:', webUserError.message)
        setLoading(false)
        return { webUser: null, error: new Error('User role not found. Please contact administrator.') }
      }

      // Update state immediately for faster UI response
      setUser(data.user)
      setSession(data.session)
      setWebUser(webUserData)
      setLoading(false)

      return { webUser: webUserData, error: null }
    } catch (err) {
      console.error('Unexpected error during sign in:', err)
      setLoading(false)
      return { webUser: null, error: new Error('Unexpected error during login') }
    }
  }, [])

  const signOut = useCallback(async () => {
    setLoading(true)
    try {
      await supabase.auth.signOut()
      setUser(null)
      setSession(null)
      setWebUser(null)
    } catch (error) {
      console.error('Error signing out:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  const refreshWebUser = useCallback(async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('web_users')
        .select('*')
        .eq('profile_id', user.id)
        .single()

      if (!error && data) {
        setWebUser(data)
      } else if (error) {
        console.error('Error refreshing web_user:', error.message)
      }
    } catch (error) {
      console.error('Unexpected error refreshing web_user:', error)
    }
  }, [user])

  return (
    <AuthContext.Provider
      value={{
        user,
        webUser,
        session,
        loading,
        initialized,
        signIn,
        signOut,
        refreshWebUser,
      }}
    >
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

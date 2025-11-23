'use client'

import { createContext, useContext, useEffect, useState, useMemo } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/lib/types/database'

type WebUser = Database['public']['Tables']['web_users']['Row']

interface AuthContextType {
  user: User | null
  webUser: WebUser | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  refreshWebUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [webUser, setWebUser] = useState<WebUser | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {


    const fetchWebUser = async (userId: string) => {
      try {
        const { data, error } = await supabase
          .from('web_users')
          .select('*')
          .eq('profile_id', userId)
          .single()

        if (error) {
          console.error('❌ Error fetching web_user:', error)
          setWebUser(null)
        } else if (data) {
          setWebUser(data)
        } else {
          console.warn('⚠️ No web_user data found for user:', userId)
          setWebUser(null)
        }
      } catch (error) {
        console.error('Unexpected error in fetchWebUser:', error)
        setWebUser(null)
      } finally {
        setLoading(false)
      }
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {

      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {

        fetchWebUser(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {

      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {

        await fetchWebUser(session.user.id)
      } else {
        setWebUser(null)
        setLoading(false)
      }
    })

    return () => {

      subscription.unsubscribe()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setWebUser(null)
  }

  const refreshWebUser = async () => {
    if (user) {
      const { data, error } = await supabase
        .from('web_users')
        .select('*')
        .eq('profile_id', user.id)
        .single()

      if (error) {
        console.error('Error refreshing web_user:', error)
      }

      if (!error && data) {

        setWebUser(data)
      }
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        webUser,
        session,
        loading,
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

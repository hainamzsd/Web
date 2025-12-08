'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/lib/types/database'

type WebUser = Database['public']['Tables']['web_users']['Row']

interface AuthContextType {
  user: User | null
  webUser: WebUser | null
  session: Session | null
  signIn: (email: string, password: string) => Promise<{ webUser: WebUser | null; error: Error | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const supabase = createClient()

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [webUser, setWebUser] = useState<WebUser | null>(null)
  const [session, setSession] = useState<Session | null>(null)

  const fetchWebUser = useCallback(async (userId: string): Promise<WebUser | null> => {
    const { data } = await supabase
      .from('web_users')
      .select('*')
      .eq('profile_id', userId)
      .single()
    return data
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      setSession(s)
      setUser(s?.user ?? null)
      if (s?.user) {
        const wu = await fetchWebUser(s.user.id)
        setWebUser(wu)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, s) => {
        setSession(s)
        setUser(s?.user ?? null)
        if (s?.user) {
          const wu = await fetchWebUser(s.user.id)
          setWebUser(wu)
        } else {
          setWebUser(null)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [fetchWebUser])

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error || !data.user) {
      return { webUser: null, error: error || new Error('Sign in failed') }
    }

    const { data: wu, error: wuError } = await supabase
      .from('web_users')
      .select('*')
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
    await supabase.auth.signOut()
    setUser(null)
    setSession(null)
    setWebUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, webUser, session, signIn, signOut }}>
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

'use client'

import { createContext, useContext, useEffect, useState } from 'react'
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

  useEffect(() => {
    const supabase = createClient()

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)

      if (session?.user) {
        supabase
          .from('web_users')
          .select('*, profile:profiles(full_name, avatar_url, unit, police_id)')
          .eq('profile_id', session.user.id)
          .single()
          .then(({ data }) => {
            setWebUser(data)
            setLoading(false)
          })
      } else {
        setLoading(false)
      }
    })

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)

      if (session?.user) {
        supabase
          .from('web_users')
          .select('*, profile:profiles(full_name, avatar_url, unit, police_id)')
          .eq('profile_id', session.user.id)
          .single()
          .then(({ data }) => setWebUser(data))
      } else {
        setWebUser(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error || !data.user) {
      return { webUser: null, error: error || new Error('Sign in failed') }
    }

    const { data: wu, error: wuError } = await supabase
      .from('web_users')
      .select('*, profile:profiles(full_name, avatar_url, unit, police_id)')
      .eq('profile_id', data.user.id)
      .single()

    if (wuError) {
      return { webUser: null, error: new Error('Không tìm thấy vai trò người dùng.') }
    }

    setUser(data.user)
    setSession(data.session)
    setWebUser(wu)

    return { webUser: wu, error: null }
  }

  const signOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    setUser(null)
    setSession(null)
    setWebUser(null)
  }

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

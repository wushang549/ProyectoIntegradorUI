import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase, supabaseConfigError } from './supabaseClient'

type AuthContextValue = {
  session: Session | null
  user: User | null
  loading: boolean
  isConfigured: boolean
  configError: string | null
  signOut: () => Promise<string | null>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }

    let isActive = true

    void supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!isActive) return
        setSession(data.session)
        setUser(data.session?.user ?? null)
        setLoading(false)
      })
      .catch(() => {
        if (!isActive) return
        setLoading(false)
      })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!isActive) return
      setSession(nextSession)
      setUser(nextSession?.user ?? null)
      setLoading(false)
    })

    return () => {
      isActive = false
      subscription.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    if (!supabase) {
      return supabaseConfigError ?? 'Supabase is not configured.'
    }

    const { error } = await supabase.auth.signOut()
    return error?.message ?? null
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        loading,
        isConfigured: Boolean(supabase),
        configError: supabaseConfigError,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider.')
  }

  return context
}

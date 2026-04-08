import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './AuthProvider'

function RouteStatus({ message }: { message: string }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: '24px',
        fontFamily: "'DM Sans', system-ui, sans-serif",
        color: '#334155',
      }}
    >
      {message}
    </div>
  )
}

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const location = useLocation()
  const { user, loading, configError } = useAuth()

  if (loading) {
    return <RouteStatus message="Checking session..." />
  }

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: location.pathname,
          kind: configError ? 'error' : 'info',
          message: configError ?? 'Sign in to continue.',
        }}
      />
    )
  }

  return <>{children}</>
}

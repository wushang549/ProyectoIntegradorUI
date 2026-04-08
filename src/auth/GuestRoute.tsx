import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
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

export default function GuestRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return <RouteStatus message="Checking session..." />
  }

  if (user) {
    return <Navigate to="/chat" replace />
  }

  return <>{children}</>
}

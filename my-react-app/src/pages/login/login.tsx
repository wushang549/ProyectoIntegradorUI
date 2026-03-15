import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import googleIcon from '../../assets/google.png'
import appleIcon from '../../assets/apple.png'
import granulateLogo from '../../assets/granulate-logo-new.png'
import AuthLayout from '../auth/AuthLayout'
import { useAuth } from '../../auth/AuthProvider'
import { supabase, supabaseConfigError } from '../../auth/supabaseClient'
import './login.css'

function readRouteText(state: unknown, field: 'message' | 'from' | 'kind') {
  if (!state || typeof state !== 'object') {
    return ''
  }

  const value = (state as Record<string, unknown>)[field]
  return typeof value === 'string' ? value : ''
}

export default function Login() {
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { configError, isConfigured } = useAuth()

  const infoMessage = readRouteText(location.state, 'message')
  const infoMessageKind = readRouteText(location.state, 'kind') || 'info'
  const redirectPath = readRouteText(location.state, 'from') || '/chat'

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError('')

    if (!email.trim() || !password) {
      setFormError('Enter your email and password to continue.')
      return
    }

    if (!isConfigured || !supabase) {
      setFormError(configError ?? supabaseConfigError ?? 'Supabase is not configured.')
      return
    }

    setIsSubmitting(true)

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    setIsSubmitting(false)

    if (error) {
      setFormError(error.message)
      return
    }

    navigate(redirectPath, { replace: true })
  }

  return (
    <AuthLayout
      footerText="Don't have an account?"
      footerLink={{ to: '/signup', label: 'Sign up' }}
    >
      <Link to="/" className="auth-logo-link" aria-label="Go to home">
        <img className="auth-logo-img" src={granulateLogo} alt="Granulate logo" />
        <span className="auth-brand-name">Granulate</span>
      </Link>

      <h1 className="auth-heading">Welcome back</h1>
      <p className="auth-subtitle">Enter your credentials to access your account.</p>

      <div className="auth-sso-row">
        <button className="auth-sso-btn" type="button" disabled>
          <img className="auth-sso-icon" src={googleIcon} alt="" />
          Google
        </button>
        <button className="auth-sso-btn" type="button" disabled>
          <img className="auth-sso-icon" src={appleIcon} alt="" />
          Apple
        </button>
      </div>

      <div className="auth-divider">
        <span className="auth-divider-line" />
        <span className="auth-divider-text">or</span>
        <span className="auth-divider-line" />
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        {infoMessage && !formError && (
          <p className={`auth-status-message auth-status-message--${infoMessageKind}`} role="status">
            {infoMessage}
          </p>
        )}

        {formError && (
          <p className="auth-status-message auth-status-message--error" role="alert">
            {formError}
          </p>
        )}

        <label className="auth-field">
          <span className="auth-label">Email</span>
          <input
            className="auth-input"
            type="email"
            placeholder="you@company.com"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>

        <div className="auth-field">
          <div className="auth-row">
            <span className="auth-label">Password</span>
            <Link to="/forgot-password" className="auth-forgot">Forgot password?</Link>
          </div>
          <div className="auth-password-wrap">
            <input
              className="auth-input"
              type={showPassword ? 'text' : 'password'}
              placeholder="min 8 chars"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <button
              className="auth-eye-btn"
              type="button"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              onClick={() => setShowPassword((v) => !v)}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
                <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
              </svg>
            </button>
          </div>
        </div>

        <button className="auth-submit" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </AuthLayout>
  )
}

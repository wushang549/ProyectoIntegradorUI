import { useState } from 'react'
import { Link } from 'react-router-dom'
import granulateLogo from '../../assets/granulate-logo-new.png'
import AuthLayout from '../auth/AuthLayout'
import { useAuth } from '../../auth/AuthProvider'
import { supabase, supabaseConfigError } from '../../auth/supabaseClient'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [formError, setFormError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { configError, isConfigured } = useAuth()

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError('')
    setSuccessMessage('')

    if (!email.trim()) {
      setFormError('Enter the email address linked to your account.')
      return
    }

    if (!isConfigured || !supabase) {
      setFormError(configError ?? supabaseConfigError ?? 'Supabase is not configured.')
      return
    }

    setIsSubmitting(true)

    const redirectTo =
      typeof window === 'undefined' ? undefined : `${window.location.origin}/reset-password`

    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      redirectTo ? { redirectTo } : undefined
    )

    setIsSubmitting(false)

    if (error) {
      setFormError(error.message)
      return
    }

    setSuccessMessage('Reset link sent. Check your email to continue.')
  }

  return (
    <AuthLayout
      footerText="Remembered your password?"
      footerLink={{ to: '/login', label: 'Sign in' }}
    >
      <Link to="/" className="auth-logo-link" aria-label="Go to home">
        <img className="auth-logo-img" src={granulateLogo} alt="Granulate logo" />
        <span className="auth-brand-name">Granulate</span>
      </Link>

      <h1 className="auth-heading">Reset your password</h1>
      <p className="auth-subtitle">We will email you a secure link to choose a new password.</p>

      <form className="auth-form" onSubmit={handleSubmit}>
        {successMessage && (
          <p className="auth-status-message auth-status-message--success" role="status">
            {successMessage}
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

        <button className="auth-submit" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Sending link...' : 'Send reset link'}
        </button>
      </form>
    </AuthLayout>
  )
}

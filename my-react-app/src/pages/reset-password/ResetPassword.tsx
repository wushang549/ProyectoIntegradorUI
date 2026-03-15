import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import granulateLogo from '../../assets/granulate-logo-new.png'
import AuthLayout from '../auth/AuthLayout'
import { useAuth } from '../../auth/AuthProvider'
import { supabase, supabaseConfigError } from '../../auth/supabaseClient'

export default function ResetPassword() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [formError, setFormError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const navigate = useNavigate()
  const { configError, isConfigured, loading, user, signOut } = useAuth()

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError('')
    setSuccessMessage('')

    if (!user) {
      setFormError('Open the password reset link from your email to continue.')
      return
    }

    if (password.length < 8) {
      setFormError('Use a password with at least 8 characters.')
      return
    }

    if (password !== confirmPassword) {
      setFormError('Passwords do not match.')
      return
    }

    if (!isConfigured || !supabase) {
      setFormError(configError ?? supabaseConfigError ?? 'Supabase is not configured.')
      return
    }

    setIsSubmitting(true)

    const { error } = await supabase.auth.updateUser({
      password,
    })

    setIsSubmitting(false)

    if (error) {
      setFormError(error.message)
      return
    }

    setSuccessMessage('Password updated. Redirecting to sign in...')
    await signOut()

    navigate('/login', {
      replace: true,
      state: {
        kind: 'success',
        message: 'Password updated. Sign in with your new password.',
      },
    })
  }

  const helperMessage = loading
    ? 'Checking recovery session...'
    : !user
      ? 'Open the password reset link from your email to continue.'
      : ''

  return (
    <AuthLayout
      footerText="Need another reset email?"
      footerLink={{ to: '/forgot-password', label: 'Send another' }}
    >
      <Link to="/" className="auth-logo-link" aria-label="Go to home">
        <img className="auth-logo-img" src={granulateLogo} alt="Granulate logo" />
        <span className="auth-brand-name">Granulate</span>
      </Link>

      <h1 className="auth-heading">Choose a new password</h1>
      <p className="auth-subtitle">Create a new password for your Granulate account.</p>

      <form className="auth-form" onSubmit={handleSubmit}>
        {helperMessage && !formError && !successMessage && (
          <p className="auth-status-message auth-status-message--info" role="status">
            {helperMessage}
          </p>
        )}

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
          <span className="auth-label">New password</span>
          <div className="auth-password-wrap">
            <input
              className="auth-input"
              type={showPassword ? 'text' : 'password'}
              placeholder="min 8 chars"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <button
              className="auth-eye-btn"
              type="button"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              onClick={() => setShowPassword((current) => !current)}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
                <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
              </svg>
            </button>
          </div>
        </label>

        <label className="auth-field">
          <span className="auth-label">Confirm password</span>
          <div className="auth-password-wrap">
            <input
              className="auth-input"
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="repeat your password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
            <button
              className="auth-eye-btn"
              type="button"
              aria-label={showConfirmPassword ? 'Hide password confirmation' : 'Show password confirmation'}
              onClick={() => setShowConfirmPassword((current) => !current)}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
                <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
              </svg>
            </button>
          </div>
        </label>

        <button className="auth-submit" type="submit" disabled={isSubmitting || loading || !user}>
          {isSubmitting ? 'Updating password...' : 'Update password'}
        </button>
      </form>
    </AuthLayout>
  )
}

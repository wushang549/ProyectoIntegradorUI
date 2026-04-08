import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import googleIcon from '../../assets/google.png'
import appleIcon from '../../assets/apple.png'
import AuthLayout from '../auth/AuthLayout'
import './signup.css'
import granulateLogo from '../../assets/granulate-logo-new.png'
import { useAuth } from '../../auth/AuthProvider'
import { supabase, supabaseConfigError } from '../../auth/supabaseClient'

export default function Signup() {
  const [showPassword, setShowPassword] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const navigate = useNavigate()
  const { configError, isConfigured } = useAuth()

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError('')

    if (!name.trim() || !email.trim() || !password) {
      setFormError('Complete your name, email, and password to create the account.')
      return
    }

    if (password.length < 8) {
      setFormError('Use a password with at least 8 characters.')
      return
    }

    if (!acceptedTerms) {
      setFormError('Accept the terms to continue.')
      return
    }

    if (!isConfigured || !supabase) {
      setFormError(configError ?? supabaseConfigError ?? 'Supabase is not configured.')
      return
    }

    setIsSubmitting(true)

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: name.trim(),
        },
      },
    })

    setIsSubmitting(false)

    if (error) {
      setFormError(error.message)
      return
    }

    if (data.session) {
      navigate('/chat', { replace: true })
      return
    }

    navigate('/login', {
      replace: true,
      state: {
        kind: 'success',
        message: 'Account created. Check your email to confirm the address, then sign in.',
      },
    })
  }

  return (
    <AuthLayout
      footerText="Already have an account?"
      footerLink={{ to: '/login', label: 'Sign in' }}
    >
      <Link to="/" className="auth-logo-link" aria-label="Go to home">
        <img className="auth-logo-img" src={granulateLogo} alt="Granulate logo" />
        <span className="auth-brand-name">Granulate</span>
      </Link>

      <h1 className="auth-heading">Get started now</h1>
      <p className="auth-subtitle">Enter your credentials to create your account.</p>

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
        {formError && (
          <p className="auth-status-message auth-status-message--error" role="alert">
            {formError}
          </p>
        )}

        <label className="auth-field">
          <span className="auth-label">Name</span>
          <input
            className="auth-input"
            type="text"
            placeholder="Your full name"
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>

        <label className="auth-field">
          <span className="auth-label">Email address</span>
          <input
            className="auth-input"
            type="email"
            placeholder="you@company.com"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>

        <label className="auth-field">
          <span className="auth-label">Password</span>
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
              onClick={() => setShowPassword((v) => !v)}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
                <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
              </svg>
            </button>
          </div>
        </label>

        <label className="auth-checkbox-wrap">
          <input
            type="checkbox"
            className="auth-checkbox"
            checked={acceptedTerms}
            onChange={(event) => setAcceptedTerms(event.target.checked)}
          />
          <span className="auth-checkbox-label">
            I agree to the <a href="#">Terms & Privacy</a>
          </span>
        </label>

        <button className="auth-submit" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creating account...' : 'Create account'}
        </button>
      </form>
    </AuthLayout>
  )
}

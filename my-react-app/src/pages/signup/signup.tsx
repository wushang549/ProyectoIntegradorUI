import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import googleIcon from '../../assets/google.png'
import appleIcon from '../../assets/apple.png'
import AuthLayout from '../auth/AuthLayout'
import './signup.css'
import granulateLogo from '../../assets/Granulate logo.png'

export default function Signup() {
  const [showPassword, setShowPassword] = useState(false)
  const navigate = useNavigate()

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
        <button className="auth-sso-btn" type="button">
          <img className="auth-sso-icon" src={googleIcon} alt="" />
          Google
        </button>
        <button className="auth-sso-btn" type="button">
          <img className="auth-sso-icon" src={appleIcon} alt="" />
          Apple
        </button>
      </div>

      <div className="auth-divider">
        <span className="auth-divider-line" />
        <span className="auth-divider-text">or</span>
        <span className="auth-divider-line" />
      </div>

      <form className="auth-form" onSubmit={(e) => { e.preventDefault(); navigate('/chat'); }}>
        <label className="auth-field">
          <span className="auth-label">Name</span>
          <input className="auth-input" type="text" placeholder="Your full name" autoComplete="name" />
        </label>

        <label className="auth-field">
          <span className="auth-label">Email address</span>
          <input className="auth-input" type="email" placeholder="you@company.com" autoComplete="email" />
        </label>

        <label className="auth-field">
          <span className="auth-label">Password</span>
          <div className="auth-password-wrap">
            <input
              className="auth-input"
              type={showPassword ? 'text' : 'password'}
              placeholder="min 8 chars"
              autoComplete="new-password"
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
          <input type="checkbox" className="auth-checkbox" />
          <span className="auth-checkbox-label">
            I agree to the <a href="#">Terms & Privacy</a>
          </span>
        </label>

        <button className="auth-submit" type="submit">
          Create account
        </button>
      </form>
    </AuthLayout>
  )
}

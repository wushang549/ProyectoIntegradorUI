import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import googleIcon from '../../assets/google.png'
import appleIcon from '../../assets/apple.png'
import logo from '../../assets/logo.svg'
import granulateLogo from '../../assets/Granulate logo.png'
import AuthLayout from '../auth/AuthLayout'
import './login.css'

export default function Login() {
  const [showPassword, setShowPassword] = useState(false)
  const navigate = useNavigate()

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
          <span className="auth-label">Email</span>
          <input className="auth-input" type="email" placeholder="you@company.com" autoComplete="email" />
        </label>

        <div className="auth-field">
          <div className="auth-row">
            <span className="auth-label">Password</span>
            <a href="#" className="auth-forgot">Forgot password?</a>
          </div>
          <div className="auth-password-wrap">
            <input
              className="auth-input"
              type={showPassword ? 'text' : 'password'}
              placeholder="min 8 chars"
              autoComplete="current-password"
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

        <button className="auth-submit" type="submit">
          Sign in
        </button>
      </form>
    </AuthLayout>
  )
}

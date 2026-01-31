import { useState } from 'react'
import googleIcon from '../../assets/google.png'
import { Link } from 'react-router-dom'
import appleIcon from '../../assets/apple.png'
import logo from '../../assets/logo.svg'
import './Login.css'

export default function Login() {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div className="gl-page">
      <main className="gl-card">
        <div className="tittle-logo">
          <Link to="/" className="gl-logo-link" aria-label="Go to login">
            <img className="gl-logo-login" src={logo} alt="Granulate logo" />
          <div className="gl-brand">Granulate</div>
           </Link>
        </div>
        
        <h1 className="gl-title">Welcome back</h1>

        <div className="gl-sso">
          <button className="gl-rect" type="button">
            <img className="gl-rect-icon" src={googleIcon} alt="" />
            <span className="gl-rect-text">Sign in with Google</span>
          </button>

          <button className="gl-rect" type="button">
            <img className="gl-rect-icon" src={appleIcon} alt="" />
            <span className="gl-rect-text">Sign in with Apple</span>
          </button>

          <button className="gl-rect" type="button">
            <div></div>
            <span className="gl-rect-text">Sign in with SSO</span>
          </button>
        </div>

        <div className="gl-divider" />

        <form className="gl-form" onSubmit={(e) => e.preventDefault()}>
          <label className="gl-field">
            <span className="gl-label">Email</span>
            <input className="gl-input" type="email" autoComplete="email" />
          </label>

          <div className="gl-row">
            <span className="gl-label">Password</span>
            <button className="gl-link" type="button">
              Forgot your password?
            </button>
          </div>

          <div className="gl-password">
            <input
              className="gl-input gl-input-pad"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
            />
            <button
              className="gl-eye"
              type="button"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              onClick={() => setShowPassword((v) => !v)}
            >
              <svg width="25" height="25" viewBox="0 0 24 24" fill="none">
                <path
                  d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
                <path
                  d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>

          <button className="gl-primary" type="submit">
            Sign in
          </button>

          <p className="gl-footer">
            Don&apos;t have an account?{' '}
            <button className="gl-link gl-link-strong" type="button">
              Sign up
            </button>
          </p>
        </form>
      </main>
    </div>
  )
}

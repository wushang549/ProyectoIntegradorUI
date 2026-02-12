import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import imageLogin from '../../assets/Image_login.png'
import './AuthLayout.css'

interface AuthLayoutProps {
  children: ReactNode
  footerText: string
  footerLink: { to: string; label: string }
}

export default function AuthLayout({ children, footerText, footerLink }: AuthLayoutProps) {
  return (
    <div className="auth-split">
      <Link to="/" className="auth-back-btn" aria-label="Go back">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Back
      </Link>
      <aside className="auth-image-panel">
        <img
          src={imageLogin}
          alt="Granulate"
          className="auth-dashboard-img"
        />
      </aside>
      <aside className="auth-form-panel">
        <div className="auth-form-inner">
          {children}
          <p className="auth-footer-text">
            {footerText}{' '}
            <Link to={footerLink.to} className="auth-footer-link">
              {footerLink.label}
            </Link>
          </p>
        </div>
      </aside>
    </div>
  )
}

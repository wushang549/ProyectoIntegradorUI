import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import './siteheader.css'

export default function SiteHeader() {
  const [open, setOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  return (
    <header className="site-header">
      <div className="site-header__container">
        <Link to="/" className="site-header__brand">
          <span className="site-header__mark" />
          <span className="site-header__name">Granulate</span>
        </Link>

        <nav className="site-header__nav">
          <a href="#features">Features</a>
          <a href="#how-it-works">How it works</a>
          <a href="#example">Example</a>
        </nav>

        <div className="site-header__actions">
          <Link to="/login" className="btn-ghost">
            Sign in
          </Link>
          <Link to="/login" className="btn-primary">
            Get started
          </Link>
        </div>

        <button
          className="site-header__burger"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      <div className={`mobile-menu ${open ? 'open' : ''}`}>
        <div className="mobile-menu__panel">
          <a href="#features" onClick={() => setOpen(false)}>Features</a>
          <a href="#how-it-works" onClick={() => setOpen(false)}>How it works</a>
          <a href="#example" onClick={() => setOpen(false)}>Example</a>

          <Link to="/login" className="btn-ghost full" onClick={() => setOpen(false)}>
            Sign in
          </Link>
          <Link to="/login" className="btn-primary full" onClick={() => setOpen(false)}>
            Get started
          </Link>
        </div>
      </div>
    </header>
  )
}

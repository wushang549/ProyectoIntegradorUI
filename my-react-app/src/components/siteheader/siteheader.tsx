import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import logo from '../../assets/logo.svg'
import './siteheader.css'

export default function SiteHeader() {
  const [open, setOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 900) {
        setOpen(false)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <header className="site-header">
      <div className="site-header__container">
        <Link
          to="/"
          className="site-header__brand"
          onClick={() => setOpen(false)}
        >
          <img
            className="gl-rect-logo"
            src={logo}
            alt="Granulate logo"
          />
          <span className="site-header__name">Granulate</span>
        </Link>

        <nav className="site-header__nav">
          <a href="#features">Features</a>
          <a href="#how-it-works">How it works</a>
          <a href="#example">Example</a>
        </nav>

        <div className="site-header__right">
          <Link to="/login" className="btn-ghost">
            Sign in
          </Link>

          <Link to="/signup" className="btn-primary">
            Get started
          </Link>

          <button
            type="button"
            className={`site-header__burger ${open ? 'is-open' : ''}`}
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
            aria-expanded={open}
          >
            <span />
            <span />
          </button>
        </div>
      </div>

      <div className={`mobile-menu ${open ? 'open' : ''}`}>
        <div className="mobile-menu__panel">
          <a href="#features" onClick={() => setOpen(false)}>
            Features
          </a>
          <a href="#how-it-works" onClick={() => setOpen(false)}>
            How it works
          </a>
          <a href="#example" onClick={() => setOpen(false)}>
            Example
          </a>
        </div>
      </div>
    </header>
  )
}

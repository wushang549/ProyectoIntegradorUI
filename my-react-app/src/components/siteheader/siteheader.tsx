import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import logo from '../../assets/Granulate logo.png'
import './siteheader.css'

export default function SiteHeader() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const location = useLocation()

  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

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
    <header className={`site-header ${scrolled ? 'scrolled' : ''}`}>
      <div className="site-header__container">
        {/* Left Segment: Logo */}
        <div className="site-header__segment site-header__segment--left">
          <Link
            to="/"
            className="site-header__brand"
            onClick={() => setOpen(false)}
          >
            <div className="site-header__logo-wrapper">
              <img
                className="gl-logo"
                src={logo}
                alt="Granulate logo"
              />
            </div>
            <span className="site-header__name">Granulate</span>
          </Link>
        </div>

        {/* Center Segment: Navigation */}
        <div className="site-header__segment site-header__segment--center">
          <nav className="site-header__nav">
            <a href="#features">Features</a>
            <a href="#how-it-works">How it works</a>
            <a href="#example">Use cases</a>
          </nav>
        </div>

        {/* Right Segment: Auth Actions */}
        <div className="site-header__segment site-header__segment--right">
          <Link to="/login" className="btn-ghost">
            Sign in
          </Link>

          <Link to="/analysis" className="btn-primary">
            Create an Account
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </Link>

          <button
            type="button"
            className={`site-header__menu-toggle ${open ? 'is-open' : ''}`}
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
            Use cases
          </a>
          <div className="mobile-menu__cta">
            <Link to="/login" className="btn-ghost btn-ghost--full" onClick={() => setOpen(false)}>
              Sign in
            </Link>
            <Link to="/analysis" className="btn-primary btn-primary--full" onClick={() => setOpen(false)}>
              Create an Account
            </Link>
          </div>
        </div>
      </div>
    </header>
  )
}

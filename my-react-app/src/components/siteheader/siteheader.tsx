import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import logo from '../../assets/Granulate logo.png'
import './siteheader.css'

const SECTION_IDS = ['features', 'how-it-works', 'example'] as const
const ACTIVE_OFFSET = 120

export default function SiteHeader() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [activeSection, setActiveSection] = useState<string | null>(null)
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

  // Scroll spy: highlight nav link for the section in view (landing page only)
  useEffect(() => {
    if (location.pathname !== '/') {
      setActiveSection(null)
      return
    }

    const updateActiveSection = () => {
      let current: string | null = null
      for (const id of SECTION_IDS) {
        const el = document.getElementById(id)
        if (!el) continue
        const top = el.getBoundingClientRect().top
        if (top <= ACTIVE_OFFSET) current = id
      }
      setActiveSection(current)
    }

    updateActiveSection()
    window.addEventListener('scroll', updateActiveSection, { passive: true })
    return () => window.removeEventListener('scroll', updateActiveSection)
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
            <a href="#features" className={activeSection === 'features' ? 'active' : ''}>Features</a>
            <a href="#how-it-works" className={activeSection === 'how-it-works' ? 'active' : ''}>How it works</a>
            <a href="#example" className={activeSection === 'example' ? 'active' : ''}>Use cases</a>
          </nav>
        </div>

        {/* Right Segment: Auth Actions */}
        <div className="site-header__segment site-header__segment--right">
          <Link to="/login" className="btn-ghost">
            Sign in
          </Link>

          <Link to="/signup" className="btn-primary">
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
          <a href="#features" className={activeSection === 'features' ? 'active' : ''} onClick={() => setOpen(false)}>
            Features
          </a>
          <a href="#how-it-works" className={activeSection === 'how-it-works' ? 'active' : ''} onClick={() => setOpen(false)}>
            How it works
          </a>
          <a href="#example" className={activeSection === 'example' ? 'active' : ''} onClick={() => setOpen(false)}>
            Use cases
          </a>
          <div className="mobile-menu__cta">
            <Link to="/login" className="btn-ghost btn-ghost--full" onClick={() => setOpen(false)}>
              Sign in
            </Link>
            <Link to="/signup" className="btn-primary btn-primary--full" onClick={() => setOpen(false)}>
              Create an Account
            </Link>
          </div>
        </div>
      </div>
    </header>
  )
}

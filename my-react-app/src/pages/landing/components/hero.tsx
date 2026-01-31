import { Link } from 'react-router-dom'
import './hero.css'

function HeroDashboard() {
  return (
    <div className="hero-dash" aria-label="Product dashboard preview">
      <div className="hero-dash__card">
        <div className="hero-dash__top">
          <div className="hero-dash__dots" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <div className="hero-dash__title">Analytics Dashboard</div>
          <div className="hero-dash__tag">Last 30 days</div>
        </div>

        <div className="hero-dash__body">
          <div className="hero-dash__stats">
            <div className="hero-stat hero-stat--blue">
              <div className="hero-stat__k">Total Reviews</div>
              <div className="hero-stat__v">2,847</div>
              <div className="hero-stat__d hero-stat__d--up">+12.5%</div>
            </div>
            <div className="hero-stat hero-stat--green">
              <div className="hero-stat__k">Positive</div>
              <div className="hero-stat__v">78%</div>
              <div className="hero-stat__d hero-stat__d--up">+3.2%</div>
            </div>
            <div className="hero-stat hero-stat--amber">
              <div className="hero-stat__k">Avg Response</div>
              <div className="hero-stat__v">2.4h</div>
              <div className="hero-stat__d hero-stat__d--up">-18min</div>
            </div>
          </div>

          <div className="hero-dash__grid">
            <div className="hero-panel">
              <div className="hero-panel__t">Topic Distribution</div>
              <div className="hero-panel__row">
                <svg viewBox="0 0 100 100" className="hero-donut" aria-hidden="true">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" opacity="0.12" strokeWidth="12" />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="#0E7EFF"
                    strokeWidth="12"
                    strokeDasharray="100.53 150.79"
                    strokeDashoffset="0"
                    transform="rotate(-90 50 50)"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="#22c55e"
                    strokeWidth="12"
                    strokeDasharray="62.83 188.49"
                    strokeDashoffset="-100.53"
                    transform="rotate(-90 50 50)"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="12"
                    strokeDasharray="50.26 200.06"
                    strokeDashoffset="-163.36"
                    transform="rotate(-90 50 50)"
                  />
                  <text x="50" y="47" textAnchor="middle" className="hero-donut__big">
                    847
                  </text>
                  <text x="50" y="60" textAnchor="middle" className="hero-donut__small">
                    mentions
                  </text>
                </svg>

                <div className="hero-legend">
                  <div className="hero-legend__item">
                    <span className="hero-swatch hero-swatch--blue" />
                    <span className="hero-legend__name">Service</span>
                    <span className="hero-legend__val">40%</span>
                  </div>
                  <div className="hero-legend__item">
                    <span className="hero-swatch hero-swatch--green" />
                    <span className="hero-legend__name">Quality</span>
                    <span className="hero-legend__val">25%</span>
                  </div>
                  <div className="hero-legend__item">
                    <span className="hero-swatch hero-swatch--amber" />
                    <span className="hero-legend__name">Pricing</span>
                    <span className="hero-legend__val">20%</span>
                  </div>
                  <div className="hero-legend__item">
                    <span className="hero-swatch hero-swatch--muted" />
                    <span className="hero-legend__name">Other</span>
                    <span className="hero-legend__val">15%</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="hero-panel">
              <div className="hero-panel__t">Trending Topics</div>
              <div className="hero-trends">
                <div className="hero-trend">
                  <span className="hero-trend__icon hero-trend__icon--red" />
                  <span className="hero-trend__name">Long wait times</span>
                  <span className="hero-trend__delta hero-trend__delta--red">+18</span>
                </div>
                <div className="hero-trend">
                  <span className="hero-trend__icon hero-trend__icon--green" />
                  <span className="hero-trend__name">Staff friendliness</span>
                  <span className="hero-trend__delta hero-trend__delta--green">+24</span>
                </div>
                <div className="hero-trend">
                  <span className="hero-trend__icon hero-trend__icon--amber" />
                  <span className="hero-trend__name">Menu variety</span>
                  <span className="hero-trend__delta hero-trend__delta--amber">+5</span>
                </div>
              </div>
            </div>
          </div>

          <div className="hero-panel">
            <div className="hero-panel__t">Top Keywords</div>
            <div className="hero-chips">
              <span className="hero-chip hero-chip--blue">fast delivery</span>
              <span className="hero-chip hero-chip--green">fresh ingredients</span>
              <span className="hero-chip hero-chip--blue2">friendly</span>
              <span className="hero-chip hero-chip--red">wait time</span>
              <span className="hero-chip hero-chip--amber">pricing</span>
              <span className="hero-chip hero-chip--green2">clean</span>
              <span className="hero-chip hero-chip--blue2">recommend</span>
            </div>
          </div>
        </div>
      </div>

      <div className="hero-float hero-float--right" aria-hidden="true">
  <span className="hero-float__icon hero-float__icon--green">
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 13l4 4L19 7" />
    </svg>
  </span>
  <div>
    <div className="hero-float__t">New insight detected</div>
    <div className="hero-float__s">3 emerging patterns</div>
  </div>
</div>

<div className="hero-float hero-float--left" aria-hidden="true">
  <span className="hero-float__icon hero-float__icon--blue">
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  </span>
  <div>
    <div className="hero-float__t">Sentiment Score</div>
    <div className="hero-float__v">+8.2%</div>
  </div>
</div>

    </div>
  )
}

export default function Hero() {
  return (
    <section className="lp-hero" id="hero" aria-label="Granulate hero">
      <div className="lp-hero-inner">
        <div className="lp-hero-copy">
          <h1 className="lp-hero-title">Turn raw feedback into clear insights.</h1>

          <p className="lp-hero-subtitle">
            Granulate analyzes comments, reviews, and unstructured text to reveal patterns, trends, and
            signals you can act on.
          </p>

          <div className="lp-hero-actions">
            <Link className="lp-hero-cta" to="/login">
              Get started
            </Link>

            <a className="lp-hero-link" href="#how-it-works">
              See how it works
            </a>
          </div>

          <div className="lp-hero-meta" aria-label="Highlights">
            <div className="lp-hero-pill">Auto clustering</div>
            <div className="lp-hero-pill">Theme summaries</div>
            <div className="lp-hero-pill">Sentiment + trends</div>
          </div>
        </div>

        <div className="lp-hero-preview" aria-label="Product preview">
          <HeroDashboard />
        </div>
      </div>
    </section>
  )
}

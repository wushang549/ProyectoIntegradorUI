import { Link } from 'react-router-dom'
import { Play, TrendingUp, ArrowRight } from 'lucide-react'
import './hero.css'

function HeroDashboard() {
  return (
    <div className="hero-dash">
      {/* Main Dashboard Card */}
      <div className="hero-dash__card">
        <div className="hero-dash__toolbar">
          <div className="hero-dash__tabs">
            <span className="hero-dash__tab active">Insights</span>
            <span className="hero-dash__tab">Clusters</span>
            <span className="hero-dash__tab">Export</span>
          </div>
        </div>

        <div className="hero-dash__content">
          {/* Chat message */}
          <div className="hero-dash__message">
            <div className="hero-dash__message-text">
              What are the main themes in customer feedback?
            </div>
            <div className="hero-dash__message-avatar">
              <span>You</span>
            </div>
          </div>

          {/* AI Response */}
          <div className="hero-dash__response">
            <p className="hero-dash__response-text">
              I've analyzed 2,847 customer reviews and identified <strong>5 main themes</strong>. 
              The most discussed topic is <strong>delivery speed</strong> (34%), followed by 
              product quality (28%) and customer service (21%).
            </p>
            
            {/* Mini chart */}
            <div className="hero-dash__chart">
              <div className="hero-dash__bar">
                <span className="hero-dash__bar-label">Delivery</span>
                <div className="hero-dash__bar-track">
                  <div className="hero-dash__bar-fill" style={{ width: '85%' }}></div>
                </div>
                <span className="hero-dash__bar-value">34%</span>
              </div>
              <div className="hero-dash__bar">
                <span className="hero-dash__bar-label">Quality</span>
                <div className="hero-dash__bar-track">
                  <div className="hero-dash__bar-fill hero-dash__bar-fill--green" style={{ width: '70%' }}></div>
                </div>
                <span className="hero-dash__bar-value">28%</span>
              </div>
              <div className="hero-dash__bar">
                <span className="hero-dash__bar-label">Service</span>
                <div className="hero-dash__bar-track">
                  <div className="hero-dash__bar-fill hero-dash__bar-fill--purple" style={{ width: '52%' }}></div>
                </div>
                <span className="hero-dash__bar-value">21%</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="hero-dash__actions">
              <button className="hero-dash__action">
                <TrendingUp size={14} />
                Show trends
              </button>
              <button className="hero-dash__action">View all clusters</button>
            </div>
          </div>
        </div>
      </div>

      {/* Floating stats card */}
      <div className="hero-float">
        <div className="hero-float__stat">
          <span className="hero-float__value">2,847</span>
          <span className="hero-float__label">Reviews analyzed</span>
        </div>
        <div className="hero-float__divider"></div>
        <div className="hero-float__stat">
          <span className="hero-float__value">2.4s</span>
          <span className="hero-float__label">Analysis time</span>
        </div>
      </div>
    </div>
  )
}

export default function Hero() {
  return (
    <section className="hero" id="hero">
      {/* Grid background */}
      <div className="hero__grid" aria-hidden="true"></div>

      {/* Gradient dots decoration */}
      <div className="hero__dots" aria-hidden="true">
        <div className="hero__dot hero__dot--1"></div>
        <div className="hero__dot hero__dot--2"></div>
        <div className="hero__dot hero__dot--3"></div>
        <div className="hero__dot hero__dot--4"></div>
        <div className="hero__dot hero__dot--5"></div>
        <div className="hero__dot hero__dot--6"></div>
        <div className="hero__dot hero__dot--7"></div>
        <div className="hero__dot hero__dot--8"></div>
        <div className="hero__dot hero__dot--9"></div>
        <div className="hero__dot hero__dot--10"></div>
        <div className="hero__dot hero__dot--11"></div>
        <div className="hero__dot hero__dot--12"></div>
        <div className="hero__dot hero__dot--13"></div>
        <div className="hero__dot hero__dot--14"></div>
        <div className="hero__dot hero__dot--15"></div>
        <div className="hero__dot hero__dot--16"></div>
        <div className="hero__dot hero__dot--17"></div>
        <div className="hero__dot hero__dot--18"></div>
        <div className="hero__dot hero__dot--19"></div>
        <div className="hero__dot hero__dot--20"></div>
        <div className="hero__dot hero__dot--21"></div>
        <div className="hero__dot hero__dot--22"></div>
        <div className="hero__dot hero__dot--23"></div>
        <div className="hero__dot hero__dot--24"></div>
        <div className="hero__dot hero__dot--25"></div>
        <div className="hero__dot hero__dot--26"></div>
        <div className="hero__dot hero__dot--27"></div>
        <div className="hero__dot hero__dot--28"></div>
        <div className="hero__dot hero__dot--29"></div>
        <div className="hero__dot hero__dot--30"></div>
      </div>

      <div className="hero__container">
        <div className="hero__content">
          {/* Social proof pill */}
          <div className="hero__social">
            <span className="hero__social-text" style={{ color: 'var(--color-text-primary) ' }} >No experience needed</span>
          </div>

          {/* Headline */}
          <h1 className="hero__title">
            Data analysis
            <br />
            <em>made easy</em> with Granulate AI.
          </h1>

          {/* Subheadline */}
          <p className="hero__subtitle">
            Upload data and get deep insights that help you make better decisions in seconds.

          </p>

          {/* CTAs */}
          <div className="hero__actions">
            <Link className="hero__cta hero__cta--primary" to="/analysis">
              Try for free
              <ArrowRight size={16} />
            </Link>

            <a className="hero__cta hero__cta--secondary" href="#how-it-works">
              <Play size={14} />
              See how it works
            </a>
          </div>
        </div>

        {/* Dashboard Preview */}
        <div className="hero__preview">
          <HeroDashboard />
        </div>
      </div>
    </section>
  )
}

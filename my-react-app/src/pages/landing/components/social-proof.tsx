import { Star, Utensils, Building2, Smartphone } from 'lucide-react'
import './social-proof.css'

const testimonials = [
  {
    quote:
      'We had no idea our brunch wait times were driving away regulars until Granulate flagged it. Changed our reservation system and saw a 23% increase in weekend covers.',
    author: 'James Moretti',
    role: 'Operations Director',
    company: 'Moretti Restaurant Group',
    avatar: 'JM',
    rating: 5,
    industry: 'Restaurant Group',
    icon: Utensils,
  },
  {
    quote:
      "Guest reviews mentioned 'slow check-in' 340 times last quarter. We added mobile key access and complaints dropped to near zero. Granulate made the pattern obvious.",
    author: 'Priya Sharma',
    role: 'Guest Experience Manager',
    company: 'Coastal Boutique Hotels',
    avatar: 'PS',
    rating: 5,
    industry: 'Boutique Hotel Chain',
    icon: Building2,
  },
  {
    quote:
      "Our app had 2,000+ reviews but we were guessing at priorities. Granulate showed us 'sync issues' was mentioned 4x more than anything else. Fixed it, rating went from 3.8 to 4.6.",
    author: 'David Park',
    role: 'Product Lead',
    company: 'FitTrack',
    avatar: 'DP',
    rating: 5,
    industry: 'Fitness App',
    icon: Smartphone,
  },
]

const industryStats = [
  {
    industry: 'Restaurants',
    stat: '847',
    label: 'restaurants analyzing reviews',
    icon: Utensils,
  },
  {
    industry: 'Hotels',
    stat: '156',
    label: 'hotels improving guest experience',
    icon: Building2,
  },
  {
    industry: 'Apps',
    stat: '312',
    label: 'apps monitoring feedback',
    icon: Smartphone,
  },
]

function CheckIcon() {
  return (
    <svg className="sp-check" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  )
}

export function SocialProof() {
  return (
    <section className="sp-section" id="social-proof">
      <div className="sp-container">
        <div className="sp-header">
          <p className="sp-kicker">Early adopters</p>
          <h2 className="sp-title">Trusted by teams who listen to their customers</h2>
        </div>

        <div className="sp-stats">
          {industryStats.map((item) => (
            <div key={item.industry} className="sp-stat-card">
              <div className="sp-stat-icon" aria-hidden="true">
                <item.icon size={22} />
              </div>
              <div>
                <div className="sp-stat-value">{item.stat}</div>
                <p className="sp-stat-label">{item.label}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="sp-testimonials">
          {testimonials.map((t) => (
            <div key={t.author} className="sp-card">
              <div className="sp-badge">
                <t.icon size={16} />
                <span>{t.industry}</span>
              </div>

              <div className="sp-stars" aria-hidden="true">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star key={i} size={20} className="sp-star-lucide" />
                ))}
              </div>

              <p className="sp-quote">“{t.quote}”</p>

              <div className="sp-author">
                <div className="sp-avatar">{t.avatar}</div>
                <div>
                  <div className="sp-name">{t.author}</div>
                  <div className="sp-role">
                    {t.role}, {t.company}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="sp-metrics">
          <div className="sp-metric">
            <div className="sp-metric-value">4.8M+</div>
            <p className="sp-metric-label">Reviews analyzed this month</p>
          </div>

          <div className="sp-divider" />

          <div className="sp-metric">
            <div className="sp-metric-value sp-metric-value--stars">
              4.7 <Star size={18} className="sp-star-lucide" />
            </div>
            <p className="sp-metric-label">Average user rating</p>
          </div>

          <div className="sp-divider" />

          <div className="sp-metric">
            <div className="sp-metric-value">{'<'}2 min</div>
            <p className="sp-metric-label">Setup time</p>
          </div>
        </div>

        <div className="sp-trust">
          <div className="sp-trust-item">
            <CheckIcon />
            <span>No credit card required</span>
          </div>
          <div className="sp-trust-item">
            <CheckIcon />
            <span>14-day free trial</span>
          </div>
          <div className="sp-trust-item">
            <CheckIcon />
            <span>Cancel anytime</span>
          </div>
        </div>
      </div>
    </section>
  )
}

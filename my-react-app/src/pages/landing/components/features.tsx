import { ArrowRight } from 'lucide-react'
import './features.css'

const features = [
  {
    title: 'Theme clustering',
    description: 'Automatically group feedback into meaningful themes and topics',
    visual: 'cluster',
  },
  {
    title: 'Sentiment analysis',
    description: 'Identify positive, negative, or neutral sentiment in text',
    visual: 'sentiment',
  },
  {
    title: 'Trend detection',
    description: 'Spot emerging patterns and issues before they grow',
    visual: 'trend',
  },
  {
    title: 'Keyword extraction',
    description: 'Extract and highlight the most important terms and phrases',
    visual: 'keywords',
  },
  {
    title: 'Data visualization',
    description: 'Create beautiful charts and graphs from your insights',
    visual: 'chart',
  },
  {
    title: 'Export reports',
    description: 'Download comprehensive reports in PDF or CSV format',
    visual: 'export',
  },
]

function FeatureVisual({ type }: { type: string }) {
  if (type === 'cluster') {
    return (
      <div className="ft-visual ft-visual--cluster">
        <div className="ft-cluster">
          <span className="ft-cluster__node ft-cluster__node--1">Service</span>
          <span className="ft-cluster__node ft-cluster__node--2">Quality</span>
          <span className="ft-cluster__node ft-cluster__node--3">Price</span>
        </div>
      </div>
    )
  }

  if (type === 'sentiment') {
    return (
      <div className="ft-visual ft-visual--sentiment">
        <div className="ft-sentiment">
          <div className="ft-sentiment__bar ft-sentiment__bar--pos"></div>
          <div className="ft-sentiment__bar ft-sentiment__bar--neu"></div>
          <div className="ft-sentiment__bar ft-sentiment__bar--neg"></div>
        </div>
      </div>
    )
  }

  if (type === 'trend') {
    return (
      <div className="ft-visual ft-visual--trend">
        <svg viewBox="0 0 100 50" className="ft-trend__line">
          <path d="M0,40 Q25,35 40,25 T70,15 T100,5" fill="none" stroke="#3b82f6" strokeWidth="2" />
        </svg>
      </div>
    )
  }

  if (type === 'keywords') {
    return (
      <div className="ft-visual ft-visual--keywords">
        <div className="ft-keywords">
          <span>delivery</span>
          <span>quality</span>
          <span>service</span>
        </div>
      </div>
    )
  }

  if (type === 'chart') {
    return (
      <div className="ft-visual ft-visual--chart">
        <div className="ft-chart__bars">
          <span style={{ height: '60%' }}></span>
          <span style={{ height: '80%' }}></span>
          <span style={{ height: '45%' }}></span>
          <span style={{ height: '90%' }}></span>
        </div>
      </div>
    )
  }

  return (
    <div className="ft-visual ft-visual--export">
      <div className="ft-export__icon">PDF</div>
    </div>
  )
}

export function Features() {
  return (
    <section id="features" className="features">
      <div className="features__container">
        {/* Header */}
        <div className="features__header">
          <span className="section-label">// Features //</span>
          <h2 className="features__title">
            Granulate for every insight
          </h2>
          <p className="features__subtitle">
            No matter your goal, Granulate adapts to your needs with powerful 
            analysis tools for any type of feedback data.
          </p>
        </div>

        {/* Features Grid */}
        <div className="features__grid">
          {features.map((feature) => (
            <div key={feature.title} className="feature-card">
              <h3 className="feature-card__title">{feature.title}</h3>
              <p className="feature-card__desc">{feature.description}</p>
              <a href="#" className="feature-card__link">
                Explore <ArrowRight size={14} />
              </a>
              <div className="feature-card__visual">
                <FeatureVisual type={feature.visual} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

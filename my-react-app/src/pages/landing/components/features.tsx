import {
  Layers,
  BarChart3,
  TrendingUp,
  Search,
  Filter,
  Download,
} from 'lucide-react'
import './features.css'

const features = [
  {
    icon: Layers,
    title: 'Automatic theme clustering',
    description:
      'Customer feedback is grouped into clear themes automatically. No manual tagging or rules needed.',
  },
  {
    icon: BarChart3,
    title: 'Sentiment by topic',
    description:
      'Understand positive and negative sentiment for each theme, not just a single overall score.',
  },
  {
    icon: TrendingUp,
    title: 'Trend detection',
    description:
      'Identify rising complaints and emerging issues early, before they impact ratings or churn.',
  },
  {
    icon: Search,
    title: 'Keyword & quote evidence',
    description:
      'Every insight is backed by real keywords and exact customer quotes for full transparency.',
  },
  {
    icon: Filter,
    title: 'Filters and segmentation',
    description:
      'Analyze feedback by location, time range, channel, rating, or custom segments.',
  },
  {
    icon: Download,
    title: 'Export and sharing',
    description:
      'Export insights as PDF or CSV, or share a live link with teammates and stakeholders.',
  },
]

export function Features() {
  return (
    <section id="features" className="ft-section">
      <div className="ft-container">
        <div className="ft-header">
          <h2 className="ft-title">
            Everything you need to understand customers
          </h2>
          <p className="ft-subtitle">
            Turn unstructured feedback into clear, actionable insights in minutes.
          </p>
        </div>

        <div className="ft-grid">
          {features.map((feature) => {
            const Icon = feature.icon

            return (
              <div key={feature.title} className="ft-card">
                <div className="ft-icon">
                  <Icon size={20} />
                </div>

                <h3 className="ft-card-title">{feature.title}</h3>
                <p className="ft-card-desc">{feature.description}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

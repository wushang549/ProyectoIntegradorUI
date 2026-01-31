import { Upload, Cpu, BarChart3, FileOutput } from 'lucide-react'
import './how-it-works.css'

type Step = {
  icon: React.ElementType
  number: string
  title: string
  description: string
  chips?: string[]
  bullets?: string[]
  callout?: { label: string; value: string }
}

const steps: Step[] = [
  {
    icon: Upload,
    number: '1',
    title: 'Ingest your data',
    description:
      'Upload CSV or PKL files with English text, or paste a public Reddit/X post URL. We validate format and prep your data for analysis.',
    chips: ['CSV', 'PKL', 'Reddit', 'X (Twitter)'],
  },
  {
    icon: Cpu,
    number: '2',
    title: 'Hashtree processes the text',
    description:
      'We generate embeddings, reduce dimensionality with UMAP, and apply hierarchical clustering to detect topic structure. Sentiment is computed per cluster.',
    bullets: [
      'Embeddings generation',
      'UMAP dimensionality reduction',
      'Hierarchical topic clustering',
      'Sentiment scoring',
    ],
  },
  {
    icon: BarChart3,
    number: '3',
    title: 'Explore and refine insights',
    description:
      'Inspect interactive plots, adjust clustering granularity, review individual comments, and request automatic topic labels from an LLM.',
    callout: {
      label: 'LLM-generated topic',
      value: 'Delivery delays during peak hours',
    },
  },
]

const typicalOutputs = [
  'Hierarchical topic tree (dendrogram)',
  'UMAP cluster visualization',
  'Topic-level sentiment distribution',
  'AI-generated summaries per cluster',
  'Exportable results (CSV, PDF, ZIP)',
]

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="hiw-section">
      <div className="hiw-container">
        <div className="hiw-header">
          <h2 className="hiw-title">How it works</h2>
          <p className="hiw-subtitle">
            From raw social data to structured insights in a few clear steps.
          </p>
        </div>

        <div className="hiw-grid">
          <div className="hiw-steps">
            {steps.map((step) => {
              const Icon = step.icon
              return (
                <div key={step.title} className="hiw-card">
                  <div className="hiw-card-top">
                    <div className="hiw-number">{step.number}</div>
                    <div className="hiw-icon">
                      <Icon size={25} />
                    </div>
                  </div>

                  <h3 className="hiw-card-title">{step.title}</h3>
                  <p className="hiw-card-desc">{step.description}</p>

                  {step.chips && (
                    <div className="hiw-chips">
                      {step.chips.map((c) => (
                        <span key={c} className="hiw-chip">
                          {c}
                        </span>
                      ))}
                    </div>
                  )}

                  {step.bullets && (
                    <ul className="hiw-bullets">
                      {step.bullets.map((b) => (
                        <li key={b} className="hiw-bullet">
                          <span className="hiw-dot" />
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {step.callout && (
                    <div className="hiw-callout">
                      <div className="hiw-callout-label">{step.callout.label}</div>
                      <div className="hiw-callout-value">{step.callout.value}</div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <aside className="hiw-side">
            <div className="hiw-side-head">
              <FileOutput size={25} />
              <h4 className="hiw-side-title">Typical outputs</h4>
            </div>

            <ul className="hiw-side-list">
              {typicalOutputs.map((o) => (
                <li key={o} className="hiw-side-item">
                  <span className="hiw-dot" />
                  <span>{o}</span>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </div>
    </section>
  )
}

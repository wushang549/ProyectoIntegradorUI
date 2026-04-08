import { Upload, MessageSquare, BarChart3, Download } from 'lucide-react'
import './how-it-works.css'

const steps = [
  {
    number: '01',
    title: 'Add your data',
    description: 'Upload CSV, Excel, or paste text. Connect multiple data sources seamlessly.',
    icon: Upload,
    visual: 'upload',
  },
  {
    number: '02',
    title: 'Ask in plain English',
    description: 'No coding needed. Just describe what insights you want to discover.',
    icon: MessageSquare,
    visual: 'chat',
  },
  {
    number: '03',
    title: 'Get instant insights',
    description: 'AI analyzes themes, sentiment, and trends. View beautiful visualizations.',
    icon: BarChart3,
    visual: 'chart',
  },
  {
    number: '04',
    title: 'Export & share',
    description: 'Download reports as PDF or CSV. Share insights with your team.',
    icon: Download,
    visual: 'export',
  },
]

function StepVisual({ type }: { type: string }) {
  if (type === 'upload') {
    return (
      <div className="hiw-visual hiw-visual--upload">
        <div className="hiw-visual__files">
          <div className="hiw-visual__file hiw-visual__file--csv">
            <span className="hiw-visual__file-icon">📊</span>
            <span>reviews.csv</span>
          </div>
          <div className="hiw-visual__file hiw-visual__file--xlsx">
            <span className="hiw-visual__file-icon">📑</span>
            <span>feedback.xlsx</span>
          </div>
        </div>
        <div className="hiw-visual__cloud">
          <Upload size={24} />
        </div>
      </div>
    )
  }

  if (type === 'chat') {
    return (
      <div className="hiw-visual hiw-visual--chat">
        <div className="hiw-visual__input">
          <span>What are customers complaining about?</span>
          <span className="hiw-visual__cursor">|</span>
        </div>
        <div className="hiw-visual__suggestions">
          <span>Show sentiment trends</span>
          <span>Find top themes</span>
        </div>
      </div>
    )
  }

  if (type === 'chart') {
    return (
      <div className="hiw-visual hiw-visual--chart">
        <div className="hiw-visual__chart-header">
          <span>Sentiment Distribution</span>
        </div>
        <div className="hiw-visual__bars">
          <div className="hiw-visual__bar-item">
            <div className="hiw-visual__bar hiw-visual__bar--positive" style={{ height: '80%' }}></div>
            <span>Positive</span>
          </div>
          <div className="hiw-visual__bar-item">
            <div className="hiw-visual__bar hiw-visual__bar--neutral" style={{ height: '45%' }}></div>
            <span>Neutral</span>
          </div>
          <div className="hiw-visual__bar-item">
            <div className="hiw-visual__bar hiw-visual__bar--negative" style={{ height: '30%' }}></div>
            <span>Negative</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="hiw-visual hiw-visual--export">
      <div className="hiw-visual__doc">
        <div className="hiw-visual__doc-header">
          <span>Analysis Report</span>
          <Download size={14} />
        </div>
        <div className="hiw-visual__doc-lines">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    </div>
  )
}

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="hiw">
      <div className="hiw__container">
        {/* Header */}
        <div className="hiw__header">
          <h2 className="hiw__title">
            Analyze your data through
            <br />a simple conversation
          </h2>
          <p className="hiw__subtitle">
            Ask a question in plain English, and our AI will instantly provide 
            insights, themes, and visualizations from your data.
          </p>
        </div>

        {/* Steps Grid */}
        <div className="hiw__grid">
          {steps.map((step) => (
            <div key={step.number} className="hiw__card">
              <div className="hiw__card-visual">
                <StepVisual type={step.visual} />
              </div>
              <div className="hiw__card-content">
                <h3 className="hiw__card-title">{step.title}</h3>
                <span className="hiw__card-number">{step.number}</span>
              </div>
              <p className="hiw__card-desc">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

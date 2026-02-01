import { useEffect, useState } from 'react'
import {
  Play,
  RotateCcw,
  FileText,
  Loader2,
  Layers,
  Sparkles,
  Lock,
} from 'lucide-react'
import './analysis.css'

const mockDataBalanced = {
  themes: [
    { name: 'Delivery', count: 12 },
    { name: 'Pricing', count: 7 },
    { name: 'Support', count: 4 },
    { name: 'App', count: 5 },
  ],
  clusters: [
    {
      title: 'Delivery Speed Issues',
      count: 8,
      keywords: ['late', 'slow', 'delayed', 'waiting'],
      examples: [
        'The delivery was 45 minutes late and the food was cold.',
        "I've been waiting for over an hour, this is unacceptable.",
      ],
    },
    {
      title: 'Positive Delivery Experience',
      count: 4,
      keywords: ['fast', 'quick', 'on time', 'early'],
      examples: ['Super fast delivery, arrived in just 20 minutes!', 'Always on time, love this service.'],
    },
    {
      title: 'Pricing Concerns',
      count: 7,
      keywords: ['expensive', 'overpriced', 'fees', 'cost'],
      examples: ['The delivery fees are getting out of hand.', 'Why did the prices go up so much?'],
    },
    {
      title: 'Customer Support Quality',
      count: 4,
      keywords: ['helpful', 'responsive', 'resolved', 'support'],
      examples: ['Support team was very helpful in resolving my issue.', 'Got a quick response when I had a problem with my order.'],
    },
  ],
}

const mockDataDetailed = {
  themes: [
    { name: 'Late Delivery', count: 6 },
    { name: 'Cold Food', count: 4 },
    { name: 'Fast Delivery', count: 4 },
    { name: 'High Fees', count: 5 },
    { name: 'Price Increases', count: 3 },
    { name: 'Helpful Support', count: 3 },
    { name: 'App Bugs', count: 3 },
  ],
  clusters: [
    {
      title: 'Late Delivery Complaints',
      count: 6,
      keywords: ['late', 'delayed', 'waiting', 'hour'],
      examples: ['The delivery was 45 minutes late.', "I've been waiting for over an hour."],
    },
    {
      title: 'Food Temperature Issues',
      count: 4,
      keywords: ['cold', 'lukewarm', 'temperature'],
      examples: ['Food arrived completely cold.', 'My pizza was lukewarm at best.'],
    },
  ],
}

type Granularity = 'broad' | 'balanced' | 'detailed'
type LoadingStep = 'extracting' | 'building' | 'grouping'
type InputTab = 'paste' | 'upload'

export default function Analysis() {
  const [inputText, setInputText] = useState('')
  const [inputTab, setInputTab] = useState<InputTab>('paste')

  const [granularity, setGranularity] = useState<Granularity>('balanced')
  const [granularityLevel, setGranularityLevel] = useState(3)

  const [isLoading, setIsLoading] = useState(false)
  const [loadingStep, setLoadingStep] = useState<LoadingStep>('extracting')

  const [hasResults, setHasResults] = useState(false)
  const [results, setResults] = useState(mockDataBalanced)
  const [error, setError] = useState('')

  const runAnalysis = () => {
    if (inputText.trim().length < 20) {
      setError('Please enter at least 20 characters to analyze.')
      return
    }

    setError('')
    setIsLoading(true)
    setLoadingStep('extracting')

    window.setTimeout(() => setLoadingStep('building'), 400)
    window.setTimeout(() => setLoadingStep('grouping'), 800)
    window.setTimeout(() => {
      setIsLoading(false)
      setHasResults(true)
      setResults(granularity === 'detailed' ? mockDataDetailed : mockDataBalanced)
    }, 1200)
  }

  const reset = () => {
    setInputText('')
    setHasResults(false)
    setGranularity('balanced')
    setGranularityLevel(3)
    setError('')
    setIsLoading(false)
    setInputTab('paste')
  }

  useEffect(() => {
    if (granularityLevel >= 4) setGranularity('detailed')
    else if (granularityLevel <= 2) setGranularity('broad')
    else setGranularity('balanced')
  }, [granularityLevel])

  const applyGranularity = () => {
    if (granularityLevel >= 4) setResults(mockDataDetailed)
    else setResults(mockDataBalanced)
  }

  return (
    <div className="ap-page">
      {/* Sticky Header */}
      <header className="ap-header">
        <div className="ap-header-inner">
          <div className="ap-brand">
            <a href="/" className="ap-brand-link">
              <div className="ap-logo" aria-hidden="true">
                <Layers size={18} />
              </div>
              <span className="ap-brand-name">Hashtree</span>
            </a>

            <div className="ap-divider" />

            <div className="ap-title-wrap">
              <h1 className="ap-page-title">New analysis</h1>
              <p className="ap-page-subtitle">
                Paste text or upload a file. We&apos;ll group themes automatically.
              </p>
            </div>
          </div>

          <div className="ap-actions">
            <button type="button" className="ap-btn ap-btn-ghost" onClick={reset}>
              <RotateCcw size={18} />
              Reset
            </button>

            <button
              type="button"
              className="ap-btn ap-btn-primary"
              onClick={runAnalysis}
              disabled={isLoading}
            >
              {isLoading ? <Loader2 size={18} className="ap-spin" /> : <Play size={18} />}
              Run analysis
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="ap-main">
        <div className="ap-grid">
          {/* LEFT column wrapper (this is the missing piece) */}
          <div className="ap-col">
            {/* Input */}
            <section className="ap-card">
              <div className="ap-card-head">
                <div className="ap-card-head-left">
                  <FileText size={18} />
                  <h2 className="ap-card-title">Input</h2>
                </div>
              </div>

              <div className="ap-card-body">
                <div className="ap-tabs">
                  <div className="ap-tabs-list" role="tablist" aria-label="Input method">
                    <button
                      type="button"
                      className={`ap-tab ${inputTab === 'paste' ? 'active' : ''}`}
                      onClick={() => setInputTab('paste')}
                      role="tab"
                      aria-selected={inputTab === 'paste'}
                    >
                      Paste text
                    </button>
                    <button
                      type="button"
                      className={`ap-tab ${inputTab === 'upload' ? 'active' : ''}`}
                      onClick={() => setInputTab('upload')}
                      role="tab"
                      aria-selected={inputTab === 'upload'}
                    >
                      Upload file
                    </button>
                  </div>

                  {inputTab === 'paste' && (
                    <div className="ap-tab-panel" role="tabpanel">
                      <textarea
                        className="ap-textarea"
                        placeholder="Paste reviews, comments, or any text you want to analyze…"
                        value={inputText}
                        onChange={(e) => {
                          setInputText(e.target.value)
                          setError('')
                        }}
                      />
                      <div className="ap-help-row">
                        <p className="ap-help">Tip: 20–5,000 words works best.</p>
                        {error && <p className="ap-error">{error}</p>}
                      </div>
                    </div>
                  )}

                  {inputTab === 'upload' && (
                    <div className="ap-tab-panel" role="tabpanel">
                      <div className="ap-dropzone">
                        <p className="ap-drop-title">Drop .txt or .csv here</p>
                        <p className="ap-drop-sub">File upload wiring coming next</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Run settings */}
            <section className="ap-card">
              <div className="ap-card-head">
                <div className="ap-card-head-left">
                  <Layers size={18} />
                  <h2 className="ap-card-title">Run settings</h2>
                </div>
              </div>

              <div className="ap-card-body">
                <p className="ap-label">Granularity</p>

                <div className="ap-seg">
                  {(['broad', 'balanced', 'detailed'] as Granularity[]).map((g) => (
                    <button
                      key={g}
                      type="button"
                      className={`ap-seg-btn ${granularity === g ? 'active' : ''}`}
                      onClick={() => {
                        setGranularity(g)
                        setGranularityLevel(g === 'broad' ? 2 : g === 'detailed' ? 4 : 3)
                      }}
                    >
                      {g.charAt(0).toUpperCase() + g.slice(1)}
                    </button>
                  ))}
                </div>

                <p className="ap-help ap-help-tight">
                  Granularity changes how specific the final themes are.
                </p>
              </div>
            </section>
          </div>

          {/* RIGHT column: Output spans the left stack */}
          <section className="ap-card ap-output">
            <div className="ap-card-head">
              <div className="ap-card-head-left">
                <Sparkles size={18} />
                <h2 className="ap-card-title">Output</h2>
              </div>
            </div>

            <div className="ap-card-body">
              {!isLoading && !hasResults && (
                <div className="ap-empty">
                  <div className="ap-empty-icon">
                    <Layers size={34} />
                  </div>
                  <p className="ap-empty-title">Run an analysis to see themes and clusters</p>
                  <p className="ap-empty-sub">Paste your text and click “Run analysis”</p>
                </div>
              )}

              {isLoading && (
                <div className="ap-loading">
                  <Loader2 size={40} className="ap-spin ap-loading-spinner" />
                  <div className="ap-loading-steps">
                    <div className={`ap-step ${loadingStep === 'extracting' ? 'active' : 'done'}`}>
                      <span className={`ap-step-dot ${loadingStep === 'extracting' ? 'pulse' : ''}`} />
                      <span>Extracting concepts…</span>
                    </div>
                    <div className={`ap-step ${loadingStep === 'building' ? 'active' : loadingStep === 'grouping' ? 'done' : 'idle'}`}>
                      <span className={`ap-step-dot ${loadingStep === 'building' ? 'pulse' : ''}`} />
                      <span>Building semantic tree…</span>
                    </div>
                    <div className={`ap-step ${loadingStep === 'grouping' ? 'active' : 'idle'}`}>
                      <span className={`ap-step-dot ${loadingStep === 'grouping' ? 'pulse' : ''}`} />
                      <span>Grouping into themes…</span>
                    </div>
                  </div>
                </div>
              )}

              {hasResults && !isLoading && (
                <div className="ap-results">
                  <div className="ap-block">
                    <h3 className="ap-block-title">Theme summary</h3>
                    <div className="ap-chips">
                      {results.themes.map((t) => (
                        <span key={t.name} className="ap-chip">
                          {t.name}
                          <span className="ap-chip-count">{t.count}</span>
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="ap-level">
                    <div className="ap-level-row">
                      <div className="ap-level-left">
                        <label className="ap-label" htmlFor="ap-range">
                          Granularity level
                        </label>
                        <input
                          id="ap-range"
                          className="ap-range"
                          type="range"
                          min={1}
                          max={5}
                          step={1}
                          value={granularityLevel}
                          onChange={(e) => setGranularityLevel(Number(e.target.value))}
                        />
                        <div className="ap-level-scale">
                          <span>Broad</span>
                          <span>Detailed</span>
                        </div>
                      </div>

                      <button type="button" className="ap-btn ap-btn-outline" onClick={applyGranularity}>
                        Apply level
                      </button>
                    </div>
                  </div>

                  <div className="ap-block">
                    <h3 className="ap-block-title">Clusters</h3>
                    <div className="ap-clusters">
                      {results.clusters.map((c) => (
                        <div key={c.title} className="ap-cluster">
                          <div className="ap-cluster-head">
                            <h4 className="ap-cluster-title">{c.title}</h4>
                            <span className="ap-pill">{c.count} items</span>
                          </div>

                          <div className="ap-keywords">
                            {c.keywords.map((k) => (
                              <span key={k} className="ap-keyword">
                                {k}
                              </span>
                            ))}
                          </div>

                          <div className="ap-examples">
                            {c.examples.map((ex, i) => (
                              <p key={i} className="ap-example">
                                “{ex}”
                              </p>
                            ))}
                          </div>

                          <div className="ap-cluster-footer">
                            <button className="ap-ghost" disabled>
                              <Lock size={14} />
                              <span>Split cluster</span>
                              <span className="ap-soon">Coming soon</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}

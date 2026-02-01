import { Layers, Loader2, Lock, Sparkles } from 'lucide-react'
import type { AnalysisResults, LoadingStep } from '../types'
import './AnalysisOutput.css'

type Props = {
  isLoading: boolean
  loadingStep: LoadingStep
  hasResults: boolean
  results: AnalysisResults
}

export default function AnalysisOutput({ isLoading, loadingStep, hasResults, results }: Props) {
  return (
    <section className="ap-card ap-output">
      <div className="ap-card-head">
        <div className="ap-card-head-left">
          <Sparkles size={16} />
          <h2 className="ap-card-title">Output</h2>
        </div>
      </div>

      <div className="ap-card-body">
        {!hasResults && !isLoading && (
          <div className="ap-empty">
            <div className="ap-empty-icon">
              <Layers size={28} />
            </div>
            <p className="ap-empty-title">Run an analysis to see themes and clusters</p>
            <p className="ap-empty-sub">Paste your text and click “Run analysis”</p>
          </div>
        )}

        {isLoading && (
          <div className="ap-loading">
            <Loader2 size={36} className="ap-spin ap-loading-spinner" />
            <p className="ap-help">
              {loadingStep === 'extracting'
                ? 'Extracting concepts…'
                : loadingStep === 'building'
                ? 'Building semantic tree…'
                : 'Grouping into themes…'}
            </p>
          </div>
        )}

        {hasResults && !isLoading && (
          <div className="ap-results">
            <div className="ap-chips">
              {results.themes.map((t) => (
                <span key={t.name} className="ap-chip">
                  {t.name}
                  <span className="ap-chip-count">{t.count}</span>
                </span>
              ))}
            </div>

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

                  {c.examples.map((ex, i) => (
                    <p key={i} className="ap-example">
                      “{ex}”
                    </p>
                  ))}

                  <div className="ap-cluster-footer">
                    <button className="ap-ghost" disabled>
                      <Lock size={14} />
                      Split cluster
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

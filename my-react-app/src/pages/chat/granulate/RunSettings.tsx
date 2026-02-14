import { memo, useEffect, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'

type RunSettingsProps = {
  minSimilarity: number
  setMinSimilarity: Dispatch<SetStateAction<number>>
  topKEvidence: number
  setTopKEvidence: Dispatch<SetStateAction<number>>
  useTaxonomy: boolean
  setUseTaxonomy: Dispatch<SetStateAction<boolean>>
  taxonomyText: string
  setTaxonomyText: Dispatch<SetStateAction<string>>
  runGranulate: () => void | Promise<void>
  isGranulating: boolean
}

function RunSettings({
  minSimilarity,
  setMinSimilarity,
  topKEvidence,
  setTopKEvidence,
  useTaxonomy,
  setUseTaxonomy,
  taxonomyText,
  setTaxonomyText,
  runGranulate,
  isGranulating,
}: RunSettingsProps) {
  const [isTaxonomyExpanded, setIsTaxonomyExpanded] = useState(false)

  useEffect(() => {
    if (!useTaxonomy) {
      setIsTaxonomyExpanded(false)
    }
  }, [useTaxonomy])

  return (
    <section className="gr-card chat-run-settings">
      <header className="chat-gr-section-head">
        <h4 className="chat-gr-section-title">Run settings</h4>
      </header>

      <div className="chat-controls-grid">
        <label className="chat-control-block">
          <div className="chat-control-row">
            <span>min_similarity</span>
            <span className="chat-value-pill">{minSimilarity.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={minSimilarity}
            onChange={(e) => setMinSimilarity(Number(e.target.value))}
          />
        </label>

        <label className="chat-control-block">
          <span>top_k_evidence</span>
          <select
            value={topKEvidence}
            onChange={(e) => setTopKEvidence(Number(e.target.value))}
            className="chat-select"
          >
            <option value={3}>3</option>
            <option value={6}>6</option>
            <option value={10}>10</option>
          </select>
        </label>
      </div>

      <label className="chat-control-inline chat-control-inline--switch">
        <input
          type="checkbox"
          className="chat-switch-input"
          checked={useTaxonomy}
          onChange={(e) => setUseTaxonomy(e.target.checked)}
        />
        <span className="chat-switch-track" aria-hidden>
          <span className="chat-switch-thumb" />
        </span>
        <span>Include taxonomy</span>
      </label>

      {useTaxonomy && (
        <div className="chat-taxonomy-shell">
          <button
            type="button"
            className={`chat-taxonomy-toggle ${isTaxonomyExpanded ? 'chat-taxonomy-toggle--open' : ''}`}
            onClick={() => setIsTaxonomyExpanded((prev) => !prev)}
            aria-expanded={isTaxonomyExpanded}
          >
            Taxonomy (advanced)
          </button>

          {isTaxonomyExpanded && (
            <div className="chat-taxonomy-wrap">
              <input
                type="text"
                className="chat-input chat-inline-input chat-taxonomy-input"
                value={taxonomyText}
                onChange={(e) => setTaxonomyText(e.target.value)}
                placeholder="Optional: customize categories (advanced)"
                aria-label="Taxonomy"
              />
              <p className="chat-taxonomy-help">
                {'Paste a JSON object mapping category -> keywords. Leave empty to auto-detect.'}
              </p>
            </div>
          )}
        </div>
      )}

      <div className="chat-run-actions">
        <button
          type="button"
          className="chat-run-btn chat-run-btn--primary chat-run-btn--full"
          onClick={runGranulate}
          disabled={isGranulating}
          aria-label="Run analysis"
        >
          {isGranulating ? 'Running analysis...' : 'Run analysis'}
        </button>
        <span className="chat-run-hint" title="Re-runs the model with the current settings.">
          Re-runs the model with current settings.
        </span>
      </div>
    </section>
  )
}

export default memo(RunSettings)

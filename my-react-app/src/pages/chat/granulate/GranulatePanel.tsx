import { memo, useCallback } from 'react'
import type { Dispatch, MutableRefObject, SetStateAction } from 'react'
import type {
  AspectAccordionSection,
  AspectSummary,
  GranulateGranule,
  GranulateResponse,
  SentimentFilter,
  SentimentValue,
  SortMode,
} from '../chat'
import AspectSummarySection from './AspectSummary'
import KeySignals from './KeySignals'
import RunSettings from './RunSettings'
import UnitsList from './UnitsList'
import './granulate.css'

type GranulatePanelProps = {
  granulateText: string
  setGranulateText: Dispatch<SetStateAction<string>>
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
  granulateError: string
  granulateResult: GranulateResponse | null
  visibleAspectSummaries: AspectSummary[]
  expandedSummaryEvidence: Record<string, boolean>
  setExpandedSummaryEvidence: Dispatch<SetStateAction<Record<string, boolean>>>
  highlightedGranules: GranulateGranule[]
  jumpToAspect: (aspect: string) => void
  granuleSortMode: SortMode
  setGranuleSortMode: Dispatch<SetStateAction<SortMode>>
  granuleSentimentFilter: SentimentFilter
  setGranuleSentimentFilter: Dispatch<SetStateAction<SentimentFilter>>
  showOtherAspects: boolean
  setShowOtherAspects: Dispatch<SetStateAction<boolean>>
  aspectAccordions: AspectAccordionSection[]
  openAspects: Record<string, boolean>
  toggleAspect: (aspect: string) => void
  expandedEvidence: Record<string, boolean>
  setExpandedEvidence: Dispatch<SetStateAction<Record<string, boolean>>>
  normalizeSentiment: (value: string | undefined) => SentimentValue
  formatAspectLabel: (aspect: string) => string
  sentimentLabel: (value: string | undefined) => string
  granuleConfidence: (granule: GranulateGranule) => number
  aspectRefs: MutableRefObject<Record<string, HTMLElement | null>>
}

function sentimentToneFromLabel(label: string): SentimentValue {
  const normalized = label.toLowerCase()
  if (normalized.includes('positive')) return 'positive'
  if (normalized.includes('negative')) return 'negative'
  return 'neutral'
}

function GranulatePanel({
  granulateText,
  setGranulateText,
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
  granulateError,
  granulateResult,
  visibleAspectSummaries,
  expandedSummaryEvidence,
  setExpandedSummaryEvidence,
  highlightedGranules,
  jumpToAspect,
  granuleSortMode,
  setGranuleSortMode,
  granuleSentimentFilter,
  setGranuleSentimentFilter,
  showOtherAspects,
  setShowOtherAspects,
  aspectAccordions,
  openAspects,
  toggleAspect,
  expandedEvidence,
  setExpandedEvidence,
  normalizeSentiment,
  formatAspectLabel,
  sentimentLabel,
  granuleConfidence,
  aspectRefs,
}: GranulatePanelProps) {
  const expandAllAspects = useCallback(() => {
    for (const section of aspectAccordions) {
      if (!openAspects[section.aspect]) {
        toggleAspect(section.aspect)
      }
    }
  }, [aspectAccordions, openAspects, toggleAspect])

  const collapseAllAspects = useCallback(() => {
    for (const section of aspectAccordions) {
      if (openAspects[section.aspect]) {
        toggleAspect(section.aspect)
      }
    }
  }, [aspectAccordions, openAspects, toggleAspect])

  return (
    <div className="chat-result-panel chat-granulate-workspace">
      <section className="chat-granulate-main">
        <section className="gr-card chat-granulate-input-card">
          <header className="chat-gr-section-head">
            <h3 className="chat-result-title">Granulate</h3>
          </header>
          <textarea
            className="chat-granulate-textarea"
            value={granulateText}
            onChange={(e) => setGranulateText(e.target.value)}
            placeholder="Enter text to granulate"
            aria-label="Granulate input text"
            rows={5}
          />
          {granulateError && (
            <p className="chat-file-error" role="alert">
              {granulateError}
            </p>
          )}
          {granulateResult?.scenario_summary && (
            <p className="chat-muted-text chat-scenario-summary">
              {typeof granulateResult.scenario_summary === 'string'
                ? granulateResult.scenario_summary
                : Object.entries(granulateResult.scenario_summary)
                    .map(([name, value]) => `${name}: ${value}`)
                    .join(' | ')}
            </p>
          )}
        </section>

        {granulateResult && (
          <>
            <AspectSummarySection
              visibleAspectSummaries={visibleAspectSummaries}
              expandedSummaryEvidence={expandedSummaryEvidence}
              setExpandedSummaryEvidence={setExpandedSummaryEvidence}
              formatAspectLabel={formatAspectLabel}
            />

            <UnitsList units={granulateResult.units} />

            <section className="gr-card gr-card--subtle chat-granules-shell">
              <div className="chat-granules-header">
                <h4 className="chat-gr-section-title">Granules by aspect</h4>
                <div className="chat-accordion-tools">
                  <label className="chat-control-block">
                    <span>Sort</span>
                    <select
                      className="chat-select"
                      value={granuleSortMode}
                      onChange={(e) => setGranuleSortMode(e.target.value as SortMode)}
                    >
                      <option value="confidence">Confidence</option>
                      <option value="similarity">Similarity</option>
                      <option value="sentiment">Sentiment score</option>
                    </select>
                  </label>
                  <label className="chat-control-block">
                    <span>Filter sentiment</span>
                    <select
                      className="chat-select"
                      value={granuleSentimentFilter}
                      onChange={(e) => setGranuleSentimentFilter(e.target.value as SentimentFilter)}
                    >
                      <option value="all">All</option>
                      <option value="positive">Positive</option>
                      <option value="neutral">Neutral</option>
                      <option value="negative">Negative</option>
                    </select>
                  </label>
                  <label className="chat-control-inline chat-control-inline--toggle">
                    <input
                      type="checkbox"
                      checked={showOtherAspects}
                      onChange={(e) => setShowOtherAspects(e.target.checked)}
                    />
                    <span>Show OTHER</span>
                  </label>
                  <div className="chat-accordion-actions">
                    <button type="button" className="chat-accordion-btn" onClick={collapseAllAspects}>
                      Collapse all
                    </button>
                    <button type="button" className="chat-accordion-btn" onClick={expandAllAspects}>
                      Expand all
                    </button>
                  </div>
                </div>
              </div>

              <div className="chat-aspect-accordion-list">
                {aspectAccordions.length === 0 && (
                  <p className="chat-muted-text">No granules available for this filter.</p>
                )}
                {aspectAccordions.map((section) => {
                  const isOpen = Boolean(openAspects[section.aspect])
                  const sectionTone = sentimentToneFromLabel(section.displayAvgSentimentLabel)

                  return (
                    <section
                      key={section.aspect}
                      className="chat-aspect-accordion"
                      ref={(el) => {
                        aspectRefs.current[section.aspect] = el
                      }}
                    >
                      <button
                        type="button"
                        className={`chat-aspect-accordion-head ${
                          isOpen ? 'chat-aspect-accordion-head--open' : ''
                        }`}
                        onClick={() => toggleAspect(section.aspect)}
                        aria-expanded={isOpen}
                      >
                        <span className="chat-aspect-accordion-title">{formatAspectLabel(section.aspect)}</span>
                        <span className="chat-aspect-accordion-count">{section.displayCount}</span>
                        <span className={`chat-sentiment-pill chat-sentiment-pill--${sectionTone}`}>
                          {section.displayAvgSentimentLabel}
                        </span>
                      </button>
                      {isOpen && (
                        <div className="chat-aspect-accordion-body">
                          {section.granules.map((granule, index) => {
                            const evidence = granule.evidence ?? []
                            const evidenceKey = `${section.aspect}-${index}`
                            const expanded = Boolean(expandedEvidence[evidenceKey])
                            const visibleEvidence = expanded ? evidence : evidence.slice(0, 6)
                            const granuleTone = normalizeSentiment(granule.sentiment)

                            return (
                              <article
                                key={evidenceKey}
                                className={`chat-granule-card chat-granule-card--${granuleTone}`}
                              >
                                <p className="chat-granule-excerpt">{granule.excerpt ?? ''}</p>
                                <div className="chat-granule-meta">
                                  <span className={`chat-granule-meta-pill chat-granule-meta-pill--${granuleTone}`}>
                                    <span
                                      className={`chat-sentiment-dot chat-sentiment-dot--${granuleTone}`}
                                      aria-hidden
                                    />
                                    {sentimentLabel(granule.sentiment)}
                                  </span>
                                  <span className="chat-granule-meta-pill">
                                    Confidence {granuleConfidence(granule).toFixed(2)}
                                  </span>
                                  <span className="chat-granule-meta-pill">
                                    Similarity{' '}
                                    {typeof granule.similarity === 'number'
                                      ? granule.similarity.toFixed(2)
                                      : 'N/A'}
                                  </span>
                                </div>
                                <div className="chat-chip-row">
                                  {visibleEvidence.map((item) => (
                                    <span key={`${evidenceKey}-${item}`} className="chat-chip">
                                      {item}
                                    </span>
                                  ))}
                                  {evidence.length > 6 && (
                                    <button
                                      type="button"
                                      className="chat-chip chat-chip-button"
                                      onClick={() =>
                                        setExpandedEvidence((prev) => ({
                                          ...prev,
                                          [evidenceKey]: !prev[evidenceKey],
                                        }))
                                      }
                                    >
                                      {expanded ? 'Show less' : `+${evidence.length - 6} more`}
                                    </button>
                                  )}
                                </div>
                              </article>
                            )
                          })}
                        </div>
                      )}
                    </section>
                  )
                })}
              </div>
            </section>
          </>
        )}
      </section>

      <aside className="chat-granulate-rail">
        <KeySignals
          highlightedGranules={highlightedGranules}
          jumpToAspect={jumpToAspect}
          normalizeSentiment={normalizeSentiment}
          formatAspectLabel={formatAspectLabel}
        />

        <RunSettings
          minSimilarity={minSimilarity}
          setMinSimilarity={setMinSimilarity}
          topKEvidence={topKEvidence}
          setTopKEvidence={setTopKEvidence}
          useTaxonomy={useTaxonomy}
          setUseTaxonomy={setUseTaxonomy}
          taxonomyText={taxonomyText}
          setTaxonomyText={setTaxonomyText}
          runGranulate={runGranulate}
          isGranulating={isGranulating}
        />
      </aside>
    </div>
  )
}

export default memo(GranulatePanel)

import { useMemo } from 'react'
import type { InsightsResponse, OverviewResponse } from '../api/analysis.types'
import ApiState from '../components/common/ApiState'
import AdvancedSection from '../components/common/AdvancedSection'
import SectionHeading from '../components/common/SectionHeading'
import OverviewThemeCards from '../components/themes/OverviewThemeCards'

type OverviewTabProps = {
  overview: OverviewResponse | null
  insights: InsightsResponse | null
  selectedClusterId: number | null
  isLoading: boolean
  error?: string
  onRetry: () => void
  onSelectCluster: (clusterId: number) => void
}

function formatTimingKey(key: string) {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

export default function OverviewTab({
  overview,
  insights,
  selectedClusterId,
  isLoading,
  error,
  onRetry,
  onSelectCluster,
}: OverviewTabProps) {
  const isEmpty = !insights && !overview

  const insightThemes = insights?.theme_summary ?? []

  const findings = useMemo(() => {
    return (insights?.key_findings ?? []).filter((item) => item.trim().length > 0)
  }, [insights?.key_findings])

  const overallSummary = insights?.overall_summary?.trim() ?? ''
  const overallSummarySource = insights?.overall_summary_source
  const overallSummaryTitle = overallSummarySource === 'llm' ? 'AI summary' : 'Summary'
  const overallSummaryBadge =
    overallSummarySource === 'heuristic'
      ? 'Heuristic fallback'
      : overallSummarySource === 'llm'
        ? 'LLM'
        : 'Generated'

  return (
    <ApiState
      isLoading={isLoading}
      error={error}
      onRetry={onRetry}
      isEmpty={isEmpty}
      emptyMessage="No overview insights are available yet."
    >
      <section className="chat-result-panel chat-section-panel">
        <SectionHeading title="Overview" />

        <section className="chat-overview-block">
          <h3 className="chat-card-title">Key findings</h3>
          {findings.length === 0 && (
            <p className="chat-muted-text">No key findings are available for this run yet.</p>
          )}
          {findings.length > 0 && (
            <div className="chat-findings-grid">
              {findings.map((finding, index) => (
                <article key={`finding-${index}`} className="chat-finding-card">
                  <span className="chat-finding-index">{index + 1}</span>
                  <p className="chat-finding-text">{finding}</p>
                </article>
              ))}
            </div>
          )}
          {overallSummary && (
            <article className="chat-overview-summary" aria-label="Overall summary">
              <div className="chat-overview-summary-head">
                <h4 className="chat-overview-summary-title">{overallSummaryTitle}</h4>
                <span
                  className={`chat-overview-summary-badge chat-overview-summary-badge--${
                    overallSummarySource ?? 'unknown'
                  }`}
                >
                  {overallSummaryBadge}
                </span>
              </div>
              <p className="chat-overview-summary-text">{overallSummary}</p>
            </article>
          )}
        </section>

        <section className="chat-overview-block">
          <h3 className="chat-card-title">Top themes</h3>
          <OverviewThemeCards
            themes={insightThemes}
            overview={overview}
            selectedClusterId={selectedClusterId}
            onSelectCluster={onSelectCluster}
          />
        </section>

        {(insights?.quality_warnings.length ?? 0) > 0 && (
          <section className="chat-overview-warning" role="status" aria-live="polite">
            <h3 className="chat-card-title">Quality notes</h3>
            <ul className="chat-bullet-list">
              {insights?.quality_warnings.map((warning, index) => (
                <li key={`warning-${index}`}>{warning}</li>
              ))}
            </ul>
          </section>
        )}

        <AdvancedSection title="Advanced">
          {!overview && <p className="chat-muted-text">Overview diagnostics are not available yet.</p>}

          {overview && (
            <>
              <div className="chat-overview-stats">
                <article className="chat-insight-card">
                  <span className="chat-stat-key">Total calls</span>
                  <strong className="chat-stat-value">{overview.counts.items}</strong>
                </article>
                <article className="chat-insight-card">
                  <span className="chat-stat-key">Themes found</span>
                  <strong className="chat-stat-value">{overview.counts.clusters}</strong>
                </article>
                <article className="chat-insight-card">
                  <span className="chat-stat-key">Aspects tracked</span>
                  <strong className="chat-stat-value">{overview.counts.aspects}</strong>
                </article>
              </div>

              <section className="chat-overview-aspects">
                <h4 className="chat-card-title">Top aspects by count</h4>
                <div className="chat-list-grid">
                  {overview.top_aspects.map((aspect) => (
                    <article key={aspect.aspect} className="chat-list-item">
                      <span>{aspect.aspect}</span>
                      <strong>{aspect.count}</strong>
                    </article>
                  ))}
                </div>
              </section>

              <div className="chat-stats-grid">
                {Object.entries(overview.timing).map(([key, value]) => (
                  <article key={key} className="chat-stat-card">
                    <span className="chat-stat-key">{formatTimingKey(key)}</span>
                    <strong className="chat-stat-value">{value.toFixed(2)} s</strong>
                  </article>
                ))}
              </div>
            </>
          )}
        </AdvancedSection>
      </section>
    </ApiState>
  )
}

import { useMemo, useState } from 'react'
import type { InsightsResponse, OverviewResponse } from '../api/analysis.types'
import ApiState from '../components/common/ApiState'
import AdvancedSection from '../components/common/AdvancedSection'
import ExpandableText from '../components/common/ExpandableText'
import SectionHeading from '../components/common/SectionHeading'
import { getClusterStyle } from '../utils/insightsTheme'

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

function findClusterIdByInsightLabel(overview: OverviewResponse | null, label: string) {
  if (!overview) return null

  const normalized = label.trim().toLowerCase()
  const exactMatches = overview.top_clusters.filter(
    (cluster) => cluster.label.trim().toLowerCase() === normalized
  )
  if (exactMatches.length === 1) {
    return exactMatches[0].cluster_id
  }

  const containsMatch = overview.top_clusters.find((cluster) =>
    cluster.label.trim().toLowerCase().includes(normalized)
  )
  return containsMatch?.cluster_id ?? null
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
  const [expandedExampleKeys, setExpandedExampleKeys] = useState<Record<string, boolean>>({})

  const isEmpty = !insights && !overview

  const insightThemes = insights?.theme_summary ?? []

  const findings = useMemo(() => {
    return (insights?.key_findings ?? []).filter((item) => item.trim().length > 0)
  }, [insights?.key_findings])

  return (
    <ApiState
      isLoading={isLoading}
      error={error}
      onRetry={onRetry}
      isEmpty={isEmpty}
      emptyMessage="No overview insights are available yet."
    >
      <section className="chat-result-panel chat-section-panel">
        <SectionHeading
          title="Overview"
          subtitle="Main takeaways in plain language"
          meaning="What this means: this page gives the fastest read of what is happening in your calls and where to focus next."
        />

        <section className="chat-overview-block">
          <h3 className="chat-card-title">Key findings</h3>
          {findings.length === 0 && (
            <p className="chat-muted-text">No key findings are available for this run yet.</p>
          )}
          {findings.length > 0 && (
            <ul className="chat-bullet-list">
              {findings.map((finding, index) => (
                <li key={`finding-${index}`}>{finding}</li>
              ))}
            </ul>
          )}
        </section>

        <section className="chat-overview-block">
          <h3 className="chat-card-title">Top themes</h3>
          <div className="chat-main-theme-list">
            {insightThemes.map((theme, index) => {
              const clusterId = findClusterIdByInsightLabel(overview, theme.label)
              const style = getClusterStyle(clusterId)
              const isActive = clusterId !== null && selectedClusterId === clusterId
              const exampleList = theme.examples.slice(0, 2)

              return (
                <article
                  key={`overview-theme-${index}`}
                  className={`chat-main-theme-card ${isActive ? 'chat-main-theme-card--active' : ''}`}
                  style={{ borderColor: isActive ? style.border : undefined }}
                >
                  <div className="chat-main-theme-head">
                    <h4 className="chat-card-title">{theme.label}</h4>
                    <strong style={{ color: style.accent }}>{theme.size} calls</strong>
                  </div>

                  {exampleList.length > 0 && (
                    <div className="chat-list-grid">
                      {exampleList.map((example, exampleIndex) => {
                        const key = `insight-${index}-${exampleIndex}`
                        return (
                          <div key={key} className="chat-list-item chat-list-item--small">
                            <ExpandableText
                              text={example}
                              expanded={Boolean(expandedExampleKeys[key])}
                              onToggle={() =>
                                setExpandedExampleKeys((prev) => ({
                                  ...prev,
                                  [key]: !prev[key],
                                }))
                              }
                            />
                          </div>
                        )
                      })}
                    </div>
                  )}

                  <div className="chat-chip-row">
                    {theme.top_terms.slice(0, 7).map((term) => (
                      <span key={`${theme.label}-${term}`} className="chat-chip">
                        {term}
                      </span>
                    ))}
                  </div>

                  {clusterId !== null && (
                    <button
                      type="button"
                      className="chat-plain-btn"
                      onClick={() => onSelectCluster(clusterId)}
                    >
                      Explore theme
                    </button>
                  )}
                </article>
              )
            })}
          </div>
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

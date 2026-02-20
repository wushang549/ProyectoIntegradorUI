import { useMemo, useState } from 'react'
import type { AnalysisGranulateResponse, MapResponse } from '../api/analysis.types'
import ApiState from '../components/common/ApiState'
import AdvancedSection from '../components/common/AdvancedSection'
import ExpandableText from '../components/common/ExpandableText'
import SectionHeading from '../components/common/SectionHeading'
import { getSentimentColor } from '../utils/insightsTheme'

type GranulateTabProps = {
  data: AnalysisGranulateResponse | null
  mapData: MapResponse | null
  selectedClusterId: number | null
  selectedPointId: string | null
  onSelectPoint: (pointId: string | null, clusterId?: number | null) => void
  isLoading: boolean
  error?: string
  isLoadingItems: boolean
  onRetry: () => void
  onLoadItems: () => void
}

type SentimentAspectSummary = {
  aspect: string
  count: number
  weightedScore: number
}

function sentimentTone(score: number) {
  if (score > 0.12) return 'positive'
  if (score < -0.12) return 'negative'
  return 'neutral'
}

function sentimentLabel(score: number) {
  const tone = sentimentTone(score)
  if (tone === 'positive') return 'Positive'
  if (tone === 'negative') return 'Negative'
  return 'Mixed/Neutral'
}

export default function GranulateTab({
  data,
  mapData,
  selectedClusterId,
  selectedPointId,
  onSelectPoint,
  isLoading,
  error,
  isLoadingItems,
  onRetry,
  onLoadItems,
}: GranulateTabProps) {
  const [selectedAspect, setSelectedAspect] = useState<string | null>(null)
  const [visibleExamplesCount, setVisibleExamplesCount] = useState(80)
  const [expandedItemPreviewIds, setExpandedItemPreviewIds] = useState<Record<string, boolean>>({})

  const clusterByItemId = useMemo(() => {
    const map = new Map<string, number>()
    for (const point of mapData?.points ?? []) {
      map.set(point.id, point.cluster_id)
    }
    return map
  }, [mapData?.points])

  const selectedClusterAggregate = useMemo(() => {
    if (!data || selectedClusterId === null) return null
    return data.per_cluster_aggregate.find((row) => row.cluster_id === selectedClusterId) ?? null
  }, [data, selectedClusterId])

  const topAspects = useMemo(() => {
    if (!data) return []
    const source =
      selectedClusterAggregate?.aggregate_aspect_summary ?? data.aggregate_aspect_summary

    return [...source].filter((aspect) => aspect.count > 0).sort((a, b) => b.count - a.count)
  }, [data, selectedClusterAggregate])

  const hasItemDetails = Boolean(data && data.items.length > 0)

  const itemLevelSentiment = useMemo(() => {
    const aggregate = new Map<string, { totalCount: number; weightedSentiment: number }>()

    for (const item of data?.items ?? []) {
      if (selectedClusterId !== null) {
        const itemClusterId = clusterByItemId.get(item.id)
        if (itemClusterId !== selectedClusterId) continue
      }

      for (const [aspect, summary] of Object.entries(item.result.aspect_summary)) {
        const count = summary.count ?? 0
        if (count <= 0) continue
        const score = typeof summary.avg_sentiment === 'number' ? summary.avg_sentiment : 0

        const current = aggregate.get(aspect) ?? { totalCount: 0, weightedSentiment: 0 }
        current.totalCount += count
        current.weightedSentiment += score * count
        aggregate.set(aspect, current)
      }
    }

    const normalized: SentimentAspectSummary[] = []
    for (const [aspect, value] of aggregate.entries()) {
      if (value.totalCount <= 0) continue
      normalized.push({
        aspect,
        count: value.totalCount,
        weightedScore: value.weightedSentiment / value.totalCount,
      })
    }

    normalized.sort((left, right) => right.count - left.count)
    return normalized
  }, [clusterByItemId, data?.items, selectedClusterId])

  const topPositive = useMemo(() => {
    return itemLevelSentiment
      .filter((item) => item.weightedScore > 0.12)
      .sort((a, b) => b.weightedScore - a.weightedScore)
      .slice(0, 4)
  }, [itemLevelSentiment])

  const topNegative = useMemo(() => {
    return itemLevelSentiment
      .filter((item) => item.weightedScore < -0.12)
      .sort((a, b) => a.weightedScore - b.weightedScore)
      .slice(0, 4)
  }, [itemLevelSentiment])

  const filteredItems = useMemo(() => {
    if (!data) return []

    return data.items.filter((item) => {
      if (selectedAspect && !Object.prototype.hasOwnProperty.call(item.result.aspect_summary, selectedAspect)) {
        return false
      }

      if (selectedClusterId !== null) {
        const clusterId = clusterByItemId.get(item.id)
        if (clusterId !== selectedClusterId) return false
      }

      return true
    })
  }, [clusterByItemId, data, selectedAspect, selectedClusterId])

  const taxonomyItems = useMemo(() => {
    const set = new Set<string>()
    for (const item of data?.items ?? []) {
      for (const taxonomy of item.result.taxonomy ?? []) {
        set.add(taxonomy)
      }
    }
    return Array.from(set).sort((left, right) => left.localeCompare(right))
  }, [data?.items])

  const itemsIncluded = selectedClusterAggregate?.items_included ?? data?.items_included ?? 0
  const itemsTotal = selectedClusterAggregate?.items_total ?? data?.items_total ?? 0

  return (
    <ApiState
      isLoading={isLoading}
      error={error}
      onRetry={onRetry}
      isEmpty={!data}
      emptyMessage="No sentiment/aspect summary available."
    >
      {data && (
        <section className="chat-result-panel chat-section-panel">
          <SectionHeading
            title="Sentiment / Aspects"
            subtitle="Most frequent issues and direction"
            meaning="What this means: start with the highest-volume aspects, then load examples only when you need evidence."
          />

          <section className="chat-aspect-grid">
            <article className="chat-insight-card">
              <span className="chat-stat-key">Items in summary</span>
              <strong className="chat-stat-value">{itemsIncluded}</strong>
            </article>
            <article className="chat-insight-card">
              <span className="chat-stat-key">Items total</span>
              <strong className="chat-stat-value">{itemsTotal}</strong>
            </article>
            <article className="chat-insight-card">
              <span className="chat-stat-key">Distinct aspects</span>
              <strong className="chat-stat-value">{topAspects.length}</strong>
            </article>
          </section>

          <section>
            <h3 className="chat-card-title">
              {selectedClusterAggregate
                ? `Top aspects for ${selectedClusterAggregate.cluster_label}`
                : 'Top aspects by volume'}
            </h3>
            {selectedClusterId !== null && !selectedClusterAggregate && (
              <p className="chat-muted-text">No cluster-level aggregate is available for this selection.</p>
            )}
            <div className="chat-chip-row">
              {topAspects.map((aspect) => {
                const isActive = selectedAspect === aspect.aspect
                return (
                  <button
                    key={aspect.aspect}
                    type="button"
                    className={`chat-chip chat-chip-button ${isActive ? 'chat-chip--active' : ''}`}
                    onClick={() => setSelectedAspect(isActive ? null : aspect.aspect)}
                  >
                    {aspect.aspect} ({aspect.count})
                  </button>
                )
              })}
            </div>
          </section>

          <section className="chat-sentiment-columns">
            <article className="chat-sentiment-card">
              <h3 className="chat-card-title">Top positive aspects</h3>
              {hasItemDetails && topPositive.length === 0 && (
                <p className="chat-muted-text">No clearly positive aspects in current sample.</p>
              )}
              {!hasItemDetails && (
                <p className="chat-muted-text">Load examples to compute positive/negative direction.</p>
              )}
              <div className="chat-list-grid">
                {topPositive.map((aspect) => (
                  <div key={`positive-${aspect.aspect}`} className="chat-list-item">
                    <span>{aspect.aspect}</span>
                    <strong style={{ color: getSentimentColor('positive') }}>+{aspect.weightedScore.toFixed(2)}</strong>
                  </div>
                ))}
              </div>
            </article>

            <article className="chat-sentiment-card">
              <h3 className="chat-card-title">Top negative aspects</h3>
              {hasItemDetails && topNegative.length === 0 && (
                <p className="chat-muted-text">No clearly negative aspects in current sample.</p>
              )}
              {!hasItemDetails && (
                <p className="chat-muted-text">Load examples to compute positive/negative direction.</p>
              )}
              <div className="chat-list-grid">
                {topNegative.map((aspect) => (
                  <div key={`negative-${aspect.aspect}`} className="chat-list-item">
                    <span>{aspect.aspect}</span>
                    <strong style={{ color: getSentimentColor('negative') }}>{aspect.weightedScore.toFixed(2)}</strong>
                  </div>
                ))}
              </div>
            </article>
          </section>

          <div className="chat-granulate-actions">
            <button type="button" className="chat-plain-btn" onClick={onLoadItems} disabled={isLoadingItems}>
              {isLoadingItems ? 'Loading examples...' : hasItemDetails ? 'Refresh examples' : 'Show examples'}
            </button>
            {selectedClusterAggregate && (
              <span className="chat-muted-text">
                Showing cluster-level summary for {selectedClusterAggregate.cluster_label}.
              </span>
            )}
          </div>

          {hasItemDetails && (
            <section className="chat-theme-items-panel">
              <div className="chat-theme-items-head">
                <h3 className="chat-card-title">Aspect examples</h3>
                <p className="chat-muted-text">{filteredItems.length} examples match your current filters.</p>
              </div>

              <div className="chat-theme-items-list" role="table" aria-label="Aspect examples">
                {filteredItems.slice(0, visibleExamplesCount).map((item) => {
                  const clusterId = clusterByItemId.get(item.id)
                  const aspectSummary = selectedAspect
                    ? item.result.aspect_summary[selectedAspect]
                    : Object.values(item.result.aspect_summary)[0]
                  const score = typeof aspectSummary?.avg_sentiment === 'number' ? aspectSummary.avg_sentiment : 0

                  return (
                    <div
                      key={item.id}
                      className={`chat-theme-item-row ${selectedPointId === item.id ? 'chat-theme-item-row--active' : ''}`}
                      role="button"
                      tabIndex={0}
                      onClick={() => onSelectPoint(item.id, clusterId)}
                      onKeyDown={(event) => {
                        if (event.key !== 'Enter' && event.key !== ' ') return
                        event.preventDefault()
                        onSelectPoint(item.id, clusterId)
                      }}
                    >
                      <ExpandableText
                        text={item.preview}
                        expanded={Boolean(expandedItemPreviewIds[item.id])}
                        onToggle={() =>
                          setExpandedItemPreviewIds((prev) => ({
                            ...prev,
                            [item.id]: !prev[item.id],
                          }))
                        }
                      />
                      <span className="chat-theme-item-id">
                        {sentimentLabel(score)} ({score.toFixed(2)})
                        {clusterId !== undefined ? ` - Theme ${clusterId}` : ''}
                      </span>
                    </div>
                  )
                })}
              </div>

              {filteredItems.length > visibleExamplesCount && (
                <button
                  type="button"
                  className="chat-plain-btn"
                  onClick={() => setVisibleExamplesCount((prev) => prev + 80)}
                >
                  Load more examples
                </button>
              )}
            </section>
          )}

          <AdvancedSection title="Advanced">
            <div className="chat-list-grid">
              <div className="chat-stat-card">
                <span className="chat-stat-key">Mode</span>
                <strong className="chat-stat-value">{data.mode}</strong>
              </div>
              <div className="chat-stat-card">
                <span className="chat-stat-key">Taxonomy terms</span>
                <span className="chat-muted-text">
                  {taxonomyItems.length > 0 ? taxonomyItems.join(', ') : 'Load examples to inspect taxonomy.'}
                </span>
              </div>
            </div>
          </AdvancedSection>
        </section>
      )}
    </ApiState>
  )
}

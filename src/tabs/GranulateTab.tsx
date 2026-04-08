import { useMemo, useState } from 'react'
import type {
  AnalysisGranulateResponse,
  GranulateAspectAggregate,
  MapResponse,
} from '../api/analysis.types'
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

type GranulateItem = NonNullable<AnalysisGranulateResponse['items']>[number]
type GranulateItemSignal = {
  aspect: string
  excerpt: string
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

function aggregateSentimentScore(aspect: GranulateAspectAggregate) {
  if (typeof aspect.avg_sentiment_score === 'number') return aspect.avg_sentiment_score
  if (typeof aspect.avg_sentiment === 'number') return aspect.avg_sentiment
  if (typeof aspect.direction_score === 'number') return aspect.direction_score
  return 0
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function average(values: number[]) {
  if (values.length === 0) return 0
  const total = values.reduce((sum, next) => sum + next, 0)
  return total / values.length
}

function summaryCount(summary: GranulateItem['result']['aspect_summary'][string] | undefined) {
  return isFiniteNumber(summary?.count) ? summary.count : 0
}

function summaryScore(summary: GranulateItem['result']['aspect_summary'][string] | undefined) {
  if (isFiniteNumber(summary?.avg_sentiment_score)) return summary.avg_sentiment_score
  if (isFiniteNumber(summary?.avg_sentiment)) return summary.avg_sentiment
  return 0
}

function hasAspectSignal(item: GranulateItem, aspect: string) {
  const summary = item.result.aspect_summary?.[aspect]
  if (summaryCount(summary) > 0) return true
  return (item.result.granules ?? []).some((granule) => granule.aspect === aspect)
}

function resolveItemSentimentScore(item: GranulateItem, selectedAspect: string | null) {
  const granules = item.result.granules ?? []

  if (selectedAspect) {
    const aspectGranuleScores = granules
      .filter((granule) => granule.aspect === selectedAspect && isFiniteNumber(granule.sentiment_score))
      .map((granule) => granule.sentiment_score)
    if (aspectGranuleScores.length > 0) {
      return average(aspectGranuleScores)
    }

    return summaryScore(item.result.aspect_summary?.[selectedAspect])
  }

  const nonNeutralScores = granules
    .map((granule) => granule.sentiment_score)
    .filter((score) => isFiniteNumber(score) && Math.abs(score) > 0.001)
  if (nonNeutralScores.length > 0) {
    return average(nonNeutralScores)
  }

  const allGranuleScores = granules
    .map((granule) => granule.sentiment_score)
    .filter((score): score is number => isFiniteNumber(score))
  if (allGranuleScores.length > 0) {
    return average(allGranuleScores)
  }

  const summaries = item.result.aspect_summary ?? {}
  const weightedEntries = Object.values(summaries)
    .map((summary) => ({ count: summaryCount(summary), score: summaryScore(summary) }))
    .filter((entry) => entry.count > 0)
  if (weightedEntries.length === 0) return 0

  const totalCount = weightedEntries.reduce((sum, entry) => sum + entry.count, 0)
  if (totalCount <= 0) return 0

  const weightedTotal = weightedEntries.reduce((sum, entry) => sum + entry.score * entry.count, 0)
  return weightedTotal / totalCount
}

function formatAspectName(aspect: string) {
  return aspect
    .trim()
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function getSignalPriority(granule: GranulateItem['result']['granules'][number]) {
  const sentiment = isFiniteNumber(granule.sentiment_score) ? Math.abs(granule.sentiment_score) : 0
  const confidence = isFiniteNumber(granule.confidence) ? granule.confidence : 0
  const similarity = isFiniteNumber(granule.similarity) ? granule.similarity : 0
  return sentiment * 0.7 + confidence * 0.2 + similarity * 0.1
}

function resolvePrimarySignal(item: GranulateItem, selectedAspect: string | null): GranulateItemSignal | null {
  const granules = item.result.granules ?? []
  if (granules.length === 0) return null

  const aspectScopedGranules =
    selectedAspect !== null ? granules.filter((granule) => granule.aspect === selectedAspect) : granules
  const withoutOther = aspectScopedGranules.filter((granule) => granule.aspect !== 'OTHER')
  const candidateGranules = withoutOther.length > 0 ? withoutOther : aspectScopedGranules
  if (candidateGranules.length === 0) return null

  const topGranule = [...candidateGranules].sort((left, right) => {
    return getSignalPriority(right) - getSignalPriority(left)
  })[0]

  const excerpt = (topGranule.excerpt ?? '').trim()
  if (!excerpt) return null

  return {
    aspect: topGranule.aspect,
    excerpt,
  }
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
    return (data.per_cluster_aggregate ?? []).find((row) => row.cluster_id === selectedClusterId) ?? null
  }, [data, selectedClusterId])

  const topAspects = useMemo(() => {
    if (!data) return []
    const source = selectedClusterAggregate?.aggregate_aspect_summary ?? data.aggregate_aspect_summary ?? []

    return [...source].filter((aspect) => aspect.count > 0).sort((a, b) => b.count - a.count)
  }, [data, selectedClusterAggregate])

  const hasItemDetails = (data?.items?.length ?? 0) > 0

  const aggregateSentiment = useMemo(() => {
    const normalized: SentimentAspectSummary[] = topAspects.map((aspect) => ({
      aspect: aspect.aspect,
      count: aspect.count,
      weightedScore: aggregateSentimentScore(aspect),
    }))

    normalized.sort((left, right) => right.count - left.count)
    return normalized
  }, [topAspects])

  const topPositive = useMemo(() => {
    return aggregateSentiment
      .filter((item) => item.weightedScore > 0.12)
      .sort((a, b) => b.weightedScore - a.weightedScore)
      .slice(0, 4)
  }, [aggregateSentiment])

  const topNegative = useMemo(() => {
    return aggregateSentiment
      .filter((item) => item.weightedScore < -0.12)
      .sort((a, b) => a.weightedScore - b.weightedScore)
      .slice(0, 4)
  }, [aggregateSentiment])

  const filteredItems = useMemo(() => {
    const items = data?.items ?? []

    return items.filter((item) => {
      if (selectedAspect && !hasAspectSignal(item, selectedAspect)) {
        return false
      }

      if (selectedClusterId !== null) {
        const clusterId = clusterByItemId.get(item.id)
        if (clusterId !== selectedClusterId) return false
      }

      return true
    })
  }, [clusterByItemId, data?.items, selectedAspect, selectedClusterId])

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
              {topPositive.length === 0 && (
                <p className="chat-muted-text">No clearly positive aspects in current summary.</p>
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
              {topNegative.length === 0 && (
                <p className="chat-muted-text">No clearly negative aspects in current summary.</p>
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
                  const score = resolveItemSentimentScore(item, selectedAspect)
                  const primarySignal = resolvePrimarySignal(item, selectedAspect)

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
                      <div className="chat-theme-item-meta">
                        <span className="chat-theme-item-id">
                          {sentimentLabel(score)} ({score.toFixed(2)})
                          {clusterId !== undefined ? ` - Theme ${clusterId}` : ''}
                        </span>
                        {primarySignal && (
                          <span className="chat-theme-item-signal">
                            {formatAspectName(primarySignal.aspect)}: {primarySignal.excerpt}
                          </span>
                        )}
                      </div>
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

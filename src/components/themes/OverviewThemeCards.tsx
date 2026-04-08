import { useMemo } from 'react'
import type { ClusterLabelSource, InsightsResponse, OverviewResponse } from '../../api/analysis.types'
import ThemeCard from '../common/ThemeCard'
import './ThemeCards.css'

type OverviewThemeCardsProps = {
  themes: InsightsResponse['theme_summary']
  overview: OverviewResponse | null
  selectedClusterId: number | null
  onSelectCluster: (clusterId: number) => void
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

function formatLabelSourceTooltip(source: ClusterLabelSource | undefined) {
  switch (source) {
    case 'openai':
      return 'Label source: OpenAI'
    case 'contextual':
      return 'Label source: Contextual rule'
    case 'signature':
      return 'Label source: Signature rule'
    case 'heuristic':
      return 'Label source: Heuristic rule'
    case 'fallback':
      return 'Label source: Fallback rule'
    default:
      return 'Label source: Unknown'
  }
}

function uniqueNonEmpty(values: string[]) {
  const result: string[] = []
  const seen = new Set<string>()

  for (const value of values) {
    const trimmed = value.trim()
    if (!trimmed) continue
    const key = trimmed.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push(trimmed)
  }

  return result
}

export default function OverviewThemeCards({
  themes,
  overview,
  selectedClusterId,
  onSelectCluster,
}: OverviewThemeCardsProps) {
  const minExamples = 5

  const overviewClustersById = useMemo(() => {
    const map = new Map<number, OverviewResponse['top_clusters'][number]>()
    for (const cluster of overview?.top_clusters ?? []) {
      map.set(cluster.cluster_id, cluster)
    }
    return map
  }, [overview?.top_clusters])

  return (
    <div className="chat-theme-cards">
      {themes.map((theme, index) => {
        const clusterId = theme.cluster_id ?? findClusterIdByInsightLabel(overview, theme.label)
        const isActive = clusterId !== null && selectedClusterId === clusterId
        const insightExamples = theme.examples
        const matchedCluster = clusterId !== null ? overviewClustersById.get(clusterId) ?? null : null
        const representativeExamples =
          clusterId !== null
            ? (matchedCluster?.representatives ?? []).map(
                (representative) => representative.preview
              )
            : []
        const examplesToRender = uniqueNonEmpty([...insightExamples, ...representativeExamples]).slice(
          0,
          Math.max(minExamples, insightExamples.length)
        )

        return (
          <ThemeCard
            key={`overview-theme-${index}`}
            title={theme.label}
            titleTooltip={formatLabelSourceTooltip(theme.label_source ?? matchedCluster?.label_source)}
            calls={theme.size}
            clusterId={clusterId}
            isActive={isActive}
            topTerms={theme.top_terms.slice(0, 7)}
            examples={examplesToRender.map((example, exampleIndex) => ({
              id: `insight-${index}-${exampleIndex}`,
              text: example,
            }))}
            actions={
              clusterId !== null ? (
                <button
                  type="button"
                  className="chat-plain-btn chat-card-action chat-card-action--full"
                  onClick={() => onSelectCluster(clusterId)}
                >
                  Explore theme
                </button>
              ) : null
            }
          />
        )
      })}
    </div>
  )
}

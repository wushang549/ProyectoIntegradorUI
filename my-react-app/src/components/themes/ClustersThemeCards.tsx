import { useMemo, type KeyboardEvent } from 'react'
import type { ClustersResponse } from '../../api/analysis.types'
import ThemeCard from '../common/ThemeCard'
import './ThemeCards.css'
import './ClustersThemeCards.css'

type ClustersThemeCardsProps = {
  clusters: ClustersResponse['clusters']
  selectedClusterId: number | null
  pointsByClusterId: Map<number, Array<{ id: string; preview: string }>>
  onSelectCluster: (clusterId: number | null) => void
  onSelectPoint: (pointId: string | null, clusterId?: number | null) => void
  onViewItems: (clusterId: number) => void
}

function normalizeLabel(value: string) {
  return value.trim().toLowerCase()
}

export default function ClustersThemeCards({
  clusters,
  selectedClusterId,
  pointsByClusterId,
  onSelectCluster,
  onSelectPoint,
  onViewItems,
}: ClustersThemeCardsProps) {
  const duplicateLabelCounts = useMemo(() => {
    const map = new Map<string, number>()
    for (const cluster of clusters) {
      const key = normalizeLabel(cluster.label)
      map.set(key, (map.get(key) ?? 0) + 1)
    }
    return map
  }, [clusters])

  const handleItemKeyDown = (event: KeyboardEvent<HTMLDivElement>, pointId: string, clusterId: number) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    onSelectPoint(pointId, clusterId)
  }

  return (
    <div className="chat-theme-cards">
      {clusters.map((cluster) => {
        const isActive = selectedClusterId === cluster.cluster_id
        const representativeExamples = pointsByClusterId.get(cluster.cluster_id) ?? cluster.representatives
        const normalizedLabel = normalizeLabel(cluster.label)
        const hasDuplicateLabel = (duplicateLabelCounts.get(normalizedLabel) ?? 0) > 1

        return (
          <ThemeCard
            key={cluster.cluster_id}
            title={cluster.label}
            calls={cluster.size}
            clusterId={cluster.cluster_id}
            isActive={isActive}
            subtitle={hasDuplicateLabel ? `Cluster ${cluster.cluster_id}` : undefined}
            topTerms={cluster.top_terms.slice(0, 8)}
            examples={representativeExamples.map((rep) => ({
              id: `theme-${cluster.cluster_id}-${rep.id}`,
              text: rep.preview,
              onClick: () => onSelectPoint(rep.id, cluster.cluster_id),
              onKeyDown: (event) => handleItemKeyDown(event, rep.id, cluster.cluster_id),
            }))}
            actions={
              <div className="chat-theme-actions">
                <button
                  type="button"
                  className="chat-plain-btn chat-card-action"
                  onClick={() => onSelectCluster(isActive ? null : cluster.cluster_id)}
                >
                  {isActive ? 'Unselect theme' : 'Select theme'}
                </button>
                <button
                  type="button"
                  className="chat-plain-btn chat-card-action"
                  onClick={() => onViewItems(cluster.cluster_id)}
                >
                  View items
                </button>
              </div>
            }
          />
        )
      })}
    </div>
  )
}

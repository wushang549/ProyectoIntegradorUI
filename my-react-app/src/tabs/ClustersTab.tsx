import { useMemo, useState } from 'react'
import type { ClustersResponse } from '../api/analysis.types'
import ApiState from '../components/common/ApiState'

type ClustersTabProps = {
  data: ClustersResponse | null
  selectedClusterId: number | null
  onSelectCluster: (clusterId: number | null) => void
  onFocusRepresentative: (pointId: string, clusterId: number) => void
  isLoading: boolean
  error?: string
  onRetry: () => void
}

export default function ClustersTab({
  data,
  selectedClusterId,
  onSelectCluster,
  onFocusRepresentative,
  isLoading,
  error,
  onRetry,
}: ClustersTabProps) {
  const [search, setSearch] = useState('')

  const visibleClusters = useMemo(() => {
    if (!data) return []
    const query = search.trim().toLowerCase()
    return [...data.clusters]
      .sort((a, b) => b.size - a.size)
      .filter((cluster) => {
        if (!query) return true
        const labelMatch = cluster.label.toLowerCase().includes(query)
        const termsMatch = cluster.top_terms.some((term) => term.toLowerCase().includes(query))
        return labelMatch || termsMatch
      })
  }, [data, search])

  return (
    <ApiState
      isLoading={isLoading}
      error={error}
      onRetry={onRetry}
      isEmpty={!data || data.clusters.length === 0}
      emptyMessage="No clusters generated."
    >
      {data && (
        <div className="chat-result-panel">
          <h3 className="chat-result-title">Clusters</h3>

          <div className="chat-inline-form">
            <input
              type="text"
              className="chat-input chat-inline-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by label or top terms..."
              aria-label="Search clusters"
            />
            <button type="button" className="chat-plain-btn" onClick={() => onSelectCluster(null)}>
              Clear cluster
            </button>
          </div>

          <div className="chat-list-grid chat-clusters-grid">
            {visibleClusters.map((cluster) => {
              const isActive = selectedClusterId !== null && selectedClusterId === cluster.cluster_id
              return (
                <article
                  key={cluster.cluster_id}
                  className={`chat-cluster-card ${isActive ? 'chat-cluster-card--active' : ''}`}
                >
                  <button
                    type="button"
                    className="chat-list-item"
                    onClick={() => onSelectCluster(cluster.cluster_id)}
                  >
                    <span>{cluster.label}</span>
                    <strong>{cluster.size}</strong>
                  </button>

                  <div className="chat-chip-row">
                    {cluster.top_terms.slice(0, 8).map((term) => (
                      <span key={`${cluster.cluster_id}-${term}`} className="chat-chip">
                        {term}
                      </span>
                    ))}
                  </div>

                  <div className="chat-list-grid">
                    {cluster.representatives.slice(0, 5).map((rep) => (
                      <button
                        key={rep.id}
                        type="button"
                        className="chat-list-item chat-list-item--small"
                        onClick={() => onFocusRepresentative(rep.id, cluster.cluster_id)}
                      >
                        <span>{rep.id}</span>
                        <span className="chat-ellipsis-text">{rep.preview}</span>
                      </button>
                    ))}
                  </div>
                </article>
              )
            })}
          </div>
        </div>
      )}
    </ApiState>
  )
}

import ApiState from '../components/common/ApiState'
import type { OverviewResponse } from '../api/analysis.types'

type OverviewTabProps = {
  data: OverviewResponse | null
  isLoading: boolean
  error?: string
  onRetry: () => void
  onSelectCluster: (clusterId: number) => void
}

function formatStatKey(key: string) {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

export default function OverviewTab({
  data,
  isLoading,
  error,
  onRetry,
  onSelectCluster,
}: OverviewTabProps) {
  const isEmpty = !data || data.counts.items === 0

  return (
    <ApiState
      isLoading={isLoading}
      error={error}
      onRetry={onRetry}
      isEmpty={isEmpty}
      emptyMessage="No overview data available."
    >
      {data && (
        <div className="chat-result-panel">
          <h3 className="chat-result-title">Overview</h3>

          <div className="chat-stats-grid">
            <div className="chat-stat-card">
              <span className="chat-stat-key">Items</span>
              <span className="chat-stat-value">{data.counts.items}</span>
            </div>
            <div className="chat-stat-card">
              <span className="chat-stat-key">Clusters</span>
              <span className="chat-stat-value">{data.counts.clusters}</span>
            </div>
            <div className="chat-stat-card">
              <span className="chat-stat-key">Aspects</span>
              <span className="chat-stat-value">{data.counts.aspects}</span>
            </div>
          </div>

          <h4 className="chat-result-subtitle">Top clusters</h4>
          <div className="chat-list-grid">
            {data.top_clusters.length === 0 && <p className="chat-muted-text">No clusters available.</p>}
            {data.top_clusters.map((cluster) => (
              <button
                key={cluster.cluster_id}
                type="button"
                className="chat-list-item"
                onClick={() => onSelectCluster(cluster.cluster_id)}
              >
                <span>{cluster.label}</span>
                <strong>{cluster.size}</strong>
              </button>
            ))}
          </div>

          <h4 className="chat-result-subtitle">Top aspects</h4>
          <div className="chat-list-grid">
            {data.top_aspects.length === 0 && <p className="chat-muted-text">No aspects available.</p>}
            {data.top_aspects.map((aspect) => (
              <div key={aspect.aspect} className="chat-list-item">
                <span>{aspect.aspect}</span>
                <strong>{aspect.count}</strong>
              </div>
            ))}
          </div>

          <h4 className="chat-result-subtitle">Timing</h4>
          <div className="chat-stats-grid">
            {Object.entries(data.timing).map(([key, value]) => (
              <div key={key} className="chat-stat-card">
                <span className="chat-stat-key">{formatStatKey(key)}</span>
                <span className="chat-stat-value">{value.toFixed(2)}s</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </ApiState>
  )
}

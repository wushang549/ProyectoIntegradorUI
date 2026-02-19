import { useMemo, useState } from 'react'
import type { MapResponse } from '../api/analysis.types'
import ApiState from '../components/common/ApiState'

type MapTabProps = {
  data: MapResponse | null
  selectedClusterId: number | null
  selectedPointId: string | null
  onSelectCluster: (clusterId: number | null) => void
  onSelectPoint: (pointId: string | null, clusterId?: number | null) => void
  isLoading: boolean
  error?: string
  onRetry: () => void
}

function formatNumber(value: number | undefined) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '-'
  return value.toFixed(3)
}

export default function MapTab({
  data,
  selectedClusterId,
  selectedPointId,
  onSelectCluster,
  onSelectPoint,
  isLoading,
  error,
  onRetry,
}: MapTabProps) {
  const [search, setSearch] = useState('')

  const legendClusters = useMemo(() => {
    if (!data) return []
    return [...data.clusters].sort((a, b) => b.size - a.size)
  }, [data])

  const visiblePoints = useMemo(() => {
    if (!data) return []
    const query = search.trim().toLowerCase()
    return data.points.filter((point) => {
      if (selectedClusterId !== null && point.cluster_id !== selectedClusterId) {
        return false
      }
      if (!query) return true
      return point.preview.toLowerCase().includes(query)
    })
  }, [data, search, selectedClusterId])

  return (
    <ApiState
      isLoading={isLoading}
      error={error}
      onRetry={onRetry}
      isEmpty={!data || data.points.length === 0}
      emptyMessage="No points to display."
    >
      {data && (
        <div className="chat-result-panel">
          <h3 className="chat-result-title">Map</h3>
          <p className="chat-muted-text">
            {selectedClusterId === null
              ? `Showing ${visiblePoints.length} points`
              : `Showing ${visiblePoints.length} points for cluster ${selectedClusterId}`}
          </p>

          <div className="chat-inline-form">
            <input
              type="text"
              className="chat-input chat-inline-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search preview text..."
              aria-label="Search map points"
            />
            <button type="button" className="chat-plain-btn" onClick={() => onSelectCluster(null)}>
              Clear cluster
            </button>
          </div>

          <h4 className="chat-result-subtitle">Cluster legend</h4>
          <div className="chat-list-grid">
            {legendClusters.map((cluster) => (
              <button
                key={cluster.cluster_id}
                type="button"
                className={`chat-list-item ${
                  selectedClusterId !== null && selectedClusterId === cluster.cluster_id
                    ? 'chat-list-item--active'
                    : ''
                }`}
                onClick={() => onSelectCluster(cluster.cluster_id)}
              >
                <span>{cluster.label}</span>
                <strong>{cluster.size}</strong>
              </button>
            ))}
          </div>

          <div className="chat-map-table" role="table" aria-label="Map points">
            <div className="chat-map-row chat-map-row--head" role="row">
              <span>ID</span>
              <span>X</span>
              <span>Y</span>
              <span>Cluster</span>
              <span>Preview</span>
            </div>

            {visiblePoints.slice(0, 300).map((point) => {
              const isActive = point.id === selectedPointId
              return (
                <button
                  key={point.id}
                  type="button"
                  className={`chat-map-row chat-map-row--button ${isActive ? 'chat-map-row--active' : ''}`}
                  onClick={() => onSelectPoint(point.id, point.cluster_id)}
                >
                  <span>{point.id}</span>
                  <span>{formatNumber(point.x)}</span>
                  <span>{formatNumber(point.y)}</span>
                  <span>{point.cluster_id}</span>
                  <span className="chat-ellipsis-text">{point.preview}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </ApiState>
  )
}

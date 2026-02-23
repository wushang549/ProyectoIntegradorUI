import { useMemo, useState, type KeyboardEvent } from 'react'
import type { ClustersResponse, MapResponse } from '../api/analysis.types'
import ApiState from '../components/common/ApiState'
import AdvancedSection from '../components/common/AdvancedSection'
import ExpandableText from '../components/common/ExpandableText'
import SectionHeading from '../components/common/SectionHeading'
import ClustersThemeCards from '../components/themes/ClustersThemeCards'

type ClusterSortMode = 'size' | 'alphabetical'

type ClustersTabProps = {
  data: ClustersResponse | null
  mapData: MapResponse | null
  selectedClusterId: number | null
  selectedPointId: string | null
  onSelectCluster: (clusterId: number | null) => void
  onSelectPoint: (pointId: string | null, clusterId?: number | null) => void
  isLoading: boolean
  error?: string
  onRetry: () => void
}

export default function ClustersTab({
  data,
  mapData,
  selectedClusterId,
  selectedPointId,
  onSelectCluster,
  onSelectPoint,
  isLoading,
  error,
  onRetry,
}: ClustersTabProps) {
  const [search, setSearch] = useState('')
  const [sortMode, setSortMode] = useState<ClusterSortMode>('size')
  const [minClusterSize, setMinClusterSize] = useState(1)
  const [openItemsClusterId, setOpenItemsClusterId] = useState<number | null>(null)
  const [visibleItemsCount, setVisibleItemsCount] = useState(80)
  const [expandedItemKeys, setExpandedItemKeys] = useState<Record<string, boolean>>({})

  const maxClusterSize = useMemo(() => {
    const sizes = data?.clusters.map((cluster) => cluster.size) ?? []
    return sizes.length > 0 ? Math.max(...sizes) : 1
  }, [data?.clusters])

  const query = search.trim().toLowerCase()

  const visibleClusters = useMemo(() => {
    if (!data) return []

    const filtered = data.clusters.filter((cluster) => {
      if (cluster.size < minClusterSize) return false
      if (!query) return true

      const labelMatch = cluster.label.toLowerCase().includes(query)
      const termMatch = cluster.top_terms.some((term) => term.toLowerCase().includes(query))
      const previewMatch = cluster.representatives.some((rep) => rep.preview.toLowerCase().includes(query))
      return labelMatch || termMatch || previewMatch
    })

    const sorted = [...filtered]
    if (sortMode === 'alphabetical') {
      sorted.sort((left, right) => left.label.localeCompare(right.label))
      return sorted
    }

    sorted.sort((left, right) => right.size - left.size)
    return sorted
  }, [data, minClusterSize, query, sortMode])

  const openClusterItems = useMemo(() => {
    if (!mapData || openItemsClusterId === null) return []
    return mapData.points.filter((point) => point.cluster_id === openItemsClusterId)
  }, [mapData, openItemsClusterId])

  const pointsByClusterId = useMemo(() => {
    const map = new Map<number, Array<{ id: string; preview: string }>>()
    for (const point of mapData?.points ?? []) {
      const current = map.get(point.cluster_id) ?? []
      current.push({ id: point.id, preview: point.preview })
      map.set(point.cluster_id, current)
    }
    return map
  }, [mapData?.points])

  const handleItemKeyDown = (event: KeyboardEvent<HTMLDivElement>, pointId: string, clusterId: number) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    onSelectPoint(pointId, clusterId)
  }

  return (
    <ApiState
      isLoading={isLoading}
      error={error}
      onRetry={onRetry}
      isEmpty={!data || data.clusters.length === 0}
      emptyMessage="No themes were generated for this analysis."
    >
      {data && (
        <section className="chat-result-panel chat-section-panel">
          <SectionHeading
            title="Themes"
            subtitle="Ranked conversation patterns"
            meaning="What this means: each card is a theme with real call examples, ordered by how often it appears."
          />

          <div className="chat-themes-filters">
            <input
              type="text"
              className="chat-input chat-inline-input"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search themes, terms, or examples"
              aria-label="Search themes"
            />

            <label className="chat-filter-label">
              <span>Minimum calls: {minClusterSize}</span>
              <input
                type="range"
                min={1}
                max={Math.max(maxClusterSize, 1)}
                value={Math.min(minClusterSize, Math.max(maxClusterSize, 1))}
                onChange={(event) => setMinClusterSize(Number(event.target.value))}
              />
            </label>

            <label className="chat-filter-label">
              <span>Sort by</span>
              <select
                className="chat-select"
                value={sortMode}
                onChange={(event) => setSortMode(event.target.value as ClusterSortMode)}
              >
                <option value="size">Size</option>
                <option value="alphabetical">Alphabetical</option>
              </select>
            </label>
          </div>

          <p className="chat-muted-text">Showing {visibleClusters.length} themes.</p>

          <ClustersThemeCards
            clusters={visibleClusters}
            selectedClusterId={selectedClusterId}
            pointsByClusterId={pointsByClusterId}
            onSelectCluster={onSelectCluster}
            onSelectPoint={onSelectPoint}
            onViewItems={(clusterId) => {
              onSelectCluster(clusterId)
              setOpenItemsClusterId(clusterId)
              setVisibleItemsCount(80)
            }}
          />

          {openItemsClusterId !== null && (
            <section className="chat-theme-items-panel">
              <div className="chat-theme-items-head">
                <h3 className="chat-card-title">Calls in selected theme</h3>
                <p className="chat-muted-text">Preview text first. IDs stay secondary for troubleshooting.</p>
              </div>

              <div className="chat-theme-items-list" role="table" aria-label="Theme calls">
                {openClusterItems.slice(0, visibleItemsCount).map((point) => (
                  <div
                    key={`theme-item-${point.id}`}
                    className={`chat-theme-item-row ${selectedPointId === point.id ? 'chat-theme-item-row--active' : ''}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => onSelectPoint(point.id, point.cluster_id)}
                    onKeyDown={(event) => handleItemKeyDown(event, point.id, point.cluster_id)}
                  >
                    <ExpandableText
                      text={point.preview}
                      expanded={Boolean(expandedItemKeys[`item-${point.id}`])}
                      onToggle={() =>
                        setExpandedItemKeys((prev) => ({
                          ...prev,
                          [`item-${point.id}`]: !prev[`item-${point.id}`],
                        }))
                      }
                    />
                    <span className="chat-theme-item-id">{point.id}</span>
                  </div>
                ))}
              </div>

              {openClusterItems.length > visibleItemsCount && (
                <button
                  type="button"
                  className="chat-plain-btn"
                  onClick={() => setVisibleItemsCount((prev) => prev + 80)}
                >
                  Load more calls
                </button>
              )}
            </section>
          )}

          <AdvancedSection title="Advanced">
            <div className="chat-list-grid">
              {visibleClusters.map((cluster) => (
                <div key={`advanced-${cluster.cluster_id}`} className="chat-stat-card">
                  <span className="chat-stat-key">Cluster {cluster.cluster_id}</span>
                  <span className="chat-muted-text">{cluster.top_terms.join(', ')}</span>
                </div>
              ))}
            </div>
          </AdvancedSection>
        </section>
      )}
    </ApiState>
  )
}

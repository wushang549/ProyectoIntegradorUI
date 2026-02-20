import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react'
import type { MapResponse } from '../api/analysis.types'
import ApiState from '../components/common/ApiState'
import AdvancedSection from '../components/common/AdvancedSection'
import ExpandableText from '../components/common/ExpandableText'
import SectionHeading from '../components/common/SectionHeading'
import { getClusterStyle } from '../utils/insightsTheme'

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

type PositionedPoint = MapResponse['points'][number] & {
  plotX: number
  plotY: number
  clusterLabel: string
}

const PLOT_WIDTH = 980
const PLOT_HEIGHT = 560
const PLOT_PADDING = 32

function normalize(value: number, min: number, max: number, outputMin: number, outputMax: number) {
  if (!Number.isFinite(value) || !Number.isFinite(min) || !Number.isFinite(max) || max - min <= 0) {
    return (outputMin + outputMax) / 2
  }
  const ratio = (value - min) / (max - min)
  return outputMin + ratio * (outputMax - outputMin)
}

function safeNumeric(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value)
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
  const [expandedPointIds, setExpandedPointIds] = useState<Record<string, boolean>>({})
  const [visibleTableCount, setVisibleTableCount] = useState(120)
  const [hoveredPointId, setHoveredPointId] = useState<string | null>(null)
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null)
  const plotWrapRef = useRef<HTMLDivElement>(null)

  const searchQuery = search.trim().toLowerCase()

  const clustersSorted = useMemo(() => {
    if (!data) return []
    return [...data.clusters].sort((left, right) => right.size - left.size)
  }, [data])

  const clusterLabelById = useMemo(() => {
    const map = new Map<number, string>()
    for (const cluster of data?.clusters ?? []) {
      map.set(cluster.cluster_id, cluster.label)
    }
    return map
  }, [data?.clusters])

  const positionedPoints = useMemo(() => {
    if (!data || data.points.length === 0) return [] as PositionedPoint[]

    let minX = Number.POSITIVE_INFINITY
    let maxX = Number.NEGATIVE_INFINITY
    let minY = Number.POSITIVE_INFINITY
    let maxY = Number.NEGATIVE_INFINITY

    for (const point of data.points) {
      minX = Math.min(minX, point.x)
      maxX = Math.max(maxX, point.x)
      minY = Math.min(minY, point.y)
      maxY = Math.max(maxY, point.y)
    }

    return data.points.map((point) => ({
      ...point,
      clusterLabel:
        point.cluster_label || clusterLabelById.get(point.cluster_id) || `Theme ${point.cluster_id}`,
      plotX: normalize(point.x, minX, maxX, PLOT_PADDING, PLOT_WIDTH - PLOT_PADDING),
      plotY: normalize(point.y, minY, maxY, PLOT_HEIGHT - PLOT_PADDING, PLOT_PADDING),
    }))
  }, [clusterLabelById, data])

  const pointById = useMemo(() => {
    const map = new Map<string, PositionedPoint>()
    for (const point of positionedPoints) {
      map.set(point.id, point)
    }
    return map
  }, [positionedPoints])

  const hoveredPoint = hoveredPointId ? pointById.get(hoveredPointId) ?? null : null

  const visibleRawPoints = useMemo(() => {
    return positionedPoints.filter((point) => {
      const passesCluster = selectedClusterId === null || point.cluster_id === selectedClusterId
      const passesSearch = !searchQuery || point.preview.toLowerCase().includes(searchQuery)
      return passesCluster && passesSearch
    })
  }, [positionedPoints, searchQuery, selectedClusterId])

  const handleRowKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>, point: PositionedPoint) => {
      if (event.key !== 'Enter' && event.key !== ' ') return
      event.preventDefault()
      onSelectPoint(point.id, point.cluster_id)
    },
    [onSelectPoint]
  )

  const updateTooltipPosition = useCallback((event: ReactMouseEvent<SVGCircleElement>) => {
    const container = plotWrapRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()
    setTooltipPos({
      x: event.clientX - rect.left + 14,
      y: event.clientY - rect.top + 14,
    })
  }, [])

  return (
    <ApiState
      isLoading={isLoading}
      error={error}
      onRetry={onRetry}
      isEmpty={!data || data.points.length === 0}
      emptyMessage="No map data available for this analysis."
    >
      {data && (
        <section className="chat-result-panel chat-section-panel">
          <SectionHeading
            title="Map"
            subtitle="Nearby dots usually discuss similar issues"
            meaning="What this means: each dot is a call. Use this view to spot clusters and outliers quickly."
          />

          <div className="chat-map-toolbar">
            <input
              type="text"
              className="chat-input chat-inline-input"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search calls on map"
              aria-label="Search map calls"
            />
            <button type="button" className="chat-plain-btn" onClick={() => onSelectCluster(null)}>
              Clear theme filter
            </button>
          </div>

          <div className="chat-map-legend" aria-label="Theme legend">
            {clustersSorted.map((cluster) => {
              const style = getClusterStyle(cluster.cluster_id)
              const isActive = selectedClusterId === cluster.cluster_id
              return (
                <button
                  key={cluster.cluster_id}
                  type="button"
                  className={`chat-map-legend-item ${isActive ? 'chat-map-legend-item--active' : ''}`}
                  onClick={() => onSelectCluster(isActive ? null : cluster.cluster_id)}
                  style={{ borderColor: isActive ? style.border : undefined }}
                >
                  <span className="chat-map-legend-dot" style={{ backgroundColor: style.accent }} aria-hidden />
                  <span className="chat-map-legend-label">{cluster.label}</span>
                  <strong>{cluster.size}</strong>
                </button>
              )
            })}
          </div>

          <div className="chat-map-plot-wrap" ref={plotWrapRef}>
            <svg
              className="chat-map-plot"
              viewBox={`0 0 ${PLOT_WIDTH} ${PLOT_HEIGHT}`}
              role="img"
              aria-label="Theme map"
            >
              <rect
                x={PLOT_PADDING}
                y={PLOT_PADDING}
                width={PLOT_WIDTH - PLOT_PADDING * 2}
                height={PLOT_HEIGHT - PLOT_PADDING * 2}
                className="chat-map-plot-bg"
              />

              {positionedPoints.map((point) => {
                const style = getClusterStyle(point.cluster_id)
                const matchesSearch = !searchQuery || point.preview.toLowerCase().includes(searchQuery)
                const fadedByCluster = selectedClusterId !== null && point.cluster_id !== selectedClusterId
                const fadedBySearch = searchQuery.length > 0 && !matchesSearch
                const isFaded = fadedByCluster || fadedBySearch
                const isSelected = selectedPointId === point.id
                const isClusterSelected = selectedClusterId !== null && point.cluster_id === selectedClusterId
                const radius = isSelected ? 8 : isClusterSelected ? 6.2 : 5

                return (
                  <circle
                    key={point.id}
                    cx={point.plotX}
                    cy={point.plotY}
                    r={radius}
                    fill={style.accent}
                    stroke={isSelected ? '#0f172a' : '#ffffff'}
                    strokeWidth={isSelected ? 2 : 1}
                    opacity={isFaded ? 0.16 : 0.92}
                    className="chat-map-dot"
                    onMouseEnter={(event) => {
                      setHoveredPointId(point.id)
                      updateTooltipPosition(event)
                    }}
                    onMouseMove={updateTooltipPosition}
                    onMouseLeave={() => {
                      setHoveredPointId((current) => (current === point.id ? null : current))
                      setTooltipPos(null)
                    }}
                    onClick={() => onSelectPoint(point.id, point.cluster_id)}
                  />
                )
              })}
            </svg>

            {hoveredPoint && tooltipPos && (
              <div className="chat-map-tooltip" style={{ left: tooltipPos.x, top: tooltipPos.y }} role="tooltip">
                <p className="chat-map-tooltip-theme">{hoveredPoint.clusterLabel}</p>
                <p className="chat-map-tooltip-text">{hoveredPoint.preview}</p>
                {Object.entries(hoveredPoint.metadata ?? {})
                  .filter(([, value]) => value !== null && value !== undefined)
                  .slice(0, 2)
                  .map(([key, value]) => (
                    <p key={`meta-${hoveredPoint.id}-${key}`} className="chat-map-tooltip-meta">
                      {key}: {String(value)}
                    </p>
                  ))}
              </div>
            )}
          </div>

          <AdvancedSection title="Advanced: map diagnostics">
            <div className="chat-stats-grid">
              <article className="chat-stat-card">
                <span className="chat-stat-key">UMAP scaled</span>
                <strong className="chat-stat-value">{data.advanced.umap_scaled ? 'Yes' : 'No'}</strong>
              </article>
              <article className="chat-stat-card">
                <span className="chat-stat-key">Scale clamp</span>
                <strong className="chat-stat-value">{data.advanced.scale_clamp}</strong>
              </article>
            </div>

            <div className="chat-map-advanced-table" role="table" aria-label="Raw map points">
              <div className="chat-map-advanced-row chat-map-advanced-row--head" role="row">
                <span>Call</span>
                <span>Theme</span>
                <span>X</span>
                <span>Y</span>
                <span>Raw X</span>
                <span>Raw Y</span>
                <span>Preview</span>
              </div>

              {visibleRawPoints.slice(0, visibleTableCount).map((point) => (
                <div
                  key={`raw-${point.id}`}
                  className={`chat-map-advanced-row ${selectedPointId === point.id ? 'chat-map-advanced-row--active' : ''}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelectPoint(point.id, point.cluster_id)}
                  onKeyDown={(event) => handleRowKeyDown(event, point)}
                >
                  <span>{point.id}</span>
                  <span>{point.clusterLabel}</span>
                  <span>{point.x.toFixed(3)}</span>
                  <span>{point.y.toFixed(3)}</span>
                  <span>{safeNumeric(point.x_raw) ? point.x_raw.toFixed(3) : '-'}</span>
                  <span>{safeNumeric(point.y_raw) ? point.y_raw.toFixed(3) : '-'}</span>
                  <ExpandableText
                    text={point.preview}
                    expanded={Boolean(expandedPointIds[point.id])}
                    onToggle={() =>
                      setExpandedPointIds((prev) => ({
                        ...prev,
                        [point.id]: !prev[point.id],
                      }))
                    }
                  />
                </div>
              ))}
            </div>

            {visibleRawPoints.length > visibleTableCount && (
              <button
                type="button"
                className="chat-plain-btn"
                onClick={() => setVisibleTableCount((prev) => prev + 120)}
              >
                Load more rows
              </button>
            )}
          </AdvancedSection>
        </section>
      )}
    </ApiState>
  )
}

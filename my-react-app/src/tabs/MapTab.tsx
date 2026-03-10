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

type MapShape = 'circle' | 'square' | 'triangle' | 'diamond'

type ClusterVisual = {
  accent: string
  border: string
  shape: MapShape
}

type AxisTick = {
  value: number
  label: string
  plotPos: number
}

const PLOT_WIDTH = 980
const PLOT_HEIGHT = 560
const PLOT_PADDING = 32
const DOT_SAFE_PADDING = 10
const AXIS_TICK_COUNT = 5
const TOOLTIP_OFFSET = 14
const TOOLTIP_EDGE_GAP = 8
const TOOLTIP_MAX_WIDTH = 340
const TOOLTIP_ESTIMATED_HEIGHT = 180
const PLOT_LEFT = PLOT_PADDING + DOT_SAFE_PADDING
const PLOT_RIGHT = PLOT_WIDTH - PLOT_PADDING - DOT_SAFE_PADDING
const PLOT_TOP = PLOT_PADDING + DOT_SAFE_PADDING
const PLOT_BOTTOM = PLOT_HEIGHT - PLOT_PADDING - DOT_SAFE_PADDING

const MAP_COLOR_PALETTE = [
  '#e11d48',
  '#2563eb',
  '#059669',
  '#f59e0b',
  '#9333ea',
  '#0891b2',
  '#dc2626',
  '#65a30d',
  '#f97316',
  '#7c3aed',
  '#0d9488',
  '#db2777',
  '#0369a1',
  '#16a34a',
  '#ca8a04',
  '#4f46e5',
  '#b91c1c',
  '#15803d',
  '#ea580c',
  '#6d28d9',
  '#0f766e',
  '#be185d',
  '#1d4ed8',
  '#a16207',
]

const SHAPE_FALLBACKS: MapShape[] = ['triangle', 'square', 'diamond']

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

function clamp(value: number, min: number, max: number) {
  if (max <= min) return min
  return Math.min(Math.max(value, min), max)
}

function formatAxisValue(value: number) {
  if (!Number.isFinite(value)) return '-'

  const absolute = Math.abs(value)
  const digits = absolute >= 100 ? 0 : absolute >= 10 ? 1 : absolute >= 1 ? 2 : 3
  return value.toFixed(digits).replace(/\.?0+$/, '')
}

function buildTickValues(min: number, max: number, count: number) {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [] as number[]
  if (count <= 1 || Math.abs(max - min) < Number.EPSILON) return [min]

  return Array.from({ length: count }, (_, index) => min + ((max - min) * index) / (count - 1))
}

function borderFromAccent(accent: string) {
  return accent
}

function generatedAccent(index: number) {
  const hue = Math.round((index * 137.508) % 360)
  return `hsl(${hue} 74% 48%)`
}

function clusterVisualForIndex(index: number): ClusterVisual {
  const accent =
    index < MAP_COLOR_PALETTE.length ? MAP_COLOR_PALETTE[index] : generatedAccent(index)
  const shape: MapShape =
    index < MAP_COLOR_PALETTE.length
      ? 'circle'
      : SHAPE_FALLBACKS[(index - MAP_COLOR_PALETTE.length) % SHAPE_FALLBACKS.length]

  return {
    accent,
    border: borderFromAccent(accent),
    shape,
  }
}

function markerNode(
  shape: MapShape,
  size: number,
  fill: string,
  stroke: string,
  strokeWidth: number
) {
  if (shape === 'square') {
    return (
      <rect
        x={-size}
        y={-size}
        width={size * 2}
        height={size * 2}
        rx={1.8}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
    )
  }

  if (shape === 'triangle') {
    return (
      <polygon
        points={`0,${-size} ${size},${size} ${-size},${size}`}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
    )
  }

  if (shape === 'diamond') {
    return (
      <polygon
        points={`0,${-size} ${size},0 0,${size} ${-size},0`}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
    )
  }

  return <circle cx={0} cy={0} r={size} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
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

  const clusterVisualById = useMemo(() => {
    const map = new Map<number, ClusterVisual>()
    for (const [index, cluster] of clustersSorted.entries()) {
      map.set(cluster.cluster_id, clusterVisualForIndex(index))
    }
    return map
  }, [clustersSorted])

  const clusterLabelById = useMemo(() => {
    const map = new Map<number, string>()
    for (const cluster of data?.clusters ?? []) {
      map.set(cluster.cluster_id, cluster.label)
    }
    return map
  }, [data?.clusters])

  const mapBounds = useMemo(() => {
    if (!data || data.points.length === 0) return null

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

    return { minX, maxX, minY, maxY }
  }, [data])

  const positionedPoints = useMemo(() => {
    if (!data || !mapBounds) return [] as PositionedPoint[]

    const { minX, maxX, minY, maxY } = mapBounds

    return data.points.map((point) => ({
      ...point,
      clusterLabel:
        point.cluster_label || clusterLabelById.get(point.cluster_id) || `Theme ${point.cluster_id}`,
      plotX: normalize(
        point.x,
        minX,
        maxX,
        PLOT_LEFT,
        PLOT_RIGHT
      ),
      plotY: normalize(
        point.y,
        minY,
        maxY,
        PLOT_BOTTOM,
        PLOT_TOP
      ),
    }))
  }, [clusterLabelById, data, mapBounds])

  const axisTicks = useMemo(() => {
    if (!mapBounds) {
      return {
        x: [] as AxisTick[],
        y: [] as AxisTick[],
      }
    }

    const xTicks = buildTickValues(mapBounds.minX, mapBounds.maxX, AXIS_TICK_COUNT).map((value) => ({
      value,
      label: formatAxisValue(value),
      plotPos: normalize(value, mapBounds.minX, mapBounds.maxX, PLOT_LEFT, PLOT_RIGHT),
    }))
    const yTicks = buildTickValues(mapBounds.minY, mapBounds.maxY, AXIS_TICK_COUNT).map((value) => ({
      value,
      label: formatAxisValue(value),
      plotPos: normalize(value, mapBounds.minY, mapBounds.maxY, PLOT_BOTTOM, PLOT_TOP),
    }))

    return {
      x: xTicks,
      y: yTicks,
    }
  }, [mapBounds])

  const xAxisLabel = data?.advanced.umap_scaled ? 'Scaled UMAP-1' : 'UMAP-1'
  const yAxisLabel = data?.advanced.umap_scaled ? 'Scaled UMAP-2' : 'UMAP-2'

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

  const updateTooltipPosition = useCallback((event: ReactMouseEvent<SVGElement>) => {
    const container = plotWrapRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()
    const containerWidth = container.clientWidth
    const containerHeight = container.clientHeight
    const maxLeft = containerWidth - TOOLTIP_MAX_WIDTH - TOOLTIP_EDGE_GAP
    const maxTop = containerHeight - TOOLTIP_ESTIMATED_HEIGHT - TOOLTIP_EDGE_GAP

    setTooltipPos({
      x: clamp(event.clientX - rect.left + TOOLTIP_OFFSET, TOOLTIP_EDGE_GAP, maxLeft),
      y: clamp(event.clientY - rect.top + TOOLTIP_OFFSET, TOOLTIP_EDGE_GAP, maxTop),
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
              const visual = clusterVisualById.get(cluster.cluster_id) ?? clusterVisualForIndex(0)
              const isActive = selectedClusterId === cluster.cluster_id
              return (
                <button
                  key={cluster.cluster_id}
                  type="button"
                  className={`chat-map-legend-item ${isActive ? 'chat-map-legend-item--active' : ''}`}
                  onClick={() => onSelectCluster(isActive ? null : cluster.cluster_id)}
                  style={{ borderColor: isActive ? visual.border : undefined }}
                >
                  <svg className="chat-map-legend-symbol" viewBox="-10 -10 20 20" aria-hidden>
                    {markerNode(visual.shape, 5.2, visual.accent, '#ffffff', 1)}
                  </svg>
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

              <g aria-hidden>
                {axisTicks.x.map((tick) => (
                  <line
                    key={`grid-x-${tick.value}`}
                    x1={tick.plotPos}
                    y1={PLOT_TOP}
                    x2={tick.plotPos}
                    y2={PLOT_BOTTOM}
                    className="chat-map-grid-line"
                  />
                ))}
                {axisTicks.y.map((tick) => (
                  <line
                    key={`grid-y-${tick.value}`}
                    x1={PLOT_LEFT}
                    y1={tick.plotPos}
                    x2={PLOT_RIGHT}
                    y2={tick.plotPos}
                    className="chat-map-grid-line"
                  />
                ))}
              </g>

              <g aria-hidden>
                <line x1={PLOT_LEFT} y1={PLOT_BOTTOM} x2={PLOT_RIGHT} y2={PLOT_BOTTOM} className="chat-map-axis-line" />
                <line x1={PLOT_LEFT} y1={PLOT_TOP} x2={PLOT_LEFT} y2={PLOT_BOTTOM} className="chat-map-axis-line" />

                {axisTicks.x.map((tick) => (
                  <g key={`axis-x-${tick.value}`}>
                    <line
                      x1={tick.plotPos}
                      y1={PLOT_BOTTOM}
                      x2={tick.plotPos}
                      y2={PLOT_BOTTOM + 6}
                      className="chat-map-axis-tick"
                    />
                    <text x={tick.plotPos} y={PLOT_BOTTOM + 18} textAnchor="middle" className="chat-map-axis-value">
                      {tick.label}
                    </text>
                  </g>
                ))}

                {axisTicks.y.map((tick) => (
                  <g key={`axis-y-${tick.value}`}>
                    <line
                      x1={PLOT_LEFT - 6}
                      y1={tick.plotPos}
                      x2={PLOT_LEFT}
                      y2={tick.plotPos}
                      className="chat-map-axis-tick"
                    />
                    <text x={PLOT_LEFT - 10} y={tick.plotPos + 4} textAnchor="end" className="chat-map-axis-value">
                      {tick.label}
                    </text>
                  </g>
                ))}

                <text
                  x={(PLOT_LEFT + PLOT_RIGHT) / 2}
                  y={PLOT_HEIGHT - 8}
                  textAnchor="middle"
                  className="chat-map-axis-label"
                >
                  {xAxisLabel}
                </text>
                <text
                  x={14}
                  y={(PLOT_TOP + PLOT_BOTTOM) / 2}
                  textAnchor="middle"
                  transform={`rotate(-90 14 ${(PLOT_TOP + PLOT_BOTTOM) / 2})`}
                  className="chat-map-axis-label"
                >
                  {yAxisLabel}
                </text>
              </g>

              {positionedPoints.map((point) => {
                const visual = clusterVisualById.get(point.cluster_id) ?? clusterVisualForIndex(0)
                const matchesSearch = !searchQuery || point.preview.toLowerCase().includes(searchQuery)
                const fadedByCluster = selectedClusterId !== null && point.cluster_id !== selectedClusterId
                const fadedBySearch = searchQuery.length > 0 && !matchesSearch
                const isFaded = fadedByCluster || fadedBySearch
                const isSelected = selectedPointId === point.id
                const isClusterSelected = selectedClusterId !== null && point.cluster_id === selectedClusterId
                const markerSize = isSelected ? 7.8 : isClusterSelected ? 6.2 : 5.2

                return (
                  <g
                    key={point.id}
                    transform={`translate(${point.plotX}, ${point.plotY})`}
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
                  >
                    {markerNode(
                      visual.shape,
                      markerSize,
                      visual.accent,
                      isSelected ? '#0f172a' : '#ffffff',
                      isSelected ? 2 : 1
                    )}
                  </g>
                )
              })}
            </svg>

            {hoveredPoint && tooltipPos && (
              <div className="chat-map-tooltip" style={{ left: tooltipPos.x, top: tooltipPos.y }} role="tooltip">
                <p className="chat-map-tooltip-theme">{hoveredPoint.clusterLabel}</p>
                <p className="chat-map-tooltip-text">{hoveredPoint.preview}</p>
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

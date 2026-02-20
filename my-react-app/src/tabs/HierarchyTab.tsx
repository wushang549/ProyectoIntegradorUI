import { useMemo, useState } from 'react'
import type { HierarchyNode, HierarchyResponse, MapResponse } from '../api/analysis.types'
import ApiState from '../components/common/ApiState'
import AdvancedSection from '../components/common/AdvancedSection'
import ExpandableText from '../components/common/ExpandableText'
import SectionHeading from '../components/common/SectionHeading'
import Dendrogram from '../components/hierarchy/Dendrogram'
import { humanThemeLabel } from '../utils/insightsTheme'

type HierarchyTabProps = {
  data: HierarchyResponse | null
  mapData: MapResponse | null
  selectedClusterId: number | null
  selectedPointId: string | null
  selectedNodeId: string | null
  onSelectCluster: (clusterId: number | null) => void
  onSelectPoint: (pointId: string | null, clusterId?: number | null, nodeId?: string | null) => void
  onSelectNode: (nodeId: string | null, clusterId?: number | null) => void
  onOpenNodeItems: (clusterId: number) => void
  onClearFilters: () => void
  isLoading: boolean
  error?: string
  onRetry: () => void
}

type TreeRow = {
  node: HierarchyNode
  depth: number
}

function qualityBand(value: number) {
  if (!Number.isFinite(value)) return 'Unknown'
  if (value >= 0.66) return 'High'
  if (value >= 0.4) return 'Medium'
  return 'Low'
}

function normalizePercent(value: number) {
  if (!Number.isFinite(value)) return '0%'
  return `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`
}

function similarityBand(node: HierarchyNode) {
  const values = [node.cohesion, node.similarity].filter((value) => Number.isFinite(value))
  if (values.length === 0) return 'Unknown'
  const avg = values.reduce((sum, value) => sum + value, 0) / values.length
  return qualityBand(avg)
}

export default function HierarchyTab({
  data,
  mapData,
  selectedClusterId,
  selectedPointId,
  selectedNodeId,
  onSelectCluster,
  onSelectPoint,
  onSelectNode,
  onOpenNodeItems,
  onClearFilters,
  isLoading,
  error,
  onRetry,
}: HierarchyTabProps) {
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({})
  const [expandedExamples, setExpandedExamples] = useState<Record<string, boolean>>({})

  const isEmpty = !data || !data.root_id || Object.keys(data.nodes).length === 0

  const leavesByNodeId = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const leaf of data?.leaves ?? []) {
      const current = map.get(leaf.node_id) ?? []
      current.push(leaf.id)
      map.set(leaf.node_id, current)
    }
    return map
  }, [data?.leaves])

  const descendantLeafIdsByNode = useMemo(() => {
    const nodes = data?.nodes ?? {}
    const cache = new Map<string, string[]>()

    const visit = (nodeId: string): string[] => {
      const cached = cache.get(nodeId)
      if (cached) return cached

      const node = nodes[nodeId]
      if (!node) {
        cache.set(nodeId, [])
        return []
      }

      if (node.children_ids.length === 0) {
        const leafIds = leavesByNodeId.get(nodeId) ?? []
        cache.set(nodeId, leafIds)
        return leafIds
      }

      const descendantIds = node.children_ids.flatMap((childId) => visit(childId))
      cache.set(nodeId, descendantIds)
      return descendantIds
    }

    for (const nodeId of Object.keys(nodes)) {
      visit(nodeId)
    }

    return cache
  }, [data?.nodes, leavesByNodeId])

  const pointById = useMemo(() => {
    const map = new Map<string, MapResponse['points'][number]>()
    for (const point of mapData?.points ?? []) {
      map.set(point.id, point)
    }
    return map
  }, [mapData?.points])

  const treeRows = useMemo(() => {
    if (!data) return [] as TreeRow[]

    const rows: TreeRow[] = []

    const walk = (nodeId: string, depth: number) => {
      const node = data.nodes[nodeId]
      if (!node) return
      rows.push({ node, depth })

      const isExpanded = expandedNodes[nodeId] ?? nodeId === data.root_id
      if (!isExpanded) return

      const children = [...node.children_ids].filter((childId) => Boolean(data.nodes[childId]))
      children.sort((leftId, rightId) => {
        const left = data.nodes[leftId]
        const right = data.nodes[rightId]
        const leftCount = left?.descendant_leaf_count ?? left?.size ?? 0
        const rightCount = right?.descendant_leaf_count ?? right?.size ?? 0
        return rightCount - leftCount
      })

      for (const childId of children) {
        walk(childId, depth + 1)
      }
    }

    walk(data.root_id, 0)
    return rows
  }, [data, expandedNodes])

  const selectedNode = selectedNodeId ? data?.nodes[selectedNodeId] ?? null : null

  const selectedNodeExamples = useMemo(() => {
    if (!selectedNodeId) return [] as MapResponse['points']

    const leafIds = descendantLeafIdsByNode.get(selectedNodeId) ?? []
    return leafIds
      .map((leafId) => pointById.get(leafId))
      .filter(Boolean)
      .slice(0, 5) as MapResponse['points']
  }, [descendantLeafIdsByNode, pointById, selectedNodeId])

  return (
    <ApiState
      isLoading={isLoading}
      error={error}
      onRetry={onRetry}
      isEmpty={isEmpty}
      emptyMessage="No theme tree is available for this analysis."
    >
      {data && (
        <section className="chat-result-panel chat-section-panel">
          <SectionHeading
            title="Theme tree"
            subtitle="How specific themes combine into broader ones"
            meaning="What this means: this is a tree of themes. Lower merges are more similar; higher merges are broader."
          />

          <div className="chat-tree-list" role="tree" aria-label="Theme tree list">
            {treeRows.map(({ node, depth }) => {
              const isSelected = selectedNodeId === node.node_id
              const hasChildren = node.children_ids.length > 0
              const isExpanded = expandedNodes[node.node_id] ?? node.node_id === data.root_id
              const label = humanThemeLabel(node.label, node.descendant_leaf_count || node.size)
              const share = normalizePercent(node.dominant_cluster_share)
              const quality = similarityBand(node)

              return (
                <div
                  key={node.node_id}
                  className={`chat-tree-row ${isSelected ? 'chat-tree-row--active' : ''}`}
                  role="treeitem"
                  aria-expanded={hasChildren ? isExpanded : undefined}
                  style={{ paddingLeft: `${Math.min(depth * 18 + 14, 120)}px` }}
                >
                  <div className="chat-tree-row-main">
                    {hasChildren && (
                      <button
                        type="button"
                        className="chat-tree-toggle"
                        onClick={() =>
                          setExpandedNodes((prev) => ({
                            ...prev,
                            [node.node_id]: !isExpanded,
                          }))
                        }
                        aria-label={isExpanded ? 'Collapse node' : 'Expand node'}
                      >
                        {isExpanded ? '-' : '+'}
                      </button>
                    )}

                    {!hasChildren && <span className="chat-tree-toggle chat-tree-toggle--leaf" aria-hidden>•</span>}

                    <button
                      type="button"
                      className="chat-tree-select"
                      onClick={() => onSelectNode(node.node_id, node.dominant_cluster_id ?? undefined)}
                    >
                      <span className="chat-tree-label">{label}</span>
                      <span className="chat-tree-count">{node.descendant_leaf_count || node.size} calls</span>
                    </button>

                    {node.dominant_cluster_id !== null && (
                      <span className="chat-tree-dominant">Theme {node.dominant_cluster_id} ({share})</span>
                    )}

                    <span className={`chat-tree-quality chat-tree-quality--${quality.toLowerCase()}`}>
                      {quality}
                    </span>
                  </div>

                  {node.summary && <p className="chat-tree-summary">{node.summary}</p>}
                </div>
              )
            })}
          </div>

          {selectedNode && (
            <section className="chat-tree-selection-panel">
              <div className="chat-theme-items-head">
                <h3 className="chat-card-title">Selected branch</h3>
                <p className="chat-muted-text">
                  {humanThemeLabel(selectedNode.label, selectedNode.descendant_leaf_count || selectedNode.size)} with{' '}
                  {selectedNode.descendant_leaf_count || selectedNode.size} calls.
                </p>
              </div>

              <div className="chat-list-grid">
                {selectedNodeExamples.map((point) => (
                  <div
                    key={`tree-example-${point.id}`}
                    className={`chat-list-item chat-list-item--small ${selectedPointId === point.id ? 'chat-list-item--active' : ''}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => onSelectPoint(point.id, point.cluster_id, selectedNode.node_id)}
                    onKeyDown={(event) => {
                      if (event.key !== 'Enter' && event.key !== ' ') return
                      event.preventDefault()
                      onSelectPoint(point.id, point.cluster_id, selectedNode.node_id)
                    }}
                  >
                    <ExpandableText
                      text={point.preview}
                      expanded={Boolean(expandedExamples[point.id])}
                      onToggle={() =>
                        setExpandedExamples((prev) => ({
                          ...prev,
                          [point.id]: !prev[point.id],
                        }))
                      }
                    />
                  </div>
                ))}
              </div>

              <div className="chat-hierarchy-actions">
                <button
                  type="button"
                  className="chat-plain-btn"
                  disabled={selectedNode.dominant_cluster_id === null}
                  onClick={() => {
                    if (selectedNode.dominant_cluster_id === null) return
                    onOpenNodeItems(selectedNode.dominant_cluster_id)
                  }}
                >
                  Open all calls
                </button>
                <button
                  type="button"
                  className="chat-plain-btn"
                  disabled={selectedNode.dominant_cluster_id === null}
                  onClick={() => {
                    if (selectedNode.dominant_cluster_id === null) return
                    onSelectCluster(selectedNode.dominant_cluster_id)
                  }}
                >
                  Select dominant theme
                </button>
                <button type="button" className="chat-plain-btn" onClick={onClearFilters}>
                  Clear filters
                </button>
              </div>
            </section>
          )}

          <AdvancedSection title="Advanced: dendrogram and merge distance">
            <p className="chat-muted-text">
              Merge distance appears on this technical view only. Lower distance means tighter thematic similarity.
            </p>
            <div className="chat-dendrogram-wrap">
              <Dendrogram
                hierarchy={data}
                selectedClusterId={selectedClusterId}
                selectedPointId={selectedPointId}
                selectedNodeId={selectedNodeId}
                onSelectCluster={onSelectCluster}
                onSelectPoint={onSelectPoint}
                onSelectNode={onSelectNode}
                showMergeScale
              />
            </div>
          </AdvancedSection>
        </section>
      )}
    </ApiState>
  )
}

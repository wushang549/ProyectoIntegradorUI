import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react'
import type { HierarchyResponse } from '../../api/analysis.types'

type DendrogramProps = {
  hierarchy: HierarchyResponse
  selectedClusterId: number | null
  selectedPointId: string | null
  onSelectCluster: (clusterId: number | null) => void
  onSelectPoint: (pointId: string | null, clusterId?: number | null) => void
  onInspectNode?: (inspection: HierarchyInspection | null) => void
}

export type HierarchyInspection = {
  nodeId: string
  label: string
  size: number
  height: number
  dominantClusterId: number | null
  descendantLeafCount: number
}

type HierarchyLeaf = HierarchyResponse['leaves'][number]

const SVG_WIDTH = 1180
const SVG_HEIGHT = 560
const SVG_MARGIN = 48

type ClusterStyle = {
  link: string
  nodeFill: string
  nodeStroke: string
}

const CLUSTER_PALETTE: ClusterStyle[] = [
  { link: 'rgba(104, 126, 150, 0.62)', nodeFill: 'rgba(104, 126, 150, 0.22)', nodeStroke: '#526a84' },
  { link: 'rgba(104, 142, 128, 0.62)', nodeFill: 'rgba(104, 142, 128, 0.22)', nodeStroke: '#4f6f62' },
  { link: 'rgba(125, 132, 168, 0.62)', nodeFill: 'rgba(125, 132, 168, 0.22)', nodeStroke: '#58608a' },
  { link: 'rgba(150, 126, 110, 0.62)', nodeFill: 'rgba(150, 126, 110, 0.22)', nodeStroke: '#7f6655' },
  { link: 'rgba(128, 146, 104, 0.62)', nodeFill: 'rgba(128, 146, 104, 0.22)', nodeStroke: '#63754c' },
  { link: 'rgba(134, 120, 147, 0.62)', nodeFill: 'rgba(134, 120, 147, 0.22)', nodeStroke: '#675975' },
  { link: 'rgba(103, 146, 152, 0.62)', nodeFill: 'rgba(103, 146, 152, 0.22)', nodeStroke: '#4f7478' },
  { link: 'rgba(150, 121, 132, 0.62)', nodeFill: 'rgba(150, 121, 132, 0.22)', nodeStroke: '#7a5864' },
  { link: 'rgba(117, 136, 112, 0.62)', nodeFill: 'rgba(117, 136, 112, 0.22)', nodeStroke: '#5b6e54' },
  { link: 'rgba(144, 128, 158, 0.62)', nodeFill: 'rgba(144, 128, 158, 0.22)', nodeStroke: '#6e607b' },
]

const DEFAULT_CLUSTER_STYLE: ClusterStyle = {
  link: 'rgba(15, 23, 42, 0.28)',
  nodeFill: 'rgba(148, 163, 184, 0.16)',
  nodeStroke: '#64748b',
}

function clusterStyle(clusterId: number | null | undefined): ClusterStyle {
  if (clusterId === null || clusterId === undefined || !Number.isFinite(clusterId)) {
    return DEFAULT_CLUSTER_STYLE
  }
  const index = Math.abs(clusterId) % CLUSTER_PALETTE.length
  return CLUSTER_PALETTE[index]
}

function dominantClusterId(leaves: HierarchyLeaf[]): number | null {
  if (leaves.length === 0) return null

  const counts = new Map<number, number>()
  for (const leaf of leaves) {
    counts.set(leaf.cluster_id, (counts.get(leaf.cluster_id) ?? 0) + 1)
  }

  let topCluster: number | null = null
  let topCount = 0
  for (const [clusterId, count] of counts.entries()) {
    if (count > topCount) {
      topCluster = clusterId
      topCount = count
    }
  }

  return topCluster
}

export default function Dendrogram({
  hierarchy,
  selectedClusterId,
  selectedPointId,
  onSelectCluster,
  onSelectPoint,
  onInspectNode,
}: DendrogramProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)
  const [collapsedNodes, setCollapsedNodes] = useState<Record<string, boolean>>({})

  const nodes = hierarchy.nodes
  const rootId = hierarchy.root_id

  const leavesByNodeId = useMemo(() => {
    const map = new Map<string, HierarchyLeaf>()
    for (const leaf of hierarchy.leaves) {
      map.set(leaf.node_id, leaf)
    }
    return map
  }, [hierarchy.leaves])

  const leafNodeByPointId = useMemo(() => {
    const map = new Map<string, HierarchyLeaf>()
    for (const leaf of hierarchy.leaves) {
      map.set(leaf.id, leaf)
    }
    return map
  }, [hierarchy.leaves])

  const descendantLeavesByNode = useMemo(() => {
    const cache = new Map<string, HierarchyLeaf[]>()

    const visit = (nodeId: string): HierarchyLeaf[] => {
      const cached = cache.get(nodeId)
      if (cached) return cached

      const node = nodes[nodeId]
      if (!node) {
        cache.set(nodeId, [])
        return []
      }

      if (node.children_ids.length === 0) {
        const leaf = leavesByNodeId.get(nodeId)
        const result = leaf ? [leaf] : []
        cache.set(nodeId, result)
        return result
      }

      const result = node.children_ids.flatMap((childId) => visit(childId))
      cache.set(nodeId, result)
      return result
    }

    for (const nodeId of Object.keys(nodes)) {
      visit(nodeId)
    }

    return cache
  }, [leavesByNodeId, nodes])

  const leafOrder = useMemo(() => {
    const ordered: string[] = []

    const walk = (nodeId: string) => {
      const node = nodes[nodeId]
      if (!node) return
      if (node.children_ids.length === 0) {
        ordered.push(nodeId)
        return
      }
      for (const childId of node.children_ids) {
        walk(childId)
      }
    }

    walk(rootId)

    if (ordered.length === 0 && nodes[rootId]) {
      ordered.push(rootId)
    }

    return ordered
  }, [nodes, rootId])

  const leafIndexByNodeId = useMemo(() => {
    const map = new Map<string, number>()
    leafOrder.forEach((nodeId, index) => {
      map.set(nodeId, index)
    })
    return map
  }, [leafOrder])

  const dominantClusterByNode = useMemo(() => {
    const map = new Map<string, number | null>()

    for (const [nodeId, node] of Object.entries(nodes)) {
      if (node.children_ids.length === 0) {
        map.set(nodeId, leavesByNodeId.get(nodeId)?.cluster_id ?? null)
        continue
      }
      const descendants = descendantLeavesByNode.get(nodeId) ?? []
      map.set(nodeId, dominantClusterId(descendants))
    }

    return map
  }, [descendantLeavesByNode, leavesByNodeId, nodes])

  const layout = useMemo(() => {
    const xByNodeId = new Map<string, number>()
    const yByNodeId = new Map<string, number>()
    const leafCount = Math.max(leafOrder.length, 1)
    const maxHeight = Math.max(...Object.values(nodes).map((node) => node.height), 0)

    const calcX = (nodeId: string): number => {
      const existing = xByNodeId.get(nodeId)
      if (typeof existing === 'number') return existing

      const node = nodes[nodeId]
      if (!node) {
        const fallback = SVG_WIDTH / 2
        xByNodeId.set(nodeId, fallback)
        return fallback
      }

      if (node.children_ids.length === 0) {
        const leafIndex = leafIndexByNodeId.get(nodeId) ?? 0
        const x =
          leafCount <= 1
            ? SVG_WIDTH / 2
            : SVG_MARGIN + (leafIndex * (SVG_WIDTH - SVG_MARGIN * 2)) / (leafCount - 1)
        xByNodeId.set(nodeId, x)
        return x
      }

      const childXs = node.children_ids.map((childId) => calcX(childId))
      const x = childXs.reduce((sum, value) => sum + value, 0) / Math.max(childXs.length, 1)
      xByNodeId.set(nodeId, x)
      return x
    }

    const calcY = (height: number) => {
      if (maxHeight <= 0) return SVG_HEIGHT - SVG_MARGIN
      return SVG_MARGIN + ((maxHeight - height) / maxHeight) * (SVG_HEIGHT - SVG_MARGIN * 2)
    }

    for (const [nodeId, node] of Object.entries(nodes)) {
      calcX(nodeId)
      yByNodeId.set(nodeId, calcY(node.height))
    }

    return {
      xByNodeId,
      yByNodeId,
      maxHeight,
    }
  }, [leafIndexByNodeId, leafOrder.length, nodes])

  const heightTicks = useMemo(() => {
    if (layout.maxHeight <= 0) {
      return [
        {
          y: SVG_HEIGHT - SVG_MARGIN,
          label: '0',
        },
      ]
    }

    const tickCount = 5
    const plotHeight = SVG_HEIGHT - SVG_MARGIN * 2
    return Array.from({ length: tickCount }, (_, index) => {
      const progress = index / (tickCount - 1)
      const y = SVG_MARGIN + progress * plotHeight
      const value = (1 - progress) * layout.maxHeight
      const label = value >= 10 ? value.toFixed(1) : value.toFixed(2)

      return {
        y,
        label,
      }
    })
  }, [layout.maxHeight])

  const visibleGraph = useMemo(() => {
    const visibleNodeIds = new Set<string>()
    const links: Array<{ parentId: string; childId: string }> = []

    const visit = (nodeId: string) => {
      const node = nodes[nodeId]
      if (!node) return
      visibleNodeIds.add(nodeId)

      if (node.children_ids.length === 0) return
      if (collapsedNodes[nodeId]) return

      for (const childId of node.children_ids) {
        if (!nodes[childId]) continue
        links.push({ parentId: nodeId, childId })
        visit(childId)
      }
    }

    visit(rootId)

    return {
      visibleNodeIds,
      links,
    }
  }, [collapsedNodes, nodes, rootId])

  const selectedDescendants = useMemo(() => {
    if (!selectedNodeId) return [] as HierarchyLeaf[]
    return descendantLeavesByNode.get(selectedNodeId) ?? []
  }, [descendantLeavesByNode, selectedNodeId])

  const selectedLeafNodeIds = useMemo(() => {
    return new Set(selectedDescendants.map((leaf) => leaf.node_id))
  }, [selectedDescendants])

  const clusterHighlightedNodeIds = useMemo(() => {
    if (selectedClusterId === null) return new Set<string>()
    const highlighted = new Set<string>()
    for (const [nodeId, leaves] of descendantLeavesByNode.entries()) {
      if (leaves.some((leaf) => leaf.cluster_id === selectedClusterId)) {
        highlighted.add(nodeId)
      }
    }
    return highlighted
  }, [descendantLeavesByNode, selectedClusterId])
  const hasClusterSelection = selectedClusterId !== null

  const selectedNode = selectedNodeId ? nodes[selectedNodeId] : null
  const selectedNodeCanCollapse = Boolean(selectedNode && selectedNode.children_ids.length > 0)
  const selectedNodeIsCollapsed =
    selectedNodeCanCollapse && selectedNodeId ? Boolean(collapsedNodes[selectedNodeId]) : false

  const toggleNode = useCallback((nodeId: string) => {
    setCollapsedNodes((prev) => ({
      ...prev,
      [nodeId]: !prev[nodeId],
    }))
  }, [])

  const handleNodeSelect = useCallback(
    (nodeId: string) => {
      setSelectedNodeId(nodeId)
      const leaves = descendantLeavesByNode.get(nodeId) ?? []
      const dominant = dominantClusterId(leaves)
      onSelectCluster(dominant)
    },
    [descendantLeavesByNode, onSelectCluster]
  )

  const handleLeafSelect = useCallback(
    (leaf: HierarchyLeaf) => {
      setSelectedNodeId(leaf.node_id)
      onSelectPoint(leaf.id, leaf.cluster_id)
    },
    [onSelectPoint]
  )

  useEffect(() => {
    if (!onInspectNode) return
    if (!selectedNodeId) {
      onInspectNode(null)
      return
    }

    const node = nodes[selectedNodeId]
    if (!node) {
      onInspectNode(null)
      return
    }

    const descendants = descendantLeavesByNode.get(selectedNodeId) ?? []
    onInspectNode({
      nodeId: selectedNodeId,
      label: node.label,
      size: node.size,
      height: node.height,
      dominantClusterId: dominantClusterId(descendants),
      descendantLeafCount: descendants.length,
    })
  }, [descendantLeavesByNode, nodes, onInspectNode, selectedNodeId])

  useEffect(() => {
    if (!selectedPointId) return
    const selectedLeaf = leafNodeByPointId.get(selectedPointId)
    if (selectedLeaf) {
      setSelectedNodeId(selectedLeaf.node_id)
    }
  }, [leafNodeByPointId, selectedPointId])

  return (
    <section className="chat-result-panel chat-hierarchy-panel">
      <div className="chat-hierarchy-toolbar">
        <p className="chat-muted-text">
          Click a node to filter by its dominant cluster. Double-click a node to collapse/expand.
        </p>
        {selectedNodeCanCollapse && selectedNodeId && (
          <button
            type="button"
            className="chat-plain-btn"
            onClick={() => toggleNode(selectedNodeId)}
          >
            {selectedNodeIsCollapsed ? 'Expand selected node' : 'Collapse selected node'}
          </button>
        )}
      </div>

      <div className="chat-dendrogram-wrap">
        <svg
          className="chat-dendrogram-svg"
          viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
          role="img"
          aria-label="Hierarchy dendrogram"
        >
          {heightTicks.map((tick, index) => (
            <g key={`tick-${index}`} className="chat-dendrogram-grid-row">
              <line
                className="chat-dendrogram-grid-line"
                x1={SVG_MARGIN}
                y1={tick.y}
                x2={SVG_WIDTH - SVG_MARGIN}
                y2={tick.y}
              />
              <text
                className="chat-dendrogram-grid-label"
                x={SVG_MARGIN - 10}
                y={tick.y + 4}
                textAnchor="end"
              >
                {tick.label}
              </text>
            </g>
          ))}

          {visibleGraph.links.map((link) => {
            const parentX = layout.xByNodeId.get(link.parentId) ?? 0
            const parentY = layout.yByNodeId.get(link.parentId) ?? 0
            const childX = layout.xByNodeId.get(link.childId) ?? 0
            const childY = layout.yByNodeId.get(link.childId) ?? 0
            const childDominantClusterId = dominantClusterByNode.get(link.childId)
            const colors = clusterStyle(childDominantClusterId)
            const isRelatedToSelection =
              clusterHighlightedNodeIds.has(link.parentId) && clusterHighlightedNodeIds.has(link.childId)
            const isFaded = hasClusterSelection && !isRelatedToSelection
            const linkStyle = {
              ['--dendrogram-link-color' as '--dendrogram-link-color']: colors.link,
            } as CSSProperties

            return (
              <path
                key={`${link.parentId}-${link.childId}`}
                d={`M ${parentX} ${parentY} V ${childY} H ${childX}`}
                className={[
                  'chat-dendrogram-link',
                  isRelatedToSelection ? 'chat-dendrogram-link--active' : '',
                  isFaded ? 'chat-dendrogram-link--faded' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                style={linkStyle}
              />
            )
          })}

          {Array.from(visibleGraph.visibleNodeIds).map((nodeId) => {
            const node = nodes[nodeId]
            if (!node) return null

            const x = layout.xByNodeId.get(nodeId) ?? 0
            const y = layout.yByNodeId.get(nodeId) ?? 0
            const leaf = leavesByNodeId.get(nodeId)
            const isLeaf = node.children_ids.length === 0
            const isSelected = selectedNodeId === nodeId
            const matchesCluster = clusterHighlightedNodeIds.has(nodeId)
            const isActivePoint = Boolean(leaf && selectedPointId === leaf.id)
            const isDescendant = selectedLeafNodeIds.has(nodeId)
            const isHovered = hoveredNodeId === nodeId
            const isFaded = hasClusterSelection && !matchesCluster
            const clusterId = dominantClusterByNode.get(nodeId)
            const colors = clusterStyle(clusterId)
            const nodeStyle = {
              ['--dendrogram-node-fill' as '--dendrogram-node-fill']: colors.nodeFill,
              ['--dendrogram-node-stroke' as '--dendrogram-node-stroke']: colors.nodeStroke,
            } as CSSProperties
            const nodeClass = [
              'chat-dendrogram-node',
              isLeaf ? 'chat-dendrogram-node--leaf' : 'chat-dendrogram-node--internal',
              isSelected ? 'chat-dendrogram-node--selected' : '',
              matchesCluster ? 'chat-dendrogram-node--cluster' : '',
              isActivePoint ? 'chat-dendrogram-node--point' : '',
              isDescendant ? 'chat-dendrogram-node--descendant' : '',
              isFaded ? 'chat-dendrogram-node--faded' : '',
            ]
              .filter(Boolean)
              .join(' ')

            const labelAnchorRight = x > SVG_WIDTH - SVG_MARGIN - 160
            const labelX = labelAnchorRight ? -10 : 10
            const labelY = isLeaf ? -8 : -10

            return (
              <g
                key={nodeId}
                transform={`translate(${x}, ${y})`}
                className={nodeClass}
                style={nodeStyle}
                onClick={() => (leaf ? handleLeafSelect(leaf) : handleNodeSelect(nodeId))}
                onDoubleClick={() => {
                  if (!isLeaf) {
                    toggleNode(nodeId)
                  }
                }}
                onMouseEnter={() => setHoveredNodeId(nodeId)}
                onMouseLeave={() => setHoveredNodeId((current) => (current === nodeId ? null : current))}
              >
                <circle className="chat-dendrogram-hitarea" r={14} />
                {isLeaf ? (
                  <circle r={4.2} />
                ) : (
                  <rect x={-6} y={-6} width={12} height={12} rx={3} />
                )}
                {(isSelected || isHovered) && (
                  <text
                    className="chat-dendrogram-node-label"
                    x={labelX}
                    y={labelY}
                    textAnchor={labelAnchorRight ? 'end' : 'start'}
                  >
                    {node.label}
                  </text>
                )}
                <title>
                  {leaf
                    ? `${node.label} | leaf ${leaf.id} | cluster ${leaf.cluster_id}`
                    : `${node.label} | size ${node.size} | height ${node.height.toFixed(4)}`}
                </title>
              </g>
            )
          })}
        </svg>
      </div>
    </section>
  )
}

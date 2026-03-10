import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { labelAnalysisHierarchyNodes } from '../../api/analysis.client'
import type { HierarchyResponse } from '../../api/analysis.types'
import {
  getClusterLinkColor,
  getClusterNodeFill,
  getClusterNodeStroke,
  humanThemeLabel,
} from '../../utils/insightsTheme'

type DendrogramProps = {
  analysisId: string | null
  hierarchy: HierarchyResponse
  selectedClusterId: number | null
  selectedPointId: string | null
  selectedNodeId: string | null
  onSelectCluster: (clusterId: number | null) => void
  onSelectPoint: (pointId: string | null, clusterId?: number | null, nodeId?: string | null) => void
  onSelectNode?: (nodeId: string | null, clusterId?: number | null) => void
  onInspectNode?: (inspection: HierarchyInspection | null) => void
  showMergeScale?: boolean
}

export type HierarchyInspection = {
  nodeId: string
  label: string
  size: number
  height: number
  dominantClusterId: number | null
  descendantLeafCount: number
  descendantLeafIds: string[]
}

type HierarchyLeaf = HierarchyResponse['leaves'][number]

const MIN_SVG_WIDTH = 1100
const PER_LEAF_WIDTH = 42
const SVG_HEIGHT = 640
const SVG_MARGIN = 48
const HEIGHT_EASING_EXPONENT = 0.82
const MIN_LEVEL_GAP_PX = 10
const MAX_LEVEL_GAP_PX = 18
const MIN_ZOOM = 0.2
const MAX_ZOOM = 2.2
const ZOOM_STEP = 0.05
const LABEL_FETCH_DEBOUNCE_MS = 400
const MAX_LABEL_REQUEST_NODES = 8

type ClusterStyle = {
  link: string
  nodeFill: string
  nodeStroke: string
}

function clusterStyle(clusterId: number | null | undefined): ClusterStyle {
  return {
    link: getClusterLinkColor(clusterId),
    nodeFill: getClusterNodeFill(clusterId),
    nodeStroke: getClusterNodeStroke(clusterId),
  }
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
  analysisId,
  hierarchy,
  selectedClusterId,
  selectedPointId,
  selectedNodeId,
  onSelectCluster,
  onSelectPoint,
  onSelectNode,
  onInspectNode,
  showMergeScale = false,
}: DendrogramProps) {
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)
  const [collapsedNodes, setCollapsedNodes] = useState<Record<string, boolean>>({})
  const [zoom, setZoom] = useState(1)
  const [labelOverridesByNodeId, setLabelOverridesByNodeId] = useState<Record<string, string>>({})
  const [viewportTick, setViewportTick] = useState(0)
  const scrollWrapRef = useRef<HTMLDivElement | null>(null)
  const lastCenteredLayoutRef = useRef<string | null>(null)
  const labelCacheByAnalysisNodeRef = useRef<Map<string, string>>(new Map())
  const inFlightLabelKeysRef = useRef<Set<string>>(new Set())
  const scrollRafRef = useRef<number | null>(null)

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

  const orderedChildrenByNode = useMemo(() => {
    const sortKeyByNodeId = new Map<string, string>()
    const visiting = new Set<string>()

    const resolveSortKey = (nodeId: string): string => {
      const cached = sortKeyByNodeId.get(nodeId)
      if (cached) return cached
      if (visiting.has(nodeId)) return nodeId

      const leaf = leavesByNodeId.get(nodeId)
      if (leaf) {
        sortKeyByNodeId.set(nodeId, leaf.id)
        return leaf.id
      }

      const node = nodes[nodeId]
      if (!node || node.children_ids.length === 0) {
        sortKeyByNodeId.set(nodeId, nodeId)
        return nodeId
      }

      visiting.add(nodeId)
      const childKeys = node.children_ids
        .filter((childId) => Boolean(nodes[childId]))
        .map((childId) => resolveSortKey(childId))
        .sort((left, right) => left.localeCompare(right))
      visiting.delete(nodeId)

      const key = childKeys[0] ?? nodeId
      sortKeyByNodeId.set(nodeId, key)
      return key
    }

    const ordered = new Map<string, string[]>()
    for (const [nodeId, node] of Object.entries(nodes)) {
      const sortedChildren = [...node.children_ids]
        .filter((childId) => Boolean(nodes[childId]))
        .sort((leftId, rightId) => {
          const leftKey = resolveSortKey(leftId)
          const rightKey = resolveSortKey(rightId)
          return leftKey.localeCompare(rightKey)
        })
      ordered.set(nodeId, sortedChildren)
      resolveSortKey(nodeId)
    }

    return ordered
  }, [leavesByNodeId, nodes])

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
      const childIds = orderedChildrenByNode.get(nodeId) ?? node.children_ids
      for (const childId of childIds) {
        walk(childId)
      }
    }

    walk(rootId)

    if (ordered.length === 0 && nodes[rootId]) {
      ordered.push(rootId)
    }

    return ordered
  }, [nodes, orderedChildrenByNode, rootId])

  const leafIndexByNodeId = useMemo(() => {
    const map = new Map<string, number>()
    leafOrder.forEach((nodeId, index) => {
      map.set(nodeId, index)
    })
    return map
  }, [leafOrder])

  const svgWidth = useMemo(() => {
    return Math.max(MIN_SVG_WIDTH, leafOrder.length * PER_LEAF_WIDTH)
  }, [leafOrder.length])

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
    const plotHeight = SVG_HEIGHT - SVG_MARGIN * 2
    const maxHeight = Math.max(...Object.values(nodes).map((node) => node.height), 0)

    const calcX = (nodeId: string): number => {
      const existing = xByNodeId.get(nodeId)
      if (typeof existing === 'number') return existing

      const node = nodes[nodeId]
      if (!node) {
        const fallback = svgWidth / 2
        xByNodeId.set(nodeId, fallback)
        return fallback
      }

      if (node.children_ids.length === 0) {
        const leafIndex = leafIndexByNodeId.get(nodeId) ?? 0
        const x =
          leafCount <= 1
            ? svgWidth / 2
            : SVG_MARGIN + (leafIndex * (svgWidth - SVG_MARGIN * 2)) / (leafCount - 1)
        xByNodeId.set(nodeId, x)
        return x
      }

      const childIds = orderedChildrenByNode.get(nodeId) ?? node.children_ids
      const childXs = childIds.map((childId) => calcX(childId))
      const x = childXs.reduce((sum, value) => sum + value, 0) / Math.max(childXs.length, 1)
      xByNodeId.set(nodeId, x)
      return x
    }

    const calcYByHeight = (height: number) => {
      if (maxHeight <= 0) return SVG_HEIGHT - SVG_MARGIN
      const progress = (maxHeight - height) / maxHeight
      const easedProgress = Math.pow(progress, HEIGHT_EASING_EXPONENT)
      return SVG_MARGIN + easedProgress * plotHeight
    }

    const rawYByNodeId = new Map<string, number>()
    for (const [nodeId, node] of Object.entries(nodes)) {
      rawYByNodeId.set(nodeId, calcYByHeight(node.height))
    }

    const depthByNodeId = new Map<string, number>()
    const markDepth = (nodeId: string, depth: number) => {
      if (!nodes[nodeId]) return
      const currentDepth = depthByNodeId.get(nodeId)
      if (typeof currentDepth === 'number' && currentDepth <= depth) return

      depthByNodeId.set(nodeId, depth)
      const childIds = orderedChildrenByNode.get(nodeId) ?? nodes[nodeId].children_ids
      for (const childId of childIds) {
        markDepth(childId, depth + 1)
      }
    }
    markDepth(rootId, 0)
    for (const nodeId of Object.keys(nodes)) {
      if (!depthByNodeId.has(nodeId)) {
        depthByNodeId.set(nodeId, 0)
      }
    }

    const maxDepth = Math.max(...depthByNodeId.values(), 0)
    const minLevelGap = Math.max(
      MIN_LEVEL_GAP_PX,
      Math.min(MAX_LEVEL_GAP_PX, (plotHeight / Math.max(maxDepth + 1, 1)) * 0.75)
    )

    const placedNodeIds = new Set<string>()
    const placeNode = (nodeId: string, minY: number | null) => {
      const node = nodes[nodeId]
      if (!node || placedNodeIds.has(nodeId)) return

      const rawY = rawYByNodeId.get(nodeId) ?? SVG_HEIGHT - SVG_MARGIN
      const adjustedY = minY === null ? rawY : Math.max(rawY, minY)
      yByNodeId.set(nodeId, adjustedY)
      placedNodeIds.add(nodeId)

      const childIds = orderedChildrenByNode.get(nodeId) ?? node.children_ids
      for (const childId of childIds) {
        placeNode(childId, adjustedY + minLevelGap)
      }
    }
    placeNode(rootId, null)

    for (const nodeId of Object.keys(nodes)) {
      if (!yByNodeId.has(nodeId)) {
        yByNodeId.set(nodeId, rawYByNodeId.get(nodeId) ?? SVG_HEIGHT - SVG_MARGIN)
      }
    }

    const maxAdjustedY = Math.max(...yByNodeId.values(), SVG_MARGIN)
    const bottomBound = SVG_HEIGHT - SVG_MARGIN
    if (maxAdjustedY > bottomBound) {
      const span = maxAdjustedY - SVG_MARGIN
      if (span > 0) {
        const scale = (bottomBound - SVG_MARGIN) / span
        for (const [nodeId, y] of yByNodeId.entries()) {
          yByNodeId.set(nodeId, SVG_MARGIN + (y - SVG_MARGIN) * scale)
        }
      }
    }

    for (const nodeId of Object.keys(nodes)) {
      calcX(nodeId)
    }

    return {
      xByNodeId,
      yByNodeId,
      maxHeight,
    }
  }, [leafIndexByNodeId, leafOrder.length, nodes, orderedChildrenByNode, rootId, svgWidth])

  const heightTicks = useMemo(() => {
    const tickCount = layout.maxHeight <= 0 ? 2 : 5
    const plotHeight = SVG_HEIGHT - SVG_MARGIN * 2
    return Array.from({ length: tickCount }, (_, index) => {
      const progress = index / (tickCount - 1)
      return SVG_MARGIN + progress * plotHeight
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

      const childIds = orderedChildrenByNode.get(nodeId) ?? node.children_ids
      for (const childId of childIds) {
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
  }, [collapsedNodes, nodes, orderedChildrenByNode, rootId])

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

  const zoomIn = useCallback(() => {
    setZoom((prev) => Math.min(MAX_ZOOM, Number((prev + ZOOM_STEP).toFixed(2))))
  }, [])

  const zoomOut = useCallback(() => {
    setZoom((prev) => Math.max(MIN_ZOOM, Number((prev - ZOOM_STEP).toFixed(2))))
  }, [])

  const zoomedWidth = Math.max(420, Math.round(svgWidth * zoom))
  const zoomedHeight = Math.max(320, Math.round(SVG_HEIGHT * zoom))

  useEffect(() => {
    setLabelOverridesByNodeId({})
  }, [analysisId])

  const onViewportScroll = useCallback(() => {
    if (scrollRafRef.current !== null) return
    scrollRafRef.current = requestAnimationFrame(() => {
      scrollRafRef.current = null
      setViewportTick((prev) => prev + 1)
    })
  }, [])

  useEffect(
    () => () => {
      if (scrollRafRef.current !== null) {
        cancelAnimationFrame(scrollRafRef.current)
      }
    },
    []
  )

  useEffect(() => {
    const layoutKey = `${rootId}:${leafOrder.length}`
    if (lastCenteredLayoutRef.current === layoutKey) return

    const wrap = scrollWrapRef.current
    if (!wrap) return

    lastCenteredLayoutRef.current = layoutKey
    requestAnimationFrame(() => {
      const maxScrollLeft = wrap.scrollWidth - wrap.clientWidth
      wrap.scrollLeft = maxScrollLeft > 0 ? Math.round(maxScrollLeft / 2) : 0
      setViewportTick((prev) => prev + 1)
    })
  }, [leafOrder.length, rootId, zoomedWidth])

  const visibleInternalNodeIds = useMemo(() => {
    const wrap = scrollWrapRef.current
    if (!wrap) return [] as string[]

    const viewLeft = wrap.scrollLeft
    const viewTop = wrap.scrollTop
    const viewRight = viewLeft + wrap.clientWidth
    const viewBottom = viewTop + wrap.clientHeight
    const scaleX = svgWidth > 0 ? zoomedWidth / svgWidth : 1
    const scaleY = SVG_HEIGHT > 0 ? zoomedHeight / SVG_HEIGHT : 1
    const viewportPadding = 24

    const visible = Array.from(visibleGraph.visibleNodeIds)
      .filter((nodeId) => {
        const node = nodes[nodeId]
        if (!node || node.children_ids.length === 0) return false
        if (nodeId.startsWith('leaf_')) return false

        const rawX = layout.xByNodeId.get(nodeId)
        const rawY = layout.yByNodeId.get(nodeId)
        if (typeof rawX !== 'number' || typeof rawY !== 'number') return false

        const scaledX = rawX * scaleX
        const scaledY = rawY * scaleY

        return (
          scaledX >= viewLeft - viewportPadding &&
          scaledX <= viewRight + viewportPadding &&
          scaledY >= viewTop - viewportPadding &&
          scaledY <= viewBottom + viewportPadding
        )
      })
      .sort((leftId, rightId) => (nodes[rightId]?.size ?? 0) - (nodes[leftId]?.size ?? 0))

    return visible.slice(0, MAX_LABEL_REQUEST_NODES)
  }, [layout.xByNodeId, layout.yByNodeId, nodes, svgWidth, visibleGraph.visibleNodeIds, viewportTick, zoomedHeight, zoomedWidth])

  const visibleInternalNodeIdsKey = visibleInternalNodeIds.join('|')

  useEffect(() => {
    if (!analysisId) return
    if (!visibleInternalNodeIdsKey) return

    const candidates = visibleInternalNodeIds.filter((nodeId) => {
      const cacheKey = `${analysisId}:${nodeId}`
      return !labelCacheByAnalysisNodeRef.current.has(cacheKey) && !inFlightLabelKeysRef.current.has(cacheKey)
    })
    if (candidates.length === 0) return

    const timer = setTimeout(async () => {
      const batch = candidates.slice(0, MAX_LABEL_REQUEST_NODES)
      const batchKeys = batch.map((nodeId) => `${analysisId}:${nodeId}`)
      batchKeys.forEach((key) => inFlightLabelKeysRef.current.add(key))

      try {
        const response = await labelAnalysisHierarchyNodes(analysisId, batch)
        const labels = response.labels ?? {}

        setLabelOverridesByNodeId((prev) => {
          let changed = false
          const next = { ...prev }

          for (const nodeId of batch) {
            const cacheKey = `${analysisId}:${nodeId}`
            const rawLabel = labels[nodeId]
            const nextLabel = typeof rawLabel === 'string' ? rawLabel.trim() : ''
            const fallbackLabel = (next[nodeId] ?? nodes[nodeId]?.label ?? '').trim()
            const labelToCache = nextLabel || fallbackLabel

            if (labelToCache) {
              labelCacheByAnalysisNodeRef.current.set(cacheKey, labelToCache)
            }

            if (nextLabel && next[nodeId] !== nextLabel) {
              next[nodeId] = nextLabel
              changed = true
            }
          }

          return changed ? next : prev
        })
      } catch {
        // Silent fallback: keep existing labels from /hierarchy.
      } finally {
        batchKeys.forEach((key) => inFlightLabelKeysRef.current.delete(key))
      }
    }, LABEL_FETCH_DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [analysisId, nodes, visibleInternalNodeIds, visibleInternalNodeIdsKey])

  const handleNodeSelect = useCallback(
    (nodeId: string) => {
      const leaves = descendantLeavesByNode.get(nodeId) ?? []
      const dominant = dominantClusterId(leaves)
      onSelectNode?.(nodeId, dominant)
      onSelectCluster(dominant)
    },
    [descendantLeavesByNode, onSelectCluster, onSelectNode]
  )

  const handleLeafSelect = useCallback(
    (leaf: HierarchyLeaf) => {
      onSelectNode?.(leaf.node_id, leaf.cluster_id)
      onSelectPoint(leaf.id, leaf.cluster_id, leaf.node_id)
    },
    [onSelectNode, onSelectPoint]
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
      label: humanThemeLabel(labelOverridesByNodeId[selectedNodeId] ?? node.label, node.size),
      size: node.size,
      height: node.height,
      dominantClusterId: dominantClusterId(descendants),
      descendantLeafCount: descendants.length,
      descendantLeafIds: descendants.map((leaf) => leaf.id),
    })
  }, [descendantLeavesByNode, labelOverridesByNodeId, nodes, onInspectNode, selectedNodeId])

  useEffect(() => {
    if (!selectedPointId) return
    const selectedLeaf = leafNodeByPointId.get(selectedPointId)
    if (selectedLeaf && selectedLeaf.node_id !== selectedNodeId) {
      onSelectNode?.(selectedLeaf.node_id, selectedLeaf.cluster_id)
    }
  }, [leafNodeByPointId, onSelectNode, selectedNodeId, selectedPointId])

  return (
    <section className="chat-result-panel chat-hierarchy-panel">
      <div className="chat-hierarchy-toolbar">
        <p className="chat-muted-text">
          Click a node to filter by its dominant cluster. Double-click a node to collapse/expand.
        </p>
        <div className="chat-hierarchy-toolbar-actions">
          <div className="chat-dendrogram-zoom-controls" aria-label="Dendrogram zoom controls">
            <button
              type="button"
              className="chat-plain-btn"
              onClick={zoomOut}
              disabled={zoom <= MIN_ZOOM}
              aria-label="Zoom out"
            >
              -
            </button>
            <span className="chat-muted-text">{Math.round(zoom * 100)}%</span>
            <button
              type="button"
              className="chat-plain-btn"
              onClick={zoomIn}
              disabled={zoom >= MAX_ZOOM}
              aria-label="Zoom in"
            >
              +
            </button>
          </div>
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
      </div>

      <div ref={scrollWrapRef} className="chat-dendrogram-wrap" onScroll={onViewportScroll}>
        <svg
          className="chat-dendrogram-svg"
          viewBox={`0 0 ${svgWidth} ${SVG_HEIGHT}`}
          style={{
            width: `${zoomedWidth}px`,
            minWidth: `${zoomedWidth}px`,
            height: `${zoomedHeight}px`,
          }}
          role="img"
          aria-label="Hierarchy dendrogram"
        >
          {heightTicks.map((tickY, index) => (
            <g key={`tick-${index}`} className="chat-dendrogram-grid-row">
              <line
                className="chat-dendrogram-grid-line"
                x1={SVG_MARGIN}
                y1={tickY}
                x2={svgWidth - SVG_MARGIN}
                y2={tickY}
              />
              {showMergeScale && layout.maxHeight > 0 && (
                <text className="chat-dendrogram-grid-label" x={SVG_MARGIN + 4} y={tickY - 4}>
                  Merge distance {(layout.maxHeight * (1 - (tickY - SVG_MARGIN) / (SVG_HEIGHT - SVG_MARGIN * 2))).toFixed(2)}
                </text>
              )}
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
                d={`M ${parentX} ${parentY} H ${childX} V ${childY}`}
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

            const labelAnchorRight = x > svgWidth - SVG_MARGIN - 160
            const labelX = labelAnchorRight ? -10 : 10
            const labelY = isLeaf ? -8 : -10
            const resolvedLabel = labelOverridesByNodeId[nodeId] ?? node.label
            const displayLabel = humanThemeLabel(resolvedLabel, node.size)
            const tooltipBase = resolvedLabel?.trim() || 'Theme'
            const tooltipLabel =
              /\(n=\s*\d+\)$/i.test(tooltipBase) ? tooltipBase : `${tooltipBase} (n=${node.size})`

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
                    {displayLabel}
                  </text>
                )}
                <title>{tooltipLabel}</title>
              </g>
            )
          })}
        </svg>
      </div>
    </section>
  )
}

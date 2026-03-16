
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import granulateLogo from '../../assets/granulate-logo-new.png'
import {
  ApiError,
  deleteAnalysis,
  getAnalysisClusters,
  getAnalysisHierarchy,
  getAnalysisInsights,
  getAnalysisMap,
  getAnalysisOverview,
  getRecentAnalyses,
  wait,
} from '../../api/analysis.client'
import type {
  AnalysisStatusResponse,
  ClustersResponse,
  HierarchyResponse,
  InsightsResponse,
  MapResponse,
  OverviewResponse,
  RecentAnalysesResponse,
  RecentAnalysisResponse,
} from '../../api/analysis.types'
import { useAnalysisRun } from '../../hooks/useAnalysisRun'
import {
  clearAnalysisSelection,
  createInitialAnalysisSelectionState,
  withSelectedCluster,
  withSelectedNode,
  withSelectedPoint,
} from '../../state/analysisStore'
import { humanThemeLabel } from '../../utils/insightsTheme'
import { ANALYSIS_SECTIONS, type AnalysisSectionId } from './analysisSections'
import SelectionDetailsDrawer, {
  type DrawerExampleItem,
  type SelectedEntityModel,
} from './components/SelectionDetailsDrawer'
import ClustersTab from '../../tabs/ClustersTab'
import HierarchyTab from '../../tabs/HierarchyTab'
import MapTab from '../../tabs/MapTab'
import OverviewTab from '../../tabs/OverviewTab'
import './chat.css'

const ALLOWED_TYPES = ['.csv']
const POLL_INTERVAL_MS = 1500
const POLL_TIMEOUT_MS = 600000
const ARTIFACT_TIMEOUT_MS = 600000

type ViewMode = 'chat' | 'analysis'

export type GranulateGranule = {
  aspect: string
  excerpt?: string
  evidence?: string[]
  sentiment?: string
  sentiment_score?: number
  confidence?: number
  similarity?: number
  lexical_overlap?: number
  scenarios?: string[]
}

export type GranulateResponse = {
  text: string
  units: string[]
  granules: GranulateGranule[]
  taxonomy?: string[]
  scenario_summary?: Record<string, number> | string
  aspect_summary?: Record<
    string,
    {
      count?: number
      avg_sentiment?: number | string
      top_evidence?: string[]
    }
  >
  highlights?: GranulateGranule[]
}

export type SortMode = 'confidence' | 'similarity' | 'sentiment'
export type SentimentFilter = 'all' | 'positive' | 'neutral' | 'negative'
export type SentimentValue = 'positive' | 'neutral' | 'negative'

export type AspectSummary = {
  aspect: string
  count: number
  avgSentimentScore: number
  avgSentimentLabel: string
  topEvidence: string[]
  granules: GranulateGranule[]
}

export type AspectAccordionSection = AspectSummary & {
  displayCount: number
  displayAvgSentimentLabel: string
}

type AnalysisArtifacts = {
  overview: OverviewResponse | null
  insights: InsightsResponse | null
  map: MapResponse | null
  clusters: ClustersResponse | null
  hierarchy: HierarchyResponse | null
}

function normalizeRecentAnalyses(response: RecentAnalysesResponse): RecentAnalysisResponse[] {
  if (Array.isArray(response)) {
    return response
  }

  return Array.isArray(response.items) ? response.items : []
}

function getRecentAnalysisLabel(item: RecentAnalysisResponse) {
  const label = item.display_name?.trim() || item.source_name?.trim()
  if (label) {
    return label
  }

  if (item.input_type === 'csv') {
    return 'CSV upload'
  }
  if (item.input_type === 'text') {
    return 'Text input'
  }

  return item.analysis_id
}

const RUN_STAGES = [
  'queued',
  'embeddings',
  'hierarchy',
  'clusters',
  'umap',
  'labeling',
  'granulate',
  'overview',
  'completed',
  'failed',
] as const

type RunStage = (typeof RUN_STAGES)[number]

const RUN_STAGE_META: Record<RunStage, { label: string; detail: string; min: number; max: number }> = {
  queued: { label: 'Queued', detail: 'Waiting for workers to start', min: 2, max: 10 },
  embeddings: { label: 'Embeddings', detail: 'Generating vector representations', min: 10, max: 28 },
  hierarchy: { label: 'Hierarchy', detail: 'Building hierarchy tree', min: 28, max: 44 },
  clusters: { label: 'Clusters', detail: 'Grouping related items', min: 44, max: 60 },
  umap: { label: 'Map', detail: 'Projecting points for map view', min: 60, max: 76 },
  labeling: { label: 'Labeling', detail: 'Writing theme labels', min: 76, max: 88 },
  granulate: { label: 'Post-processing', detail: 'Final processing before overview', min: 88, max: 95 },
  overview: { label: 'Overview', detail: 'Finalizing overview artifacts', min: 95, max: 99 },
  completed: { label: 'Completed', detail: 'Analysis completed', min: 100, max: 100 },
  failed: { label: 'Failed', detail: 'Analysis finished with errors', min: 0, max: 100 },
}

function clampProgress(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(100, value))
}

function createEmptyArtifacts(): AnalysisArtifacts {
  return {
    overview: null,
    insights: null,
    map: null,
    clusters: null,
    hierarchy: null,
  }
}

function formatPercent(value: number, fallback = '0%') {
  if (!Number.isFinite(value)) return fallback
  return `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`
}

function formatDateTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

function formatRawStageLabel(rawStage: string) {
  const normalized = rawStage.trim().toLowerCase()
  if (!normalized) return ''
  if (normalized === 'ai_summary') return 'AI Summary'

  return normalized.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}

/* Dots arranged in concentric rings to form a circle */
const ORB_DOT_POSITIONS = (() => {
  const positions: { x: number; y: number }[] = []
  const rings = [
    { r: 0, count: 1 },
    { r: 0.22, count: 6 },
    { r: 0.42, count: 12 },
    { r: 0.62, count: 18 },
    { r: 0.85, count: 12 },
  ]
  rings.forEach(({ r, count }) => {
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * 2 * Math.PI - Math.PI / 2
      positions.push({
        x: 50 + r * 45 * Math.cos(angle),
        y: 50 + r * 45 * Math.sin(angle),
      })
    }
  })
  return positions
})()

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good Morning'
  if (hour < 18) return 'Good Afternoon'
  return 'Good Evening'
}

const ORB_SIZE = 80
const REPULSE_RADIUS = 38
const REPULSE_MAX_PX = 14

function getRepulsion(
  dotXPercent: number,
  dotYPercent: number,
  mouseX: number,
  mouseY: number
): { x: number; y: number } {
  const dotX = (dotXPercent / 100) * ORB_SIZE
  const dotY = (dotYPercent / 100) * ORB_SIZE
  const dx = dotX - mouseX
  const dy = dotY - mouseY
  const d = Math.sqrt(dx * dx + dy * dy)
  if (d >= REPULSE_RADIUS || d < 1) return { x: 0, y: 0 }
  const magnitude = ((REPULSE_RADIUS - d) / REPULSE_RADIUS) * REPULSE_MAX_PX
  return {
    x: (dx / d) * magnitude,
    y: (dy / d) * magnitude,
  }
}

async function with409Retry<T>(fn: () => Promise<T>, timeoutMs: number): Promise<T> {
  const start = Date.now()

  while (Date.now() - start < timeoutMs) {
    try {
      return await fn()
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        await wait(POLL_INTERVAL_MS)
        continue
      }
      throw err
    }
  }

  throw new Error(`Artifacts are still processing after ${Math.round(timeoutMs / 1000)} seconds.`)
}
function buildDescendantLeafIdsByNode(hierarchy: HierarchyResponse | null) {
  const map = new Map<string, string[]>()
  if (!hierarchy) return map

  const leavesByNodeId = new Map<string, string[]>()
  for (const leaf of hierarchy.leaves) {
    const current = leavesByNodeId.get(leaf.node_id) ?? []
    current.push(leaf.id)
    leavesByNodeId.set(leaf.node_id, current)
  }

  const visit = (nodeId: string): string[] => {
    const cached = map.get(nodeId)
    if (cached) return cached

    const node = hierarchy.nodes[nodeId]
    if (!node) {
      map.set(nodeId, [])
      return []
    }

    if (node.children_ids.length === 0) {
      const ownLeaves = leavesByNodeId.get(nodeId) ?? []
      map.set(nodeId, ownLeaves)
      return ownLeaves
    }

    const descendantLeaves = node.children_ids.flatMap((childId) => visit(childId))
    map.set(nodeId, descendantLeaves)
    return descendantLeaves
  }

  for (const nodeId of Object.keys(hierarchy.nodes)) {
    visit(nodeId)
  }

  return map
}

function findInsightThemeForCluster(
  insights: InsightsResponse | null,
  cluster: { label: string; size: number; top_terms: string[] } | null
) {
  if (!insights || !cluster) return null

  const normalizedLabel = cluster.label.trim().toLowerCase()
  const exact = insights.theme_summary.find((theme) => theme.label.trim().toLowerCase() === normalizedLabel)
  if (exact) return exact

  const bySize = insights.theme_summary.find((theme) => theme.size === cluster.size)
  if (bySize) return bySize

  let bestMatch: InsightsResponse['theme_summary'][number] | null = null
  let bestOverlap = -1
  const clusterTerms = new Set(cluster.top_terms.map((term) => term.trim().toLowerCase()))

  for (const theme of insights.theme_summary) {
    let overlap = 0
    for (const term of theme.top_terms) {
      if (clusterTerms.has(term.trim().toLowerCase())) {
        overlap += 1
      }
    }
    if (overlap > bestOverlap) {
      bestOverlap = overlap
      bestMatch = theme
    }
  }

  return bestMatch
}

function dedupeExampleItems(items: DrawerExampleItem[]) {
  const seen = new Set<string>()
  const deduped: DrawerExampleItem[] = []

  for (const item of items) {
    const key = item.preview.trim().toLowerCase()
    if (!key || seen.has(key)) continue
    seen.add(key)
    deduped.push(item)
  }

  return deduped
}

function buildSelectedEntityModel({
  selection,
  artifacts,
  descendantLeafIdsByNode,
}: {
  selection: {
    selectedClusterId: number | null
    selectedPointId: string | null
    selectedNodeId: string | null
  }
  artifacts: AnalysisArtifacts
  descendantLeafIdsByNode: Map<string, string[]>
}): SelectedEntityModel | null {
  const clusterSource = artifacts.clusters?.clusters ?? artifacts.map?.clusters ?? []
  const clusterById = new Map(clusterSource.map((cluster) => [cluster.cluster_id, cluster]))
  const points = artifacts.map?.points ?? []
  const pointById = new Map(points.map((point) => [point.id, point]))
  const totalCalls = artifacts.overview?.counts.items ?? points.length

  if (selection.selectedPointId) {
    const point = pointById.get(selection.selectedPointId)
    if (point) {
      const cluster = clusterById.get(point.cluster_id) ?? null
      const relatedPoints = points
        .filter((candidate) => candidate.cluster_id === point.cluster_id && candidate.id !== point.id)
        .slice(0, 4)

      const exampleItems = dedupeExampleItems(
        [point, ...relatedPoints].map((item, index) => ({
          key: `point-${item.id}-${index}`,
          id: item.id,
          pointId: item.id,
          clusterId: item.cluster_id,
          nodeId: selection.selectedNodeId,
          preview: item.preview,
          metadata: item.metadata,
        }))
      )

      return {
        kind: 'item',
        title: 'Selected call',
        subtitle: cluster?.label ?? point.cluster_label ?? `Theme ${point.cluster_id}`,
        summary:
          'This call is one concrete example of the selected theme. Use actions below to jump to the map position, full theme list, or tree branch.',
        clusterId: point.cluster_id,
        pointId: point.id,
        nodeId: selection.selectedNodeId,
        topTerms: cluster?.top_terms.slice(0, 8) ?? [],
        stats: [
          { label: 'Theme', value: cluster?.label ?? point.cluster_label ?? `Theme ${point.cluster_id}` },
          { label: 'Map position', value: `${point.x.toFixed(2)}, ${point.y.toFixed(2)}` },
        ],
        exampleItems,
        advancedFields: [
          { label: 'Raw call ID', value: point.id },
          { label: 'Cluster ID', value: String(point.cluster_id) },
          { label: 'Raw X', value: Number.isFinite(point.x_raw) ? point.x_raw.toFixed(4) : '-' },
          { label: 'Raw Y', value: Number.isFinite(point.y_raw) ? point.y_raw.toFixed(4) : '-' },
        ],
        actions: {
          viewItems: true,
          showOnMap: true,
          openTree: true,
        },
      }
    }
  }

  if (selection.selectedNodeId && artifacts.hierarchy) {
    const node = artifacts.hierarchy.nodes[selection.selectedNodeId]
    if (node) {
      const leafIds = descendantLeafIdsByNode.get(selection.selectedNodeId) ?? []
      const descendantPoints = leafIds
        .map((leafId) => pointById.get(leafId))
        .filter(Boolean) as MapResponse['points']

      let dominantClusterId = node.dominant_cluster_id
      if (dominantClusterId === null && descendantPoints.length > 0) {
        const counts = new Map<number, number>()
        for (const point of descendantPoints) {
          counts.set(point.cluster_id, (counts.get(point.cluster_id) ?? 0) + 1)
        }
        let topCluster: number | null = null
        let topCount = -1
        for (const [clusterId, count] of counts.entries()) {
          if (count > topCount) {
            topCluster = clusterId
            topCount = count
          }
        }
        dominantClusterId = topCluster
      }

      const dominantCluster = dominantClusterId !== null ? clusterById.get(dominantClusterId) ?? null : null
      const callCount = node.descendant_leaf_count || node.size || descendantPoints.length

      const exampleItems = dedupeExampleItems(
        descendantPoints.slice(0, 6).map((point, index) => ({
          key: `node-${point.id}-${index}`,
          id: point.id,
          pointId: point.id,
          clusterId: point.cluster_id,
          nodeId: selection.selectedNodeId,
          preview: point.preview,
          metadata: point.metadata,
        }))
      )

      return {
        kind: 'node',
        title: humanThemeLabel(node.label, callCount),
        subtitle: `${callCount} calls in this branch`,
        summary:
          node.summary ||
          'This branch groups closely related calls. Lower branches are more specific and higher branches are broader.',
        clusterId: dominantClusterId,
        pointId: selection.selectedPointId,
        nodeId: selection.selectedNodeId,
        topTerms: dominantCluster?.top_terms.slice(0, 8) ?? [],
        stats: [
          { label: 'Calls in branch', value: String(callCount) },
          { label: 'Dominant theme', value: dominantCluster ? dominantCluster.label : 'Not available' },
          { label: 'Dominant share', value: formatPercent(node.dominant_cluster_share, '-') },
        ],
        exampleItems,
        advancedFields: [
          { label: 'Node ID', value: node.node_id },
          { label: 'Merge distance', value: Number.isFinite(node.height) ? node.height.toFixed(4) : '-' },
          { label: 'Cohesion', value: Number.isFinite(node.cohesion) ? node.cohesion.toFixed(3) : '-' },
          { label: 'Similarity', value: Number.isFinite(node.similarity) ? node.similarity.toFixed(3) : '-' },
        ],
        actions: {
          viewItems: dominantClusterId !== null,
          showOnMap: descendantPoints.length > 0,
          openTree: true,
        },
      }
    }
  }

  if (selection.selectedClusterId !== null) {
    const clusterId = selection.selectedClusterId
    const cluster =
      clusterById.get(clusterId) ?? {
        cluster_id: clusterId,
        label: `Theme ${clusterId}`,
        size: points.filter((point) => point.cluster_id === clusterId).length,
        top_terms: [] as string[],
        representatives: [] as ClustersResponse['clusters'][number]['representatives'],
      }
    const insightTheme = findInsightThemeForCluster(artifacts.insights, cluster)

    const representativeExamples: DrawerExampleItem[] = cluster.representatives.map((rep, index) => ({
      key: `cluster-rep-${rep.id}-${index}`,
      id: rep.id,
      pointId: rep.id,
      clusterId,
      preview: rep.preview,
      metadata: rep.metadata,
    }))

    const insightExamples: DrawerExampleItem[] = (insightTheme?.examples ?? []).map((example, index) => ({
      key: `cluster-insight-${clusterId}-${index}`,
      clusterId,
      preview: example,
    }))

    const mapExamples: DrawerExampleItem[] = points
      .filter((point) => point.cluster_id === clusterId)
      .slice(0, 6)
      .map((point, index) => ({
        key: `cluster-map-${point.id}-${index}`,
        id: point.id,
        pointId: point.id,
        clusterId: point.cluster_id,
        preview: point.preview,
        metadata: point.metadata,
      }))

    const exampleItems = dedupeExampleItems([...representativeExamples, ...insightExamples, ...mapExamples]).slice(
      0,
      7
    )
    const share = totalCalls > 0 ? `${Math.round((cluster.size / totalCalls) * 100)}% of calls` : '-'

    return {
      kind: 'cluster',
      title: cluster.label,
      subtitle: `${cluster.size} calls`,
      summary:
        'This is one of the main themes in the dataset. Review examples first, then use actions to inspect where these calls sit on the map or tree.',
      clusterId,
      pointId: selection.selectedPointId,
      nodeId: selection.selectedNodeId,
      topTerms:
        cluster.top_terms.length > 0 ? cluster.top_terms.slice(0, 8) : insightTheme?.top_terms.slice(0, 8) ?? [],
      stats: [
        { label: 'Theme size', value: String(cluster.size) },
        { label: 'Share of dataset', value: share },
        { label: 'Cluster ID', value: String(clusterId) },
      ],
      exampleItems,
      advancedFields: [{ label: 'Cluster ID', value: String(clusterId) }],
      actions: {
        viewItems: true,
        showOnMap: true,
        openTree: true,
      },
    }
  }

  return null
}

export default function Chat() {
  const [query, setQuery] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('chat')
  const [attachedFiles, setAttachedFiles] = useState<File[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [fileError, setFileError] = useState('')
  const [requestError, setRequestError] = useState('')
  const [isLoadingArtifacts, setIsLoadingArtifacts] = useState(false)
  const [isLoadingRecent, setIsLoadingRecent] = useState(false)
  const [deletingAnalysisId, setDeletingAnalysisId] = useState<string | null>(null)
  const [displayProgress, setDisplayProgress] = useState(0)
  const [stageStartedAt, setStageStartedAt] = useState(() => Date.now())
  const [progressTicker, setProgressTicker] = useState(0)

  const [currentAnalysisId, setCurrentAnalysisId] = useState<string | null>(null)
  const [recentAnalyses, setRecentAnalyses] = useState<RecentAnalysisResponse[]>([])
  const [artifacts, setArtifacts] = useState<AnalysisArtifacts>(createEmptyArtifacts)
  const [activeSection, setActiveSection] = useState<AnalysisSectionId>('overview')
  const [selection, setSelection] = useState(createInitialAnalysisSelectionState)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  const { analysisId, status, isRunning, error: runError, startAnalysis, resetRun } = useAnalysisRun({
    intervalMs: POLL_INTERVAL_MS,
    timeoutMs: POLL_TIMEOUT_MS,
  })

  const fileInputRef = useRef<HTMLInputElement>(null)
  const queryInputRef = useRef<HTMLTextAreaElement>(null)
  const orbRef = useRef<HTMLDivElement>(null)
  const [mouseInOrb, setMouseInOrb] = useState<{ x: number; y: number } | null>(null)

  const handleOrbMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = orbRef.current?.getBoundingClientRect()
    if (!rect) return
    setMouseInOrb({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    })
  }, [])

  const handleOrbMouseLeave = useCallback(() => {
    setMouseInOrb(null)
  }, [])

  const validateFile = useCallback((file: File): boolean => {
    const ext = '.' + (file.name.split('.').pop() ?? '').toLowerCase()
    if (!ALLOWED_TYPES.includes(ext)) {
      setFileError(`Only ${ALLOWED_TYPES.join(', ')} are allowed.`)
      return false
    }
    setFileError('')
    return true
  }, [])

  const addFiles = useCallback(
    (files: FileList | null) => {
      if (!files?.length) return

      for (let i = 0; i < files.length; i++) {
        const candidate = files[i]
        if (validateFile(candidate)) {
          setAttachedFiles([candidate])
          return
        }
      }
    },
    [validateFile]
  )

  const removeFile = useCallback(() => {
    setAttachedFiles([])
    setFileError('')
  }, [])

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      addFiles(e.dataTransfer.files)
    },
    [addFiles]
  )

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const onAttachClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const autoResize = useCallback((textarea: HTMLTextAreaElement | null) => {
    if (!textarea) return
    textarea.style.height = 'auto'
    textarea.style.height = `${Math.min(textarea.scrollHeight, 300)}px`
    textarea.style.overflowY = textarea.scrollHeight > 300 ? 'auto' : 'hidden'
  }, [])

  useEffect(() => {
    autoResize(queryInputRef.current)
  }, [autoResize, query])

  useEffect(() => {
    if (analysisId) {
      setCurrentAnalysisId(analysisId)
    }
  }, [analysisId])

  const loadRecentAnalyses = useCallback(async () => {
    setIsLoadingRecent(true)
    try {
      const data = await getRecentAnalyses(8)
      setRecentAnalyses(normalizeRecentAnalyses(data))
    } catch {
      setRecentAnalyses([])
    } finally {
      setIsLoadingRecent(false)
    }
  }, [])

  useEffect(() => {
    void loadRecentAnalyses()
  }, [loadRecentAnalyses])

  const loadArtifacts = useCallback(async (nextAnalysisId: string) => {
    setIsLoadingArtifacts(true)
    setRequestError('')

    try {
      const [overview, insights, map, clusters, hierarchy] = await Promise.all([
        with409Retry(() => getAnalysisOverview(nextAnalysisId), ARTIFACT_TIMEOUT_MS),
        with409Retry(() => getAnalysisInsights(nextAnalysisId), ARTIFACT_TIMEOUT_MS),
        with409Retry(() => getAnalysisMap(nextAnalysisId), ARTIFACT_TIMEOUT_MS),
        with409Retry(() => getAnalysisClusters(nextAnalysisId), ARTIFACT_TIMEOUT_MS),
        with409Retry(() => getAnalysisHierarchy(nextAnalysisId), ARTIFACT_TIMEOUT_MS),
      ])

      setArtifacts({
        overview,
        insights,
        map,
        clusters,
        hierarchy,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load analysis artifacts.'
      setRequestError(message)
      throw err
    } finally {
      setIsLoadingArtifacts(false)
    }
  }, [])

  const clearCurrentAnalysisView = useCallback(() => {
    resetRun()
    setRequestError('')
    setCurrentAnalysisId(null)
    setArtifacts(createEmptyArtifacts())
    setSelection(createInitialAnalysisSelectionState())
    setActiveSection('overview')
    setIsDrawerOpen(false)
    setViewMode('chat')
  }, [resetRun])

  const openRecentAnalysis = useCallback(
    async (analysisIdToOpen: string) => {
      if (!analysisIdToOpen) return
      resetRun()
      setRequestError('')
      setSelection(createInitialAnalysisSelectionState())
      setActiveSection('overview')
      setIsDrawerOpen(false)
      setCurrentAnalysisId(analysisIdToOpen)
      setViewMode('analysis')
      await loadArtifacts(analysisIdToOpen)
    },
    [loadArtifacts, resetRun]
  )

  const handleDeleteRecentAnalysis = useCallback(
    async (item: RecentAnalysisResponse) => {
      const isRunningItem = item.status === 'queued' || item.status === 'processing'
      if (isRunningItem) {
        setRequestError('You cannot delete an analysis while it is still running.')
        return
      }

      const label = getRecentAnalysisLabel(item)
      const confirmed = window.confirm(`Delete "${label}" from your account? This action cannot be undone.`)
      if (!confirmed) {
        return
      }

      setDeletingAnalysisId(item.analysis_id)
      setRequestError('')

      try {
        await deleteAnalysis(item.analysis_id)
        setRecentAnalyses((prev) => prev.filter((entry) => entry.analysis_id !== item.analysis_id))
        if (currentAnalysisId === item.analysis_id) {
          clearCurrentAnalysisView()
        }
        await loadRecentAnalyses()
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete analysis.'
        setRequestError(message)
      } finally {
        setDeletingAnalysisId((prev) => (prev === item.analysis_id ? null : prev))
      }
    },
    [clearCurrentAnalysisView, currentAnalysisId, loadRecentAnalyses]
  )

  const runProjectFlow = useCallback(async () => {
    if (isRunning || isLoadingArtifacts) return

    setRequestError('')
    setFileError('')

    const file = attachedFiles[0]
    const text = query.trim()

    if (!file && !text) {
      setFileError('Please attach a CSV file or enter text to analyze.')
      return
    }

    setArtifacts(createEmptyArtifacts())
    setSelection(createInitialAnalysisSelectionState())
    setActiveSection('overview')
    setIsDrawerOpen(false)
    setViewMode('chat')
    resetRun()
    setDisplayProgress(0)
    setStageStartedAt(Date.now())
    setProgressTicker(0)

    try {
      const nextAnalysisId = await startAnalysis({
        inputType: file ? 'csv' : 'text',
        file: file ?? undefined,
        text: file ? undefined : text,
      })

      setCurrentAnalysisId(nextAnalysisId)
      setViewMode('analysis')
      await loadArtifacts(nextAnalysisId)
      await loadRecentAnalyses()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Request failed'
      setRequestError(message)
    }
  }, [
    attachedFiles,
    isLoadingArtifacts,
    isRunning,
    loadArtifacts,
    loadRecentAnalyses,
    query,
    resetRun,
    startAnalysis,
  ])

  const retryCurrentAnalysis = useCallback(() => {
    if (!currentAnalysisId) return
    void loadArtifacts(currentAnalysisId).catch(() => undefined)
  }, [currentAnalysisId, loadArtifacts])

  const hasAnalysisData = useMemo(() => {
    return currentAnalysisId !== null || Object.values(artifacts).some(Boolean)
  }, [artifacts, currentAnalysisId])

  const selectedClusterId = selection.selectedClusterId
  const selectedPointId = selection.selectedPointId
  const selectedNodeId = selection.selectedNodeId

  const selectCluster = useCallback((clusterId: number | null) => {
    setSelection((prev) => withSelectedCluster(prev, clusterId))
  }, [])

  const selectPoint = useCallback(
    (pointId: string | null, clusterId?: number | null, nodeId?: string | null) => {
      setSelection((prev) => withSelectedPoint(prev, pointId, clusterId, nodeId))
    },
    []
  )

  const selectNode = useCallback((nodeId: string | null, clusterId?: number | null) => {
    setSelection((prev) => withSelectedNode(prev, nodeId, clusterId))
  }, [])

  const clearFilters = useCallback(() => {
    setSelection((prev) => clearAnalysisSelection(prev))
    setIsDrawerOpen(false)
  }, [])

  const descendantLeafIdsByNode = useMemo(
    () => buildDescendantLeafIdsByNode(artifacts.hierarchy),
    [artifacts.hierarchy]
  )

  const selectedEntity = useMemo(
    () =>
      buildSelectedEntityModel({
        selection,
        artifacts,
        descendantLeafIdsByNode,
      }),
    [artifacts, descendantLeafIdsByNode, selection]
  )

  useEffect(() => {
    if (selectedEntity) {
      setIsDrawerOpen(true)
    }
  }, [selectedEntity])

  const runStatus = useMemo(() => {
    const progress: AnalysisStatusResponse['progress'] = status?.progress ?? { stage: 'queued', pct: 0 }
    const stage = status?.progress?.stage as RunStage | undefined
    const rawStage = typeof progress?.raw_stage === 'string' ? progress.raw_stage.trim() : ''
    const rawStageLabel = formatRawStageLabel(rawStage)
    const backendPct = clampProgress(progress?.pct ?? 0)
    const stageLabel = typeof progress?.stage_label === 'string' ? progress.stage_label.trim() : ''
    const backendMessage = typeof progress?.message === 'string' ? progress.message.trim() : ''
    const hasCounterProgress =
      typeof progress?.current === 'number' &&
      Number.isFinite(progress.current) &&
      typeof progress?.total === 'number' &&
      Number.isFinite(progress.total) &&
      progress.total > 0
    const roundedCurrent = hasCounterProgress ? Math.max(0, Math.round(progress!.current!)) : 0
    const roundedTotal = hasCounterProgress ? Math.max(1, Math.round(progress!.total!)) : 0
    const hasStagePct = typeof progress?.stage_pct === 'number' && Number.isFinite(progress.stage_pct)
    const boundedStagePct = hasStagePct ? clampProgress(progress!.stage_pct!) : 0
    const hasElapsedSec = typeof progress?.elapsed_sec === 'number' && Number.isFinite(progress.elapsed_sec)
    const elapsedSecFromBackend = hasElapsedSec ? Math.max(0, progress!.elapsed_sec!) : null

    if (!stage) {
      if (isLoadingArtifacts && !isRunning) {
        return {
          title: 'Preparing results',
          detail: 'Loading analysis artifacts',
          targetProgress: 99,
          stepText: 'Finalizing',
          indeterminate: true,
        }
      }

      if (isRunning) {
        const bootstrap = Math.min(12, 4 + progressTicker * 0.35)
        return {
          title: 'Starting analysis',
          detail: 'Waiting for first progress update',
          targetProgress: bootstrap,
          stepText: 'Initializing',
          indeterminate: true,
        }
      }

      return {
        title: '',
        detail: '',
        targetProgress: 0,
        stepText: '',
        indeterminate: false,
      }
    }

    const meta = RUN_STAGE_META[stage]
    const isTerminal = stage === 'completed' || stage === 'failed'
    const elapsedSec = elapsedSecFromBackend ?? Math.max(0, (Date.now() - stageStartedAt) / 1000)
    const stageSpan = Math.max(meta.max - meta.min - 0.6, 0)
    const synthetic = meta.min + Math.min(elapsedSec * 1.2, stageSpan)
    const boundedBackend = Math.max(meta.min, Math.min(meta.max, backendPct))
    const fromStagePct =
      hasStagePct && stage !== 'completed' && stage !== 'failed'
        ? meta.min + (Math.max(meta.max - meta.min, 0) * boundedStagePct) / 100
        : 0
    let targetProgress = Math.max(boundedBackend, synthetic, fromStagePct)

    if (stage === 'completed') {
      targetProgress = 100
    } else if (isLoadingArtifacts && !isRunning) {
      targetProgress = Math.max(targetProgress, 99)
    }

    const activeStageCount = RUN_STAGES.length - 2
    const stepIndex = Math.max(0, RUN_STAGES.indexOf(stage as RunStage))
    const fallbackStepText = isTerminal
      ? 'Done'
      : rawStageLabel && rawStageLabel !== meta.label
        ? `${meta.label} / ${rawStageLabel}`
        : `Step ${Math.min(stepIndex + 1, activeStageCount)}/${activeStageCount}`
    const liveProgressParts: string[] = []
    if (hasCounterProgress) {
      liveProgressParts.push(`${roundedCurrent}/${roundedTotal}`)
    }
    if (hasStagePct) {
      liveProgressParts.push(`Stage ${Math.round(boundedStagePct)}%`)
    }
    if (hasElapsedSec) {
      liveProgressParts.push(`${Math.round(elapsedSec)}s`)
    }
    const stepText = liveProgressParts.length > 0 ? liveProgressParts.join(' | ') : fallbackStepText

    return {
      title: stageLabel || rawStageLabel || meta.label,
      detail: backendMessage || meta.detail,
      targetProgress,
      stepText,
      indeterminate: false,
    }
  }, [isLoadingArtifacts, isRunning, progressTicker, stageStartedAt, status])

  useEffect(() => {
    const stage = status?.progress?.stage
    const rawStage = status?.progress?.raw_stage
    if (!stage && !rawStage) return
    setStageStartedAt(Date.now())
  }, [status?.progress?.stage, status?.progress?.raw_stage])

  useEffect(() => {
    if (!isRunning && !isLoadingArtifacts) return
    const timer = window.setInterval(() => {
      setProgressTicker((prev) => prev + 1)
    }, 250)
    return () => window.clearInterval(timer)
  }, [isLoadingArtifacts, isRunning])

  useEffect(() => {
    if (!isRunning && !isLoadingArtifacts && !status) {
      setDisplayProgress(0)
      return
    }

    const timer = window.setInterval(() => {
      setDisplayProgress((prev) => {
        const target = clampProgress(runStatus.targetProgress)
        const diff = target - prev
        if (Math.abs(diff) < 0.08) return target
        const scaledStep = diff * 0.2
        const cappedStep = Math.sign(diff) * Math.min(Math.abs(scaledStep), 2.4)
        return clampProgress(prev + cappedStep)
      })
    }, 32)

    return () => window.clearInterval(timer)
  }, [isLoadingArtifacts, isRunning, runStatus.targetProgress, status])

  const activeError = requestError || runError
  const isDrawerVisible = viewMode === 'analysis' && Boolean(selectedEntity)
  const recentList = Array.isArray(recentAnalyses) ? recentAnalyses : []

  return (
    <div className="chat-page">
      <div className="chat-main">
        <header className="chat-header">
          <Link to="/" className="chat-brand" aria-label="Granulate home">
            <img src={granulateLogo} alt="Granulate" className="chat-logo-img" />
            <span className="chat-header-title">Granulate Analysis</span>
          </Link>

          {hasAnalysisData && (
            <div className="chat-view-segmented" role="tablist" aria-label="View mode">
              <button
                type="button"
                role="tab"
                className={`chat-view-segment ${viewMode === 'chat' ? 'chat-view-segment--active' : ''}`}
                onClick={() => setViewMode('chat')}
                aria-selected={viewMode === 'chat'}
              >
                Chat
              </button>
              <button
                type="button"
                role="tab"
                className={`chat-view-segment ${viewMode === 'analysis' ? 'chat-view-segment--active' : ''}`}
                onClick={() => setViewMode('analysis')}
                aria-selected={viewMode === 'analysis'}
              >
                Analysis
              </button>
            </div>
          )}
        </header>

        <main className="chat-content">
          {(!hasAnalysisData || viewMode === 'chat') && (
            <>
              <div className="chat-greeting-wrap">
                <div
                  ref={orbRef}
                  className="chat-greeting-orb"
                  aria-hidden
                  onMouseMove={handleOrbMouseMove}
                  onMouseLeave={handleOrbMouseLeave}
                >
                  {ORB_DOT_POSITIONS.map((pos, i) => {
                    const repulse = mouseInOrb ? getRepulsion(pos.x, pos.y, mouseInOrb.x, mouseInOrb.y) : { x: 0, y: 0 }
                    return (
                      <span
                        key={i}
                        className="chat-orb-dot-wrapper"
                        style={{
                          left: `${pos.x}%`,
                          top: `${pos.y}%`,
                          transform: `translate(-50%, -50%) translate(${repulse.x}px, ${repulse.y}px)`,
                        }}
                      >
                        <span className="chat-orb-dot" style={{ animationDelay: `${i * 0.04}s` }} />
                      </span>
                    )
                  })}
                </div>
                <p className="chat-greeting">
                  {getGreeting()}, <span className="chat-greeting-name">there</span>
                </p>
                <h2 className="chat-headline">
                  Analyze your data in <em className="chat-headline-accent">one place</em>
                </h2>
              </div>

              <section
                className={`chat-input-wrap ${isDragging ? 'chat-input-wrap--dragging' : ''}`}
                onDrop={onDrop}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="chat-file-input"
                  aria-label="Attach CSV file"
                  onChange={(e) => {
                    addFiles(e.target.files)
                    e.target.value = ''
                  }}
                />
                <div className="chat-input-box">
                  <span className="chat-input-icon" aria-hidden>
                    <ChatIconSpark />
                  </span>
                  <textarea
                    ref={queryInputRef}
                    className="chat-input chat-input-textarea"
                    placeholder="Paste text directly or attach a CSV file"
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value)
                      autoResize(e.currentTarget)
                    }}
                    aria-label="Analysis input text"
                    rows={1}
                  />
                </div>

                <div className="chat-input-toolbar">
                  <button
                    type="button"
                    className="chat-toolbar-btn"
                    onClick={onAttachClick}
                    aria-label="Attach CSV"
                    disabled={isRunning || isLoadingArtifacts}
                  >
                    <ChatIconAttach />
                    <span>Attach CSV</span>
                  </button>
                  <span className="chat-toolbar-hint">CSV file or plain text</span>
                  <button
                    type="button"
                    className="chat-send-btn"
                    aria-label="Run analysis"
                    onClick={runProjectFlow}
                    disabled={isRunning || isLoadingArtifacts}
                  >
                    <ChatIconSend />
                  </button>
                </div>

                {(isRunning || isLoadingArtifacts) && (
                  <div className="chat-run-status" role="status" aria-live="polite">
                    <div className="chat-run-status-head">
                      <span className="chat-run-status-title">{runStatus.title}</span>
                      <span className="chat-run-status-pct">{Math.round(displayProgress)}%</span>
                    </div>
                    <div className="chat-run-progress" aria-hidden>
                      <div
                        className={`chat-run-progress-fill ${
                          runStatus.indeterminate ? 'chat-run-progress-fill--indeterminate' : ''
                        }`}
                        style={{ width: `${Math.max(2, displayProgress)}%` }}
                      />
                    </div>
                    <p className="chat-run-status-detail">
                      {runStatus.stepText}
                      {runStatus.detail ? ` | ${runStatus.detail}` : ''}
                    </p>
                  </div>
                )}

                {!isRunning && !isLoadingArtifacts && hasAnalysisData && (
                  <p className="chat-run-status" role="status">
                    Analysis ready. Open <strong>Analysis</strong> to explore themes, map, and tree.
                  </p>
                )}

                {attachedFiles.length > 0 && (
                  <div className="chat-attached-list">
                    {attachedFiles.map((f) => (
                      <span key={f.name} className="chat-attached-tag">
                        {f.name}
                        <button
                          type="button"
                          className="chat-attached-remove"
                          onClick={removeFile}
                          aria-label={`Remove ${f.name}`}
                          disabled={isRunning || isLoadingArtifacts}
                        >
                          x
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {fileError && (
                  <p className="chat-file-error" role="alert">
                    {fileError}
                  </p>
                )}
                {activeError && (
                  <p className="chat-file-error" role="alert">
                    {activeError}
                  </p>
                )}
              </section>

              <section className="chat-recent-panel">
                <div className="chat-recent-head">
                  <h3 className="chat-card-title">Recent analyses</h3>
                  <button
                    type="button"
                    className="chat-plain-btn"
                    onClick={() => void loadRecentAnalyses()}
                    disabled={isLoadingRecent}
                  >
                    {isLoadingRecent ? 'Refreshing...' : 'Refresh'}
                  </button>
                </div>

                {recentList.length === 0 && (
                  <p className="chat-muted-text">
                    {isLoadingRecent ? 'Loading recent analyses...' : 'No recent analyses available yet.'}
                  </p>
                )}

                <div className="chat-recent-list">
                  {recentList.map((item) => {
                    const isDeleting = deletingAnalysisId === item.analysis_id
                    const isDeleteDisabled = isDeleting || item.status === 'queued' || item.status === 'processing'
                    return (
                      <div key={item.analysis_id} className="chat-recent-item">
                        <button
                          type="button"
                          className="chat-recent-item-main"
                          onClick={() => {
                            void openRecentAnalysis(item.analysis_id).catch(() => undefined)
                          }}
                          disabled={isDeleting}
                        >
                          <span className="chat-recent-id" title={item.analysis_id}>
                            {getRecentAnalysisLabel(item)}
                          </span>
                          <span className="chat-recent-meta">
                            {formatDateTime(item.created_at)} | {item.item_count} items
                          </span>
                          <span className={`chat-recent-status chat-recent-status--${item.status}`}>{item.status}</span>
                        </button>

                        <button
                          type="button"
                          className="chat-recent-delete"
                          onClick={() => {
                            void handleDeleteRecentAnalysis(item)
                          }}
                          disabled={isDeleteDisabled}
                          aria-label={`Delete ${getRecentAnalysisLabel(item)}`}
                          title={
                            item.status === 'queued' || item.status === 'processing'
                              ? 'Cannot delete an analysis while it is running'
                              : 'Delete analysis'
                          }
                        >
                          <ChatIconTrash />
                        </button>
                      </div>
                    )
                  })}
                </div>
              </section>
            </>
          )}

          {hasAnalysisData && viewMode === 'analysis' && (
            <section className="chat-analysis-layout">
              <div className="chat-analysis-main">
                <div className="chat-analysis-nav">
                  <div className="chat-analysis-nav-list" role="tablist" aria-label="Analysis sections">
                    {ANALYSIS_SECTIONS.map((section) => (
                      <button
                        key={section.id}
                        type="button"
                        role="tab"
                        className={`chat-analysis-nav-item ${
                          activeSection === section.id ? 'chat-analysis-nav-item--active' : ''
                        }`}
                        onClick={() => setActiveSection(section.id)}
                        aria-selected={activeSection === section.id}
                      >
                        {section.label}
                      </button>
                    ))}
                  </div>

                  <div className="chat-analysis-nav-actions">
                    <button type="button" className="chat-plain-btn" onClick={clearFilters}>
                      Clear selection
                    </button>
                    {selectedEntity && (
                      <button type="button" className="chat-plain-btn" onClick={() => setIsDrawerOpen((prev) => !prev)}>
                        {isDrawerOpen ? 'Hide details' : 'Show details'}
                      </button>
                    )}
                  </div>
                </div>

                {activeSection === 'overview' && (
                  <OverviewTab
                    overview={artifacts.overview}
                    insights={artifacts.insights}
                    selectedClusterId={selectedClusterId}
                    isLoading={isRunning || isLoadingArtifacts}
                    error={activeError}
                    onRetry={retryCurrentAnalysis}
                    onSelectCluster={(clusterId) => {
                      selectCluster(clusterId)
                      setActiveSection('themes')
                    }}
                  />
                )}

                {activeSection === 'themes' && (
                  <ClustersTab
                    data={artifacts.clusters}
                    mapData={artifacts.map}
                    selectedClusterId={selectedClusterId}
                    selectedPointId={selectedPointId}
                    onSelectCluster={selectCluster}
                    onSelectPoint={selectPoint}
                    isLoading={isRunning || isLoadingArtifacts}
                    error={activeError}
                    onRetry={retryCurrentAnalysis}
                  />
                )}

                {activeSection === 'map' && (
                  <MapTab
                    data={artifacts.map}
                    selectedClusterId={selectedClusterId}
                    selectedPointId={selectedPointId}
                    onSelectCluster={selectCluster}
                    onSelectPoint={selectPoint}
                    isLoading={isRunning || isLoadingArtifacts}
                    error={activeError}
                    onRetry={retryCurrentAnalysis}
                  />
                )}

                {activeSection === 'tree' && (
                  <HierarchyTab
                    analysisId={currentAnalysisId}
                    data={artifacts.hierarchy}
                    mapData={artifacts.map}
                    selectedClusterId={selectedClusterId}
                    selectedPointId={selectedPointId}
                    selectedNodeId={selectedNodeId}
                    onSelectCluster={selectCluster}
                    onSelectPoint={selectPoint}
                    onSelectNode={selectNode}
                    onOpenNodeItems={(clusterId) => {
                      selectCluster(clusterId)
                      setActiveSection('themes')
                    }}
                    onClearFilters={clearFilters}
                    isLoading={isRunning || isLoadingArtifacts}
                    error={activeError}
                    onRetry={retryCurrentAnalysis}
                  />
                )}
              </div>
            </section>
          )}
        </main>
      </div>

      {isDrawerVisible && (
        <>
          <div
            className={`chat-drawer-backdrop ${isDrawerOpen ? 'chat-drawer-backdrop--open' : ''}`}
            onClick={() => setIsDrawerOpen(false)}
            aria-hidden
          />
          <SelectionDetailsDrawer
            isOpen={isDrawerOpen}
            entity={selectedEntity}
            onClose={() => setIsDrawerOpen(false)}
            onClearSelection={clearFilters}
            onOpenSection={(sectionId) => setActiveSection(sectionId)}
            onSelectCluster={selectCluster}
            onSelectPoint={selectPoint}
            onSelectNode={selectNode}
          />
        </>
      )}
    </div>
  )
}

function ChatIconSpark() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3l1.5 3.5L17 8l-3.5 1.5L12 13l-1.5-3.5L7 8l3.5-1.5L12 3z" />
      <path d="M5 14l1 2.3L8.3 17 6 18l-1 2.3L4 18l-2.3-1L4 16.3 5 14z" />
      <path d="M19 14l1 2.3 2.3.7-2.3 1-1 2.3-1-2.3-2.3-1 2.3-.7 1-2.3z" />
    </svg>
  )
}

function ChatIconAttach() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21.44 11.05l-8.49 8.49a6 6 0 01-8.49-8.49l8.49-8.49a4 4 0 015.66 5.66l-8.5 8.48a2 2 0 01-2.82-2.82l7.78-7.78" />
    </svg>
  )
}

function ChatIconSend() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  )
}

function ChatIconTrash() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  )
}

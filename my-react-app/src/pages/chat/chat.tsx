import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import granulateLogo from '../../assets/Granulate logo.png'
import {
  ApiError,
  getAnalysisClusters,
  getAnalysisGranulate,
  getAnalysisHierarchy,
  getAnalysisMap,
  getAnalysisOverview,
  wait,
} from '../../api/analysis.client'
import type {
  AnalysisGranulateResponse,
  ClustersResponse,
  HierarchyResponse,
  MapResponse,
  OverviewResponse,
} from '../../api/analysis.types'
import { useAnalysisRun } from '../../hooks/useAnalysisRun'
import {
  clearAnalysisSelection,
  createInitialAnalysisSelectionState,
  withSelectedCluster,
  withSelectedPoint,
} from '../../state/analysisStore'
import ClustersTab from '../../tabs/ClustersTab'
import GranulateTab from '../../tabs/GranulateTab'
import HierarchyTab from '../../tabs/HierarchyTab'
import MapTab from '../../tabs/MapTab'
import OverviewTab from '../../tabs/OverviewTab'
import './chat.css'

const ALLOWED_TYPES = ['.csv']
const POLL_INTERVAL_MS = 1500
const POLL_TIMEOUT_MS = 120000
const ARTIFACT_TIMEOUT_MS = 120000

const RESULT_TABS = ['Overview', 'Map', 'Clusters', 'Granulate', 'Hierarchy'] as const

type ResultTab = (typeof RESULT_TABS)[number]
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
  map: MapResponse | null
  clusters: ClustersResponse | null
  granulate: AnalysisGranulateResponse | null
  hierarchy: HierarchyResponse | null
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
  hierarchy: { label: 'Hierarchy', detail: 'Building dendrogram structure', min: 28, max: 44 },
  clusters: { label: 'Clusters', detail: 'Grouping related items', min: 44, max: 60 },
  umap: { label: 'Map', detail: 'Projecting points for map view', min: 60, max: 76 },
  labeling: { label: 'Labeling', detail: 'Writing cluster labels', min: 76, max: 88 },
  granulate: { label: 'Granulate', detail: 'Producing granules and highlights', min: 88, max: 95 },
  overview: { label: 'Overview', detail: 'Finalizing summary artifacts', min: 95, max: 99 },
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
    map: null,
    clusters: null,
    granulate: null,
    hierarchy: null,
  }
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

export default function Chat() {
  const [query, setQuery] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('chat')
  const [attachedFiles, setAttachedFiles] = useState<File[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [fileError, setFileError] = useState('')
  const [requestError, setRequestError] = useState('')
  const [isLoadingArtifacts, setIsLoadingArtifacts] = useState(false)
  const [isLoadingGranulateItems, setIsLoadingGranulateItems] = useState(false)
  const [displayProgress, setDisplayProgress] = useState(0)
  const [stageStartedAt, setStageStartedAt] = useState(() => Date.now())
  const [progressTicker, setProgressTicker] = useState(0)

  const [artifacts, setArtifacts] = useState<AnalysisArtifacts>(createEmptyArtifacts)
  const [activeTab, setActiveTab] = useState<ResultTab>('Overview')
  const [selection, setSelection] = useState(createInitialAnalysisSelectionState)

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

  const loadArtifacts = useCallback(async (nextAnalysisId: string) => {
    setIsLoadingArtifacts(true)
    setRequestError('')

    try {
      const [overview, map, clusters, granulate, hierarchy] = await Promise.all([
        with409Retry(() => getAnalysisOverview(nextAnalysisId), ARTIFACT_TIMEOUT_MS),
        with409Retry(() => getAnalysisMap(nextAnalysisId), ARTIFACT_TIMEOUT_MS),
        with409Retry(() => getAnalysisClusters(nextAnalysisId), ARTIFACT_TIMEOUT_MS),
        with409Retry(() => getAnalysisGranulate(nextAnalysisId, false), ARTIFACT_TIMEOUT_MS),
        with409Retry(() => getAnalysisHierarchy(nextAnalysisId), ARTIFACT_TIMEOUT_MS),
      ])

      setArtifacts({
        overview,
        map,
        clusters,
        granulate,
        hierarchy,
      })
    } finally {
      setIsLoadingArtifacts(false)
    }
  }, [])

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
    setActiveTab('Overview')
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
        options: {
          granulate: true,
          granulate_return_items: false,
        },
      })

      setViewMode('analysis')
      await loadArtifacts(nextAnalysisId)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Request failed'
      setRequestError(message)
    }
  }, [attachedFiles, isLoadingArtifacts, isRunning, loadArtifacts, query, resetRun, startAnalysis])

  const loadGranulateItems = useCallback(async () => {
    if (!analysisId) return

    setIsLoadingGranulateItems(true)
    setRequestError('')

    try {
      const granulate = await with409Retry(
        () => getAnalysisGranulate(analysisId, true),
        ARTIFACT_TIMEOUT_MS
      )
      setArtifacts((prev) => ({
        ...prev,
        granulate,
      }))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load item-level granulate.'
      setRequestError(message)
    } finally {
      setIsLoadingGranulateItems(false)
    }
  }, [analysisId])

  const retryCurrentAnalysis = useCallback(() => {
    if (!analysisId) return
    void loadArtifacts(analysisId).catch((err: unknown) => {
      const message = err instanceof Error ? err.message : 'Failed to reload artifacts.'
      setRequestError(message)
    })
  }, [analysisId, loadArtifacts])

  const hasAnalysisData = useMemo(() => {
    return analysisId !== null || Object.values(artifacts).some(Boolean)
  }, [analysisId, artifacts])

  const selectedClusterId = selection.selectedClusterId
  const selectedPointId = selection.selectedPointId

  const selectCluster = useCallback((clusterId: number | null) => {
    setSelection((prev) => withSelectedCluster(prev, clusterId))
  }, [])

  const selectPoint = useCallback((pointId: string | null, clusterId?: number | null) => {
    setSelection((prev) => withSelectedPoint(prev, pointId, clusterId))
  }, [])

  const clearFilters = useCallback(() => {
    setSelection((prev) => clearAnalysisSelection(prev))
  }, [])

  const runStatus = useMemo(() => {
    const stage = status?.progress.stage as RunStage | undefined
    const backendPct = clampProgress(status?.progress.pct ?? 0)

    if (!stage) {
      if (isLoadingArtifacts && !isRunning) {
        return {
          title: 'Preparing results',
          detail: 'Loading analysis artifacts',
          targetProgress: 99,
          backendPct,
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
          backendPct: 0,
          stepText: 'Initializing',
          indeterminate: true,
        }
      }

      return {
        title: '',
        detail: '',
        targetProgress: 0,
        backendPct: 0,
        stepText: '',
        indeterminate: false,
      }
    }

    const meta = RUN_STAGE_META[stage]
    const isTerminal = stage === 'completed' || stage === 'failed'
    const elapsedSec = Math.max(0, (Date.now() - stageStartedAt) / 1000)
    const stageSpan = Math.max(meta.max - meta.min - 0.6, 0)
    const synthetic = meta.min + Math.min(elapsedSec * 1.2, stageSpan)
    const boundedBackend = Math.max(meta.min, Math.min(meta.max, backendPct))
    let targetProgress = Math.max(boundedBackend, synthetic)

    if (stage === 'completed') {
      targetProgress = 100
    } else if (stage === 'failed') {
      targetProgress = boundedBackend
    } else if (isLoadingArtifacts && !isRunning) {
      targetProgress = Math.max(targetProgress, 99)
    }

    const activeStageCount = RUN_STAGES.length - 2
    const stepIndex = Math.max(0, RUN_STAGES.indexOf(stage as RunStage))
    const stepText = isTerminal ? 'Done' : `Step ${Math.min(stepIndex + 1, activeStageCount)}/${activeStageCount}`

    return {
      title: meta.label,
      detail: meta.detail,
      targetProgress,
      backendPct,
      stepText,
      indeterminate: false,
    }
  }, [isLoadingArtifacts, isRunning, progressTicker, stageStartedAt, status])

  useEffect(() => {
    const stage = status?.progress.stage
    if (!stage) return
    setStageStartedAt(Date.now())
  }, [status?.progress.stage])

  useEffect(() => {
    if (!isRunning && !isLoadingArtifacts) return
    const timer = window.setInterval(() => {
      setProgressTicker((prev) => prev + 1)
    }, 250)
    return () => window.clearInterval(timer)
  }, [isLoadingArtifacts, isRunning])

  useEffect(() => {
    if (!isRunning && !isLoadingArtifacts && !analysisId && !status) {
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
  }, [analysisId, isLoadingArtifacts, isRunning, runStatus.targetProgress, status])

  const activeError = requestError || runError

  return (
    <div className="chat-page">
      <aside className="chat-sidebar">
        <Link to="/" className="chat-sidebar-logo" aria-label="Granulate home">
          <img src={granulateLogo} alt="Granulate" className="chat-logo-img" />
        </Link>
        <nav className="chat-sidebar-nav">
          <Link to="/" className="chat-nav-item" title="Home">
            <ChatIconHome />
          </Link>
          <Link to="/chat" className="chat-nav-item chat-nav-item--active" title="Chat">
            <ChatIconBubble />
          </Link>
          <span className="chat-nav-item" title="History">
            <ChatIconClock />
          </span>
          <span className="chat-nav-item" title="Files">
            <ChatIconFolder />
          </span>
          <span className="chat-nav-item" title="Share">
            <ChatIconShare />
          </span>
          <span className="chat-nav-item" title="Data sources">
            <ChatIconDatabase />
          </span>
          <span className="chat-nav-item" title="Support">
            <ChatIconSupport />
          </span>
          <span className="chat-nav-item" title="Settings">
            <ChatIconSettings />
          </span>
        </nav>
        <div className="chat-sidebar-user">
          <div className="chat-user-avatar" aria-hidden />
        </div>
      </aside>

      <div className="chat-main">
        <header className="chat-header">
          <div className="chat-header-left">
            <span className="chat-header-title">Granulate Chat</span>
          </div>
        </header>

        <main className="chat-content">
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
                    const repulse = mouseInOrb
                      ? getRepulsion(pos.x, pos.y, mouseInOrb.x, mouseInOrb.y)
                      : { x: 0, y: 0 }
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
                  What are we going to <em className="chat-headline-accent">analyze</em> today?
                </h2>
              </div>

              <div
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
                      {runStatus.detail ? ` · ${runStatus.detail}` : ''}
                      {!runStatus.indeterminate ? ` · backend ${runStatus.backendPct}%` : ''}
                    </p>
                  </div>
                )}

                {!isRunning && !isLoadingArtifacts && hasAnalysisData && (
                  <p className="chat-run-status" role="status">
                    Analysis ready. Switch to <strong>Analysis</strong> to explore results.
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
              </div>
            </>
          )}

          {hasAnalysisData && viewMode === 'analysis' && (
            <section className="chat-results-wrap">
              <div className="chat-tabs" role="tablist" aria-label="Results Explorer Tabs">
                {RESULT_TABS.map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    role="tab"
                    className={`chat-toolbar-btn ${activeTab === tab ? 'chat-toolbar-btn--active' : ''}`}
                    onClick={() => setActiveTab(tab)}
                    aria-selected={activeTab === tab}
                  >
                    {tab}
                  </button>
                ))}
                <button type="button" className="chat-plain-btn" onClick={clearFilters}>
                  Clear filters
                </button>
              </div>

              {activeTab === 'Overview' && (
                <OverviewTab
                  data={artifacts.overview}
                  isLoading={isRunning || isLoadingArtifacts}
                  error={activeError}
                  onRetry={retryCurrentAnalysis}
                  onSelectCluster={(clusterId) => {
                    selectCluster(clusterId)
                    setActiveTab('Map')
                  }}
                />
              )}

              {activeTab === 'Map' && (
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

              {activeTab === 'Clusters' && (
                <ClustersTab
                  data={artifacts.clusters}
                  selectedClusterId={selectedClusterId}
                  onSelectCluster={selectCluster}
                  onFocusRepresentative={(pointId, clusterId) => {
                    selectPoint(pointId, clusterId)
                    setActiveTab('Map')
                  }}
                  isLoading={isRunning || isLoadingArtifacts}
                  error={activeError}
                  onRetry={retryCurrentAnalysis}
                />
              )}

              {activeTab === 'Granulate' && (
                <GranulateTab
                  data={artifacts.granulate}
                  isLoading={isRunning || isLoadingArtifacts}
                  error={activeError}
                  isLoadingItems={isLoadingGranulateItems}
                  onRetry={retryCurrentAnalysis}
                  onLoadItems={loadGranulateItems}
                />
              )}

              {activeTab === 'Hierarchy' && (
                <HierarchyTab
                  data={artifacts.hierarchy}
                  selectedClusterId={selectedClusterId}
                  selectedPointId={selectedPointId}
                  onSelectCluster={selectCluster}
                  onSelectPoint={(pointId, clusterId) => {
                    selectPoint(pointId, clusterId)
                    setActiveTab('Map')
                  }}
                  onClearFilters={clearFilters}
                  isLoading={isRunning || isLoadingArtifacts}
                  error={activeError}
                  onRetry={retryCurrentAnalysis}
                />
              )}
            </section>
          )}
        </main>
      </div>
    </div>
  )
}

function ChatIconHome() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  )
}

function ChatIconBubble() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}

function ChatIconClock() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

function ChatIconFolder() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  )
}

function ChatIconShare() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  )
}

function ChatIconDatabase() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  )
}

function ChatIconSupport() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.82 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

function ChatIconSettings() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.01a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}

function ChatIconSpark() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3l1.9 3.9L18 9l-4.1 2.1L12 15l-1.9-3.9L6 9l4.1-2.1L12 3z" />
      <path d="M5 19l.95 1.95L8 22l-2.05 1.05L5 25l-.95-1.95L2 22l2.05-1.05L5 19z" />
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
      <path d="M21.44 11.05l-8.49 8.49a5.5 5.5 0 0 1-7.78-7.78l8.49-8.49a3.5 3.5 0 1 1 4.95 4.95l-8.49 8.49a1.5 1.5 0 0 1-2.12-2.12l7.07-7.07" />
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

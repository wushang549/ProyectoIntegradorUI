import { useState, useCallback, useRef, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import granulateLogo from '../../assets/Granulate logo.png'
import './chat.css'

const API_BASE_URL = 'http://127.0.0.1:8000/v1'
const ALLOWED_TYPES = ['.csv', '.txt', '.pdf']
const POLL_INTERVAL_MS = 1500
const POLL_TIMEOUT_MS = 120000
const DEFAULT_TOP_K_EVIDENCE = 6

const RESULT_TABS = ['Overview', 'Map', 'Clusters', 'Granulate', 'Hierarchy'] as const

type ResultTab = (typeof RESULT_TABS)[number]
type ClusterId = string | number

type ProjectCreated = {
  project_id: string
  status: string
}

type ProjectStatus = {
  project_id: string
  name?: string
  status: string
}

type ResultPoint = {
  x: number
  y: number
  cluster_id: ClusterId
  text_preview?: string
}

type ResultCluster = {
  cluster_id: ClusterId
  cluster_label?: string
  size?: number
  count?: number
}

type ProjectResults = {
  project_id: string
  stats: Record<string, unknown>
  points: ResultPoint[]
  clusters: ResultCluster[]
}

type ClassifyResponse = {
  cluster_id: ClusterId
  cluster_label?: string
  text_preview?: string
  x?: number
  y?: number
  confidence_margin?: number
}

type GranulateGranule = {
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

type GranulateResponse = {
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

type ViewMode = 'chat' | 'analysis'
type SortMode = 'confidence' | 'similarity' | 'sentiment'
type SentimentFilter = 'all' | 'positive' | 'neutral' | 'negative'
type SentimentValue = 'positive' | 'neutral' | 'negative'

type AspectSummary = {
  aspect: string
  count: number
  avgSentimentScore: number
  avgSentimentLabel: string
  topEvidence: string[]
  granules: GranulateGranule[]
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

function normalizeStatus(status: string | undefined) {
  return (status ?? '').toLowerCase().trim()
}

function isFailedStatus(status: string | undefined) {
  return normalizeStatus(status) === 'failed'
}

function isCompletedStatus(status: string | undefined) {
  const value = normalizeStatus(status)
  return ['completed', 'complete', 'succeeded', 'success', 'done', 'finished'].includes(value)
}

async function parseErrorMessage(res: Response) {
  try {
    const data = (await res.json()) as Record<string, unknown>
    const backendMessage =
      data.error_message ?? data.detail ?? data.message ?? data.error ?? data.status

    if (typeof backendMessage === 'string' && backendMessage.trim()) {
      return backendMessage
    }
  } catch {
    // ignore invalid json
  }

  return `${res.status} ${res.statusText}`
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, init)
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res))
  }
  return (await res.json()) as T
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function getClusterSize(cluster: ResultCluster) {
  if (typeof cluster.size === 'number') return cluster.size
  if (typeof cluster.count === 'number') return cluster.count
  return 0
}

function getClusterLabel(cluster: ResultCluster) {
  if (cluster.cluster_label && cluster.cluster_label.trim()) return cluster.cluster_label
  return `Cluster ${cluster.cluster_id}`
}

function formatStatKey(key: string) {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

const ASPECT_LABEL_OVERRIDES: Record<string, string> = {
  PRICE_VALUE: 'Price & value',
  WAIT_TIME: 'Wait time',
  FOOD_QUALITY: 'Food quality',
  RETURN_INTENT: 'Return intent',
}

function formatAspectLabel(aspect: string): string {
  const normalized = aspect.trim()
  if (!normalized) return 'Uncategorized'

  const mapped = ASPECT_LABEL_OVERRIDES[normalized.toUpperCase()]
  if (mapped) return mapped

  return normalized
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function formatNumber(value: number | undefined) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '-'
  return value.toFixed(3)
}

function buildAnalysisName(raw: string, file: File) {
  const prompt = raw.trim()
  if (prompt) return prompt.slice(0, 80)

  const base = file.name.replace(/\.[^/.]+$/, '').trim()
  if (base) return `${base} analysis`

  return `Analysis ${new Date().toISOString().slice(0, 19).replace('T', ' ')}`
}

function parseTaxonomyInput(raw: string): Record<string, string[]> | undefined {
  const value = raw.trim()
  if (!value) return undefined

  try {
    const parsed = JSON.parse(value) as unknown
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const entries = Object.entries(parsed as Record<string, unknown>)
      const normalized: Record<string, string[]> = {}
      for (const [key, item] of entries) {
        if (Array.isArray(item)) {
          const values = item
            .filter((entry): entry is string => typeof entry === 'string')
            .map((entry) => entry.trim())
            .filter(Boolean)
          if (values.length > 0) normalized[key] = values
        }
      }
      if (Object.keys(normalized).length > 0) return normalized
    }
  } catch {
    // fallback below
  }

  const terms = value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

  if (terms.length === 0) return undefined
  return { OTHER: terms }
}

function normalizeSentiment(value: string | undefined): SentimentValue {
  const normalized = (value ?? '').toLowerCase().trim()
  if (normalized === 'positive') return 'positive'
  if (normalized === 'negative') return 'negative'
  return 'neutral'
}

function sentimentLabel(value: string | undefined) {
  const normalized = normalizeSentiment(value)
  if (normalized === 'positive') return 'Positive'
  if (normalized === 'negative') return 'Negative'
  return 'Neutral'
}

function sentimentScore(granule: GranulateGranule) {
  if (typeof granule.sentiment_score === 'number') return granule.sentiment_score
  const normalized = normalizeSentiment(granule.sentiment)
  if (normalized === 'positive') return 1
  if (normalized === 'negative') return -1
  return 0
}

function averageSentiment(granules: GranulateGranule[]) {
  if (granules.length === 0) return 0
  const total = granules.reduce((sum, granule) => sum + sentimentScore(granule), 0)
  return total / granules.length
}

function avgSentimentLabel(score: number) {
  if (score > 0.15) return 'Positive'
  if (score < -0.15) return 'Negative'
  return 'Neutral'
}

function granuleConfidence(granule: GranulateGranule) {
  if (typeof granule.confidence === 'number') return granule.confidence
  if (typeof granule.similarity === 'number') return granule.similarity
  return 0
}

function topEvidence(granules: GranulateGranule[]) {
  const evidenceCount = new Map<string, number>()
  for (const granule of granules) {
    for (const evidenceItem of granule.evidence ?? []) {
      const trimmed = evidenceItem.trim()
      if (!trimmed) continue
      evidenceCount.set(trimmed, (evidenceCount.get(trimmed) ?? 0) + 1)
    }
  }
  return Array.from(evidenceCount.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([term]) => term)
}

export default function Chat() {
  const [query, setQuery] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('chat')
  const [attachedFiles, setAttachedFiles] = useState<File[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [fileError, setFileError] = useState('')
  const [requestError, setRequestError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [runStatus, setRunStatus] = useState('')

  const [projectId, setProjectId] = useState<string | null>(null)
  const [results, setResults] = useState<ProjectResults | null>(null)
  const [activeTab, setActiveTab] = useState<ResultTab>('Overview')
  const [selectedClusterId, setSelectedClusterId] = useState<ClusterId | null>(null)
  const [selectedTextPreview, setSelectedTextPreview] = useState('')

  const [classifyText, setClassifyText] = useState('')
  const [classifyResult, setClassifyResult] = useState<ClassifyResponse | null>(null)
  const [classifyError, setClassifyError] = useState('')
  const [isClassifying, setIsClassifying] = useState(false)

  const [granulateText, setGranulateText] = useState('')
  const [minSimilarity, setMinSimilarity] = useState(0.06)
  const [topKEvidence, setTopKEvidence] = useState(DEFAULT_TOP_K_EVIDENCE)
  const [useTaxonomy, setUseTaxonomy] = useState(false)
  const [taxonomyText, setTaxonomyText] = useState('')
  const [granulateResult, setGranulateResult] = useState<GranulateResponse | null>(null)
  const [granulateError, setGranulateError] = useState('')
  const [isGranulating, setIsGranulating] = useState(false)
  const [granuleSortMode, setGranuleSortMode] = useState<SortMode>('confidence')
  const [granuleSentimentFilter, setGranuleSentimentFilter] = useState<SentimentFilter>('all')
  const [showOtherAspects, setShowOtherAspects] = useState(false)
  const [openAspects, setOpenAspects] = useState<Record<string, boolean>>({})
  const [expandedEvidence, setExpandedEvidence] = useState<Record<string, boolean>>({})
  const [expandedSummaryEvidence, setExpandedSummaryEvidence] = useState<Record<string, boolean>>({})

  const fileInputRef = useRef<HTMLInputElement>(null)
  const queryInputRef = useRef<HTMLTextAreaElement>(null)
  const orbRef = useRef<HTMLDivElement>(null)
  const aspectRefs = useRef<Record<string, HTMLElement | null>>({})
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
    const ext = '.' + file.name.split('.').pop()?.toLowerCase()
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
      const next: File[] = []
      for (let i = 0; i < files.length; i++) {
        const f = files[i]
        if (validateFile(f)) next.push(f)
      }
      setAttachedFiles((prev) => [...prev, ...next])
    },
    [validateFile]
  )

  const removeFile = useCallback((index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index))
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

  const onAttachClick = () => fileInputRef.current?.click()

  const autoResize = useCallback((textarea: HTMLTextAreaElement | null) => {
    if (!textarea) return
    textarea.style.height = 'auto'
    textarea.style.height = `${Math.min(textarea.scrollHeight, 300)}px`
    textarea.style.overflowY = textarea.scrollHeight > 300 ? 'auto' : 'hidden'
  }, [])

  useEffect(() => {
    autoResize(queryInputRef.current)
  }, [query, autoResize])

  useEffect(() => {
    if (viewMode !== 'chat') return
    autoResize(queryInputRef.current)
  }, [autoResize, viewMode])

  const topClusters = useMemo(() => {
    if (!results) return []
    return [...results.clusters]
      .sort((a, b) => getClusterSize(b) - getClusterSize(a))
      .slice(0, 5)
  }, [results])

  const statsEntries = useMemo(() => {
    if (!results) return [] as Array<[string, string]>

    const primitiveStats = Object.entries(results.stats)
      .filter(([, value]) => ['number', 'string', 'boolean'].includes(typeof value))
      .map(([key, value]) => [formatStatKey(key), String(value)] as [string, string])

    const fallbackStats: Array<[string, string]> = [
      ['Points', String(results.points.length)],
      ['Clusters', String(results.clusters.length)],
    ]

    return primitiveStats.length > 0 ? primitiveStats : fallbackStats
  }, [results])

  const visiblePoints = useMemo(() => {
    if (!results) return []
    if (selectedClusterId === null) return results.points
    return results.points.filter((point) => String(point.cluster_id) === String(selectedClusterId))
  }, [results, selectedClusterId])

  const aspectSummaries = useMemo(() => {
    if (!granulateResult) return [] as AspectSummary[]

    const grouped = new Map<string, GranulateGranule[]>()
    for (const granule of granulateResult.granules) {
      const aspect = granule.aspect?.trim() || 'Uncategorized'
      const list = grouped.get(aspect)
      if (list) list.push(granule)
      else grouped.set(aspect, [granule])
    }

    const backendSummary = granulateResult.aspect_summary ?? {}
    const summaries: AspectSummary[] = []

    for (const [aspect, granules] of grouped.entries()) {
      const backend = backendSummary[aspect]
      const backendCount = typeof backend?.count === 'number' ? backend.count : undefined
      const backendAvgRaw = backend?.avg_sentiment
      const backendAvg =
        typeof backendAvgRaw === 'number'
          ? backendAvgRaw
          : typeof backendAvgRaw === 'string'
            ? normalizeSentiment(backendAvgRaw) === 'positive'
              ? 1
              : normalizeSentiment(backendAvgRaw) === 'negative'
                ? -1
                : 0
            : averageSentiment(granules)
      const evidence = Array.isArray(backend?.top_evidence) && backend.top_evidence.length > 0
        ? backend.top_evidence
        : topEvidence(granules)

      summaries.push({
        aspect,
        count: backendCount ?? granules.length,
        avgSentimentScore: backendAvg,
        avgSentimentLabel: avgSentimentLabel(backendAvg),
        topEvidence: evidence,
        granules,
      })
    }

    for (const [aspect, backend] of Object.entries(backendSummary)) {
      if (grouped.has(aspect)) continue
      if (typeof backend?.count !== 'number' || backend.count <= 0) continue
      const backendAvgRaw = backend.avg_sentiment
      const backendAvg =
        typeof backendAvgRaw === 'number'
          ? backendAvgRaw
          : typeof backendAvgRaw === 'string'
            ? normalizeSentiment(backendAvgRaw) === 'positive'
              ? 1
              : normalizeSentiment(backendAvgRaw) === 'negative'
                ? -1
                : 0
            : 0
      summaries.push({
        aspect,
        count: backend.count,
        avgSentimentScore: backendAvg,
        avgSentimentLabel: avgSentimentLabel(backendAvg),
        topEvidence: backend.top_evidence ?? [],
        granules: [],
      })
    }

    return summaries.sort((a, b) => b.count - a.count)
  }, [granulateResult])

  const visibleAspectSummaries = useMemo(() => {
    if (showOtherAspects) return aspectSummaries
    return aspectSummaries.filter((summary) => summary.aspect.trim().toUpperCase() !== 'OTHER')
  }, [aspectSummaries, showOtherAspects])

  const highlightedGranules = useMemo(() => {
    if (!granulateResult) return [] as GranulateGranule[]

    const source = Array.isArray(granulateResult.highlights) && granulateResult.highlights.length > 0
      ? granulateResult.highlights
      : granulateResult.granules

    return [...source].sort((a, b) => granuleConfidence(b) - granuleConfidence(a)).slice(0, 3)
  }, [granulateResult])

  const aspectAccordions = useMemo(() => {
    return visibleAspectSummaries
      .map((summary) => {
        const filtered = summary.granules.filter((granule) => {
          if (granuleSentimentFilter === 'all') return true
          return normalizeSentiment(granule.sentiment) === granuleSentimentFilter
        })

        const sorted = [...filtered].sort((a, b) => {
          if (granuleSortMode === 'similarity') {
            return (b.similarity ?? 0) - (a.similarity ?? 0)
          }
          if (granuleSortMode === 'sentiment') {
            return sentimentScore(b) - sentimentScore(a)
          }
          return granuleConfidence(b) - granuleConfidence(a)
        })

        const avgScore = averageSentiment(sorted.length > 0 ? sorted : summary.granules)
        return {
          ...summary,
          granules: sorted,
          displayCount: sorted.length,
          displayAvgSentimentLabel: avgSentimentLabel(avgScore),
        }
      })
      .filter((summary) => summary.granules.length > 0 || summary.count > 0)
  }, [granuleSentimentFilter, granuleSortMode, visibleAspectSummaries])

  useEffect(() => {
    if (aspectAccordions.length === 0) return
    setOpenAspects((prev) => {
      const next = { ...prev }
      for (const section of aspectAccordions) {
        if (next[section.aspect] === undefined) {
          next[section.aspect] = section.aspect === aspectAccordions[0].aspect
        }
      }
      return next
    })
  }, [aspectAccordions])

  const toggleAspect = useCallback((aspect: string) => {
    setOpenAspects((prev) => ({
      ...prev,
      [aspect]: !prev[aspect],
    }))
  }, [])

  const jumpToAspect = useCallback((aspect: string) => {
    const normalizedAspect = aspect.trim() || 'Uncategorized'
    if (normalizedAspect.toUpperCase() === 'OTHER') {
      setShowOtherAspects(true)
    }

    setOpenAspects((prev) => ({
      ...prev,
      [normalizedAspect]: true,
    }))
    requestAnimationFrame(() => {
      const section = aspectRefs.current[normalizedAspect]
      section?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [])

  const runProjectFlow = useCallback(async () => {
    if (isSubmitting) return

    setRequestError('')
    setFileError('')

    const file = attachedFiles[0]
    const promptText = query.trim()
    if (!file && !promptText) {
      setFileError('Please attach a file or enter text to granulate.')
      return
    }

    if (!file && promptText) {
      setIsSubmitting(true)
      setRunStatus('granulating')
      setViewMode('chat')
      setResults({
        project_id: 'text-only',
        stats: {},
        points: [],
        clusters: [],
      })
      setProjectId(null)
      setActiveTab('Granulate')
      setSelectedClusterId(null)
      setSelectedTextPreview('')
      setClassifyResult(null)
      setClassifyError('')
      setGranulateText(promptText)
      setGranulateResult(null)
      setGranulateError('')
      setOpenAspects({})
      setExpandedEvidence({})
      setExpandedSummaryEvidence({})
      setShowOtherAspects(false)

      try {
        const taxonomy = useTaxonomy ? parseTaxonomyInput(taxonomyText) : undefined
        const payload: {
          text: string
          taxonomy?: Record<string, string[]>
          top_k_evidence: number
          min_similarity: number
        } = {
          text: promptText,
          top_k_evidence: topKEvidence,
          min_similarity: minSimilarity,
        }
        if (taxonomy) payload.taxonomy = taxonomy

        const response = await requestJson<GranulateResponse>('/granulate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        setGranulateResult(response)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Granulate request failed'
        setGranulateError(message)
      } finally {
        setIsSubmitting(false)
      }
      return
    }

    const analysisName = buildAnalysisName(query, file)

    setIsSubmitting(true)
    setRunStatus('creating_project')
    setViewMode('chat')
    setResults(null)
    setProjectId(null)
    setActiveTab('Overview')
    setSelectedClusterId(null)
    setSelectedTextPreview('')
    setClassifyResult(null)
    setClassifyError('')
    setGranulateResult(null)
    setGranulateError('')
    setGranulateText(query.trim())
    setOpenAspects({})
    setExpandedEvidence({})
    setExpandedSummaryEvidence({})
    setShowOtherAspects(false)

    try {
      const formData = new FormData()
      formData.append('analysis_name', analysisName)
      formData.append('file', file)

      const created = await requestJson<ProjectCreated>('/projects', {
        method: 'POST',
        body: formData,
      })

      const nextProjectId = created.project_id
      setProjectId(nextProjectId)

      const runResponse = await requestJson<ProjectStatus>(`/projects/${nextProjectId}/run`, {
        method: 'POST',
      })
      setRunStatus(runResponse.status)

      const start = Date.now()
      let terminalStatus: ProjectStatus | null = null

      while (Date.now() - start < POLL_TIMEOUT_MS) {
        const current = await requestJson<ProjectStatus>(`/projects/${nextProjectId}`)
        setRunStatus(current.status)

        if (isFailedStatus(current.status)) {
          throw new Error('Project analysis failed.')
        }

        if (isCompletedStatus(current.status)) {
          terminalStatus = current
          break
        }

        await wait(POLL_INTERVAL_MS)
      }

      if (!terminalStatus) {
        throw new Error('Project analysis timed out after 120 seconds.')
      }

      const nextResults = await requestJson<ProjectResults>(`/projects/${nextProjectId}/results`)
      setResults(nextResults)
      setRunStatus(terminalStatus.status)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Request failed'
      setRequestError(message)
    } finally {
      setIsSubmitting(false)
    }
  }, [attachedFiles, isSubmitting, minSimilarity, query, taxonomyText, topKEvidence, useTaxonomy])

  const runClassify = useCallback(async () => {
    if (!projectId || isClassifying) return

    const text = classifyText.trim()
    if (!text) {
      setClassifyError('Enter text to classify.')
      return
    }

    setIsClassifying(true)
    setClassifyError('')
    setClassifyResult(null)

    try {
      const response = await requestJson<ClassifyResponse>(`/projects/${projectId}/classify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      setClassifyResult(response)
      setSelectedClusterId(response.cluster_id)
      setSelectedTextPreview(response.text_preview ?? text)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Classification failed'
      setClassifyError(message)
    } finally {
      setIsClassifying(false)
    }
  }, [classifyText, isClassifying, projectId])

  const runGranulate = useCallback(async () => {
    if (isGranulating) return

    const text = granulateText.trim()
    if (!text) {
      setGranulateError('Enter text to granulate.')
      return
    }

    setIsGranulating(true)
    setGranulateError('')
    setViewMode('analysis')
    setOpenAspects({})
    setExpandedEvidence({})
    setExpandedSummaryEvidence({})
    setShowOtherAspects(false)

    const taxonomy = useTaxonomy ? parseTaxonomyInput(taxonomyText) : undefined

    const payload: {
      text: string
      taxonomy?: Record<string, string[]>
      top_k_evidence: number
      min_similarity: number
    } = {
      text,
      top_k_evidence: topKEvidence,
      min_similarity: minSimilarity,
    }

    if (taxonomy) {
      payload.taxonomy = taxonomy
    }

    const path = projectId ? `/projects/${projectId}/granulate` : '/granulate'

    try {
      const response = await requestJson<GranulateResponse>(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      setGranulateResult(response)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Granulate request failed'
      setGranulateError(message)
    } finally {
      setIsGranulating(false)
    }
  }, [granulateText, isGranulating, minSimilarity, projectId, taxonomyText, topKEvidence, useTaxonomy])

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
          {results && (
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

          {(!results || viewMode === 'chat') && (
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
                  accept=".csv,.txt,.pdf,text/csv,text/plain,application/pdf"
                  multiple
                  className="chat-file-input"
                  aria-label="Attach files"
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
                    placeholder="Load your Data and analyze it like a pro in seconds"
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value)
                      autoResize(e.currentTarget)
                    }}
                    aria-label="Ask AI"
                    rows={1}
                  />
                </div>
                <div className="chat-input-toolbar">
                  <button
                    type="button"
                    className="chat-toolbar-btn"
                    onClick={onAttachClick}
                    aria-label="Attach files (CSV, TXT, PDF)"
                    disabled={isSubmitting}
                  >
                    <ChatIconAttach />
                    <span>Attach</span>
                  </button>
                  <span className="chat-toolbar-hint">CSV, TXT or PDF</span>
                  <button
                    type="button"
                    className="chat-send-btn"
                    aria-label="Send"
                    onClick={runProjectFlow}
                    disabled={isSubmitting}
                  >
                    <ChatIconSend />
                  </button>
                </div>
                {isSubmitting && (
                  <p className="chat-run-status" role="status">
                    Running analysis{runStatus ? ` (${runStatus})` : '...'}
                  </p>
                )}
                {!isSubmitting && results && (
                  <p className="chat-run-status" role="status">
                    Analysis ready. Switch to <strong>Analysis</strong> to explore results.
                  </p>
                )}
                {attachedFiles.length > 0 && (
                  <div className="chat-attached-list">
                    {attachedFiles.map((f, i) => (
                      <span key={`${f.name}-${i}`} className="chat-attached-tag">
                        {f.name}
                        <button
                          type="button"
                          className="chat-attached-remove"
                          onClick={() => removeFile(i)}
                          aria-label={`Remove ${f.name}`}
                          disabled={isSubmitting}
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
                {requestError && (
                  <p className="chat-file-error" role="alert">
                    {requestError}
                  </p>
                )}
              </div>
            </>
          )}

          {results && viewMode === 'analysis' && (
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
              </div>

              {activeTab === 'Overview' && (
                <div className="chat-result-panel">
                  <h3 className="chat-result-title">Overview</h3>
                  <div className="chat-stats-grid">
                    {statsEntries.map(([key, value]) => (
                      <div key={key} className="chat-stat-card">
                        <span className="chat-stat-key">{key}</span>
                        <span className="chat-stat-value">{value}</span>
                      </div>
                    ))}
                  </div>

                  <h4 className="chat-result-subtitle">Top clusters</h4>
                  <div className="chat-list-grid">
                    {topClusters.length === 0 && <p className="chat-muted-text">No clusters available.</p>}
                    {topClusters.map((cluster) => (
                      <button
                        key={String(cluster.cluster_id)}
                        type="button"
                        className="chat-list-item"
                        onClick={() => {
                          setSelectedClusterId(cluster.cluster_id)
                          setActiveTab('Map')
                        }}
                      >
                        <span>{getClusterLabel(cluster)}</span>
                        <strong>{getClusterSize(cluster)}</strong>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'Map' && (
                <div className="chat-result-panel">
                  <h3 className="chat-result-title">Map</h3>
                  <p className="chat-muted-text">
                    {selectedClusterId === null
                      ? `Showing ${visiblePoints.length} points`
                      : `Showing ${visiblePoints.length} points for cluster ${selectedClusterId}`}
                  </p>
                  <div className="chat-map-table" role="table" aria-label="Map points">
                    <div className="chat-map-row chat-map-row--head" role="row">
                      <span>X</span>
                      <span>Y</span>
                      <span>Cluster</span>
                      <span>Preview</span>
                    </div>
                    {visiblePoints.length === 0 && (
                      <div className="chat-map-row" role="row">
                        <span className="chat-muted-text">No points available.</span>
                      </div>
                    )}
                    {visiblePoints.slice(0, 200).map((point, index) => {
                      const isSelected = selectedTextPreview === (point.text_preview ?? '')
                      return (
                        <button
                          key={`${point.cluster_id}-${index}-${point.x}-${point.y}`}
                          type="button"
                          className={`chat-map-row chat-map-row--button ${isSelected ? 'chat-map-row--active' : ''}`}
                          onClick={() => {
                            setSelectedClusterId(point.cluster_id)
                            setSelectedTextPreview(point.text_preview ?? '')
                          }}
                        >
                          <span>{formatNumber(point.x)}</span>
                          <span>{formatNumber(point.y)}</span>
                          <span>{point.cluster_id}</span>
                          <span>{point.text_preview ?? '-'}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {activeTab === 'Clusters' && (
                <div className="chat-result-panel">
                  <h3 className="chat-result-title">Clusters</h3>
                  <div className="chat-list-grid">
                    {results.clusters.length === 0 && <p className="chat-muted-text">No clusters available.</p>}
                    {results.clusters.map((cluster) => {
                      const isActive =
                        selectedClusterId !== null && String(selectedClusterId) === String(cluster.cluster_id)
                      return (
                        <button
                          key={String(cluster.cluster_id)}
                          type="button"
                          className={`chat-list-item ${isActive ? 'chat-list-item--active' : ''}`}
                          onClick={() => {
                            setSelectedClusterId(cluster.cluster_id)
                            setActiveTab('Map')
                          }}
                        >
                          <span>{getClusterLabel(cluster)}</span>
                          <strong>{getClusterSize(cluster)}</strong>
                        </button>
                      )
                    })}
                  </div>

                  <h4 className="chat-result-subtitle">Classify new text</h4>
                  <div className="chat-inline-form">
                    <input
                      type="text"
                      className="chat-input chat-inline-input"
                      value={classifyText}
                      onChange={(e) => setClassifyText(e.target.value)}
                      placeholder="Type text to classify"
                      aria-label="Classify new text"
                    />
                    <button
                      type="button"
                      className="chat-send-btn chat-send-btn--compact"
                      onClick={runClassify}
                      disabled={isClassifying}
                    >
                      <ChatIconSend />
                    </button>
                  </div>
                  {classifyError && (
                    <p className="chat-file-error" role="alert">
                      {classifyError}
                    </p>
                  )}
                  {classifyResult && (
                    <p className="chat-muted-text">
                      Predicted: {classifyResult.cluster_label ?? `Cluster ${classifyResult.cluster_id}`} |
                      Confidence margin:{' '}
                      {typeof classifyResult.confidence_margin === 'number'
                        ? classifyResult.confidence_margin.toFixed(3)
                        : 'N/A'}
                    </p>
                  )}
                </div>
              )}

              {activeTab === 'Granulate' && (
                <div className="chat-result-panel">
                  <h3 className="chat-result-title">Granulate</h3>
                  <textarea
                    className="chat-granulate-textarea"
                    value={granulateText}
                    onChange={(e) => setGranulateText(e.target.value)}
                    placeholder="Enter text to granulate"
                    aria-label="Granulate input text"
                    rows={4}
                  />

                  <div className="chat-controls-grid">
                    <label className="chat-control-block">
                      <span>min_similarity: {minSimilarity.toFixed(2)}</span>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={minSimilarity}
                        onChange={(e) => setMinSimilarity(Number(e.target.value))}
                      />
                    </label>

                    <label className="chat-control-block">
                      <span>top_k_evidence</span>
                      <select
                        value={topKEvidence}
                        onChange={(e) => setTopKEvidence(Number(e.target.value))}
                        className="chat-select"
                      >
                        <option value={3}>3</option>
                        <option value={6}>6</option>
                        <option value={10}>10</option>
                      </select>
                    </label>

                    <label className="chat-control-inline">
                      <input
                        type="checkbox"
                        checked={useTaxonomy}
                        onChange={(e) => setUseTaxonomy(e.target.checked)}
                      />
                      <span>Include taxonomy</span>
                    </label>
                  </div>

                  {useTaxonomy && (
                    <div className="chat-taxonomy-wrap">
                      <input
                        type="text"
                        className="chat-input chat-inline-input chat-taxonomy-input"
                        value={taxonomyText}
                        onChange={(e) => setTaxonomyText(e.target.value)}
                        placeholder="Optional: customize categories (advanced)"
                        aria-label="Taxonomy"
                      />
                      <p className="chat-taxonomy-help">
                        {'Paste a JSON object mapping category -> keywords. Leave empty to auto-detect.'}
                      </p>
                    </div>
                  )}

                  <div className="chat-run-actions">
                    <button
                      type="button"
                      className="chat-run-btn"
                      onClick={runGranulate}
                      disabled={isGranulating}
                      aria-label="Run analysis"
                    >
                      {isGranulating ? 'Running analysis...' : 'Run analysis'}
                    </button>
                    <span className="chat-run-hint" title="Re-runs the model with the current settings.">
                      Re-runs the model with current settings.
                    </span>
                  </div>

                  {granulateError && (
                    <p className="chat-file-error" role="alert">
                      {granulateError}
                    </p>
                  )}

                  {granulateResult && (
                    <div className="chat-granulate-results">
                      {granulateResult.scenario_summary && (
                        <p className="chat-muted-text">
                          {typeof granulateResult.scenario_summary === 'string'
                            ? granulateResult.scenario_summary
                            : Object.entries(granulateResult.scenario_summary)
                                .map(([name, value]) => `${name}: ${value}`)
                                .join(' | ')}
                        </p>
                      )}

                      <div className="chat-analysis-layout">
                        <section className="chat-result-panel chat-summary-panel">
                          <h4 className="chat-result-subtitle">Aspect summary</h4>
                          <div className="chat-aspect-summary-grid">
                            {visibleAspectSummaries.length === 0 && (
                              <p className="chat-muted-text">No aspect summaries available.</p>
                            )}
                            {visibleAspectSummaries.map((summary) => {
                              const summaryExpanded = Boolean(expandedSummaryEvidence[summary.aspect])
                              const visibleEvidence = summaryExpanded
                                ? summary.topEvidence
                                : summary.topEvidence.slice(0, 3)
                              const hiddenCount = Math.max(summary.topEvidence.length - 3, 0)

                              return (
                                <article key={summary.aspect} className="chat-aspect-card">
                                  <header className="chat-aspect-card-head">
                                    <span className="chat-aspect-card-title">
                                      {formatAspectLabel(summary.aspect)}
                                    </span>
                                    <strong className="chat-aspect-card-count">{summary.count}</strong>
                                  </header>
                                  <p className="chat-muted-text chat-aspect-card-stat">
                                    Avg sentiment: {summary.avgSentimentLabel}
                                  </p>
                                  <div className="chat-chip-row">
                                    {visibleEvidence.map((chip, chipIndex) => (
                                      <span key={`${summary.aspect}-${chip}-${chipIndex}`} className="chat-chip">
                                        {chip}
                                      </span>
                                    ))}
                                    {summary.topEvidence.length > 3 && (
                                      <button
                                        type="button"
                                        className="chat-chip chat-chip--muted chat-chip-button"
                                        onClick={() =>
                                          setExpandedSummaryEvidence((prev) => ({
                                            ...prev,
                                            [summary.aspect]: !prev[summary.aspect],
                                          }))
                                        }
                                        aria-expanded={summaryExpanded}
                                      >
                                        {summaryExpanded ? 'Show less' : `+${hiddenCount}`}
                                      </button>
                                    )}
                                  </div>
                                </article>
                              )
                            })}
                          </div>
                        </section>

                        <aside className="chat-result-panel chat-signals-panel">
                          <h4 className="chat-result-subtitle">Key signals</h4>
                          <div className="chat-signals-list">
                            {highlightedGranules.length === 0 && (
                              <p className="chat-muted-text">No highlights available.</p>
                            )}
                            {highlightedGranules.map((highlight, index) => (
                              <button
                                key={`${highlight.aspect}-${index}-${highlight.excerpt ?? ''}`}
                                type="button"
                                className="chat-signal-row"
                                onClick={() => jumpToAspect(highlight.aspect?.trim() || 'Uncategorized')}
                              >
                                <span
                                  className={`chat-sentiment-dot chat-sentiment-dot--${normalizeSentiment(
                                    highlight.sentiment
                                  )}`}
                                  aria-hidden
                                />
                                <span className="chat-signal-excerpt">{highlight.excerpt ?? ''}</span>
                                <span className="chat-signal-tag">
                                  {formatAspectLabel(highlight.aspect?.trim() || 'Uncategorized')}
                                </span>
                              </button>
                            ))}
                          </div>
                        </aside>
                      </div>

                      <h4 className="chat-result-subtitle">Units</h4>
                      <div className="chat-attached-list">
                        {granulateResult.units.length === 0 && (
                          <p className="chat-muted-text">No units available.</p>
                        )}
                        {granulateResult.units.map((unit, index) => (
                          <span key={`${unit}-${index}`} className="chat-attached-tag">
                            {unit}
                          </span>
                        ))}
                      </div>

                      <div className="chat-accordion-tools">
                        <label className="chat-control-block">
                          <span>Sort</span>
                          <select
                            className="chat-select"
                            value={granuleSortMode}
                            onChange={(e) => setGranuleSortMode(e.target.value as SortMode)}
                          >
                            <option value="confidence">Confidence</option>
                            <option value="similarity">Similarity</option>
                            <option value="sentiment">Sentiment score</option>
                          </select>
                        </label>
                        <label className="chat-control-block">
                          <span>Filter sentiment</span>
                          <select
                            className="chat-select"
                            value={granuleSentimentFilter}
                            onChange={(e) => setGranuleSentimentFilter(e.target.value as SentimentFilter)}
                          >
                            <option value="all">All</option>
                            <option value="positive">Positive</option>
                            <option value="neutral">Neutral</option>
                            <option value="negative">Negative</option>
                          </select>
                        </label>
                        <label className="chat-control-inline chat-control-inline--toggle">
                          <input
                            type="checkbox"
                            checked={showOtherAspects}
                            onChange={(e) => setShowOtherAspects(e.target.checked)}
                          />
                          <span>Show OTHER</span>
                        </label>
                      </div>

                      <h4 className="chat-result-subtitle">Granules by aspect</h4>
                      <div className="chat-aspect-accordion-list">
                        {aspectAccordions.length === 0 && (
                          <p className="chat-muted-text">No granules available for this filter.</p>
                        )}
                        {aspectAccordions.map((section) => (
                          <section
                            key={section.aspect}
                            className="chat-aspect-accordion"
                            ref={(el) => {
                              aspectRefs.current[section.aspect] = el
                            }}
                          >
                            <button
                              type="button"
                              className="chat-aspect-accordion-head"
                              onClick={() => toggleAspect(section.aspect)}
                              aria-expanded={Boolean(openAspects[section.aspect])}
                            >
                              <span className="chat-aspect-accordion-title">
                                {formatAspectLabel(section.aspect)}
                              </span>
                              <span className="chat-aspect-accordion-count">{section.displayCount}</span>
                              <span className="chat-aspect-accordion-sentiment">
                                {section.displayAvgSentimentLabel}
                              </span>
                            </button>
                            {openAspects[section.aspect] && (
                              <div className="chat-aspect-accordion-body">
                                {section.granules.map((granule, index) => {
                                  const evidence = granule.evidence ?? []
                                  const evidenceKey = `${section.aspect}-${index}`
                                  const expanded = Boolean(expandedEvidence[evidenceKey])
                                  const visibleEvidence = expanded ? evidence : evidence.slice(0, 6)
                                  return (
                                    <article
                                      key={evidenceKey}
                                      className={`chat-granule-card chat-granule-card--${normalizeSentiment(
                                        granule.sentiment
                                      )}`}
                                    >
                                      <p className="chat-granule-excerpt">{granule.excerpt ?? ''}</p>
                                      <div className="chat-granule-meta">
                                        <span className="chat-granule-meta-item">
                                          <span
                                            className={`chat-sentiment-dot chat-sentiment-dot--${normalizeSentiment(
                                              granule.sentiment
                                            )}`}
                                            aria-hidden
                                          />
                                          {sentimentLabel(granule.sentiment)}
                                        </span>
                                        <span className="chat-granule-meta-item">
                                          Confidence {granuleConfidence(granule).toFixed(2)}
                                        </span>
                                        <span className="chat-granule-meta-item">
                                          Similarity{' '}
                                          {typeof granule.similarity === 'number'
                                            ? granule.similarity.toFixed(2)
                                            : 'N/A'}
                                        </span>
                                      </div>
                                      <div className="chat-chip-row">
                                        {visibleEvidence.map((item) => (
                                          <span key={`${evidenceKey}-${item}`} className="chat-chip">
                                            {item}
                                          </span>
                                        ))}
                                        {evidence.length > 6 && (
                                          <button
                                            type="button"
                                            className="chat-chip chat-chip-button"
                                            onClick={() =>
                                              setExpandedEvidence((prev) => ({
                                                ...prev,
                                                [evidenceKey]: !prev[evidenceKey],
                                              }))
                                            }
                                          >
                                            {expanded ? 'Show less' : `+${evidence.length - 6} more`}
                                          </button>
                                        )}
                                      </div>
                                    </article>
                                  )
                                })}
                              </div>
                            )}
                          </section>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'Hierarchy' && (
                <div className="chat-result-panel">
                  <h3 className="chat-result-title">Hierarchy</h3>
                  <p className="chat-muted-text">
                    Hierarchical dendrogram coming soon. For now, adjust granularity using Granulate
                    (min_similarity) and explore clusters in the Map/Clusters tabs.
                  </p>
                </div>
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
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  )
}
function ChatIconBubble() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}
function ChatIconClock() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}
function ChatIconFolder() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  )
}
function ChatIconShare() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  )
}
function ChatIconSupport() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
      <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
    </svg>
  )
}
function ChatIconSettings() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}
function ChatIconSpark() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    </svg>
  )
}
function ChatIconAttach() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>
  )
}
function ChatIconSend() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m22 2-7 20-4-9-9-4Z" />
      <path d="M22 2 11 13" />
    </svg>
  )
}

import type {
  AnalysisGranulateResponse,
  AnalysisStatusResponse,
  ClustersResponse,
  CreateAnalysisRequest,
  CreateAnalysisResponse,
  HierarchyLabelsResponse,
  HierarchyResponse,
  InsightsResponse,
  MapResponse,
  OverviewResponse,
  RecentAnalysisResponse,
} from './analysis.types'

const API_BASE_URL = 'http://127.0.0.1:8000/v1'

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function parseErrorMessage(res: Response): Promise<string> {
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
    throw new ApiError(res.status, await parseErrorMessage(res))
  }
  return (await res.json()) as T
}

export async function createAnalysis(payload: CreateAnalysisRequest): Promise<CreateAnalysisResponse> {
  const formData = new FormData()
  formData.append('input_type', payload.inputType)

  if (payload.inputType === 'text') {
    formData.append('text', payload.text ?? '')
  } else if (payload.file) {
    formData.append('file', payload.file)
  }

  const optionsWithGranulateItems = {
    ...(payload.options ?? {}),
    granulate_return_items: true,
  }
  formData.append('options', JSON.stringify(optionsWithGranulateItems))

  return requestJson<CreateAnalysisResponse>('/analysis', {
    method: 'POST',
    body: formData,
  })
}

export async function getRecentAnalyses(limit = 10): Promise<RecentAnalysisResponse[]> {
  return requestJson<RecentAnalysisResponse[]>(`/analysis/recent?limit=${limit}`)
}

export async function getAnalysisStatus(analysisId: string): Promise<AnalysisStatusResponse> {
  return requestJson<AnalysisStatusResponse>(`/analysis/${analysisId}/status`)
}

export async function getAnalysisOverview(analysisId: string): Promise<OverviewResponse> {
  return requestJson<OverviewResponse>(`/analysis/${analysisId}/overview`)
}

export async function getAnalysisInsights(analysisId: string): Promise<InsightsResponse> {
  return requestJson<InsightsResponse>(`/analysis/${analysisId}/insights`)
}

export async function getAnalysisMap(analysisId: string, kClusters?: number): Promise<MapResponse> {
  const query =
    typeof kClusters === 'number'
      ? `?k_clusters=${Math.max(2, Math.min(100, Math.round(kClusters)))}`
      : ''
  return requestJson<MapResponse>(`/analysis/${analysisId}/map${query}`)
}

export async function getAnalysisClusters(analysisId: string, kClusters?: number): Promise<ClustersResponse> {
  const query =
    typeof kClusters === 'number'
      ? `?k_clusters=${Math.max(2, Math.min(100, Math.round(kClusters)))}`
      : ''
  return requestJson<ClustersResponse>(`/analysis/${analysisId}/clusters${query}`)
}

export async function getAnalysisGranulate(
  analysisId: string,
  includeItems = true
): Promise<AnalysisGranulateResponse> {
  return requestJson<AnalysisGranulateResponse>(
    `/analysis/${analysisId}/granulate?include_items=${includeItems ? 'true' : 'false'}`
  )
}

export async function getAnalysisHierarchy(analysisId: string): Promise<HierarchyResponse> {
  return requestJson<HierarchyResponse>(`/analysis/${analysisId}/hierarchy`)
}

export async function labelAnalysisHierarchyNodes(
  analysisId: string,
  nodeIds: string[]
): Promise<HierarchyLabelsResponse> {
  return requestJson<HierarchyLabelsResponse>(`/analysis/${analysisId}/hierarchy/labels`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      node_ids: nodeIds,
    }),
  })
}

export function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

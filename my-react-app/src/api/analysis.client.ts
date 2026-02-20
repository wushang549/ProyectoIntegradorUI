import type {
  AnalysisGranulateResponse,
  AnalysisStatusResponse,
  ClustersResponse,
  CreateAnalysisRequest,
  CreateAnalysisResponse,
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

  if (payload.options) {
    formData.append('options', JSON.stringify(payload.options))
  }

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

export async function getAnalysisMap(analysisId: string): Promise<MapResponse> {
  return requestJson<MapResponse>(`/analysis/${analysisId}/map`)
}

export async function getAnalysisClusters(analysisId: string): Promise<ClustersResponse> {
  return requestJson<ClustersResponse>(`/analysis/${analysisId}/clusters`)
}

export async function getAnalysisGranulate(
  analysisId: string,
  includeItems = false
): Promise<AnalysisGranulateResponse> {
  return requestJson<AnalysisGranulateResponse>(
    `/analysis/${analysisId}/granulate?include_items=${includeItems ? 'true' : 'false'}`
  )
}

export async function getAnalysisHierarchy(analysisId: string): Promise<HierarchyResponse> {
  return requestJson<HierarchyResponse>(`/analysis/${analysisId}/hierarchy`)
}

export function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

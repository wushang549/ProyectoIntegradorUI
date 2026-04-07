import type {
  AnalysisChatRequest,
  AnalysisChatResponse,
  AnalysisGranulateResponse,
  AnalysisStatusResponse,
  ClustersResponse,
  CreateAnalysisRequest,
  CreateAnalysisResponse,
  DeleteAnalysisResponse,
  HierarchyLabelsResponse,
  HierarchyResponse,
  InsightsResponse,
  MapResponse,
  OverviewResponse,
  RecentAnalysesResponse,
} from './analysis.types'
import { supabase } from '../auth/supabaseClient'

const apiBaseOrigin = import.meta.env.VITE_API_BASE_URL?.toString().trim() || 'http://127.0.0.1:8000'
const API_BASE_URL = `${apiBaseOrigin.replace(/\/+$/, '')}/v1`

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
  const headers = new Headers(init?.headers)

  if (supabase && !headers.has('Authorization')) {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (session?.access_token) {
      headers.set('Authorization', `Bearer ${session.access_token}`)
    }
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  })
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

export async function getRecentAnalyses(limit = 10): Promise<RecentAnalysesResponse> {
  return requestJson<RecentAnalysesResponse>(`/analysis/recent?limit=${limit}`)
}

export async function deleteAnalysis(analysisId: string): Promise<DeleteAnalysisResponse> {
  return requestJson<DeleteAnalysisResponse>(`/analysis/${analysisId}`, {
    method: 'DELETE',
  })
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

export async function chatWithAnalysis(
  analysisId: string,
  payload: AnalysisChatRequest
): Promise<AnalysisChatResponse> {
  return requestJson<AnalysisChatResponse>(`/analysis/${analysisId}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages: payload.messages,
      selection: payload.selection
        ? {
            selected_cluster_id: payload.selection.selectedClusterId ?? null,
            selected_point_id: payload.selection.selectedPointId ?? null,
            selected_node_id: payload.selection.selectedNodeId ?? null,
          }
        : undefined,
    }),
  })
}

export function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

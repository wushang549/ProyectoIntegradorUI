export type AnalysisId = string
export type AnalysisState = 'queued' | 'processing' | 'completed' | 'failed'

export interface AnalysisOptions {
  k_clusters?: number
  umap_n_neighbors?: number
  umap_min_dist?: number
  granulate?: boolean
  granulate_max_rows?: number
  granulate_return_items?: boolean
  label_internal_nodes?: boolean
}

export type AnalysisInputType = 'text' | 'csv'

export interface CreateAnalysisRequest {
  inputType: AnalysisInputType
  text?: string
  file?: File
  options?: AnalysisOptions
}

export interface CreateAnalysisResponse {
  analysis_id: AnalysisId
  status: 'queued' | 'processing'
  created_at: string
  tabs: {
    overview: string
    map: string
    clusters: string
    granulate: string
    hierarchy: string
    status: string
  }
}

export interface AnalysisStatusResponse {
  analysis_id: AnalysisId
  status: AnalysisState
  progress: {
    stage:
      | 'queued'
      | 'embeddings'
      | 'hierarchy'
      | 'clusters'
      | 'umap'
      | 'labeling'
      | 'granulate'
      | 'overview'
      | 'completed'
      | 'failed'
    pct: number
  }
  error: string | null
}

export interface OverviewResponse {
  counts: {
    items: number
    clusters: number
    aspects: number
  }
  top_clusters: Array<{
    cluster_id: number
    label: string
    size: number
    top_terms: string[]
    representatives: Array<{ id: string; preview: string }>
  }>
  top_aspects: Array<{ aspect: string; count: number }>
  timing: Record<string, number>
}

export interface MapResponse {
  points: Array<{
    id: string
    x: number
    y: number
    cluster_id: number
    preview: string
  }>
  clusters: Array<{
    cluster_id: number
    label: string
    size: number
    top_terms: string[]
    representatives: Array<{ id: string; preview: string }>
  }>
}

export interface ClustersResponse {
  clusters: Array<{
    cluster_id: number
    label: string
    size: number
    top_terms: string[]
    representatives: Array<{ id: string; preview: string }>
  }>
}

export interface GranulateUnit {
  aspect: string
  excerpt: string
  evidence: string[]
  sentiment: 'positive' | 'neutral' | 'negative'
  sentiment_score: number
  sentiment_raw: number
  similarity: number
  lexical_overlap: number
  confidence: number
  confidence_margin: number
  debug_top_aspects: Array<{ aspect: string; confidence: number }>
}

export interface GranulateSingleTextResponse {
  text: string
  units: string[]
  granules: GranulateUnit[]
  taxonomy: string[]
  detected_taxonomy?: string
  taxonomy_candidates?: Array<{ taxonomy: string; score: number }>
  detection_margin?: number | null
  aspect_summary: Record<
    string,
    {
      count: number
      avg_sentiment: number
      avg_sentiment_score: number
      avg_sentiment_raw: number
      top_evidence: string[]
    }
  >
  highlights: Array<{
    aspect: string
    excerpt: string
    evidence: string[]
    sentiment: 'positive' | 'neutral' | 'negative'
    sentiment_score: number
    sentiment_raw: number
    similarity: number
    confidence: number
    lexical_overlap: number
    confidence_margin: number
    highlight_score: number
    impact_score: number
    debug_top_aspects: Array<{ aspect: string; confidence: number }>
  }>
}

export interface AnalysisGranulateResponse {
  mode: 'text' | 'csv'
  aggregate_aspect_summary: Array<{ aspect: string; count: number }>
  items_included: number
  items_total: number
  items: Array<{
    id: string
    preview: string
    result: GranulateSingleTextResponse
  }>
}

export interface HierarchyNode {
  node_id: string
  parent_id: string | null
  children_ids: string[]
  size: number
  height: number
  label: string
}

export interface HierarchyResponse {
  root_id: string
  nodes: Record<string, HierarchyNode>
  leaves: Array<{
    id: string
    node_id: string
    cluster_id: number
  }>
}

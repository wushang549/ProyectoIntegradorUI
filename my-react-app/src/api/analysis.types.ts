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
    insights: string
    status: string
  }
}

export interface RecentAnalysisResponse {
  analysis_id: AnalysisId
  status: AnalysisState
  created_at: string
  item_count: number
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
    stage_label?: string
    message?: string
    current?: number
    total?: number
    stage_pct?: number
    elapsed_sec?: number
  }
  error: string | null
}

export interface AnalysisRepresentative {
  id: string
  preview: string
  metadata?: Record<string, string | number | boolean | null>
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
    representatives: AnalysisRepresentative[]
  }>
  top_aspects: Array<{ aspect: string; count: number }>
  timing: Record<string, number>
}

export interface InsightsResponse {
  key_findings: string[]
  theme_summary: Array<{
    label: string
    size: number
    top_terms: string[]
    examples: string[]
  }>
  quality_warnings: string[]
}

export interface MapPoint {
  id: string
  x: number
  y: number
  x_raw: number
  y_raw: number
  cluster_id: number
  cluster_label: string
  preview: string
  metadata?: Record<string, string | number | boolean | null>
}

export interface MapResponse {
  points: MapPoint[]
  clusters: Array<{
    cluster_id: number
    label: string
    size: number
    top_terms: string[]
    representatives: AnalysisRepresentative[]
  }>
  advanced: {
    umap_scaled: boolean
    scale_clamp: number
  }
}

export interface ClustersResponse {
  clusters: Array<{
    cluster_id: number
    label: string
    size: number
    top_terms: string[]
    representatives: AnalysisRepresentative[]
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

export interface GranulateClusterAggregate {
  cluster_id: number
  cluster_label: string
  items_included: number
  items_total: number
  aggregate_aspect_summary: GranulateAspectAggregate[]
}

export interface GranulateAspectAggregate {
  aspect: string
  count: number
  avg_sentiment?: number
  avg_sentiment_score?: number
  avg_sentiment_raw?: number
  positive_count?: number
  negative_count?: number
  neutral_count?: number
  positive?: number
  negative?: number
  neutral?: number
  direction?: 'positive' | 'neutral' | 'negative'
  direction_score?: number
  top_evidence?: string[]
}

export interface AnalysisGranulateResponse {
  mode: 'text' | 'csv'
  aggregate_aspect_summary?: GranulateAspectAggregate[]
  per_cluster_aggregate?: GranulateClusterAggregate[]
  items_included: number
  items_total: number
  item_ids_included?: string[]
  items?: Array<{
    id: string
    preview: string
    metadata?: Record<string, string | number | boolean | null>
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
  cohesion: number
  similarity: number
  descendant_leaf_count: number
  dominant_cluster_id: number | null
  dominant_cluster_share: number
  summary: string
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

export interface HierarchyLabelsResponse {
  labels: Record<string, string>
  updated: number
}

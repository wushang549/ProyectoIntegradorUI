export type Theme = {
  name: string
  count: number
}

export type Cluster = {
  title: string
  count: number
  keywords: string[]
  examples: string[]
}

export type AnalysisResults = {
  themes: Theme[]
  clusters: Cluster[]
}

export type Granularity = 'broad' | 'balanced' | 'detailed'
export type LoadingStep = 'extracting' | 'building' | 'grouping'
export type InputTab = 'paste' | 'upload'

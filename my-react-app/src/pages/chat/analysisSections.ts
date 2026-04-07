export const ANALYSIS_SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'themes', label: 'Themes' },
  { id: 'map', label: 'Map' },
  { id: 'tree', label: 'Theme tree' },
  { id: 'chat', label: 'Chat' },
] as const

export type AnalysisSectionId = (typeof ANALYSIS_SECTIONS)[number]['id']

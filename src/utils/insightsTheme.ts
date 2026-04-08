export type SentimentTone = 'positive' | 'neutral' | 'negative'

const CLUSTER_PALETTE = [
  '#2563eb',
  '#0f766e',
  '#7c3aed',
  '#b45309',
  '#15803d',
  '#be123c',
  '#0e7490',
  '#6d28d9',
  '#1f2937',
  '#c2410c',
]

type ClusterStyle = {
  accent: string
  soft: string
  border: string
}

function clampByte(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)))
}

function hexToRgb(hex: string) {
  const normalized = hex.replace('#', '')
  const pair =
    normalized.length === 3
      ? normalized
          .split('')
          .map((char) => `${char}${char}`)
          .join('')
      : normalized
  const int = Number.parseInt(pair, 16)

  if (!Number.isFinite(int)) {
    return { r: 100, g: 116, b: 139 }
  }

  return {
    r: (int >> 16) & 255,
    g: (int >> 8) & 255,
    b: int & 255,
  }
}

function rgbaFromHex(hex: string, alpha: number) {
  const rgb = hexToRgb(hex)
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`
}

function mixWithWhite(hex: string, ratio: number) {
  const rgb = hexToRgb(hex)
  const clamped = Math.max(0, Math.min(1, ratio))
  const r = clampByte(rgb.r + (255 - rgb.r) * clamped)
  const g = clampByte(rgb.g + (255 - rgb.g) * clamped)
  const b = clampByte(rgb.b + (255 - rgb.b) * clamped)
  return `rgb(${r}, ${g}, ${b})`
}

export function getClusterColor(clusterId: number | null | undefined) {
  if (clusterId === null || clusterId === undefined || !Number.isFinite(clusterId)) {
    return '#475569'
  }
  return CLUSTER_PALETTE[Math.abs(clusterId) % CLUSTER_PALETTE.length]
}

export function getClusterStyle(clusterId: number | null | undefined): ClusterStyle {
  const accent = getClusterColor(clusterId)
  return {
    accent,
    soft: rgbaFromHex(accent, 0.12),
    border: rgbaFromHex(accent, 0.42),
  }
}

export function getClusterLinkColor(clusterId: number | null | undefined) {
  return rgbaFromHex(getClusterColor(clusterId), 0.58)
}

export function getClusterNodeFill(clusterId: number | null | undefined) {
  return rgbaFromHex(getClusterColor(clusterId), 0.2)
}

export function getClusterNodeStroke(clusterId: number | null | undefined) {
  return mixWithWhite(getClusterColor(clusterId), 0.08)
}

export function getSentimentTone(value: string | undefined): SentimentTone {
  if (!value) return 'neutral'
  const normalized = value.toLowerCase().trim()
  if (normalized === 'positive') return 'positive'
  if (normalized === 'negative') return 'negative'
  return 'neutral'
}

export function getSentimentColor(tone: SentimentTone) {
  if (tone === 'positive') return '#15803d'
  if (tone === 'negative') return '#b91c1c'
  return '#475569'
}

export function isGenericThemeLabel(value: string | undefined) {
  if (!value) return true
  const normalized = value.trim().toLowerCase()
  if (!normalized) return true
  return /^(item|items|topic|topics|node|cluster|theme)\b/.test(normalized)
}

export function humanThemeLabel(label: string | undefined, fallbackSize?: number) {
  if (!isGenericThemeLabel(label)) {
    return label ?? 'Theme'
  }
  if (typeof fallbackSize === 'number' && Number.isFinite(fallbackSize)) {
    return `Theme (n=${fallbackSize})`
  }
  return 'Theme'
}

function truncateMetadataText(value: string, maxLength = 120) {
  if (value.length <= maxLength) return value
  return `${value.slice(0, maxLength - 3)}...`
}

export function formatMetadataValue(value: unknown, depth = 0): string {
  if (value === null || value === undefined) return ''

  if (typeof value === 'string') {
    return value.trim()
  }

  if (
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'bigint'
  ) {
    return String(value)
  }

  if (Array.isArray(value)) {
    const parts = value.map((item) => formatMetadataValue(item, depth + 1)).filter(Boolean)
    if (parts.length === 0) return ''

    const preview = parts.slice(0, 3).join(', ')
    return truncateMetadataText(parts.length > 3 ? `${preview}, +${parts.length - 3} more` : preview)
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .map(([key, nestedValue]) => {
        const formatted = formatMetadataValue(nestedValue, depth + 1)
        return formatted ? `${key}: ${formatted}` : ''
      })
      .filter(Boolean)

    if (entries.length > 0) {
      const preview = entries.slice(0, depth > 0 ? 1 : 2).join(' | ')
      const suffix = entries.length > (depth > 0 ? 1 : 2) ? ` | +${entries.length - (depth > 0 ? 1 : 2)} more` : ''
      return truncateMetadataText(`${preview}${suffix}`)
    }

    try {
      return truncateMetadataText(JSON.stringify(value))
    } catch {
      return 'Structured value'
    }
  }

  return String(value)
}

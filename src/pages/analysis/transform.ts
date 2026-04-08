import type { AnalysisResults } from './types'

/*
Backend response shape (granulate):
{
  text: string
  units: string[]
  granules: {
    aspect: string
    excerpt: string
    evidence: string[]
    sentiment: string
    sentiment_score: number
    similarity: number
  }[]
  taxonomy: string[]
}
*/

type GranulateResponse = {
  text: string
  units: string[]
  granules: {
    aspect: string
    excerpt: string
    evidence: string[]
    sentiment: string
    sentiment_score: number
    similarity: number
  }[]
  taxonomy: string[]
}

function normalizeText(s: string) {
  return s
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function dedupeByText(items: string[]) {
  const seen = new Set<string>()
  return items.filter((t) => {
    const key = normalizeText(t)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function toAnalysisResults(resp: GranulateResponse): AnalysisResults {
  const clustersMap = new Map<
    string,
    {
      title: string
      examples: string[]
      keywords: string[]
    }
  >()

  for (const g of resp.granules) {
    const key = g.aspect

    if (!clustersMap.has(key)) {
      clustersMap.set(key, {
        title: key,
        examples: [],
        keywords: [],
      })
    }

    const cluster = clustersMap.get(key)!
    cluster.examples.push(g.excerpt)
    cluster.keywords.push(...g.evidence)
  }

  const clusters = Array.from(clustersMap.values()).map((c) => {
    const examples = dedupeByText(c.examples).slice(0, 3)

    const keywords = Array.from(
      new Set(c.keywords.map((k) => k.toLowerCase()))
    ).slice(0, 8)

    return {
      title: c.title,
      count: examples.length,
      examples,
      keywords,
    }
  })

  const themes = clusters.map((c) => ({
    name: c.title,
    count: c.count,
  }))

  return {
    themes,
    clusters,
  }
}

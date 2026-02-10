export async function granulateRequest(text: string, minSimilarity: number) {
  const res = await fetch('/v1/granulate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      top_k_evidence: 6,
      min_similarity: minSimilarity,
    }),
  })

  if (!res.ok) {
    let msg = `${res.status} ${res.statusText}`
    try {
      const data = await res.json()
      if (data?.detail) msg = String(data.detail)
    } catch {}
    throw new Error(msg)
  }

  return res.json()
}
export type GranulateResponse = {
  text: string
  units: string[]
  taxonomy: string[]
  granules: Array<{
    aspect: string
    excerpt: string
    evidence: string[]
    sentiment: 'positive' | 'neutral' | 'negative'
    sentiment_score: number
    similarity: number
  }>
}

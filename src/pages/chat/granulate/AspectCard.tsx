import { memo } from 'react'
import type { AspectSummary } from '../chat'

type AspectCardProps = {
  summary: AspectSummary
  summaryExpanded: boolean
  onToggleExpand: () => void
  formatAspectLabel: (aspect: string) => string
}

function sentimentClass(label: string) {
  const normalized = label.toLowerCase()
  if (normalized.includes('positive')) return 'positive'
  if (normalized.includes('negative')) return 'negative'
  return 'neutral'
}

function AspectCard({
  summary,
  summaryExpanded,
  onToggleExpand,
  formatAspectLabel,
}: AspectCardProps) {
  const visibleEvidence = summaryExpanded ? summary.topEvidence : summary.topEvidence.slice(0, 3)
  const hiddenCount = Math.max(summary.topEvidence.length - 3, 0)
  const sentimentTone = sentimentClass(summary.avgSentimentLabel)

  return (
    <article className="chat-aspect-card gr-card gr-card--subtle">
      <header className="chat-aspect-card-head">
        <div className="chat-aspect-card-title-wrap">
          <span className="chat-aspect-card-title">{formatAspectLabel(summary.aspect)}</span>
          <span className={`chat-sentiment-pill chat-sentiment-pill--${sentimentTone}`}>
            {summary.avgSentimentLabel}
          </span>
        </div>
        <strong className="chat-aspect-card-count">{summary.count}</strong>
      </header>

      <div className="chat-chip-row">
        {visibleEvidence.map((chip, chipIndex) => (
          <span key={`${summary.aspect}-${chip}-${chipIndex}`} className="chat-chip">
            {chip}
          </span>
        ))}
        {summary.topEvidence.length > 3 && (
          <button
            type="button"
            className="chat-chip chat-chip--muted chat-chip-button"
            onClick={onToggleExpand}
            aria-expanded={summaryExpanded}
          >
            {summaryExpanded ? 'Show less' : `+${hiddenCount}`}
          </button>
        )}
      </div>
    </article>
  )
}

export default memo(AspectCard)

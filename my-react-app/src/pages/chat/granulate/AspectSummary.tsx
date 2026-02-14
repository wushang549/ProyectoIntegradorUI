import { memo } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import type { AspectSummary as AspectSummaryItem } from '../chat'
import AspectCard from './AspectCard'

type AspectSummaryProps = {
  visibleAspectSummaries: AspectSummaryItem[]
  expandedSummaryEvidence: Record<string, boolean>
  setExpandedSummaryEvidence: Dispatch<SetStateAction<Record<string, boolean>>>
  formatAspectLabel: (aspect: string) => string
}

function AspectSummary({
  visibleAspectSummaries,
  expandedSummaryEvidence,
  setExpandedSummaryEvidence,
  formatAspectLabel,
}: AspectSummaryProps) {
  return (
    <section className="gr-card chat-summary-panel">
      <header className="chat-gr-section-head">
        <h4 className="chat-gr-section-title">Aspect summary</h4>
      </header>

      <div className="chat-aspect-summary-grid">
        {visibleAspectSummaries.length === 0 && (
          <p className="chat-muted-text">No aspect summaries available.</p>
        )}

        {visibleAspectSummaries.map((summary) => (
          <AspectCard
            key={summary.aspect}
            summary={summary}
            summaryExpanded={Boolean(expandedSummaryEvidence[summary.aspect])}
            onToggleExpand={() =>
              setExpandedSummaryEvidence((prev) => ({
                ...prev,
                [summary.aspect]: !prev[summary.aspect],
              }))
            }
            formatAspectLabel={formatAspectLabel}
          />
        ))}
      </div>
    </section>
  )
}

export default memo(AspectSummary)

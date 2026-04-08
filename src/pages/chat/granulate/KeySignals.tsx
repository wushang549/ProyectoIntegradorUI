import { memo } from 'react'
import type { GranulateGranule, SentimentValue } from '../chat'

type KeySignalsProps = {
  highlightedGranules: GranulateGranule[]
  jumpToAspect: (aspect: string) => void
  normalizeSentiment: (value: string | undefined) => SentimentValue
  formatAspectLabel: (aspect: string) => string
}

function KeySignals({
  highlightedGranules,
  jumpToAspect,
  normalizeSentiment,
  formatAspectLabel,
}: KeySignalsProps) {
  return (
    <aside className="gr-card chat-signals-panel">
      <header className="chat-signals-head">
        <h4 className="chat-gr-section-title">Key signals</h4>
        <span className="chat-signals-count">{highlightedGranules.length}</span>
      </header>

      <div className="chat-signals-list">
        {highlightedGranules.length === 0 && (
          <div className="chat-signals-empty">
            <p className="chat-muted-text">Run analysis to populate key signals.</p>
          </div>
        )}

        {highlightedGranules.map((highlight, index) => (
          <button
            key={`${highlight.aspect}-${index}-${highlight.excerpt ?? ''}`}
            type="button"
            className="chat-signal-row"
            onClick={() => jumpToAspect(highlight.aspect?.trim() || 'Uncategorized')}
          >
            <span
              className={`chat-sentiment-dot chat-sentiment-dot--${normalizeSentiment(highlight.sentiment)}`}
              aria-hidden
            />
            <span className="chat-signal-excerpt-wrap">
              <span className="chat-signal-excerpt">{highlight.excerpt ?? ''}</span>
              <span className="chat-signal-jump">Jump to aspect</span>
            </span>
            <span className="chat-signal-tag">
              {formatAspectLabel(highlight.aspect?.trim() || 'Uncategorized')}
            </span>
          </button>
        ))}
      </div>
    </aside>
  )
}

export default memo(KeySignals)

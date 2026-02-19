import { useMemo, useState } from 'react'
import type { AnalysisGranulateResponse } from '../api/analysis.types'
import ApiState from '../components/common/ApiState'

type GranulateTabProps = {
  data: AnalysisGranulateResponse | null
  isLoading: boolean
  error?: string
  isLoadingItems: boolean
  onRetry: () => void
  onLoadItems: () => void
}

export default function GranulateTab({
  data,
  isLoading,
  error,
  isLoadingItems,
  onRetry,
  onLoadItems,
}: GranulateTabProps) {
  const [selectedAspect, setSelectedAspect] = useState<string | null>(null)

  const sortedAspects = useMemo(() => {
    if (!data) return []
    return [...data.aggregate_aspect_summary].sort((a, b) => b.count - a.count)
  }, [data])

  const filteredItems = useMemo(() => {
    if (!data) return []
    if (!selectedAspect) return data.items
    return data.items.filter((item) => {
      return Object.prototype.hasOwnProperty.call(item.result.aspect_summary, selectedAspect)
    })
  }, [data, selectedAspect])

  const hasItemDetails = Boolean(data && data.items.length > 0)

  return (
    <ApiState
      isLoading={isLoading}
      error={error}
      onRetry={onRetry}
      isEmpty={!data}
      emptyMessage="No granulate summary available."
    >
      {data && (
        <div className="chat-result-panel">
          <h3 className="chat-result-title">Granulate</h3>

          <div className="chat-stats-grid">
            <div className="chat-stat-card">
              <span className="chat-stat-key">Mode</span>
              <span className="chat-stat-value">{data.mode}</span>
            </div>
            <div className="chat-stat-card">
              <span className="chat-stat-key">Items included</span>
              <span className="chat-stat-value">{data.items_included}</span>
            </div>
            <div className="chat-stat-card">
              <span className="chat-stat-key">Items total</span>
              <span className="chat-stat-value">{data.items_total}</span>
            </div>
          </div>

          <h4 className="chat-result-subtitle">Aggregate aspects</h4>
          <div className="chat-chip-row">
            {sortedAspects.length === 0 && <p className="chat-muted-text">No aggregate aspects.</p>}
            {sortedAspects.map((aspect) => {
              const isActive = selectedAspect === aspect.aspect
              return (
                <button
                  key={aspect.aspect}
                  type="button"
                  className={`chat-chip chat-chip-button ${isActive ? 'chat-chip--active' : ''}`}
                  onClick={() => setSelectedAspect(isActive ? null : aspect.aspect)}
                >
                  {aspect.aspect} ({aspect.count})
                </button>
              )
            })}
          </div>

          <div className="chat-granulate-actions">
            <button
              type="button"
              className="chat-plain-btn"
              onClick={onLoadItems}
              disabled={isLoadingItems}
            >
              {isLoadingItems
                ? 'Loading item-level...'
                : hasItemDetails
                  ? 'Refresh item-level'
                  : 'Load item-level'}
            </button>
          </div>

          {hasItemDetails ? (
            <div className="chat-list-grid chat-granulate-items">
              {filteredItems.length === 0 && (
                <p className="chat-muted-text">No items match the selected aspect.</p>
              )}
              {filteredItems.slice(0, 120).map((item) => (
                <article key={item.id} className="chat-granulate-item-card">
                  <p className="chat-muted-text">
                    <strong>{item.id}</strong> - <span className="chat-ellipsis-text">{item.preview}</span>
                  </p>
                  <div className="chat-chip-row">
                    {Object.entries(item.result.aspect_summary)
                      .sort((a, b) => b[1].count - a[1].count)
                      .slice(0, 8)
                      .map(([aspectName, summary]) => (
                        <span key={`${item.id}-${aspectName}`} className="chat-chip">
                          {aspectName} ({summary.count})
                        </span>
                      ))}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="chat-muted-text">Item-level granules are not loaded yet.</p>
          )}
        </div>
      )}
    </ApiState>
  )
}

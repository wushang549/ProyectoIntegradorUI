import type { HierarchyInspection } from './Dendrogram'

type HierarchyLegendProps = {
  inspection: HierarchyInspection | null
  selectedClusterId: number | null
  selectedPointId: string | null
  onClearFilters: () => void
}

export default function HierarchyLegend({
  inspection,
  selectedClusterId,
  selectedPointId,
  onClearFilters,
}: HierarchyLegendProps) {
  return (
    <section className="chat-result-panel chat-hierarchy-legend">
      <h4 className="chat-result-subtitle">Hierarchy details</h4>

      <div className="chat-list-grid">
        <div className="chat-stat-card">
          <span className="chat-stat-key">Selected cluster</span>
          <span className="chat-stat-value">
            {selectedClusterId === null ? 'None' : `Cluster ${selectedClusterId}`}
          </span>
        </div>
        <div className="chat-stat-card">
          <span className="chat-stat-key">Selected point</span>
          <span className="chat-stat-value">{selectedPointId ?? 'None'}</span>
        </div>
      </div>

      {inspection ? (
        <div className="chat-hierarchy-inspection">
          <p className="chat-muted-text">
            <strong>Node:</strong> {inspection.label}
          </p>
          <p className="chat-muted-text">
            <strong>Size:</strong> {inspection.size}
          </p>
          <p className="chat-muted-text">
            <strong>Height:</strong> {inspection.height.toFixed(4)}
          </p>
          <p className="chat-muted-text">
            <strong>Descendant leaves:</strong> {inspection.descendantLeafCount}
          </p>
          <p className="chat-muted-text">
            <strong>Dominant cluster:</strong>{' '}
            {inspection.dominantClusterId === null ? 'N/A' : `Cluster ${inspection.dominantClusterId}`}
          </p>
        </div>
      ) : (
        <p className="chat-muted-text">Select a node to inspect it.</p>
      )}

      <button type="button" className="chat-plain-btn" onClick={onClearFilters}>
        Clear filters
      </button>
    </section>
  )
}

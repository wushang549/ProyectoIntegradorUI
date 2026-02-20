import { useState } from 'react'
import AdvancedSection from '../../../components/common/AdvancedSection'
import ExpandableText from '../../../components/common/ExpandableText'
import type { AnalysisSectionId } from '../analysisSections'

export type DrawerExampleItem = {
  key: string
  id?: string
  preview: string
  metadata?: Record<string, string | number | boolean | null>
  clusterId?: number | null
  nodeId?: string | null
  pointId?: string | null
}

export type SelectedEntityModel = {
  kind: 'cluster' | 'item' | 'node'
  title: string
  subtitle: string
  summary: string
  clusterId: number | null
  pointId: string | null
  nodeId: string | null
  topTerms: string[]
  stats: Array<{ label: string; value: string }>
  exampleItems: DrawerExampleItem[]
  advancedFields: Array<{ label: string; value: string }>
  actions: {
    viewItems: boolean
    showOnMap: boolean
    openTree: boolean
  }
}

type SelectionDetailsDrawerProps = {
  isOpen: boolean
  entity: SelectedEntityModel | null
  onClose: () => void
  onClearSelection: () => void
  onOpenSection: (sectionId: AnalysisSectionId) => void
  onSelectCluster: (clusterId: number | null) => void
  onSelectPoint: (pointId: string | null, clusterId?: number | null, nodeId?: string | null) => void
  onSelectNode?: (nodeId: string | null, clusterId?: number | null) => void
}

export default function SelectionDetailsDrawer({
  isOpen,
  entity,
  onClose,
  onClearSelection,
  onOpenSection,
  onSelectCluster,
  onSelectPoint,
  onSelectNode,
}: SelectionDetailsDrawerProps) {
  const [expandedExamples, setExpandedExamples] = useState<Record<string, boolean>>({})

  if (!entity) {
    return null
  }

  const toggleExample = (key: string) => {
    setExpandedExamples((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  const runViewItems = () => {
    if (entity.clusterId === null) return
    onSelectCluster(entity.clusterId)
    onOpenSection('themes')
  }

  const runShowOnMap = () => {
    if (entity.pointId) {
      onSelectPoint(entity.pointId, entity.clusterId, entity.nodeId)
    } else if (entity.clusterId !== null) {
      onSelectCluster(entity.clusterId)
    }
    onOpenSection('map')
  }

  const runOpenTree = () => {
    if (entity.nodeId && onSelectNode) {
      onSelectNode(entity.nodeId, entity.clusterId ?? undefined)
    } else if (entity.clusterId !== null) {
      onSelectCluster(entity.clusterId)
    }
    onOpenSection('tree')
  }

  return (
    <aside
      className={`chat-details-drawer ${isOpen ? 'chat-details-drawer--open' : 'chat-details-drawer--collapsed'}`}
      aria-label="Selection details"
      aria-hidden={!isOpen}
    >
      <div className="chat-details-head">
        <div>
          <p className="chat-drawer-eyebrow">Selection details</p>
          <h3 className="chat-card-title">{entity.title}</h3>
          <p className="chat-muted-text">{entity.subtitle}</p>
        </div>
        <button type="button" className="chat-plain-btn" onClick={onClose}>
          Close
        </button>
      </div>

      <p className="chat-muted-text">{entity.summary}</p>

      {entity.stats.length > 0 && (
        <div className="chat-detail-stats">
          {entity.stats.map((stat) => (
            <article key={`${entity.kind}-${stat.label}`} className="chat-detail-stat">
              <span className="chat-stat-key">{stat.label}</span>
              <span className="chat-stat-value">{stat.value}</span>
            </article>
          ))}
        </div>
      )}

      {entity.topTerms.length > 0 && (
        <section className="chat-drawer-section">
          <h4 className="chat-card-title">Top terms</h4>
          <div className="chat-chip-row">
            {entity.topTerms.slice(0, 8).map((term) => (
              <span key={`${entity.title}-${term}`} className="chat-chip">
                {term}
              </span>
            ))}
          </div>
        </section>
      )}

      <section className="chat-drawer-section">
        <h4 className="chat-card-title">Example calls</h4>
        {entity.exampleItems.length === 0 && (
          <p className="chat-muted-text">No examples are available for this selection.</p>
        )}

        <div className="chat-list-grid">
          {entity.exampleItems.map((item) => {
            const metadataRows = Object.entries(item.metadata ?? {})
              .filter(([, value]) => value !== null && value !== undefined && String(value).trim().length > 0)
              .slice(0, 3)

            return (
              <div
                key={item.key}
                className={`chat-list-item chat-list-item--small ${item.pointId ? 'chat-list-item--clickable' : ''}`}
                role={item.pointId ? 'button' : undefined}
                tabIndex={item.pointId ? 0 : -1}
                onClick={() => {
                  if (!item.pointId) return
                  onSelectPoint(item.pointId, item.clusterId, item.nodeId)
                }}
                onKeyDown={(event) => {
                  if (!item.pointId) return
                  if (event.key !== 'Enter' && event.key !== ' ') return
                  event.preventDefault()
                  onSelectPoint(item.pointId, item.clusterId, item.nodeId)
                }}
              >
                <ExpandableText
                  text={item.preview}
                  expanded={Boolean(expandedExamples[item.key])}
                  onToggle={() => toggleExample(item.key)}
                />
                {metadataRows.length > 0 && (
                  <div className="chat-drawer-example-meta">
                    {metadataRows.map(([key, value]) => (
                      <span key={`${item.key}-${key}`}>{key}: {String(value)}</span>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      <div className="chat-drawer-actions">
        <button
          type="button"
          className="chat-plain-btn"
          disabled={!entity.actions.viewItems || entity.clusterId === null}
          onClick={runViewItems}
        >
          View items
        </button>
        <button
          type="button"
          className="chat-plain-btn"
          disabled={!entity.actions.showOnMap}
          onClick={runShowOnMap}
        >
          Show on map
        </button>
        <button
          type="button"
          className="chat-plain-btn"
          disabled={!entity.actions.openTree}
          onClick={runOpenTree}
        >
          Open in theme tree
        </button>
      </div>

      <div className="chat-drawer-actions">
        <button type="button" className="chat-plain-btn" onClick={onClearSelection}>
          Clear selection
        </button>
      </div>

      <AdvancedSection title="Advanced">
        <div className="chat-list-grid">
          {entity.advancedFields.map((field) => (
            <article key={`${field.label}-${field.value}`} className="chat-stat-card">
              <span className="chat-stat-key">{field.label}</span>
              <span className="chat-stat-value">{field.value}</span>
            </article>
          ))}
        </div>
      </AdvancedSection>
    </aside>
  )
}

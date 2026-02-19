import { useState } from 'react'
import type { HierarchyResponse } from '../api/analysis.types'
import ApiState from '../components/common/ApiState'
import Dendrogram, { type HierarchyInspection } from '../components/hierarchy/Dendrogram'
import HierarchyLegend from '../components/hierarchy/HierarchyLegend'

type HierarchyTabProps = {
  data: HierarchyResponse | null
  selectedClusterId: number | null
  selectedPointId: string | null
  onSelectCluster: (clusterId: number | null) => void
  onSelectPoint: (pointId: string | null, clusterId?: number | null) => void
  onClearFilters: () => void
  isLoading: boolean
  error?: string
  onRetry: () => void
}

export default function HierarchyTab({
  data,
  selectedClusterId,
  selectedPointId,
  onSelectCluster,
  onSelectPoint,
  onClearFilters,
  isLoading,
  error,
  onRetry,
}: HierarchyTabProps) {
  const [inspection, setInspection] = useState<HierarchyInspection | null>(null)

  const isEmpty = !data || !data.root_id || Object.keys(data.nodes).length === 0

  return (
    <ApiState
      isLoading={isLoading}
      error={error}
      onRetry={onRetry}
      isEmpty={isEmpty}
      emptyMessage="No hierarchy available for this analysis."
    >
      {data && (
        <div className="chat-hierarchy-layout">
          <Dendrogram
            hierarchy={data}
            selectedClusterId={selectedClusterId}
            selectedPointId={selectedPointId}
            onSelectCluster={onSelectCluster}
            onSelectPoint={onSelectPoint}
            onInspectNode={setInspection}
          />

          <HierarchyLegend
            inspection={inspection}
            selectedClusterId={selectedClusterId}
            selectedPointId={selectedPointId}
            onClearFilters={onClearFilters}
          />
        </div>
      )}
    </ApiState>
  )
}

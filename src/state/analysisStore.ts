export type AnalysisSelectionState = {
  selectedClusterId: number | null
  selectedPointId: string | null
  selectedNodeId: string | null
}

export function createInitialAnalysisSelectionState(): AnalysisSelectionState {
  return {
    selectedClusterId: null,
    selectedPointId: null,
    selectedNodeId: null,
  }
}

export function withSelectedCluster(
  current: AnalysisSelectionState,
  clusterId: number | null
): AnalysisSelectionState {
  return {
    ...current,
    selectedClusterId: clusterId,
  }
}

export function withSelectedPoint(
  current: AnalysisSelectionState,
  pointId: string | null,
  clusterId?: number | null,
  nodeId?: string | null
): AnalysisSelectionState {
  return {
    ...current,
    selectedPointId: pointId,
    selectedNodeId: nodeId === undefined ? null : nodeId,
    selectedClusterId: clusterId ?? current.selectedClusterId,
  }
}

export function withSelectedNode(
  current: AnalysisSelectionState,
  nodeId: string | null,
  clusterId?: number | null
): AnalysisSelectionState {
  return {
    ...current,
    selectedNodeId: nodeId,
    selectedClusterId: clusterId ?? current.selectedClusterId,
  }
}

export function clearAnalysisSelection(current: AnalysisSelectionState): AnalysisSelectionState {
  if (
    current.selectedClusterId === null &&
    current.selectedPointId === null &&
    current.selectedNodeId === null
  ) {
    return current
  }

  return createInitialAnalysisSelectionState()
}

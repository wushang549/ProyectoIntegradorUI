export type AnalysisSelectionState = {
  selectedClusterId: number | null
  selectedPointId: string | null
}

export function createInitialAnalysisSelectionState(): AnalysisSelectionState {
  return {
    selectedClusterId: null,
    selectedPointId: null,
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
  clusterId?: number | null
): AnalysisSelectionState {
  return {
    ...current,
    selectedPointId: pointId,
    selectedClusterId: clusterId ?? current.selectedClusterId,
  }
}

export function clearAnalysisSelection(current: AnalysisSelectionState): AnalysisSelectionState {
  if (current.selectedClusterId === null && current.selectedPointId === null) {
    return current
  }

  return createInitialAnalysisSelectionState()
}

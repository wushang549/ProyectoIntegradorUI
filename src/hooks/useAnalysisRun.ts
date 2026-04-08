import { useCallback, useState } from 'react'
import { createAnalysis } from '../api/analysis.client'
import type { CreateAnalysisRequest } from '../api/analysis.types'
import { useAnalysisPolling } from './useAnalysisPolling'

type UseAnalysisRunOptions = {
  intervalMs?: number
  timeoutMs?: number
}

export function useAnalysisRun(options: UseAnalysisRunOptions = {}) {
  const [analysisId, setAnalysisId] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState('')
  const { status, setStatus, isPolling, pollUntilTerminal } = useAnalysisPolling(options)

  const startAnalysis = useCallback(
    async (payload: CreateAnalysisRequest) => {
      setError('')
      setIsCreating(true)
      setStatus(null)

      try {
        const created = await createAnalysis(payload)
        setAnalysisId(created.analysis_id)

        const terminalStatus = await pollUntilTerminal(created.analysis_id)
        if (terminalStatus.status === 'failed') {
          throw new Error(terminalStatus.error ?? 'Analysis failed.')
        }

        return created.analysis_id
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to run analysis.'
        setError(message)
        throw err
      } finally {
        setIsCreating(false)
      }
    },
    [pollUntilTerminal, setStatus]
  )

  const resetRun = useCallback(() => {
    setAnalysisId(null)
    setStatus(null)
    setError('')
  }, [setStatus])

  return {
    analysisId,
    status,
    isRunning: isCreating || isPolling,
    error,
    startAnalysis,
    resetRun,
  }
}

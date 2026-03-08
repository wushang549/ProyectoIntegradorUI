import { useCallback, useRef, useState } from 'react'
import { getAnalysisStatus, wait } from '../api/analysis.client'
import type { AnalysisStatusResponse } from '../api/analysis.types'

type UseAnalysisPollingOptions = {
  intervalMs?: number
  timeoutMs?: number
}

const DEFAULT_INTERVAL_MS = 1500
const DEFAULT_TIMEOUT_MS = 600000

export function useAnalysisPolling({
  intervalMs = DEFAULT_INTERVAL_MS,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}: UseAnalysisPollingOptions = {}) {
  const [status, setStatus] = useState<AnalysisStatusResponse | null>(null)
  const [isPolling, setIsPolling] = useState(false)
  const pollRunRef = useRef(0)

  const pollUntilTerminal = useCallback(
    async (analysisId: string) => {
      pollRunRef.current += 1
      const runId = pollRunRef.current
      const start = Date.now()
      setIsPolling(true)

      try {
        while (Date.now() - start < timeoutMs) {
          const nextStatus = await getAnalysisStatus(analysisId)

          if (runId !== pollRunRef.current) {
            throw new Error('Polling was superseded by a newer run.')
          }

          setStatus(nextStatus)

          if (nextStatus.status === 'completed' || nextStatus.status === 'failed') {
            return nextStatus
          }

          await wait(intervalMs)
        }
      } finally {
        if (runId === pollRunRef.current) {
          setIsPolling(false)
        }
      }

      throw new Error(`Analysis timed out after ${Math.round(timeoutMs / 1000)} seconds.`)
    },
    [intervalMs, timeoutMs]
  )

  return {
    status,
    setStatus,
    isPolling,
    pollUntilTerminal,
  }
}

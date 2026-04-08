import type { ReactNode } from 'react'

type ApiStateProps = {
  isLoading: boolean
  error?: string
  isEmpty?: boolean
  emptyMessage?: string
  loadingMessage?: string
  onRetry?: () => void
  children: ReactNode
}

export default function ApiState({
  isLoading,
  error,
  isEmpty = false,
  emptyMessage = 'No data available.',
  loadingMessage = 'Loading data...',
  onRetry,
  children,
}: ApiStateProps) {
  if (isLoading) {
    return (
      <div className="chat-state-card" role="status">
        <p className="chat-muted-text">{loadingMessage}</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="chat-state-card" role="alert">
        <p className="chat-file-error">{error}</p>
        {onRetry && (
          <button type="button" className="chat-plain-btn" onClick={onRetry}>
            Retry
          </button>
        )}
      </div>
    )
  }

  if (isEmpty) {
    return (
      <div className="chat-state-card">
        <p className="chat-muted-text">{emptyMessage}</p>
      </div>
    )
  }

  return <>{children}</>
}

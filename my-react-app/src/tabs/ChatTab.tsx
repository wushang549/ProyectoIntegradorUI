import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import type { AnalysisChatMessage } from '../api/analysis.types'
import SectionHeading from '../components/common/SectionHeading'

type ChatTabProps = {
  analysisId: string | null
  messages: AnalysisChatMessage[]
  isLoading: boolean
  isSending: boolean
  error?: string
  onSendMessage: (content: string) => void
}

const SUGGESTED_QUESTIONS = [
  'What are the main themes in this dataset?',
  'Which clusters are largest?',
  'What stands out in the hierarchy?',
] as const

export default function ChatTab({ analysisId, messages, isLoading, isSending, error, onSendMessage }: ChatTabProps) {
  const [draft, setDraft] = useState('')
  const endRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    setDraft('')
  }, [analysisId])

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [messages, isSending])

  const canSend = useMemo(() => {
    return Boolean(analysisId) && !isLoading && !isSending && draft.trim().length > 0
  }, [analysisId, draft, isLoading, isSending])

  const submit = () => {
    const trimmed = draft.trim()
    if (!trimmed || !analysisId || isLoading || isSending) return
    setDraft('')
    onSendMessage(trimmed)
  }

  const onComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      submit()
    }
  }

  return (
    <section className="chat-result-panel chat-section-panel chat-analysis-chat-panel">
      <SectionHeading
        title="Chat"
        subtitle="Ask questions about your dataset, themes, map, and hierarchy."
      />

      <div className="chat-analysis-chat-shell">
        <div className="chat-analysis-chat-thread" aria-live="polite">
          {messages.length === 0 && !isSending && (
            <div className="chat-analysis-chat-empty">
              <h3 className="chat-card-title">Start with a question</h3>
              <p className="chat-muted-text">
                Use the current analysis as context to explore patterns, themes, and notable outliers.
              </p>
              <div className="chat-analysis-chat-suggestions">
                {SUGGESTED_QUESTIONS.map((question) => (
                  <button
                    key={question}
                    type="button"
                    className="chat-analysis-chat-suggestion"
                    onClick={() => onSendMessage(question)}
                    disabled={!analysisId || isLoading || isSending}
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message, index) => (
            <article
              key={`${message.role}-${index}`}
              className={`chat-analysis-message chat-analysis-message--${message.role}`}
            >
              <div className="chat-analysis-message-meta">
                {message.role === 'user' ? 'You' : 'AI analyst'}
              </div>
              <div className="chat-analysis-message-bubble">
                <p>{message.content}</p>
              </div>
            </article>
          ))}

          {isSending && (
            <article className="chat-analysis-message chat-analysis-message--assistant">
              <div className="chat-analysis-message-meta">AI analyst</div>
              <div className="chat-analysis-message-bubble chat-analysis-message-bubble--pending">
                <p>Preparing an answer from the current analysis...</p>
              </div>
            </article>
          )}

          <div ref={endRef} />
        </div>

        {error && (
          <p className="chat-file-error" role="alert">
            {error}
          </p>
        )}

        <div className="chat-analysis-chat-composer">
          <textarea
            className="chat-analysis-chat-input"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={onComposerKeyDown}
            placeholder="Ask about your data and analysis results"
            rows={3}
            disabled={!analysisId || isLoading || isSending}
            aria-label="Ask a question about the analysis"
          />
          <div className="chat-analysis-chat-composer-actions">
            <p className="chat-analysis-chat-composer-hint">Enter to send, Shift + Enter for a new line.</p>
            <button type="button" className="chat-primary-btn" onClick={submit} disabled={!canSend}>
              Send
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

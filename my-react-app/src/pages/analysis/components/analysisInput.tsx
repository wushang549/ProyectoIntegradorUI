import { FileText } from 'lucide-react'
import './AnalysisInput.css'

type Props = {
  inputText: string
  error: string
  onTextChange: (value: string) => void
  onClearError: () => void
}

export default function AnalysisInput({ inputText, error, onTextChange, onClearError }: Props) {
  return (
    <section className="ap-card">
      <div className="ap-card-head">
        <div className="ap-card-head-left">
          <FileText size={16} />
          <h2 className="ap-card-title">Input</h2>
        </div>
      </div>

      <div className="ap-card-body">
        <textarea
          className="ap-textarea"
          placeholder="Paste reviews, comments, or any text you want to analyze…"
          value={inputText}
          onChange={(e) => {
            onTextChange(e.target.value)
            onClearError()
          }}
        />

        <div className="ap-help-row">
          <p className="ap-help">Tip: 20–5,000 words works best.</p>
          {error && <p className="ap-error">{error}</p>}
        </div>
      </div>
    </section>
  )
}

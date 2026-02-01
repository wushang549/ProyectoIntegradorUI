import { Layers, Loader2, Play, RotateCcw } from 'lucide-react'
import './AnalysisHeader.css'

type Props = {
  isLoading: boolean
  onReset: () => void
  onRun: () => void
}

export default function AnalysisHeader({ isLoading, onReset, onRun }: Props) {
  return (
    <header className="ap-header">
      <div className="ap-header-inner">
        <div className="ap-brand">
          <a href="/" className="ap-brand-link">
            <div className="ap-logo">
              <Layers size={18} />
            </div>
            <span className="ap-brand-name">Hashtree</span>
          </a>

          <div className="ap-divider" />

          <div className="ap-title-wrap">
            <h1 className="ap-page-title">New analysis</h1>
            <p className="ap-page-subtitle">
              Paste text or upload a file. We’ll group themes automatically.
            </p>
          </div>
        </div>

        <div className="ap-actions">
          <button type="button" className="ap-btn ap-btn-ghost" onClick={onReset}>
            <RotateCcw size={16} />
            Reset
          </button>

          <button
            type="button"
            className="ap-btn ap-btn-primary"
            onClick={onRun}
            disabled={isLoading}
          >
            {isLoading ? <Loader2 size={16} className="ap-spin" /> : <Play size={16} />}
            Run analysis
          </button>
        </div>
      </div>
    </header>
  )
}

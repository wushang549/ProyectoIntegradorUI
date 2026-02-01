import { Layers } from 'lucide-react'
import type { Granularity } from '../types'
import './RunSettings.css'

type Props = {
  granularity: Granularity
  granularityLevel: number
  onGranularityChange: (g: Granularity) => void
  onGranularityLevelChange: (level: number) => void
}

export default function RunSettings({
  granularity,
  granularityLevel,
  onGranularityChange,
  onGranularityLevelChange,
}: Props) {
  return (
    <section className="ap-card">
      <div className="ap-card-head">
        <div className="ap-card-head-left">
          <Layers size={16} />
          <h2 className="ap-card-title">Run settings</h2>
        </div>
      </div>

      <div className="ap-card-body">
        <p className="ap-label">Granularity</p>

        <div className="ap-seg">
          {(['broad', 'balanced', 'detailed'] as Granularity[]).map((g) => (
            <button
              key={g}
              type="button"
              className={`ap-seg-btn ${granularity === g ? 'active' : ''}`}
              onClick={() => {
                onGranularityChange(g)
                onGranularityLevelChange(g === 'broad' ? 2 : g === 'detailed' ? 4 : 3)
              }}
            >
              {g.charAt(0).toUpperCase() + g.slice(1)}
            </button>
          ))}
        </div>

        <input
          type="range"
          min={1}
          max={5}
          step={1}
          value={granularityLevel}
          onChange={(e) => onGranularityLevelChange(Number(e.target.value))}
          className="ap-range"
        />
      </div>
    </section>
  )
}

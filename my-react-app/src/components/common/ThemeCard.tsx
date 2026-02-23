import { useState, type KeyboardEvent, type ReactNode } from 'react'
import ExpandableText from './ExpandableText'
import { getClusterStyle } from '../../utils/insightsTheme'

export type ThemeCardExample = {
  id: string
  text: string
  onClick?: () => void
  onKeyDown?: (event: KeyboardEvent<HTMLDivElement>) => void
}

type ThemeCardProps = {
  title: string
  calls: number
  clusterId: number | null
  isActive: boolean
  topTerms: string[]
  examples: ThemeCardExample[]
  subtitle?: string
  actions?: ReactNode
}

export default function ThemeCard({
  title,
  calls,
  clusterId,
  isActive,
  topTerms,
  examples,
  subtitle,
  actions,
}: ThemeCardProps) {
  const style = getClusterStyle(clusterId)
  const [expandedExampleKeys, setExpandedExampleKeys] = useState<Record<string, boolean>>({})

  return (
    <article
      className={`chat-theme-card ${isActive ? 'chat-theme-card--active' : ''}`}
      style={{ borderColor: isActive ? style.border : undefined }}
    >
      <div className="chat-theme-card-head">
        <div>
          <p className="chat-card-title">{title}</p>
          {subtitle && <p className="chat-muted-text">{subtitle}</p>}
        </div>
        <strong className="chat-theme-size chat-theme-size--fixed" style={{ color: style.accent }}>
          {calls} calls
        </strong>
      </div>

      {examples.length > 0 && (
        <div className="chat-theme-preview-list chat-card-scroll-list">
          {examples.map((example) => {
            const isInteractive = Boolean(example.onClick || example.onKeyDown)
            const itemClass = [
              'chat-theme-preview-item',
              isInteractive ? 'chat-theme-preview-item--clickable' : '',
            ]
              .filter(Boolean)
              .join(' ')

            return (
              <div
                key={example.id}
                className={itemClass}
                role={isInteractive ? 'button' : undefined}
                tabIndex={isInteractive ? 0 : undefined}
                onClick={example.onClick}
                onKeyDown={example.onKeyDown}
              >
                <ExpandableText
                  text={example.text}
                  expanded={Boolean(expandedExampleKeys[example.id])}
                  onToggle={() =>
                    setExpandedExampleKeys((prev) => ({
                      ...prev,
                      [example.id]: !prev[example.id],
                    }))
                  }
                />
              </div>
            )
          })}
        </div>
      )}

      <div className="chat-chip-row">
        {topTerms.map((term) => (
          <span key={`${title}-${term}`} className="chat-chip">
            {term}
          </span>
        ))}
      </div>

      {actions}
    </article>
  )
}

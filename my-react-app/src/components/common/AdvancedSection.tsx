import type { ReactNode } from 'react'

type AdvancedSectionProps = {
  title?: string
  children: ReactNode
  className?: string
}

export default function AdvancedSection({
  title = 'Advanced',
  children,
  className,
}: AdvancedSectionProps) {
  const rootClass = ['chat-advanced', className].filter(Boolean).join(' ')

  return (
    <details className={rootClass}>
      <summary className="chat-advanced__summary">{title}</summary>
      <div className="chat-advanced__content">{children}</div>
    </details>
  )
}

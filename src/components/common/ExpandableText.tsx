import { useEffect, useRef, useState } from 'react'

type ExpandableTextProps = {
  text: string
  expanded: boolean
  onToggle: () => void
  className?: string
}

export default function ExpandableText({
  text,
  expanded,
  onToggle,
  className,
}: ExpandableTextProps) {
  const contentRef = useRef<HTMLSpanElement>(null)
  const [isOverflowing, setIsOverflowing] = useState(false)

  useEffect(() => {
    if (expanded) return

    const element = contentRef.current
    if (!element) return

    const measureOverflow = () => {
      const overflowsVertically = element.scrollHeight - element.clientHeight > 1
      const overflowsHorizontally = element.scrollWidth - element.clientWidth > 1
      setIsOverflowing(overflowsVertically || overflowsHorizontally)
    }

    measureOverflow()

    const resizeObserver =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => measureOverflow()) : null
    resizeObserver?.observe(element)
    window.addEventListener('resize', measureOverflow)

    return () => {
      resizeObserver?.disconnect()
      window.removeEventListener('resize', measureOverflow)
    }
  }, [expanded, text])

  const canToggle = expanded || isOverflowing

  const wrapperClass = ['chat-expandable-text', className].filter(Boolean).join(' ')
  const textClass = [
    'chat-expandable-text__content',
    expanded ? 'chat-expandable-text__content--expanded' : 'chat-expandable-text__content--collapsed',
  ].join(' ')

  return (
    <span className={wrapperClass}>
      <span ref={contentRef} className={textClass}>
        {text}
      </span>
      {canToggle && (
        <button
          type="button"
          className="chat-expandable-text__toggle"
          onMouseDown={(event) => {
            event.preventDefault()
            event.stopPropagation()
          }}
          onClick={(event) => {
            event.preventDefault()
            event.stopPropagation()
            onToggle()
          }}
        >
          {expanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </span>
  )
}

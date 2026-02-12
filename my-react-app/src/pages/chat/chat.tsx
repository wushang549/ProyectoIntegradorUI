import { useState, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import granulateLogo from '../../assets/Granulate logo.png'
import './chat.css'

const ALLOWED_TYPES = ['.csv', '.txt', '.pdf']

/* Dots arranged in concentric rings to form a circle */
const ORB_DOT_POSITIONS = (() => {
  const positions: { x: number; y: number }[] = []
  const rings = [
    { r: 0, count: 1 },
    { r: 0.22, count: 6 },
    { r: 0.42, count: 12 },
    { r: 0.62, count: 18 },
    { r: 0.85, count: 12 },
  ]
  rings.forEach(({ r, count }) => {
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * 2 * Math.PI - Math.PI / 2
      positions.push({
        x: 50 + r * 45 * Math.cos(angle),
        y: 50 + r * 45 * Math.sin(angle),
      })
    }
  })
  return positions
})()

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good Morning'
  if (hour < 18) return 'Good Afternoon'
  return 'Good Evening'
}

const ORB_SIZE = 80
const REPULSE_RADIUS = 38
const REPULSE_MAX_PX = 14

function getRepulsion(
  dotXPercent: number,
  dotYPercent: number,
  mouseX: number,
  mouseY: number
): { x: number; y: number } {
  const dotX = (dotXPercent / 100) * ORB_SIZE
  const dotY = (dotYPercent / 100) * ORB_SIZE
  const dx = dotX - mouseX
  const dy = dotY - mouseY
  const d = Math.sqrt(dx * dx + dy * dy)
  if (d >= REPULSE_RADIUS || d < 1) return { x: 0, y: 0 }
  const magnitude = ((REPULSE_RADIUS - d) / REPULSE_RADIUS) * REPULSE_MAX_PX
  return {
    x: (dx / d) * magnitude,
    y: (dy / d) * magnitude,
  }
}

export default function Chat() {
  const [query, setQuery] = useState('')
  const [attachedFiles, setAttachedFiles] = useState<File[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [fileError, setFileError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const orbRef = useRef<HTMLDivElement>(null)
  const [mouseInOrb, setMouseInOrb] = useState<{ x: number; y: number } | null>(null)

  const handleOrbMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = orbRef.current?.getBoundingClientRect()
    if (!rect) return
    setMouseInOrb({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    })
  }, [])

  const handleOrbMouseLeave = useCallback(() => {
    setMouseInOrb(null)
  }, [])

  const validateFile = useCallback((file: File): boolean => {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase()
    if (!ALLOWED_TYPES.includes(ext)) {
      setFileError(`Only ${ALLOWED_TYPES.join(', ')} are allowed.`)
      return false
    }
    setFileError('')
    return true
  }, [])

  const addFiles = useCallback(
    (files: FileList | null) => {
      if (!files?.length) return
      const next: File[] = []
      for (let i = 0; i < files.length; i++) {
        const f = files[i]
        if (validateFile(f)) next.push(f)
      }
      setAttachedFiles((prev) => [...prev, ...next])
    },
    [validateFile]
  )

  const removeFile = useCallback((index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index))
    setFileError('')
  }, [])

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      addFiles(e.dataTransfer.files)
    },
    [addFiles]
  )

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const onAttachClick = () => fileInputRef.current?.click()

  return (
    <div className="chat-page">
      <aside className="chat-sidebar">
        <Link to="/" className="chat-sidebar-logo" aria-label="Granulate home">
          <img src={granulateLogo} alt="Granulate" className="chat-logo-img" />
        </Link>
        <nav className="chat-sidebar-nav">
          <Link to="/" className="chat-nav-item" title="Home">
            <ChatIconHome />
          </Link>
          <Link to="/chat" className="chat-nav-item chat-nav-item--active" title="Chat">
            <ChatIconBubble />
          </Link>
          <span className="chat-nav-item" title="History">
            <ChatIconClock />
          </span>
          <span className="chat-nav-item" title="Files">
            <ChatIconFolder />
          </span>
          <span className="chat-nav-item" title="Share">
            <ChatIconShare />
          </span>
          <span className="chat-nav-item" title="Data sources">
            <ChatIconDatabase />
          </span>
          <span className="chat-nav-item" title="Support">
            <ChatIconSupport />
          </span>
          <span className="chat-nav-item" title="Settings">
            <ChatIconSettings />
          </span>
        </nav>
        <div className="chat-sidebar-user">
          <div className="chat-user-avatar" aria-hidden />
        </div>
      </aside>

      <div className="chat-main">
        <header className="chat-header">
          <div className="chat-header-left">
            <span className="chat-header-title">Granulate Chat</span>
          </div>
        </header>

        <main className="chat-content">
          <div className="chat-greeting-wrap">
            <div
              ref={orbRef}
              className="chat-greeting-orb"
              aria-hidden
              onMouseMove={handleOrbMouseMove}
              onMouseLeave={handleOrbMouseLeave}
            >
              {ORB_DOT_POSITIONS.map((pos, i) => {
                const repulse = mouseInOrb
                  ? getRepulsion(pos.x, pos.y, mouseInOrb.x, mouseInOrb.y)
                  : { x: 0, y: 0 }
                return (
                  <span
                    key={i}
                    className="chat-orb-dot-wrapper"
                    style={{
                      left: `${pos.x}%`,
                      top: `${pos.y}%`,
                      transform: `translate(-50%, -50%) translate(${repulse.x}px, ${repulse.y}px)`,
                    }}
                  >
                    <span
                      className="chat-orb-dot"
                      style={{ animationDelay: `${i * 0.04}s` }}
                    />
                  </span>
                )
              })}
            </div>
            <p className="chat-greeting">
              {getGreeting()}, <span className="chat-greeting-name">there</span>
            </p>
            <h2 className="chat-headline">
              What are we going to <em className="chat-headline-accent">analyze</em> today?
            </h2>
          </div>

          <div
            className={`chat-input-wrap ${isDragging ? 'chat-input-wrap--dragging' : ''}`}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt,.pdf,text/csv,text/plain,application/pdf"
              multiple
              className="chat-file-input"
              aria-label="Attach files"
              onChange={(e) => {
                addFiles(e.target.files)
                e.target.value = ''
              }}
            />
            <div className="chat-input-box">
              <span className="chat-input-icon" aria-hidden>
                <ChatIconSpark />
              </span>
              <input
                type="text"
                className="chat-input"
                placeholder="Load your Data and analyze it like a pro in seconds"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Ask AI"
              />
            </div>
            <div className="chat-input-toolbar">
              <button
                type="button"
                className="chat-toolbar-btn"
                onClick={onAttachClick}
                aria-label="Attach files (CSV, TXT, PDF)"
              >
                <ChatIconAttach />
                <span>Attach</span>
              </button>
              <span className="chat-toolbar-hint">CSV, TXT or PDF</span>
              <button type="button" className="chat-send-btn" aria-label="Send">
                <ChatIconSend />
              </button>
            </div>
            {attachedFiles.length > 0 && (
              <div className="chat-attached-list">
                {attachedFiles.map((f, i) => (
                  <span key={`${f.name}-${i}`} className="chat-attached-tag">
                    {f.name}
                    <button
                      type="button"
                      className="chat-attached-remove"
                      onClick={() => removeFile(i)}
                      aria-label={`Remove ${f.name}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            {fileError && <p className="chat-file-error" role="alert">{fileError}</p>}
          </div>

        </main>
      </div>
    </div>
  )
}

function ChatIconHome() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  )
}
function ChatIconBubble() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}
function ChatIconClock() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}
function ChatIconFolder() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  )
}
function ChatIconShare() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  )
}
function ChatIconDatabase() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  )
}
function ChatIconSupport() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
      <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
    </svg>
  )
}
function ChatIconSettings() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}
function ChatIconSpark() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    </svg>
  )
}
function ChatIconAttach() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>
  )
}
function ChatIconSend() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m22 2-7 20-4-9-9-4Z" />
      <path d="M22 2 11 13" />
    </svg>
  )
}

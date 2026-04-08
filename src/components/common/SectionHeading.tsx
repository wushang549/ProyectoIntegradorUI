type SectionHeadingProps = {
  title: string
  subtitle?: string
  meaning?: string
}

export default function SectionHeading({ title, subtitle, meaning }: SectionHeadingProps) {
  return (
    <header className="chat-section-heading">
      <h2 className="chat-section-title">{title}</h2>
      {subtitle && <p className="chat-section-subtitle">{subtitle}</p>}
      {meaning && <p className="chat-meaning-text">{meaning}</p>}
    </header>
  )
}

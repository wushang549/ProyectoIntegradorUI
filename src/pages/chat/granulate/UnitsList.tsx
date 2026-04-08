import { memo, useMemo, useState } from 'react'

type UnitsListProps = {
  units: string[]
}

function renderHighlightedText(unit: string, query: string) {
  if (!query) return unit

  const source = unit.toLowerCase()
  const search = query.toLowerCase()
  const index = source.indexOf(search)

  if (index === -1) return unit

  const before = unit.slice(0, index)
  const match = unit.slice(index, index + query.length)
  const after = unit.slice(index + query.length)

  return (
    <>
      {before}
      <mark className="chat-unit-mark">{match}</mark>
      {after}
    </>
  )
}

function UnitsList({ units }: UnitsListProps) {
  const [searchTerm, setSearchTerm] = useState('')

  const normalizedSearch = searchTerm.trim().toLowerCase()

  const filteredUnits = useMemo(() => {
    if (!normalizedSearch) return units
    return units.filter((unit) => unit.toLowerCase().includes(normalizedSearch))
  }, [normalizedSearch, units])

  return (
    <section className="gr-card gr-card--subtle chat-units-panel">
      <div className="chat-units-toolbar">
        <h4 className="chat-gr-section-title">Units</h4>
        <span className="chat-units-counter">
          Showing {filteredUnits.length} of {units.length}
        </span>
      </div>

      <input
        type="text"
        className="chat-input chat-inline-input chat-units-search"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Search units..."
        aria-label="Search units"
      />

      <div className="chat-units-list">
        {filteredUnits.length === 0 && (
          <p className="chat-muted-text">
            {units.length === 0 ? 'No units available.' : 'No units match your search.'}
          </p>
        )}

        {filteredUnits.map((unit, index) => (
          <span key={`${unit}-${index}`} className="chat-unit-chip">
            {renderHighlightedText(unit, searchTerm.trim())}
          </span>
        ))}
      </div>
    </section>
  )
}

export default memo(UnitsList)

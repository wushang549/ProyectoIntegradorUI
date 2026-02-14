type UnitRowProps = {
  unit: string
}

export default function UnitRow({ unit }: UnitRowProps) {
  return <span className="chat-attached-tag">{unit}</span>
}

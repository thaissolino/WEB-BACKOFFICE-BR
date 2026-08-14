import { ReactNode } from "react"
import { AtivoToggle } from "../produtos/QuickCadWindows"

export function RadioSimNao({
  name,
  value,
  onChange,
}: {
  name: string
  value: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <fieldset className="pdv-cad-radios pdv-cad-radios-stack pdv-cad-radios-yn">
      <legend className="pdv-sr">{name}</legend>
      <label>
        <input type="radio" name={name} checked={value} onChange={() => onChange(true)} />
        Sim
      </label>
      <label>
        <input type="radio" name={name} checked={!value} onChange={() => onChange(false)} />
        Não
      </label>
    </fieldset>
  )
}

export function FormRow({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: ReactNode
}) {
  return (
    <div className="pdv-cad-form-row">
      <span className="pdv-cad-form-label">
        {label}
        {required ? "*" : ""}
      </span>
      {children}
    </div>
  )
}

export function DatePreset({
  onPick,
}: {
  onPick: (start: string, end: string) => void
}) {
  function fmt(date: Date) {
    const d = String(date.getDate()).padStart(2, "0")
    const m = String(date.getMonth() + 1).padStart(2, "0")
    return `${d}/${m}/${date.getFullYear()}`
  }
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - ((today.getDay() + 6) % 7))
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
  const prevStart = new Date(today.getFullYear(), today.getMonth() - 1, 1)
  const prevEnd = new Date(today.getFullYear(), today.getMonth(), 0)

  const chips = [
    { label: "Hoje", start: fmt(today), end: fmt(today) },
    { label: "Ontem", start: fmt(yesterday), end: fmt(yesterday) },
    { label: "Esta Semana", start: fmt(weekStart), end: fmt(weekEnd) },
    { label: "Até Hoje", start: `01/${String(today.getMonth() + 1).padStart(2, "0")}/${today.getFullYear()}`, end: fmt(today) },
    { label: "Mês Atual", start: fmt(monthStart), end: fmt(new Date(today.getFullYear(), today.getMonth() + 1, 0)) },
    { label: "Mês Anterior", start: fmt(prevStart), end: fmt(prevEnd) },
  ]

  return (
    <div className="pdv-date-presets">
      {chips.map((chip) => (
        <button key={chip.label} className="pdv-cad-btn pdv-cad-btn-ghost" type="button" onClick={() => onPick(chip.start, chip.end)}>
          {chip.label}
        </button>
      ))}
      <button className="pdv-cad-btn" type="button" onClick={() => onPick("", "")}>
        Limpar
      </button>
    </div>
  )
}

export function SimNaoCell({
  value,
  onChange,
}: {
  value: boolean
  onChange: (next: boolean) => void
}) {
  return <AtivoToggle value={value} onChange={onChange} />
}

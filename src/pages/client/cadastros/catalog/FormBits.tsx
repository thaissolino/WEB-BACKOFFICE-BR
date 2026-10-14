import { ReactNode, useEffect, useRef, useState } from "react"
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

function isoDate(date: Date) {
  const d = String(date.getDate()).padStart(2, "0")
  const m = String(date.getMonth() + 1).padStart(2, "0")
  return `${date.getFullYear()}-${m}-${d}`
}

export function datePresets() {
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - ((today.getDay() + 6) % 7))
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)
  const prevStart = new Date(today.getFullYear(), today.getMonth() - 1, 1)
  const prevEnd = new Date(today.getFullYear(), today.getMonth(), 0)
  return [
    { label: "Hoje", start: isoDate(today), end: isoDate(today) },
    { label: "Ontem", start: isoDate(yesterday), end: isoDate(yesterday) },
    { label: "Esta Semana", start: isoDate(weekStart), end: isoDate(weekEnd) },
    { label: "Até Hoje", start: isoDate(monthStart), end: isoDate(today) },
    { label: "Mês Atual", start: isoDate(monthStart), end: isoDate(monthEnd) },
    { label: "Mês Anterior", start: isoDate(prevStart), end: isoDate(prevEnd) },
  ]
}

export function DatePreset({
  onPick,
}: {
  onPick: (start: string, end: string) => void
}) {
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  const [spot, setSpot] = useState({ top: 0, left: 0 })

  function place() {
    const rect = button.current?.getBoundingClientRect()
    if (!rect) return
    const width = 168
    setSpot({ top: rect.bottom + 4, left: Math.max(8, rect.right - width) })
  }

  useEffect(() => {
    if (!open) return
    place()
    function close(event: MouseEvent) {
      if (!box.current?.contains(event.target as Node)) setOpen(false)
    }
    function follow() {
      place()
    }
    document.addEventListener("mousedown", close)
    window.addEventListener("resize", follow)
    window.addEventListener("scroll", follow, true)
    return () => {
      document.removeEventListener("mousedown", close)
      window.removeEventListener("resize", follow)
      window.removeEventListener("scroll", follow, true)
    }
  }, [open])

  function choose(start: string, end: string) {
    onPick(start, end)
    setOpen(false)
  }

  return (
    <div className="pdv-date-presets" ref={box}>
      <button
        ref={button}
        className="pdv-date-presets-btn"
        type="button"
        aria-label="Período"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="pdv-date-presets-caret" aria-hidden="true" />
      </button>
      {open ? (
        <div className="pdv-date-presets-menu" role="menu" style={{ position: "fixed", top: spot.top, left: spot.left, right: "auto" }}>
          {datePresets().map((chip) => (
            <button key={chip.label} type="button" role="menuitem" onClick={() => choose(chip.start, chip.end)}>
              {chip.label}
            </button>
          ))}
          <button type="button" role="menuitem" onClick={() => choose("", "")}>
            Limpar
          </button>
        </div>
      ) : null}
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

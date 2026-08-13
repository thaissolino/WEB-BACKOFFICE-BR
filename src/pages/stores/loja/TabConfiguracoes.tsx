import { useState } from "react"
import { CONFIG_SECTIONS, type StoreConfiguracoes } from "./types"

export default function TabConfiguracoes({
  value,
  onChange,
}: {
  value: StoreConfiguracoes
  onChange: (next: StoreConfiguracoes) => void
}) {
  const [open, setOpen] = useState<Record<string, boolean>>({})

  function setAll(next: boolean) {
    const map: Record<string, boolean> = {}
    for (const section of CONFIG_SECTIONS) map[section.id] = next
    setOpen(map)
  }

  return (
    <div>
      <div className="loja-toolbar">
        <button className="loja-btn" type="button" onClick={() => setAll(true)}>
          + Expandir Todos
        </button>
        <button className="loja-btn" type="button" onClick={() => setAll(false)}>
          - Recolher Todos
        </button>
      </div>
      {CONFIG_SECTIONS.map((section) => {
        const expanded = Boolean(open[section.id])
        return (
          <section className="loja-accordion" key={section.id}>
            <button
              type="button"
              aria-expanded={expanded}
              onClick={() => {
                setOpen((current) => ({ ...current, [section.id]: !current[section.id] }))
                if (!value[section.id]) onChange({ ...value, [section.id]: {} })
              }}
            >
              {section.label}
              {"info" in section && section.info ? (
                <i title="sem parâmetros neste print" aria-label="Informação sobre Grupos">
                  i
                </i>
              ) : null}
              <span aria-hidden="true">{expanded ? "▴" : "▾"}</span>
            </button>
            {expanded ? (
              <div className="loja-accordion-body">sem parâmetros neste print</div>
            ) : null}
          </section>
        )
      })}
    </div>
  )
}

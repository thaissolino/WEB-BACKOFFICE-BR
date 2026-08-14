import { FormEvent, ReactNode } from "react"
import { useNavigate } from "react-router-dom"
import CadastroShell from "../cadastros/CadastroShell"
import { DatePreset } from "../cadastros/catalog/FormBits"

export type FilterField = {
  key: string
  label: string
  kind?: "text" | "select" | "date"
  options?: string[]
}

export type FilterPageProps = {
  title: string
  actions?: { label: string; href?: string; tone?: "green" | "red" | "blue" }[]
  fields: FilterField[]
  columns: string[]
  submitLabel?: string
  hint?: string
  extra?: ReactNode
}

export default function FilterPage({
  title,
  actions = [],
  fields,
  columns,
  submitLabel = "Buscar",
  hint,
  extra,
}: FilterPageProps) {
  const navigate = useNavigate()

  function onSubmit(event: FormEvent) {
    event.preventDefault()
  }

  return (
    <CadastroShell>
      <section className="pdv-cad-page" aria-labelledby="pdv-filter-title">
        <div className="pdv-cad-sheet pdv-cad-sheet-wide">
          <h1 id="pdv-filter-title">{title}</h1>
          {actions.length ? (
            <div className="pdv-cad-actions">
              {actions.map((action) => (
                <button
                  key={action.label}
                  className={`pdv-cad-btn ${action.tone === "green" ? "pdv-cad-btn-green" : action.tone === "red" ? "pdv-cad-btn-red" : action.tone === "blue" ? "pdv-cad-btn-blue" : ""}`}
                  type="button"
                  onClick={() => action.href && navigate(action.href)}
                >
                  {action.label}
                </button>
              ))}
            </div>
          ) : null}
          <form className="pdv-cad-filters" onSubmit={onSubmit}>
            {fields.map((field) => (
              <label key={field.key}>
                {field.label}
                {field.kind === "select" ? (
                  <select defaultValue={field.options?.[0]}>
                    {(field.options || []).map((opt) => (
                      <option key={opt}>{opt}</option>
                    ))}
                  </select>
                ) : (
                  <input autoComplete="off" />
                )}
              </label>
            ))}
            <div className="pdv-cad-filters-go">
              <button className="pdv-cad-btn" type="button">Limpar</button>
              <button className="pdv-cad-btn pdv-cad-btn-blue" type="submit">{submitLabel}</button>
            </div>
          </form>
          {fields.some((field) => field.kind === "date") ? (
            <DatePreset onPick={() => undefined} />
          ) : null}
          {extra}
          <div className="pdv-cad-table-wrap">
            <table className="pdv-cad-table">
              <thead>
                <tr>
                  {columns.map((column) => (
                    <th key={column}>{column}</th>
                  ))}
                </tr>
              </thead>
              <tbody />
            </table>
          </div>
          <p className="pdv-cad-kicker">{hint || "Nenhum registro para o filtro atual."}</p>
        </div>
      </section>
    </CadastroShell>
  )
}

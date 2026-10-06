import { FormEvent, Fragment, ReactNode } from "react"
import { useNavigate } from "react-router-dom"
import CadastroShell from "../cadastros/CadastroShell"
import { DatePreset } from "../cadastros/catalog/FormBits"
import { todayIso } from "../../../utils/todayIso"

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
  rows?: string[][]
  onRowClick?: (index: number) => void
  hideList?: boolean
  expandedIndex?: number | null
  expanded?: ReactNode
  premium?: boolean
  closedAction?: (index: number) => ReactNode
}

export default function FilterPage({
  title,
  actions = [],
  fields,
  columns,
  submitLabel = "Buscar",
  hint,
  extra,
  rows,
  onRowClick,
  hideList = false,
  expandedIndex = null,
  expanded,
  premium = false,
  closedAction,
}: FilterPageProps) {
  const navigate = useNavigate()

  function onSubmit(event: FormEvent) {
    event.preventDefault()
  }

  return (
    <CadastroShell>
      <section className="pdv-cad-page" aria-labelledby="pdv-filter-title">
        <div className={`pdv-cad-sheet pdv-cad-sheet-wide${premium ? " pdv-cad-premium" : ""}`}>
          {hideList ? null : <h1 id="pdv-filter-title">{title}</h1>}
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
          {hideList ? null : <form className="pdv-cad-filters" onSubmit={onSubmit}>
            {fields.map((field) => (
              <label key={field.key}>
                {field.label}
                {field.kind === "select" ? (
                  <select defaultValue={field.options?.[0]}>
                    {(field.options || []).map((opt) => (
                      <option key={opt}>{opt}</option>
                    ))}
                  </select>
                ) : field.kind === "date" ? (
                  <input type="date" defaultValue={todayIso()} autoComplete="off" />
                ) : (
                  <input autoComplete="off" />
                )}
              </label>
            ))}
            <div className="pdv-cad-filters-go">
              <button className="pdv-cad-btn" type="button">Limpar</button>
              <button className="pdv-cad-btn pdv-cad-btn-blue" type="submit">{submitLabel}</button>
            </div>
          </form>}
          {fields.some((field) => field.kind === "date") ? (
            <DatePreset onPick={() => undefined} />
          ) : null}
          {extra}
          {hideList ? null : <div className="pdv-cad-table-wrap">
            <table className="pdv-cad-table">
              <thead>
                <tr>
                  {columns.map((column) => (
                    <th key={column}>{column}</th>
                  ))}
                  {closedAction ? <th /> : null}
                </tr>
              </thead>
              <tbody>
                {(rows || []).map((row, index) => (
                  <Fragment key={`${row[0]}-${index}`}>
                    <tr
                      className={[
                        onRowClick ? "pdv-cad-row-link" : "",
                        expandedIndex === index ? "pdv-cad-row-open" : "",
                      ].filter(Boolean).join(" ") || undefined}
                      aria-expanded={onRowClick ? expandedIndex === index : undefined}
                      onClick={onRowClick ? () => onRowClick(index) : undefined}
                    >
                      {row.map((cell, cellIndex) => (
                        <td key={cellIndex}>
                          {cellIndex === 0 && onRowClick ? (
                            <span className="pdv-cad-code">
                              <span className={`pdv-cad-chevron${expandedIndex === index ? " is-open" : ""}`} aria-hidden="true" />
                              {cell}
                            </span>
                          ) : cell}
                        </td>
                      ))}
                      {closedAction ? (
                        <td className="pdv-cad-row-action">{closedAction(index)}</td>
                      ) : null}
                    </tr>
                    {expandedIndex === index && expanded ? (
                      <tr className="pdv-cad-accordion">
                        <td colSpan={columns.length + (closedAction ? 1 : 0)}>{expanded}</td>
                      </tr>
                    ) : null}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>}
          {hideList ? null : rows && rows.length ? (
            hint ? <p className="pdv-cad-kicker">{hint}</p> : null
          ) : hideList ? null : (
            <p className="pdv-cad-kicker">{hint || "Nenhum registro para o filtro atual."}</p>
          )}
        </div>
      </section>
    </CadastroShell>
  )
}

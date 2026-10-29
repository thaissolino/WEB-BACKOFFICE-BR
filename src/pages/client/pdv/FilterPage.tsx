import { FormEvent, Fragment, ReactNode, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { CadastroFrame } from "../cadastros/CadastroShell"
import { DatePreset } from "../cadastros/catalog/FormBits"
import SearchableSelect from "../cadastros/produtos/SearchableSelect"
import { todayIso } from "../../../utils/todayIso"

const COLUNA_NUMERO = ["cod", "qtd", "quant", "valor", "preco", "custo", "comiss", "total", "data", "ordem", "numero", "subtotal", "saldo", "estoque", "unit", "movimentou"]

export function colunaNumero(titulo: string) {
  const texto = titulo.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase()
  return COLUNA_NUMERO.some((chave) => texto.includes(chave))
}

function colunaVenda(titulo: string) {
  const texto = titulo.normalize("NFD").replace(/\p{M}/gu, "").trim().toLowerCase()
  return texto === "venda"
}

function colunaCentro(titulo: string) {
  const texto = titulo.normalize("NFD").replace(/\p{M}/gu, "").trim().toLowerCase()
  return texto === "visualizar"
}

function classeDaColuna(titulo: string) {
  if (colunaNumero(titulo)) return "pdv-col-num"
  if (colunaCentro(titulo)) return "pdv-col-centro"
  return undefined
}

export type FilterField = {
  key: string
  label: string
  kind?: "text" | "select" | "date" | "search"
  options?: string[]
}

export type FilterPageProps = {
  title: string
  actions?: { label: string; href?: string; tone?: "green" | "red" | "blue" | "ink"; onClick?: () => void }[]
  fields: FilterField[]
  columns: string[]
  submitLabel?: string
  hint?: string
  extra?: ReactNode
  lead?: ReactNode
  rows?: string[][]
  totals?: string[]
  onRowClick?: (index: number) => void
  saleLink?: (rowIndex: number) => void
  renderCell?: (rowIndex: number, columnIndex: number, value: string) => ReactNode | null | undefined
  hideList?: boolean
  expandedIndex?: number | null
  expanded?: ReactNode
  premium?: boolean
  closedAction?: (index: number) => ReactNode
  closedLabel?: ReactNode
  closedMark?: boolean
  rowLead?: (index: number) => ReactNode
  rowLeadLabel?: ReactNode
  rowLeadCenter?: boolean
  closedCenter?: boolean
  rowMark?: (index: number) => ReactNode
  markAll?: ReactNode
  pageClass?: string
  filtersClass?: string
  initialValues?: Record<string, string>
  foot?: ReactNode
  busy?: boolean
  onSearch?: (values: Record<string, string>) => void
}

function valoresDoFiltro(fields: FilterField[], initial?: Record<string, string>) {
  const next: Record<string, string> = {}
  for (const field of fields) {
    if (initial && Object.prototype.hasOwnProperty.call(initial, field.key)) {
      next[field.key] = initial[field.key]
      continue
    }
    next[field.key] = field.kind === "date" ? todayIso() : field.kind === "select" || field.kind === "search" ? field.options?.[0] || "" : ""
  }
  return next
}

export default function FilterPage({
  title,
  actions = [],
  fields,
  columns,
  submitLabel = "Buscar",
  hint,
  extra,
  lead,
  rows,
  totals,
  onRowClick,
  saleLink,
  renderCell,
  hideList = false,
  expandedIndex = null,
  expanded,
  premium = false,
  closedAction,
  closedLabel = "",
  closedMark = false,
  rowLead,
  rowLeadLabel = "",
  rowLeadCenter = false,
  closedCenter = false,
  rowMark,
  markAll,
  pageClass = "",
  filtersClass = "",
  initialValues,
  foot,
  busy = false,
  onSearch,
}: FilterPageProps) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const dateKeys = fields.filter((field) => field.kind === "date").map((field) => field.key)
  const colunas = columns.length + (rowMark ? 1 : 0) + (rowLead ? 1 : 0) + (closedAction ? 1 : 0)
  const [values, setValues] = useState<Record<string, string>>(() => valoresDoFiltro(fields, initialValues))

  function setValue(key: string, value: string) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  function applyPeriod(start: string, end: string) {
    setValues((current) => {
      const next = { ...current }
      if (dateKeys[0]) next[dateKeys[0]] = start
      if (dateKeys[1]) next[dateKeys[1]] = end
      return next
    })
  }

  function clearValues() {
    const next = valoresDoFiltro(fields, initialValues)
    setValues(next)
    onSearch?.(next)
  }

  function go(href?: string) {
    if (!href) return
    const next = pathname.startsWith("/gestao/")
      ? href.replace("/client/movimentacoes", "/gestao/movimentacoes")
      : href
    navigate(next)
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    onSearch?.(values)
  }

  return (
    <CadastroFrame>
      <section className={["pdv-cad-page", pageClass].filter(Boolean).join(" ")} aria-labelledby="pdv-filter-title">
        <div className={`pdv-cad-sheet pdv-cad-sheet-wide${premium ? " pdv-cad-premium" : ""}`}>
          {hideList ? null : <h1 id="pdv-filter-title">{title}</h1>}
          {lead}
          {actions.length ? (
            <div className="pdv-cad-actions">
              {actions.map((action) => (
                <button
                  key={action.label}
                  className={`pdv-cad-btn ${action.tone === "green" ? "pdv-cad-btn-green" : action.tone === "red" ? "pdv-cad-btn-red" : action.tone === "blue" ? "pdv-cad-btn-blue" : action.tone === "ink" ? "pdv-cad-btn-ink" : ""}`}
                  type="button"
                  onClick={() => {
                    if (action.onClick) action.onClick()
                    else go(action.href)
                  }}
                >
                  {action.label}
                </button>
              ))}
            </div>
          ) : null}
          {hideList || fields.length === 0 ? null : <form className={["pdv-cad-filters", filtersClass].filter(Boolean).join(" ")} onSubmit={onSubmit} noValidate>
            {fields.map((field) => (
              <label key={field.key}>
                {field.label}
                {field.kind === "search" ? (
                  <SearchableSelect
                    value={!values[field.key] || values[field.key] === (field.options?.[0] || "") ? "" : values[field.key]}
                    emptyLabel={field.options?.[0] || "Todos"}
                    options={(field.options || []).slice(1)}
                    onChange={(next) => setValue(field.key, !next || next === (field.options?.[0] || "") ? field.options?.[0] || "" : next)}
                  />
                ) : field.kind === "select" ? (
                  <select value={values[field.key] ?? ""} onChange={(event) => setValue(field.key, event.target.value)}>
                    {(field.options || []).map((opt) => (
                      <option key={opt}>{opt}</option>
                    ))}
                  </select>
                ) : field.kind === "date" ? (
                  <span className="pdv-date-field">
                    <input type="date" value={values[field.key] ?? ""} onChange={(event) => setValue(field.key, event.target.value)} autoComplete="off" />
                    <DatePreset onPick={applyPeriod} />
                  </span>
                ) : (
                  <input value={values[field.key] ?? ""} onChange={(event) => setValue(field.key, event.target.value)} autoComplete="off" />
                )}
              </label>
            ))}
            <div className="pdv-cad-filters-go">
              <button className="pdv-cad-btn" type="button" onClick={clearValues}>Limpar</button>
              <button className={`pdv-cad-btn pdv-cad-btn-blue${busy ? " is-busy" : ""}`} type="button" onClick={() => onSearch?.(values)}>
                {busy ? <span className="pdv-cad-spin" aria-hidden="true" /> : null}
                {submitLabel}
              </button>
            </div>
          </form>}
          {extra}
          {hideList ? null : <div className={`pdv-cad-table-wrap${busy ? " pdv-prod-refreshing" : ""}`}>
            <table className="pdv-cad-table">
              <thead>
                <tr>
                  {rowMark ? <th className="pdv-col-mark">{markAll}</th> : null}
                  {rowLead ? <th className={rowLeadCenter ? "pdv-col-centro" : undefined}>{rowLeadLabel}</th> : null}
                  {columns.map((column) => (
                    <th key={column} className={classeDaColuna(column)}>{column}</th>
                  ))}
                  {closedAction ? <th className={closedCenter ? "pdv-col-centro" : closedMark ? "pdv-col-mark" : undefined}>{closedLabel}</th> : null}
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
                      {rowMark ? (
                        <td className="pdv-col-mark">{rowMark(index)}</td>
                      ) : null}
                      {rowLead ? (
                        <td className={rowLeadCenter ? "pdv-col-centro" : "pdv-cad-row-action"}>{rowLead(index)}</td>
                      ) : null}
                      {row.map((cell, cellIndex) => {
                        const custom = renderCell?.(index, cellIndex, cell)
                        return (
                        <td key={cellIndex} className={classeDaColuna(columns[cellIndex] || "")}>
                          {custom != null ? custom : saleLink && colunaVenda(columns[cellIndex] || "") ? (
                            <button className="iv-venda-abre" type="button" onClick={(event) => { event.stopPropagation(); saleLink(index) }}>{cell}</button>
                          ) : cellIndex === 0 && onRowClick ? (
                            <span className="pdv-cad-code">
                              <span className={`pdv-cad-chevron${expandedIndex === index ? " is-open" : ""}`} aria-hidden="true" />
                              {cell}
                            </span>
                          ) : cell}
                        </td>
                        )
                      })}
                      {closedAction ? (
                        <td className={closedCenter ? "pdv-col-centro" : closedMark ? "pdv-col-mark" : "pdv-cad-row-action"}>{closedAction(index)}</td>
                      ) : null}
                    </tr>
                    {expandedIndex === index && expanded ? (
                      <tr className="pdv-cad-accordion">
                        <td colSpan={columns.length + (rowMark ? 1 : 0) + (rowLead ? 1 : 0) + (closedAction ? 1 : 0)}>{expanded}</td>
                      </tr>
                    ) : null}
                  </Fragment>
                ))}
                {rows?.length ? null : (
                  <tr>
                    <td className="pdv-cad-vazio" colSpan={colunas}>{hint || "Nenhum registro para o filtro atual."}</td>
                  </tr>
                )}
              </tbody>
              {totals && rows?.length ? (
                <tfoot>
                  <tr className="pdv-cad-totals">
                    {rowMark ? <td className="pdv-col-mark" /> : null}
                    {rowLead ? <td /> : null}
                    {totals.map((cell, cellIndex) => (
                      <td key={cellIndex} className={colunaNumero(columns[cellIndex] || "") ? "pdv-col-num" : undefined}>{cell}</td>
                    ))}
                    {closedAction ? <td /> : null}
                  </tr>
                </tfoot>
              ) : null}
            </table>
          </div>}
          {foot}
          {hideList || !rows?.length || !hint ? null : <p className="pdv-cad-kicker">{hint}</p>}
        </div>
      </section>
    </CadastroFrame>
  )
}

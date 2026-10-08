import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { Pencil, Plus } from "lucide-react"
import CadastroShell from "../CadastroShell"
import { AtivoToggle } from "../produtos/QuickCadWindows"
import {
  deleteCatalog,
  formatCadDate,
  listCatalog,
  payloadStr,
  updateCatalog,
  type CatalogItem,
  type CatalogKind,
} from "./catalogApi"
import { parseError } from "../../../../services/api"

export type CatalogColumn = {
  key: string
  label: string
  from?: "code" | "name" | "createdAt" | "active" | "payload" | "action"
  payloadKey?: string
}

export type CatalogFilter = {
  key: string
  label: string
  from?: "code" | "name" | "payload"
  payloadKey?: string
}

export type CatalogListConfig = {
  kind: CatalogKind
  title: string
  cadastrarLabel?: string
  cadastrarPath?: string
  inativosLabel?: string
  ativosLabel?: string
  inativosPath?: string
  listPath: string
  filters?: CatalogFilter[]
  columns: CatalogColumn[]
  extraActions?: ReactNode
  emptyHint?: string
  bulkDelete?: boolean
  bulkDisable?: boolean
  renderCell?: (item: CatalogItem, column: CatalogColumn) => ReactNode
}

export default function CatalogList({ config, inactive = false }: { config: CatalogListConfig; inactive?: boolean }) {
  const navigate = useNavigate()
  const location = useLocation()
  const isInactive = inactive || location.pathname === config.inativosPath
  const [rows, setRows] = useState<CatalogItem[]>([])
  const [draft, setDraft] = useState<Record<string, string>>({})
  const [applied, setApplied] = useState<Record<string, string>>({})
  const [error, setError] = useState("")
  const [toast, setToast] = useState("")
  const [picking, setPicking] = useState(false)
  const [picked, setPicked] = useState<number[]>([])
  const [deleting, setDeleting] = useState(false)

  function load() {
    listCatalog(config.kind, isInactive ? false : true)
      .then((items) => {
        setRows(items)
        setError("")
      })
      .catch((err) => {
        const parsed = parseError(err)
        setError(parsed.friend || parsed.message || "Não foi possível carregar.")
      })
  }

  useEffect(() => {
    setPicking(false)
    setPicked([])
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.kind, isInactive])

  function togglePicked(code: number) {
    setPicked((current) => (current.includes(code) ? current.filter((item) => item !== code) : [...current, code]))
  }

  async function deleteSelected() {
    if (!picked.length || deleting) return
    const count = picked.length
    if (!window.confirm(count === 1 ? "Excluir este registro?" : `Excluir ${count} registros?`)) return
    setDeleting(true)
    setError("")
    try {
      await deleteCatalog(config.kind, picked)
      setPicked([])
      setPicking(false)
      setToast(count === 1 ? "Registro excluído." : `${count} registros excluídos.`)
      load()
    } catch (err) {
      const parsed = parseError(err)
      setError(parsed.friend || parsed.message || "Não foi possível excluir.")
    } finally {
      setDeleting(false)
    }
  }

  async function disableSelected() {
    if (!picked.length || deleting) return
    const count = picked.length
    if (!window.confirm(count === 1 ? "Inabilitar este registro?" : `Inabilitar ${count} registros?`)) return
    setDeleting(true)
    setError("")
    try {
      const chosen = rows.filter((item) => picked.includes(item.code))
      await Promise.all(chosen.map((item) => updateCatalog(config.kind, item.code, { name: item.name, payload: item.payload, active: false })))
      setPicked([])
      setPicking(false)
      setToast(count === 1 ? "Registro inabilitado." : `${count} registros inabilitados.`)
      load()
    } catch (err) {
      const parsed = parseError(err)
      setError(parsed.friend || parsed.message || "Não foi possível inabilitar.")
    } finally {
      setDeleting(false)
    }
  }

  const visible = useMemo(() => {
    return rows.filter((item) => {
      for (const filter of config.filters ?? []) {
        const q = (applied[filter.key] || "").trim().toLowerCase()
        if (!q) continue
        if (filter.from === "code" && !String(item.code).includes(q.replace(/\D/g, "") || q)) return false
        if (filter.from === "name" && !item.name.toLowerCase().includes(q)) return false
        if (filter.from === "payload") {
          const blob = payloadStr(item, filter.payloadKey || filter.key).toLowerCase()
          if (!blob.includes(q)) return false
        }
      }
      return true
    })
  }, [applied, config.filters, rows])

  function onFilter(event: FormEvent) {
    event.preventDefault()
    setApplied(draft)
  }

  async function toggleActive(item: CatalogItem, next: boolean) {
    try {
      await updateCatalog(config.kind, item.code, { active: next, name: item.name, payload: item.payload })
      load()
    } catch (err) {
      const parsed = parseError(err)
      setError(parsed.friend || parsed.message || "Não foi possível atualizar.")
    }
  }

  function cell(item: CatalogItem, column: CatalogColumn) {
    if (config.renderCell) {
      const custom = config.renderCell(item, column)
      if (custom !== undefined) return custom
    }
    if (column.from === "action" || column.key === "atualizar") {
      return (
        <button
          className="pdv-cad-icon-btn"
          type="button"
          aria-label={`${column.label} ${item.name}`}
          title={column.label}
          onClick={() => navigate(`${config.cadastrarPath}?id=${item.code}`)}
        >
          <Pencil size={16} aria-hidden="true" />
        </button>
      )
    }
    if (column.from === "active" || column.key === "ativo") {
      return <AtivoToggle value={item.active} onChange={(next) => toggleActive(item, next)} />
    }
    if (column.from === "code" || column.key === "code" || column.key === "codigo") return item.code
    if (column.from === "name" || column.key === "name" || column.key === "nome") return item.name
    if (column.from === "createdAt") return formatCadDate(item.createdAt)
    return payloadStr(item, column.payloadKey || column.key)
  }

  return (
    <CadastroShell>
      <section className="pdv-cad-page" aria-labelledby={`pdv-cat-${config.kind}`}>
        <div className="pdv-cad-sheet pdv-cad-sheet-wide">
          <h1 id={`pdv-cat-${config.kind}`}>{config.title}</h1>
          <div className="pdv-cad-actions">
            {config.cadastrarLabel && config.cadastrarPath ? (
              <button className="pdv-cad-btn pdv-cad-btn-green" type="button" onClick={() => navigate(config.cadastrarPath!)}>
                <Plus size={16} strokeWidth={2.4} aria-hidden="true" />
                {config.cadastrarLabel}
              </button>
            ) : null}
            {config.inativosLabel ? (
              isInactive ? (
                <button className="pdv-cad-btn pdv-cad-btn-green" type="button" onClick={() => navigate(config.listPath)}>
                  {config.ativosLabel}
                </button>
              ) : (
                <button className="pdv-cad-btn pdv-cad-btn-red" type="button" onClick={() => navigate(config.inativosPath || `${config.listPath}/inativos`)}>
                  {config.inativosLabel}
                </button>
              )
            ) : null}
            {config.extraActions}
            {config.bulkDelete || config.bulkDisable ? (
              picking ? (
                <>
                  {config.bulkDisable ? (
                    <button className="pdv-cad-btn pdv-cad-btn-red" type="button" disabled={!picked.length || deleting} onClick={() => void disableSelected()}>
                      {deleting ? "Inabilitando..." : picked.length ? `Inabilitar (${picked.length})` : "Inabilitar selecionados"}
                    </button>
                  ) : null}
                  {config.bulkDelete ? (
                    <button className="pdv-cad-btn pdv-cad-btn-red" type="button" disabled={!picked.length || deleting} onClick={() => void deleteSelected()}>
                      {deleting ? "Excluindo..." : picked.length ? `Excluir (${picked.length})` : "Excluir selecionados"}
                    </button>
                  ) : null}
                  <button className="pdv-cad-btn" type="button" disabled={deleting} onClick={() => { setPicking(false); setPicked([]) }}>
                    Cancelar
                  </button>
                </>
              ) : (
                <button className="pdv-cad-btn pdv-cad-btn-blue" type="button" onClick={() => setPicking(true)}>
                  Selecionar
                </button>
              )
            ) : null}
          </div>

          {config.filters?.length ? (
            <form className="pdv-cad-filters pdv-cad-filters-cat" onSubmit={onFilter}>
              {config.filters.map((filter) => (
                <label key={filter.key}>
                  {filter.label}
                  <input
                    value={draft[filter.key] ?? ""}
                    onChange={(event) => setDraft({ ...draft, [filter.key]: event.target.value })}
                    autoComplete="off"
                  />
                </label>
              ))}
              <div className="pdv-cad-filters-go">
                <button className="pdv-cad-btn" type="button" onClick={() => { setDraft({}); setApplied({}) }}>
                  Limpar
                </button>
                <button className="pdv-cad-btn pdv-cad-btn-blue" type="submit">
                  Filtrar
                </button>
              </div>
            </form>
          ) : null}

          {toast ? <p className="pdv-prod-saved-bar" role="status">{toast}</p> : null}
          {error ? <p className="pdv-prod-status" role="alert">{error}</p> : null}

          <div className="pdv-cad-table-wrap">
            <table className="pdv-cad-table">
              <thead>
                <tr>
                  {picking ? (
                    <th>
                      <input
                        type="checkbox"
                        aria-label="Selecionar todos"
                        checked={visible.length > 0 && picked.length === visible.length}
                        onChange={(event) => setPicked(event.target.checked ? visible.map((item) => item.code) : [])}
                      />
                    </th>
                  ) : null}
                  {config.columns.map((column) => (
                    <th key={column.key}>{column.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((item) => (
                  <tr key={item.code}>
                    {picking ? (
                      <td>
                        <input
                          type="checkbox"
                          aria-label={`Selecionar ${item.name}`}
                          checked={picked.includes(item.code)}
                          onChange={() => togglePicked(item.code)}
                        />
                      </td>
                    ) : null}
                    {config.columns.map((column) => (
                      <td key={column.key}>{cell(item, column)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {visible.length === 0 ? (
            <p className="pdv-cad-kicker">{config.emptyHint || "Nenhum registro para o filtro atual."}</p>
          ) : null}
        </div>
      </section>
    </CadastroShell>
  )
}

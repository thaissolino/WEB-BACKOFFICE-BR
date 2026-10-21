import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { Landmark, Pencil, Plus } from "lucide-react"
import { CadastroFrame } from "../CadastroShell"
import "../cadastros.css"
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
  bulkLabel?: string
  alwaysPick?: boolean
  renderCell?: (item: CatalogItem, column: CatalogColumn) => ReactNode
}

export default function CatalogList({
  config,
  inactive = false,
  layout = "pdv",
}: {
  config: CatalogListConfig
  inactive?: boolean
  layout?: "pdv" | "gestao"
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const showAll = new URLSearchParams(location.search).get("todos") === "1"
  const isInactive = !showAll && (inactive || location.pathname === config.inativosPath)
  const [rows, setRows] = useState<CatalogItem[]>([])
  const [draft, setDraft] = useState<Record<string, string>>({})
  const [applied, setApplied] = useState<Record<string, string>>({})
  const [error, setError] = useState("")
  const [toast, setToast] = useState("")
  const [picking, setPicking] = useState(Boolean(config.alwaysPick))
  const [picked, setPicked] = useState<number[]>([])
  const [deleting, setDeleting] = useState(false)

  function load() {
    listCatalog(config.kind, showAll ? undefined : isInactive ? false : true)
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
    setPicking(Boolean(config.alwaysPick))
    setPicked([])
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.kind, isInactive, showAll])

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
    const verb = config.bulkLabel || "Inabilitar"
    if (!window.confirm(count === 1 ? `${verb} este registro?` : `${verb} ${count} registros?`)) return
    setDeleting(true)
    setError("")
    try {
      const chosen = rows.filter((item) => picked.includes(item.code))
      await Promise.all(chosen.map((item) => updateCatalog(config.kind, item.code, { name: item.name, payload: item.payload, active: false })))
      setPicked([])
      if (!config.alwaysPick) setPicking(false)
      const past = (config.bulkLabel || "").toLowerCase() === "inativar" ? "inativado" : "inabilitado"
      setToast(count === 1 ? `Registro ${past}.` : `${count} registros ${past}s.`)
      load()
    } catch (err) {
      const parsed = parseError(err)
      setError(parsed.friend || parsed.message || "Não foi possível inabilitar.")
    } finally {
      setDeleting(false)
    }
  }

  const visible = useMemo(() => {
    const filtered = rows.filter((item) => {
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
    if (!config.columns.some((column) => column.key === "ordem")) return filtered
    const ordemDe = (item: CatalogItem) => Number(payloadStr(item, "ordem").replace(/\D/g, "")) || 9999
    return [...filtered].sort((a, b) => ordemDe(a) - ordemDe(b) || a.name.localeCompare(b.name, "pt-BR"))
  }, [applied, config.columns, config.filters, rows])

  async function saveOrdem(item: CatalogItem, raw: string) {
    const ordem = raw.replace(/\D/g, "")
    if (ordem === payloadStr(item, "ordem")) return
    try {
      await updateCatalog(config.kind, item.code, {
        name: item.name,
        payload: { ...item.payload, ordem },
      })
      setToast("Ordem salva. O PDV usa esse número.")
      load()
    } catch (err) {
      const parsed = parseError(err)
      setError(parsed.friend || parsed.message || "Não foi possível salvar a ordem.")
    }
  }

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
          className={layout === "gestao" ? "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-700" : "pdv-cad-icon-btn"}
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
    if (column.key === "ordem") {
      return (
        <input
          className="pdv-ordem-input"
          inputMode="numeric"
          aria-label={`Ordem de ${item.name}`}
          defaultValue={payloadStr(item, "ordem")}
          key={`${item.code}-${payloadStr(item, "ordem")}`}
          onBlur={(event) => void saveOrdem(item, event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur()
          }}
        />
      )
    }
    if (column.from === "code" || column.key === "code" || column.key === "codigo") return item.code
    if (column.from === "name" || column.key === "name" || column.key === "nome") return item.name
    if (column.from === "createdAt") return formatCadDate(item.createdAt)
    return payloadStr(item, column.payloadKey || column.key)
  }

  const page = (
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
            {config.alwaysPick && config.bulkDisable ? (
              <button className="pdv-cad-btn pdv-cad-btn-red" type="button" disabled={!picked.length || deleting} onClick={() => void disableSelected()}>
                {deleting ? "Inativando..." : "Inativar"}
              </button>
            ) : config.bulkDelete || config.bulkDisable ? (
              picking ? (
                <>
                  {config.bulkDisable ? (
                    <button className="pdv-cad-btn pdv-cad-btn-red" type="button" disabled={!picked.length || deleting} onClick={() => void disableSelected()}>
                      {deleting
                        ? `${(config.bulkLabel || "Inabilitar") === "Inativar" ? "Inativando..." : "Inabilitando..."}`
                        : picked.length
                          ? `${config.bulkLabel || "Inabilitar"} (${picked.length})`
                          : `${config.bulkLabel || "Inabilitar"} selecionados`}
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
                      {config.alwaysPick ? " Todos" : null}
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
  )
  if (layout !== "gestao") return <CadastroFrame>{page}</CadastroFrame>

  const primaryLabel = (config.cadastrarLabel || "Novo").replace(/^Cadastrar\s+/i, "Novo ")
  const gestaoPage = (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      {config.filters?.length ? (
        <form className="mb-6 grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]" onSubmit={onFilter}>
          {config.filters.map((filter) => (
            <label key={filter.key} className="block text-sm font-medium text-gray-700">
              {filter.label}
              <input
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                value={draft[filter.key] ?? ""}
                onChange={(event) => setDraft({ ...draft, [filter.key]: event.target.value })}
                autoComplete="off"
              />
            </label>
          ))}
          <div className="flex gap-2">
            <button
              className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-800"
              type="button"
              onClick={() => {
                setDraft({})
                setApplied({})
              }}
            >
              Limpar
            </button>
            <button className="rounded-xl bg-blue-500 px-4 py-2 text-sm font-semibold text-white" type="submit">
              Filtrar
            </button>
          </div>
        </form>
      ) : null}

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h2 className="flex items-center text-xl font-semibold text-blue-700">
          <Landmark className="mr-2" size={18} aria-hidden="true" />
          {config.title}
        </h2>
        <div className="flex flex-wrap items-center gap-4">
          {config.alwaysPick && config.bulkDisable && picked.length > 0 ? (
            <button
              className="flex items-center rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              type="button"
              disabled={deleting}
              onClick={() => void disableSelected()}
            >
              {deleting ? "Inativando..." : `Inativar (${picked.length})`}
            </button>
          ) : null}
          {config.inativosLabel ? (
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 select-none">
              <input
                type="checkbox"
                className="rounded"
                checked={isInactive}
                onChange={() => navigate(isInactive ? config.listPath : config.inativosPath || `${config.listPath}/inativos`)}
              />
              Ver inativos
            </label>
          ) : null}
          {config.extraActions}
          {config.cadastrarLabel && config.cadastrarPath ? (
            <button
              className="flex items-center rounded-xl bg-blue-500 px-4 py-2 text-sm font-semibold text-white shadow-sm"
              type="button"
              onClick={() => navigate(config.cadastrarPath!)}
            >
              <Plus className="mr-2" size={16} aria-hidden="true" />
              {primaryLabel}
            </button>
          ) : null}
        </div>
      </div>

      {toast ? <p className="mb-4 text-sm font-semibold text-green-700" role="status">{toast}</p> : null}
      {error ? <p className="mb-4 text-sm font-semibold text-red-700" role="alert">{error}</p> : null}

      <div className="overflow-x-auto rounded-2xl border border-gray-100 shadow-sm">
        <table className="gestao-prod-table min-w-full">
          <thead className="bg-gray-100">
            <tr>
              {picking ? (
                <th className="gestao-prod-check">
                  <input
                    type="checkbox"
                    className="rounded"
                    aria-label="Selecionar todos"
                    checked={visible.length > 0 && picked.length === visible.length}
                    onChange={(event) => setPicked(event.target.checked ? visible.map((item) => item.code) : [])}
                  />
                </th>
              ) : null}
              {config.columns.map((column) => (
                <th key={column.key} className={column.from === "action" || column.key === "atualizar" || column.key === "ordem" ? "num" : undefined}>
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((item) => (
              <tr key={item.code}>
                {picking ? (
                  <td className="gestao-prod-check">
                    <input
                      type="checkbox"
                      className="rounded"
                      aria-label={`Selecionar ${item.name}`}
                      checked={picked.includes(item.code)}
                      onChange={() => togglePicked(item.code)}
                    />
                  </td>
                ) : null}
                {config.columns.map((column) => (
                  <td
                    key={column.key}
                    className={
                      column.from === "action" || column.key === "atualizar" || column.key === "ordem"
                        ? "num text-sm"
                        : column.from === "name" || column.key === "nome"
                          ? "gestao-prod-name text-sm"
                          : "text-sm"
                    }
                  >
                    {cell(item, column)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {visible.length === 0 ? (
        <p className="mt-4 text-sm text-gray-600">{config.emptyHint || "Nenhum registro para o filtro atual."}</p>
      ) : null}
    </div>
  )

  return <CadastroFrame>{gestaoPage}</CadastroFrame>
}

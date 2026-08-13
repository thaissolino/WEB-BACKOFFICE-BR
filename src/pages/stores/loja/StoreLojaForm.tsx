import { useEffect, useMemo, useState, type ReactNode } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { api, parseError } from "../../../services/api"
import TabConfiguracoes from "./TabConfiguracoes"
import TabDados from "./TabDados"
import TabFiscal from "./TabFiscal"
import TabIntegracoes from "./TabIntegracoes"
import TabLogs from "./TabLogs"
import {
  hydrateConfiguracoes,
  hydrateDados,
  hydrateFiscal,
  hydrateIntegracoes,
} from "./defaults"
import {
  LOJA_TABS,
  parseLojaTab,
  storeLabel,
  type LojaTabId,
  type StoreChangeLogRow,
  type StoreConfiguracoes,
  type StoreDados,
  type StoreFiscal,
  type StoreIntegracoes,
  type StoreLojaRecord,
  type StoreOption,
} from "./types"
import "./loja.css"

type SaveSection = "dados" | "configuracoes" | "fiscal" | "integracoes"

export default function StoreLojaForm({
  storeId,
  apiBase,
  stores,
  onStoreChange,
  extraActions,
  backTo,
}: {
  storeId: string
  apiBase: string
  stores?: StoreOption[]
  onStoreChange?: (id: string) => void
  extraActions?: ReactNode
  backTo?: string
}) {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const tab = parseLojaTab(params.get("tab"))
  const [record, setRecord] = useState<StoreLojaRecord | null>(null)
  const [dados, setDados] = useState<StoreDados>(() => hydrateDados({}, ""))
  const [configuracoes, setConfiguracoes] = useState<StoreConfiguracoes>(() => hydrateConfiguracoes({}))
  const [fiscal, setFiscal] = useState<StoreFiscal>(() => hydrateFiscal({}, ""))
  const [integracoes, setIntegracoes] = useState<StoreIntegracoes>(() => hydrateIntegracoes({}, ""))
  const [logs, setLogs] = useState<StoreChangeLogRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState("")
  const [error, setError] = useState("")
  const [testNotice, setTestNotice] = useState("")

  const selectorStores = useMemo(() => {
    if (stores && stores.length > 0) return stores
    return record ? [{ id: record.id, name: record.name, storeCode: record.storeCode }] : []
  }, [stores, record])

  function setTab(next: LojaTabId) {
    const copy = new URLSearchParams(params)
    if (next === "dados") copy.delete("tab")
    else copy.set("tab", next)
    setParams(copy, { replace: true })
  }

  async function loadLogs(id = storeId) {
    try {
      const { data } = await api.get(`${apiBase}/${id}/loja/logs`)
      setLogs(data.logs || [])
    } catch {
      setLogs([])
    }
  }

  async function load(id = storeId) {
    setLoading(true)
    setError("")
    try {
      const { data } = await api.get(`${apiBase}/${id}/loja`)
      const store = data.store as StoreLojaRecord
      setRecord(store)
      setDados(hydrateDados(store.dados, store.name, store.document))
      setConfiguracoes(hydrateConfiguracoes(store.configuracoes))
      setFiscal(hydrateFiscal(store.fiscal, store.name))
      setIntegracoes(hydrateIntegracoes(store.integracoes, store.name, store.document))
      await loadLogs(id)
    } catch (err) {
      const parsed = parseError(err)
      setError(parsed.friend || parsed.message || "Não foi possível carregar a loja.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load(storeId)
  }, [storeId, apiBase])

  async function save(section: SaveSection) {
    setSaving(true)
    setNotice("")
    setError("")
    const payload =
      section === "dados"
        ? dados
        : section === "configuracoes"
          ? configuracoes
          : section === "fiscal"
            ? fiscal
            : integracoes
    try {
      const { data } = await api.put(`${apiBase}/${storeId}/loja`, { section, data: payload })
      const store = data.store as StoreLojaRecord
      setRecord(store)
      if (section === "dados") setDados(hydrateDados(store.dados, store.name, store.document))
      if (section === "configuracoes") setConfiguracoes(hydrateConfiguracoes(store.configuracoes))
      if (section === "fiscal") setFiscal(hydrateFiscal(store.fiscal, store.name))
      if (section === "integracoes") {
        setIntegracoes(hydrateIntegracoes(store.integracoes, store.name, store.document))
      }
      await loadLogs()
      const messages: Record<SaveSection, string> = {
        dados: "Dados salvos.",
        configuracoes: "Configurações salvas.",
        fiscal: "Dados fiscais salvos.",
        integracoes: "Integrações salvas.",
      }
      setNotice(messages[section])
    } catch (err) {
      const parsed = parseError(err)
      setError(parsed.friend || parsed.message || "Não foi possível salvar.")
    } finally {
      setSaving(false)
    }
  }

  const saveLabel =
    tab === "dados"
      ? "Salvar Dados"
      : tab === "configuracoes"
        ? "Salvar Configurações"
        : tab === "fiscal"
          ? "Salvar Dados Fiscais"
          : tab === "integracoes"
            ? "Salvar Integrações"
            : ""

  return (
    <div className="loja-page" lang="pt-BR">
      <div className="loja-top">
        <h1>LOJA</h1>
        <div className="loja-top-actions">
          {selectorStores.length > 0 ? (
            <label>
              <span className="loja-sr">Loja</span>
              <select
                className="loja-store-select"
                aria-label="Loja"
                value={storeId}
                onChange={(event) => onStoreChange?.(event.target.value)}
              >
                {selectorStores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {storeLabel({
                      ...store,
                      dados: store.id === record?.id ? dados : undefined,
                    })}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {extraActions}
        </div>
      </div>

      <div className="loja-tabs" role="tablist" aria-label="Parâmetros da loja">
        {LOJA_TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {loading ? <p>Carregando...</p> : null}
      {error ? (
        <p className="loja-status" data-tone="err" role="alert">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="loja-status" data-tone="ok" role="status">
          {notice}
        </p>
      ) : null}

      {!loading && tab === "dados" ? <TabDados value={dados} onChange={setDados} /> : null}
      {!loading && tab === "configuracoes" ? (
        <TabConfiguracoes value={configuracoes} onChange={setConfiguracoes} />
      ) : null}
      {!loading && tab === "fiscal" ? <TabFiscal value={fiscal} onChange={setFiscal} /> : null}
      {!loading && tab === "integracoes" ? (
        <TabIntegracoes
          value={integracoes}
          onChange={setIntegracoes}
          testNotice={testNotice}
          onTestSmartbis={() =>
            setTestNotice(
              integracoes.smartbis.token
                ? "Conexão SMARTBIS verificada (simulação)."
                : "Informe o token de acesso para testar.",
            )
          }
        />
      ) : null}
      {!loading && tab === "logs" ? <TabLogs logs={logs} /> : null}

      {saveLabel ? (
        <div className="loja-save">
          <button
            className="loja-btn loja-btn-green"
            type="button"
            disabled={saving || loading}
            onClick={() => save(tab as SaveSection)}
          >
            {saving ? "Salvando..." : `✓ ${saveLabel}`}
          </button>
        </div>
      ) : null}

      <p className="loja-help" style={{ textAlign: "center" }}>
        <button className="loja-btn" type="button" onClick={() => navigate(backTo || "/lojas")}>
          Voltar
        </button>
      </p>
    </div>
  )
}

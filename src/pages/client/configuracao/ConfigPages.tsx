import { FormEvent, useEffect, useMemo, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { Plus, RefreshCw } from "lucide-react"
import CadastroShell from "../cadastros/CadastroShell"
import { FormRow, RadioSimNao } from "../cadastros/catalog/FormBits"
import CatalogList, { type CatalogListConfig } from "../cadastros/catalog/CatalogList"
import {
  createCatalog,
  getCatalog,
  listCatalog,
  updateCatalog,
  type CatalogItem,
} from "../cadastros/catalog/catalogApi"
import { parseError } from "../../../services/api"
import { AtivoToggle } from "../cadastros/produtos/QuickCadWindows"
import { usePdvSession } from "../dashboard/PdvShell"
import { PLAN } from "../dashboard/mockData"

const ACTIVITY_ICONS = ["phone", "envelope", "comment", "calendar", "user", "star"] as const
const LETTER_TYPES = ["Carta", "Impressão", "Página"]
const SIGEP_TYPES = ["Pacote/Caixa", "Envelope", "Rolo/Cilindro"]
const LV_COLUMNS = [
  "Cod. Venda",
  "Cliente",
  "Data",
  "Total",
  "Status",
  "Loja",
  "Caixa",
  "Identificação",
  "Usuário",
  "Frete",
  "Itens",
  "Observação",
]
const LV_COLUMNS_KEY = "pdv-lv-print-columns"

function ThirdHint({ children }: { children: string }) {
  return <p className="pdv-cad-kicker">{children}</p>
}

export function TipoAtividadePage() {
  const [rows, setRows] = useState<CatalogItem[]>([])
  const [error, setError] = useState("")
  const [drafts, setDrafts] = useState<Record<number, { name: string; icone: string }>>({})

  function load() {
    listCatalog("activity_type")
      .then((items) => {
        setRows(items)
        setDrafts(
          Object.fromEntries(
            items.map((item) => [item.code, { name: item.name, icone: String(item.payload.icone || "phone") }]),
          ),
        )
        setError("")
      })
      .catch((err) => setError(parseError(err).friend || "Não foi possível carregar."))
  }

  useEffect(() => {
    load()
  }, [])

  async function save(item: CatalogItem) {
    const draft = drafts[item.code] ?? { name: item.name, icone: "phone" }
    if (!draft.name.trim()) return
    await updateCatalog("activity_type", item.code, {
      name: draft.name.trim(),
      payload: { ...item.payload, icone: draft.icone },
    })
    load()
  }

  async function addRow() {
    try {
      await createCatalog("activity_type", {
        name: "Novo tipo",
        payload: { icone: "star", ordem: String(rows.length + 1) },
      })
      load()
    } catch (err) {
      setError(parseError(err).friend || "Não foi possível adicionar.")
    }
  }

  return (
    <CadastroShell>
      <section className="pdv-cad-page" aria-labelledby="pdv-tipo-ativ">
        <div className="pdv-cad-sheet pdv-cad-sheet-wide">
          <h1 id="pdv-tipo-ativ">GERENCIAR CAMPOS DO CADASTRO DE ATIVIDADES</h1>
          {error ? (
            <p className="pdv-prod-status" role="alert">
              {error}
            </p>
          ) : null}
          <div className="pdv-cad-table-wrap">
            <table className="pdv-cad-table">
              <thead>
                <tr>
                  <th>Tipo Atividade</th>
                  <th>Ordem</th>
                  <th>Icone</th>
                  <th>Atualizar</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((item) => {
                  const draft = drafts[item.code] ?? { name: item.name, icone: "phone" }
                  return (
                    <tr key={item.code}>
                      <td>
                        <input
                          value={draft.name}
                          onChange={(event) =>
                            setDrafts((current) => ({
                              ...current,
                              [item.code]: { ...draft, name: event.target.value },
                            }))
                          }
                          autoComplete="off"
                        />
                      </td>
                      <td>{String(item.payload.ordem || item.code)}</td>
                      <td>
                        <select
                          value={draft.icone}
                          onChange={(event) =>
                            setDrafts((current) => ({
                              ...current,
                              [item.code]: { ...draft, icone: event.target.value },
                            }))
                          }
                          aria-label={`Icone ${item.name}`}
                        >
                          {ACTIVITY_ICONS.map((icon) => (
                            <option key={icon} value={icon}>
                              {icon}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <button
                          className="pdv-cad-icon-btn"
                          type="button"
                          aria-label={`Atualizar ${item.name}`}
                          onClick={() => save(item)}
                        >
                          <RefreshCw size={16} aria-hidden="true" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="pdv-cad-actions">
            <button className="pdv-cad-btn pdv-cad-btn-green" type="button" onClick={addRow}>
              <Plus size={16} strokeWidth={2.4} aria-hidden="true" />
              Adicionar uma novo tipo de atividade
            </button>
          </div>
        </div>
      </section>
    </CadastroShell>
  )
}

const LETTER_LIST: CatalogListConfig = {
  kind: "letter",
  title: "CARTA/PÁGINA/IMPRESSÃO",
  cadastrarLabel: "Cadastrar Carta/Página/Impressão",
  cadastrarPath: "/client/configuracao/impressao/cadastrar",
  listPath: "/client/configuracao/impressao",
  filters: [
    { key: "nome", label: "Nome", from: "name" },
    { key: "titulo", label: "Título", from: "payload", payloadKey: "titulo" },
  ],
  columns: [
    { key: "code", label: "Cod", from: "code" },
    { key: "tipo", label: "Tipo", payloadKey: "tipo" },
    { key: "nome", label: "Nome", from: "name" },
    { key: "titulo", label: "Título", payloadKey: "titulo" },
    { key: "ordem", label: "Ordem", payloadKey: "ordem" },
    { key: "ativo", label: "Ativo", from: "active" },
    { key: "atualizar", label: "Atualizar", from: "action" },
  ],
}

export function CartaList() {
  return <CatalogList config={LETTER_LIST} />
}

export function CartaForm() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const editId = Number(params.get("id") || 0)
  const [nome, setNome] = useState("")
  const [titulo, setTitulo] = useState("")
  const [tipo, setTipo] = useState("Impressão")
  const [ordem, setOrdem] = useState("1")
  const [ativo, setAtivo] = useState(true)
  const [corpo, setCorpo] = useState("")
  const [status, setStatus] = useState("")

  useEffect(() => {
    if (!editId) return
    getCatalog("letter", editId)
      .then((item) => {
        setNome(item.name)
        setTitulo(String(item.payload.titulo ?? ""))
        setTipo(String(item.payload.tipo || "Impressão"))
        setOrdem(String(item.payload.ordem ?? "1"))
        setAtivo(item.active)
        setCorpo(String(item.payload.corpo ?? ""))
      })
      .catch(() => setStatus("Não foi possível carregar."))
  }, [editId])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!nome.trim()) {
      setStatus("Informe o nome.")
      return
    }
    try {
      const payload = { titulo, tipo, ordem, corpo }
      if (editId) await updateCatalog("letter", editId, { name: nome, active: ativo, payload })
      else await createCatalog("letter", { name: nome, active: ativo, payload })
      navigate("/client/configuracao/impressao")
    } catch (err) {
      setStatus(parseError(err).friend || "Não foi possível salvar.")
    }
  }

  return (
    <CadastroShell>
      <section className="pdv-cad-page" aria-labelledby="pdv-carta-form">
        <div className="pdv-cad-sheet">
          <h1 id="pdv-carta-form">CADASTRAR CARTA/PÁGINA/IMPRESSÃO</h1>
          <button
            className="pdv-cad-btn pdv-cad-btn-back pdv-voltar"
            type="button"
            onClick={() => navigate("/client/configuracao/impressao")}
          >
            Voltar
          </button>
          <form className="pdv-cad-form" onSubmit={onSubmit}>
            <FormRow label="Nome" required>
              <input value={nome} onChange={(event) => setNome(event.target.value)} autoComplete="off" />
            </FormRow>
            <FormRow label="Título">
              <input value={titulo} onChange={(event) => setTitulo(event.target.value)} autoComplete="off" />
            </FormRow>
            <FormRow label="Tipo">
              <select value={tipo} onChange={(event) => setTipo(event.target.value)}>
                {LETTER_TYPES.map((opt) => (
                  <option key={opt}>{opt}</option>
                ))}
              </select>
            </FormRow>
            <FormRow label="Ordem">
              <input value={ordem} onChange={(event) => setOrdem(event.target.value)} autoComplete="off" />
            </FormRow>
            <FormRow label="Ativo">
              <RadioSimNao name="carta-ativo" value={ativo} onChange={setAtivo} />
            </FormRow>
            <FormRow label="Corpo">
              <textarea rows={8} value={corpo} onChange={(event) => setCorpo(event.target.value)} />
            </FormRow>
            {status ? (
              <p className="pdv-prod-status" role="status">
                {status}
              </p>
            ) : null}
            <div className="pdv-cad-form-go">
              <button className="pdv-cad-btn pdv-cad-btn-green" type="submit">
                <Plus size={16} strokeWidth={2.6} aria-hidden="true" />
                Cadastrar
              </button>
            </div>
          </form>
        </div>
      </section>
    </CadastroShell>
  )
}

const SIGEP_LIST: CatalogListConfig = {
  kind: "sigep_package",
  title: "PACOTES PARA ENCOMENDAS SIGEP",
  cadastrarLabel: "Cadastrar Pacotes",
  cadastrarPath: "/client/configuracao/pacotes-sigep/cadastrar",
  inativosLabel: "Pacotes Inativos",
  ativosLabel: "Pacotes Ativos",
  inativosPath: "/client/configuracao/pacotes-sigep/inativos",
  listPath: "/client/configuracao/pacotes-sigep",
  emptyHint: "Nenhum pacote cadastrado. Postagem SIGEP Correios não está conectada.",
  columns: [
    { key: "nome", label: "Nome", from: "name" },
    { key: "tipo", label: "Tipo", payloadKey: "tipo" },
    { key: "peso", label: "Peso", payloadKey: "peso" },
    { key: "comprimento", label: "Comprimento", payloadKey: "comprimento" },
    { key: "altura", label: "Altura", payloadKey: "altura" },
    { key: "largura", label: "Largura", payloadKey: "largura" },
    { key: "diametro", label: "Diâmetro", payloadKey: "diametro" },
    { key: "padrao", label: "Padrão", payloadKey: "padrao" },
    { key: "atualizar", label: "Atualizar", from: "action" },
  ],
}

export function SigepPacotesList({ inactive = false }: { inactive?: boolean }) {
  return (
    <CatalogList
      config={{
        ...SIGEP_LIST,
        title: inactive ? "PACOTES PARA ENCOMENDAS SIGEP INATIVOS" : SIGEP_LIST.title,
      }}
      inactive={inactive}
    />
  )
}

export function SigepPacoteForm() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const editId = Number(params.get("id") || 0)
  const [nome, setNome] = useState("")
  const [tipo, setTipo] = useState("Pacote/Caixa")
  const [peso, setPeso] = useState("")
  const [comprimento, setComprimento] = useState("")
  const [altura, setAltura] = useState("")
  const [largura, setLargura] = useState("")
  const [diametro, setDiametro] = useState("0")
  const [padrao, setPadrao] = useState(false)
  const [status, setStatus] = useState("")

  useEffect(() => {
    if (!editId) return
    getCatalog("sigep_package", editId)
      .then((item) => {
        setNome(item.name)
        setTipo(String(item.payload.tipo || "Pacote/Caixa"))
        setPeso(String(item.payload.peso ?? ""))
        setComprimento(String(item.payload.comprimento ?? ""))
        setAltura(String(item.payload.altura ?? ""))
        setLargura(String(item.payload.largura ?? ""))
        setDiametro(String(item.payload.diametro ?? "0"))
        setPadrao(Boolean(item.payload.padrao))
      })
      .catch(() => setStatus("Não foi possível carregar."))
  }, [editId])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!nome.trim()) {
      setStatus("Informe o nome.")
      return
    }
    try {
      const payload = { tipo, peso, comprimento, altura, largura, diametro, padrao }
      if (editId) await updateCatalog("sigep_package", editId, { name: nome, payload })
      else await createCatalog("sigep_package", { name: nome, payload })
      navigate("/client/configuracao/pacotes-sigep")
    } catch (err) {
      setStatus(parseError(err).friend || "Não foi possível salvar.")
    }
  }

  return (
    <CadastroShell>
      <section className="pdv-cad-page" aria-labelledby="pdv-sigep-form">
        <div className="pdv-cad-sheet">
          <h1 id="pdv-sigep-form">CADASTRAR PACOTES</h1>
          <button
            className="pdv-cad-btn pdv-cad-btn-back pdv-voltar"
            type="button"
            onClick={() => navigate("/client/configuracao/pacotes-sigep")}
          >
            Voltar
          </button>
          <ThirdHint>Dimensões ficam na loja. Postagem SIGEP Correios não está conectada.</ThirdHint>
          <form className="pdv-cad-form" onSubmit={onSubmit}>
            <FormRow label="Nome" required>
              <input value={nome} onChange={(event) => setNome(event.target.value)} autoComplete="off" />
            </FormRow>
            <FormRow label="Tipo">
              <select value={tipo} onChange={(event) => setTipo(event.target.value)}>
                {SIGEP_TYPES.map((opt) => (
                  <option key={opt}>{opt}</option>
                ))}
              </select>
            </FormRow>
            <FormRow label="Peso">
              <input value={peso} onChange={(event) => setPeso(event.target.value)} autoComplete="off" />
            </FormRow>
            <FormRow label="Comprimento">
              <input value={comprimento} onChange={(event) => setComprimento(event.target.value)} autoComplete="off" />
            </FormRow>
            <FormRow label="Altura">
              <input value={altura} onChange={(event) => setAltura(event.target.value)} autoComplete="off" />
            </FormRow>
            <FormRow label="Largura">
              <input value={largura} onChange={(event) => setLargura(event.target.value)} autoComplete="off" />
            </FormRow>
            <FormRow label="Diâmetro">
              <input value={diametro} onChange={(event) => setDiametro(event.target.value)} autoComplete="off" />
            </FormRow>
            <FormRow label="Padrão">
              <RadioSimNao name="sigep-padrao" value={padrao} onChange={setPadrao} />
            </FormRow>
            {status ? (
              <p className="pdv-prod-status" role="status">
                {status}
              </p>
            ) : null}
            <div className="pdv-cad-form-go">
              <button className="pdv-cad-btn pdv-cad-btn-green" type="submit">
                <Plus size={16} strokeWidth={2.6} aria-hidden="true" />
                Cadastrar
              </button>
            </div>
          </form>
        </div>
      </section>
    </CadastroShell>
  )
}

function readLvColumns() {
  try {
    const raw = sessionStorage.getItem(LV_COLUMNS_KEY)
    if (raw) return JSON.parse(raw) as string[]
  } catch {
    /* local */
  }
  return [...LV_COLUMNS]
}

export function RoboColunasPage() {
  const [selected, setSelected] = useState<string[]>(readLvColumns)
  const [status, setStatus] = useState("")

  function toggle(column: string) {
    setSelected((current) =>
      current.includes(column) ? current.filter((item) => item !== column) : [...current, column],
    )
  }

  function save() {
    sessionStorage.setItem(LV_COLUMNS_KEY, JSON.stringify(selected))
    setStatus("Colunas gravadas nesta loja. O Robô de Impressão LV não está conectado.")
  }

  return (
    <CadastroShell>
      <section className="pdv-cad-page" aria-labelledby="pdv-lv-cols">
        <div className="pdv-cad-sheet">
          <h1 id="pdv-lv-cols">GERENCIAR COLUNAS NO ROBÔ DE IMPRESSÃO LV</h1>
          <ThirdHint>Marque as colunas que seriam impressas. Tray / Loja Virtual não está conectada.</ThirdHint>
          <ul className="pdv-cad-check-body">
            {LV_COLUMNS.map((column) => (
              <li key={column}>
                <label>
                  <input type="checkbox" checked={selected.includes(column)} onChange={() => toggle(column)} />
                  {column}
                </label>
              </li>
            ))}
          </ul>
          <div className="pdv-cad-actions">
            <button className="pdv-cad-btn pdv-cad-btn-green" type="button" onClick={save}>
              Atualizar
            </button>
          </div>
          {status ? (
            <p className="pdv-prod-status" role="status">
              {status}
            </p>
          ) : null}
        </div>
      </section>
    </CadastroShell>
  )
}

const GROUP_LOJA_LIST: CatalogListConfig = {
  kind: "store_group",
  title: "GRUPOS DE LOJAS",
  cadastrarLabel: "Cadastrar Grupos",
  cadastrarPath: "/client/grupos-de-loja/cadastrar",
  inativosLabel: "Grupos Inativos",
  ativosLabel: "Grupos Ativos",
  inativosPath: "/client/grupos-de-loja/inativos",
  listPath: "/client/grupos-de-loja",
  columns: [
    { key: "nome", label: "Nome", from: "name" },
    { key: "atualizar", label: "Atualizar", from: "action" },
  ],
}

export function GruposLojaList({ inactive = false }: { inactive?: boolean }) {
  return (
    <CatalogList
      config={{ ...GROUP_LOJA_LIST, title: inactive ? "GRUPOS DE LOJAS INATIVOS" : GROUP_LOJA_LIST.title }}
      inactive={inactive}
    />
  )
}

export function GrupoLojaForm() {
  const navigate = useNavigate()
  const { stores } = usePdvSession()
  const [params] = useSearchParams()
  const editId = Number(params.get("id") || 0)
  const [nome, setNome] = useState("")
  const [ativo, setAtivo] = useState(true)
  const [lojas, setLojas] = useState<string[]>([])
  const [status, setStatus] = useState("")

  useEffect(() => {
    if (!editId) return
    getCatalog("store_group", editId)
      .then((item) => {
        setNome(item.name)
        setAtivo(item.active)
        setLojas(Array.isArray(item.payload.lojas) ? (item.payload.lojas as string[]) : [])
      })
      .catch(() => setStatus("Não foi possível carregar."))
  }, [editId])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!nome.trim()) {
      setStatus("Informe o nome do grupo.")
      return
    }
    try {
      const payload = { lojas }
      if (editId) await updateCatalog("store_group", editId, { name: nome, active: ativo, payload })
      else await createCatalog("store_group", { name: nome, active: ativo, payload })
      navigate("/client/grupos-de-loja")
    } catch (err) {
      setStatus(parseError(err).friend || "Não foi possível salvar.")
    }
  }

  return (
    <CadastroShell>
      <section className="pdv-cad-page" aria-labelledby="pdv-grupo-loja">
        <div className="pdv-cad-sheet">
          <h1 id="pdv-grupo-loja">{editId ? "ATUALIZAR GRUPOS" : "CADASTRAR GRUPOS"}</h1>
          <button
            className="pdv-cad-btn pdv-cad-btn-back pdv-voltar"
            type="button"
            onClick={() => navigate("/client/grupos-de-loja")}
          >
            Voltar
          </button>
          <form className="pdv-cad-form" onSubmit={onSubmit}>
            <FormRow label="Nome" required>
              <input value={nome} onChange={(event) => setNome(event.target.value)} autoComplete="off" />
            </FormRow>
            <FormRow label="Ativo">
              <RadioSimNao name="grupo-loja-ativo" value={ativo} onChange={setAtivo} />
            </FormRow>
            <FormRow label="Lojas">
              <div className="pdv-cad-check-body">
                {stores.map((store) => (
                  <label key={store.id}>
                    <input
                      type="checkbox"
                      checked={lojas.includes(store.id)}
                      onChange={() =>
                        setLojas((current) =>
                          current.includes(store.id)
                            ? current.filter((id) => id !== store.id)
                            : [...current, store.id],
                        )
                      }
                    />
                    {store.label}
                  </label>
                ))}
              </div>
            </FormRow>
            {status ? (
              <p className="pdv-prod-status" role="status">
                {status}
              </p>
            ) : null}
            <div className="pdv-cad-form-go">
              <button className="pdv-cad-btn pdv-cad-btn-green" type="submit">
                <Plus size={16} strokeWidth={2.6} aria-hidden="true" />
                Cadastrar
              </button>
            </div>
          </form>
        </div>
      </section>
    </CadastroShell>
  )
}

type SharedRow = {
  storeId: string
  loja: string
  razao: string
  ativo: boolean
  prioridade: string
  estoqueVirtual: boolean
  custoMedio: boolean
  code?: number
}

export function EstoqueCompartilhadoPage() {
  const { stores, storeId } = usePdvSession()
  const [rows, setRows] = useState<SharedRow[]>([])
  const [status, setStatus] = useState("")

  const others = useMemo(() => stores.filter((item) => item.id !== storeId), [stores, storeId])

  function load() {
    listCatalog("shared_stock")
      .then((items) => {
        const byStore = new Map(items.map((item) => [String(item.payload.storeId || item.name), item]))
        setRows(
          others.map((store) => {
            const saved = byStore.get(store.id)
            return {
              storeId: store.id,
              loja: store.label,
              razao: String(saved?.payload.razao || store.name),
              ativo: saved ? saved.active : false,
              prioridade: String(saved?.payload.prioridade || "Não"),
              estoqueVirtual: Boolean(saved?.payload.estoqueVirtual),
              custoMedio: Boolean(saved?.payload.custoMedio),
              code: saved?.code,
            }
          }),
        )
      })
      .catch(() => {
        setRows(
          others.map((store) => ({
            storeId: store.id,
            loja: store.label,
            razao: store.name,
            ativo: false,
            prioridade: "Não",
            estoqueVirtual: false,
            custoMedio: false,
          })),
        )
      })
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [others.map((item) => item.id).join("|")])

  async function save(row: SharedRow) {
    const payload = {
      storeId: row.storeId,
      razao: row.razao,
      prioridade: row.prioridade,
      estoqueVirtual: row.estoqueVirtual,
      custoMedio: row.custoMedio,
    }
    try {
      if (row.code) await updateCatalog("shared_stock", row.code, { name: row.loja, active: row.ativo, payload })
      else await createCatalog("shared_stock", { name: row.loja, active: row.ativo, payload })
      setStatus("Atualizado.")
      load()
    } catch (err) {
      setStatus(parseError(err).friend || "Não foi possível atualizar.")
    }
  }

  return (
    <CadastroShell>
      <section className="pdv-cad-page" aria-labelledby="pdv-est-comp">
        <div className="pdv-cad-sheet pdv-cad-sheet-wide">
          <h1 id="pdv-est-comp">GERENCIAR LOJAS PARA ESTOQUE COMPARTILHADO</h1>
          <div className="pdv-cad-table-wrap">
            <table className="pdv-cad-table">
              <thead>
                <tr>
                  <th>Ativo</th>
                  <th>Loja</th>
                  <th>Razão</th>
                  <th>Prioridade</th>
                  <th>Estoque Virtual Compartilhado</th>
                  <th>Custo Médio Compartilhado</th>
                  <th>Atualizar</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.storeId}>
                    <td>
                      <AtivoToggle
                        value={row.ativo}
                        onChange={(next) => setRows((current) => current.map((item) => (item.storeId === row.storeId ? { ...item, ativo: next } : item)))}
                      />
                    </td>
                    <td>{row.loja}</td>
                    <td>{row.razao}</td>
                    <td>
                      <select
                        value={row.prioridade}
                        onChange={(event) =>
                          setRows((current) =>
                            current.map((item) =>
                              item.storeId === row.storeId ? { ...item, prioridade: event.target.value } : item,
                            ),
                          )
                        }
                      >
                        <option>Não</option>
                        <option>Sim</option>
                      </select>
                    </td>
                    <td>
                      <AtivoToggle
                        value={row.estoqueVirtual}
                        onChange={(next) =>
                          setRows((current) =>
                            current.map((item) => (item.storeId === row.storeId ? { ...item, estoqueVirtual: next } : item)),
                          )
                        }
                      />
                    </td>
                    <td>
                      <AtivoToggle
                        value={row.custoMedio}
                        onChange={(next) =>
                          setRows((current) =>
                            current.map((item) => (item.storeId === row.storeId ? { ...item, custoMedio: next } : item)),
                          )
                        }
                      />
                    </td>
                    <td>
                      <button
                        className="pdv-cad-icon-btn"
                        type="button"
                        aria-label={`Atualizar ${row.loja}`}
                        onClick={() => save(row)}
                      >
                        <RefreshCw size={16} aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length === 0 ? <p className="pdv-cad-kicker">Nenhuma outra loja para compartilhar estoque.</p> : null}
          {status ? (
            <p className="pdv-prod-status" role="status">
              {status}
            </p>
          ) : null}
        </div>
      </section>
    </CadastroShell>
  )
}

export function MeuPlanoPage() {
  return (
    <CadastroShell>
      <section className="pdv-cad-page" aria-labelledby="pdv-meu-plano">
        <div className="pdv-cad-sheet">
          <h1 id="pdv-meu-plano">MEU PLANO, MENSALIDADES E CONTRATO</h1>
          <ul className="pdv-facts">
            <li>
              <span>Código da loja para suporte</span>
              <strong>{PLAN.storeCode}</strong>
            </li>
            <li>
              <span>Plano</span>
              <strong>{PLAN.name}</strong>
            </li>
            <li>
              <span>Produto</span>
              <strong>{PLAN.product}</strong>
            </li>
            <li>
              <span>Usuário</span>
              <strong>{PLAN.user}</strong>
            </li>
            <li>
              <span>PDV</span>
              <strong>{PLAN.pdv}</strong>
            </li>
            <li>
              <span>Armazenamento</span>
              <strong>{PLAN.storage}</strong>
            </li>
            <li>
              <span>Arquivos</span>
              <strong>{PLAN.files}</strong>
            </li>
            <li>
              <span>Ultimo Pagto</span>
              <strong>{PLAN.lastPayment}</strong>
            </li>
            <li>
              <span>Mensalidade</span>
              <strong>{PLAN.monthly}</strong>
            </li>
          </ul>
          <h2 className="pdv-cad-sub">Mensalidades</h2>
          <div className="pdv-cad-table-wrap">
            <table className="pdv-cad-table">
              <thead>
                <tr>
                  <th>Competência</th>
                  <th>Valor</th>
                  <th>Vencimento</th>
                  <th>Status</th>
                  <th>Boleto</th>
                </tr>
              </thead>
              <tbody />
            </table>
          </div>
          <ThirdHint>Contrato da loja. Gateway de cobrança / boleto não está conectado.</ThirdHint>
        </div>
      </section>
    </CadastroShell>
  )
}

export function ParametrosSimplificados() {
  const navigate = useNavigate()
  return (
    <CadastroShell>
      <section className="pdv-cad-page" aria-labelledby="pdv-nfe-simp">
        <div className="pdv-cad-sheet pdv-cad-sheet-wide">
          <h1 id="pdv-nfe-simp">PARÂMETROS SIMPLIFICADOS</h1>
          <div className="pdv-cad-actions">
            <button className="pdv-cad-btn pdv-cad-btn-green" type="button">
              Novo Parâmetro
            </button>
            <button
              className="pdv-cad-btn pdv-cad-btn-blue"
              type="button"
              onClick={() => navigate("/client/configuracao/nfe-avancado")}
            >
              Parâmetros Avançados
            </button>
          </div>
          <div className="pdv-cad-table-wrap">
            <table className="pdv-cad-table">
              <thead>
                <tr>
                  <th>Regra</th>
                  <th>NCM</th>
                  <th>CST</th>
                  <th>Alíquota</th>
                  <th>UF</th>
                  <th>Ativo</th>
                  <th>Atualizar</th>
                </tr>
              </thead>
              <tbody />
            </table>
          </div>
          <ThirdHint>Regras fiscais da loja. Emissão SEFAZ permanece fora desta tela.</ThirdHint>
        </div>
      </section>
    </CadastroShell>
  )
}

const CARRIER_LIST: CatalogListConfig = {
  kind: "carrier",
  title: "TRANSPORTADORAS",
  cadastrarLabel: "Cadastrar Transportadora",
  cadastrarPath: "/client/configuracao/transportadora/cadastrar",
  listPath: "/client/configuracao/transportadora",
  columns: [
    { key: "nome", label: "Nome", from: "name" },
    { key: "placa", label: "Placa", payloadKey: "placa" },
    { key: "cidade", label: "Cidade", payloadKey: "cidade" },
    { key: "emailXml", label: "E-mail p/envio xml", payloadKey: "emailXml" },
    { key: "atualizar", label: "Atualizar", from: "action" },
  ],
}

export function TransportadoraList() {
  return <CatalogList config={CARRIER_LIST} />
}

export function TransportadoraForm() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const editId = Number(params.get("id") || 0)
  const [nome, setNome] = useState("")
  const [placa, setPlaca] = useState("")
  const [cidade, setCidade] = useState("")
  const [emailXml, setEmailXml] = useState("")
  const [status, setStatus] = useState("")

  useEffect(() => {
    if (!editId) return
    getCatalog("carrier", editId)
      .then((item) => {
        setNome(item.name)
        setPlaca(String(item.payload.placa ?? ""))
        setCidade(String(item.payload.cidade ?? ""))
        setEmailXml(String(item.payload.emailXml ?? ""))
      })
      .catch(() => setStatus("Não foi possível carregar."))
  }, [editId])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!nome.trim()) {
      setStatus("Informe o nome.")
      return
    }
    try {
      const payload = { placa, cidade, emailXml }
      if (editId) await updateCatalog("carrier", editId, { name: nome, payload })
      else await createCatalog("carrier", { name: nome, payload })
      navigate("/client/configuracao/transportadora")
    } catch (err) {
      setStatus(parseError(err).friend || "Não foi possível salvar.")
    }
  }

  return (
    <CadastroShell>
      <section className="pdv-cad-page" aria-labelledby="pdv-transp-form">
        <div className="pdv-cad-sheet">
          <h1 id="pdv-transp-form">CADASTRAR TRANSPORTADORA</h1>
          <button
            className="pdv-cad-btn pdv-cad-btn-back pdv-voltar"
            type="button"
            onClick={() => navigate("/client/configuracao/transportadora")}
          >
            Voltar
          </button>
          <form className="pdv-cad-form" onSubmit={onSubmit}>
            <FormRow label="Nome" required>
              <input value={nome} onChange={(event) => setNome(event.target.value)} autoComplete="off" />
            </FormRow>
            <FormRow label="Placa">
              <input value={placa} onChange={(event) => setPlaca(event.target.value)} autoComplete="off" />
            </FormRow>
            <FormRow label="Cidade">
              <input value={cidade} onChange={(event) => setCidade(event.target.value)} autoComplete="off" />
            </FormRow>
            <FormRow label="E-mail p/envio xml">
              <input value={emailXml} onChange={(event) => setEmailXml(event.target.value)} autoComplete="off" />
            </FormRow>
            {status ? (
              <p className="pdv-prod-status" role="status">
                {status}
              </p>
            ) : null}
            <div className="pdv-cad-form-go">
              <button className="pdv-cad-btn pdv-cad-btn-green" type="submit">
                <Plus size={16} strokeWidth={2.6} aria-hidden="true" />
                Cadastrar
              </button>
            </div>
          </form>
        </div>
      </section>
    </CadastroShell>
  )
}

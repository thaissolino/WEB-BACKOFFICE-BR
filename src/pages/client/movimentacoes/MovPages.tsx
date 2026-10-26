import FilterPage from "../pdv/FilterPage"
import SearchableSelect from "../cadastros/produtos/SearchableSelect"
import { CadastroFrame } from "../cadastros/CadastroShell"
import { useLocation, useNavigate } from "react-router-dom"
import { FormEvent, MouseEvent, useRef, useState } from "react"
import { api } from "../../../services/api"
import { FormRow, DatePreset } from "../cadastros/catalog/FormBits"
import { clientIdDoLojista, createCatalog, deleteCatalog, lancamentoDaLoja, lancamentoDoPainel, listCatalog, type CatalogItem } from "../cadastros/catalog/catalogApi"
import { listLojaCaixas } from "../cadastros/financeiro/caixaApi"
import { parseError } from "../../../services/api"
import { avisarSalvo } from "../avisoSalvo"
import { CheckCircle2, ChevronDown, Clock, Paperclip, Pencil, Plus, RotateCcw, Search, Trash2, X } from "lucide-react"
import { useEffect, useMemo } from "react"
import "../vendas/pedidos.css"
import { todayIso } from "../../../utils/todayIso"
import { usePdvSession } from "../dashboard/PdvShell"
import { STORE_STORAGE_KEY } from "../dashboard/mockData"
import { filterLojaSales, EMPTY_SALE_FILTERS, type SaleFilters } from "./lojaSalesFilters"
import { SaleDetailPanel, VendasMovimento, listLojaSales, type LojaPdvSale } from "./LojaVendasPainel"
import { formatMoneyRs } from "../cadastros/produtos/types"
import PdvOverlayModal from "../dashboard/PdvOverlayModal"

const VENDA_COLS = [
  "Visualizar",
  "Cod. Vendas",
  "Loja",
  "Caixa",
  "Identificação",
  "Cliente",
  "Usuário",
  "Data Abertura",
  "Data Conclusão",
  "Total",
  "Frete",
  "Status",
  "Gerenciar",
]

const VENDA_FIELDS = [
  { key: "cod", label: "Cod. Vendas" },
  { key: "doc", label: "CNPJ / CPF" },
  { key: "nome", label: "Nome do Cliente" },
  { key: "abertura", label: "Data início da abertura", kind: "date" as const },
]

const VENDA_ACTIONS = [
  { label: "Concluídas", href: "/client/movimentacoes/vendas/concluidas" },
  { label: "Abertas", tone: "blue" as const, href: "/client/movimentacoes/vendas/abertas" },
  { label: "Nova", tone: "green" as const, href: "/client/pdv" },
]

export function VendasTodas() {
  return <VendasMovimento status="todas" />
}
export function VendasAbertas() {
  return <VendasMovimento status="espera" />
}
export function VendasConcluidas() {
  return <VendasMovimento status="finalizada" />
}
export function VendasEstornadas() {
  return <VendasMovimento status="estornada" />
}
export function PreVendas() {
  return <FilterPage title="PRÉ VENDAS" actions={VENDA_ACTIONS} fields={VENDA_FIELDS} columns={VENDA_COLS} />
}

export function PainelEntregas() {
  return (
    <CadastroFrame>
      <section className="pdv-cad-page" aria-labelledby="pdv-entregas">
        <div className="pdv-cad-sheet">
          <h1 id="pdv-entregas">PAINEL DE ENTREGAS</h1>
          <div className="pdv-loc-kanban">
            <p className="pdv-cad-kicker">Nenhuma entrega em andamento.</p>
          </div>
        </div>
      </section>
    </CadastroFrame>
  )
}

function brl(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

function useFinalizedSales() {
  const [sales, setSales] = useState<LojaPdvSale[]>([])
  const [hint, setHint] = useState("Carregando...")
  useEffect(() => {
    listLojaSales("finalizada")
      .then((rows) => {
        setSales(rows)
        setHint(rows.length ? "" : "Nenhuma venda registrada no caixa.")
      })
      .catch((err) => setHint(parseError(err).friend || "Não foi possível carregar o caixa."))
  }, [])
  return { sales, hint }
}

function quandoCaixa(value?: string | null) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return `${date.toLocaleDateString("pt-BR")} ${date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
}

function dataCaixaBr(iso: string) {
  const [year, month, day] = iso.split("-")
  if (!year || !month || !day) return ""
  return `${day}/${month}/${year}`
}

function periodoCaixa(inicio: string, fim: string) {
  const a = dataCaixaBr(inicio)
  const b = dataCaixaBr(fim)
  if (a && b) return `Período de ${a} a ${b}`
  if (a) return `A partir de ${a}`
  if (b) return `Até ${b}`
  return "Período todo"
}

function resumoFiltrosCaixa(filters: SaleFilters) {
  const partes = [periodoCaixa(filters.inicio, filters.fim), `Caixa: ${filters.caixa || "Todos"}`]
  if (filters.obs?.trim()) partes.push(`Obs: ${filters.obs.trim()}`)
  if (filters.forma?.trim()) partes.push(filters.forma.trim())
  if (filters.cod.trim()) partes.push(`Venda: ${filters.cod.trim()}`)
  if (filters.nome.trim()) partes.push(`Cliente: ${filters.nome.trim()}`)
  if (filters.estornadas === false) partes.push("Sem estornadas")
  return `Filtros: ${partes.join(" · ")}`
}

type CaixaAnexo = {
  id: string
  caixaName: string
  method: string
  receiptDate: string
  fileName: string
  contentType: string
}

function AnexosCaixa({
  caixa,
  method,
  date,
  items,
  onClose,
  onChange,
}: {
  caixa: string
  method: string
  date: string
  items: CaixaAnexo[]
  onClose: () => void
  onChange: () => void
}) {
  const [receiptDate, setReceiptDate] = useState(date)
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [erro, setErro] = useState("")
  const [preview, setPreview] = useState<{ url: string; name: string; image: boolean } | null>(null)

  useEffect(() => {
    return () => {
      if (preview?.url) URL.revokeObjectURL(preview.url)
    }
  }, [preview])

  async function enviar(event: FormEvent) {
    event.preventDefault()
    if (!file) {
      setErro("Escolha o comprovante.")
      return
    }
    setBusy(true)
    setErro("")
    const body = new FormData()
    body.append("file", file)
    try {
      await api.post("/clients/caixa-anexos", body, {
        params: { caixa, method, date: receiptDate },
      })
      setFile(null)
      onChange()
    } catch (err) {
      setErro(parseError(err).friend || "Não foi possível enviar o comprovante.")
    } finally {
      setBusy(false)
    }
  }

  async function abrir(item: CaixaAnexo) {
    setErro("")
    try {
      const { data } = await api.get(`/clients/caixa-anexos/${item.id}/file`, { responseType: "blob" })
      const blob = data as Blob
      const url = URL.createObjectURL(blob)
      setPreview((current) => {
        if (current?.url) URL.revokeObjectURL(current.url)
        return { url, name: item.fileName, image: blob.type.startsWith("image/") }
      })
    } catch (err) {
      setErro(parseError(err).friend || "Não foi possível abrir o comprovante.")
    }
  }

  async function remover(item: CaixaAnexo) {
    setErro("")
    try {
      await api.delete(`/clients/caixa-anexos/${item.id}`)
      if (preview?.name === item.fileName) setPreview(null)
      onChange()
    } catch (err) {
      setErro(parseError(err).friend || "Não foi possível remover o comprovante.")
    }
  }

  return (
    <PdvOverlayModal open title={`Anexos ${method}`} size="form" icon={<Paperclip size={18} />} onClose={onClose}>
      <form className="pdv-caixa-anexo" onSubmit={enviar}>
        <label>
          Caixa
          <input value={caixa} readOnly />
        </label>
        <label>
          Data comprovante
          <input type="date" value={receiptDate} onChange={(event) => setReceiptDate(event.target.value)} />
        </label>
        <div className="pdv-caixa-anexo-file">
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
          <button className="pdv-cad-btn pdv-cad-btn-blue" type="submit" disabled={busy}>
            {busy ? "Enviando..." : "Enviar"}
          </button>
        </div>
        {erro ? <p className="pdv-caixa-anexo-erro">{erro}</p> : null}
        <ul>
          {items.length === 0 ? <li>Nenhum comprovante neste período.</li> : null}
          {items.map((item) => (
            <li key={item.id}>
              <button type="button" onClick={() => void abrir(item)}>
                ({dataCaixaBr(item.receiptDate)}) {item.fileName}
              </button>
              <button type="button" aria-label="Remover comprovante" onClick={() => void remover(item)}>
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
        {preview ? (
          preview.image ? (
            <img src={preview.url} alt={preview.name} />
          ) : (
            <iframe title={preview.name} src={preview.url} />
          )
        ) : null}
      </form>
    </PdvOverlayModal>
  )
}

export function RelatorioCaixa() {
  const [sales, setSales] = useState<LojaPdvSale[]>([])
  const [caixasCad, setCaixasCad] = useState<string[]>([])
  const [hint, setHint] = useState("Carregando...")
  const [draft, setDraft] = useState<SaleFilters>(EMPTY_SALE_FILTERS)
  const [filters, setFilters] = useState<SaleFilters>(EMPTY_SALE_FILTERS)
  const [modo, setModo] = useState<"expandido" | "retraido">("expandido")
  const [forcado, setForcado] = useState<Record<string, boolean>>({})
  const [detail, setDetail] = useState<LojaPdvSale | null>(null)
  const [anexos, setAnexos] = useState<CaixaAnexo[]>([])
  const [anexoAlvo, setAnexoAlvo] = useState<{ caixa: string; method: string } | null>(null)

  useEffect(() => {
    Promise.all([listLojaSales("finalizada"), listLojaSales("estornada")])
      .then(([fechadas, estornadas]) => {
        const rows = [...fechadas, ...estornadas]
        setSales(rows)
        setHint(rows.length ? "" : "Nenhuma venda registrada no caixa.")
      })
      .catch((err) => setHint(parseError(err).friend || "Não foi possível carregar o caixa."))
    listLojaCaixas(true)
      .then((items) => setCaixasCad(items.map((item) => item.name.trim()).filter(Boolean)))
      .catch(() => setCaixasCad([]))
  }, [])

  useEffect(() => {
    api
      .get("/clients/caixa-anexos", { params: { inicio: filters.inicio, fim: filters.fim } })
      .then(({ data }) => setAnexos(data.items || []))
      .catch(() => setAnexos([]))
  }, [filters.inicio, filters.fim])

  const nomesCaixa = useMemo(() => {
    const nomes = new Set<string>(caixasCad)
    sales.forEach((sale) => {
      const nome = sale.caixaName.trim()
      if (nome) nomes.add(nome)
    })
    return [...nomes].sort((a, b) => a.localeCompare(b, "pt-BR"))
  }, [caixasCad, sales])

  const formas = useMemo(() => {
    const nomes = new Set<string>()
    sales.forEach((sale) => {
      sale.payments.forEach((pay) => {
        const method = pay.method.trim()
        if (method) nomes.add(method)
      })
    })
    return [...nomes].sort((a, b) => a.localeCompare(b, "pt-BR"))
  }, [sales])

  const grupos = useMemo(() => {
    const filtered = filterLojaSales(sales, filters)
    const map = new Map<string, LojaPdvSale[]>()
    filtered.forEach((sale) => {
      const nome = sale.caixaName.trim() || "Sem caixa"
      const list = map.get(nome) || []
      list.push(sale)
      map.set(nome, list)
    })
    if (filters.caixa && filters.caixa !== "Todos" && !map.has(filters.caixa)) map.set(filters.caixa, [])
    return [...map.entries()]
      .map(([nome, list]) => {
        const pays = new Map<string, number>()
        list.sort((a, b) => new Date(a.finalizedAt || a.createdAt).getTime() - new Date(b.finalizedAt || b.createdAt).getTime())
        const forma = (filters.forma || "").trim().toLowerCase()
        list.forEach((sale) => {
          const linhas = sale.payments.length ? sale.payments : [{ method: "Sem forma", amount: sale.total }]
          linhas.forEach((pay) => {
            const method = pay.method.trim() || "Sem forma"
            if (forma && method.toLowerCase() !== forma) return
            pays.set(method, (pays.get(method) || 0) + pay.amount)
          })
        })
        const fechamento = [...pays.values()].reduce((sum, value) => sum + value, 0)
        return { nome, list, pays, fechamento }
      })
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
  }, [filters, sales])

  function aberto(nome: string) {
    if (nome in forcado) return forcado[nome]
    return modo === "expandido"
  }

  function escolherModo(next: "expandido" | "retraido") {
    setModo(next)
    setForcado({})
  }

  return (
    <CadastroFrame>
      <section className="pdv-cad-page pdv-cli-page pdv-caixa-rel" aria-labelledby="pdv-caixa-rel-title">
        <div className="pdv-cad-sheet">
          <h1 id="pdv-caixa-rel-title">RELATÓRIO DE CAIXA</h1>
          <form
            className="pdv-caixa-rel-filtros"
            onSubmit={(event) => {
              event.preventDefault()
              setFilters(draft)
            }}
          >
            <label>
              Data Caixa início
              <span className="pdv-date-field">
                <input type="date" value={draft.inicio} onChange={(event) => setDraft({ ...draft, inicio: event.target.value })} />
                <DatePreset onPick={(inicio, fim) => setDraft({ ...draft, inicio, fim })} />
              </span>
            </label>
            <label>
              Data Caixa fim
              <span className="pdv-date-field">
                <input type="date" value={draft.fim} onChange={(event) => setDraft({ ...draft, fim: event.target.value })} />
                <DatePreset onPick={(inicio, fim) => setDraft({ ...draft, inicio, fim })} />
              </span>
            </label>
            <label>
              Caixa
              <SearchableSelect
                value={draft.caixa === "Todos" ? "" : draft.caixa}
                emptyLabel="Todos"
                options={nomesCaixa}
                onChange={(next) => setDraft({ ...draft, caixa: !next || next === "Todos" ? "Todos" : next })}
              />
            </label>
            <label>
              Observação
              <input type="text" value={draft.obs || ""} onChange={(event) => setDraft({ ...draft, obs: event.target.value })} />
            </label>
            <label>
              Tipo Financeiro
              <SearchableSelect
                value={draft.forma || ""}
                emptyLabel="Todos"
                options={formas}
                onChange={(next) => setDraft({ ...draft, forma: next === "Todos" ? "" : next })}
              />
            </label>
            <label>
              Código Venda
              <input type="text" value={draft.cod} onChange={(event) => setDraft({ ...draft, cod: event.target.value })} />
            </label>
            <label>
              Código do Cliente
              <input type="text" value={draft.nome} onChange={(event) => setDraft({ ...draft, nome: event.target.value })} />
            </label>
            <label>
              Exibir Estornadas
              <SearchableSelect
                hideEmpty
                value={draft.estornadas === false ? "Não" : "Sim"}
                options={["Sim", "Não"]}
                onChange={(next) => setDraft({ ...draft, estornadas: next !== "Não" })}
              />
            </label>
            <div className="pdv-caixa-rel-modos">
              <span>Visualizar relatório</span>
              <button type="button" aria-pressed={modo === "expandido"} onClick={() => escolherModo("expandido")}>Expandido</button>
              <button type="button" aria-pressed={modo === "retraido"} onClick={() => escolherModo("retraido")}>Retraído</button>
            </div>
            <div className="pdv-caixa-rel-go">
              <button className="pdv-cad-btn" type="button" onClick={() => { setDraft(EMPTY_SALE_FILTERS); setFilters(EMPTY_SALE_FILTERS) }}>Limpar</button>
              <button className="pdv-cad-btn pdv-cad-btn-blue" type="submit">Filtrar</button>
            </div>
          </form>
          <p className="pdv-caixa-rel-filtros-resumo">{resumoFiltrosCaixa(filters)}</p>

          {grupos.length === 0 ? <p className="pdv-caixa-rel-vazio">{hint || "Nenhuma movimentação para o filtro atual."}</p> : null}

          {grupos.map((grupo) => {
            const open = aberto(grupo.nome)
            return (
              <article className="pdv-caixa-rel-caixa" key={grupo.nome} data-open={open ? "true" : undefined}>
                <header>
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => setForcado((current) => ({ ...current, [grupo.nome]: !open }))}
                  >
                    <ChevronDown size={16} aria-hidden="true" />
                    {grupo.nome}
                  </button>
                  <span>{grupo.list.length} movimentações</span>
                </header>
                {open ? (
                  <table className="pdv-caixa-rel-mov">
                    <thead>
                      <tr>
                        <th>Pago no dia</th>
                        <th>Código da venda</th>
                        <th>Obs</th>
                        <th>Cliente</th>
                        <th>Usuário</th>
                        <th>Forma de pagamento</th>
                        <th>Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {grupo.list.length === 0 ? (
                        <tr><td colSpan={7}>Nenhuma movimentação neste caixa.</td></tr>
                      ) : grupo.list.flatMap((sale) => {
                        const forma = (filters.forma || "").trim().toLowerCase()
                        const linhas = (sale.payments.length
                          ? sale.payments
                          : [{ method: "Sem forma", amount: sale.total }]
                        ).filter((pay) => !forma || (pay.method.trim() || "Sem forma").toLowerCase() === forma)
                        return linhas.map((pay, index) => (
                          <tr key={`${sale.id}-${index}`}>
                            <td>{quandoCaixa(sale.finalizedAt || sale.createdAt)}</td>
                            <td>
                              <button type="button" onClick={() => setDetail(sale)}>{sale.code}</button>
                            </td>
                            <td>{sale.notes?.trim() || ""}</td>
                            <td>{sale.customerName || ""}</td>
                            <td>{sale.sellerName || ""}</td>
                            <td>{pay.method}</td>
                            <td className="num">{formatMoneyRs(pay.amount)}</td>
                          </tr>
                        ))
                      })}
                      <tr className="pdv-caixa-rel-fecha">
                        <td colSpan={6}>Fechamento</td>
                        <td className="num">{formatMoneyRs(grupo.fechamento)}</td>
                      </tr>
                    </tbody>
                  </table>
                ) : null}
                <footer className="pdv-caixa-rel-tots">
                  {[...grupo.pays.entries()].map(([method, total]) => {
                    const qtd = anexos.filter((item) => item.caixaName === grupo.nome && item.method === method).length
                    return (
                      <p key={method}>
                        <span>{method}</span>
                        <strong>
                          {formatMoneyRs(total)}
                          <button
                            type="button"
                            className="pdv-caixa-rel-clip"
                            data-count={qtd ? "true" : undefined}
                            aria-label={`Anexos de ${method}`}
                            onClick={() => setAnexoAlvo({ caixa: grupo.nome, method })}
                          >
                            <Paperclip size={14} aria-hidden="true" />
                            {qtd ? <em>{qtd}</em> : null}
                          </button>
                        </strong>
                      </p>
                    )
                  })}
                  <p className="is-fecha"><span>Fechamento</span><strong>{formatMoneyRs(grupo.fechamento)}</strong></p>
                </footer>
              </article>
            )
          })}
        </div>
      </section>
      {anexoAlvo ? (
        <AnexosCaixa
          caixa={anexoAlvo.caixa}
          method={anexoAlvo.method}
          date={filters.fim || filters.inicio || todayIso()}
          items={anexos.filter((item) => item.caixaName === anexoAlvo.caixa && item.method === anexoAlvo.method)}
          onClose={() => setAnexoAlvo(null)}
          onChange={() => {
            api
              .get("/clients/caixa-anexos", { params: { inicio: filters.inicio, fim: filters.fim } })
              .then(({ data }) => setAnexos(data.items || []))
              .catch(() => undefined)
          }}
        />
      ) : null}
      {detail ? <SaleDetailPanel sale={detail} onClose={() => setDetail(null)} /> : null}
    </CadastroFrame>
  )
}
export function RelatorioContaCorrente() {
  const [rows, setRows] = useState<string[][]>([])
  const [hint, setHint] = useState("Carregando o caixa…")

  useEffect(() => {
    api
      .get("/clients/conta")
      .then(({ data }) => {
        const balance = Number(data?.balance) || 0
        const lines = Array.isArray(data?.lines) ? data.lines : []
        setRows(
          lines.map((line: { date: string; description: string; value: number; balance: number }) => {
            const amount = Number(line.value) || 0
            const money = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
            return [
              new Date(line.date).toLocaleString("pt-BR"),
              line.description || "—",
              amount < 0 ? money(Math.abs(amount)) : "",
              amount > 0 ? money(amount) : "",
              money(Number(line.balance) || 0),
            ]
          }),
        )
        setHint(
          lines.length
            ? `Saldo ${balance.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}. Valor negativo é o que você deve.`
            : "Nenhum lançamento no caixa.",
        )
      })
      .catch(() => {
        setRows([])
        setHint("Não foi possível abrir o caixa.")
      })
  }, [])

  return (
    <FilterPage
      title="RELATÓRIO DE CONTA CORRENTE"
      fields={[
        { key: "inicio", label: "Data inicio", kind: "date" },
        { key: "fim", label: "Data fim", kind: "date" },
      ]}
      columns={["Data", "Histórico", "Débito", "Crédito", "Saldo"]}
      rows={rows}
      hint={hint}
    />
  )
}
export function RelatorioCaixaDetalhado() {
  const { sales, hint } = useFinalizedSales()
  const rows = sales.flatMap((sale) => {
    const when = new Date(sale.finalizedAt || sale.createdAt).toLocaleString("pt-BR")
    if (!sale.payments.length) {
      return [[when, sale.caixaName || "Sem caixa", "—", brl(sale.total)]]
    }
    return sale.payments.map((pay) => [when, sale.caixaName || "Sem caixa", pay.method, brl(pay.amount)])
  })
  return (
    <FilterPage
      title="RELATÓRIO DE CAIXA DETALHADO"
      fields={[
        { key: "inicio", label: "Data Caixa inicio", kind: "date" },
        { key: "fim", label: "Data Caixa fim", kind: "date" },
      ]}
      columns={["Data", "Caixa", "Forma de Pagamento", "Valor"]}
      rows={rows}
      hint={hint || undefined}
    />
  )
}
export function ConciliacaoBancaria() {
  return (
    <FilterPage
      title="CONCILIAÇÃO BANCÁRIA"
      fields={[
        { key: "inicio", label: "Data inicio", kind: "date" },
        { key: "fim", label: "Data fim", kind: "date" },
        { key: "conta", label: "Conta", kind: "select", options: ["Todas"] },
      ]}
      columns={["Data", "Documento", "Histórico", "Valor", "Conciliado"]}
    />
  )
}

export function ContasReceber() {
  return (
    <FilterPage
      title="CONTAS A RECEBER"
      fields={[
        { key: "cliente", label: "Cliente" },
        { key: "venc", label: "Vencimento", kind: "date" },
        { key: "pago", label: "Pago", kind: "select", options: ["Todos", "Sim", "Não"] },
        { key: "forma", label: "Forma de Pagamento", kind: "select", options: ["Todos", "Cartão", "Cheque", "Crediário"] },
      ]}
      columns={["Cliente", "Documento", "Vencimento", "Valor", "Pago"]}
    />
  )
}
export function ContasPagar() {
  return (
    <FilterPage
      title="CONTAS A PAGAR"
      fields={[
        { key: "fornecedor", label: "Fornecedor" },
        { key: "venc", label: "Vencimento", kind: "date" },
        { key: "pago", label: "Pago", kind: "select", options: ["Todos", "Sim", "Não"] },
      ]}
      columns={["Fornecedor", "Documento", "Vencimento", "Valor", "Pago"]}
    />
  )
}
export function FluxoCaixa() {
  const { sales, hint } = useFinalizedSales()
  const grouped = new Map<string, number>()
  sales.forEach((sale) => {
    const day = new Date(sale.finalizedAt || sale.createdAt).toLocaleDateString("pt-BR")
    grouped.set(day, (grouped.get(day) || 0) + sale.total)
  })
  let balance = 0
  const rows = [...grouped.entries()].map(([day, total]) => {
    balance += total
    return [day, brl(total), brl(0), brl(balance)]
  })
  return (
    <FilterPage
      title="FLUXO DE CAIXA"
      fields={[
        { key: "inicio", label: "Data inicio", kind: "date" },
        { key: "fim", label: "Data fim", kind: "date" },
      ]}
      columns={["Data", "Entradas", "Saídas", "Saldo"]}
      rows={rows}
      hint={hint || undefined}
    />
  )
}
export function PrevisaoFluxo() {
  return (
    <FilterPage
      title="PREVISÃO DE FLUXO DE CAIXA"
      fields={[
        { key: "inicio", label: "Data inicio", kind: "date" },
        { key: "fim", label: "Data fim", kind: "date" },
      ]}
      columns={["Data", "Receber", "Pagar", "Saldo previsto"]}
    />
  )
}

type LojaOpcao = { id: string; nome: string; clientId: string; label: string }

const ESTOQUE_GERAL_ID = "geral"

function nomeEhEstoqueGeral(nome: string) {
  return nome.trim().toLocaleUpperCase("pt-BR") === "ESTOQUE GERAL"
}

function lojaAtualId(sessionId: string) {
  if (sessionId) return sessionId
  try {
    return sessionStorage.getItem(STORE_STORAGE_KEY) || ""
  } catch {
    return ""
  }
}

export function CadastrarDespesa({ receita = false }: { receita?: boolean }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const session = usePdvSession()
  const listPath = pathname.startsWith("/gestao/")
    ? "/gestao/movimentacoes/financeiro/despesas"
    : "/client/movimentacoes/financeiro/despesas"
  const [caixas, setCaixas] = useState<string[]>([])
  const [planos, setPlanos] = useState<string[]>([])
  const [lojas, setLojas] = useState<LojaOpcao[]>([])
  const [status, setStatus] = useState("")
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [codigoSalvo, setCodigoSalvo] = useState<number | null>(null)
  const arquivoRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState({ descricao: "", total: "R$ 0,00", data: todayIso(), caixa: "", plano: "", lojaId: "" })

  useEffect(() => {
    listLojaCaixas(true).then((rows) => setCaixas(rows.map((item) => item.name))).catch(() => setCaixas([]))
    listCatalog("account_plan", true)
      .then((rows) => setPlanos(rows.map((item) => item.name.trim()).filter(Boolean)))
      .catch(() => setPlanos([]))
  }, [])

  useEffect(() => {
    let ativo = true
    const backoffice = pathname.startsWith("/gestao/")
    const pedido = backoffice ? api.get("/backoffice/stores") : api.get("/clients/stores")
    pedido
      .then(({ data }) => {
        if (!ativo) return
        const raw = (data?.stores || []) as Array<{
          id: string
          name: string
          status?: string
          storeCode?: string | null
          clientId?: string | null
          clientName?: string | null
        }>
        const ativas = raw.filter((item) => item.id && String(item.status || "ACTIVE") !== "INACTIVE")
        const variosClientes = new Set(ativas.map((item) => item.clientId || "")).size > 1
        const mapeadas = ativas.map((item) => {
          const code = String(item.storeCode || "").trim()
          const nome = String(item.name || "").trim()
          const base = code && nome ? `${code} - ${nome}` : nome || code || "Loja"
          const label = variosClientes && item.clientName ? `${base} (${item.clientName})` : base
          return { id: item.id, nome, clientId: String(item.clientId || ""), label }
        })
        const preferida = lojaAtualId(session.storeId)
        let linhas = mapeadas
        let padrao = linhas.find((item) => item.id === preferida)?.id || linhas[0]?.id || ""
        if (backoffice) {
          const existente = mapeadas.find((item) => nomeEhEstoqueGeral(item.nome))
          const geral: LojaOpcao = existente
            ? { ...existente, nome: "ESTOQUE GERAL", clientId: "", label: "ESTOQUE GERAL" }
            : { id: ESTOQUE_GERAL_ID, nome: "ESTOQUE GERAL", clientId: "", label: "ESTOQUE GERAL" }
          linhas = [geral, ...mapeadas.filter((item) => item.id !== geral.id && !nomeEhEstoqueGeral(item.nome))]
          padrao = geral.id
        }
        setLojas(linhas)
        setForm((atual) => ({
          ...atual,
          lojaId: atual.lojaId && linhas.some((item) => item.id === atual.lojaId) ? atual.lojaId : padrao,
        }))
      })
      .catch(() => {
        if (ativo) setLojas([])
      })
    return () => {
      ativo = false
    }
  }, [pathname, session.storeId])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!form.descricao.trim() || !parseMoney(form.total)) {
      setStatus("Informe a descrição e o valor.")
      return
    }
    if (lojas.length && !form.lojaId) {
      setStatus("Selecione a loja.")
      return
    }
    try {
      const backoffice = pathname.startsWith("/gestao/")
      const loja = lojas.find((item) => item.id === form.lojaId)
      const geral = backoffice && Boolean(loja && (loja.id === ESTOQUE_GERAL_ID || nomeEhEstoqueGeral(loja.nome)))
      const clientId = backoffice ? "" : loja?.clientId || clientIdDoLojista()
      let code = codigoSalvo
      if (!code) {
        const item = await createCatalog("expense", {
          name: form.descricao.trim(),
          payload: {
            ...form,
            storeId: loja?.id || "",
            loja: geral ? "ESTOQUE GERAL" : loja?.nome || "",
            tipo: receita ? "receita" : "despesa",
            origem: geral || backoffice ? "backoffice" : "loja",
            ...(arquivo ? { comprovante: arquivo.name } : {}),
            ...(clientId ? { clientId } : {}),
          },
        })
        code = item.code
        setCodigoSalvo(code)
      }
      if (arquivo && code) {
        const body = new FormData()
        body.append("file", arquivo)
        await api.post(`/clients/catalog/expense/${code}/comprovante`, body)
      }
      avisarSalvo(receita ? "Receita salva." : "Despesa salva.")
      navigate(listPath)
    } catch (err) {
      setStatus(parseError(err).friend || "Não foi possível salvar.")
    }
  }

  return (
    <CadastroFrame>
      <section className="pdv-cad-page pdv-cli-page" aria-labelledby="pdv-desp-form">
        <div className="pdv-cad-sheet">
          <div className="cli-edit-head">
            <button className="pdv-cad-btn pdv-cad-btn-back pdv-voltar" type="button" onClick={() => navigate(listPath)}>
              Voltar
            </button>
            <h1 id="pdv-desp-form">{receita ? "CADASTRAR RECEITA" : "CADASTRAR DESPESA"}</h1>
          </div>
          <form className="pdv-cad-form" onSubmit={onSubmit}>
            <FormRow label="Loja">
              <SearchableSelect
                value={lojas.find((item) => item.id === form.lojaId)?.label || ""}
                emptyLabel="Selecione a loja"
                options={lojas.map((item) => item.label)}
                hideEmpty={lojas.length > 0}
                onChange={(next) => {
                  const escolhida = lojas.find((item) => item.label === next)
                  setForm({ ...form, lojaId: escolhida?.id || "" })
                }}
              />
            </FormRow>
            <FormRow label="Descrição">
              <input value={form.descricao} onChange={(event) => setForm({ ...form, descricao: event.target.value })} autoComplete="off" />
            </FormRow>
            <FormRow label="Plano de Conta">
              <SearchableSelect
                value={form.plano}
                emptyLabel="Selecione"
                options={planos}
                onChange={(next) => setForm({ ...form, plano: next === "Selecione" ? "" : next })}
              />
            </FormRow>
            <FormRow label="Valor">
              <input
                value={form.total}
                onFocus={(event) => event.currentTarget.select()}
                onChange={(event) => setForm({ ...form, total: maskValorReais(form.total, event.target.value) })}
                inputMode="decimal"
                autoComplete="off"
              />
            </FormRow>
            <FormRow label="Data">
              <span className="pdv-date-field">
                <input type="date" value={form.data} onChange={(event) => setForm({ ...form, data: event.target.value })} />
                <DatePreset onPick={(inicio) => setForm({ ...form, data: inicio || todayIso() })} />
              </span>
            </FormRow>
            <FormRow label="Caixa">
              <SearchableSelect
                value={form.caixa}
                emptyLabel="Sem caixa"
                options={caixas}
                onChange={(next) => setForm({ ...form, caixa: next === "Sem caixa" ? "" : next })}
              />
            </FormRow>
            <FormRow label="Comprovante">
              <div className="pdv-desp-comprovante">
                <button className="pdv-cad-btn" type="button" onClick={() => arquivoRef.current?.click()}>
                  <Paperclip size={16} aria-hidden="true" />
                  Anexar
                </button>
                <input
                  ref={arquivoRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif,application/pdf,.png,.jpg,.jpeg,.webp,.gif,.pdf"
                  hidden
                  onChange={(event) => {
                    const file = event.target.files?.[0] || null
                    if (file && file.size > 8 * 1024 * 1024) {
                      setStatus("O comprovante deve ter no máximo 8 MB.")
                      event.target.value = ""
                      setArquivo(null)
                      return
                    }
                    setArquivo(file)
                    setStatus("")
                  }}
                />
                <span>{arquivo ? arquivo.name : "Nenhum arquivo"}</span>
                {arquivo ? (
                  <button
                    className="pdv-cad-icon-btn"
                    type="button"
                    aria-label="Tirar comprovante"
                    onClick={() => {
                      setArquivo(null)
                      if (arquivoRef.current) arquivoRef.current.value = ""
                    }}
                  >
                    <X size={14} />
                  </button>
                ) : null}
              </div>
            </FormRow>
            {status ? <p className="pdv-prod-status" role="status">{status}</p> : null}
            <div className="pdv-cad-form-go">
              <button className="pdv-cad-btn pdv-cad-btn-green" type="submit">
                <Plus size={16} strokeWidth={2.6} aria-hidden="true" />
                Salvar
              </button>
            </div>
          </form>
        </div>
      </section>
    </CadastroFrame>
  )
}

export function ListarDespesas() {
  const { pathname } = useLocation()
  const { storeId } = usePdvSession()
  const backoffice = pathname.startsWith("/gestao/")
  const base = backoffice ? "/gestao/movimentacoes/financeiro" : "/client/movimentacoes/financeiro"
  const [itens, setItens] = useState<CatalogItem[]>([])
  const [planos, setPlanos] = useState<string[]>([])
  const [busca, setBusca] = useState({ nome: "", plano: "" })
  const [hint, setHint] = useState("Carregando...")
  const [marcados, setMarcados] = useState<number[]>([])
  const [pedirExcluir, setPedirExcluir] = useState(false)
  const [excluindo, setExcluindo] = useState(false)
  const [erroExcluir, setErroExcluir] = useState("")
  const [erroArquivo, setErroArquivo] = useState("")
  const [detalhe, setDetalhe] = useState<CatalogItem | null>(null)
  useEffect(() => {
    listCatalog("account_plan", true)
      .then((rows) => setPlanos(rows.map((item) => item.name.trim()).filter(Boolean)))
      .catch(() => setPlanos([]))
    listCatalog("expense")
      .then((items) => {
        const visiveis = backoffice
          ? items.filter(lancamentoDoPainel)
          : items.filter((item) => lancamentoDaLoja(item, clientIdDoLojista(), storeId || lojaAtualId("")))
        setItens(visiveis)
        setHint(visiveis.length ? "" : "Nenhuma despesa ou receita lançada.")
      })
      .catch(() => setHint("Não foi possível carregar."))
  }, [backoffice, storeId])
  const filtrados = useMemo(() => {
    const nome = busca.nome.trim().toLowerCase()
    const plano = busca.plano.trim()
    return itens.filter((item) => {
      if (nome && !item.name.toLowerCase().includes(nome)) return false
      if (plano && plano !== "Todos" && String(item.payload.plano || "") !== plano) return false
      return true
    })
  }, [busca.nome, busca.plano, itens])
  const rows = filtrados.map((item) => [
    String(item.code),
    item.name,
    String(item.payload.plano || "—"),
    String(item.payload.tipo || "despesa"),
    String(item.payload.data || "—"),
    String(item.payload.caixa || "—"),
    String(item.payload.loja || (String(item.payload.origem || "") === "backoffice" && !item.payload.clientId ? "ESTOQUE GERAL" : "—")),
    formatValorLista(item.payload.total),
  ])
  const alvos = filtrados.filter((item) => marcados.includes(item.code))
  const tiposAlvo = new Set(alvos.map((item) => String(item.payload.tipo || "despesa")))
  const tituloExcluir = tiposAlvo.size === 1 && tiposAlvo.has("receita")
    ? "Excluir receitas"
    : tiposAlvo.size === 1
      ? "Excluir despesas"
      : "Excluir lançamentos"
  const todosMarcados = filtrados.length > 0 && filtrados.every((item) => marcados.includes(item.code))

  function alternarMarca(code: number) {
    setMarcados((atual) => atual.includes(code) ? atual.filter((item) => item !== code) : [...atual, code])
  }

  function alternarTodos() {
    const codes = filtrados.map((item) => item.code)
    setMarcados((atual) => todosMarcados ? atual.filter((code) => !codes.includes(code)) : [...new Set([...atual, ...codes])])
  }

  async function abrirComprovante(item: CatalogItem) {
    setErroArquivo("")
    try {
      const { data } = await api.get(`/clients/catalog/expense/${item.code}/comprovante`, { responseType: "blob" })
      const blob = data as Blob
      const url = URL.createObjectURL(blob)
      window.open(url, "_blank", "noopener")
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch (err) {
      setErroArquivo(parseError(err).friend || "Não foi possível abrir o comprovante.")
    }
  }

  async function confirmarExclusao() {
    const codes = alvos.map((item) => item.code)
    if (!codes.length || excluindo) return
    setExcluindo(true)
    setErroExcluir("")
    try {
      await deleteCatalog("expense", codes)
      setItens((atual) => atual.filter((item) => !codes.includes(item.code)))
      setMarcados((atual) => atual.filter((code) => !codes.includes(code)))
      setDetalhe((atual) => (atual && codes.includes(atual.code) ? null : atual))
      setPedirExcluir(false)
      avisarSalvo(codes.length === 1
        ? (tiposAlvo.has("receita") ? "Receita excluída." : "Despesa excluída.")
        : `${codes.length} lançamentos excluídos.`)
    } catch (err) {
      setErroExcluir(parseError(err).friend || "Não foi possível excluir.")
    } finally {
      setExcluindo(false)
    }
  }

  return (
    <>
    <FilterPage
      title="RECEITA / DESPESAS REGISTRADA"
      actions={[
        ...(marcados.length ? [{
          label: `Excluir marcados (${marcados.length})`,
          tone: "red" as const,
          onClick: () => {
            setErroExcluir("")
            setPedirExcluir(true)
          },
        }] : []),
        { label: "Cadastrar Despesa", tone: "green" as const, href: `${base}/despesas/cadastrar` },
        { label: "Cadastrar Receita", tone: "blue" as const, href: `${base}/receitas/cadastrar` },
        {
          label: "Cadastrar Plano de Conta",
          tone: "ink" as const,
          href: backoffice ? "/gestao/cadastro/financeiro/plano-conta/cadastrar" : "/client/financeiro/plano-conta/cadastrar",
        },
      ]}
      fields={[
        { key: "nome", label: "Descrição" },
        { key: "plano", label: "Plano de Conta", kind: "search", options: ["Todos", ...planos] },
      ]}
      columns={["Código", "Descrição", "Plano de Conta", "Tipo", "Data", "Caixa", "Loja", "Valor"]}
      rows={rows}
      extra={erroArquivo ? <p className="pdv-prod-status" role="alert">{erroArquivo}</p> : undefined}
      rowLeadLabel="Comprovante"
      rowLeadCenter
      closedCenter
      rowLead={(index) => {
        const item = filtrados[index]
        const nome = String(item?.payload.comprovante || "").trim()
        if (!item || !nome) return "—"
        return (
          <button
            className="pdv-cad-icon-btn"
            type="button"
            aria-label={`Abrir comprovante ${nome}`}
            title={nome}
            onClick={(event) => {
              event.stopPropagation()
              void abrirComprovante(item)
            }}
          >
            <Paperclip size={16} aria-hidden="true" />
          </button>
        )
      }}
      hint={rows.length ? undefined : hint || "Nenhuma despesa ou receita lançada."}
      submitLabel="Filtrar"
      pageClass="pdv-cli-page"
      filtersClass="pdv-cad-filters-linha"
      onSearch={(values) => setBusca({ nome: values.nome || "", plano: values.plano || "" })}
      markAll={(
        <input
          type="checkbox"
          aria-label="Marcar todos"
          checked={todosMarcados}
          onChange={alternarTodos}
        />
      )}
      rowMark={(index) => {
        const item = filtrados[index]
        if (!item) return null
        return (
          <input
            type="checkbox"
            aria-label={`Marcar ${item.name}`}
            checked={marcados.includes(item.code)}
            onClick={(event) => event.stopPropagation()}
            onChange={() => alternarMarca(item.code)}
          />
        )
      }}
      closedLabel="Visualizar"
      closedAction={(index) => {
        const item = filtrados[index]
        if (!item) return null
        return (
          <button
            className="venda-lupa"
            type="button"
            aria-label={`Ver lançamento ${item.code}`}
            onClick={(event) => {
              event.stopPropagation()
              setDetalhe(item)
            }}
          >
            <Search size={15} />
          </button>
        )
      }}
    />
    <PdvOverlayModal
      open={pedirExcluir}
      title={tituloExcluir}
      size="form"
      icon={<Trash2 size={18} strokeWidth={2.2} />}
      onClose={() => {
        if (excluindo) return
        setPedirExcluir(false)
        setErroExcluir("")
      }}
      footer={
        <>
          {erroExcluir ? <p className="pdv-logo-msg" role="alert">{erroExcluir}</p> : null}
          <div className="pdv-modal-actions">
            <button className="pdv-cad-btn" type="button" disabled={excluindo} onClick={() => { setPedirExcluir(false); setErroExcluir("") }}>
              Cancelar
            </button>
            <button className="pdv-cad-btn pdv-cad-btn-red" type="button" disabled={excluindo} onClick={() => void confirmarExclusao()}>
              {excluindo ? "Excluindo..." : "Excluir"}
            </button>
          </div>
        </>
      }
    >
      <p>
        {alvos.length === 1
          ? `Excluir ${alvos[0]?.name || "este lançamento"}?`
          : `Excluir ${alvos.length} lançamentos marcados?`}
      </p>
    </PdvOverlayModal>
    <PdvOverlayModal
      open={Boolean(detalhe)}
      title={String(detalhe?.payload.tipo || "despesa") === "receita" ? "Receita" : "Despesa"}
      size="form"
      icon={<Search size={18} strokeWidth={2.2} />}
      onClose={() => setDetalhe(null)}
    >
      {detalhe ? <FichaLancamento item={detalhe} onAbrir={() => void abrirComprovante(detalhe)} /> : null}
    </PdvOverlayModal>
    </>
  )
}

export function TransferenciaLojas() {
  return (
    <FilterPage
      title="ESCOLHA DA LOJA PARA TRANSFERÊNCIA"
      fields={[]}
      columns={["Transf.", "Loja Destino", "Razão", "Cidade", "Telefone"]}
      hint="Nenhuma loja destino além da loja atual."
    />
  )
}
type TransferLine = { code: string; name: string; qty: number; price: number; imeis: string[] }
type TransferOrder = {
  id: string
  code: string
  date: string
  state: string
  total: number
  received?: boolean
  lines?: TransferLine[]
}

function money(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

function parseMoney(value: string) {
  const clean = value.trim().replace(/[R$\s]/g, "")
  if (!clean) return null
  const normalized = clean.includes(",") ? clean.replace(/\./g, "").replace(",", ".") : clean
  const number = Number(normalized)
  if (!Number.isFinite(number) || number < 0) return null
  return Math.round(number * 100) / 100
}

function inteirosReais(value: string) {
  const body = value.replace(/R\$/gi, "")
  const comma = body.indexOf(",")
  const digits = (comma === -1 ? body : body.slice(0, comma)).replace(/\D/g, "")
  return digits.replace(/^0+(?=\d)/, "")
}

function formatReais(intDigits: string, cents: string) {
  const intClean = intDigits.replace(/\D/g, "").replace(/^0+(?=\d)/, "") || "0"
  const grouped = intClean.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
  const dec = `${cents.replace(/\D/g, "")}00`.slice(0, 2)
  return `R$ ${grouped},${dec}`
}

function maskValorReais(previous: string, raw: string) {
  const prev = previous.trim() || "R$ 0,00"
  if (!raw.trim()) return "R$ 0,00"
  const prevCompact = prev.replace(/\s/g, "")
  const rawCompact = raw.replace(/\s/g, "")
  if (prevCompact.endsWith(",00") && rawCompact.startsWith(prevCompact)) {
    const extra = rawCompact.slice(prevCompact.length).replace(/\D/g, "")
    if (extra) return formatReais(inteirosReais(prev) + extra, "00")
  }
  if (prevCompact.endsWith(",00") && rawCompact === prevCompact.slice(0, -1)) {
    const ints = inteirosReais(prev)
    return formatReais(ints.length <= 1 ? "" : ints.slice(0, -1), "00")
  }
  const cleaned = raw.replace(/R\$/gi, "").replace(/[^\d,]/g, "")
  if (!cleaned) return "R$ 0,00"
  const comma = cleaned.indexOf(",")
  if (comma === -1) return formatReais(cleaned, "00")
  return formatReais(cleaned.slice(0, comma), cleaned.slice(comma + 1))
}

function dataLancamento(value: unknown) {
  const raw = String(value || "")
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!match) return raw || "—"
  return `${match[3]}/${match[2]}/${match[1]}`
}

function FichaLancamento({ item, onAbrir }: { item: CatalogItem; onAbrir: () => void }) {
  const tipo = String(item.payload.tipo || "despesa")
  const comprovante = String(item.payload.comprovante || "").trim()
  const loja = String(item.payload.loja || (String(item.payload.origem || "") === "backoffice" && !item.payload.clientId ? "ESTOQUE GERAL" : "—"))
  const linhas: Array<[string, string]> = [
    ["Código", String(item.code)],
    ["Tipo", tipo === "receita" ? "Receita" : "Despesa"],
    ["Descrição", item.name || "—"],
    ["Plano de conta", String(item.payload.plano || "—")],
    ["Valor", formatValorLista(item.payload.total)],
    ["Data", dataLancamento(item.payload.data)],
    ["Caixa", String(item.payload.caixa || "—")],
    ["Loja", loja || "—"],
  ]
  return (
    <dl className="pdv-desp-ficha">
      {linhas.map(([rotulo, valor]) => (
        <div key={rotulo}>
          <dt>{rotulo}</dt>
          <dd>{valor}</dd>
        </div>
      ))}
      <div>
        <dt>Comprovante</dt>
        <dd>
          {comprovante ? (
            <button className="pdv-cad-btn" type="button" onClick={onAbrir}>
              <Paperclip size={15} aria-hidden="true" />
              {comprovante}
            </button>
          ) : "—"}
        </dd>
      </div>
    </dl>
  )
}

function formatValorLista(value: unknown) {
  const parsed = parseMoney(String(value ?? ""))
  if (parsed == null) return "—"
  return `R$ ${parsed.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function maskUnitPrice(raw: string) {
  const cleaned = raw.replace(/[^\d,]/g, "")
  if (!cleaned) return ""
  const comma = cleaned.indexOf(",")
  const intDigits = (comma === -1 ? cleaned : cleaned.slice(0, comma)).replace(/^0+(?=\d)/, "")
  const intPart = intDigits.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
  if (comma === -1) return intPart
  const dec = cleaned.slice(comma + 1).replace(/\D/g, "").slice(0, 2)
  return `${intPart || "0"},${dec}`
}

type TransferDetail = TransferOrder & { received: boolean; lines: TransferLine[] }

type TransferFaixa = "abertas" | "concluidas" | "estornadas"

export function TransferenciasList({ title }: { title: string }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const recebidas = /\/transferencias\/recebidas\/(abertas|concluidas|estornadas)\/?$/.test(pathname)
  const faixa: TransferFaixa = pathname.includes("/estornadas")
    ? "estornadas"
    : pathname.includes("/concluidas")
      ? "concluidas"
      : "abertas"
  const recebidasAbertas = recebidas && faixa === "abertas"
  const recebidasConcluidas = recebidas && faixa === "concluidas"
  const estornadas = title.includes("ESTORNAD") && !recebidas
  const kind = recebidas
    ? faixa === "concluidas" ? "recebidas" : faixa
    : estornadas
      ? "estornadas"
      : title.includes("RECEBID") && title.includes("CONCLU")
        ? "recebidas"
        : title.includes("ABERT")
          ? "abertas"
          : ""
  const [orders, setOrders] = useState<TransferOrder[]>([])
  const [grupos, setGrupos] = useState<Record<TransferFaixa, TransferOrder[]>>({
    abertas: [],
    concluidas: [],
    estornadas: [],
  })
  const [detail, setDetail] = useState<TransferDetail | null>(null)
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const openRef = useRef<number | null>(null)
  const [error, setError] = useState("")
  const confirmingRef = useRef<string | null>(null)
  const [openLines, setOpenLines] = useState<Record<string, boolean>>({})
  const [priceDraft, setPriceDraft] = useState<Record<string, string>>({})

  function takeOrders(data: { orders?: TransferOrder[] } | undefined) {
    return Array.isArray(data?.orders) ? data.orders : []
  }

  function load() {
    if (recebidas) {
      Promise.all([
        api.get("/clients/transferencias", { params: { kind: "abertas" } }),
        api.get("/clients/transferencias", { params: { kind: "recebidas" } }),
        api.get("/clients/transferencias", { params: { kind: "estornadas" } }),
      ])
        .then(([abertas, concluidas, estornadasRes]) => {
          setGrupos({
            abertas: takeOrders(abertas.data),
            concluidas: takeOrders(concluidas.data),
            estornadas: takeOrders(estornadasRes.data),
          })
        })
        .catch(() => setGrupos({ abertas: [], concluidas: [], estornadas: [] }))
      return
    }
    if (!kind) return
    api
      .get("/clients/transferencias", { params: { kind } })
      .then(({ data }) => {
        setOrders(takeOrders(data))
      })
      .catch(() => setOrders([]))
  }

  useEffect(() => {
    load()
  }, [recebidas, recebidas ? "recebidas" : kind])

  useEffect(() => {
    openRef.current = null
    setOpenIndex(null)
    setDetail(null)
    setOpenLines({})
  }, [faixa])

  const lista = recebidas ? grupos[faixa] : orders

  function asDetail(order: TransferOrder): TransferDetail {
    return {
      ...order,
      received: Boolean(order.received) || faixa === "concluidas",
      lines: order.lines || [],
    }
  }

  function openOrder(index: number) {
    const order = lista[index]
    if (!order || (!recebidasAbertas && !recebidasConcluidas && !(recebidas && faixa === "estornadas"))) return
    if (openIndex === index) {
      openRef.current = null
      setOpenIndex(null)
      setDetail(null)
      setOpenLines({})
      return
    }
    openRef.current = index
    setOpenIndex(index)
    setDetail(asDetail(order))
    setOpenLines({})
    setError("")
  }

  async function savePrice(index: number, line: TransferLine, raw: string) {
    if (!detail) return
    const key = `${line.code}-${index}`
    setPriceDraft((current) => {
      const next = { ...current }
      delete next[key]
      return next
    })
    const price = parseMoney(raw)
    if (price == null) {
      setError("Informe um valor unitário válido.")
      return
    }
    if (Math.abs(price - (Number(line.price) || 0)) < 0.001) return
    setError("")
    try {
      const { data } = await api.patch(`/clients/transferencias/${detail.id}/preco`, { index, price })
      const total = Number(data?.total) || 0
      const orderId = detail.id
      setDetail((current) => current && current.id === orderId ? {
        ...current,
        total,
        lines: current.lines.map((item, itemIndex) => itemIndex === index ? { ...item, price } : item),
      } : current)
      setOrders((current) => current.map((order) => order.id === orderId ? { ...order, total } : order))
      setGrupos((current) => ({
        ...current,
        [faixa]: current[faixa].map((order) => order.id === orderId ? { ...order, total } : order),
      }))
    } catch (err) {
      setError(parseError(err).message || "Não foi possível salvar o valor.")
    }
  }

  async function confirmReceipt(order: TransferOrder, event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation()
    if (confirmingRef.current) return
    if (!window.confirm(`Confirmar recebimento do pedido ${order.code}?`)) return
    confirmingRef.current = order.id
    setError("")
    openRef.current = null
    setOpenIndex(null)
    setDetail(null)
    setGrupos((current) => ({
      abertas: current.abertas.filter((item) => item.id !== order.id),
      concluidas: [{ ...order, received: true }, ...current.concluidas],
      estornadas: current.estornadas,
    }))
    try {
      await api.post(`/clients/transferencias/${order.id}/receber`)
    } catch (err) {
      setGrupos((current) => ({
        abertas: current.abertas.some((item) => item.id === order.id)
          ? current.abertas
          : [order, ...current.abertas],
        concluidas: current.concluidas.filter((item) => item.id !== order.id),
        estornadas: current.estornadas,
      }))
      setError(parseError(err).message || "Não foi possível confirmar o recebimento.")
    } finally {
      confirmingRef.current = null
    }
  }

  const rows = lista.map((order) => [
    order.code,
    "Esta loja",
    new Date(order.date).toLocaleString("pt-BR"),
    Number(order.total || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
  ])

  const expanded = openIndex == null ? null : detail ? (
    <section className="pdv-cad-receive" aria-label={`Pedido ${detail.code}`}>
      <table className="loja-table">
        <thead>
          <tr>
            <th>Código</th>
            <th>Produto</th>
            <th className="pdv-cad-price-head">Valor unit.</th>
            <th>Qtd</th>
          </tr>
        </thead>
        <tbody>
          {detail.lines.map((line, index) => {
            const imeis = line.imeis.filter(Boolean)
            const key = `${line.code}-${index}`
            const open = !!openLines[key]
            return (
              <tr key={key}>
                <td>{line.code || "—"}</td>
                <td>
                  <div className="loja-prod">
                    {imeis.length ? (
                      <button
                        type="button"
                        className="loja-plus"
                        aria-expanded={open}
                        aria-label={open ? "Fechar IMEIs" : "Abrir IMEIs"}
                        onClick={() => setOpenLines((current) => ({ ...current, [key]: !current[key] }))}
                      >
                        {open ? "–" : "+"}
                      </button>
                    ) : null}
                    <span>{line.name || "Produto"}</span>
                  </div>
                  {open && imeis.length ? (
                    <ul className="loja-imeis">
                      {imeis.map((serial) => (
                        <li key={serial}>{serial}</li>
                      ))}
                    </ul>
                  ) : null}
                </td>
                <td className="pdv-cad-price-cell">
                  {detail.received ? (
                    money(Number(line.price) || 0)
                  ) : (
                  <label className="pdv-cad-price-wrap">
                    <input
                      className="pdv-cad-price"
                      aria-label={`Valor unitário de ${line.name || "produto"}`}
                      inputMode="decimal"
                      autoComplete="off"
                      value={priceDraft[key] ?? money(Number(line.price) || 0)}
                      onClick={(event) => event.stopPropagation()}
                      onFocus={() => setPriceDraft((current) => ({
                        ...current,
                        [key]: maskUnitPrice((Number(line.price) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })),
                      }))}
                      onBeforeInput={(event) => {
                        const data = (event.nativeEvent as InputEvent).data || ""
                        if (data.length === 1 && /[^\d,]/.test(data)) event.preventDefault()
                      }}
                      onChange={(event) => setPriceDraft((current) => ({ ...current, [key]: maskUnitPrice(event.target.value) }))}
                      onBlur={(event) => savePrice(index, line, event.currentTarget.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault()
                          event.currentTarget.blur()
                          return
                        }
                        if (event.ctrlKey || event.metaKey || event.altKey) return
                        if (["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab", "Home", "End"].includes(event.key)) return
                        if (/^\d$/.test(event.key)) return
                        if (event.key === "," && !event.currentTarget.value.includes(",")) return
                        event.preventDefault()
                      }}
                    />
                    <Pencil className="pdv-cad-price-mark" size={14} strokeWidth={2.2} aria-hidden />
                  </label>
                  )}
                </td>
                <td>{line.qty}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </section>
  ) : error ? (
    <p className="pdv-cad-kicker">{error}</p>
  ) : null

  const cards = recebidas ? (
    <div className="pdv-compra-cards pdv-compra-cards-3">
      <button
        type="button"
        className={`pdv-compra-card pdv-compra-card-abertas${faixa === "abertas" ? " is-on" : ""}`}
        onClick={() => navigate("/client/movimentacoes/transferencias/recebidas/abertas")}
      >
        <Clock size={22} strokeWidth={2.4} aria-hidden="true" />
        <span>Abertas</span>
        <strong>{grupos.abertas.length}</strong>
      </button>
      <button
        type="button"
        className={`pdv-compra-card pdv-compra-card-concluidas${faixa === "concluidas" ? " is-on" : ""}`}
        onClick={() => navigate("/client/movimentacoes/transferencias/recebidas/concluidas")}
      >
        <CheckCircle2 size={22} strokeWidth={2.4} aria-hidden="true" />
        <span>Concluídas</span>
        <strong>{grupos.concluidas.length}</strong>
      </button>
      <button
        type="button"
        className={`pdv-compra-card pdv-compra-card-estornadas${faixa === "estornadas" ? " is-on" : ""}`}
        onClick={() => navigate("/client/movimentacoes/transferencias/recebidas/estornadas")}
      >
        <RotateCcw size={22} strokeWidth={2.4} aria-hidden="true" />
        <span>Estornadas</span>
        <strong>{grupos.estornadas.length}</strong>
      </button>
    </div>
  ) : null

  return (
    <FilterPage
      title={recebidas ? "TRANSFERÊNCIAS RECEBIDAS" : title}
      pageClass="pdv-cli-page"
      fields={[
        { key: "cod", label: "Código" },
        { key: "loja", label: "Loja" },
      ]}
      lead={cards}
      columns={["Código", "Loja Destino", "Data", "Total"]}
      rows={kind || recebidas ? rows : undefined}
      hint={error || ((kind || recebidas) && !lista.length ? "Nenhum pedido neste painel." : undefined)}
      premium
      onRowClick={recebidasAbertas || recebidasConcluidas || (recebidas && faixa === "estornadas") ? openOrder : undefined}
      expandedIndex={openIndex}
      expanded={expanded}
      closedAction={recebidas || recebidasAbertas || recebidasConcluidas ? (index) => {
        const order = lista[index]
        if (!order) return null
        if (!recebidasAbertas) {
          const open = openIndex === index
          return (
            <button
              className="pdv-cad-receive-go"
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                openOrder(index)
              }}
            >
              {open ? "Ocultar" : "Visualizar"}
            </button>
          )
        }
        return (
          <button
            className="pdv-cad-receive-go"
            type="button"
            onClick={(event) => confirmReceipt(order, event)}
          >
            Confirmar recebimento
          </button>
        )
      } : undefined}
    />
  )
}
export function ContagemEstoque() {
  return (
    <FilterPage
      title="CONTAGENS DO ESTOQUE DA LOJA"
      actions={[
        { label: "Nova Contagem de Estoque Total", tone: "green" },
        { label: "Nova Contagem de Estoque Parcial", tone: "blue" },
        { label: "ADICIONAR Estoque" },
        { label: "RETIRAR Estoque" },
        { label: "Relatório Contagem de Estoque", href: "/client/relatorios/estoque/contagem" },
      ]}
      fields={[]}
      columns={["Código", "Data", "Tipo", "Usuário", "Estado"]}
    />
  )
}
export function NfeList() {
  return (
    <FilterPage
      title="NF-E / NFC-E"
      fields={[
        { key: "numero", label: "Número" },
        { key: "inicio", label: "Data inicio", kind: "date" },
        { key: "fim", label: "Data fim", kind: "date" },
      ]}
      columns={["Número", "Série", "Cliente", "Data", "Valor", "Status"]}
      hint="Emissão SEFAZ não está conectada. A lista permanece vazia."
    />
  )
}
export function NfseList() {
  return (
    <FilterPage
      title="NFS-E(SERVIÇOS)"
      fields={[
        { key: "numero", label: "Número" },
        { key: "inicio", label: "Data inicio", kind: "date" },
      ]}
      columns={["Número", "Tomador", "Data", "Valor", "Status"]}
      hint="NFS-e de terceiro. Sem emissão simulada."
    />
  )
}
export function ManifestacaoDest() {
  return (
    <FilterPage
      title="MANIFESTAÇÃO DO DESTINATÁRIO"
      fields={[{ key: "chave", label: "Chave" }]}
      columns={["Chave", "Emitente", "Data", "Status"]}
      hint="Consulta SEFAZ não está conectada."
    />
  )
}
export function ArquivosContador() {
  return (
    <FilterPage
      title="ARQUIVOS FISCAIS CONTADOR"
      fields={[{ key: "mes", label: "Mês" }]}
      columns={["Arquivo", "Período", "Status"]}
    />
  )
}
export function GerenciadorArquivos() {
  return (
    <FilterPage
      title="GERENCIADOR ARQUIVOS FISCAIS"
      fields={[{ key: "tipo", label: "Tipo", kind: "select", options: ["Todos"] }]}
      columns={["Arquivo", "Tipo", "Data"]}
    />
  )
}
export function BoletosPage({ title }: { title: string }) {
  return (
    <FilterPage
      title={title}
      fields={[{ key: "busca", label: "Busca" }]}
      columns={["Documento", "Cliente", "Vencimento", "Valor", "Status"]}
      hint="Boleto Cloud / Yapay não está conectado."
    />
  )
}
export function RelatorioCaixaClientes() {
  return (
    <FilterPage
      title="RELATÓRIO CAIXA DE CLIENTES"
      fields={[
        { key: "cliente", label: "Cliente" },
        { key: "inicio", label: "Data inicio", kind: "date" },
      ]}
      columns={["Cliente", "Data", "Valor"]}
    />
  )
}

import FilterPage from "../pdv/FilterPage"
import CadastroShell from "../cadastros/CadastroShell"
import { useNavigate } from "react-router-dom"
import { FormEvent, MouseEvent, useRef, useState } from "react"
import { api } from "../../../services/api"
import { FormRow } from "../cadastros/catalog/FormBits"
import { createCatalog, listCatalog } from "../cadastros/catalog/catalogApi"
import { listLojaCaixas } from "../cadastros/financeiro/caixaApi"
import { parseError } from "../../../services/api"
import { Pencil, Plus } from "lucide-react"
import { useEffect } from "react"
import "../vendas/pedidos.css"
import { VendasMovimento } from "./LojaVendasPainel"

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
  { label: "Nova", tone: "green" as const, href: "/client/pdv" },
  { label: "Abertas", tone: "blue" as const, href: "/client/movimentacoes/vendas/abertas" },
  { label: "Concluídas", href: "/client/movimentacoes/vendas/concluidas" },
]

export function VendasAbertas() {
  return <VendasMovimento status="espera" />
}
export function VendasConcluidas() {
  return <VendasMovimento status="finalizada" />
}
export function PreVendas() {
  return <FilterPage title="PRÉ VENDAS" actions={VENDA_ACTIONS} fields={VENDA_FIELDS} columns={VENDA_COLS} />
}

export function PainelEntregas() {
  return (
    <CadastroShell>
      <section className="pdv-cad-page" aria-labelledby="pdv-entregas">
        <div className="pdv-cad-sheet">
          <h1 id="pdv-entregas">PAINEL DE ENTREGAS</h1>
          <div className="pdv-loc-kanban">
            <p className="pdv-cad-kicker">Nenhuma entrega em andamento.</p>
          </div>
        </div>
      </section>
    </CadastroShell>
  )
}

export function RelatorioCaixa() {
  return (
    <FilterPage
      title="RELATÓRIO DE CAIXA"
      fields={[
        { key: "inicio", label: "Data Caixa inicio", kind: "date" },
        { key: "fim", label: "Data Caixa fim", kind: "date" },
        { key: "caixa", label: "Caixa", kind: "select", options: ["Todos"] },
      ]}
      columns={["Caixa", "Data", "Saldo Inicial", "Entradas", "Saídas", "Saldo"]}
    />
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
  return (
    <FilterPage
      title="RELATÓRIO DE CAIXA DETALHADO"
      fields={[
        { key: "inicio", label: "Data Caixa inicio", kind: "date" },
        { key: "fim", label: "Data Caixa fim", kind: "date" },
      ]}
      columns={["Data", "Caixa", "Forma de Pagamento", "Valor"]}
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
  return (
    <FilterPage
      title="FLUXO DE CAIXA"
      fields={[
        { key: "inicio", label: "Data inicio", kind: "date" },
        { key: "fim", label: "Data fim", kind: "date" },
      ]}
      columns={["Data", "Entradas", "Saídas", "Saldo"]}
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

export function CadastrarDespesa({ receita = false }: { receita?: boolean }) {
  const navigate = useNavigate()
  const [fornecedores, setFornecedores] = useState<string[]>(["Todos"])
  const [planos, setPlanos] = useState<string[]>([])
  const [caixas, setCaixas] = useState<string[]>([])
  const [formas, setFormas] = useState<string[]>([])
  const [status, setStatus] = useState("")
  const [form, setForm] = useState({
    fornecedor: "Todos",
    plano: "",
    dataNota: "",
    numero: "",
    competencia: "",
    total: "",
    obs: "",
    caixa: "",
    forma: "",
  })

  useEffect(() => {
    listCatalog("account_plan", true).then((rows) => setPlanos(rows.map((item) => item.name))).catch(() => setPlanos([]))
    listLojaCaixas(true).then((rows) => setCaixas(rows.map((item) => item.name))).catch(() => setCaixas([]))
    listCatalog("payment", true).then((rows) => setFormas(rows.map((item) => item.name))).catch(() => setFormas([]))
  }, [])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    try {
      await createCatalog("expense", {
        name: receita ? "Receita" : "Despesa",
        payload: { ...form, tipo: receita ? "receita" : "despesa" },
      })
      navigate("/client/movimentacoes/financeiro/despesas")
    } catch (err) {
      setStatus(parseError(err).friend || "Não foi possível salvar.")
    }
  }

  return (
    <CadastroShell>
      <section className="pdv-cad-page" aria-labelledby="pdv-desp-form">
        <div className="pdv-cad-sheet">
          <h1 id="pdv-desp-form">{receita ? "CADASTRAR RECEITA" : "CADASTRAR DESPESA"}</h1>
          <form className="pdv-cad-form" onSubmit={onSubmit}>
            <FormRow label="Fornecedor">
              <select value={form.fornecedor} onChange={(event) => setForm({ ...form, fornecedor: event.target.value })}>
                {fornecedores.map((item) => <option key={item}>{item}</option>)}
              </select>
            </FormRow>
            <FormRow label="Plano de conta">
              <select value={form.plano} onChange={(event) => setForm({ ...form, plano: event.target.value })}>
                <option value="">Sem</option>
                {planos.map((item) => <option key={item}>{item}</option>)}
              </select>
            </FormRow>
            <FormRow label="Data Nota"><input value={form.dataNota} onChange={(event) => setForm({ ...form, dataNota: event.target.value })} autoComplete="off" /></FormRow>
            <FormRow label="Número da Nota / Série"><input value={form.numero} onChange={(event) => setForm({ ...form, numero: event.target.value })} autoComplete="off" /></FormRow>
            <FormRow label="Competência"><input value={form.competencia} onChange={(event) => setForm({ ...form, competencia: event.target.value })} placeholder="MM/AAAA" autoComplete="off" /></FormRow>
            <FormRow label="Total"><input value={form.total} onChange={(event) => setForm({ ...form, total: event.target.value })} autoComplete="off" /></FormRow>
            <FormRow label="Observação"><textarea rows={3} value={form.obs} onChange={(event) => setForm({ ...form, obs: event.target.value })} /></FormRow>
            <FormRow label="Caixa">
              <select value={form.caixa} onChange={(event) => setForm({ ...form, caixa: event.target.value })}>
                <option value="" />
                {caixas.map((item) => <option key={item}>{item}</option>)}
              </select>
            </FormRow>
            <FormRow label="Forma de Pagamento">
              <select value={form.forma} onChange={(event) => setForm({ ...form, forma: event.target.value })}>
                <option value="" />
                {formas.map((item) => <option key={item}>{item}</option>)}
              </select>
            </FormRow>
            {status ? <p className="pdv-prod-status" role="status">{status}</p> : null}
            <div className="pdv-cad-form-go">
              <button className="pdv-cad-btn pdv-cad-btn-green" type="submit">
                <Plus size={16} strokeWidth={2.6} aria-hidden="true" />
                Finalizar
              </button>
            </div>
          </form>
        </div>
      </section>
    </CadastroShell>
  )
}

export function ListarDespesas() {
  return (
    <FilterPage
      title="RECEITA / DESPESAS REGISTRADA"
      actions={[
        { label: "Cadastrar Despesa", tone: "green", href: "/client/movimentacoes/financeiro/despesas/cadastrar" },
        { label: "Cadastrar Receita", tone: "blue", href: "/client/movimentacoes/financeiro/receitas/cadastrar" },
      ]}
      fields={[
        { key: "cod", label: "Cod. Receita / Despesa" },
        { key: "fornecedor", label: "Fornecedor", kind: "select", options: ["<< Selecione >>"] },
      ]}
      columns={["Código", "Fornecedor", "Obs", "Estado", "Data Lançamento", "Total", "Estornar"]}
      submitLabel="Filtrar"
    />
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
type TransferOrder = { id: string; code: string; date: string; state: string; total: number }
type TransferLine = { code: string; name: string; qty: number; price: number; imeis: string[] }

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

export function TransferenciasList({ title }: { title: string }) {
  const recebidasAbertas = title.includes("RECEBID") && title.includes("ABERT")
  const recebidasConcluidas = title.includes("RECEBID") && title.includes("CONCLU")
  const estornadas = title.includes("ESTORNAD")
  const kind = estornadas ? "estornadas" : recebidasAbertas ? "abertas" : recebidasConcluidas ? "recebidas" : ""
  const [orders, setOrders] = useState<TransferOrder[]>([])
  const [detail, setDetail] = useState<TransferDetail | null>(null)
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const openRef = useRef<number | null>(null)
  const [notice, setNotice] = useState("")
  const [error, setError] = useState("")
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const confirmingRef = useRef<string | null>(null)
  const [openLines, setOpenLines] = useState<Record<string, boolean>>({})
  const [priceDraft, setPriceDraft] = useState<Record<string, string>>({})

  function load() {
    if (!kind) return
    api
      .get("/clients/transferencias", { params: { kind } })
      .then(({ data }) => {
        setOrders(Array.isArray(data?.orders) ? data.orders : [])
      })
      .catch(() => setOrders([]))
  }

  useEffect(() => {
    load()
  }, [kind])

  function openOrder(index: number) {
    const order = orders[index]
    if (!order || (!recebidasAbertas && !recebidasConcluidas)) return
    if (openIndex === index) {
      openRef.current = null
      setOpenIndex(null)
      setDetail(null)
      setOpenLines({})
      return
    }
    openRef.current = index
    setOpenIndex(index)
    setDetail(null)
    setOpenLines({})
    setNotice("")
    setError("")
    api
      .get(`/clients/transferencias/${order.id}`)
      .then(({ data }) => {
        if (openRef.current !== index) return
        setDetail(data.order)
      })
      .catch((err) => {
        if (openRef.current !== index) return
        setError(parseError(err).message || "Não foi possível abrir o pedido.")
      })
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
    } catch (err) {
      setError(parseError(err).message || "Não foi possível salvar o valor.")
    }
  }

  async function confirmReceipt(order: TransferOrder, event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation()
    if (confirmingRef.current) return
    confirmingRef.current = order.id
    setConfirmingId(order.id)
    setError("")
    try {
      await api.post(`/clients/transferencias/${order.id}/receber`)
      openRef.current = null
      setOpenIndex(null)
      setDetail(null)
      setNotice("Recebimento confirmado. As quantidades entraram no estoque da loja.")
      load()
    } catch (err) {
      setError(parseError(err).message || "Não foi possível confirmar o recebimento.")
    } finally {
      confirmingRef.current = null
      setConfirmingId(null)
    }
  }

  const rows = orders.map((order) => [
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
  ) : (
    <p className="pdv-cad-kicker">{error || "Abrindo pedido..."}</p>
  )

  return (
    <FilterPage
      title={title}
      fields={[
        { key: "cod", label: "Código" },
        { key: "loja", label: "Loja" },
      ]}
      columns={["Código", "Loja Destino", "Data", "Total"]}
      rows={kind ? rows : undefined}
      hint={error || notice || (kind && !orders.length ? "Nenhum pedido neste painel." : undefined)}
      premium
      onRowClick={recebidasAbertas ? openOrder : undefined}
      expandedIndex={openIndex}
      expanded={expanded}
      closedAction={recebidasAbertas || recebidasConcluidas ? (index) => {
        const order = orders[index]
        if (!order) return null
        if (recebidasConcluidas) {
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
        const confirming = confirmingId === order.id
        return (
          <button
            className="pdv-cad-receive-go"
            type="button"
            disabled={confirming}
            onClick={(event) => confirmReceipt(order, event)}
          >
            {confirming ? "Confirmando..." : "Confirmar recebimento"}
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

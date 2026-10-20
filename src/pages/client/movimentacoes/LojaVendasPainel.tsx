import { FormEvent, useEffect, useMemo, useRef, useState } from "react"
import { Copy, Mail, Printer, Search, Settings, Share2, X } from "lucide-react"
import { useClientAuth } from "../../../hooks/clientAuth"
import { STORE_STORAGE_KEY } from "../dashboard/mockData"
import FilterPage, { type FilterPageProps } from "../pdv/FilterPage"
import { api, parseError } from "../../../services/api"
import { formatMoneyRs } from "../cadastros/produtos/types"
import { ReciboNota } from "../pdv/ReciboNota"
import { emitenteDaLoja } from "../pdv/emitenteLoja"
import { EMPTY_SALE_FILTERS, filterLojaSales, type SaleFilters } from "./lojaSalesFilters"
import { DatePreset } from "../cadastros/catalog/FormBits"

export type LojaPdvLine = {
  productId: string
  code: string
  name: string
  qty: number
  price: number
  discount: number
  serials?: string[]
  category?: string
}

export type LojaPdvPayment = {
  method: string
  amount: number
  parcelas?: number
}

export type LojaPdvSale = {
  id: string
  code: string
  caixaCode: number
  caixaName: string
  status: "espera" | "finalizada"
  customerName: string
  sellerName: string
  notes?: string
  lines: LojaPdvLine[]
  payments: LojaPdvPayment[]
  total: number
  received: number
  changeAmount: number
  stockPosted: boolean
  createdAt: string
  finalizedAt: string | null
}

const ACTIONS = [
  { label: "Concluídas", tone: "blue" as const, href: "/client/movimentacoes/vendas/concluidas" },
  { label: "Abertas", href: "/client/movimentacoes/vendas/abertas" },
  { label: "Nova venda", tone: "green" as const, href: "/client/pdv" },
]

export async function listLojaSales(status?: "espera" | "finalizada") {
  const { data } = await api.get("/clients/pdv-vendas", { params: status ? { status } : undefined })
  return (data.sales || []) as LojaPdvSale[]
}

function when(value?: string | null) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  const dia = date.toLocaleDateString("pt-BR")
  const hora = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  return `${dia} ${hora}`
}

function imeisNoTexto(texto: string) {
  return [...texto.matchAll(/\d{15}/g)].map((item) => item[0])
}

function imeisDaLinha(line: LojaPdvLine) {
  const salvos = (line.serials || []).map((item) => item.trim()).filter(Boolean)
  return [...new Set([...salvos, ...imeisNoTexto(`${line.name} ${line.code}`)])]
}

function imeisDaVenda(sale: LojaPdvSale) {
  const achados = [
    ...imeisNoTexto(sale.notes || ""),
    ...sale.lines.flatMap((line) => imeisDaLinha(line)),
  ]
  return [...new Set(achados)]
}

function payText(sale: LojaPdvSale) {
  if (!sale.payments.length) return "—"
  return sale.payments.map((pay) => {
    const label = pay.parcelas && pay.parcelas > 1 ? `${pay.method} ${pay.parcelas}x` : pay.method
    return `${label} ${formatMoneyRs(pay.amount)}`
  }).join(" · ")
}

export function SaleDetailPanel({ sale, emitente, onClose }: { sale: LojaPdvSale; emitente?: Emitente; onClose: () => void }) {
  const imeis = imeisDaVenda(sale)

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  return (
    <div className="pdv-caixa-confirm" onClick={onClose}>
      <div
        className="pdv-caixa-confirm-card venda-folha"
        role="dialog"
        aria-modal="true"
        aria-labelledby="loja-venda-detail-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="venda-folha-head">
          <div>
            <p>Venda</p>
            <h2 id="loja-venda-detail-title">{sale.code}</h2>
          </div>
          <button className="pdv-cad-icon-btn" type="button" aria-label="Fechar" onClick={onClose}>
            <X size={16} />
          </button>
        </header>
        <dl className="venda-folha-meta">
          {emitente?.name ? <div><dt>Empresa</dt><dd>{emitente.name}</dd></div> : null}
          {emitente?.document ? <div><dt>CNPJ/CPF</dt><dd>{emitente.document}</dd></div> : null}
          <div><dt>Cliente</dt><dd>{sale.customerName}</dd></div>
          <div><dt>Caixa</dt><dd>{sale.caixaName || "—"}</dd></div>
          <div><dt>Usuário</dt><dd>{sale.sellerName || "—"}</dd></div>
          <div><dt>Abertura</dt><dd>{when(sale.createdAt)}</dd></div>
          <div><dt>Conclusão</dt><dd>{sale.status === "finalizada" ? when(sale.finalizedAt) : "Em aberto"}</dd></div>
          <div><dt>Status</dt><dd>{sale.status === "finalizada" ? "Concluída" : "Em aberto"}</dd></div>
        </dl>
        <h3>Itens</h3>
        <table className="venda-folha-table">
          <thead>
            <tr>
              <th>Produto</th>
              <th>IMEI</th>
              <th>Qtd</th>
              <th>Unitário</th>
              <th>Desconto</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {sale.lines.map((line, index) => {
              const seriais = imeisDaLinha(line)
              return (
                <tr key={`${line.productId}-${index}`}>
                  <td>
                    <strong>{line.name}</strong>
                    {line.code ? <span>{line.code}</span> : null}
                  </td>
                  <td>{seriais.length ? seriais.join(", ") : "—"}</td>
                  <td>{line.qty}</td>
                  <td>{formatMoneyRs(line.price)}</td>
                  <td>{line.discount > 0 ? formatMoneyRs(line.discount) : "—"}</td>
                  <td>{formatMoneyRs(line.qty * Math.max(0, line.price - line.discount))}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {imeis.length ? (
          <p className="venda-folha-imei">IMEI: {imeis.join(" · ")}</p>
        ) : null}
        <h3>Pagamento</h3>
        <table className="venda-folha-table">
          <thead>
            <tr>
              <th>Forma</th>
              <th>Parcelas</th>
              <th>Valor</th>
            </tr>
          </thead>
          <tbody>
            {sale.payments.length === 0 ? (
              <tr><td colSpan={3}>Nenhuma forma lançada</td></tr>
            ) : sale.payments.map((pay, index) => (
              <tr key={`${pay.method}-${index}`}>
                <td>{pay.method}</td>
                <td>{pay.parcelas && pay.parcelas > 1 ? `${pay.parcelas}x` : "1x"}</td>
                <td>{formatMoneyRs(pay.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="venda-folha-totais">
          <span>Total {formatMoneyRs(sale.total)}</span>
          <span>Recebido {formatMoneyRs(sale.received)}</span>
          <span>Troco {formatMoneyRs(sale.changeAmount)}</span>
        </p>
        {sale.notes?.trim() ? <p className="venda-folha-obs"><b>Observação.</b> {sale.notes}</p> : null}
      </div>
    </div>
  )
}

type Emitente = {
  name: string
  document: string
  phone: string
  address: string
  city: string
}

type GearAnchor = {
  top: number
  bottom: number
  right: number
  up: boolean
}

const EMITENTE_VAZIO: Emitente = { name: "", document: "", phone: "", address: "", city: "" }

export function gearAnchor(button: HTMLButtonElement): GearAnchor {
  const rect = button.getBoundingClientRect()
  const menuHeight = 228
  const up = rect.bottom + 8 + menuHeight > window.innerHeight && rect.top > menuHeight
  return {
    top: rect.bottom + 6,
    bottom: window.innerHeight - rect.top + 6,
    right: Math.max(8, window.innerWidth - rect.right),
    up,
  }
}

function textoDaVenda(sale: LojaPdvSale) {
  const itens = sale.lines.map((line) => {
    const total = line.qty * Math.max(0, line.price - line.discount)
    return `${line.qty}x ${line.name}  ${formatMoneyRs(total)}`
  }).join("\n")
  const pags = sale.payments.map((pay) => {
    const label = pay.parcelas && pay.parcelas > 1 ? `${pay.method} ${pay.parcelas}x` : pay.method
    return `${label}  ${formatMoneyRs(pay.amount)}`
  }).join("\n")
  return [
    `Venda ${sale.code}`,
    `Cliente: ${sale.customerName}`,
    `Data: ${when(sale.finalizedAt || sale.createdAt)}`,
    sale.sellerName ? `Vendedor: ${sale.sellerName}` : null,
    "",
    "Itens",
    itens || "—",
    "",
    "Pagamento",
    pags || "—",
    "",
    `Total: ${formatMoneyRs(sale.total)}`,
    sale.notes?.trim() ? `Obs.: ${sale.notes.trim()}` : null,
  ].filter((line): line is string => line != null).join("\n")
}

function FolhaVenda({ sale, emitente, cupom, lines }: { sale: LojaPdvSale; emitente: Emitente; cupom: boolean; lines: LojaPdvLine[] }) {
  const data = when(sale.finalizedAt || sale.createdAt)
  const loja = emitente.name || "Loja"
  if (cupom) {
    return (
      <article className="nf-cupom-body">
        <strong>{loja}</strong>
        <p>Cupom {sale.code}</p>
        <p>{data}{sale.sellerName ? ` · ${sale.sellerName}` : ""}</p>
        <p>Cliente: {sale.customerName || "Consumidor final"}</p>
        <ul>
          {lines.map((line, index) => (
            <li key={`${line.productId}-${index}`}>
              <span>{line.qty}x {line.name}</span>
              <span>{formatMoneyRs(line.qty * Math.max(0, line.price - line.discount))}</span>
            </li>
          ))}
        </ul>
        {sale.payments.map((pay, index) => (
          <p key={`${pay.method}-${index}`}>
            {pay.parcelas && pay.parcelas > 1 ? `${pay.method} ${pay.parcelas}x` : pay.method}
            {" "}
            {formatMoneyRs(pay.amount)}
          </p>
        ))}
        <strong>Total {formatMoneyRs(sale.total)}</strong>
        {sale.changeAmount > 0 ? <p>Troco {formatMoneyRs(sale.changeAmount)}</p> : null}
        <em>Obrigado pela preferência.</em>
      </article>
    )
  }
  return (
    <ReciboNota
      codigo={sale.code}
      data={data}
      emitente={emitente}
      destinatario={{ nome: sale.customerName }}
      vendedor={sale.sellerName}
      notas={sale.notes || ""}
      lines={lines}
      payments={sale.payments}
      total={sale.total}
      received={sale.received}
      changeAmount={sale.changeAmount}
    />
  )
}

export function SaleActionsMenu({
  sale,
  anchor,
  emitente,
  emitentePronto,
  onClose,
  onNotice,
}: {
  sale: LojaPdvSale
  anchor: GearAnchor
  emitente: Emitente
  emitentePronto: boolean
  onClose: () => void
  onNotice: (text: string) => void
}) {
  const box = useRef<HTMLDivElement>(null)
  const [busy, setBusy] = useState(false)
  const [slip, setSlip] = useState<null | "a4" | "cupom">(null)
  const [linhasNota, setLinhasNota] = useState(sale.lines)

  async function abrirImpressao(kind: "a4" | "cupom") {
    const linhas = await Promise.all(sale.lines.map(async (line) => {
      if (line.category?.trim()) return line
      try {
        const { data } = await api.get(`/clients/products/${line.productId}`)
        const category = String((data.product as { category?: string } | undefined)?.category || "")
        return category ? { ...line, category } : line
      } catch {
        return line
      }
    }))
    setLinhasNota(linhas)
    setSlip(kind)
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  useEffect(() => {
    if (!slip || !emitentePronto) return
    const style = document.createElement("style")
    style.textContent = slip === "cupom"
      ? "@media print { @page { size: 80mm auto; margin: 4mm; } }"
      : "@media print { @page { size: A4; margin: 0; } }"
    document.head.appendChild(style)
    const done = () => {
      style.remove()
      setSlip(null)
      onClose()
    }
    window.addEventListener("afterprint", done)
    const titulo = document.title
    document.title = " "
    const timer = window.setTimeout(() => window.print(), 60)
    const restaurar = () => { document.title = titulo }
    window.addEventListener("afterprint", restaurar, { once: true })
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener("afterprint", done)
      style.remove()
    }
  }, [slip, emitentePronto, onClose])

  async function duplicar() {
    setBusy(true)
    try {
      const { data } = await api.post("/clients/pdv-vendas", {
        caixaCode: sale.caixaCode,
        caixaName: sale.caixaName,
        status: "espera",
        customerName: sale.customerName,
        sellerName: sale.sellerName,
        notes: [sale.notes?.trim(), `Cópia da venda ${sale.code}`].filter(Boolean).join("\n"),
        lines: sale.lines.map((line) => ({
          productId: line.productId,
          code: line.code,
          name: line.name,
          qty: line.qty,
          price: line.price,
          discount: line.discount,
          serials: line.serials || [],
          category: line.category || "",
        })),
        payments: [],
      })
      const code = (data.sale as LojaPdvSale | undefined)?.code
      onNotice(code ? `Venda ${code} criada em aberto, cópia da ${sale.code}.` : "Venda copiada para vendas em aberto.")
      onClose()
    } catch (err) {
      onNotice(parseError(err).friend || "Não foi possível duplicar a venda.")
    } finally {
      setBusy(false)
    }
  }

  async function compartilhar() {
    const texto = textoDaVenda(sale)
    try {
      if (navigator.share) {
        await navigator.share({ title: `Venda ${sale.code}`, text: texto })
      } else {
        await navigator.clipboard.writeText(texto)
        onNotice("Resumo da venda copiado.")
      }
      onClose()
    } catch (err) {
      if ((err as Error).name === "AbortError") return
      try {
        await navigator.clipboard.writeText(texto)
        onNotice("Resumo da venda copiado.")
        onClose()
      } catch {
        onNotice("Não foi possível compartilhar a venda.")
      }
    }
  }

  function email() {
    const subject = encodeURIComponent(`Venda ${sale.code}`)
    const body = encodeURIComponent(textoDaVenda(sale))
    window.location.href = `mailto:?subject=${subject}&body=${body}`
    onClose()
  }

  return (
    <>
      <button className="venda-gear-backdrop" type="button" aria-label="Fechar menu" onClick={onClose} />
      <div
        ref={box}
        className="venda-gear-menu"
        role="menu"
        aria-label={`Ações da venda ${sale.code}`}
        style={anchor.up ? { bottom: anchor.bottom, right: anchor.right } : { top: anchor.top, right: anchor.right }}
      >
        <button className="venda-gear-item" type="button" role="menuitem" onClick={() => void abrirImpressao("cupom")}>
          <Printer size={15} /> Imprimir(Cupom)
        </button>
        <button className="venda-gear-item" type="button" role="menuitem" onClick={() => void abrirImpressao("a4")}>
          <Printer size={15} /> Imprimir(A4)
        </button>
        <button className="venda-gear-item" type="button" role="menuitem" disabled={busy} onClick={() => void duplicar()}>
          <Copy size={15} /> Duplicar Venda
        </button>
        <button className="venda-gear-item" type="button" role="menuitem" onClick={() => void compartilhar()}>
          <Share2 size={15} /> Compartilhar
        </button>
        <button className="venda-gear-item" type="button" role="menuitem" onClick={email}>
          <Mail size={15} /> Enviar e-mail
        </button>
      </div>
      {slip ? (
        <div className={`cx-print nf-print${slip === "cupom" ? " nf-cupom" : ""}`} aria-hidden="true">
          <FolhaVenda sale={sale} emitente={emitente} cupom={slip === "cupom"} lines={linhasNota} />
        </div>
      ) : null}
    </>
  )
}

function SaleFilterBar({
  filters,
  draft,
  caixas,
  onDraft,
  onApply,
  onClear,
}: {
  filters: SaleFilters
  draft: SaleFilters
  caixas: string[]
  onDraft: (next: SaleFilters) => void
  onApply: (event: FormEvent) => void
  onClear: () => void
}) {
  return (
    <form className="pdv-cad-filters" onSubmit={onApply}>
      <label>
        Data início
        <span className="pdv-date-field">
          <input type="date" value={draft.inicio} onChange={(event) => onDraft({ ...draft, inicio: event.target.value })} />
          <DatePreset onPick={(inicio, fim) => onDraft({ ...draft, inicio, fim })} />
        </span>
      </label>
      <label>
        Data fim
        <input type="date" value={draft.fim} onChange={(event) => onDraft({ ...draft, fim: event.target.value })} />
      </label>
      <label>
        Cod. venda
        <input value={draft.cod} onChange={(event) => onDraft({ ...draft, cod: event.target.value })} autoComplete="off" />
      </label>
      <label>
        Cliente
        <input value={draft.nome} onChange={(event) => onDraft({ ...draft, nome: event.target.value })} autoComplete="off" />
      </label>
      <label>
        Caixa
        <select value={draft.caixa} onChange={(event) => onDraft({ ...draft, caixa: event.target.value })}>
          {caixas.map((name) => <option key={name}>{name}</option>)}
        </select>
      </label>
      <div className="pdv-cad-filters-go">
        <button className="pdv-cad-btn" type="button" onClick={onClear}>Limpar</button>
        <button className="pdv-cad-btn pdv-cad-btn-blue" type="submit">Filtrar</button>
      </div>
      {filters.inicio || filters.fim || filters.cod || filters.nome || filters.caixa !== "Todos" ? (
        <p className="pdv-cad-kicker">Filtro ativo.</p>
      ) : null}
    </form>
  )
}

function useEmitenteLoja(fallbackName: string) {
  const [lojaNome, setLojaNome] = useState("")
  const [emitente, setEmitente] = useState<Emitente>(EMITENTE_VAZIO)
  const [emitentePronto, setEmitentePronto] = useState(false)

  useEffect(() => {
    const storeId = typeof sessionStorage === "undefined" ? "" : sessionStorage.getItem(STORE_STORAGE_KEY) || ""
    let vivo = true
    api.get("/clients/stores")
      .then(async ({ data }) => {
        const rows = (data.stores || []) as Array<{ id: string; name: string }>
        const atual = rows.find((item) => item.id === storeId) || rows[0]
        if (!vivo) return
        setLojaNome(atual?.name || fallbackName || "Loja")
        if (!atual?.id) {
          setEmitentePronto(true)
          return
        }
        const loja = await api.get(`/clients/stores/${atual.id}/loja`)
        if (!vivo) return
        setEmitente(emitenteDaLoja(loja.data.store))
        setEmitentePronto(true)
      })
      .catch(() => {
        if (!vivo) return
        setLojaNome(fallbackName || "Loja")
        setEmitentePronto(true)
      })
    return () => { vivo = false }
  }, [fallbackName])

  return { lojaNome, emitente, emitentePronto }
}

export function VendasMovimento({ status }: { status: "espera" | "finalizada" }) {
  const { client } = useClientAuth()
  const { lojaNome, emitente, emitentePronto } = useEmitenteLoja(client?.name || "")
  const [sales, setSales] = useState<LojaPdvSale[]>([])
  const [detail, setDetail] = useState<LojaPdvSale | null>(null)
  const [actions, setActions] = useState<{ sale: LojaPdvSale; anchor: GearAnchor } | null>(null)
  const [aviso, setAviso] = useState("")
  const [hint, setHint] = useState("Carregando...")
  const [draft, setDraft] = useState<SaleFilters>(EMPTY_SALE_FILTERS)
  const [filters, setFilters] = useState<SaleFilters>(EMPTY_SALE_FILTERS)
  const concluida = status === "finalizada"

  useEffect(() => {
    listLojaSales(status)
      .then((rows) => {
        setSales(rows)
        setHint(rows.length ? "" : status === "espera" ? "Nenhuma venda em aberto." : "Nenhuma venda concluída.")
      })
      .catch((err) => setHint(parseError(err).friend || "Não foi possível carregar as vendas."))
  }, [status])

  const caixas = useMemo(() => ["Todos", ...new Set(sales.map((sale) => sale.caixaName).filter(Boolean))], [sales])
  const visible = useMemo(() => filterLojaSales(sales, filters), [sales, filters])

  useEffect(() => {
    if (!aviso) return
    const timer = window.setTimeout(() => setAviso(""), 5000)
    return () => window.clearTimeout(timer)
  }, [aviso])

  return (
    <div className="pdv-venda-round">
      <FilterPage
        title={status === "espera" ? "VENDAS ABERTAS" : "VENDAS CONCLUÍDAS"}
        pageClass="pdv-cli-page"
        actions={ACTIONS}
        fields={[]}
        extra={(
          <>
            {aviso ? <p className="venda-gear-aviso">{aviso}</p> : null}
            <SaleFilterBar
            filters={filters}
            draft={draft}
            caixas={caixas}
            onDraft={setDraft}
            onApply={(event) => { event.preventDefault(); setFilters(draft) }}
            onClear={() => { setDraft(EMPTY_SALE_FILTERS); setFilters(EMPTY_SALE_FILTERS) }}
          />
          </>
        )}
        columns={concluida
          ? ["Cod. Vendas", "Loja", "Caixa", "Identificação", "Cliente", "Usuário", "Data Abertura", "Data Conclusão", "Total", "Frete", "Status"]
          : ["Código", "Caixa", "Cliente", "Vendedor", "Abertura", "Conclusão", "Total", "Pagamento", "Status"]}
        rows={visible.map((sale) => concluida ? [
          sale.code,
          lojaNome || "—",
          sale.caixaName || "—",
          sale.sellerName || sale.caixaName || "—",
          sale.customerName,
          sale.sellerName || "—",
          when(sale.createdAt),
          when(sale.finalizedAt),
          formatMoneyRs(sale.total),
          "—",
          "Concluída",
        ] : [
          sale.code,
          sale.caixaName || "—",
          sale.customerName,
          sale.sellerName || "—",
          when(sale.createdAt),
          when(sale.finalizedAt),
          formatMoneyRs(sale.total),
          payText(sale),
          "Em aberto",
        ])}
        hint={visible.length ? hint || undefined : "Nenhuma venda para o filtro atual."}
        rowLead={concluida ? (index) => (
          <button
            className="venda-lupa"
            type="button"
            aria-label={`Abrir venda ${visible[index]?.code || ""}`}
            onClick={() => setDetail(visible[index])}
          >
            <Search size={15} />
          </button>
        ) : undefined}
        rowLeadLabel={concluida ? "Visualizar" : undefined}
        onRowClick={concluida ? undefined : (index) => setDetail(visible[index])}
        closedLabel={concluida ? "Gerenciar" : undefined}
        closedAction={(index) => (
          <button
            className="pdv-cad-icon-btn"
            type="button"
            aria-label={`Ações da venda ${visible[index]?.code || ""}`}
            onClick={(event) => {
              event.stopPropagation()
              const sale = visible[index]
              if (!sale) return
              setActions((current) => (
                current?.sale.id === sale.id ? null : { sale, anchor: gearAnchor(event.currentTarget) }
              ))
            }}
          >
            <Settings size={16} aria-hidden="true" />
          </button>
        )}
      />
      {detail ? <SaleDetailPanel sale={detail} emitente={emitente} onClose={() => setDetail(null)} /> : null}
      {actions ? (
        <SaleActionsMenu
          sale={actions.sale}
          anchor={actions.anchor}
          emitente={emitente}
          emitentePronto={emitentePronto}
          onClose={() => setActions(null)}
          onNotice={setAviso}
        />
      ) : null}
    </div>
  )
}

function reportView(path: string, sales: LojaPdvSale[]) {
  if (path.endsWith("forma-pagamento")) {
    const map = new Map<string, { count: number; total: number }>()
    sales.forEach((sale) => {
      sale.payments.forEach((pay) => {
        const row = map.get(pay.method) || { count: 0, total: 0 }
        row.count += 1
        row.total += pay.amount
        map.set(pay.method, row)
      })
    })
    return {
      columns: ["Forma", "Quantidade", "Total"],
      rows: [...map.entries()].map(([method, row]) => [method, String(row.count), formatMoneyRs(row.total)]),
      linked: false,
    }
  }
  if (path.endsWith("/itens")) {
    return {
      columns: ["Venda", "Produto", "Qtd", "Total"],
      rows: sales.flatMap((sale) => sale.lines.map((line) => [
        sale.code,
        line.name,
        String(line.qty),
        formatMoneyRs(line.qty * Math.max(0, line.price - line.discount)),
      ])),
      linked: true,
    }
  }
  if (path.endsWith("produto-mais-vendido") || path.endsWith("/giro") || path.endsWith("giro-grade")) {
    const map = new Map<string, { qty: number; total: number }>()
    sales.forEach((sale) => {
      sale.lines.forEach((line) => {
        const row = map.get(line.name) || { qty: 0, total: 0 }
        row.qty += line.qty
        row.total += line.qty * Math.max(0, line.price - line.discount)
        map.set(line.name, row)
      })
    })
    return {
      columns: ["Produto", "Quantidade", "Total"],
      rows: [...map.entries()]
        .sort((a, b) => b[1].qty - a[1].qty)
        .map(([name, row]) => [name, String(row.qty), formatMoneyRs(row.total)]),
      linked: false,
    }
  }
  if (path.endsWith("vendedores-mes") || path.endsWith("comissao")) {
    const map = new Map<string, number>()
    sales.forEach((sale) => {
      const key = sale.sellerName || "Sem vendedor"
      map.set(key, (map.get(key) || 0) + sale.total)
    })
    return {
      columns: ["Vendedor", "Total"],
      rows: [...map.entries()].map(([name, total]) => [name, formatMoneyRs(total)]),
      linked: false,
    }
  }
  if (path.endsWith("cliente-mes") || path.endsWith("cliente-loja")) {
    const map = new Map<string, number>()
    sales.forEach((sale) => map.set(sale.customerName, (map.get(sale.customerName) || 0) + sale.total))
    return {
      columns: ["Cliente", "Total"],
      rows: [...map.entries()].map(([name, total]) => [name, formatMoneyRs(total)]),
      linked: false,
    }
  }
  if (path.includes("faturamento")) {
    const total = sales.reduce((sum, sale) => sum + sale.total, 0)
    return {
      columns: ["Período", "Total"],
      rows: [["Vendas da loja", formatMoneyRs(total)]],
      linked: false,
    }
  }
  if (path.endsWith("descontos")) {
    return {
      columns: ["Venda", "Produto", "Desconto"],
      rows: sales.flatMap((sale) => sale.lines
        .filter((line) => line.discount > 0)
        .map((line) => [sale.code, line.name, formatMoneyRs(line.discount)])),
      linked: true,
    }
  }
  return {
    columns: ["Venda", "Cliente", "Caixa", "Vendedor", "Total", "Pagamento"],
    rows: sales.map((sale) => [
      sale.code,
      sale.customerName,
      sale.caixaName || "—",
      sale.sellerName || "—",
      formatMoneyRs(sale.total),
      payText(sale),
    ]),
    linked: true,
  }
}

export function VendasRelatorio({ def }: { def: FilterPageProps & { path: string } }) {
  const { emitente, emitentePronto } = useEmitenteLoja("")
  const [sales, setSales] = useState<LojaPdvSale[]>([])
  const [hint, setHint] = useState("Carregando...")
  const [detail, setDetail] = useState<LojaPdvSale | null>(null)
  const [actions, setActions] = useState<{ sale: LojaPdvSale; anchor: GearAnchor } | null>(null)
  const [aviso, setAviso] = useState("")
  const [draft, setDraft] = useState<SaleFilters>(EMPTY_SALE_FILTERS)
  const [filters, setFilters] = useState<SaleFilters>(EMPTY_SALE_FILTERS)

  useEffect(() => {
    listLojaSales("finalizada")
      .then((list) => {
        setSales(list)
        setHint(list.length ? "" : "Nenhuma venda da loja neste relatório.")
      })
      .catch((err) => setHint(parseError(err).friend || "Não foi possível carregar o relatório."))
  }, [def.path])

  const caixas = useMemo(() => ["Todos", ...new Set(sales.map((sale) => sale.caixaName).filter(Boolean))], [sales])
  const filtered = useMemo(() => filterLojaSales(sales, filters), [sales, filters])
  const view = useMemo(() => reportView(def.path, filtered), [def.path, filtered])
  const saleByCode = useMemo(() => new Map(filtered.map((sale) => [sale.code, sale])), [filtered])

  useEffect(() => {
    if (!aviso) return
    const timer = window.setTimeout(() => setAviso(""), 5000)
    return () => window.clearTimeout(timer)
  }, [aviso])

  return (
    <>
      <FilterPage
        {...def}
        fields={[]}
        extra={(
          <>
            {aviso ? <p className="venda-gear-aviso">{aviso}</p> : null}
            <SaleFilterBar
            filters={filters}
            draft={draft}
            caixas={caixas}
            onDraft={setDraft}
            onApply={(event) => { event.preventDefault(); setFilters(draft) }}
            onClear={() => { setDraft(EMPTY_SALE_FILTERS); setFilters(EMPTY_SALE_FILTERS) }}
          />
          </>
        )}
        columns={view.columns}
        rows={view.rows}
        hint={view.rows.length ? hint || def.hint : "Nenhuma venda para o filtro atual."}
        onRowClick={view.linked ? (index) => {
          const code = view.rows[index]?.[0]
          const sale = code ? saleByCode.get(code) : undefined
          if (sale) setDetail(sale)
        } : undefined}
        closedAction={view.linked ? (index) => {
          const code = view.rows[index]?.[0]
          const sale = code ? saleByCode.get(code) : undefined
          if (!sale) return null
          return (
            <button
              className="pdv-cad-icon-btn"
              type="button"
              aria-label={`Ações da venda ${sale.code}`}
              onClick={(event) => {
                event.stopPropagation()
                setActions((current) => (
                  current?.sale.id === sale.id ? null : { sale, anchor: gearAnchor(event.currentTarget) }
                ))
              }}
            >
              <Settings size={16} aria-hidden="true" />
            </button>
          )
        } : undefined}
      />
      {detail ? <SaleDetailPanel sale={detail} emitente={emitente} onClose={() => setDetail(null)} /> : null}
      {actions ? (
        <SaleActionsMenu
          sale={actions.sale}
          anchor={actions.anchor}
          emitente={emitente}
          emitentePronto={emitentePronto}
          onClose={() => setActions(null)}
          onNotice={setAviso}
        />
      ) : null}
    </>
  )
}

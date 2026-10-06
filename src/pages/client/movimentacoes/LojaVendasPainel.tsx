import { FormEvent, useEffect, useMemo, useState } from "react"
import { Settings, X } from "lucide-react"
import FilterPage, { type FilterPageProps } from "../pdv/FilterPage"
import { api, parseError } from "../../../services/api"
import { formatMoneyRs } from "../cadastros/produtos/types"
import { EMPTY_SALE_FILTERS, filterLojaSales, type SaleFilters } from "./lojaSalesFilters"

export type LojaPdvLine = {
  productId: string
  code: string
  name: string
  qty: number
  price: number
  discount: number
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
  { label: "Concluídas", href: "/client/movimentacoes/vendas/concluidas" },
  { label: "Abertas", tone: "blue" as const, href: "/client/movimentacoes/vendas/abertas" },
  { label: "Nova", tone: "green" as const, href: "/client/pdv" },
]

export async function listLojaSales(status?: "espera" | "finalizada") {
  const { data } = await api.get("/clients/pdv-vendas", { params: status ? { status } : undefined })
  return (data.sales || []) as LojaPdvSale[]
}

function when(value?: string | null) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleString("pt-BR")
}

function payText(sale: LojaPdvSale) {
  if (!sale.payments.length) return "—"
  return sale.payments.map((pay) => {
    const label = pay.parcelas && pay.parcelas > 1 ? `${pay.method} ${pay.parcelas}x` : pay.method
    return `${label} ${formatMoneyRs(pay.amount)}`
  }).join(" · ")
}

export function SaleGear({ sale, onClose }: { sale: LojaPdvSale; onClose: () => void }) {
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
        className="pdv-caixa-confirm-card pdv-gear-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="loja-venda-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button className="pdv-cad-icon-btn pdv-gear-close" type="button" aria-label="Fechar" onClick={onClose}>
          <X size={16} />
        </button>
        <h2 id="loja-venda-title">Venda {sale.code}</h2>
        <p><b>Cliente:</b> {sale.customerName}</p>
        <p><b>Vendedor:</b> {sale.sellerName || "Sem vendedor"}</p>
        <p><b>Caixa:</b> {sale.caixaName || "Sem caixa"}</p>
        {sale.notes ? <p><b>Observação / IMEI:</b> {sale.notes}</p> : null}
        <p>Aberta em {when(sale.createdAt)} · {sale.status === "finalizada" ? `Concluída em ${when(sale.finalizedAt)}` : "Pendente de baixa"}</p>
        <h3>Itens</h3>
        <ul>
          {sale.lines.map((line) => (
            <li key={`${line.productId}-${line.name}`}>
              <span>{line.qty} × {line.name}{line.code ? ` · ref. ${line.code}` : ""}</span>
              <b>{formatMoneyRs(line.qty * Math.max(0, line.price - line.discount))}</b>
            </li>
          ))}
        </ul>
        <h3>Pagamento</h3>
        <ul>
          {sale.payments.length === 0 ? <li><span>Nenhuma forma lançada</span><b>—</b></li> : null}
          {sale.payments.map((pay, index) => (
            <li key={`${pay.method}-${index}`}>
              <span>{pay.parcelas && pay.parcelas > 1 ? `${pay.method} · ${pay.parcelas}x` : pay.method}</span>
              <b>{formatMoneyRs(pay.amount)}</b>
            </li>
          ))}
        </ul>
        <p>Total {formatMoneyRs(sale.total)} · Recebido {formatMoneyRs(sale.received)} · Troco {formatMoneyRs(sale.changeAmount)}</p>
      </div>
    </div>
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
        <input type="date" value={draft.inicio} onChange={(event) => onDraft({ ...draft, inicio: event.target.value })} />
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

export function VendasMovimento({ status }: { status: "espera" | "finalizada" }) {
  const [sales, setSales] = useState<LojaPdvSale[]>([])
  const [open, setOpen] = useState<LojaPdvSale | null>(null)
  const [hint, setHint] = useState("Carregando...")
  const [draft, setDraft] = useState<SaleFilters>(EMPTY_SALE_FILTERS)
  const [filters, setFilters] = useState<SaleFilters>(EMPTY_SALE_FILTERS)

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

  return (
    <>
      <FilterPage
        title={status === "espera" ? "VENDAS ABERTAS" : "VENDAS CONCLUÍDAS"}
        actions={ACTIONS}
        fields={[]}
        extra={(
          <SaleFilterBar
            filters={filters}
            draft={draft}
            caixas={caixas}
            onDraft={setDraft}
            onApply={(event) => { event.preventDefault(); setFilters(draft) }}
            onClear={() => { setDraft(EMPTY_SALE_FILTERS); setFilters(EMPTY_SALE_FILTERS) }}
          />
        )}
        columns={["Código", "Caixa", "Cliente", "Vendedor", "Abertura", "Conclusão", "Total", "Pagamento", "Status"]}
        rows={visible.map((sale) => [
          sale.code,
          sale.caixaName || "—",
          sale.customerName,
          sale.sellerName || "—",
          when(sale.createdAt),
          when(sale.finalizedAt),
          formatMoneyRs(sale.total),
          payText(sale),
          sale.status === "finalizada" ? "Concluída" : "Em aberto",
        ])}
        hint={visible.length ? hint || undefined : "Nenhuma venda para o filtro atual."}
        onRowClick={(index) => setOpen(visible[index])}
        closedAction={(index) => (
          <button
            className="pdv-cad-icon-btn"
            type="button"
            aria-label={`Ver venda ${visible[index]?.code || ""}`}
            onClick={(event) => {
              event.stopPropagation()
              setOpen(visible[index])
            }}
          >
            <Settings size={16} aria-hidden="true" />
          </button>
        )}
      />
      {open ? <SaleGear sale={open} onClose={() => setOpen(null)} /> : null}
    </>
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
  const [sales, setSales] = useState<LojaPdvSale[]>([])
  const [hint, setHint] = useState("Carregando...")
  const [open, setOpen] = useState<LojaPdvSale | null>(null)
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

  return (
    <>
      <FilterPage
        {...def}
        fields={[]}
        extra={(
          <SaleFilterBar
            filters={filters}
            draft={draft}
            caixas={caixas}
            onDraft={setDraft}
            onApply={(event) => { event.preventDefault(); setFilters(draft) }}
            onClear={() => { setDraft(EMPTY_SALE_FILTERS); setFilters(EMPTY_SALE_FILTERS) }}
          />
        )}
        columns={view.columns}
        rows={view.rows}
        hint={view.rows.length ? hint || def.hint : "Nenhuma venda para o filtro atual."}
        onRowClick={view.linked ? (index) => {
          const code = view.rows[index]?.[0]
          const sale = code ? saleByCode.get(code) : undefined
          if (sale) setOpen(sale)
        } : undefined}
        closedAction={view.linked ? (index) => {
          const code = view.rows[index]?.[0]
          const sale = code ? saleByCode.get(code) : undefined
          if (!sale) return null
          return (
            <button
              className="pdv-cad-icon-btn"
              type="button"
              aria-label={`Ver venda ${sale.code}`}
              onClick={(event) => {
                event.stopPropagation()
                setOpen(sale)
              }}
            >
              <Settings size={16} aria-hidden="true" />
            </button>
          )
        } : undefined}
      />
      {open ? <SaleGear sale={open} onClose={() => setOpen(null)} /> : null}
    </>
  )
}

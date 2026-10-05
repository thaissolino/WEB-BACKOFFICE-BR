import { useEffect, useState } from "react"
import { Settings, X } from "lucide-react"
import FilterPage, { type FilterPageProps } from "../pdv/FilterPage"
import { api, parseError } from "../../../services/api"
import { formatMoneyRs } from "../cadastros/produtos/types"

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
}

export type LojaPdvSale = {
  id: string
  code: string
  caixaCode: number
  caixaName: string
  status: "espera" | "finalizada"
  customerName: string
  sellerName: string
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
  { label: "Nova", tone: "green" as const, href: "/client/pdv" },
  { label: "Abertas", tone: "blue" as const, href: "/client/movimentacoes/vendas/abertas" },
  { label: "Concluídas", href: "/client/movimentacoes/vendas/concluidas" },
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
  return sale.payments.map((pay) => `${pay.method} ${formatMoneyRs(pay.amount)}`).join(" · ")
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
        <p>{sale.customerName} · {sale.caixaName || "Sem caixa"} · {sale.sellerName || "Sem vendedor"}</p>
        <p>Aberta em {when(sale.createdAt)} · {sale.status === "finalizada" ? `Concluída em ${when(sale.finalizedAt)}` : "Pendente de baixa"}</p>
        <h3>Itens</h3>
        <ul>
          {sale.lines.map((line) => (
            <li key={`${line.productId}-${line.name}`}>
              <span>{line.qty} × {line.name}</span>
              <b>{formatMoneyRs(line.qty * Math.max(0, line.price - line.discount))}</b>
            </li>
          ))}
        </ul>
        <h3>Pagamento</h3>
        <ul>
          {sale.payments.length === 0 ? <li><span>Nenhuma forma lançada</span><b>—</b></li> : null}
          {sale.payments.map((pay, index) => (
            <li key={`${pay.method}-${index}`}>
              <span>{pay.method}</span>
              <b>{formatMoneyRs(pay.amount)}</b>
            </li>
          ))}
        </ul>
        <p>Total {formatMoneyRs(sale.total)} · Recebido {formatMoneyRs(sale.received)} · Troco {formatMoneyRs(sale.changeAmount)}</p>
      </div>
    </div>
  )
}

export function VendasMovimento({ status }: { status: "espera" | "finalizada" }) {
  const [sales, setSales] = useState<LojaPdvSale[]>([])
  const [open, setOpen] = useState<LojaPdvSale | null>(null)
  const [hint, setHint] = useState("Carregando...")

  useEffect(() => {
    listLojaSales(status)
      .then((rows) => {
        setSales(rows)
        setHint(rows.length ? "" : status === "espera" ? "Nenhuma venda em aberto." : "Nenhuma venda concluída.")
      })
      .catch((err) => setHint(parseError(err).friend || "Não foi possível carregar as vendas."))
  }, [status])

  return (
    <>
      <FilterPage
        title={status === "espera" ? "VENDAS ABERTAS" : "VENDAS CONCLUÍDAS"}
        actions={ACTIONS}
        fields={[
          { key: "cod", label: "Cod. Vendas" },
          { key: "nome", label: "Nome do Cliente" },
        ]}
        columns={["Código", "Caixa", "Cliente", "Vendedor", "Abertura", "Conclusão", "Total", "Pagamento", "Status"]}
        rows={sales.map((sale) => [
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
        hint={hint || undefined}
        closedAction={(index) => (
          <button
            className="pdv-cad-icon-btn"
            type="button"
            aria-label={`Ver venda ${sales[index]?.code || ""}`}
            onClick={(event) => {
              event.stopPropagation()
              setOpen(sales[index])
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
  const [columns, setColumns] = useState(def.columns)
  const [rows, setRows] = useState<string[][]>([])
  const [linked, setLinked] = useState(false)
  const [hint, setHint] = useState("Carregando...")
  const [open, setOpen] = useState<LojaPdvSale | null>(null)

  useEffect(() => {
    listLojaSales("finalizada")
      .then((list) => {
        const view = reportView(def.path, list)
        setSales(list)
        setColumns(view.columns)
        setRows(view.rows)
        setLinked(view.linked)
        setHint(view.rows.length ? "" : "Nenhuma venda da loja neste relatório.")
      })
      .catch((err) => setHint(parseError(err).friend || "Não foi possível carregar o relatório."))
  }, [def.path])

  return (
    <>
      <FilterPage
        {...def}
        columns={columns}
        rows={rows}
        hint={hint || def.hint}
        closedAction={linked ? (index) => {
          const sale = sales.find((item) => item.code === rows[index]?.[0])
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

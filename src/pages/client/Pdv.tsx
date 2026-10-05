import { FormEvent, useEffect, useState } from "react"
import { Navigate, useNavigate } from "react-router-dom"
import {
  Banknote,
  Check,
  CreditCard,
  Minus,
  Plus,
  Printer,
  QrCode,
  Receipt,
  Search,
  ShoppingCart,
  Trash2,
  UserRound,
  Wallet,
} from "lucide-react"
import { useClientAuth } from "../../hooks/clientAuth"
import PdvShell, { PdvLoading } from "./dashboard/PdvShell"
import { api } from "../../services/api"
import { formatMoneyBr, formatMoneyRs, parseMoneyBr, type PdvProduct } from "./cadastros/produtos/types"
import "./cadastros/cadastros.css"

type PayTab = "dinheiro" | "cartao" | "pix" | "outros"

type CartLine = {
  id: string
  code: string
  reference: string
  name: string
  qty: number
  price: number
  discount: number
  stock: number
}

const PAY_TABS: { id: PayTab; label: string; icon: typeof Banknote }[] = [
  { id: "dinheiro", label: "Dinheiro", icon: Banknote },
  { id: "cartao", label: "Cartão", icon: CreditCard },
  { id: "pix", label: "PIX", icon: QrCode },
  { id: "outros", label: "Outros", icon: Wallet },
]

function PdvBoard() {
  const navigate = useNavigate()
  const [cliente, setCliente] = useState("CONSUMIDOR FINAL")
  const [qtyInput, setQtyInput] = useState(1)
  const [query, setQuery] = useState("")
  const [hits, setHits] = useState<PdvProduct[]>([])
  const [cart, setCart] = useState<CartLine[]>([])
  const [payTab, setPayTab] = useState<PayTab>("dinheiro")
  const [received, setReceived] = useState("")
  const [status, setStatus] = useState("")
  const [askCancel, setAskCancel] = useState(false)

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setHits([])
      return
    }
    const timer = window.setTimeout(() => {
      api
        .get("/clients/products", { params: { search: q, ativo: "1" } })
        .then(({ data }) => setHits(((data.products as PdvProduct[]) ?? []).slice(0, 6)))
        .catch(() => setStatus("Não foi possível pesquisar produtos."))
    }, 250)
    return () => window.clearTimeout(timer)
  }, [query])

  const itemCount = cart.reduce((sum, line) => sum + line.qty, 0)
  const subtotal = cart.reduce((sum, line) => sum + line.qty * line.price, 0)
  const discount = cart.reduce((sum, line) => sum + line.qty * line.discount, 0)
  const total = Math.max(0, subtotal - discount)
  const paid = parseMoneyBr(received)

  function addProduct(product: PdvProduct) {
    const stock = Math.max(0, Math.floor(Number(product.lojaStock) || 0))
    const addQty = Math.max(1, qtyInput)
    if (stock < 1) {
      setStatus("Sem estoque na loja.")
      return
    }
    const found = cart.find((line) => line.id === product.id)
    if ((found?.qty || 0) + addQty > stock) {
      setStatus("Quantidade maior que o estoque da loja.")
      return
    }
    setCart((current) => {
      const row = current.find((line) => line.id === product.id)
      if (row) return current.map((line) => (line.id === product.id ? { ...line, qty: line.qty + addQty, stock } : line))
      return [
        ...current,
        {
          id: product.id,
          code: product.code || product.barcode,
          reference: product.reference || "—",
          name: product.name,
          qty: addQty,
          price: product.salePrice || 0,
          discount: 0,
          stock,
        },
      ]
    })
    setQuery("")
    setHits([])
    setStatus("")
  }

  function consult(event?: FormEvent) {
    event?.preventDefault()
    const q = query.trim().toLowerCase()
    if (!q) {
      document.getElementById("cx-produto")?.focus()
      return
    }
    const exact = hits.find((item) => item.code.toLowerCase() === q || item.barcode.toLowerCase() === q || item.name.toLowerCase() === q)
    if (exact) {
      addProduct(exact)
      return
    }
    if (hits.length === 1) {
      addProduct(hits[0])
      return
    }
    api
      .get("/clients/products", { params: { search: query.trim(), ativo: "1" } })
      .then(({ data }) => {
        const products = ((data.products as PdvProduct[]) ?? []).slice(0, 6)
        setHits(products)
        const hit = products.find((item) => item.code.toLowerCase() === q || item.barcode.toLowerCase() === q)
        if (hit) addProduct(hit)
        else if (products.length === 1) addProduct(products[0])
        else setStatus(products.length ? "Escolha o produto na lista." : "Nenhum produto encontrado.")
      })
      .catch(() => setStatus("Não foi possível pesquisar produtos."))
  }

  function clearSale() {
    setCart([])
    setReceived("")
    setQuery("")
    setHits([])
    setQtyInput(1)
    setPayTab("dinheiro")
    setStatus("")
    setAskCancel(false)
  }

  function finish() {
    if (cart.length === 0) {
      setStatus("Inclua um produto.")
      return
    }
    if (paid + 0.009 < total) {
      setStatus(`Falta receber ${formatMoneyRs(Math.max(0, total - paid))}.`)
      return
    }
    clearSale()
    setStatus("Venda finalizada.")
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "F2") {
        event.preventDefault()
        finish()
      } else if (event.key === "F3" && !(event.target instanceof HTMLInputElement)) {
        event.preventDefault()
        window.print()
      } else if (event.key === "Escape") {
        setAskCancel(false)
        setHits([])
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  })

  return (
    <section className="cx-pdv">
      <header className="cx-head">
        <div className="cx-brand">
          <span className="cx-brand-ico" aria-hidden="true">
            <ShoppingCart size={18} strokeWidth={2.2} />
          </span>
          <div>
            <h1>PDV – Caixa</h1>
            <p>Registre suas vendas de forma rápida e simples</p>
          </div>
        </div>
        <div className="cx-head-actions">
          <button type="button" onClick={() => navigate("/client/caixa")}>
            <Receipt size={15} strokeWidth={2.2} aria-hidden="true" />
            Trocar Caixa
          </button>
          <button type="button" onClick={() => document.getElementById("cx-produto")?.focus()}>
            <Search size={15} strokeWidth={2.2} aria-hidden="true" />
            Consultar Produto
          </button>
          <button className="cx-danger" type="button" onClick={() => (cart.length ? setAskCancel(true) : clearSale())}>
            <Trash2 size={15} strokeWidth={2.2} aria-hidden="true" />
            Cancelar Venda
          </button>
        </div>
      </header>

      <div className="cx-main">
        <form className="cx-card cx-entry" onSubmit={consult}>
          <label className="cx-cliente">
            <span>Cliente</span>
            <span className="cx-input">
              <UserRound size={16} strokeWidth={2.1} aria-hidden="true" />
              <select value={cliente} onChange={(event) => setCliente(event.target.value)} aria-label="Cliente">
                <option>CONSUMIDOR FINAL</option>
              </select>
            </span>
          </label>
          <label className="cx-produto">
            <span>Produto</span>
            <span className="cx-input">
              <Search size={16} strokeWidth={2.1} aria-hidden="true" />
              <input
                id="cx-produto"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Digite o código, referência ou nome do produto..."
                autoComplete="off"
                autoFocus
              />
            </span>
          </label>
          <div className="cx-qty">
            <span>Quantidade</span>
            <div>
              <button type="button" aria-label="Diminuir quantidade" onClick={() => setQtyInput((value) => Math.max(1, value - 1))}>
                <Minus size={14} strokeWidth={2.4} />
              </button>
              <strong>{qtyInput}</strong>
              <button type="button" aria-label="Aumentar quantidade" onClick={() => setQtyInput((value) => value + 1)}>
                <Plus size={14} strokeWidth={2.4} />
              </button>
            </div>
          </div>
          <button className="cx-add" type="submit">
            <Plus size={16} strokeWidth={2.4} aria-hidden="true" />
            Adicionar (ENTER)
          </button>
        </form>

        {hits.length > 0 ? (
          <ul className="cx-hits">
            {hits.map((product) => (
              <li key={product.id}>
                <button type="button" onClick={() => addProduct(product)}>
                  <b>{product.code}</b>
                  <span>{product.name}</span>
                  <em>{formatMoneyRs(product.salePrice || 0)}</em>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        {status ? <p className="cx-status" role="status">{status}</p> : null}

        <section className="cx-card cx-items" aria-labelledby="cx-items-title">
          <div className="cx-items-head">
            <h2 id="cx-items-title">
              <ShoppingCart size={16} strokeWidth={2.2} aria-hidden="true" />
              Itens da Venda
              <em>{itemCount === 1 ? "1 item" : `${itemCount} itens`}</em>
            </h2>
            <button type="button" onClick={() => setCart([])} disabled={cart.length === 0}>
              Limpar Venda
            </button>
          </div>
          <div className="cx-table-head" aria-hidden="true">
            <span>Produto</span>
            <span>Referência</span>
            <span>Qtd.</span>
            <span>Valor Unit.</span>
            <span>Desconto</span>
            <span>Subtotal</span>
          </div>
          {cart.length === 0 ? (
            <div className="cx-empty">
              <span aria-hidden="true">
                <ShoppingCart size={22} strokeWidth={1.8} />
                <svg viewBox="0 0 36 28" width="36" height="28">
                  <path d="M4 22c8-2 10-16 26-16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                  <path d="M24 2l8 4-8 4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <strong>Nenhum produto adicionado</strong>
              <p>Busque um produto e adicione à venda para começar</p>
            </div>
          ) : (
            <ul className="cx-lines">
              {cart.map((line) => (
                <li key={line.id}>
                  <b>{line.name}</b>
                  <span>{line.reference}</span>
                  <span>{line.qty}</span>
                  <span>{formatMoneyRs(line.price)}</span>
                  <span>{formatMoneyRs(line.discount)}</span>
                  <span>{formatMoneyRs(line.qty * Math.max(0, line.price - line.discount))}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <aside className="cx-side">
        <section className="cx-card" aria-labelledby="cx-sum-title">
          <h2 id="cx-sum-title">
            <Receipt size={16} strokeWidth={2.2} aria-hidden="true" />
            Resumo da Venda
          </h2>
          <dl>
            <div>
              <dt>Itens ({itemCount})</dt>
              <dd>{formatMoneyRs(subtotal)}</dd>
            </div>
            <div>
              <dt>Subtotal</dt>
              <dd>{formatMoneyRs(subtotal)}</dd>
            </div>
            <div className="cx-off">
              <dt>Desconto</dt>
              <dd>- {formatMoneyRs(discount)}</dd>
            </div>
          </dl>
          <div className="cx-total">
            <span>Total da Venda</span>
            <strong>{formatMoneyRs(total)}</strong>
          </div>
        </section>

        <section className="cx-card" aria-labelledby="cx-pay-title">
          <h2 id="cx-pay-title">
            <Banknote size={16} strokeWidth={2.2} aria-hidden="true" />
            Forma de Pagamento
          </h2>
          <div className="cx-tabs" role="tablist" aria-label="Forma de pagamento">
            {PAY_TABS.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={payTab === tab.id}
                  onClick={() => setPayTab(tab.id)}
                >
                  <Icon size={15} strokeWidth={2.1} aria-hidden="true" />
                  {tab.label}
                </button>
              )
            })}
          </div>
          <label className="cx-received">
            Valor Recebido
            <span>
              <b>R$</b>
              <input
                value={received}
                inputMode="decimal"
                placeholder="0,00"
                onChange={(event) => setReceived(event.target.value)}
              />
            </span>
          </label>
          <button className="cx-finish" type="button" onClick={finish}>
            <Check size={16} strokeWidth={2.6} aria-hidden="true" />
            Finalizar Venda (F2)
          </button>
          <button className="cx-print" type="button" onClick={() => window.print()}>
            <Printer size={15} strokeWidth={2.1} aria-hidden="true" />
            Imprimir Cupom (F3)
          </button>
        </section>
      </aside>

      <div className="cx-print" aria-hidden="true">
        <p>PDV – Caixa</p>
        <p>{cliente}</p>
        <p>{PAY_TABS.find((tab) => tab.id === payTab)?.label}</p>
        {cart.map((line) => (
          <p key={line.id}>{line.qty} x {line.name} {formatMoneyRs(line.qty * Math.max(0, line.price - line.discount))}</p>
        ))}
        <p>Total {formatMoneyRs(total)}</p>
        <p>Recebido {received ? `R$ ${formatMoneyBr(paid)}` : "R$ 0,00"}</p>
      </div>

      {askCancel ? (
        <div className="pdv-caixa-confirm" onClick={() => setAskCancel(false)}>
          <div className="pdv-caixa-confirm-card" role="alertdialog" aria-modal="true" aria-labelledby="cx-cancel-title" onClick={(event) => event.stopPropagation()}>
            <h2 id="cx-cancel-title">Cancelar esta venda?</h2>
            <p>Os itens saem da tela e a venda não é gravada.</p>
            <div className="pdv-caixa-confirm-actions">
              <button className="pdv-cad-btn" type="button" onClick={() => setAskCancel(false)}>Voltar</button>
              <button className="pdv-cad-btn pdv-cad-btn-red" type="button" onClick={clearSale}>Cancelar venda</button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}

export default function ClientPdv() {
  const { client, loadingClient } = useClientAuth()
  if (loadingClient) return <PdvLoading />
  if (!client) return <Navigate to="/signin/lojista" replace />
  return (
    <PdvShell variant="form">
      <PdvBoard />
    </PdvShell>
  )
}

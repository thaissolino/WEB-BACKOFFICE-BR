import { FormEvent, useEffect, useState } from "react"
import { Navigate, useNavigate } from "react-router-dom"
import {
  ArrowLeft,
  Banknote,
  Check,
  Minus,
  Plus,
  Printer,
  Receipt,
  Search,
  ShoppingCart,
  Trash2,
  UserRound,
  X,
} from "lucide-react"
import { useClientAuth } from "../../hooks/clientAuth"
import PdvShell, { PdvLoading } from "./dashboard/PdvShell"
import { api, parseError } from "../../services/api"
import { formatMoneyBr, formatMoneyRs, parseMoneyBr, type PdvProduct } from "./cadastros/produtos/types"
import { listLojaCaixas } from "./cadastros/financeiro/caixaApi"
import { CAIXA_STORAGE_KEY } from "./dashboard/mockData"
import "./cadastros/cadastros.css"

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

type PayLine = { method: string; amount: number }

type OpenSale = {
  id: string
  code: string
  caixaName: string
  customerName: string
  sellerName: string
  lines: Array<{ productId: string; name: string; qty: number; price: number; discount: number }>
  payments: PayLine[]
  total: number
  received: number
  changeAmount: number
  status: string
}

type PrintedSale = {
  kind: "" | "nf" | "recibo"
  code: string
  customer: string
  lines: OpenSale["lines"]
  payments: PayLine[]
  total: number
  received: number
  changeAmount: number
}

const DEFAULT_METHODS = ["Dinheiro", "Cartão", "PIX", "Outros"]

function moneySum(lines: PayLine[]) {
  return Math.round(lines.reduce((sum, line) => sum + line.amount, 0) * 100) / 100
}

function PdvBoard() {
  const navigate = useNavigate()
  const [cliente, setCliente] = useState("CONSUMIDOR FINAL")
  const [clientQuery, setClientQuery] = useState("")
  const [customers, setCustomers] = useState<Array<{ code: string; name: string }>>([])
  const [showClient, setShowClient] = useState(false)
  const [newName, setNewName] = useState("")
  const [newPhone, setNewPhone] = useState("")
  const [newDoc, setNewDoc] = useState("")
  const [savingClient, setSavingClient] = useState(false)
  const [qtyInput, setQtyInput] = useState(1)
  const [query, setQuery] = useState("")
  const [hits, setHits] = useState<PdvProduct[]>([])
  const [cart, setCart] = useState<CartLine[]>([])
  const [methods, setMethods] = useState(DEFAULT_METHODS)
  const [payMethod, setPayMethod] = useState(DEFAULT_METHODS[0])
  const [received, setReceived] = useState("")
  const [payments, setPayments] = useState<PayLine[]>([])
  const [sellers, setSellers] = useState<string[]>([])
  const [seller, setSeller] = useState("")
  const [caixaName, setCaixaName] = useState("")
  const [caixaCode, setCaixaCode] = useState(0)
  const [modo, setModo] = useState<"finaliza" | "espera">("finaliza")
  const [status, setStatus] = useState("")
  const [askCancel, setAskCancel] = useState(false)
  const [busy, setBusy] = useState(false)
  const [openSales, setOpenSales] = useState<OpenSale[] | null>(null)
  const [pickedOpen, setPickedOpen] = useState<OpenSale | null>(null)
  const [extraMethod, setExtraMethod] = useState(DEFAULT_METHODS[0])
  const [extraAmount, setExtraAmount] = useState("")
  const [extraPays, setExtraPays] = useState<PayLine[]>([])
  const [printSale, setPrintSale] = useState<PrintedSale | null>(null)

  useEffect(() => {
    const stored = typeof sessionStorage === "undefined" ? "" : sessionStorage.getItem(CAIXA_STORAGE_KEY) || ""
    listLojaCaixas(true)
      .then((rows) => {
        const caixa = rows.find((item) => item.name === stored)
        if (!caixa) return
        setCaixaName(caixa.name)
        setCaixaCode(caixa.code)
        const nextModo = caixa.payload.modo === "espera" ? "espera" : "finaliza"
        setModo(nextModo)
        const formas = Array.isArray(caixa.payload.formasPagamento)
          ? caixa.payload.formasPagamento.map(String).filter(Boolean)
          : []
        const vendedores = Array.isArray(caixa.payload.vendedores)
          ? caixa.payload.vendedores.map(String).filter(Boolean)
          : []
        if (formas.length) {
          setMethods(formas)
          setPayMethod(formas[0])
          setExtraMethod(formas[0])
        }
        setSellers(vendedores)
        if (vendedores[0]) setSeller(vendedores[0])
      })
      .catch(() => setStatus("Não foi possível carregar o caixa."))
  }, [])

  useEffect(() => {
    const term = clientQuery.trim()
    if (term.length < 2) return
    const timer = window.setTimeout(() => {
      api
        .get("/clients/customers", { params: { ativo: "1", search: term } })
        .then(({ data }) => {
          const list = ((data.customers || []) as Array<{ code: string | number; name: string }>).map((item) => ({
            code: String(item.code),
            name: item.name,
          }))
          setCustomers(list)
        })
        .catch(() => undefined)
    }, 250)
    return () => window.clearTimeout(timer)
  }, [clientQuery])

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
  const paid = moneySum(payments)
  const typed = parseMoneyBr(received)
  const covered = Math.round((paid + (typed > 0 ? typed : 0)) * 100) / 100
  const short = Math.max(0, Math.round((total - covered) * 100) / 100)
  const change = Math.max(0, Math.round((covered - total) * 100) / 100)

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
    setPayments([])
    setQuery("")
    setHits([])
    setQtyInput(1)
    setPayMethod(methods[0] || DEFAULT_METHODS[0])
    setStatus("")
    setAskCancel(false)
  }

  function addPayment() {
    const amount = parseMoneyBr(received)
    if (!(amount > 0)) {
      setStatus("Informe o valor desta forma.")
      return
    }
    setPayments((current) => [...current, { method: payMethod, amount }])
    setReceived("")
    setStatus("")
  }

  function saleBody(nextPayments: PayLine[], nextStatus: "espera" | "finalizada") {
    return {
      caixaCode,
      caixaName,
      status: nextStatus,
      customerName: cliente,
      sellerName: seller,
      lines: cart.map((line) => ({
        productId: line.id,
        code: line.code,
        name: line.name,
        qty: line.qty,
        price: line.price,
        discount: line.discount,
      })),
      payments: nextPayments,
    }
  }

  async function finish() {
    if (busy) return
    if (cart.length === 0) {
      setStatus("Inclua um produto.")
      return
    }
    if (sellers.length && !seller) {
      setStatus("Escolha o vendedor deste caixa.")
      return
    }
    const pending = parseMoneyBr(received)
    const nextPayments = pending > 0 ? [...payments, { method: payMethod, amount: pending }] : payments
    const covered = moneySum(nextPayments)
    if (modo === "finaliza" && covered + 0.009 < total) {
      setStatus(`Falta receber ${formatMoneyRs(Math.max(0, total - covered))}.`)
      return
    }
    setBusy(true)
    try {
      const { data } = await api.post("/clients/pdv-vendas", saleBody(nextPayments, modo))
      const sale = data.sale as OpenSale
      clearSale()
      if (sale.status === "finalizada") {
        setPrintSale({
          kind: "",
          code: sale.code,
          customer: sale.customerName,
          lines: sale.lines,
          payments: sale.payments,
          total: sale.total,
          received: sale.received,
          changeAmount: sale.changeAmount,
        })
        setStatus("Venda finalizada. O estoque da loja foi baixado.")
      } else {
        setStatus("Venda enviada para vendas em aberto. O estoque sai quando o caixa der a baixa.")
      }
    } catch (err) {
      setStatus(parseError(err).friend || "Não foi possível gravar a venda.")
    } finally {
      setBusy(false)
    }
  }

  async function showOpenSales() {
    setStatus("")
    try {
      const { data } = await api.get("/clients/pdv-vendas", { params: { status: "espera" } })
      setOpenSales((data.sales || []) as OpenSale[])
      setPickedOpen(null)
      setExtraPays([])
      setExtraAmount("")
    } catch (err) {
      setStatus(parseError(err).friend || "Não foi possível carregar as vendas em aberto.")
    }
  }

  async function baixarOpen() {
    if (!pickedOpen || busy) return
    const pending = parseMoneyBr(extraAmount)
    const next = pending > 0 ? [...pickedOpen.payments, ...extraPays, { method: extraMethod, amount: pending }] : [...pickedOpen.payments, ...extraPays]
    if (moneySum(next) + 0.009 < pickedOpen.total) {
      setStatus(`Falta receber ${formatMoneyRs(Math.max(0, pickedOpen.total - moneySum(next)))}.`)
      return
    }
    setBusy(true)
    try {
      const { data } = await api.post(`/clients/pdv-vendas/${pickedOpen.id}/finalizar`, { payments: next })
      const sale = data.sale as OpenSale
      setOpenSales(null)
      setPickedOpen(null)
      setPrintSale({
        kind: "",
        code: sale.code,
        customer: sale.customerName,
        lines: sale.lines,
        payments: sale.payments,
        total: sale.total,
        received: sale.received,
        changeAmount: sale.changeAmount,
      })
      setStatus("Baixa concluída. O estoque da loja foi baixado.")
    } catch (err) {
      setStatus(parseError(err).friend || "Não foi possível dar baixa nesta venda.")
    } finally {
      setBusy(false)
    }
  }

  async function saveClient(event: FormEvent) {
    event.preventDefault()
    const name = newName.trim()
    if (!name || savingClient) return
    setSavingClient(true)
    try {
      const { data } = await api.post("/clients/customers", {
        name,
        responsible: name,
        portfolio: "PDV",
        phone: newPhone.trim() || "—",
        classification: "Consumidor",
        city: "—",
        state: "GO",
        cep: "00000-000",
        document: newDoc.trim() || "—",
        financialCode: "0",
      })
      const created = data.customer as { code: string | number; name: string }
      setCustomers((current) => [...current, { code: String(created.code), name: created.name }])
      setCliente(created.name)
      setShowClient(false)
      setNewName("")
      setNewPhone("")
      setNewDoc("")
      setStatus("Cliente cadastrado.")
    } catch (err) {
      setStatus(parseError(err).friend || "Não foi possível cadastrar o cliente.")
    } finally {
      setSavingClient(false)
    }
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "F2") {
        event.preventDefault()
        void finish()
      } else if (event.key === "F3" && !(event.target instanceof HTMLInputElement)) {
        event.preventDefault()
        window.print()
      } else if (event.key === "Escape") {
        setAskCancel(false)
        setHits([])
        setShowClient(false)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  })

  const slip = printSale

  return (
    <section className="cx-pdv">
      <header className="cx-head">
        <div className="cx-brand">
          <span className="cx-brand-ico" aria-hidden="true">
            <ShoppingCart size={18} strokeWidth={2.2} />
          </span>
          <div>
            <h1>PDV – Caixa</h1>
            <p>{caixaName ? `${caixaName} · ${modo === "espera" ? "envia para vendas em aberto" : "finaliza a venda"}` : "Selecione um caixa para registrar a venda"}</p>
          </div>
        </div>
        <div className="cx-head-actions">
          <button type="button" onClick={() => navigate("/client/dashboard")}>
            <ArrowLeft size={15} strokeWidth={2.2} aria-hidden="true" />
            Voltar
          </button>
          <button type="button" onClick={() => void showOpenSales()}>
            <Receipt size={15} strokeWidth={2.2} aria-hidden="true" />
            Vendas em aberto
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
          <div className="cx-cliente-box">
            <label className="cx-cliente">
              <span>Cliente</span>
              <span className="cx-input">
                <UserRound size={16} strokeWidth={2.1} aria-hidden="true" />
                <select value={cliente} onChange={(event) => setCliente(event.target.value)} aria-label="Cliente">
                  <option>CONSUMIDOR FINAL</option>
                  {cliente !== "CONSUMIDOR FINAL" && !customers.some((item) => item.name === cliente) ? (
                    <option>{cliente}</option>
                  ) : null}
                  {customers.map((item) => (
                    <option key={item.code} value={item.name}>{item.name}</option>
                  ))}
                </select>
              </span>
            </label>
            <input
              value={clientQuery}
              onChange={(event) => setClientQuery(event.target.value)}
              placeholder="Buscar cliente"
              aria-label="Buscar cliente"
              autoComplete="off"
            />
            <button className="cx-pay-btn" type="button" onClick={() => setShowClient((current) => !current)}>
              Cadastrar cliente
            </button>
            {sellers.length ? (
              <label className="cx-cliente">
                <span>Vendedor</span>
                <span className="cx-input">
                  <select value={seller} onChange={(event) => setSeller(event.target.value)} aria-label="Vendedor">
                    {sellers.map((name) => <option key={name}>{name}</option>)}
                  </select>
                </span>
              </label>
            ) : null}
          </div>
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

        {showClient ? (
          <form className="cx-card cx-client-form" onSubmit={saveClient}>
            <strong>Cadastrar cliente</strong>
            <input value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="Nome" aria-label="Nome do cliente" autoComplete="off" />
            <input value={newPhone} onChange={(event) => setNewPhone(event.target.value)} placeholder="Telefone" aria-label="Telefone" autoComplete="off" />
            <input value={newDoc} onChange={(event) => setNewDoc(event.target.value)} placeholder="CPF ou CNPJ" aria-label="Documento" autoComplete="off" />
            <button className="cx-pay-btn" type="submit" disabled={savingClient || !newName.trim()}>
              {savingClient ? "Salvando..." : "Salvar cliente"}
            </button>
          </form>
        ) : null}

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
            {methods.map((label) => (
              <button
                key={label}
                type="button"
                role="tab"
                aria-selected={payMethod === label}
                onClick={() => setPayMethod(label)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="cx-pay-row">
            <label className="cx-received">
              Valor desta forma
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
            <button className="cx-pay-btn" type="button" onClick={addPayment}>Adicionar</button>
          </div>
          {payments.length ? (
            <ul className="cx-splits">
              {payments.map((pay, index) => (
                <li key={`${pay.method}-${index}`}>
                  <span>{pay.method}</span>
                  <b>{formatMoneyRs(pay.amount)}</b>
                  <button type="button" aria-label={`Remover ${pay.method}`} onClick={() => setPayments((current) => current.filter((_, item) => item !== index))}>
                    <X size={14} />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {total > 0 && short > 0.009 ? <p className="cx-due is-short">Falta {formatMoneyRs(short)}</p> : null}
          {change > 0.009 ? <p className="cx-due is-change">Troco {formatMoneyRs(change)}</p> : null}
          <button className="cx-finish" type="button" onClick={() => void finish()} disabled={busy}>
            <Check size={16} strokeWidth={2.6} aria-hidden="true" />
            {modo === "espera" ? "Enviar para vendas em aberto" : "Finalizar Venda (F2)"}
          </button>
          <button className="cx-print" type="button" onClick={() => window.print()}>
            <Printer size={15} strokeWidth={2.1} aria-hidden="true" />
            Imprimir Cupom (F3)
          </button>
        </section>
      </aside>

      <div className="cx-print" aria-hidden="true">
        {slip ? (
          <>
            <p>{slip.kind === "nf" ? "Nota fiscal" : "Recibo"} {slip.code}</p>
            <p>{slip.customer}</p>
            {slip.lines.map((line, index) => (
              <p key={`${line.name}-${index}`}>{line.qty} x {line.name} {formatMoneyRs(line.qty * Math.max(0, line.price - line.discount))}</p>
            ))}
            {slip.payments.map((pay, index) => (
              <p key={`${pay.method}-${index}`}>{pay.method} {formatMoneyRs(pay.amount)}</p>
            ))}
            <p>Total {formatMoneyRs(slip.total)}</p>
            <p>Recebido {formatMoneyRs(slip.received)}</p>
            <p>Troco {formatMoneyRs(slip.changeAmount)}</p>
          </>
        ) : (
          <>
            <p>PDV – Caixa</p>
            <p>{cliente}</p>
            <p>{payMethod}</p>
            {cart.map((line) => (
              <p key={line.id}>{line.qty} x {line.name} {formatMoneyRs(line.qty * Math.max(0, line.price - line.discount))}</p>
            ))}
            <p>Total {formatMoneyRs(total)}</p>
            <p>Recebido {formatMoneyRs(paid)}</p>
          </>
        )}
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

      {openSales ? (
        <div className="pdv-caixa-confirm" onClick={() => setOpenSales(null)}>
          <div className="pdv-caixa-confirm-card pdv-gear-card" role="dialog" aria-modal="true" aria-labelledby="cx-open-title" onClick={(event) => event.stopPropagation()}>
            <button className="pdv-cad-icon-btn pdv-gear-close" type="button" aria-label="Fechar" onClick={() => setOpenSales(null)}>
              <X size={16} />
            </button>
            <h2 id="cx-open-title">Vendas em aberto</h2>
            <p>Vendas enviadas pelos vendedores e ainda pendentes de baixa.</p>
            {pickedOpen ? (
              <>
                <h3>Venda {pickedOpen.code}</h3>
                <p>{pickedOpen.customerName} · {pickedOpen.caixaName || "Sem caixa"} · {pickedOpen.sellerName || "Sem vendedor"}</p>
                <ul>
                  {pickedOpen.lines.map((line, index) => (
                    <li key={`${line.productId}-${index}`}>
                      <span>{line.qty} × {line.name}</span>
                      <b>{formatMoneyRs(line.qty * Math.max(0, line.price - line.discount))}</b>
                    </li>
                  ))}
                  {pickedOpen.payments.map((pay, index) => (
                    <li key={`${pay.method}-${index}`}>
                      <span>{pay.method}</span>
                      <b>{formatMoneyRs(pay.amount)}</b>
                    </li>
                  ))}
                  {extraPays.map((pay, index) => (
                    <li key={`extra-${index}`}>
                      <span>{pay.method}</span>
                      <b>{formatMoneyRs(pay.amount)}</b>
                    </li>
                  ))}
                </ul>
                <p>
                  Total {formatMoneyRs(pickedOpen.total)} · Falta {formatMoneyRs(Math.max(0, pickedOpen.total - moneySum([...pickedOpen.payments, ...extraPays, ...(parseMoneyBr(extraAmount) > 0 ? [{ method: extraMethod, amount: parseMoneyBr(extraAmount) }] : [])])))}
                </p>
                <div className="cx-pay-row">
                  <select value={extraMethod} aria-label="Forma da baixa" onChange={(event) => setExtraMethod(event.target.value)}>
                    {methods.map((name) => <option key={name}>{name}</option>)}
                  </select>
                  <input value={extraAmount} inputMode="decimal" placeholder="0,00" aria-label="Valor da baixa" onChange={(event) => setExtraAmount(event.target.value)} />
                  <button className="cx-pay-btn" type="button" onClick={() => {
                    const amount = parseMoneyBr(extraAmount)
                    if (!(amount > 0)) return
                    setExtraPays((current) => [...current, { method: extraMethod, amount }])
                    setExtraAmount("")
                  }}>Adicionar</button>
                </div>
                <div className="pdv-caixa-confirm-actions">
                  <button className="pdv-cad-btn" type="button" onClick={() => { setPickedOpen(null); setExtraPays([]) }}>Voltar</button>
                  <button className="pdv-cad-btn pdv-cad-btn-green" type="button" disabled={busy} onClick={() => void baixarOpen()}>Finalizar baixa</button>
                </div>
              </>
            ) : openSales.length === 0 ? (
              <p>Nenhuma venda pendente de baixa.</p>
            ) : (
              <ul>
                {openSales.map((sale) => (
                  <li key={sale.id}>
                    <button type="button" onClick={() => { setPickedOpen(sale); setExtraPays([]); setExtraAmount("") }}>
                      <span>{sale.code} · {sale.customerName} · {sale.caixaName || "Sem caixa"}</span>
                      <b>{formatMoneyRs(sale.total)}</b>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}

      {printSale ? (
        <div className="pdv-caixa-confirm" onClick={() => setPrintSale(null)}>
          <div className="pdv-caixa-confirm-card" role="dialog" aria-modal="true" aria-labelledby="cx-print-title" onClick={(event) => event.stopPropagation()}>
            <h2 id="cx-print-title">Venda {printSale.code} concluída</h2>
            <p>Total {formatMoneyRs(printSale.total)} · Troco {formatMoneyRs(printSale.changeAmount)}</p>
            <div className="pdv-caixa-confirm-actions">
              <button className="pdv-cad-btn" type="button" onClick={() => { setPrintSale((current) => current ? { ...current, kind: "nf" } : current); window.setTimeout(() => window.print(), 150) }}>
                Imprimir NF
              </button>
              <button className="pdv-cad-btn" type="button" onClick={() => { setPrintSale((current) => current ? { ...current, kind: "recibo" } : current); window.setTimeout(() => window.print(), 150) }}>
                Imprimir recibo
              </button>
              <button className="pdv-cad-btn" type="button" onClick={() => setPrintSale(null)}>Fechar</button>
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

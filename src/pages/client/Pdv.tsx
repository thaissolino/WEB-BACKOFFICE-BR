import { FormEvent, useEffect, useState } from "react"
import { Navigate, useNavigate } from "react-router-dom"
import {
  ArrowLeft,
  Banknote,
  Check,
  Minus,
  Monitor,
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
import { listCatalog } from "./cadastros/catalog/catalogApi"
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
  lojaStock: number
}

type PayLine = { method: string; amount: number; parcelas?: number }

type OpenSale = {
  id: string
  code: string
  caixaName: string
  customerName: string
  sellerName: string
  notes?: string
  lines: Array<{ productId: string; code?: string; name: string; qty: number; price: number; discount: number }>
  payments: PayLine[]
  total: number
  received: number
  changeAmount: number
  status: string
}

type PayMeta = { credit: boolean; cartao: boolean; maxParcelas: number }

function digitsOnly(value: string, max = 18) {
  return value.replace(/\D/g, "").slice(0, max)
}

function isCreditLabel(name: string, meta?: PayMeta) {
  if (meta?.credit) return true
  const lower = name.toLowerCase()
  return lower.includes("crédito") || lower.includes("credito")
}

function payLabel(pay: PayLine) {
  if (pay.parcelas && pay.parcelas > 1) return `${pay.method} · ${pay.parcelas}x`
  return pay.method
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
  const [clientModal, setClientModal] = useState(false)
  const [newName, setNewName] = useState("")
  const [newPhone, setNewPhone] = useState("")
  const [newDoc, setNewDoc] = useState("")
  const [savingClient, setSavingClient] = useState(false)
  const [observacao, setObservacao] = useState("")
  const [finishingSaleId, setFinishingSaleId] = useState<string | null>(null)
  const [finishingCode, setFinishingCode] = useState("")
  const [reserved, setReserved] = useState<Record<string, number>>({})
  const [payMeta, setPayMeta] = useState<Record<string, PayMeta>>({})
  const [payParcelas, setPayParcelas] = useState(1)
  const [query, setQuery] = useState("")
  const [hits, setHits] = useState<PdvProduct[]>([])
  const [cart, setCart] = useState<CartLine[]>([])
  const [methods, setMethods] = useState(DEFAULT_METHODS)
  const [payMethod, setPayMethod] = useState(DEFAULT_METHODS[0])
  const [received, setReceived] = useState("")
  const [payments, setPayments] = useState<PayLine[]>([])
  const [sellers, setSellers] = useState<string[]>([])
  const [seller, setSeller] = useState("")
  const [sellerAccounts, setSellerAccounts] = useState<Array<{ code: number; name: string; must: boolean }>>([])
  const [passAsk, setPassAsk] = useState<{ code: number; name: string } | null>(null)
  const [nextPass, setNextPass] = useState("")
  const [caixaName, setCaixaName] = useState("")
  const [caixaCode, setCaixaCode] = useState(0)
  const [modo, setModo] = useState<"finaliza" | "espera">("finaliza")
  const [permitirTrocarCaixa, setPermitirTrocarCaixa] = useState(true)
  const [toast, setToast] = useState("")
  const [stockAlert, setStockAlert] = useState<string | null>(null)
  const [askCancel, setAskCancel] = useState(false)
  const [busy, setBusy] = useState(false)
  const [openSales, setOpenSales] = useState<OpenSale[] | null>(null)
  const [printSale, setPrintSale] = useState<PrintedSale | null>(null)

  function flashToast(message: string) {
    if (!message) return
    setToast(message)
    window.setTimeout(() => setToast((current) => (current === message ? "" : current)), 3500)
  }

  useEffect(() => {
    const stored = typeof sessionStorage === "undefined" ? "" : sessionStorage.getItem(CAIXA_STORAGE_KEY) || ""
    if (!stored) {
      navigate("/client/caixa", { replace: true })
      return
    }
    listLojaCaixas(true)
      .then((rows) => {
        const caixa = rows.find((item) => item.name === stored)
        if (!caixa) {
          navigate("/client/caixa", { replace: true })
          return
        }
        setCaixaName(caixa.name)
        setCaixaCode(caixa.code)
        setPermitirTrocarCaixa(caixa.payload.permitirTrocarCaixa !== false)
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
        }
        setSellers(vendedores)
        if (vendedores[0]) setSeller(vendedores[0])
      })
      .catch(() => flashToast("Não foi possível carregar o caixa."))
    listCatalog("user", true)
      .then((rows) => setSellerAccounts(rows.map((item) => ({
        code: item.code,
        name: item.name,
        must: Boolean(item.payload.mustChangePassword),
      }))))
      .catch(() => setSellerAccounts([]))
    listCatalog("payment", true)
      .then((rows) => {
        const next: Record<string, PayMeta> = {}
        rows.forEach((item) => {
          const cartao = Boolean(item.payload.cartao)
          const credito = String(item.payload.debitoCredito || "").toLowerCase().includes("créd")
            || String(item.payload.debitoCredito || "").toLowerCase().includes("cred")
            || String(item.payload.aceitaCredito) === "true"
          const maxParcelas = Math.max(1, Math.min(24, Number(String(item.payload.parcelas || "12").replace(/\D/g, "")) || 12))
          next[item.name] = { credit: cartao && credito, cartao, maxParcelas }
        })
        setPayMeta(next)
      })
      .catch(() => setPayMeta({}))
    void refreshReserved()
  }, [])

  async function refreshReserved(excludeId?: string | null) {
    try {
      const { data } = await api.get("/clients/pdv-vendas", { params: { status: "espera" } })
      const map: Record<string, number> = {}
      for (const sale of (data.sales || []) as OpenSale[]) {
        if (excludeId && sale.id === excludeId) continue
        for (const line of sale.lines) {
          map[line.productId] = (map[line.productId] || 0) + line.qty
        }
      }
      setReserved(map)
    } catch {
      setReserved({})
    }
  }

  function freeStock(productId: string, lojaStock: number) {
    const inCart = cart.find((line) => line.id === productId)?.qty || 0
    const blocked = reserved[productId] || 0
    return Math.max(0, Math.floor(lojaStock) - blocked - inCart)
  }

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
        .catch(() => flashToast("Não foi possível pesquisar produtos."))
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

  function maxLineQty(line: CartLine, extraInCart = 0) {
    const blocked = reserved[line.id] || 0
    const inCart = cart.filter((row) => row.id === line.id).reduce((sum, row) => sum + row.qty, 0) - line.qty + extraInCart
    return Math.max(0, Math.floor(line.lojaStock) - blocked - inCart)
  }

  function addProduct(product: PdvProduct) {
    if (finishingSaleId) {
      flashToast("Finalize a baixa da venda em aberto antes de incluir produtos.")
      return
    }
    const lojaStock = Number(product.lojaStock) || 0
    const stock = freeStock(product.id, lojaStock)
    if (stock < 1) {
      setStockAlert(`Sem estoque livre para "${product.name}". O estoque já está reservado em vendas em aberto.`)
      return
    }
    const found = cart.find((line) => line.id === product.id)
    if ((found?.qty || 0) + 1 > stock) {
      setStockAlert(`Quantidade indisponível. Estoque livre: ${stock} un.`)
      return
    }
    setCart((current) => {
      const row = current.find((line) => line.id === product.id)
      if (row) {
        const nextStock = freeStock(product.id, lojaStock)
        return current.map((line) => (line.id === product.id ? { ...line, qty: line.qty + 1, stock: nextStock } : line))
      }
      return [
        ...current,
        {
          id: product.id,
          code: product.code || product.barcode,
          reference: product.reference || "—",
          name: product.name,
          qty: 1,
          price: product.salePrice || 0,
          discount: 0,
          stock,
          lojaStock,
        },
      ]
    })
    setQuery("")
    setHits([])
  }

  function bumpCartLine(productId: string, delta: number) {
    if (finishingSaleId) return
    setCart((current) => {
      const line = current.find((row) => row.id === productId)
      if (!line) return current
      const nextQty = line.qty + delta
      if (nextQty < 1) return current.filter((row) => row.id !== productId)
      const allowed = maxLineQty(line)
      if (nextQty > allowed) {
        setStockAlert(`Quantidade indisponível. Estoque livre: ${allowed} un.`)
        return current
      }
      const stock = freeStock(productId, line.lojaStock)
      return current.map((row) => (row.id === productId ? { ...row, qty: nextQty, stock } : row))
    })
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
        else flashToast(products.length ? "Escolha o produto na lista." : "Nenhum produto encontrado.")
      })
      .catch(() => flashToast("Não foi possível pesquisar produtos."))
  }

  function clearSale() {
    setCart([])
    setReceived("")
    setPayments([])
    setQuery("")
    setHits([])
    setPayMethod(methods[0] || DEFAULT_METHODS[0])
    setPayParcelas(1)
    setObservacao("")
    setFinishingSaleId(null)
    setFinishingCode("")
    setAskCancel(false)
    void refreshReserved()
  }

  function addPayment() {
    const amount = parseMoneyBr(received)
    if (!(amount > 0)) {
      flashToast("Informe o valor desta forma.")
      return
    }
    const line: PayLine = { method: payMethod, amount }
    if (needsParcelas(payMethod, payMeta[payMethod]) && payParcelas > 1) line.parcelas = payParcelas
    setPayments((current) => [...current, line])
    setReceived("")
    setPayParcelas(1)
  }

  function clearReceived() {
    setReceived("")
    setPayParcelas(1)
  }

  function saleBody(nextPayments: PayLine[], nextStatus: "espera" | "finalizada") {
    return {
      caixaCode,
      caixaName,
      status: nextStatus,
      customerName: cliente,
      sellerName: seller,
      notes: observacao.trim(),
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

  async function finish(forceStatus?: "espera" | "finalizada") {
    const nextStatus = forceStatus ?? (finishingSaleId || modo === "finaliza" ? "finalizada" : "espera")
    if (busy) return
    if (cart.length === 0) {
      flashToast("Inclua um produto.")
      return
    }
    if (sellers.length && !seller) {
      flashToast("Escolha o vendedor deste caixa.")
      return
    }
    const account = sellerAccounts.find((item) => item.name === seller && item.must)
    if (account) {
      setPassAsk({ code: account.code, name: account.name })
      setNextPass("")
      return
    }
    const pending = parseMoneyBr(received)
    let tail: PayLine | null = null
    if (pending > 0) {
      tail = { method: payMethod, amount: pending }
      if (needsParcelas(payMethod, payMeta[payMethod]) && payParcelas > 1) tail.parcelas = payParcelas
    }
    const nextPayments = tail ? [...payments, tail] : payments
    const covered = moneySum(nextPayments)
    const mustPay = nextStatus === "finalizada"
    if (mustPay && covered + 0.009 < total) {
      flashToast(`Falta receber ${formatMoneyRs(Math.max(0, total - covered))}.`)
      return
    }
    setBusy(true)
    try {
      let sale: OpenSale
      if (finishingSaleId) {
        const { data } = await api.post(`/clients/pdv-vendas/${finishingSaleId}/finalizar`, {
          payments: nextPayments,
          caixaCode,
        })
        sale = data.sale as OpenSale
      } else {
        const { data } = await api.post("/clients/pdv-vendas", saleBody(nextPayments, nextStatus))
        sale = data.sale as OpenSale
      }
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
      }
      void refreshReserved()
    } catch (err) {
      flashToast(parseError(err).friend || "Não foi possível gravar a venda.")
    } finally {
      setBusy(false)
    }
  }

  async function saveSellerPassword() {
    if (!passAsk || nextPass.trim().length < 6) {
      flashToast("A nova senha precisa ter pelo menos 6 caracteres.")
      return
    }
    setBusy(true)
    try {
      await api.post(`/clients/catalog/user/${passAsk.code}/senha/definir`, { password: nextPass.trim() })
      setSellerAccounts((current) => current.map((item) => (item.code === passAsk.code ? { ...item, must: false } : item)))
      setPassAsk(null)
      setNextPass("")
      flashToast("Senha atualizada. Pode finalizar a venda.")
    } catch (err) {
      flashToast(parseError(err).friend || "Não foi possível trocar a senha.")
    } finally {
      setBusy(false)
    }
  }

  async function showOpenSales() {
    try {
      const { data } = await api.get("/clients/pdv-vendas", { params: { status: "espera" } })
      setOpenSales((data.sales || []) as OpenSale[])
      void refreshReserved()
    } catch (err) {
      flashToast(parseError(err).friend || "Não foi possível carregar as vendas em aberto.")
    }
  }

  function loadSaleToScreen(sale: OpenSale) {
    if (modo !== "finaliza") {
      flashToast("Este caixa não pode dar baixa. Só visualiza ou exclui a venda.")
      return
    }
    setOpenSales(null)
    setFinishingSaleId(sale.id)
    setFinishingCode(sale.code)
    setCliente(sale.customerName)
    setSeller(sale.sellerName || seller)
    setObservacao(sale.notes || "")
    setCart(sale.lines.map((line) => ({
      id: line.productId,
      code: line.code || "",
      reference: "—",
      name: line.name,
      qty: line.qty,
      price: line.price,
      discount: line.discount,
      stock: line.qty,
      lojaStock: line.qty,
    })))
    setPayments(sale.payments)
    setReceived("")
    setPayParcelas(1)
    void refreshReserved(sale.id)
  }

  async function deleteOpenSale(id: string, code: string) {
    if (!window.confirm(`Excluir a venda ${code} em aberto?`)) return
    setBusy(true)
    try {
      await api.delete(`/clients/pdv-vendas/${id}`)
      setOpenSales((current) => (current ? current.filter((sale) => sale.id !== id) : current))
      if (finishingSaleId === id) clearSale()
      void refreshReserved()
    } catch (err) {
      flashToast(parseError(err).friend || "Não foi possível excluir a venda.")
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
      setClientQuery(created.name)
      setClientModal(false)
      setNewName("")
      setNewPhone("")
      setNewDoc("")
    } catch (err) {
      flashToast(parseError(err).friend || "Não foi possível cadastrar o cliente.")
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
        setClientModal(false)
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
          <button type="button" className="cx-open-sales" onClick={() => void showOpenSales()}>
            <Receipt size={15} strokeWidth={2.2} aria-hidden="true" />
            Vendas em aberto
          </button>
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
          <button
            type="button"
            disabled={!permitirTrocarCaixa}
            title={permitirTrocarCaixa ? "Trocar de caixa" : "Este caixa não permite troca"}
            onClick={() => navigate("/client/caixa")}
          >
            <Monitor size={15} strokeWidth={2.2} aria-hidden="true" />
            Trocar caixa
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
            <label className="cx-cliente cx-cliente-search">
              <span>Cliente · {cliente}</span>
              <span className="cx-input cx-input-with-btn">
                <UserRound size={16} strokeWidth={2.1} aria-hidden="true" />
                <input
                  value={clientQuery}
                  onChange={(event) => setClientQuery(event.target.value)}
                  placeholder="Buscar cliente..."
                  aria-label="Buscar cliente"
                  autoComplete="off"
                  disabled={Boolean(finishingSaleId)}
                />
                <button
                  type="button"
                  className="cx-client-add"
                  aria-label="Cadastrar cliente"
                  disabled={Boolean(finishingSaleId)}
                  onClick={() => {
                    setNewName(clientQuery.trim())
                    setNewPhone("")
                    setNewDoc("")
                    setClientModal(true)
                  }}
                >
                  <Plus size={16} strokeWidth={2.4} />
                </button>
              </span>
            </label>
            {clientQuery.trim().length >= 2 ? (
              <ul className="cx-client-hits">
                <li>
                  <button type="button" onClick={() => setCliente("CONSUMIDOR FINAL")}>CONSUMIDOR FINAL</button>
                </li>
                {customers.map((item) => (
                  <li key={item.code}>
                    <button type="button" onClick={() => { setCliente(item.name); setClientQuery(item.name) }}>{item.name}</button>
                  </li>
                ))}
                <li>
                  <button
                    type="button"
                    className="cx-client-new"
                    onClick={() => {
                      setNewName(clientQuery.trim())
                      setClientModal(true)
                    }}
                  >
                    Cadastrar &quot;{clientQuery.trim()}&quot;
                  </button>
                </li>
              </ul>
            ) : null}
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
                disabled={Boolean(finishingSaleId)}
              />
            </span>
          </label>
          <button className="cx-add" type="submit" disabled={Boolean(finishingSaleId)}>
            <Plus size={16} strokeWidth={2.4} aria-hidden="true" />
            Adicionar (ENTER)
          </button>
        </form>

        {finishingSaleId ? (
          <p className="cx-baixa-banner" role="status">
            Baixa da venda <strong>{finishingCode}</strong> · {cliente} · informe o pagamento e finalize
            <button type="button" onClick={clearSale}>Cancelar baixa</button>
          </p>
        ) : null}

        {hits.length > 0 && !finishingSaleId ? (
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
                  <span className="cx-line-qty">
                    <button type="button" aria-label="Diminuir quantidade" disabled={Boolean(finishingSaleId)} onClick={() => bumpCartLine(line.id, -1)}>
                      <Minus size={12} strokeWidth={2.6} />
                    </button>
                    <strong>{line.qty}</strong>
                    <button type="button" aria-label="Aumentar quantidade" disabled={Boolean(finishingSaleId)} onClick={() => bumpCartLine(line.id, 1)}>
                      <Plus size={12} strokeWidth={2.6} />
                    </button>
                  </span>
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

        <section className="cx-card cx-pay-card" aria-labelledby="cx-pay-title">
          <h2 id="cx-pay-title">
            <Banknote size={16} strokeWidth={2.2} aria-hidden="true" />
            Pagamento
          </h2>
          <p className="cx-pay-hint">Selecione a forma, informe o valor e adicione. Use parcelas no cartão de crédito.</p>
          <div className="cx-tabs cx-tabs-pay" role="tablist" aria-label="Forma de pagamento">
            {methods.map((label) => (
              <button
                key={label}
                type="button"
                role="tab"
                aria-selected={payMethod === label}
                className={payments.some((pay) => pay.method === label) ? "is-used" : undefined}
                onClick={() => { setPayMethod(label); setPayParcelas(1) }}
              >
                {label}
              </button>
            ))}
          </div>
          {needsParcelas(payMethod, payMeta[payMethod]) ? (
            <label className="cx-parcelas">
              Parcelas no cartão
              <select value={payParcelas} onChange={(event) => setPayParcelas(Number(event.target.value))}>
                {Array.from({ length: payMeta[payMethod]?.maxParcelas || 12 }, (_, index) => index + 1).map((n) => (
                  <option key={n} value={n}>{n}x de {formatMoneyRs(total > 0 && n > 0 ? total / n : 0)}</option>
                ))}
              </select>
            </label>
          ) : null}
          <div className="cx-pay-row">
            <label className="cx-received">
              Valor em {payMethod}
              <span>
                <b>R$</b>
                <input
                  value={received}
                  inputMode="decimal"
                  placeholder={short > 0 ? formatMoneyBr(short) : "0,00"}
                  onChange={(event) => setReceived(event.target.value)}
                />
              </span>
            </label>
            <button className="cx-pay-btn" type="button" onClick={addPayment}>Adicionar</button>
            <button className="cx-pay-clear" type="button" onClick={clearReceived} title="Zerar valor">0,00</button>
          </div>
          {payments.length ? (
            <ul className="cx-splits">
              {payments.map((pay, index) => (
                <li key={`${pay.method}-${index}`}>
                  <span>{payLabel(pay)}</span>
                  <b>{formatMoneyRs(pay.amount)}</b>
                  <button type="button" aria-label={`Remover ${pay.method}`} onClick={() => setPayments((current) => current.filter((_, item) => item !== index))}>
                    <X size={14} />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <div className="cx-pay-totals">
            <p><span>Recebido</span><b>{formatMoneyRs(covered)}</b></p>
            {total > 0 && short > 0.009 ? <p className="cx-due is-short"><span>Falta</span><b>{formatMoneyRs(short)}</b></p> : null}
            {change > 0.009 ? <p className="cx-due is-change"><span>Troco</span><b>{formatMoneyRs(change)}</b></p> : null}
          </div>
          <button className="cx-finish" type="button" onClick={() => void finish()} disabled={busy || cart.length === 0}>
            <Check size={16} strokeWidth={2.6} aria-hidden="true" />
            {finishingSaleId ? "Finalizar baixa (F2)" : modo === "espera" ? "Enviar para vendas em aberto" : "Finalizar Venda (F2)"}
          </button>
          {modo === "finaliza" && !finishingSaleId ? (
            <button className="cx-finish cx-finish-open" type="button" onClick={() => void finish("espera")} disabled={busy || cart.length === 0}>
              Salvar em vendas abertas
            </button>
          ) : null}
          <button className="cx-print" type="button" onClick={() => window.print()}>
            <Printer size={15} strokeWidth={2.1} aria-hidden="true" />
            Imprimir Cupom (F3)
          </button>
        </section>

        <section className="cx-card cx-obs-bottom" aria-labelledby="cx-obs-title">
          <h2 id="cx-obs-title">Observação</h2>
          <textarea
            value={observacao}
            onChange={(event) => setObservacao(event.target.value)}
            placeholder="IMEI, número de série, detalhes..."
            rows={2}
            disabled={Boolean(finishingSaleId)}
          />
        </section>
      </aside>

      {toast ? (
        <div className="cx-toast" role="status" aria-live="polite">{toast}</div>
      ) : null}

      {stockAlert ? (
        <div className="pdv-caixa-confirm" onClick={() => setStockAlert(null)}>
          <div className="pdv-caixa-confirm-card" role="alertdialog" aria-modal="true" aria-labelledby="cx-stock-title" onClick={(event) => event.stopPropagation()}>
            <h2 id="cx-stock-title">Estoque insuficiente</h2>
            <p>{stockAlert}</p>
            <div className="pdv-caixa-confirm-actions">
              <button className="pdv-cad-btn pdv-cad-btn-green" type="button" onClick={() => setStockAlert(null)}>Entendi</button>
            </div>
          </div>
        </div>
      ) : null}

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

      {passAsk ? (
        <div className="pdv-caixa-confirm">
          <div className="pdv-caixa-confirm-card" role="dialog" aria-modal="true" aria-labelledby="cx-pass-title">
            <h2 id="cx-pass-title">Trocar a senha de {passAsk.name}</h2>
            <p>A senha provisória chegou no e-mail. Defina a senha definitiva para continuar a venda.</p>
            <label>
              Nova senha
              <input type="password" value={nextPass} autoComplete="new-password" onChange={(event) => setNextPass(event.target.value)} />
            </label>
            <div className="pdv-caixa-confirm-actions">
              <button className="pdv-cad-btn" type="button" onClick={() => setPassAsk(null)}>Fechar</button>
              <button className="pdv-cad-btn pdv-cad-btn-green" type="button" disabled={busy} onClick={() => void saveSellerPassword()}>
                Salvar senha
              </button>
            </div>
          </div>
        </div>
      ) : null}

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

      {clientModal ? (
        <div className="pdv-caixa-confirm" onClick={() => setClientModal(false)}>
          <div className="pdv-caixa-confirm-card cx-open-modal" role="dialog" aria-modal="true" aria-labelledby="cx-client-title" onClick={(event) => event.stopPropagation()}>
            <button className="pdv-cad-icon-btn pdv-gear-close" type="button" aria-label="Fechar" onClick={() => setClientModal(false)}>
              <X size={16} />
            </button>
            <h2 id="cx-client-title">Cadastrar cliente</h2>
            <form className="cx-client-modal-form" onSubmit={saveClient}>
              <label>Nome<input value={newName} onChange={(event) => setNewName(event.target.value)} autoComplete="off" required /></label>
              <label>Telefone<input value={newPhone} inputMode="numeric" onChange={(event) => setNewPhone(digitsOnly(event.target.value, 11))} autoComplete="off" /></label>
              <label>CPF ou CNPJ<input value={newDoc} inputMode="numeric" onChange={(event) => setNewDoc(digitsOnly(event.target.value, 14))} autoComplete="off" /></label>
              <div className="pdv-caixa-confirm-actions">
                <button className="pdv-cad-btn" type="button" onClick={() => setClientModal(false)}>Cancelar</button>
                <button className="pdv-cad-btn pdv-cad-btn-green" type="submit" disabled={savingClient || !newName.trim()}>
                  {savingClient ? "Salvando…" : "Salvar e usar na venda"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {openSales ? (
        <div className="pdv-caixa-confirm" onClick={() => setOpenSales(null)}>
          <div className="pdv-caixa-confirm-card cx-open-modal cx-open-modal-wide" role="dialog" aria-modal="true" aria-labelledby="cx-open-title" onClick={(event) => event.stopPropagation()}>
            <header className="cx-open-head">
              <div>
                <h2 id="cx-open-title">Vendas em aberto</h2>
                <p className="cx-open-sub">
                  {modo === "finaliza"
                    ? "Puxe a venda para a tela principal e finalize o pagamento no caixa."
                    : "Este caixa só envia vendas. Visualize ou exclua pendências."}
                </p>
              </div>
              <button className="pdv-cad-icon-btn pdv-gear-close" type="button" aria-label="Fechar" onClick={() => setOpenSales(null)}>
                <X size={16} />
              </button>
            </header>
            {openSales.length === 0 ? (
              <p className="cx-open-empty">Nenhuma venda pendente de baixa.</p>
            ) : (
              <ul className="cx-open-list">
                {openSales.map((sale) => (
                  <li key={sale.id} className="cx-open-item">
                    <div className="cx-open-grid">
                      <div className="cx-open-main">
                        <strong>#{sale.code}</strong>
                        <span className="cx-open-total">{formatMoneyRs(sale.total)}</span>
                      </div>
                      <dl className="cx-open-meta">
                        <div><dt>Cliente</dt><dd>{sale.customerName}</dd></div>
                        <div><dt>Vendedor</dt><dd>{sale.sellerName || "—"}</dd></div>
                        <div><dt>Caixa</dt><dd>{sale.caixaName || "—"}</dd></div>
                        {sale.notes ? <div className="cx-open-notes"><dt>Obs.</dt><dd>{sale.notes}</dd></div> : null}
                      </dl>
                    </div>
                    <div className="cx-open-actions">
                      {modo === "finaliza" ? (
                        <button className="pdv-cad-btn pdv-cad-btn-green" type="button" onClick={() => loadSaleToScreen(sale)}>
                          Puxar para o caixa
                        </button>
                      ) : (
                        <span className="cx-open-tag">Somente visualização</span>
                      )}
                      <button className="pdv-cad-btn pdv-cad-btn-red" type="button" disabled={busy} onClick={() => void deleteOpenSale(sale.id, sale.code)}>
                        Excluir
                      </button>
                    </div>
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

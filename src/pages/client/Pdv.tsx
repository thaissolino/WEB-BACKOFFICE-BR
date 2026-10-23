import { FormEvent, useEffect, useMemo, useRef, useState } from "react"
import { Navigate, useNavigate } from "react-router-dom"
import {
  ArrowLeft,
  ArrowLeftRight,
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
import { avisarSalvo } from "./avisoSalvo"
import { EVENTO_DESCONTO, eventoPermitido } from "./cadastros/usuarios/groupEvents"
import PdvShell, { PdvLoading, usePdvSession } from "./dashboard/PdvShell"
import { api, parseError } from "../../services/api"
import { formatMoneyBr, formatMoneyRs, lojaProductName, parseMoneyBr, productSalePrice, produtoRotulo, type PdvProduct } from "./cadastros/produtos/types"
import SearchableSelect from "./cadastros/produtos/SearchableSelect"
import { listLojaCaixas } from "./cadastros/financeiro/caixaApi"
import { listCatalog } from "./cadastros/catalog/catalogApi"
import { categoryFromCatalog, type ProductCategory } from "./cadastros/produtos/categoryModel"
import { CAIXA_SNAP_KEY, CAIXA_STORAGE_KEY } from "./dashboard/mockData"
import { carregarTextosRecibo, destinatarioPorNome, ReciboNota, type ReciboDestinatario, type TextoImpressao } from "./pdv/ReciboNota"
import { emitenteDaLoja } from "./pdv/emitenteLoja"
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
  categoryId: string
  category: string
  requireSerial: boolean
  serials: string[]
  seller: string
  sellerCustom: boolean
}

type TrocaEntrada = { productId: string; code: string; name: string; imei: string }

type PayLine = { method: string; amount: number; parcelas?: number; troca?: TrocaEntrada }

function ehTroca(method: string) {
  return /troca/i.test(method)
}

type OpenSale = {
  id: string
  code: string
  caixaName: string
  customerName: string
  sellerName: string
  notes?: string
  lines: Array<{ productId: string; code?: string; name: string; qty: number; price: number; discount: number; serials?: string[]; category?: string; categoryId?: string; reference?: string; lojaStock?: number; seller?: string }>
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

function needsParcelas(name: string, meta?: PayMeta) {
  if (isCreditLabel(name, meta)) return true
  if (meta?.cartao) return true
  const lower = name.toLowerCase()
  return lower.includes("cartão") || lower.includes("cartao")
}

function valorDigitado(raw: string) {
  const limpo = String(raw).replace(/[^\d,]/g, "")
  const corte = limpo.indexOf(",")
  if (corte < 0) return limpo.replace(/^0+(?=\d)/, "")
  const inteiro = limpo.slice(0, corte).replace(/\D/g, "").replace(/^0+(?=\d)/, "") || "0"
  const centavos = limpo.slice(corte + 1).replace(/\D/g, "").slice(0, 2)
  return `${inteiro},${centavos}`
}

function sufixoCentavos(valor: string) {
  if (!valor) return ""
  const corte = valor.indexOf(",")
  if (corte < 0) return ",00"
  const falta = 2 - valor.slice(corte + 1).length
  return falta > 0 ? "0".repeat(falta) : ""
}

function divisaoParcelas(total: number, vezes: number) {
  if (!(total > 0) || vezes <= 1) return ""
  return `${vezes}x de ${formatMoneyRs(total / vezes)}`
}

function payLabel(pay: PayLine) {
  if (pay.parcelas && pay.parcelas > 1) return `${pay.method} · ${pay.parcelas}x`
  return pay.method
}

type PessoaNota = {
  code: string
  name: string
  document?: string
  phone?: string
  city?: string
  state?: string
  cep?: string
}

type PrintedSale = {
  kind: "" | "nf" | "recibo"
  code: string
  customer: string
  document: string
  phone: string
  email: string
  city: string
  state: string
  cep: string
  endereco: string
  seller: string
  notes: string
  lines: OpenSale["lines"]
  payments: PayLine[]
  total: number
  received: number
  changeAmount: number
}

type Emitente = {
  name: string
  document: string
  phone: string
  address: string
  city: string
}

function vendaAtiva(payload: Record<string, unknown>) {
  const flag = payload.vendaAtivo
  return flag !== false && String(flag) !== "false"
}

function ordemPagamento(nome: string) {
  const n = nome.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase()
  if (/cartao|credito|debito/.test(n)) return 0
  if (/dinheiro/.test(n)) return 1
  if (/\bpix\b/.test(n)) return 2
  if (/troca/.test(n)) return 3
  return 4
}

function nomesCadastrados(rows: Array<{ name: string; payload: Record<string, unknown> }>) {
  return rows
    .filter((item) => item.name.trim() && vendaAtiva(item.payload))
    .sort((a, b) => {
      const ordem = (item: { payload: Record<string, unknown> }) => Number(String(item.payload.ordem || "").replace(/\D/g, "")) || 9999
      return ordem(a) - ordem(b) || a.name.localeCompare(b.name, "pt-BR")
    })
    .map((item) => item.name)
}

function moneySum(lines: PayLine[]) {
  return Math.round(lines.reduce((sum, line) => sum + line.amount, 0) * 100) / 100
}

function parseAjuste(raw: string) {
  const desconto = /^\s*-/.test(raw)
  const n = Math.abs(parseMoneyBr(raw.replace(/[^\d,.-]/g, "").replace(/-/g, "")))
  return desconto ? n : -n
}

function textoAjuste(value: number) {
  if (value < 0) return `+ ${formatMoneyRs(-value)}`
  if (value > 0) return `- ${formatMoneyRs(value)}`
  return formatMoneyRs(0)
}

function CampoValor({
  texto,
  editavel,
  aria,
  title,
  onChangeText,
  onCommit,
}: {
  texto: string
  editavel: boolean
  aria: string
  title?: string
  onChangeText?: (raw: string) => string
  onCommit: (raw: string) => void
}) {
  const [editando, setEditando] = useState(false)
  const [text, setText] = useState(texto)
  const ref = useRef<HTMLInputElement>(null)
  const cancelar = useRef(false)
  useEffect(() => {
    if (!editando) setText(texto)
  }, [texto, editando])
  useEffect(() => {
    if (!editando) return
    const field = ref.current
    if (!field) return
    field.focus()
    field.select()
  }, [editando])
  if (!editavel || !editando) {
    return (
      <span
        className="cx-line-money"
        title={editavel ? "Duplo clique para editar" : title}
        onMouseDown={(event) => {
          if (event.detail > 1) event.preventDefault()
        }}
        onDoubleClick={() => {
          if (editavel) setEditando(true)
        }}
      >
        {texto}
      </span>
    )
  }
  return (
    <input
      ref={ref}
      className="cx-line-money"
      value={text}
      inputMode="decimal"
      aria-label={aria}
      title={title}
      onChange={(event) => setText(onChangeText ? onChangeText(event.target.value) : event.target.value)}
      onBlur={() => {
        if (cancelar.current) {
          cancelar.current = false
          setEditando(false)
          return
        }
        onCommit(text)
        setEditando(false)
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur()
        if (event.key === "Escape") {
          cancelar.current = true
          setText(texto)
          setEditando(false)
        }
      }}
    />
  )
}

function ValorPagamento({ amount, onCommit }: { amount: number; onCommit: (next: number) => void }) {
  const [texto, setTexto] = useState(() => (amount > 0 ? formatMoneyBr(amount) : ""))
  const foco = useRef(false)
  useEffect(() => {
    if (!foco.current) setTexto(amount > 0 ? formatMoneyBr(amount) : "")
  }, [amount])
  return (
    <input
      inputMode="decimal"
      value={texto}
      aria-label="Valor do pagamento"
      onFocus={(event) => {
        foco.current = true
        event.currentTarget.select()
      }}
      onMouseUp={(event) => event.preventDefault()}
      onChange={(event) => {
        const next = valorDigitado(event.target.value)
        setTexto(next)
        onCommit(parseMoneyBr(next))
      }}
      onBlur={() => {
        foco.current = false
        const next = parseMoneyBr(texto)
        onCommit(Number.isFinite(next) ? next : 0)
        setTexto(next > 0 ? formatMoneyBr(next) : "")
      }}
    />
  )
}

function AjusteCampo({
  value,
  enabled,
  max,
  title,
  onCommit,
}: {
  value: number
  enabled: boolean
  max: number
  title?: string
  onCommit: (next: number) => void
}) {
  return (
    <CampoValor
      texto={textoAjuste(value)}
      editavel={enabled}
      aria="Desconto ou acréscimo"
      title={enabled ? "Duplo clique para editar. Com menos na frente, desconta." : title || "Sem autorização para alterar desconto/acréscimo"}
      onCommit={(raw) => {
        const typed = parseAjuste(raw)
        onCommit(typed > 0 ? Math.min(typed, max) : typed)
      }}
    />
  )
}

function VendedorItem({
  value,
  options,
  onChange,
}: {
  value: string
  options: string[]
  onChange: (next: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    function onPointer(event: PointerEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false)
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false)
    }
    document.addEventListener("pointerdown", onPointer)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("pointerdown", onPointer)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])
  return (
    <div className="cx-line-seller" ref={ref}>
      <button className="cx-seller-swap" type="button" aria-label="Alterar vendedor deste item" onClick={() => setOpen((current) => !current)}>
        <ArrowLeftRight size={14} strokeWidth={2.2} />
      </button>
      <strong>{value}</strong>
      {open ? (
        <ul className="cx-seller-menu">
          {options.map((name) => (
            <li key={name}>
              <button type="button" onClick={() => { onChange(name); setOpen(false) }}>{name}</button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

function PrecoCampo({ value, editavel = true, onCommit }: { value: number; editavel?: boolean; onCommit: (next: number) => void }) {
  return (
    <CampoValor
      texto={formatMoneyRs(value)}
      editavel={editavel}
      aria="Valor unitário"
      title={editavel ? "Duplo clique para editar" : "Valor definido no outro caixa"}
      onChangeText={(raw) => {
        const numero = valorDigitado(raw)
        return numero ? `R$ ${numero}` : "R$ "
      }}
      onCommit={(raw) => onCommit(Math.max(0, parseMoneyBr(raw.replace(/[^\d,.-]/g, ""))))}
    />
  )
}

function semCategoria(categoryId: string, category: string) {
  const id = categoryId.trim()
  const name = category.trim()
  if (!id && !name) return true
  const limpo = name.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase()
  return limpo === "sem categoria" || limpo === "-" || limpo === "—"
}

function serialObrigatorio(flags: ProductCategory[], categoryId: string, category: string) {
  const id = categoryId.trim()
  const name = category.trim().toLowerCase()
  if (semCategoria(id, category)) return true
  const row = flags.find((item) => item.id === id || item.name.trim().toLowerCase() === name || String(item.code) === id)
  return row ? row.requireSerial : true
}

function serialIncompleto(line: CartLine) {
  if (!line.requireSerial) return false
  for (let index = 0; index < line.qty; index += 1) {
    if (!(line.serials[index] || "").trim()) return true
  }
  return false
}

function imeiLimpo(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, "")
}

function SeletorImei({
  productId,
  value,
  ocupados,
  exceptSaleId,
  onChange,
}: {
  productId: string
  value: string
  ocupados: string[]
  exceptSaleId: string
  onChange: (imei: string) => void
}) {
  const [lista, setLista] = useState<string[] | null>(null)
  const [falha, setFalha] = useState(false)
  const [q, setQ] = useState("")
  const [aberto, setAberto] = useState(false)

  useEffect(() => {
    let ativo = true
    api
      .get(`/clients/products/${productId}/imeis`, { params: exceptSaleId ? { exceto: exceptSaleId } : {} })
      .then(({ data }) => {
        if (!ativo) return
        setFalha(false)
        setLista(((data.imeis || []) as string[]).map((item) => imeiLimpo(String(item))).filter((item) => item.length >= 8))
      })
      .catch(() => {
        if (!ativo) return
        setFalha(true)
        setLista([])
      })
    return () => {
      ativo = false
    }
  }, [productId, exceptSaleId])

  const bloqueados = new Set(ocupados.map(imeiLimpo).filter(Boolean))
  const filtro = imeiLimpo(q)
  const visiveis = (lista || []).filter((imei) => {
    if (bloqueados.has(imei) && imei !== imeiLimpo(value)) return false
    return !filtro || imei.includes(filtro)
  })

  return (
    <div className="cx-imei-pick">
      <input
        value={aberto ? q : value}
        placeholder="Informe o IMEI"
        aria-label="Informe o IMEI"
        size={15}
        maxLength={20}
        autoComplete="off"
        spellCheck={false}
        onFocus={() => {
          setAberto(true)
          setQ("")
        }}
        onChange={(event) => {
          setQ(event.target.value.toUpperCase())
          setAberto(true)
        }}
        onBlur={() => {
          window.setTimeout(() => setAberto(false), 160)
        }}
      />
      {value && !aberto ? (
        <button className="cx-imei-clear" type="button" aria-label="Limpar IMEI" onMouseDown={(event) => { event.preventDefault(); onChange("") }}>
          ×
        </button>
      ) : null}
      {aberto ? (
        <ul>
          {lista === null ? <li>Buscando IMEIs...</li> : falha ? (
            <li>Não deu para buscar os IMEIs agora.</li>
          ) : visiveis.length === 0 ? (
            <li>Nenhum IMEI deste produto no estoque.</li>
          ) : visiveis.slice(0, 12).map((imei) => (
            <li key={imei}>
              <button
                type="button"
                onMouseDown={(event) => {
                  event.preventDefault()
                  onChange(imei)
                  setQ("")
                  setAberto(false)
                }}
              >
                {imei}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

function imprimirRecibo() {
  const titulo = document.title
  document.title = " "
  window.addEventListener("afterprint", () => { document.title = titulo }, { once: true })
  window.print()
}

function soDigitos(value: string) {
  return value.replace(/\D/g, "")
}

function nomeEhSoDocumento(name: string) {
  const limpo = name.replace(/\s/g, "")
  const digitos = soDigitos(limpo)
  return digitos.length >= 8 && digitos === limpo
}

function semNumeroRepetido(list: PessoaNota[]) {
  const documentosComNome = new Set(
    list
      .filter((item) => !nomeEhSoDocumento(item.name))
      .map((item) => soDigitos(item.document || ""))
      .filter((doc) => doc.length >= 8),
  )
  return list.filter((item) => {
    if (!nomeEhSoDocumento(item.name)) return true
    return !documentosComNome.has(soDigitos(item.name))
  })
}

function caixaAberto() {
  if (typeof sessionStorage === "undefined") return null
  const name = sessionStorage.getItem(CAIXA_STORAGE_KEY) || ""
  if (!name) return null
  try {
    const snap = JSON.parse(sessionStorage.getItem(CAIXA_SNAP_KEY) || "") as { code?: number; name?: string; payload?: Record<string, unknown> }
    if (snap?.name === name) return { code: Number(snap.code) || 0, name, payload: snap.payload || {} }
  } catch {
    /* segue com o nome salvo */
  }
  return { code: 0, name, payload: {} as Record<string, unknown> }
}

function nomesLista(value: unknown) {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (typeof item === "string" || typeof item === "number") {
      const nome = String(item).trim()
      return nome ? [nome] : []
    }
    if (item && typeof item === "object") {
      const registro = item as { name?: unknown; nome?: unknown }
      const nome = String(registro.name || registro.nome || "").trim()
      return nome ? [nome] : []
    }
    return []
  })
}

function nomesPagamento(payload: Record<string, unknown>) {
  const nomes = Array.isArray(payload.formasPagamento) ? payload.formasPagamento.map(String).filter(Boolean) : []
  return nomes.slice().sort((a, b) => ordemPagamento(a) - ordemPagamento(b) || a.localeCompare(b, "pt-BR"))
}

function PdvBoard() {
  const aberto = useState(caixaAberto)[0]
  const { client } = useClientAuth()
  const { storeId, storeName } = usePdvSession()
  const [emitente, setEmitente] = useState<Emitente>({ name: "", document: "", phone: "", address: "", city: "" })
  const navigate = useNavigate()
  const [cliente, setCliente] = useState("CONSUMIDOR FINAL")
  const [clientQuery, setClientQuery] = useState("")
  const [customers, setCustomers] = useState<PessoaNota[]>([])
  const [clientPickerOpen, setClientPickerOpen] = useState(false)
  const clientSearchRef = useRef<HTMLInputElement>(null)
  const [productSearchOpen, setProductSearchOpen] = useState(false)
  const [pickerQuery, setPickerQuery] = useState("")
  const [pickerHits, setPickerHits] = useState<PdvProduct[]>([])
  const [outrasLojas, setOutrasLojas] = useState<Record<string, Array<{ id: string; name: string; quantity: number }>>>({})
  const [estoqueProduto, setEstoqueProduto] = useState<PdvProduct | null>(null)
  const [clientModal, setClientModal] = useState(false)
  const [consulting, setConsulting] = useState(false)
  const actionLock = useRef(false)
  const [newName, setNewName] = useState("")
  const [newPhone, setNewPhone] = useState("")
  const [newDoc, setNewDoc] = useState("")
  const [savingClient, setSavingClient] = useState(false)
  const [observacao, setObservacao] = useState("")
  const [finishingSaleId, setFinishingSaleId] = useState<string | null>(null)
  const [finishingCode, setFinishingCode] = useState("")
  const [proximaVenda, setProximaVenda] = useState("")
  const [vendaEnviada, setVendaEnviada] = useState("")
  const [askNova, setAskNova] = useState(false)
  const [reserved, setReserved] = useState<Record<string, number>>({})
  const [payMeta, setPayMeta] = useState<Record<string, PayMeta>>({})
  const [payParcelas, setPayParcelas] = useState(1)
  const [query, setQuery] = useState("")
  const [hits, setHits] = useState<PdvProduct[]>([])
  const [cart, setCart] = useState<CartLine[]>([])
  const [serialFlags, setSerialFlags] = useState<ProductCategory[]>([])
  const serialFlagsRef = useRef(serialFlags)
  serialFlagsRef.current = serialFlags
  const [methods, setMethods] = useState<string[]>(() => nomesPagamento(aberto?.payload || {}))
  const [payMethod, setPayMethod] = useState(() => nomesPagamento(aberto?.payload || {})[0] || "")
  const [received, setReceived] = useState("")
  const [payments, setPayments] = useState<PayLine[]>([])
  const [trocaOpen, setTrocaOpen] = useState(false)
  const [trocaQuery, setTrocaQuery] = useState("")
  const [trocaHits, setTrocaHits] = useState<PdvProduct[]>([])
  const [trocaBuscando, setTrocaBuscando] = useState(false)
  const [trocaPick, setTrocaPick] = useState<PdvProduct | null>(null)
  const [trocaImei, setTrocaImei] = useState("")
  const [trocaValor, setTrocaValor] = useState("")
  const [sellers, setSellers] = useState<string[]>(() => nomesLista(aberto?.payload.vendedores))
  const [seller, setSeller] = useState("")
  const [obrigarVendedor, setObrigarVendedor] = useState(aberto?.payload.obrigarVendedor !== false)
  const [sellerAccounts, setSellerAccounts] = useState<Array<{ code: number; name: string; must: boolean }>>([])
  const sellerNames = useMemo(() => {
    const daCaixa = nomesLista(sellers)
    const contas = sellerAccounts.map((item) => item.name.trim()).filter(Boolean)
    if (!daCaixa.length) return contas
    if (!contas.length) return daCaixa
    const permitidos = new Set(daCaixa.map((nome) => nome.toLocaleLowerCase("pt-BR")))
    const doCaixa = contas.filter((nome) => permitidos.has(nome.toLocaleLowerCase("pt-BR")))
    return doCaixa.length ? doCaixa : daCaixa
  }, [sellers, sellerAccounts])
  const [passAsk, setPassAsk] = useState<{ code: number; name: string } | null>(null)
  const [nextPass, setNextPass] = useState("")
  const [caixaName, setCaixaName] = useState(aberto?.name || "")
  const [caixaOrigem, setCaixaOrigem] = useState("")
  const [caixaCode, setCaixaCode] = useState(aberto?.code || 0)
  const [modo, setModo] = useState<"finaliza" | "espera">(aberto?.payload.modo === "espera" ? "espera" : "finaliza")
  const [permitirTrocarCaixa, setPermitirTrocarCaixa] = useState(aberto?.payload.permitirTrocarCaixa !== false)
  const [podeAjuste, setPodeAjuste] = useState(false)
  const [toast, setToast] = useState("")
  const [stockAlert, setStockAlert] = useState<string | null>(null)
  const [askCancel, setAskCancel] = useState(false)
  const [busy, setBusy] = useState(false)
  const [openSales, setOpenSales] = useState<OpenSale[] | null>(null)
  const [printSale, setPrintSale] = useState<PrintedSale | null>(null)
  const [pessoaAberta, setPessoaAberta] = useState<ReciboDestinatario>({ nome: "" })
  const [textosNota, setTextosNota] = useState<TextoImpressao[]>([])
  const [blockTrocarModal, setBlockTrocarModal] = useState(false)
  const canBaixa = modo === "finaliza"

  useEffect(() => {
    carregarTextosRecibo().then(setTextosNota).catch(() => setTextosNota([]))
  }, [])

  useEffect(() => {
    let vivo = true
    destinatarioPorNome(cliente).then((pessoa) => {
      if (vivo) setPessoaAberta(pessoa)
    })
    return () => {
      vivo = false
    }
  }, [cliente])

  function flashToast(message: string) {
    if (!message) return
    setToast(message)
    window.setTimeout(() => setToast((current) => (current === message ? "" : current)), 3500)
  }

  useEffect(() => {
    listCatalog("product_category", true)
      .then((items) => setSerialFlags(items.map(categoryFromCatalog)))
      .catch(() => setSerialFlags([]))
  }, [])

  useEffect(() => {
    if (!serialFlags.length) return
    setCart((current) => current.map((line) => {
      const requireSerial = serialObrigatorio(serialFlags, line.categoryId, line.category)
      return requireSerial === line.requireSerial ? line : { ...line, requireSerial }
    }))
  }, [serialFlags])

  useEffect(() => {
    const nome = seller.trim()
    if (!nome) return
    setCart((current) => current.map((line) => (line.sellerCustom ? line : { ...line, seller: nome })))
  }, [seller])

  useEffect(() => {
    if (!storeId) return
    api.get(`/clients/stores/${storeId}/loja`)
      .then(({ data }) => setEmitente(emitenteDaLoja(data.store)))
      .catch(() => undefined)
  }, [storeId, storeName])

  useEffect(() => {
    let vivo = true
    const stored = typeof sessionStorage === "undefined" ? "" : sessionStorage.getItem(CAIXA_STORAGE_KEY) || ""
    if (!stored) {
      navigate("/client/caixa", { replace: true })
      return
    }
    Promise.all([listLojaCaixas(true), listCatalog("payment", true)])
      .then(([rows, pagamentos]) => {
        if (!vivo) return
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
        const cadastradas = nomesCadastrados(pagamentos)
        const marcadas = Array.isArray(caixa.payload.formasPagamento)
          ? caixa.payload.formasPagamento.map(String).filter((nome) => cadastradas.includes(nome))
          : []
        const visiveis = (marcadas.length ? marcadas : cadastradas)
          .slice()
          .sort((a, b) => ordemPagamento(a) - ordemPagamento(b) || a.localeCompare(b, "pt-BR"))
        setMethods(visiveis)
        setPayMethod((atual) => (atual && visiveis.includes(atual) ? atual : visiveis[0] || ""))
        const next: Record<string, PayMeta> = {}
        pagamentos.forEach((item) => {
          const cartao = Boolean(item.payload.cartao)
          const credito = String(item.payload.debitoCredito || "").toLowerCase().includes("créd")
            || String(item.payload.debitoCredito || "").toLowerCase().includes("cred")
            || String(item.payload.aceitaCredito) === "true"
            || item.payload.aceitaCredito === true
          const maxParcelas = Math.max(1, Math.min(24, Number(String(item.payload.parcelas || "12").replace(/\D/g, "")) || 12))
          next[item.name] = { credit: cartao && credito, cartao, maxParcelas }
        })
        setPayMeta(next)
        const vendedores = nomesLista(caixa.payload.vendedores)
        if (vendedores.length) setSellers(vendedores)
        setObrigarVendedor(caixa.payload.obrigarVendedor !== false)
      })
      .catch(() => {
        if (vivo) flashToast("Não foi possível carregar o caixa.")
      })
    listCatalog("user", true)
      .then((rows) => {
        if (!vivo) return
        setSellerAccounts(rows.map((item) => ({
          code: item.code,
          name: item.name,
          must: Boolean(item.payload.mustChangePassword),
        })))
      })
      .catch(() => {
        if (vivo) setSellerAccounts([])
      })
    const reservedTimer = window.setTimeout(() => {
      if (vivo) void refreshReserved()
    }, 600)
    return () => {
      vivo = false
      window.clearTimeout(reservedTimer)
    }
  }, [])

  useEffect(() => {
    if (!client) return
    let ativo = true
    Promise.all([listCatalog("user", true), listCatalog("group", true)])
      .then(([users, groups]) => {
        if (!ativo) return
        const email = client.email.trim().toLowerCase()
        const username = client.username.trim().toLowerCase()
        const user = users.find((item) => {
          const mail = String(item.payload.email || "").trim().toLowerCase()
          const login = String(item.payload.usuario || "").trim().toLowerCase()
          return (email && mail === email) || (username && login === username)
        })
        setSellerAccounts(users.map((item) => ({
          code: item.code,
          name: item.name,
          must: Boolean(item.payload.mustChangePassword),
        })))
        if (!user) {
          setPodeAjuste(true)
          return
        }
        const group = groups.find((item) => item.name === String(user.payload.grupo || ""))
        setPodeAjuste(eventoPermitido(group?.payload.eventos, EVENTO_DESCONTO))
      })
      .catch(() => {
        if (ativo) setPodeAjuste(false)
      })
    return () => {
      ativo = false
    }
  }, [client])

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
    if (!clientPickerOpen) return
    const term = clientQuery.trim()
    if (term.length < 2) {
      setCustomers([])
      return
    }
    const timer = window.setTimeout(() => {
      api
        .get("/clients/customers", { params: { ativo: "1", search: term } })
        .then(({ data }) => {
          const list = ((data.customers || []) as Array<PessoaNota & { code: string | number }>).map((item) => ({
            code: String(item.code),
            name: item.name,
            document: item.document,
            phone: item.phone,
            city: item.city,
            state: item.state,
            cep: item.cep,
          }))
          setCustomers(semNumeroRepetido(list))
        })
        .catch(() => undefined)
    }, 250)
    return () => window.clearTimeout(timer)
  }, [clientQuery, clientPickerOpen])

  useEffect(() => {
    if (!clientPickerOpen) return
    const id = window.setTimeout(() => clientSearchRef.current?.focus(), 0)
    return () => window.clearTimeout(id)
  }, [clientPickerOpen])

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setHits([])
      return
    }
    const timer = window.setTimeout(() => {
      api
        .get("/clients/products", { params: { search: q, ativo: "1", rapido: "1" } })
        .then(({ data }) => setHits(((data.products as PdvProduct[]) ?? []).slice(0, 8)))
        .catch(() => flashToast("Não foi possível pesquisar produtos."))
    }, 250)
    return () => window.clearTimeout(timer)
  }, [query])

  useEffect(() => {
    if (!trocaOpen) return
    const q = trocaQuery.trim()
    if (q.length < 2) {
      setTrocaHits([])
      setTrocaBuscando(false)
      return
    }
    let ativo = true
    setTrocaBuscando(true)
    const timer = window.setTimeout(() => {
      api
        .get("/clients/products", { params: { search: q, ativo: "1", rapido: "1" } })
        .then(({ data }) => {
          if (!ativo) return
          setTrocaHits(((data.products as PdvProduct[]) ?? []).slice(0, 8))
        })
        .catch(() => {
          if (ativo) flashToast("Não foi possível pesquisar produtos.")
        })
        .finally(() => {
          if (ativo) setTrocaBuscando(false)
        })
    }, 120)
    return () => {
      ativo = false
      window.clearTimeout(timer)
    }
  }, [trocaOpen, trocaQuery])

  useEffect(() => {
    if (!productSearchOpen) return
    const q = pickerQuery.trim()
    if (q.length < 2) {
      setPickerHits([])
      return
    }
    const timer = window.setTimeout(() => {
      api
        .get("/clients/products", { params: { search: q, ativo: "1", rapido: "1" } })
        .then(({ data }) => setPickerHits(((data.products as PdvProduct[]) ?? []).slice(0, 8)))
        .catch(() => flashToast("Não foi possível pesquisar produtos."))
    }, 250)
    return () => window.clearTimeout(timer)
  }, [pickerQuery, productSearchOpen])

  useEffect(() => {
    if (!productSearchOpen || !storeId || pickerHits.length === 0) {
      setOutrasLojas({})
      return
    }
    let ativo = true
    api.post("/clients/products/outras-lojas", {
      storeId,
      products: pickerHits.map((item) => ({ id: item.id, code: item.code, barcode: item.barcode })),
    })
      .then(({ data }) => {
        if (ativo) setOutrasLojas((data.lojas || {}) as Record<string, Array<{ id: string; name: string; quantity: number }>>)
      })
      .catch(() => {
        if (ativo) setOutrasLojas({})
      })
    return () => { ativo = false }
  }, [pickerHits, productSearchOpen, storeId])

  const itemCount = cart.reduce((sum, line) => sum + line.qty, 0)
  const bruto = cart.reduce((sum, line) => sum + line.qty * line.price, 0)
  const discount = cart.reduce((sum, line) => sum + line.qty * line.discount, 0)
  const subtotal = cart.reduce((sum, line) => sum + line.qty * Math.max(0, line.price - line.discount), 0)
  const total = subtotal
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
    if (actionLock.current) return
    if (obrigarVendedor && !seller.trim()) {
      flashToast("Selecione o vendedor.")
      return
    }
    const lojaStock = Number(product.lojaStock) || 0
    const blocked = reserved[product.id] || 0
    const existingQty = cart.find((line) => line.id === product.id)?.qty || 0
    const available = Math.max(0, Math.floor(lojaStock) - blocked - existingQty)
    if (available < 1) {
      const nome = lojaProductName(product)
      if (blocked > 0) {
        setStockAlert(`"${nome}" já está em outra venda em aberto (${blocked} un.). Estoque da loja: ${Math.floor(lojaStock)}.`)
      } else if (existingQty > 0) {
        setStockAlert(`"${nome}" já está nesta venda e não há mais unidade na loja.`)
      } else {
        setStockAlert(`"${nome}" não tem estoque nesta loja.`)
      }
      return
    }
    actionLock.current = true
    window.setTimeout(() => { actionLock.current = false }, 120)
    const categoryId = product.categoryId || ""
    const category = product.category || ""
    const requireSerial = serialObrigatorio(serialFlagsRef.current, categoryId, category)
    setCart((current) => {
      const existing = current.find((line) => line.id === product.id)
      if (existing) {
        return current.map((line) =>
          line.id === product.id
            ? { ...line, qty: line.qty + 1, stock: Math.max(0, available - 1), categoryId, category, requireSerial }
            : line,
        )
      }
      return [
        ...current,
        {
          id: product.id,
          code: product.code || product.barcode,
          reference: product.reference || "—",
          name: lojaProductName(product),
          qty: 1,
          price: productSalePrice(product),
          discount: 0,
          stock: available - 1,
          lojaStock,
          categoryId,
          category,
          requireSerial,
          serials: [],
          seller,
          sellerCustom: false,
        },
      ]
    })
    setQuery("")
    setHits([])
    setProductSearchOpen(false)
    setPickerQuery("")
    setPickerHits([])
    setOutrasLojas({})
    setEstoqueProduto(null)
  }

  function bumpCartLine(productId: string, delta: number) {
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
      return current.map((row) => (row.id === productId ? { ...row, qty: nextQty, stock, serials: row.serials.slice(0, nextQty) } : row))
    })
  }

  function consult(event?: FormEvent) {
    event?.preventDefault()
    if (actionLock.current || consulting) return
    const q = query.trim().toLowerCase()
    if (!q) {
      document.getElementById("cx-produto")?.focus()
      return
    }
    const exact = hits.find((item) => item.code.toLowerCase() === q || item.barcode.toLowerCase() === q || item.name.toLowerCase() === q || (item.lojaName || "").toLowerCase() === q)
    if (exact) {
      addProduct(exact)
      return
    }
    if (hits.length === 1) {
      addProduct(hits[0])
      return
    }
    setConsulting(true)
    api
      .get("/clients/products", { params: { search: query.trim(), ativo: "1", rapido: "1" } })
      .then(({ data }) => {
        const products = ((data.products as PdvProduct[]) ?? []).slice(0, 8)
        setHits(products)
        const hit = products.find((item) => item.code.toLowerCase() === q || item.barcode.toLowerCase() === q)
        if (hit) addProduct(hit)
        else if (products.length === 1) addProduct(products[0])
        else {
          setPickerQuery(query.trim())
          setPickerHits(products)
          setProductSearchOpen(true)
          if (!products.length) flashToast("Nenhum produto encontrado.")
        }
      })
      .catch(() => flashToast("Não foi possível pesquisar produtos."))
      .finally(() => setConsulting(false))
  }

  function clearSale() {
    setCart([])
    setReceived("")
    setPayments([])
    setQuery("")
    setHits([])
    setPayMethod(methods[0] || "")
    setPayParcelas(1)
    setObservacao("")
    setSeller("")
    setFinishingSaleId(null)
    setFinishingCode("")
    setCaixaOrigem("")
    setAskCancel(false)
    setAskNova(false)
    void refreshReserved()
  }

  function iniciarNovaVenda() {
    setVendaEnviada("")
    setAskNova(false)
    clearSale()
    window.setTimeout(() => document.getElementById("cx-produto")?.focus(), 0)
  }

  function pedirNovaVenda() {
    if (vendaEnviada) {
      iniciarNovaVenda()
      return
    }
    if (cart.length || finishingSaleId || payments.length) {
      setAskNova(true)
      return
    }
    iniciarNovaVenda()
  }

  function abrirTroca(valor?: string) {
    setTrocaQuery("")
    setTrocaHits([])
    setTrocaPick(null)
    setTrocaImei("")
    setTrocaValor(valor ?? received)
    setTrocaOpen(true)
  }

  function confirmarTroca() {
    if (!trocaPick) {
      flashToast("Escolha o produto que está entrando.")
      return
    }
    const imei = trocaImei.trim().toUpperCase().replace(/\s+/g, "")
    if (imei.length < 8) {
      flashToast("Informe o IMEI com pelo menos 8 caracteres.")
      return
    }
    const amount = parseMoneyBr(trocaValor)
    if (!(amount > 0)) {
      flashToast("Informe o preço que pegamos esse aparelho.")
      return
    }
    const line: PayLine = {
      method: payMethod,
      amount,
      troca: {
        productId: trocaPick.id,
        code: trocaPick.code,
        name: lojaProductName(trocaPick),
        imei,
      },
    }
    setPayments((current) => [...current, line])
    setTrocaOpen(false)
    setReceived("")
  }

  function addPayment() {
    if (ehTroca(payMethod)) {
      abrirTroca(received)
      return
    }
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

  function updatePayment(index: number, patch: Partial<PayLine>) {
    setPayments((current) => current.map((pay, item) => (item === index ? { ...pay, ...patch } : pay)))
  }

  function closeClientPicker() {
    setClientPickerOpen(false)
    setClientQuery("")
    setCustomers([])
  }

  function pickClient(name: string) {
    setCliente(name)
    setClientQuery("")
    setCustomers([])
    setClientPickerOpen(false)
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
        serials: line.serials.slice(0, line.qty).map((item) => item.trim()).filter(Boolean),
        category: line.category,
        seller: line.seller || seller,
      })),
      payments: nextPayments,
    }
  }

  function pagamentosDaTela() {
    const pending = parseMoneyBr(received)
    let tail: PayLine | null = null
    if (pending > 0 && !ehTroca(payMethod)) {
      tail = { method: payMethod, amount: pending }
      if (needsParcelas(payMethod, payMeta[payMethod]) && payParcelas > 1) tail.parcelas = payParcelas
    }
    const nextPayments = tail ? [...payments, tail] : payments
    return { nextPayments, covered: moneySum(nextPayments) }
  }

  function pagamentoFecha() {
    if (parseMoneyBr(received) > 0 && ehTroca(payMethod)) {
      flashToast("Na troca, escolha o produto e o IMEI.")
      abrirTroca(received)
      return null
    }
    const pronto = pagamentosDaTela()
    if (pronto.nextPayments.length === 0) {
      flashToast("Informe o valor e a forma de pagamento.")
      return null
    }
    if (pronto.covered + 0.009 < total) {
      flashToast(`Falta receber ${formatMoneyRs(Math.max(0, total - pronto.covered))}.`)
      return null
    }
    return pronto.nextPayments
  }

  async function exigirSerial() {
    let flags = serialFlagsRef.current
    if (!flags.length) {
      try {
        const items = await listCatalog("product_category", true)
        flags = items.map(categoryFromCatalog)
        setSerialFlags(flags)
      } catch {
        flags = serialFlagsRef.current
      }
    }
    const next = cart.map((line) => ({
      ...line,
      requireSerial: serialObrigatorio(flags, line.categoryId, line.category),
    }))
    const faltou = next.find(serialIncompleto)
    const mudou = next.some((line, index) => {
      const prev = cart[index]
      return !prev || line.requireSerial !== prev.requireSerial || line.categoryId !== prev.categoryId || line.category !== prev.category
    })
    if (faltou || mudou) setCart(next)
    if (faltou) {
      flashToast(`Informe o IMEI ou serial de ${faltou.name}.`)
      return false
    }
    return true
  }

  async function saveOpenSaleEdit() {
    if (!finishingSaleId || busy) return
    if (cart.length === 0) {
      flashToast("Inclua um produto.")
      return
    }
    if (obrigarVendedor && !seller.trim()) {
      flashToast("Escolha o vendedor.")
      return
    }
    if (!(await exigirSerial())) return
    const nextPayments = pagamentoFecha()
    if (!nextPayments) return
    setBusy(true)
    try {
      await api.put(`/clients/pdv-vendas/${finishingSaleId}`, {
        ...saleBody(nextPayments, "espera"),
        notes: observacao.trim(),
      })
      const code = finishingCode
      clearSale()
      setVendaEnviada(code)
      void carregarProximaVenda()
    } catch (err) {
      flashToast(parseError(err).friend || "Não foi possível salvar a venda.")
    } finally {
      setBusy(false)
    }
  }

  async function finish(forceStatus?: "espera" | "finalizada") {
    const wantsFinalize = forceStatus === "finalizada" || (forceStatus !== "espera" && Boolean(finishingSaleId && canBaixa))
    const nextStatus = forceStatus ?? (finishingSaleId && canBaixa ? "finalizada" : modo === "finaliza" ? "finalizada" : "espera")
    if (busy) return
    if (finishingSaleId && !canBaixa && wantsFinalize) {
      flashToast("Este caixa não pode dar baixa. Envie para vendas em aberto.")
      return
    }
    if (finishingSaleId && !canBaixa && nextStatus === "espera") {
      await saveOpenSaleEdit()
      return
    }
    if (cart.length === 0) {
      flashToast("Inclua um produto.")
      return
    }
    if (obrigarVendedor && !seller.trim()) {
      flashToast("Escolha o vendedor.")
      return
    }
    if (!(await exigirSerial())) return
    const account = sellerAccounts.find((item) => item.name === seller && item.must)
    if (account) {
      setPassAsk({ code: account.code, name: account.name })
      setNextPass("")
      return
    }
    const nextPayments = pagamentoFecha()
    if (!nextPayments) return
    setBusy(true)
    try {
      let sale: OpenSale
      if (finishingSaleId) {
        await api.put(`/clients/pdv-vendas/${finishingSaleId}`, saleBody(nextPayments, "espera"))
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
      void carregarProximaVenda()
      if (sale.status === "espera") setVendaEnviada(sale.code)
      if (sale.status === "finalizada") {
        const pessoa = await destinatarioPorNome(sale.customerName)
        setPrintSale({
          kind: "",
          code: sale.code,
          customer: pessoa.nome || sale.customerName,
          document: pessoa.documento || "",
          phone: pessoa.telefone || "",
          email: pessoa.email || "",
          city: pessoa.cidade || "",
          state: pessoa.uf || "",
          cep: pessoa.cep || "",
          endereco: pessoa.endereco || "",
          seller: sale.sellerName || seller,
          notes: sale.notes || "",
          lines: sale.lines,
          payments: sale.payments,
          total: sale.total,
          received: sale.received,
          changeAmount: sale.changeAmount,
        })
      }
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
      const sales = (data.sales || []) as OpenSale[]
      setOpenSales(sales)
      const map: Record<string, number> = {}
      for (const sale of sales) {
        for (const line of sale.lines) map[line.productId] = (map[line.productId] || 0) + line.qty
      }
      setReserved(map)
    } catch (err) {
      flashToast(parseError(err).friend || "Não foi possível carregar as vendas em aberto.")
    }
  }

  function loadSaleToScreen(sale: OpenSale) {
    const daLinha = sale.lines.map((line) => (line.seller || "").trim()).find(Boolean) || ""
    const vendedor = (sale.sellerName || "").trim() || daLinha
    setOpenSales(null)
    setFinishingSaleId(sale.id)
    setFinishingCode(sale.code)
    setCaixaOrigem(sale.caixaName || "")
    setCliente(sale.customerName)
    setSeller(vendedor)
    setObservacao(sale.notes || "")
    setPayments(sale.payments)
    setReceived("")
    setPayParcelas(1)
    setCart(sale.lines.map((line) => {
      const categoryId = line.categoryId || ""
      const category = line.category || ""
      const linhaSeller = (line.seller || "").trim() || vendedor
      return {
        id: line.productId,
        code: line.code || "",
        reference: line.reference || "—",
        name: line.name,
        qty: line.qty,
        price: line.price,
        discount: line.discount,
        stock: line.qty,
        lojaStock: line.lojaStock == null ? 0 : Number(line.lojaStock) || 0,
        categoryId,
        category,
        requireSerial: serialObrigatorio(serialFlagsRef.current, categoryId, category),
        serials: Array.isArray(line.serials) ? line.serials.map(String) : [],
        seller: linhaSeller,
        sellerCustom: Boolean(linhaSeller && linhaSeller !== vendedor),
      }
    }))
    setReserved((current) => {
      const next = { ...current }
      for (const line of sale.lines) next[line.productId] = Math.max(0, (next[line.productId] || 0) - line.qty)
      return next
    })
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
      avisarSalvo("Cliente salvo.")
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
      const popupAberto = Boolean(
        estoqueProduto || clientModal || clientPickerOpen || productSearchOpen || openSales || trocaOpen || passAsk || askCancel || askNova || vendaEnviada,
      )
      if (event.key === "Escape") {
        event.preventDefault()
        if (estoqueProduto) {
          setEstoqueProduto(null)
          return
        }
        if (clientModal) {
          setClientModal(false)
          return
        }
        if (clientPickerOpen) {
          closeClientPicker()
          return
        }
        if (productSearchOpen) {
          setProductSearchOpen(false)
          return
        }
        if (openSales) {
          setOpenSales(null)
          return
        }
        if (trocaOpen) {
          setTrocaOpen(false)
          return
        }
        if (passAsk) {
          setPassAsk(null)
          return
        }
        if (askCancel) {
          setAskCancel(false)
          return
        }
        if (askNova) {
          setAskNova(false)
          return
        }
        if (vendaEnviada) {
          setVendaEnviada("")
          return
        }
        setHits([])
        return
      }
      if (popupAberto) {
        if (event.key === "F2" || event.key === "F3") event.preventDefault()
        return
      }
      if (event.key === "F2") {
        event.preventDefault()
        void finish()
      } else if (event.key === "F3" && !(event.target instanceof HTMLInputElement)) {
        event.preventDefault()
        imprimirRecibo()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [estoqueProduto, clientModal, clientPickerOpen, productSearchOpen, openSales, trocaOpen, passAsk, askCancel, askNova, vendaEnviada])

  const slip = printSale
  const numeroVenda = finishingCode || proximaVenda
  const baixaOutroCaixa = Boolean(finishingSaleId) && caixaOrigem.trim().toLocaleLowerCase("pt-BR") !== caixaName.trim().toLocaleLowerCase("pt-BR")

  function carregarProximaVenda() {
    api.get("/clients/pdv-vendas/proxima")
      .then(({ data }) => setProximaVenda(String(data?.code || "")))
      .catch(() => setProximaVenda(""))
  }

  useEffect(() => {
    carregarProximaVenda()
  }, [])

  return (
    <section className="cx-pdv">
      <header className="cx-head">
        <div className="cx-brand">
          <button type="button" className="cx-open-sales" onClick={() => void showOpenSales()}>
            <Receipt size={18} strokeWidth={2.2} aria-hidden="true" />
            Vendas em aberto
          </button>
          <span className="cx-brand-ico" aria-hidden="true">
            <ShoppingCart size={18} strokeWidth={2.2} />
          </span>
          <div>
            <h1>
              PDV – Caixa
              {numeroVenda ? <span className="cx-sale-no">Venda {numeroVenda}</span> : null}
            </h1>
            <p>{caixaName ? `${caixaName} · ${modo === "espera" ? "envia para vendas em aberto" : "finaliza a venda"}` : "Selecione um caixa para registrar a venda"}</p>
          </div>
        </div>
        <div className="cx-head-actions">
          <button
            type="button"
            onClick={() => {
              if (finishingSaleId) clearSale()
              navigate(permitirTrocarCaixa ? "/client/caixa" : "/client/dashboard")
            }}
          >
            <ArrowLeft size={15} strokeWidth={2.2} aria-hidden="true" />
            Voltar
          </button>
          <button
            type="button"
            title={permitirTrocarCaixa ? "Trocar de caixa" : "Este caixa não permite troca"}
            onClick={() => {
              if (!permitirTrocarCaixa) {
                setBlockTrocarModal(true)
                return
              }
              navigate("/client/caixa")
            }}
          >
            <Monitor size={15} strokeWidth={2.2} aria-hidden="true" />
            Trocar caixa
          </button>
          <button type="button" onClick={pedirNovaVenda}>
            Nova venda
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
            <button
              type="button"
              className="cx-client-pick"
              onClick={() => {
                setClientQuery("")
                setClientPickerOpen(true)
              }}
            >
              <UserRound size={16} strokeWidth={2.1} aria-hidden="true" />
              <span className="cx-client-pick-label">Cliente</span>
              <strong>{cliente}</strong>
            </button>
            <div className="cx-client-pick cx-seller-pick">
              <span className="cx-client-pick-label" id="cx-seller-label">Vendedor</span>
              <SearchableSelect
                labelledBy="cx-seller-label"
                value={seller}
                onChange={setSeller}
                emptyLabel="Selecione"
                options={seller && !sellerNames.includes(seller) ? [seller, ...sellerNames] : sellerNames}
              />
            </div>
          </div>
          <label className="cx-produto">
            <span>Produto</span>
            <span className="cx-input">
              <button className="cx-search-btn" type="button" aria-label="Buscar produto" onClick={() => {
                setPickerQuery(query.trim())
                setProductSearchOpen(true)
              }}>
                <Search size={16} strokeWidth={2.1} />
              </button>
              <input
                id="cx-produto"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Digite o código, referência ou nome do produto..."
                autoComplete="off"
                autoFocus
                disabled={consulting}
              />
            </span>
          </label>
        </form>

        {query.trim().length >= 2 && hits.length > 0 ? (
          <ul className="cx-hits">
            {hits.map((product) => (
              <li key={product.id}>
                <button type="button" onClick={() => addProduct(product)}>
                  <strong>{product.code || product.barcode}</strong>
                  <span>{lojaProductName(product)}</span>
                  <em>{formatMoneyRs(productSalePrice(product))}</em>
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
            <span>Código</span>
            <span>Produto</span>
            <span>Vendedor</span>
            <span>Qtd.</span>
            <span>Valor Unit.</span>
            <span>Desconto/Acréscimo</span>
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
                  <span className="cx-line-code">{line.code}</span>
                  <div className="cx-line-name">
                    <b>{line.name}</b>
                    {line.requireSerial ? <div className="cx-line-serials">
                      {Array.from({ length: line.qty }, (_, index) => (
                        <SeletorImei
                          key={`${line.id}-${index}`}
                          productId={line.id}
                          value={line.serials[index] || ""}
                          ocupados={cart.flatMap((row) => (
                            row.id === line.id ? row.serials.filter((_, serialIndex) => serialIndex !== index) : row.serials
                          ))}
                          exceptSaleId={finishingSaleId || ""}
                          onChange={(imei) => {
                            setCart((current) => current.map((row) => {
                              if (row.id !== line.id) return row
                              const serials = row.serials.slice()
                              serials[index] = imei
                              return { ...row, serials }
                            }))
                          }}
                        />
                      ))}
                    </div> : null}
                  </div>
                  <VendedorItem
                    value={line.seller || seller}
                    options={line.seller && !sellerNames.includes(line.seller) ? [line.seller, ...sellerNames] : sellerNames}
                    onChange={(next) => setCart((current) => current.map((row) => (
                      row.id === line.id ? { ...row, seller: next, sellerCustom: next !== seller } : row
                    )))}
                  />
                  <span className="cx-line-qty">
                    <button type="button" aria-label="Diminuir quantidade" onClick={() => bumpCartLine(line.id, -1)}>
                      <Minus size={14} strokeWidth={2.6} />
                    </button>
                    <strong>{line.qty}</strong>
                    <button type="button" aria-label="Aumentar quantidade" onClick={() => bumpCartLine(line.id, 1)}>
                      <Plus size={14} strokeWidth={2.6} />
                    </button>
                  </span>
                  <span className="cx-line-num">
                    <PrecoCampo
                      value={line.price}
                      editavel={!baixaOutroCaixa}
                      onCommit={(next) => setCart((current) => current.map((row) => {
                        if (baixaOutroCaixa || row.id !== line.id) return row
                        const discount = row.discount > next ? next : row.discount
                        return { ...row, price: next, discount }
                      }))}
                    />
                  </span>
                  <span className="cx-line-num">
                    <AjusteCampo
                      value={line.discount}
                      enabled={podeAjuste && !baixaOutroCaixa}
                      max={line.price}
                      title={baixaOutroCaixa ? "Desconto definido no outro caixa" : undefined}
                      onCommit={(next) => setCart((current) => current.map((row) => (baixaOutroCaixa || row.id !== line.id ? row : { ...row, discount: next })))}
                    />
                  </span>
                  <span className="cx-line-num"><span className="cx-line-money">{formatMoneyRs(line.qty * Math.max(0, line.price - line.discount))}</span></span>
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
              <dd>{formatMoneyRs(bruto)}</dd>
            </div>
            <div>
              <dt>Subtotal</dt>
              <dd>{formatMoneyRs(subtotal)}</dd>
            </div>
            <div className="cx-off">
              <dt>Desconto/Acréscimo</dt>
              <dd>{discount < 0 ? `+ ${formatMoneyRs(-discount)}` : discount > 0 ? `- ${formatMoneyRs(discount)}` : formatMoneyRs(0)}</dd>
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
          <p className="cx-pay-hint">Escolha a forma, informe o valor e clique em Adicionar. No cartão, selecione as parcelas ao lado do valor.</p>
          <div className="cx-tabs cx-tabs-pay" role="tablist" aria-label="Forma de pagamento">
            {methods.length === 0 ? <p className="cx-pay-hint">Nenhuma forma de pagamento cadastrada para venda.</p> : null}
            {methods.map((label) => (
              <button
                key={label}
                type="button"
                role="tab"
                aria-selected={payMethod === label}
                className={payments.some((pay) => pay.method === label) ? "is-used" : undefined}
                onClick={() => {
                  setPayMethod(label)
                  setPayParcelas(1)
                  if (ehTroca(label)) abrirTroca(received)
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="cx-pay-value-row">
            <label className="cx-received">
              Valor · {payMethod}
              <span onMouseDown={(event) => {
                if ((event.target as HTMLElement).tagName === "INPUT") return
                event.preventDefault()
                const campo = event.currentTarget.querySelector("input")
                campo?.focus()
                campo?.select()
              }}>
                <b>R$</b>
                <span className="cx-received-num">
                  <input
                    value={received}
                    inputMode="decimal"
                    placeholder="0,00"
                    style={{ width: `${Math.max(received.length || 4, 1)}ch` }}
                    onChange={(event) => setReceived(valorDigitado(event.target.value))}
                    onBlur={() => {
                      const amount = parseMoneyBr(received)
                      setReceived(amount > 0 ? formatMoneyBr(amount) : "")
                    }}
                    onFocus={(event) => event.currentTarget.select()}
                    onMouseUp={(event) => event.preventDefault()}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault()
                        addPayment()
                      }
                    }}
                  />
                  {sufixoCentavos(received) ? <em className="cx-received-cents">{sufixoCentavos(received)}</em> : null}
                </span>
              </span>
            </label>
            {needsParcelas(payMethod, payMeta[payMethod]) ? (
              <label className="cx-parcelas-inline">
                Parcelas
                <select value={payParcelas} onChange={(event) => setPayParcelas(Number(event.target.value))}>
                  {Array.from({ length: payMeta[payMethod]?.maxParcelas || 12 }, (_, index) => index + 1).map((n) => (
                    <option key={n} value={n}>{n}x</option>
                  ))}
                </select>
              </label>
            ) : null}
            <button className="cx-pay-add" type="button" onClick={addPayment}>Adicionar</button>
            {needsParcelas(payMethod, payMeta[payMethod]) && payParcelas > 1 && parseMoneyBr(received) > 0 ? (
              <p className="cx-parcelas-split">{divisaoParcelas(parseMoneyBr(received), payParcelas)}</p>
            ) : null}
          </div>
          {payments.length ? (
            <ul className="cx-splits">
              {payments.map((pay, index) => (
                <li key={`${pay.method}-${index}`}>
                  <span>
                    {pay.method}
                    {pay.troca ? <small>{pay.troca.name} · {pay.troca.imei}</small> : null}
                    {pay.parcelas && pay.parcelas > 1 ? <small>{divisaoParcelas(pay.amount, pay.parcelas)}</small> : null}
                  </span>
                  {needsParcelas(pay.method, payMeta[pay.method]) ? (
                    <select
                      className="cx-split-parcelas"
                      value={pay.parcelas || 1}
                      onChange={(event) => updatePayment(index, { parcelas: Number(event.target.value) })}
                    >
                      {Array.from({ length: payMeta[pay.method]?.maxParcelas || 12 }, (_, n) => n + 1).map((n) => (
                        <option key={n} value={n}>{n}x</option>
                      ))}
                    </select>
                  ) : null}
                  <label className="cx-split-amount">
                    R$
                    <ValorPagamento amount={pay.amount} onCommit={(amount) => updatePayment(index, { amount })} />
                  </label>
                  <button className="cx-split-remove" type="button" aria-label={`Remover ${pay.method}`} onClick={() => setPayments((current) => current.filter((_, item) => item !== index))}>
                    <Trash2 size={15} strokeWidth={2} />
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
          {finishingSaleId && !canBaixa ? (
            <button className="cx-finish" type="button" onClick={() => void saveOpenSaleEdit()} disabled={busy || cart.length === 0}>
              <Check size={16} strokeWidth={2.6} aria-hidden="true" />
              {busy ? "Enviando..." : "Enviar para vendas em aberto"}
            </button>
          ) : (
            <button className="cx-finish" type="button" onClick={() => void finish()} disabled={busy || cart.length === 0}>
              <Check size={16} strokeWidth={2.6} aria-hidden="true" />
              {busy ? "Enviando..." : finishingSaleId ? "Finalizar baixa (F2)" : modo === "espera" ? "Enviar para vendas em aberto" : "Finalizar Venda (F2)"}
            </button>
          )}
          {modo === "finaliza" && !finishingSaleId ? (
            <button className="cx-finish cx-finish-open" type="button" onClick={() => void finish("espera")} disabled={busy || cart.length === 0}>
              {busy ? "Enviando..." : "Enviar para vendas em aberto"}
            </button>
          ) : null}
          <button className="cx-print" type="button" onClick={() => imprimirRecibo()}>
            <Printer size={15} strokeWidth={2.1} aria-hidden="true" />
            Imprimir Cupom (F3)
          </button>
        </section>

        <section className="cx-card cx-obs-bottom" aria-labelledby="cx-obs-title">
          <h2 id="cx-obs-title">Observação</h2>
          <textarea
            value={observacao}
            onChange={(event) => setObservacao(event.target.value)}
            rows={2}
          />
        </section>
      </aside>

      {blockTrocarModal ? (
        <div className="pdv-caixa-confirm" onClick={() => setBlockTrocarModal(false)}>
          <div className="pdv-caixa-confirm-card" role="alertdialog" aria-modal="true" aria-labelledby="cx-block-trocar-title" onClick={(event) => event.stopPropagation()}>
            <h2 id="cx-block-trocar-title">Troca de caixa bloqueada</h2>
            <p>Este caixa não permite trocar durante a sessão. Use <strong>Voltar</strong> para sair do PDV e escolher outro caixa na tela de caixas.</p>
            <div className="pdv-caixa-confirm-actions">
              <button className="pdv-cad-btn" type="button" onClick={() => setBlockTrocarModal(false)}>Entendi</button>
              <button
                className="pdv-cad-btn pdv-cad-btn-green"
                type="button"
                onClick={() => {
                  setBlockTrocarModal(false)
                  if (finishingSaleId) clearSale()
                  navigate("/client/caixa")
                }}
              >
                Ir para caixas
              </button>
            </div>
          </div>
        </div>
      ) : null}

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

      <div className="cx-print nf-print" aria-hidden="true">
        <ReciboNota
          codigo={slip?.code || finishingCode}
          data={new Date().toLocaleDateString("pt-BR")}
          emitente={{ ...emitente, name: emitente.name || storeName }}
          destinatario={{
            nome: slip?.customer || pessoaAberta.nome || cliente,
            documento: slip?.document || pessoaAberta.documento || "",
            telefone: slip?.phone || pessoaAberta.telefone || "",
            email: slip?.email || pessoaAberta.email || "",
            endereco: slip?.endereco || pessoaAberta.endereco || "",
            cidade: slip?.city || pessoaAberta.cidade || "",
            uf: slip?.state || pessoaAberta.uf || "",
            cep: slip?.cep || pessoaAberta.cep || "",
          }}
          vendedor={slip?.seller || seller}
          notas={slip?.notes || observacao}
          lines={slip?.lines || cart}
          payments={slip?.payments || payments}
          total={slip?.total ?? total}
          received={slip?.received ?? paid}
          changeAmount={slip?.changeAmount ?? Math.max(0, Math.round((paid - total) * 100) / 100)}
          textos={textosNota}
        />
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

      {vendaEnviada ? (
        <div className="pdv-caixa-confirm">
          <div className="pdv-caixa-confirm-card" role="dialog" aria-modal="true" aria-labelledby="cx-enviada-title">
            <h2 id="cx-enviada-title">Venda {vendaEnviada}</h2>
            <p>Foi para vendas em aberto.</p>
            <div className="pdv-caixa-confirm-actions">
              <button className="pdv-cad-btn pdv-cad-btn-green" type="button" onClick={iniciarNovaVenda}>Nova venda</button>
            </div>
          </div>
        </div>
      ) : null}

      {askNova ? (
        <div className="pdv-caixa-confirm">
          <div className="pdv-caixa-confirm-card" role="alertdialog" aria-modal="true" aria-labelledby="cx-nova-title">
            <h2 id="cx-nova-title">Nova venda</h2>
            <p>O que está na tela sai sem gravar.</p>
            <div className="pdv-caixa-confirm-actions">
              <button className="pdv-cad-btn" type="button" onClick={() => setAskNova(false)}>Voltar</button>
              <button className="pdv-cad-btn pdv-cad-btn-green" type="button" onClick={iniciarNovaVenda}>Nova venda</button>
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

      {trocaOpen ? (
        <div className="pdv-caixa-confirm">
          <div className="pdv-caixa-confirm-card cx-troca-card" role="dialog" aria-modal="true" aria-labelledby="cx-troca-title">
            <button className="cx-troca-x" type="button" aria-label="Fechar" onClick={() => setTrocaOpen(false)}>
              <X size={18} />
            </button>
            <h2 id="cx-troca-title">Produto da troca</h2>
            <p>O aparelho entra no estoque quando a venda for finalizada, pelo preço de entrada. O IMEI fica como rastro.</p>
            <label>
              Produto que está entrando
              <input
                value={trocaQuery}
                onChange={(event) => {
                  setTrocaQuery(event.target.value)
                  setTrocaPick(null)
                }}
                placeholder="Código ou nome"
                autoComplete="off"
                autoFocus
              />
            </label>
            {trocaPick ? (
              <p className="cx-troca-pick"><b>{trocaPick.code || trocaPick.barcode}</b><span>{lojaProductName(trocaPick)}</span></p>
            ) : trocaQuery.trim().length >= 2 ? (
              <ul className="cx-troca-hits">
                {trocaBuscando ? (
                  <li className="cx-troca-status">Buscando...</li>
                ) : trocaHits.length === 0 ? (
                  <li className="cx-troca-status">Nenhum produto encontrado.</li>
                ) : trocaHits.map((product) => (
                  <li key={product.id}>
                    <button type="button" onClick={() => { setTrocaPick(product); setTrocaQuery(produtoRotulo(product.code || product.barcode, lojaProductName(product))) }}>
                      <b>{product.code || product.barcode}</b>
                      <span>{lojaProductName(product)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            <label>
              IMEI
              <input
                value={trocaImei}
                onChange={(event) => setTrocaImei(event.target.value.toUpperCase())}
                placeholder="IMEI do aparelho"
                autoComplete="off"
                spellCheck={false}
              />
            </label>
            <label>
              Preço de entrada
              <input
                value={trocaValor}
                inputMode="decimal"
                placeholder="0,00"
                onChange={(event) => setTrocaValor(event.target.value)}
              />
            </label>
            <div className="pdv-caixa-confirm-actions">
              <button className="pdv-cad-btn" type="button" onClick={() => setTrocaOpen(false)}>Cancelar</button>
              <button className="pdv-cad-btn pdv-cad-btn-green" type="button" onClick={confirmarTroca}>Adicionar troca</button>
            </div>
          </div>
        </div>
      ) : null}

      {productSearchOpen ? (
        <div className="pdv-caixa-confirm">
          <div className="pdv-caixa-confirm-card cx-open-modal cx-open-modal-wide cx-product-search" role="dialog" aria-modal="true" aria-labelledby="cx-product-search-title" onClick={(event) => event.stopPropagation()}>
            <header className="cx-open-head">
              <div>
                <h2 id="cx-product-search-title">Buscar produto</h2>
                <p className="cx-open-sub">Código, referência ou nome</p>
              </div>
              <button className="cx-search-close" type="button" aria-label="Fechar" onClick={() => setProductSearchOpen(false)}>
                <X size={18} />
              </button>
            </header>
            <div className="cx-client-picker-search">
              <Search size={16} aria-hidden="true" />
              <input
                value={pickerQuery}
                onChange={(event) => setPickerQuery(event.target.value)}
                placeholder="Digite o código, referência ou nome..."
                autoComplete="off"
                autoFocus
              />
            </div>
            <div className="cx-product-head" aria-hidden="true">
              <span>Produto</span>
              <span>Outras Lojas</span>
            </div>
            <ul className="cx-client-picker-list cx-product-results">
              {pickerQuery.trim().length < 2 ? (
                <li className="cx-product-empty">Digite ao menos 2 letras para buscar.</li>
              ) : pickerHits.length === 0 ? (
                <li className="cx-product-empty">Nenhum produto encontrado.</li>
              ) : pickerHits.map((product) => (
                <li key={product.id} className="cx-product-row">
                  <button type="button" className="cx-product-hit" onClick={() => addProduct(product)}>
                    <b className="cx-hit-code">{product.code || product.barcode}</b>
                    <strong>{lojaProductName(product)}</strong>
                    <span>{product.reference && product.reference !== "—" ? product.reference : ""}</span>
                    <em>{formatMoneyRs(productSalePrice(product))}</em>
                  </button>
                  <button
                    type="button"
                    className="cx-outras-btn"
                    aria-label={`Outras lojas de ${lojaProductName(product)}`}
                    onClick={() => setEstoqueProduto(product)}
                  >
                    <Plus size={16} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      {estoqueProduto ? (
        <div className="pdv-caixa-confirm cx-stock-layer">
          <div className="cx-stock-card" role="dialog" aria-modal="true" aria-labelledby="cx-stock-title" onClick={(event) => event.stopPropagation()}>
            <header className="cx-stock-head">
              <strong className="cx-stock-code">{estoqueProduto.code || estoqueProduto.barcode}</strong>
              <h2 id="cx-stock-title">
                ESTOQUE DO PRODUTO:
                <span>{lojaProductName(estoqueProduto).toLocaleUpperCase("pt-BR")}</span>
              </h2>
              <button className="cx-stock-tool cx-stock-close" type="button" aria-label="Fechar" onClick={() => setEstoqueProduto(null)}>
                <X size={16} />
              </button>
            </header>
            <table className="cx-stock-table">
              <thead>
                <tr>
                  <th>Loja</th>
                  <th>Estoque</th>
                  <th>Solicitar</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const daApi = (outrasLojas[estoqueProduto.id] || []).find((loja) => loja.id === "geral")
                  const geral = daApi
                    ? daApi.quantity
                    : Math.max(0, Math.floor(Number(estoqueProduto.stockQuantity) || 0))
                  return (
                    <>
                      <tr>
                        <td>ESTOQUE GERAL</td>
                        <td className="cx-stock-num">{geral}</td>
                        <td className="cx-stock-num">-</td>
                      </tr>
                      <tr className="cx-stock-total">
                        <td>Total em Estoque:</td>
                        <td className="cx-stock-num">{geral}</td>
                        <td />
                      </tr>
                    </>
                  )
                })()}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {clientPickerOpen ? (
        <div className="pdv-caixa-confirm">
          <div className="pdv-caixa-confirm-card cx-open-modal cx-client-picker" role="dialog" aria-modal="true" aria-labelledby="cx-picker-title" onClick={(event) => {
            event.stopPropagation()
            clientSearchRef.current?.focus()
          }}>
            <header className="cx-open-head">
              <div>
                <h2 id="cx-picker-title">Selecionar cliente</h2>
                <p className="cx-open-sub">Busque por nome, CPF ou CNPJ</p>
              </div>
              <button className="pdv-cad-icon-btn pdv-gear-close" type="button" aria-label="Fechar" onClick={closeClientPicker}>
                <X size={16} />
              </button>
            </header>
            <div className="cx-client-picker-search">
              <Search size={16} aria-hidden="true" />
              <input
                ref={clientSearchRef}
                value={clientQuery}
                onChange={(event) => setClientQuery(event.target.value.toLocaleUpperCase("pt-BR"))}
                onKeyDown={(event) => {
                  if (event.key === "Enter") event.preventDefault()
                }}
                placeholder="Nome, CPF ou CNPJ..."
                autoComplete="off"
              />
            </div>
            <ul className="cx-client-picker-list">
              <li>
                <button type="button" onClick={() => pickClient("CONSUMIDOR FINAL")}>CONSUMIDOR FINAL</button>
              </li>
              {customers.map((item) => (
                <li key={item.code}>
                  <button type="button" onClick={() => pickClient(item.name)}>
                    <strong>{item.name}</strong>
                    <span>{item.document && item.document !== "—" ? item.document : item.code}</span>
                  </button>
                </li>
              ))}
            </ul>
            <div className="pdv-caixa-confirm-actions">
              <button
                className="pdv-cad-btn pdv-cad-btn-green"
                type="button"
                onClick={() => {
                  setNewName(clientQuery.trim())
                  setNewPhone("")
                  setNewDoc(digitsOnly(clientQuery, 14))
                  setClientPickerOpen(false)
                  setClientModal(true)
                }}
              >
                <Plus size={16} /> Cadastrar novo
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {clientModal ? (
        <div className="pdv-caixa-confirm">
          <div className="pdv-caixa-confirm-card cx-open-modal cx-client-picker" role="dialog" aria-modal="true" aria-labelledby="cx-client-title" onClick={(event) => event.stopPropagation()}>
            <header className="cx-open-head">
              <div>
                <h2 id="cx-client-title">Cadastrar cliente</h2>
                <p className="cx-open-sub">Preencha os dados para usar na venda</p>
              </div>
              <button className="pdv-cad-icon-btn pdv-gear-close" type="button" aria-label="Fechar" onClick={() => setClientModal(false)}>
                <X size={16} />
              </button>
            </header>
            <form className="cx-client-modal-form" onSubmit={saveClient}>
              <label>Nome<input value={newName} onChange={(event) => setNewName(event.target.value.toLocaleUpperCase("pt-BR"))} autoComplete="off" required /></label>
              <label>Telefone<input value={newPhone} inputMode="numeric" onChange={(event) => setNewPhone(digitsOnly(event.target.value, 11))} autoComplete="off" /></label>
              <label>
                CPF ou CNPJ
                <input
                  value={newDoc}
                  inputMode="numeric"
                  onChange={(event) => setNewDoc(digitsOnly(event.target.value, 14))}
                  onBlur={() => {
                    const doc = newDoc.trim()
                    if (doc.length < 11) return
                    api.get("/clients/customers", { params: { ativo: "1", search: doc } })
                      .then(({ data }) => {
                        const hit = ((data.customers || []) as Array<{ name: string; document?: string }>)[0]
                        if (hit?.name) {
                          setNewName(hit.name)
                          flashToast(`Cliente encontrado: ${hit.name}`)
                        }
                      })
                      .catch(() => undefined)
                  }}
                  autoComplete="off"
                />
              </label>
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
        <div className="pdv-caixa-confirm">
          <div className="pdv-caixa-confirm-card cx-open-modal cx-open-modal-wide" role="dialog" aria-modal="true" aria-labelledby="cx-open-title" onClick={(event) => event.stopPropagation()}>
            <header className="cx-open-head">
              <div>
                <h2 id="cx-open-title">Vendas em aberto</h2>
                <p className="cx-open-sub">Clique na venda para abrir no caixa.</p>
              </div>
              <button className="pdv-cad-icon-btn pdv-gear-close" type="button" aria-label="Fechar" onClick={() => setOpenSales(null)}>
                <X size={16} />
              </button>
            </header>
            {openSales.length === 0 ? (
              <p className="cx-open-empty">Nenhuma venda em aberto.</p>
            ) : (
              <ul className="cx-open-list">
                {openSales.map((sale) => (
                  <li
                    key={sale.id}
                    className="cx-open-item is-clickable"
                    onClick={() => void loadSaleToScreen(sale)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault()
                        void loadSaleToScreen(sale)
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
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
                      <button
                        className="pdv-cad-btn pdv-cad-btn-green cx-open-go"
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          void loadSaleToScreen(sale)
                        }}
                      >
                        Abrir no caixa
                      </button>
                      <button
                        className="pdv-cad-btn pdv-cad-btn-red"
                        type="button"
                        disabled={busy}
                        onClick={(event) => {
                          event.stopPropagation()
                          void deleteOpenSale(sale.id, sale.code)
                        }}
                      >
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
              <button className="pdv-cad-btn" type="button" onClick={() => { setPrintSale((current) => current ? { ...current, kind: "nf" } : current); window.setTimeout(() => imprimirRecibo(), 150) }}>
                Imprimir NF
              </button>
              <button className="pdv-cad-btn" type="button" onClick={() => { setPrintSale((current) => current ? { ...current, kind: "recibo" } : current); window.setTimeout(() => imprimirRecibo(), 150) }}>
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

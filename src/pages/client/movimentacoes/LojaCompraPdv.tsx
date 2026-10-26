import { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { FileUp, Info, Plus, Search, Trash2 } from "lucide-react"
import { api, parseError } from "../../../services/api"
import { useClientAuth } from "../../../hooks/clientAuth"
import { CadastroFrame } from "../cadastros/CadastroShell"
import CategorySelect from "../cadastros/produtos/CategorySelect"
import SearchableSelect from "../cadastros/produtos/SearchableSelect"
import { lojaProductName, productSalePrice, type PdvProduct } from "../cadastros/produtos/types"
import { listCatalog } from "../cadastros/catalog/catalogApi"
import { categoryFromCatalog, type ProductCategory } from "../cadastros/produtos/categoryModel"
import { CAIXA_STORAGE_KEY } from "../dashboard/mockData"
import PdvOverlayModal from "../dashboard/PdvOverlayModal"
import { useVerCusto } from "../cadastros/usuarios/useVerCusto"

type Linha = {
  productId: string
  code: string
  name: string
  qty: number
  price: number
  discount: number
  surcharge: number
  saleSuggest: number
  saleCurrent: number
  stock: number
  serials: string[]
  categoryId: string
  category: string
}

type Pendente = {
  product: PdvProduct
  qty: number
  price: number
}

type Meta = {
  invoiceDate: string
  invoiceNumber: string
  notes: string
  userName: string
  caixa: string
  paymentMethod: string
  profitCalc: string
  accessory: boolean
  accessoryValue: number
  anexo: string
}

type Compra = {
  id: string
  code: string
  supplier: string
  status: "aberta" | "concluida" | "estornada"
  lines: Linha[]
  meta?: Partial<Meta>
  total: number
}

function hojeIso() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" })
}

const META_VAZIA: Meta = {
  invoiceDate: hojeIso(),
  invoiceNumber: "",
  notes: "",
  userName: "",
  caixa: "",
  paymentMethod: "",
  profitCalc: "Por Produto",
  accessory: false,
  accessoryValue: 0,
  anexo: "",
}

function reais(value?: number) {
  return (Number(value) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

function formatarMoeda(value?: number) {
  return (Number(value) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function lerCentavos(texto: string) {
  const digits = texto.replace(/\D/g, "").slice(0, 12)
  return Number(digits || "0") / 100
}

function selecionarCaixa(event: { currentTarget: HTMLInputElement | HTMLTextAreaElement }) {
  event.currentTarget.select()
}

function CaixaMoeda({
  value,
  disabled,
  ariaLabel,
  onChange,
}: {
  value: number
  disabled?: boolean
  ariaLabel?: string
  onChange: (valor: number) => void
}) {
  const [texto, setTexto] = useState(formatarMoeda(value))
  const [foco, setFoco] = useState(false)
  useEffect(() => {
    if (!foco) setTexto(formatarMoeda(value))
  }, [value, foco])
  return (
    <span className="pdv-compra-reais">
      <span aria-hidden="true">R$</span>
      <input
        inputMode="numeric"
        value={foco ? texto : formatarMoeda(value)}
        disabled={disabled}
        aria-label={ariaLabel}
        autoComplete="off"
        onFocus={(event) => {
          setFoco(true)
          setTexto(formatarMoeda(value))
          event.currentTarget.select()
        }}
        onMouseUp={(event) => event.preventDefault()}
        onChange={(event) => {
          const valor = lerCentavos(event.target.value)
          const shown = formatarMoeda(valor)
          setTexto(shown)
          onChange(valor)
          const input = event.target
          requestAnimationFrame(() => {
            const end = shown.length
            input.setSelectionRange(end, end)
          })
        }}
        onBlur={() => {
          setFoco(false)
          onChange(lerCentavos(texto))
        }}
      />
    </span>
  )
}

function subtotal(linha: Linha) {
  const bruto = linha.qty * linha.price - linha.discount + linha.surcharge
  return Math.max(0, Math.round(bruto * 100) / 100)
}

function custoLoja(produto: PdvProduct) {
  return Number(produto.lojaCostPrice) || Number(produto.costPrice) || 0
}

function vendaLoja(produto: PdvProduct) {
  const loja = Number(produto.lojaSalePrice)
  if (produto.lojaSalePrice != null && Number.isFinite(loja) && loja > 0) return loja
  return productSalePrice(produto)
}

function margemPct(compra: number, venda: number) {
  if (compra <= 0) return venda > 0 ? 100 : null
  return ((venda - compra) / compra) * 100
}

function tag(root: Document | Element, name: string) {
  return root.getElementsByTagNameNS("*", name)[0]?.textContent?.trim() || ""
}

function linhaDe(produto: PdvProduct): Linha {
  return {
    productId: produto.id,
    code: produto.code || "",
    name: lojaProductName(produto),
    qty: 1,
    price: custoLoja(produto),
    discount: 0,
    surcharge: 0,
    saleSuggest: vendaLoja(produto),
    saleCurrent: productSalePrice(produto),
    stock: Number(produto.lojaStock ?? produto.stockQuantity) || 0,
    serials: [],
    categoryId: produto.categoryId || "",
    category: produto.category || "",
  }
}

function semCategoria(categoryId: string, category: string) {
  const id = categoryId.trim()
  const name = category.trim()
  if (!id && !name) return true
  const limpo = name.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase()
  return limpo === "sem categoria" || limpo === "-" || limpo === "—"
}

function serialObrigatorio(flags: ProductCategory[], categoryId: string, category: string) {
  if (semCategoria(categoryId, category)) return true
  const id = categoryId.trim()
  const name = category.trim().toLowerCase()
  const row = flags.find((item) => item.id === id || item.name.trim().toLowerCase() === name || String(item.code) === id)
  return row ? row.requireSerial : true
}

function imeiLimpo(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, "")
}

function serialIncompleto(linha: Linha, flags: ProductCategory[]) {
  if (!serialObrigatorio(flags, linha.categoryId, linha.category)) return false
  for (let index = 0; index < linha.qty; index += 1) {
    if (imeiLimpo(linha.serials[index] || "").length < 8) return true
  }
  return false
}

export function NovaCompra() {
  const verCusto = useVerCusto()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const id = params.get("id") || ""
  const { client } = useClientAuth()
  const [compra, setCompra] = useState<Compra | null>(null)
  const [linhas, setLinhas] = useState<Linha[]>([])
  const [meta, setMeta] = useState<Meta>(META_VAZIA)
  const [nome, setNome] = useState("")
  const [categoria, setCategoria] = useState("")
  const [categorias, setCategorias] = useState<Array<{ id: string; name: string }>>([])
  const [formasPagamento, setFormasPagamento] = useState<string[]>([])
  const [flagsSerial, setFlagsSerial] = useState<ProductCategory[]>([])
  const [achados, setAchados] = useState<PdvProduct[]>([])
  const [pendentes, setPendentes] = useState<Pendente[]>([])
  const [buscando, setBuscando] = useState(false)
  const [buscou, setBuscou] = useState(false)
  const [falta, setFalta] = useState("")
  const [aviso, setAviso] = useState("")
  const [imeiAlvo, setImeiAlvo] = useState("")
  const [imeiErro, setImeiErro] = useState("")
  const [busy, setBusy] = useState(false)
  const xmlRef = useRef<HTMLInputElement>(null)
  const buscaRef = useRef<HTMLInputElement>(null)
  const buscaGeracao = useRef(0)
  const enterPendente = useRef(false)
  const pronto = useRef(false)
  const nomeRef = useRef("")
  const snap = useRef({ id: "", supplier: "", linhas, meta, aberta: false })
  nomeRef.current = client?.name || ""
  const opcoesCategoria = useMemo(
    () => [
      { id: "__uncategorized__", label: "Sem categoria", depth: 0 },
      ...categorias
        .filter((item) => !/sem\s*categoria/i.test(item.name.normalize("NFD").replace(/\p{M}/gu, "")))
        .map((item) => ({ id: item.id, label: item.name, depth: 0 })),
    ],
    [categorias],
  )

  snap.current = {
    id,
    supplier: compra?.supplier || "",
    linhas,
    meta,
    aberta: compra?.status === "aberta",
  }

  useEffect(() => {
    if (!id) {
      navigate("/client/movimentacoes/compras", { replace: true })
      return
    }
    let vivo = true
    pronto.current = false
    api
      .get(`/clients/compras/${id}`)
      .then(({ data }) => {
        if (!vivo) return
        const atual = data?.compra as Compra
        const caixaSalva = typeof sessionStorage === "undefined" ? "" : sessionStorage.getItem(CAIXA_STORAGE_KEY) || ""
        setAviso("")
        setCompra(atual)
        setLinhas((atual.lines || []).map((linha) => ({
          productId: String(linha.productId || ""),
          code: linha.code || "",
          name: linha.name || "",
          qty: Number(linha.qty) || 1,
          price: Number(linha.price) || 0,
          discount: Number(linha.discount) || 0,
          surcharge: Number(linha.surcharge) || 0,
          saleSuggest: Number(linha.saleSuggest) || 0,
          saleCurrent: Number(linha.saleCurrent) || 0,
          stock: Number(linha.stock) || 0,
          serials: Array.isArray(linha.serials) ? linha.serials.map((item) => String(item || "")) : [],
          categoryId: linha.categoryId || "",
          category: linha.category || "",
        })))
        setMeta({
          ...META_VAZIA,
          ...atual.meta,
          invoiceDate: atual.meta?.invoiceDate || hojeIso(),
          userName: atual.meta?.userName || nomeRef.current,
          caixa: atual.meta?.caixa || caixaSalva,
          accessory: atual.meta?.accessory === true,
          accessoryValue: Number(atual.meta?.accessoryValue) || 0,
        })
        pronto.current = atual.status === "aberta"
      })
      .catch(() => {
        if (vivo) setAviso("Não foi possível abrir esta compra.")
      })
    api.get("/clients/products/categories").then(({ data }) => {
      if (vivo) setCategorias((data?.categories || []) as Array<{ id: string; name: string }>)
    }).catch(() => {
      if (vivo) setCategorias([])
    })
    listCatalog("payment", true).then((itens) => {
      if (vivo) setFormasPagamento(itens.map((item) => item.name).filter(Boolean))
    }).catch(() => {
      if (vivo) setFormasPagamento([])
    })
    listCatalog("product_category", true).then((itens) => {
      if (vivo) setFlagsSerial(itens.map(categoryFromCatalog))
    }).catch(() => {
      if (vivo) setFlagsSerial([])
    })
    return () => {
      vivo = false
    }
  }, [id, navigate])

  useEffect(() => {
    if (!client?.name) return
    setMeta((atual) => atual.userName ? atual : { ...atual, userName: client.name })
  }, [client?.name])

  useEffect(() => {
    return () => {
      const atual = snap.current
      if (!pronto.current || !atual.aberta || !atual.id) return
      void api.put(`/clients/compras/${atual.id}`, {
        supplier: atual.supplier,
        lines: atual.linhas,
        meta: atual.meta,
      })
    }
  }, [])

  function mudarLinha(productId: string, patch: Partial<Linha>) {
    setLinhas((atual) => atual.map((item) => item.productId === productId ? { ...item, ...patch } : item))
  }

  function mudarImei(productId: string, index: number, valor: string) {
    const imei = valor.toUpperCase().replace(/\s+/g, "")
    setLinhas((atual) => atual.map((item) => {
      if (item.productId !== productId) return item
      const serials = item.serials.slice()
      serials[index] = imei
      return { ...item, serials }
    }))
  }

  function produtoPendente(produto: PdvProduct): Pendente {
    return { product: produto, qty: 1, price: custoLoja(produto) }
  }

  function separarTodos(lista: PdvProduct[]) {
    const q = nome.trim()
    const naNota = new Set(snap.current.linhas.map((linha) => linha.productId))
    const novos = lista.filter((produto) => !naNota.has(produto.id))
    setPendentes(novos.map(produtoPendente))
    setAchados([])
    setBuscou(true)
    if (!lista.length) {
      setFalta(q ? `Esse produto não está no cadastro: ${q}` : "Nenhum produto encontrado no cadastro.")
    } else if (!novos.length) {
      setFalta("Esses produtos já estão na nota.")
    } else {
      setFalta("")
    }
    setNome("")
    enterPendente.current = false
    window.setTimeout(() => buscaRef.current?.focus(), 0)
  }

  function mudarTopo(produto: PdvProduct, patch: Partial<Pick<Pendente, "qty" | "price">>) {
    setPendentes((atual) => {
      const ja = atual.find((item) => item.product.id === produto.id)
      if (ja) return atual.map((item) => item.product.id === produto.id ? { ...item, ...patch } : item)
      return [...atual, { ...produtoPendente(produto), ...patch }]
    })
  }

  function incluir(item: Pendente) {
    setLinhas((atual) => {
      const ja = atual.find((linha) => linha.productId === item.product.id)
      if (ja) {
        return atual.map((linha) => linha.productId === item.product.id
          ? { ...linha, qty: linha.qty + Math.max(1, item.qty), price: item.price || linha.price }
          : linha)
      }
      return [...atual, { ...linhaDe(item.product), qty: Math.max(1, item.qty), price: item.price }]
    })
    setPendentes((atual) => atual.filter((pendente) => pendente.product.id !== item.product.id))
    window.setTimeout(() => buscaRef.current?.focus(), 0)
  }

  useEffect(() => {
    if (compra && compra.status !== "aberta") return
    buscaRef.current?.focus()
  }, [compra, id])

  useEffect(() => {
    const q = nome.trim()
    if (!q && !categoria) {
      buscaGeracao.current += 1
      enterPendente.current = false
      setAchados([])
      setBuscou(false)
      setBuscando(false)
      return
    }
    if (q.length === 1) {
      buscaGeracao.current += 1
      setAchados([])
      setBuscou(false)
      setBuscando(false)
      return
    }
    const geracao = ++buscaGeracao.current
    setBuscando(true)
    setBuscou(false)
    const espera = window.setTimeout(() => {
      void api
        .get("/clients/products", {
          params: {
            page: "1",
            limit: "200",
            wide: "1",
            light: "1",
            order: "name",
            search: q || undefined,
            categoryId: (q && categoria === "__uncategorized__" ? "" : categoria).trim() || undefined,
            ativo: "1",
          },
        })
        .then(({ data }) => {
          if (geracao !== buscaGeracao.current) return
          const lista = (data?.products || []) as PdvProduct[]
          if (enterPendente.current) {
            separarTodos(lista)
            return
          }
          const naNotaAgora = new Set(snap.current.linhas.map((linha) => linha.productId))
          setPendentes(lista.filter((produto) => !naNotaAgora.has(produto.id)).map(produtoPendente))
          setAchados(lista)
          setBuscou(true)
          setFalta(lista.length ? "" : q ? `Esse produto não está no cadastro: ${q}` : "Nenhum produto encontrado no cadastro.")
        })
        .catch(() => {
          if (geracao !== buscaGeracao.current) return
          setAchados([])
          setAviso("Não foi possível buscar o produto.")
        })
        .finally(() => {
          if (geracao === buscaGeracao.current) setBuscando(false)
        })
    }, 80)
    return () => window.clearTimeout(espera)
  }, [nome, categoria])

  async function gravar() {
    if (!id || compra?.status !== "aberta") return
    await api.put(`/clients/compras/${id}`, { supplier: compra.supplier, lines: linhas, meta })
  }

  async function sair() {
    setBusy(true)
    try {
      await gravar()
    } catch (err) {
      setAviso(parseError(err).friend || "Não foi possível guardar a compra.")
      setBusy(false)
      return
    }
    pronto.current = false
    navigate("/client/movimentacoes/compras?faixa=abertas")
  }

  async function finalizar() {
    if (!linhas.length) {
      setAviso("Inclua um produto.")
      return
    }
    const semImei = linhas.find((linha) => serialIncompleto(linha, flagsSerial))
    if (semImei) {
      setImeiErro("")
      setImeiAlvo(semImei.productId)
      return
    }
    const vistos = new Set<string>()
    for (const linha of linhas) {
      if (!serialObrigatorio(flagsSerial, linha.categoryId, linha.category)) continue
      for (let index = 0; index < linha.qty; index += 1) {
        const imei = imeiLimpo(linha.serials[index] || "")
        if (vistos.has(imei)) {
          setAviso(`O IMEI ${imei} foi informado duas vezes.`)
          return
        }
        vistos.add(imei)
      }
    }
    setBusy(true)
    setAviso("")
    try {
      await api.post(`/clients/compras/${id}/finalizar`, { lines: linhas, meta })
      pronto.current = false
      navigate("/client/movimentacoes/compras?faixa=concluidas")
    } catch (err) {
      setAviso(parseError(err).friend || "Não foi possível finalizar a compra.")
      setBusy(false)
    }
  }

  async function vincularXml(arquivo: File) {
    const texto = await arquivo.text()
    const xml = new DOMParser().parseFromString(texto, "application/xml")
    if (xml.querySelector("parsererror")) {
      setAviso("Esse arquivo não é um XML de nota.")
      return
    }
    const detalhes = [...xml.getElementsByTagNameNS("*", "det")]
    const ide = xml.getElementsByTagNameNS("*", "ide")[0]
    const numero = ide ? tag(ide, "nNF") : ""
    const data = ide ? tag(ide, "dhEmi").slice(0, 10) : ""
    setMeta((atual) => ({ ...atual, invoiceNumber: numero || atual.invoiceNumber, invoiceDate: data || atual.invoiceDate }))
    const faltou: string[] = []
    let proximas = [...snap.current.linhas]
    for (const detalhe of detalhes) {
      const prod = detalhe.getElementsByTagNameNS("*", "prod")[0]
      if (!prod) continue
      const code = tag(prod, "cProd")
      const name = tag(prod, "xProd")
      const qty = Math.max(1, Number(tag(prod, "qCom").replace(",", ".")) || 1)
      const price = Number(tag(prod, "vUnCom").replace(",", ".")) || 0
      if (!code) {
        faltou.push(name || "item sem código")
        continue
      }
      try {
        const { data } = await api.get("/clients/products", { params: { codProduto: code, page: "1", limit: "5", exactCodes: "1" } })
        const produto = ((data?.products || []) as PdvProduct[]).find((item) => item.code === code)
        if (!produto) {
          faltou.push(name || code)
          continue
        }
        const ja = proximas.find((item) => item.productId === produto.id)
        proximas = ja
          ? proximas.map((item) => item.productId === produto.id ? { ...item, qty: item.qty + qty, price: price || item.price } : item)
          : [...proximas, { ...linhaDe(produto), qty, price: price || linhaDe(produto).price }]
      } catch {
        faltou.push(name || code)
      }
    }
    setLinhas(proximas)
    setAviso(faltou.length ? `XML lido. Sem cadastro: ${faltou.join(", ")}` : "XML vinculado nesta compra.")
  }

  const naNota = new Set(linhas.map((linha) => linha.productId))
  const topo = pendentes.filter((item) => !naNota.has(item.product.id))
  const qtd = linhas.reduce((soma, linha) => soma + linha.qty, 0)
  const desconto = linhas.reduce((soma, linha) => soma + linha.discount, 0)
  const acrescimo = linhas.reduce((soma, linha) => soma + linha.surcharge, 0)
  const total = linhas.reduce((soma, linha) => soma + subtotal(linha), 0)
  const travada = compra?.status !== "aberta"
  const linhaImei = linhas.find((linha) => linha.productId === imeiAlvo) || null

  useEffect(() => {
    if (!imeiErro) return
    document.querySelector<HTMLInputElement>(".pdv-imei-pop-campo.is-bad")?.focus()
  }, [imeiErro])

  function fecharImei() {
    setImeiAlvo("")
    setImeiErro("")
  }

  function confirmarImei() {
    if (!linhaImei) {
      fecharImei()
      return
    }
    const serials = Array.from({ length: linhaImei.qty }, (_, index) => imeiLimpo(linhaImei.serials[index] || ""))
    if (serials.some((imei) => imei.length < 8)) {
      setImeiErro("Digite pelo menos 8 caracteres.")
      return
    }
    const vistos = new Set<string>()
    for (const imei of serials) {
      if (vistos.has(imei)) {
        setImeiErro(`O IMEI ${imei} foi informado duas vezes.`)
        return
      }
      vistos.add(imei)
    }
    fecharImei()
  }

  return (
    <CadastroFrame>
      <section className="pdv-cad-page pdv-cli-page pdv-compra-pdv" aria-labelledby="pdv-nova-compra-title">
        <div className="pdv-cad-sheet pdv-compra-sheet">
          <header className="pdv-compra-head">
            <button type="button" className="pdv-cad-btn pdv-cad-btn-back pdv-voltar" disabled={busy} onClick={() => void sair()}>
              Voltar
            </button>
            <div className="pdv-compra-titles">
              <h1 id="pdv-nova-compra-title">CÓDIGO DA COMPRA: {compra?.code || "—"}</h1>
              <p>FORNECEDOR: {compra?.supplier ? compra.supplier.trim().toLocaleUpperCase("pt-BR") : "—"}</p>
            </div>
            <div className="pdv-compra-head-actions">
              <button type="button" className="pdv-cad-btn" disabled={travada} onClick={() => xmlRef.current?.click()}>
                <FileUp size={16} aria-hidden="true" />
                Vincular XML
              </button>
              <input
                ref={xmlRef}
                className="pdv-compra-file"
                type="file"
                accept=".xml,text/xml,application/xml"
                onChange={(event) => {
                  const arquivo = event.target.files?.[0]
                  if (arquivo) void vincularXml(arquivo)
                  event.target.value = ""
                }}
              />
            </div>
          </header>

          <div className="pdv-compra-quadro">
            <div className="pdv-compra-search">
            <div className="pdv-compra-search-bar">
              <Search size={16} aria-hidden="true" />
              <input
                ref={buscaRef}
                value={nome}
                onChange={(event) => {
                  setFalta("")
                  setNome(event.target.value)
                }}
                placeholder="Digite o código ou o nome do produto"
                autoComplete="off"
                aria-label="Código ou nome do produto"
                disabled={travada}
                onKeyDown={(event) => {
                  if (event.key !== "Enter") return
                  event.preventDefault()
                  if (travada) return
                  if (buscando) {
                    enterPendente.current = true
                    return
                  }
                  if (nome.trim() || categoria) separarTodos(achados)
                }}
              />
              <CategorySelect
                selected={categoria ? [categoria] : []}
                onChange={(next) => setCategoria(next[0] || "")}
                options={opcoesCategoria}
                placeholder="Todas"
                disabled={travada}
              />
            </div>
            </div>
            {falta ? <p className="pdv-compra-falta" role="status">{falta}</p> : null}

            <div className="pdv-compra-topo">
              <div className="pdv-cad-table-wrap">
                <table className="pdv-cad-table pdv-compra-tabela pdv-compra-tabela-topo">
                  <colgroup>
                    <col className="pdv-col-cod" />
                    <col className="pdv-col-nome" />
                    {verCusto ? <col className="pdv-col-money" /> : null}
                    <col className="pdv-col-qtd" />
                    <col className="pdv-col-money" />
                    <col className="pdv-col-acao" />
                  </colgroup>
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Nome</th>
                      {verCusto ? <th className="pdv-compra-mid">Preço de custo</th> : null}
                      <th className="pdv-compra-mid">Quantidade</th>
                      <th className="pdv-compra-mid">Valor de compra</th>
                      <th className="pdv-compra-mid">Incluir</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topo.map((item) => {
                      const nome = lojaProductName(item.product)
                      return (
                        <tr key={item.product.id}>
                          <td>{item.product.code || ""}</td>
                          <td className="pdv-compra-nome-cell">{nome}</td>
                          {verCusto ? (
                            <td className="pdv-compra-money">
                              <span className="pdv-compra-valor">
                                <span>R$</span>
                                <b>{formatarMoeda(custoLoja(item.product))}</b>
                              </span>
                            </td>
                          ) : null}
                          <td className="pdv-compra-mid">
                            <input
                              className="pdv-compra-num"
                              onFocus={selecionarCaixa}
                              onMouseUp={(event) => event.preventDefault()}
                              type="number"
                              min={1}
                              value={item.qty}
                              disabled={travada}
                              aria-label={`Quantidade de ${nome}`}
                              onChange={(event) => mudarTopo(item.product, { qty: Math.max(1, Number(event.target.value) || 1) })}
                            />
                          </td>
                          <td className="pdv-compra-mid">
                            <CaixaMoeda
                              value={item.price}
                              disabled={travada}
                              ariaLabel={`Valor de compra de ${nome}`}
                              onChange={(price) => mudarTopo(item.product, { price })}
                            />
                          </td>
                          <td className="pdv-compra-mid">
                            <button
                              type="button"
                              className="pdv-compra-plus"
                              disabled={travada}
                              aria-label={`Incluir ${nome} na nota`}
                              onClick={() => incluir(item)}
                            >
                              <Plus size={16} aria-hidden="true" />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="pdv-compra-extra">
              <label>
                Data da nota
                <input type="date" value={meta.invoiceDate} disabled={travada} onChange={(event) => setMeta({ ...meta, invoiceDate: event.target.value })} />
              </label>
              <label>
                Número da nota
                <input value={meta.invoiceNumber} disabled={travada} onChange={(event) => setMeta({ ...meta, invoiceNumber: event.target.value })} autoComplete="off" />
              </label>
            </div>

            <div className="pdv-compra-nota">
              <div className="pdv-cad-table-wrap">
                <table className="pdv-cad-table pdv-compra-tabela pdv-compra-tabela-nota">
                  <colgroup>
                    <col className="pdv-col-cod" />
                    <col className="pdv-col-nome" />
                    <col className="pdv-col-qtd" />
                    <col className="pdv-col-money" />
                    <col className="pdv-col-qtd" />
                    <col className="pdv-col-money" />
                    <col className="pdv-col-money" />
                    <col className="pdv-col-ml" />
                    <col className="pdv-col-money" />
                    <col className="pdv-col-acao" />
                  </colgroup>
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Nome</th>
                      <th className="pdv-compra-mid">Estoque atual</th>
                      <th className="pdv-compra-mid">Valor de compra</th>
                      <th className="pdv-compra-mid">Quantidade</th>
                      <th className="pdv-compra-mid">Desconto</th>
                      <th className="pdv-compra-mid">Acréscimo</th>
                      <th className="pdv-compra-mid">Valor de venda sugerido</th>
                      <th className="pdv-compra-mid">Subtotal</th>
                      <th className="pdv-compra-mid">Excluir</th>
                    </tr>
                  </thead>
                  <tbody>
                    {linhas.map((linha) => {
                      const margem = linha.saleSuggest > 0 ? margemPct(linha.price, linha.saleSuggest) : null
                      const prejuizo = margem != null && linha.price > linha.saleSuggest
                      return (
                        <tr key={linha.productId}>
                          <td>{linha.code}</td>
                          <td className="pdv-compra-nome-cell">
                            <span>{linha.name}</span>
                            {serialObrigatorio(flagsSerial, linha.categoryId, linha.category) ? (
                              <div className="pdv-compra-imeis">
                                {Array.from({ length: linha.qty }, (_, index) => (
                                  <input
                                    key={`${linha.productId}-${index}`}
                                    className="pdv-compra-imei"
                                    value={linha.serials[index] || ""}
                                    placeholder="IMEI/SERIAL"
                                    aria-label={`IMEI ou serial de ${linha.name}`}
                                    maxLength={20}
                                    autoComplete="off"
                                    spellCheck={false}
                                    disabled={travada}
                                    onChange={(event) => mudarImei(linha.productId, index, event.target.value)}
                                  />
                                ))}
                              </div>
                            ) : null}
                          </td>
                          <td className="pdv-compra-mid">{linha.stock}</td>
                          <td className="pdv-compra-mid">
                            <CaixaMoeda
                              value={linha.price}
                              disabled={travada}
                              ariaLabel={`Valor de compra de ${linha.name}`}
                              onChange={(price) => mudarLinha(linha.productId, { price })}
                            />
                          </td>
                          <td className="pdv-compra-mid">
                            <input
                              className="pdv-compra-num"
                              onFocus={selecionarCaixa}
                              onMouseUp={(event) => event.preventDefault()}
                              type="number"
                              min={1}
                              value={linha.qty}
                              disabled={travada}
                              onChange={(event) => mudarLinha(linha.productId, { qty: Math.max(1, Number(event.target.value) || 1) })}
                            />
                          </td>
                          <td className="pdv-compra-mid">
                            <CaixaMoeda
                              value={linha.discount}
                              disabled={travada}
                              ariaLabel={`Desconto de ${linha.name}`}
                              onChange={(discount) => mudarLinha(linha.productId, { discount })}
                            />
                          </td>
                          <td className="pdv-compra-mid">
                            <CaixaMoeda
                              value={linha.surcharge}
                              disabled={travada}
                              ariaLabel={`Acréscimo de ${linha.name}`}
                              onChange={(surcharge) => mudarLinha(linha.productId, { surcharge })}
                            />
                          </td>
                          <td className="pdv-compra-mid">
                            <div className="pdv-compra-ml">
                              <CaixaMoeda
                                value={linha.saleSuggest}
                                disabled={travada}
                                ariaLabel={`Valor de venda sugerido de ${linha.name}`}
                                onChange={(saleSuggest) => mudarLinha(linha.productId, { saleSuggest })}
                              />
                              {margem == null ? null : (
                                <span className={`pdv-compra-ml-tag${prejuizo ? " is-bad" : ""}`}>
                                  ML: {margem.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="pdv-compra-money">
                            <span className="pdv-compra-valor">
                              <span>R$</span>
                              <b>{formatarMoeda(subtotal(linha))}</b>
                            </span>
                          </td>
                          <td className="pdv-compra-mid">
                            <button
                              type="button"
                              className="pdv-cad-icon-btn pdv-compra-excluir"
                              disabled={travada}
                              aria-label={`Excluir ${linha.name}`}
                              onClick={() => setLinhas((atual) => atual.filter((item) => item.productId !== linha.productId))}
                            >
                              <Trash2 size={16} aria-hidden="true" />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <PdvOverlayModal
              open={Boolean(aviso)}
              title="Aviso"
              size="support"
              icon={<Info size={18} />}
              onClose={() => setAviso("")}
              footer={
                <button className="pdv-logo-save" type="button" onClick={() => setAviso("")}>
                  Ok
                </button>
              }
            >
              <p className="pdv-logo-hint">{aviso}</p>
            </PdvOverlayModal>

            <PdvOverlayModal
              open={Boolean(linhaImei)}
              title="IMEI/SERIAL"
              size="support"
              icon={<Info size={18} />}
              onClose={fecharImei}
              footer={
                <button className="pdv-logo-save" type="button" onClick={confirmarImei}>
                  Ok
                </button>
              }
            >
              {linhaImei ? (
                <div className="pdv-imei-pop">
                  <p className="pdv-imei-pop-prod">
                    <b>{linhaImei.code}</b>
                    <span>{linhaImei.name}</span>
                  </p>
                  <p className="pdv-imei-pop-dica">
                    {linhaImei.qty > 1 ? "Preencha um IMEI/serial para cada unidade." : "Preencha o IMEI/serial desta unidade."}
                  </p>
                  <div className="pdv-imei-pop-campos">
                    {Array.from({ length: linhaImei.qty }, (_, index) => {
                      const vazio = imeiLimpo(linhaImei.serials[index] || "").length < 8
                      const primeiro = linhaImei.serials.findIndex((valor) => imeiLimpo(valor || "").length < 8)
                      return (
                        <label className="pdv-imei-pop-linha" key={`${linhaImei.productId}-pop-${index}`}>
                          {linhaImei.qty > 1 ? <span>{index + 1}</span> : null}
                          <input
                            className={`pdv-imei-pop-campo${imeiErro && vazio ? " is-bad" : ""}`}
                            value={linhaImei.serials[index] || ""}
                            placeholder="IMEI/SERIAL"
                            aria-label={`IMEI ou serial ${index + 1} de ${linhaImei.name}`}
                            maxLength={20}
                            autoComplete="off"
                            spellCheck={false}
                            data-pdv-modal-initial={index === (primeiro < 0 ? 0 : primeiro) ? "" : undefined}
                            onChange={(event) => {
                              setImeiErro("")
                              mudarImei(linhaImei.productId, index, event.target.value)
                            }}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault()
                                confirmarImei()
                              }
                            }}
                          />
                        </label>
                      )
                    })}
                  </div>
                  {imeiErro ? <p className="pdv-imei-pop-erro">{imeiErro}</p> : null}
                </div>
              ) : null}
            </PdvOverlayModal>

            <label className="pdv-compra-obs">
              Observação
              <textarea value={meta.notes} disabled={travada} onChange={(event) => setMeta({ ...meta, notes: event.target.value })} rows={2} />
            </label>
          </div>

          <footer className="pdv-compra-foot">
            <div className="pdv-compra-foot-stats">
              <p><span>Itens</span><b>{qtd}</b></p>
              <p><span>Desconto</span><b>{reais(desconto)}</b></p>
              <p className="pdv-compra-total"><span>Total</span><b>{reais(total)}</b></p>
            </div>
            <label className="pdv-compra-foot-pay" id="pdv-compra-pay-label">
              Forma de pagamento
              <SearchableSelect
                value={meta.paymentMethod}
                onChange={(paymentMethod) => setMeta({ ...meta, paymentMethod })}
                options={
                  meta.paymentMethod && !formasPagamento.includes(meta.paymentMethod)
                    ? [...formasPagamento, meta.paymentMethod]
                    : formasPagamento
                }
                emptyLabel="Selecione"
                labelledBy="pdv-compra-pay-label"
                disabled={travada || !compra}
              />
            </label>
            <div className="pdv-compra-foot-acao">
              {!compra ? (
                <p className="pdv-compra-foot-msg" role="status">Carregando...</p>
              ) : travada ? (
                <p className="pdv-compra-foot-msg" role="status">
                  {compra.status === "estornada" ? "Esta compra já foi estornada." : "Esta compra já foi concluída."}
                </p>
              ) : (
                <button className="pdv-cad-btn pdv-cad-btn-green" type="button" disabled={busy} onClick={() => void finalizar()}>
                  {busy ? "Salvando..." : "Finalizar compra"}
                </button>
              )}
            </div>
          </footer>
        </div>
      </section>
    </CadastroFrame>
  )
}

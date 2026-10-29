import { useEffect, useRef, useState } from "react"
import { useLocation } from "react-router-dom"
import { Search, X } from "lucide-react"
import FilterPage, { type FilterPageProps } from "../pdv/FilterPage"
import { VendasRelatorio } from "../movimentacoes/LojaVendasPainel"
import { BuscarImei } from "../movimentacoes/BuscarImei"
import { RelatorioItensVenda } from "./RelatorioItensVenda"
import { lancamentoDaLoja, listCatalog } from "../cadastros/catalog/catalogApi"
import DreGerencial from "../../gestor/DreGerencial"
import { api, parseError } from "../../../services/api"
import { usePdvSession } from "../dashboard/PdvShell"
import { useVerCusto } from "../cadastros/usuarios/useVerCusto"
import { formatMoneyRs, lojaProductName, type PdvProduct } from "../cadastros/produtos/types"

function brl(value: string) {
  const clean = value.trim().replace(/[R$\s]/g, "")
  if (!clean) return "—"
  const normalized = clean.includes(",") ? clean.replace(/\./g, "").replace(",", ".") : clean
  const number = Number(normalized)
  if (!Number.isFinite(number)) return value
  return number.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

function LancamentosRelatorio({ title, tipo }: { title: string; tipo: "despesa" | "receita" }) {
  const { storeId } = usePdvSession()
  const [rows, setRows] = useState<string[][]>([])
  const [hint, setHint] = useState("Carregando...")
  useEffect(() => {
    listCatalog("expense")
      .then((items) => {
        const filtered = items
          .filter((item) => String(item.payload.tipo || "despesa") === tipo)
          .filter((item) => lancamentoDaLoja(item, undefined, storeId))
        setRows(filtered.map((item) => [
          item.name,
          String(item.payload.data || "—"),
          String(item.payload.caixa || "—"),
          brl(String(item.payload.total || "")),
        ]))
        setHint(filtered.length ? "" : tipo === "despesa" ? "Nenhuma despesa lançada." : "Nenhuma receita lançada.")
      })
      .catch(() => setHint("Não foi possível carregar."))
  }, [tipo, storeId])
  return (
    <FilterPage
      title={title}
      fields={[{ key: "inicio", label: "Data inicio", kind: "date" }]}
      columns={["Descrição", "Data", "Caixa", "Valor"]}
      rows={rows}
      hint={hint || undefined}
    />
  )
}

type MovimentoEstoque = {
  at: string
  product: string
  kind: string
  qty: number
  who: string
  detail: string
  loja?: string
  code?: string
  name?: string
  before?: number | null
  after?: number | null
  origem?: "venda" | "compra" | "transferencia"
  docId?: string
  docCode?: string
  clientId?: string
  user?: string
  category?: string
}

function mesAtualAuditoria() {
  const hoje = new Date()
  const iso = (data: Date) => {
    const mes = String(data.getMonth() + 1).padStart(2, "0")
    const dia = String(data.getDate()).padStart(2, "0")
    return `${data.getFullYear()}-${mes}-${dia}`
  }
  return {
    inicio: iso(new Date(hoje.getFullYear(), hoje.getMonth(), 1)),
    fim: iso(new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)),
    codigo: "",
    nome: "",
    categoria: "Todas",
    movimento: "Todos",
  }
}

const MOVIMENTOS_AUDITORIA = ["Todos", "Venda", "Compra", "Transferência", "Estorno", "Ajuste manual"]
const COLUNAS_AUDITORIA = ["Data", "Origem", "Visualizar", "Código", "Produto", "Estoque antigo", "Movimentou", "Estoque novo", "O que aconteceu", "Loja", "Usuário"]

function estoqueTexto(value: number | null | undefined) {
  if (value == null || Number.isNaN(Number(value))) return "—"
  return Number(value).toLocaleString("pt-BR", { maximumFractionDigits: 2 })
}

function movimentoTexto(value: number) {
  const texto = Math.abs(value).toLocaleString("pt-BR", { maximumFractionDigits: 2 })
  if (value > 0) return `+${texto}`
  if (value < 0) return `-${texto}`
  return texto
}

function diaDoMovimento(at: string) {
  const data = new Date(at)
  if (!at || Number.isNaN(data.getTime())) return ""
  const mes = String(data.getMonth() + 1).padStart(2, "0")
  const dia = String(data.getDate()).padStart(2, "0")
  return `${data.getFullYear()}-${mes}-${dia}`
}

type LinhaVista = { code: string; name: string; qty: number; price: number; total: number; extra?: string }

type DocAuditoria = {
  titulo: string
  tituloEstorno: string
  abertura: string
  atualizou: string
  campos: Array<[string, string]>
  linhas: LinhaVista[]
  total: number
}

type VistaDoc = {
  titulo: string
  abertura: string
  atualizou: string
  campos: Array<[string, string]>
  linhas: LinhaVista[]
  total: number
  erro?: string
}

function quandoVista(value?: string | null) {
  if (!value) return "—"
  const data = new Date(value)
  if (Number.isNaN(data.getTime())) return "—"
  return data.toLocaleString("pt-BR")
}

function VistaMovimento({ vista, onClose }: { vista: VistaDoc; onClose: () => void }) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])
  const qtd = vista.linhas.reduce((soma, line) => soma + line.qty, 0)
  return (
    <div className="pdv-aud-vista-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) event.preventDefault() }}>
      <div className="pdv-aud-vista" role="dialog" aria-modal="true" aria-labelledby="aud-vista-titulo" onMouseDown={(event) => event.stopPropagation()}>
        <header className="pdv-aud-vista-head">
          <div>
            <h2 id="aud-vista-titulo">Visualizar</h2>
            {vista.titulo ? <p className="pdv-aud-vista-doc">{vista.titulo}</p> : null}
            {vista.abertura !== "—" || vista.atualizou !== "—" ? (
              <p>
                {vista.abertura !== "—" ? `Abertura ${vista.abertura}` : ""}
                {vista.abertura !== "—" && vista.atualizou !== "—" ? " · " : ""}
                {vista.atualizou !== "—" ? `Atualizou ${vista.atualizou}` : ""}
              </p>
            ) : null}
          </div>
          <button className="pdv-aud-vista-x" type="button" aria-label="Fechar" onClick={onClose}>
            <X size={16} />
          </button>
        </header>
        {vista.erro ? <p className="pdv-aud-vista-erro">{vista.erro}</p> : null}
        {vista.campos.length ? (
          <section className="pdv-aud-vista-fatos">
            {vista.campos.map(([rotulo, valor]) => (
              <p key={rotulo}><span>{rotulo}</span><b>{valor || "—"}</b></p>
            ))}
          </section>
        ) : null}
        {vista.linhas.length ? (
          <div className="pdv-aud-vista-grade">
            <table>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Produto</th>
                  <th className="num">Valor unit.</th>
                  <th className="num">Qtd</th>
                  <th className="num">Total</th>
                </tr>
              </thead>
              <tbody>
                {vista.linhas.map((line, index) => (
                  <tr key={`${line.code}-${index}`}>
                    <td className="cod">{line.code}</td>
                    <td>{line.name}{line.extra ? <small>{line.extra}</small> : null}</td>
                    <td className="num">{formatMoneyRs(line.price)}</td>
                    <td className="num">{line.qty}</td>
                    <td className="num">{formatMoneyRs(line.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        {vista.linhas.length ? (
          <footer className="pdv-aud-vista-totais">
            <p><span>Total itens</span><strong>{qtd}</strong></p>
            <p><span>Total</span><strong>{formatMoneyRs(vista.total)}</strong></p>
          </footer>
        ) : null}
      </div>
    </div>
  )
}

const POR_PAGINA_AUDITORIA = 50

function nomesDeLoja(lista: string[]) {
  const vistos = new Set<string>()
  const saida: string[] = []
  for (const item of lista) {
    const nome = item.trim()
    const chave = nome.toLocaleLowerCase("pt-BR")
    if (!nome || chave === "estoque" || vistos.has(chave)) continue
    vistos.add(chave)
    saida.push(nome)
  }
  return saida.sort((a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" }))
}

export function AuditoriaEstoque() {
  const gestao = useLocation().pathname.startsWith("/gestao")
  const { storeName, stores } = usePdvSession()
  const [base] = useState(() => ({ ...mesAtualAuditoria(), loja: gestao ? "Todas" : "Nenhum" }))
  const [lojasPainel, setLojasPainel] = useState<string[]>([])
  const [moves, setMoves] = useState<MovimentoEstoque[]>([])
  const [filtro, setFiltro] = useState(base)
  const [pagina, setPagina] = useState(0)
  const [busca, setBusca] = useState(0)
  const [atualizando, setAtualizando] = useState(false)
  const cliqueBusca = useRef(false)
  const [hint, setHint] = useState(" ")
  const [docs, setDocs] = useState<Record<string, DocAuditoria>>({})
  const [vista, setVista] = useState<VistaDoc | null>(null)
  const pedidoLista = useRef(0)
  const pedidoVista = useRef(0)
  useEffect(() => {
    const manual = cliqueBusca.current
    cliqueBusca.current = false
    const pedido = ++pedidoLista.current
    const marcou = Date.now()
    if (manual) setAtualizando(true)
    api
      .get(gestao ? "/backoffice/estoque/movimentos" : "/clients/estoque/movimentos", {
        params: {
          ...(/^\d{4}-\d{2}-\d{2}$/.test(filtro.inicio) ? { inicio: filtro.inicio } : {}),
          ...(/^\d{4}-\d{2}-\d{2}$/.test(filtro.fim) ? { fim: filtro.fim } : {}),
          ...(filtro.codigo.trim() ? { codigo: filtro.codigo.trim() } : {}),
          ...(filtro.nome.trim() ? { nome: filtro.nome.trim() } : {}),
          ...(manual ? { forcar: "1" } : {}),
        },
      })
      .then(({ data }) => {
        if (pedido !== pedidoLista.current) return
        const lista = (data.moves || []) as MovimentoEstoque[]
        setMoves(lista)
        setDocs((data.docs || {}) as Record<string, DocAuditoria>)
        setHint(lista.length ? "" : "Nenhum movimento de estoque da loja.")
      })
      .catch((err) => {
        if (pedido !== pedidoLista.current) return
        setMoves([])
        setHint(parseError(err).friend || "Não foi possível carregar a auditoria.")
      })
      .finally(() => {
        if (!manual || pedido !== pedidoLista.current) return
        const espera = Math.max(0, 600 - (Date.now() - marcou))
        window.setTimeout(() => {
          if (pedido === pedidoLista.current) setAtualizando(false)
        }, espera)
      })
  }, [gestao, filtro.inicio, filtro.fim, busca])
  useEffect(() => {
    if (!gestao) return
    api.get("/backoffice/lojistas")
      .then(({ data }) => {
        const rows = (data?.lojistas || []) as Array<{ name?: string; stores?: Array<{ name?: string }> }>
        const livres = (data?.availableStores || []) as Array<{ name?: string }>
        const nomes = [
          ...rows.flatMap((item) => {
            const lojas = (item.stores || []).map((store) => String(store.name || "").trim()).filter(Boolean)
            return lojas.length ? lojas : [String(item.name || "").trim()]
          }),
          ...livres.map((store) => String(store.name || "").trim()),
        ]
        setLojasPainel(nomes.filter(Boolean))
      })
      .catch(() => setLojasPainel([]))
  }, [gestao])
  const codigo = filtro.codigo.trim().toLowerCase()
  const nome = filtro.nome.trim().toLowerCase()
  const categoria = filtro.categoria && filtro.categoria !== "Todas" ? filtro.categoria : ""
  const opcoesCategoria = ["Todas", ...nomesDeLoja(moves.map((move) => move.category || ""))]
  const movimento = filtro.movimento && filtro.movimento !== "Todos" ? filtro.movimento : ""
  const lojaPadrao = gestao ? "Todas" : "Nenhum"
  const lojaEscolhida = filtro.loja && filtro.loja !== lojaPadrao ? filtro.loja : ""
  const opcoesLoja = gestao
    ? ["Todas", "Estoque", ...nomesDeLoja([...lojasPainel, ...moves.map((move) => move.loja || "")])]
    : ["Nenhum", ...nomesDeLoja([storeName, ...stores.map((store) => store.name)])]
  const filtrados = moves.filter((move) => {
    const dia = diaDoMovimento(move.at)
    if (filtro.inicio && (!dia || dia < filtro.inicio)) return false
    if (filtro.fim && (!dia || dia > filtro.fim)) return false
    if (movimento && move.kind !== movimento) return false
    if (codigo && !(move.code || "").toLowerCase().includes(codigo)) return false
    if (nome && !`${move.name || ""} ${move.product || ""}`.toLowerCase().includes(nome)) return false
    if (categoria && (move.category || "").localeCompare(categoria, "pt-BR", { sensitivity: "base" }) !== 0) return false
    if (lojaEscolhida) {
      const nomeLoja = (move.loja || (gestao ? "" : storeName) || "").trim()
      if (nomeLoja.localeCompare(lojaEscolhida, "pt-BR", { sensitivity: "base" }) !== 0) return false
    }
    return true
  })
  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA_AUDITORIA))
  const paginaAtual = Math.min(pagina, totalPaginas - 1)
  const visiveis = filtrados.slice(paginaAtual * POR_PAGINA_AUDITORIA, paginaAtual * POR_PAGINA_AUDITORIA + POR_PAGINA_AUDITORIA)
  const de = filtrados.length ? paginaAtual * POR_PAGINA_AUDITORIA + 1 : 0
  const ate = Math.min(filtrados.length, de + visiveis.length - 1)
  function mostrarVista(move: MovimentoEstoque, doc?: DocAuditoria) {
    const estorno = move.kind === "Estorno"
    const loja = move.loja || storeName || "—"
    if (!doc) {
      const nome = move.origem === "compra" ? "COMPRA" : move.origem === "transferencia" ? "TRANSFERÊNCIA" : "VENDA"
      setVista({
        titulo: `${estorno ? `ESTORNO DA ${nome}` : nome} Nº ${move.docCode || ""}`.trim(),
        abertura: quandoVista(move.at),
        atualizou: quandoVista(move.at),
        campos: [
          ["Usuário", move.user || move.who || "—"],
          ["Loja", loja],
          ["Status", estorno ? "Estornada" : move.kind],
        ],
        linhas: [{
          code: move.code || "—",
          name: move.name || move.product,
          qty: Math.abs(move.qty),
          price: 0,
          total: 0,
        }],
        total: 0,
      })
      return
    }
    setVista({
      titulo: estorno ? doc.tituloEstorno : doc.titulo,
      abertura: quandoVista(doc.abertura),
      atualizou: quandoVista(doc.atualizou),
      campos: [
        ...doc.campos.map(([rotulo, valor]) => [rotulo, rotulo === "Status" && estorno ? "Estornada" : valor] as [string, string]),
        ["Loja", loja],
      ],
      linhas: doc.linhas,
      total: doc.total,
    })
  }
  function abrir(move: MovimentoEstoque) {
    if (!move.docId) return
    const doc = docs[move.docId]
    if (doc) {
      mostrarVista(move, doc)
      return
    }
    if (gestao && move.origem) {
      const pedido = ++pedidoVista.current
      api
        .get("/backoffice/estoque/documento", {
          params: {
            ...(move.clientId ? { clientId: move.clientId } : {}),
            origem: move.origem,
            id: move.docId,
          },
        })
        .then(({ data }) => {
          if (pedido !== pedidoVista.current) return
          mostrarVista(move, data?.doc as DocAuditoria | undefined)
        })
        .catch(() => {
          if (pedido !== pedidoVista.current) return
          mostrarVista(move)
        })
      return
    }
    mostrarVista(move)
  }
  const rows = visiveis.map((move) => [
    move.at ? new Date(move.at).toLocaleString("pt-BR") : "—",
    move.kind,
    "",
    move.code || "—",
    move.name || move.product,
    estoqueTexto(move.before),
    movimentoTexto(move.qty),
    estoqueTexto(move.after),
    move.detail,
    move.loja || storeName || "—",
    move.user || move.who || "—",
  ])
  const usouFiltro = Boolean(codigo || nome || categoria || movimento || lojaEscolhida || filtro.inicio !== base.inicio || filtro.fim !== base.fim)
  const vazio = moves.length && usouFiltro ? "Nenhum movimento para o filtro atual." : hint
  return (
    <>
      <FilterPage
        title="AUDITORIA ESTOQUE"
        pageClass="pdv-cli-page"
        initialValues={base}
        busy={atualizando}
        fields={[
          { key: "inicio", label: "Data início", kind: "date" },
          { key: "fim", label: "Data fim", kind: "date" },
          { key: "codigo", label: "Código" },
          { key: "nome", label: "Nome do produto" },
          { key: "categoria", label: "Categoria", kind: "search", options: opcoesCategoria },
          { key: "movimento", label: "Origem", kind: "search", options: MOVIMENTOS_AUDITORIA },
          { key: "loja", label: "Loja", kind: "search", options: opcoesLoja },
        ]}
        columns={COLUNAS_AUDITORIA}
        rows={rows}
        hint={rows.length ? undefined : vazio || " "}
        renderCell={(index, column) => {
          if (column !== 2) return null
          const move = visiveis[index]
          if (!move?.docId) return "—"
          return (
            <button
              className="venda-lupa"
              type="button"
              aria-label={`Abrir ${move.kind} ${move.docCode || ""}`}
              onClick={() => abrir(move)}
            >
              <Search size={15} />
            </button>
          )
        }}
        onSearch={(values) => {
          cliqueBusca.current = true
          setAtualizando(true)
          setPagina(0)
          setFiltro({
            inicio: values.inicio || "",
            fim: values.fim || "",
            codigo: values.codigo || "",
            nome: values.nome || "",
            categoria: values.categoria || "Todas",
            movimento: values.movimento || "Todos",
            loja: values.loja || (gestao ? "Todas" : "Nenhum"),
          })
          setBusca((atual) => atual + 1)
        }}
        foot={filtrados.length ? (
          <div className="pdv-aud-paginas">
            <span>{de}–{ate} de {filtrados.length}</span>
            <button className="pdv-cad-btn" type="button" disabled={paginaAtual === 0} onClick={() => setPagina(paginaAtual - 1)}>Anterior</button>
            <span>{paginaAtual + 1} / {totalPaginas}</span>
            <button className="pdv-cad-btn" type="button" disabled={paginaAtual >= totalPaginas - 1} onClick={() => setPagina(paginaAtual + 1)}>Próxima</button>
          </div>
        ) : null}
      />
      {vista ? <VistaMovimento vista={vista} onClose={() => setVista(null)} /> : null}
    </>
  )
}

function RelatorioEstoque() {
  const gestao = useLocation().pathname.startsWith("/gestao")
  const podeCusto = useVerCusto()
  const verCusto = gestao || podeCusto
  const [categorias, setCategorias] = useState<Array<{ id: string; name: string }>>([])
  const [products, setProducts] = useState<PdvProduct[]>([])
  const [hint, setHint] = useState(" ")
  const [filtro, setFiltro] = useState({ produto: "", categoria: "" })
  const pedido = useRef(0)
  const categoriasRef = useRef(categorias)
  categoriasRef.current = categorias

  useEffect(() => {
    api.get("/clients/products/categories")
      .then(({ data }) => {
        const lista = ((data.categories || []) as Array<{ id?: string; name?: string }>)
          .map((item) => ({ id: String(item.id || ""), name: String(item.name || "").trim() }))
          .filter((item) => item.id && item.name)
          .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
        setCategorias(lista)
      })
      .catch(() => undefined)
  }, [])

  useEffect(() => {
    const id = ++pedido.current
    const categoria = filtro.categoria && filtro.categoria !== "Todas"
      ? categoriasRef.current.find((item) => item.name === filtro.categoria)
      : undefined
    const params = {
      ativo: "1",
      page: "1",
      limit: "800",
      wide: "1",
      stockField: "loja",
      order: "code",
      search: filtro.produto.trim() || undefined,
      categorias: categoria?.id,
      _t: Date.now(),
    }
    api.get("/clients/products", { params })
      .then(async ({ data }) => {
        if (id !== pedido.current) return
        const primeiro = (data.products || []) as PdvProduct[]
        const total = Number(data.total) || primeiro.length
        const todos = [...primeiro]
        let page = 1
        while (todos.length < total && page < 20) {
          page += 1
          const next = await api.get("/clients/products", { params: { ...params, page: String(page), _t: Date.now() } })
          if (id !== pedido.current) return
          const lote = (next.data.products || []) as PdvProduct[]
          if (!lote.length) break
          todos.push(...lote)
        }
        setProducts(todos)
        setHint(todos.length ? "" : filtro.produto || filtro.categoria ? "Nenhum produto para o filtro atual." : "Nenhum produto no estoque da loja.")
      })
      .catch((err) => {
        if (id !== pedido.current) return
        setProducts([])
        setHint(parseError(err).friend || "Não foi possível carregar o estoque.")
      })
  }, [filtro])

  const columns = verCusto ? ["Código", "Produto", "Estoque", "Custo"] : ["Código", "Produto", "Estoque"]
  const rows = products.map((product) => {
    const estoque = Math.max(0, Math.floor(Number(product.lojaStock) || 0))
    const base = [
      product.code || "—",
      lojaProductName(product),
      estoque.toLocaleString("pt-BR"),
    ]
    if (!verCusto) return base
    const custo = Number(product.lojaCostAverage ?? product.lojaCostPrice ?? product.costPrice) || 0
    return [...base, formatMoneyRs(custo)]
  })

  return (
    <FilterPage
      title="ESTOQUE"
      pageClass="pdv-cli-page"
      fields={[
        { key: "produto", label: "Produto" },
        { key: "categoria", label: "Categoria", kind: "search", options: ["Todas", ...categorias.map((item) => item.name)] },
      ]}
      columns={columns}
      rows={rows}
      hint={rows.length ? undefined : hint || " "}
      onSearch={(values) => setFiltro({
        produto: values.produto || "",
        categoria: !values.categoria || values.categoria === "Todas" ? "" : values.categoria,
      })}
    />
  )
}

function semPrecoCusto<T extends { columns?: string[] }>(def: T, verCusto: boolean): T {
  if (verCusto || !def.columns) return def
  const columns = def.columns.filter((coluna) => !/custo|lucro|margem/i.test(coluna))
  return { ...def, columns }
}

export function RelatorioScreen({ def }: { def: FilterPageProps & { path?: string } }) {
  const verCusto = useVerCusto()
  if (def.path === "imei") return <BuscarImei escopo="tudo" />
  if (def.path === "venda/itens") return <RelatorioItensVenda />
  if (def.path && (def.path.startsWith("venda/") || def.path.startsWith("venda-gerencial/"))) {
    return <VendasRelatorio def={{ ...def, path: def.path }} />
  }
  if (def.path === "dre") return <DreGerencial scope="loja" />
  if (def.path === "despesa") return <LancamentosRelatorio title={def.title} tipo="despesa" />
  if (def.path === "financeiro/recebimento") return <LancamentosRelatorio title="RECEITAS" tipo="receita" />
  if (def.path === "auditoria/estoque") return <AuditoriaEstoque />
  if (def.path === "estoque") return <RelatorioEstoque />
  return <FilterPage {...semPrecoCusto(def, verCusto)} />
}

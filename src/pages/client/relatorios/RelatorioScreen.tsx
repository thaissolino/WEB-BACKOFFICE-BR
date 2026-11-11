import { FormEvent, useEffect, useMemo, useRef, useState } from "react"
import { useLocation } from "react-router-dom"
import { Search, X } from "lucide-react"
import FilterPage, { type FilterPageProps } from "../pdv/FilterPage"
import SearchableSelect from "../cadastros/produtos/SearchableSelect"
import { VendasRelatorio } from "../movimentacoes/LojaVendasPainel"
import { BuscarImei } from "../movimentacoes/BuscarImei"
import { RelatorioItensVenda } from "./RelatorioItensVenda"
import { lancamentoDaLoja, listCatalog } from "../cadastros/catalog/catalogApi"
import DreGerencial from "../../gestor/DreGerencial"
import { api, parseError } from "../../../services/api"
import { useNomeEstoque } from "../../../services/nomeEstoque"
import { usePdvSession } from "../dashboard/PdvShell"
import { useVerCusto } from "../cadastros/usuarios/useVerCusto"
import { formatMoneyRs, lojaProductName, type PdvProduct } from "../cadastros/produtos/types"
import { loadProductCategories, toFlatOptions } from "../cadastros/produtos/categoryModel"

type FiltroEstoque = {
  loja: string
  codigo: string
  produto: string
  categoria: string
  marca: string
  colecao: string
  genero: string
  fornecedor: string
  estoque: string
  ordem: string
}

const ESTOQUE_LIMPO: FiltroEstoque = {
  loja: "",
  codigo: "",
  produto: "",
  categoria: "Todas",
  marca: "Todas",
  colecao: "Todas",
  genero: "Todos",
  fornecedor: "Todos",
  estoque: "Todos",
  ordem: "Nome",
}

function opcoesDe(valores: Array<string | null | undefined>, vazio: string) {
  const limpos = valores.map((item) => String(item || "").trim()).filter(Boolean)
  return [vazio, ...[...new Set(limpos)].sort((a, b) => a.localeCompare(b, "pt-BR"))]
}

function casaLista(texto: string, valor: string) {
  const lista = valor.split(/[,;]/).map((item) => item.trim().toLowerCase()).filter(Boolean)
  if (!lista.length) return true
  const hay = texto.toLowerCase()
  return lista.some((termo) => hay.includes(termo))
}

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
  const { storeId, storeName, stores } = usePdvSession()
  const lojaAberta = storeName || stores.find((item) => item.id === storeId)?.name || stores[0]?.name || ""
  const lojaInicial = gestao ? "Estoque" : (lojaAberta || "Nenhum")
  const [base] = useState(() => ({ ...mesAtualAuditoria(), loja: lojaInicial }))
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
    if (!gestao && !manual) return
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
        key={gestao ? "gestao-aud" : `loja-aud-${lojaAberta || "sem"}`}
        title="AUDITORIA ESTOQUE"
        pageClass="pdv-cli-page"
        initialValues={{ ...base, loja: lojaInicial }}
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
            loja: values.loja || (gestao ? "Estoque" : lojaAberta || "Nenhum"),
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

export function RelatorioEstoque() {
  const gestao = useLocation().pathname.startsWith("/gestao")
  const podeCusto = useVerCusto()
  const verCusto = gestao || podeCusto
  const nomeEstoque = useNomeEstoque(gestao ? "backoffice" : "loja")
  const { storeId, storeName, stores } = usePdvSession()
  const lojaAberta = storeName || stores.find((item) => item.id === storeId)?.name || stores[0]?.name || ""
  const lugar = gestao ? (nomeEstoque || "Estoque") : lojaAberta
  const [donos, setDonos] = useState<Record<string, string>>({})
  const [products, setProducts] = useState<PdvProduct[]>([])
  const [fornecedorNota, setFornecedorNota] = useState<Record<string, string>>({})
  const [hint, setHint] = useState("")
  const [buscou, setBuscou] = useState(false)
  const [atualizando, setAtualizando] = useState(false)
  const [categoriasCatalogo, setCategoriasCatalogo] = useState<string[]>([])
  const [facets, setFacets] = useState({ brands: [] as string[], collections: [] as string[], genders: [] as string[], suppliers: [] as string[] })
  const [draft, setDraft] = useState<FiltroEstoque>(() => ({ ...ESTOQUE_LIMPO, loja: gestao ? "Estoque" : "" }))
  const [filtros, setFiltros] = useState<FiltroEstoque>(() => ({ ...ESTOQUE_LIMPO, loja: gestao ? "Estoque" : "" }))
  const pedido = useRef(0)

  function carregar(ativos: FiltroEstoque) {
    const id = ++pedido.current
    const marcou = Date.now()
    const central = gestao && (ativos.loja === lugar || ativos.loja === "Estoque")
    setHint("Carregando...")
    setBuscou(true)
    setAtualizando(true)
    const soltar = () => {
      const espera = Math.max(0, 400 - (Date.now() - marcou))
      window.setTimeout(() => {
        if (id === pedido.current) setAtualizando(false)
      }, espera)
    }
    const params = {
      ativo: "1",
      page: "1",
      limit: "200",
      wide: "1",
      stockField: central ? "backoffice" : "loja",
      order: ativos.ordem === "Código" ? "code" : "name",
      _t: Date.now(),
    }
    api.get("/clients/products", { params })
      .then(async ({ data }) => {
        if (id !== pedido.current) return
        const primeiro = (data.products || []) as PdvProduct[]
        const total = Number(data.total) || primeiro.length
        const todos = [...primeiro]
        let page = 1
        while (todos.length < total && page < 30) {
          page += 1
          const next = await api.get("/clients/products", { params: { ...params, page: String(page), _t: Date.now() } })
          if (id !== pedido.current) return
          const lote = (next.data.products || []) as PdvProduct[]
          if (!lote.length) break
          todos.push(...lote)
        }
        setProducts(todos)
        setHint(todos.length ? "" : central ? "Nenhum produto no estoque." : "Nenhum produto no estoque da loja.")
        soltar()
        const ids = todos
          .filter((item) => Math.floor(Number(central ? item.stockQuantity : item.lojaStock) || 0) > 0)
          .map((item) => item.id)
        if (!ids.length) {
          setFornecedorNota({})
        } else {
          const conta = donos[ativos.loja]
          const pedidoFornecedor = central
            ? api.post("/clients/products/fornecedores-estoque", { ids })
            : api.post("/clients/products/fornecedores-nota", { ids, ...(gestao && conta ? { conta } : {}) })
          pedidoFornecedor
            .then(({ data: resposta }) => {
              if (id !== pedido.current) return
              setFornecedorNota(resposta?.fornecedores || {})
            })
            .catch(() => {
              if (id === pedido.current) setFornecedorNota({})
            })
        }
      })
      .catch((err) => {
        if (id !== pedido.current) return
        setProducts([])
        setHint(parseError(err).friend || "Não foi possível carregar o estoque.")
        soltar()
      })
  }

  useEffect(() => {
    loadProductCategories(true)
      .then((rows) => setCategoriasCatalogo(toFlatOptions(rows).map((item) => item.label)))
      .catch(() => setCategoriasCatalogo([]))
    api
      .get("/clients/products", { params: { ativo: "1", page: "1", limit: "1", stockField: gestao ? "backoffice" : "loja" } })
      .then(({ data }) => {
        if (data.facets) setFacets(data.facets)
      })
      .catch(() => undefined)
  }, [gestao])

  useEffect(() => {
    if (!gestao) return
    api.get("/backoffice/lojistas")
      .then(({ data }) => {
        const mapa: Record<string, string> = {}
        const rows = (data?.lojistas || []) as Array<{ id?: string; stores?: Array<{ name?: string }> }>
        for (const item of rows) {
          const dono = String(item.id || "")
          for (const store of item.stores || []) {
            const nome = String(store.name || "").trim()
            if (nome && dono) mapa[nome] = dono
          }
        }
        setDonos(mapa)
      })
      .catch(() => setDonos({}))
  }, [gestao])

  useEffect(() => {
    if (gestao || !lojaAberta) return
    setDraft((atual) => (atual.loja ? atual : { ...atual, loja: lojaAberta }))
    setFiltros((atual) => (atual.loja ? atual : { ...atual, loja: lojaAberta }))
  }, [gestao, lojaAberta])

  useEffect(() => {
    if (!gestao || !lugar) return
    setDraft((atual) => (atual.loja ? atual : { ...atual, loja: "Estoque" }))
    setFiltros((atual) => (atual.loja ? atual : { ...atual, loja: "Estoque" }))
  }, [gestao, lugar])

  function setCampo<K extends keyof FiltroEstoque>(chave: K, valor: FiltroEstoque[K]) {
    setDraft((atual) => ({ ...atual, [chave]: valor }))
  }

  function aplicar(event: FormEvent) {
    event.preventDefault()
    const pedidoFiltro = { ...draft, loja: draft.loja || (gestao ? "Estoque" : lugar) }
    setFiltros(pedidoFiltro)
    carregar(pedidoFiltro)
  }

  const lojas = useMemo(() => {
    if (gestao) {
      const nomes = Object.keys(donos).sort((a, b) => a.localeCompare(b, "pt-BR"))
      return ["Estoque", ...nomes.filter((nome) => nome.localeCompare("Estoque", "pt-BR", { sensitivity: "base" }) !== 0)]
    }
    const nomes = stores.map((item) => item.name).filter(Boolean)
    return [...new Set(nomes.length ? nomes : [lojaAberta].filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR"))
  }, [gestao, donos, lugar, stores, lojaAberta])
  const categorias = useMemo(
    () => opcoesDe([...categoriasCatalogo, ...products.map((item) => item.category || "Sem categoria")], "Todas"),
    [categoriasCatalogo, products],
  )
  const marcas = useMemo(() => opcoesDe([...facets.brands, ...products.map((item) => item.brand)], "Todas"), [facets.brands, products])
  const colecoes = useMemo(() => opcoesDe([...facets.collections, ...products.map((item) => item.collection)], "Todas"), [facets.collections, products])
  const generos = useMemo(() => opcoesDe([...facets.genders, ...products.map((item) => item.gender)], "Todos"), [facets.genders, products])
  const fornecedores = useMemo(() => opcoesDe(
    products.map((item) => fornecedorNota[item.id]),
    "Todos",
  ), [products, fornecedorNota])
  const central = gestao && (filtros.loja === lugar || filtros.loja === "Estoque")
  const visiveis = useMemo(() => products.filter((product) => {
    const estoque = Math.floor(Number(central ? product.stockQuantity : product.lojaStock) || 0)
    if (!casaLista(product.code || "", filtros.codigo)) return false
    if (!casaLista(lojaProductName(product), filtros.produto)) return false
    if (filtros.categoria !== "Todas" && (product.category || "Sem categoria") !== filtros.categoria) return false
    if (filtros.marca !== "Todas" && (product.brand || "") !== filtros.marca) return false
    if (filtros.colecao !== "Todas" && (product.collection || "") !== filtros.colecao) return false
    if (filtros.genero !== "Todos" && (product.gender || "") !== filtros.genero) return false
    if (filtros.fornecedor !== "Todos" && (fornecedorNota[product.id] || "") !== filtros.fornecedor) return false
    if (filtros.estoque === "Com estoque" && estoque <= 0) return false
    if (filtros.estoque === "Sem estoque" && estoque > 0) return false
    return true
  }).sort((a, b) => (
    filtros.ordem === "Código"
      ? (a.code || "").localeCompare(b.code || "", "pt-BR", { numeric: true })
      : lojaProductName(a).localeCompare(lojaProductName(b), "pt-BR")
  )), [products, filtros, fornecedorNota, central])
  const linhas = useMemo(() => visiveis.map((product) => {
    const estoque = Math.max(0, Math.floor(Number(central ? product.stockQuantity : product.lojaStock) || 0))
    const compra = central
      ? Number(product.costPrice) || 0
      : Number(product.lojaCostAverage ?? product.lojaCostPrice ?? product.costPrice) || 0
    const venda = central
      ? Number(product.salePrice) || 0
      : Number(product.lojaSalePrice ?? product.salePrice) || 0
    return {
      product,
      estoque,
      compra,
      venda,
      totalCompra: estoque * compra,
      totalVenda: estoque * venda,
      lucro: venda > 0 ? ((venda - compra) / venda) * 100 : 0,
    }
  }), [visiveis, central])
  const totais = useMemo(() => linhas.reduce((acc, linha) => {
    acc.qtd += linha.estoque
    acc.compra += linha.totalCompra
    acc.venda += linha.totalVenda
    if (linha.estoque > 0) acc.comEstoque += 1
    return acc
  }, { qtd: 0, compra: 0, venda: 0, comEstoque: 0 }), [linhas])
  const lucroTotal = totais.venda > 0 ? ((totais.venda - totais.compra) / totais.venda) * 100 : 0
  const colunas = verCusto ? 10 : 7
  const chips = [
    `Loja: ${filtros.loja || lugar || "—"}`,
    filtros.categoria !== "Todas" ? `Categoria: ${filtros.categoria}` : "",
    filtros.marca !== "Todas" ? `Marca: ${filtros.marca}` : "",
    filtros.colecao !== "Todas" ? `Coleção: ${filtros.colecao}` : "",
    filtros.genero !== "Todos" ? `Gênero: ${filtros.genero}` : "",
    filtros.fornecedor !== "Todos" ? `Fornecedor: ${filtros.fornecedor}` : "",
    filtros.estoque !== "Todos" ? `Estoque: ${filtros.estoque}` : "",
    filtros.codigo.trim() ? `Código: ${filtros.codigo.trim()}` : "",
    filtros.produto.trim() ? `Produto: ${filtros.produto.trim()}` : "",
    `Ordenar: ${filtros.ordem || "Nome"}`,
  ].filter(Boolean)

  return (
    <div className="pdv-venda-round">
      <FilterPage
        title="ESTOQUE"
        pageClass="pdv-cli-page"
        fields={[]}
        columns={[]}
        hideList
        hint={hint || undefined}
        extra={(
          <>
            <form className="pdv-cad-filters pdv-cad-filters-itens" onSubmit={aplicar}>
              <label>
                Loja
                <SearchableSelect
                  hideEmpty
                  value={draft.loja || (gestao ? "Estoque" : lugar)}
                  options={lojas.length ? lojas : [gestao ? "Estoque" : lugar].filter(Boolean)}
                  onChange={(value) => setCampo("loja", value)}
                />
              </label>
              <label>
                Código do produto
                <input value={draft.codigo} placeholder="123,124,125" onChange={(event) => setCampo("codigo", event.target.value)} autoComplete="off" />
              </label>
              <label>
                Nome do produto
                <input value={draft.produto} onChange={(event) => setCampo("produto", event.target.value)} autoComplete="off" />
              </label>
              <label>
                Categoria
                <SearchableSelect hideEmpty value={draft.categoria} options={categorias} onChange={(value) => setCampo("categoria", value)} />
              </label>
              <label>
                Marca
                <SearchableSelect hideEmpty value={draft.marca} options={marcas} onChange={(value) => setCampo("marca", value)} />
              </label>
              <label>
                Coleção
                <SearchableSelect hideEmpty value={draft.colecao} options={colecoes} onChange={(value) => setCampo("colecao", value)} />
              </label>
              <label>
                Gênero
                <SearchableSelect hideEmpty value={draft.genero} options={generos} onChange={(value) => setCampo("genero", value)} />
              </label>
              <label>
                Fornecedor
                <SearchableSelect hideEmpty value={draft.fornecedor} options={fornecedores} onChange={(value) => setCampo("fornecedor", value)} />
              </label>
              <label>
                Estoque
                <SearchableSelect hideEmpty value={draft.estoque} options={["Todos", "Com estoque", "Sem estoque"]} onChange={(value) => setCampo("estoque", value)} />
              </label>
              <label>
                Ordenar
                <SearchableSelect hideEmpty value={draft.ordem || "Nome"} options={["Nome", "Código"]} onChange={(value) => setCampo("ordem", value)} />
              </label>
              <div className="pdv-cad-filters-go">
                <button className="pdv-cad-btn" type="button" onClick={() => { const limpo = { ...ESTOQUE_LIMPO, loja: gestao ? "Estoque" : lojaAberta }; setDraft(limpo); setFiltros(limpo); setBuscou(false); setAtualizando(false); setProducts([]); setFornecedorNota({}); setHint("") }}>Limpar</button>
                <button className={`pdv-cad-btn pdv-cad-btn-blue${atualizando ? " is-busy" : ""}`} type="submit">
                  {atualizando ? <span className="pdv-cad-spin" aria-hidden="true" /> : null}
                  {atualizando ? "Buscando..." : "Buscar"}
                </button>
              </div>
            </form>
            {buscou ? (
            <div className="pdv-itens-chips">
              {chips.map((chip) => <span key={chip}>{chip}</span>)}
            </div>
            ) : null}
            {buscou ? (
            <div className={`dre-sheet iv-sheet est-sheet${atualizando ? " pdv-prod-refreshing" : ""}`}>
              <table>
                <thead>
                  <tr>
                    <th>Cód do Produto</th>
                    <th>Produto</th>
                    <th>Loja</th>
                    <th>Fornecedor</th>
                    <th className="iv-num">Estoque</th>
                    {verCusto ? <th className="iv-num">Pr. Compra</th> : null}
                    {verCusto ? <th className="iv-num">Total Compra</th> : null}
                    <th className="iv-num">Pr. Venda</th>
                    <th className="iv-num">Total Venda</th>
                    {verCusto ? <th className="iv-num">Lucro Bruto</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {linhas.length === 0 ? (
                    <tr>
                      <td className="iv-vazio" colSpan={colunas}>{hint || "Nenhum produto para o filtro atual."}</td>
                    </tr>
                  ) : linhas.map((linha) => (
                    <tr key={linha.product.id}>
                      <td>{linha.product.code || "—"}</td>
                      <td>{lojaProductName(linha.product)}</td>
                      <td>{filtros.loja || lugar || "—"}</td>
                      <td className={(fornecedorNota[linha.product.id] || "").trim() ? "est-nome" : "iv-traco"}>{(fornecedorNota[linha.product.id] || "").trim() || "—"}</td>
                      <td className="iv-num">{linha.estoque.toLocaleString("pt-BR")}</td>
                      {verCusto ? <td className="iv-num">{formatMoneyRs(linha.compra)}</td> : null}
                      {verCusto ? <td className="iv-num">{formatMoneyRs(linha.totalCompra)}</td> : null}
                      <td className="iv-num">{formatMoneyRs(linha.venda)}</td>
                      <td className="iv-num">{formatMoneyRs(linha.totalVenda)}</td>
                      {verCusto ? <td className="iv-num">{linha.lucro.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%</td> : null}
                    </tr>
                  ))}
                  {linhas.length ? (
                    <tr className="dre-strong iv-total-grupo">
                      <th colSpan={4}>Subtotal</th>
                      <td className="iv-num">{totais.qtd.toLocaleString("pt-BR")}</td>
                      {verCusto ? <td className="iv-num" /> : null}
                      {verCusto ? <td className="iv-num">{formatMoneyRs(totais.compra)}</td> : null}
                      <td className="iv-num" />
                      <td className="iv-num">{formatMoneyRs(totais.venda)}</td>
                      {verCusto ? <td className="iv-num">{lucroTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%</td> : null}
                    </tr>
                  ) : null}
                  {linhas.length ? (
                    <tr className="dre-strong iv-total-grupo">
                      <th colSpan={4}>Total de produtos com estoque: {totais.comEstoque}</th>
                      <td className="iv-num">{totais.qtd.toLocaleString("pt-BR")}</td>
                      {verCusto ? <td className="iv-num" /> : null}
                      {verCusto ? <td className="iv-num">{formatMoneyRs(totais.compra)}</td> : null}
                      <td className="iv-num" />
                      <td className="iv-num">{formatMoneyRs(totais.venda)}</td>
                      {verCusto ? <td className="iv-num">{lucroTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%</td> : null}
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
            ) : null}
          </>
        )}
      />
    </div>
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

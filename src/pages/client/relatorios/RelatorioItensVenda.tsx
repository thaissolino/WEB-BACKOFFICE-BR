import { FormEvent, useEffect, useMemo, useState } from "react"
import { Search } from "lucide-react"
import { DatePreset } from "../cadastros/catalog/FormBits"
import SearchableSelect from "../cadastros/produtos/SearchableSelect"
import { formatMoneyRs } from "../cadastros/produtos/types"
import FilterPage from "../pdv/FilterPage"
import { SaleDetailPanel, listLojaSales, type LojaPdvSale } from "../movimentacoes/LojaVendasPainel"
import { todayIso } from "../../../utils/todayIso"
import { parseError } from "../../../services/api"

type TipoRelatorio = "detalhado" | "resumido"

type Filtros = {
  inicio: string
  fim: string
  codigo: string
  produto: string
  categoria: string
  venda: string
  cliente: string
  vendedor: string
  caixa: string
  tipo: TipoRelatorio
}

type LinhaItem = {
  sale: LojaPdvSale
  at: string
  codigo: string
  produto: string
  categoria: string
  qtd: number
  unitario: number
  desconto: number
  total: number
  imei: string
}

const VAZIO: Filtros = {
  inicio: todayIso(),
  fim: todayIso(),
  codigo: "",
  produto: "",
  categoria: "Todas",
  venda: "",
  cliente: "",
  vendedor: "Todos",
  caixa: "Todos",
  tipo: "detalhado",
}

function when(value?: string | null) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return `${date.toLocaleDateString("pt-BR")} ${date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
}

function termos(valor: string) {
  return valor.split(/[,;]/).map((item) => item.trim().toLowerCase()).filter(Boolean)
}

function casaLista(texto: string, valor: string) {
  const lista = termos(valor)
  if (!lista.length) return true
  const hay = texto.toLowerCase()
  return lista.some((termo) => hay.includes(termo))
}

function descontoLinha(line: { discount: number; qty: number }) {
  return Number(line.discount) || 0
}

function totalLinha(line: { price: number; discount: number; qty: number }) {
  return line.qty * Math.max(0, line.price - line.discount)
}

function achatar(sales: LojaPdvSale[]): LinhaItem[] {
  return sales.flatMap((sale) =>
    (sale.lines || []).map((line) => ({
      sale,
      at: sale.finalizedAt || sale.createdAt,
      codigo: line.code || "",
      produto: line.name || "",
      categoria: line.category || "Sem categoria",
      qtd: line.qty,
      unitario: line.price,
      desconto: descontoLinha(line),
      total: totalLinha(line),
      imei: (line.serials || []).filter(Boolean).join(", "),
    })),
  )
}

function passa(item: LinhaItem, filtros: Filtros) {
  const at = new Date(item.at)
  if (filtros.inicio) {
    const inicio = new Date(`${filtros.inicio}T00:00:00`)
    if (!Number.isNaN(inicio.getTime()) && at < inicio) return false
  }
  if (filtros.fim) {
    const fim = new Date(`${filtros.fim}T23:59:59`)
    if (!Number.isNaN(fim.getTime()) && at > fim) return false
  }
  if (!casaLista(item.codigo, filtros.codigo)) return false
  if (!casaLista(item.produto, filtros.produto)) return false
  if (filtros.categoria !== "Todas" && item.categoria !== filtros.categoria) return false
  if (!casaLista(item.sale.code, filtros.venda)) return false
  if (!casaLista(item.sale.customerName, filtros.cliente)) return false
  if (filtros.vendedor !== "Todos" && item.sale.sellerName !== filtros.vendedor) return false
  if (filtros.caixa !== "Todos" && item.sale.caixaName !== filtros.caixa) return false
  return true
}

function dinheiroDesc(valor: number) {
  if (valor < 0) return `+ ${formatMoneyRs(-valor)}`
  if (valor > 0) return formatMoneyRs(valor)
  return ""
}

export function RelatorioItensVenda() {
  const [sales, setSales] = useState<LojaPdvSale[]>([])
  const [hint, setHint] = useState("Carregando...")
  const [draft, setDraft] = useState<Filtros>(VAZIO)
  const [filtros, setFiltros] = useState<Filtros>(VAZIO)
  const [detail, setDetail] = useState<LojaPdvSale | null>(null)

  useEffect(() => {
    listLojaSales("finalizada")
      .then((list) => {
        setSales(list)
        setHint(list.length ? "" : "Nenhuma venda da loja neste relatório.")
      })
      .catch((err) => setHint(parseError(err).friend || "Não foi possível carregar o relatório."))
  }, [])

  const todos = useMemo(() => achatar(sales), [sales])
  const categorias = useMemo(
    () => ["Todas", ...[...new Set(todos.map((item) => item.categoria).filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR"))],
    [todos],
  )
  const vendedores = useMemo(
    () => ["Todos", ...[...new Set(sales.map((sale) => sale.sellerName).filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR"))],
    [sales],
  )
  const caixas = useMemo(
    () => ["Todos", ...[...new Set(sales.map((sale) => sale.caixaName).filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR"))],
    [sales],
  )

  const visiveis = useMemo(() => todos.filter((item) => passa(item, filtros)), [todos, filtros])

  const resumido = filtros.tipo === "resumido"
  const agrupado = useMemo(() => {
    if (!resumido) return visiveis.map((item) => ({
      chave: item.sale.id,
      sale: item.sale,
      cells: [
        when(item.at),
        item.sale.code,
        item.sale.customerName || "",
        item.sale.caixaName || "",
        item.sale.sellerName || "",
        item.codigo,
        item.produto,
        item.categoria,
        String(item.qtd),
        formatMoneyRs(item.unitario),
        dinheiroDesc(item.desconto),
        formatMoneyRs(item.total),
        item.imei,
      ],
    }))
    const mapa = new Map<string, { codigo: string; produto: string; qtd: number; total: number }>()
    for (const item of visiveis) {
      const chave = `${item.codigo}|${item.produto}`
      const atual = mapa.get(chave) || { codigo: item.codigo, produto: item.produto, qtd: 0, total: 0 }
      atual.qtd += item.qtd
      atual.total += item.total
      mapa.set(chave, atual)
    }
    return [...mapa.values()]
      .sort((a, b) => a.produto.localeCompare(b.produto, "pt-BR"))
      .map((item) => ({
        chave: `${item.codigo}|${item.produto}`,
        sale: null as LojaPdvSale | null,
        cells: [item.codigo, item.produto, String(item.qtd), formatMoneyRs(item.total)],
      }))
  }, [visiveis, resumido])

  function setCampo<K extends keyof Filtros>(chave: K, valor: Filtros[K]) {
    setDraft((atual) => ({ ...atual, [chave]: valor }))
  }

  function aplicar(event: FormEvent) {
    event.preventDefault()
    setFiltros(draft)
  }

  return (
    <div className="pdv-venda-round">
      <FilterPage
        title="ITENS DAS VENDAS"
        pageClass="pdv-cli-page"
        fields={[]}
        extra={(
          <form className="pdv-cad-filters" onSubmit={aplicar}>
            <label>
              Data da venda início
              <span className="pdv-date-field">
                <input type="date" value={draft.inicio} onChange={(event) => setCampo("inicio", event.target.value)} />
                <DatePreset onPick={(inicio, fim) => setDraft((atual) => ({ ...atual, inicio, fim }))} />
              </span>
            </label>
            <label>
              Data da venda fim
              <span className="pdv-date-field">
                <input type="date" value={draft.fim} onChange={(event) => setCampo("fim", event.target.value)} />
                <DatePreset onPick={(inicio, fim) => setDraft((atual) => ({ ...atual, inicio, fim }))} />
              </span>
            </label>
            <label>
              Cód. do produto
              <input value={draft.codigo} onChange={(event) => setCampo("codigo", event.target.value)} autoComplete="off" />
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
              Código da venda
              <input value={draft.venda} onChange={(event) => setCampo("venda", event.target.value)} autoComplete="off" />
            </label>
            <label>
              Nome do cliente
              <input value={draft.cliente} onChange={(event) => setCampo("cliente", event.target.value)} autoComplete="off" />
            </label>
            <label>
              Vendedor
              <SearchableSelect hideEmpty value={draft.vendedor} options={vendedores} onChange={(value) => setCampo("vendedor", value)} />
            </label>
            <label>
              Caixa
              <SearchableSelect hideEmpty value={draft.caixa} options={caixas} onChange={(value) => setCampo("caixa", value)} />
            </label>
            <label>
              Tipo de relatório
              <SearchableSelect
                hideEmpty
                value={draft.tipo === "resumido" ? "Resumido" : "Detalhado"}
                options={["Detalhado", "Resumido"]}
                onChange={(label) => setCampo("tipo", label === "Resumido" ? "resumido" : "detalhado")}
              />
            </label>
            <div className="pdv-cad-filters-go">
              <button className="pdv-cad-btn" type="button" onClick={() => { setDraft(VAZIO); setFiltros(VAZIO) }}>Limpar</button>
              <button className="pdv-cad-btn pdv-cad-btn-blue" type="submit">Buscar</button>
            </div>
          </form>
        )}
        columns={resumido
          ? ["Código", "Produto", "Qtd", "Total"]
          : ["Data", "Venda", "Cliente", "Caixa", "Vendedor", "Cód.", "Produto", "Categoria", "Qtd", "Unitário", "Desc./Acréscimo", "Total", "IMEI"]}
        rows={agrupado.map((linha) => linha.cells)}
        hint={agrupado.length ? hint || undefined : "Nenhuma venda para o filtro atual."}
        rowLeadLabel={resumido ? undefined : "Visualizar"}
        rowLead={resumido ? undefined : (index) => {
          const sale = agrupado[index]?.sale
          if (!sale) return null
          return (
            <button
              className="venda-lupa"
              type="button"
              aria-label={`Abrir venda ${sale.code}`}
              onClick={() => setDetail(sale)}
            >
              <Search size={15} />
            </button>
          )
        }}
      />
      {detail ? <SaleDetailPanel sale={detail} onClose={() => setDetail(null)} /> : null}
    </div>
  )
}

import { FormEvent, Fragment, useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { DatePreset } from "../cadastros/catalog/FormBits"
import SearchableSelect from "../cadastros/produtos/SearchableSelect"
import { formatMoneyRs } from "../cadastros/produtos/types"
import FilterPage from "../pdv/FilterPage"
import { SaleDetailPanel, listLojaSales, type LojaPdvSale } from "../movimentacoes/LojaVendasPainel"
import { usePdvSession } from "../dashboard/PdvShell"
import { parseError } from "../../../services/api"
import { useVerCusto } from "../cadastros/usuarios/useVerCusto"
import { PainelTotalizadores } from "../../gestor/TotalizadoresVenda"
import "../../gestor/gestao-pages.css"

type TipoRelatorio =
  | "detalhado"
  | "resumido"
  | "operador"
  | "grade"
  | "local"
  | "local-resumido"
  | "loja-grade"
  | "kits"
  | "marketplace"
  | "global"

const TIPOS: { value: TipoRelatorio; label: string }[] = [
  { value: "detalhado", label: "Detalhado" },
  { value: "resumido", label: "Resumido" },
  { value: "operador", label: "Operador (Caixa)" },
  { value: "grade", label: "Por Grade" },
  { value: "local", label: "Lucro por Local de Venda" },
  { value: "local-resumido", label: "Lucro por Local de Venda Resumido" },
  { value: "loja-grade", label: "Por Loja/Grade" },
  { value: "kits", label: "Separação: Kits e Itens" },
  { value: "marketplace", label: "Lucro por Local de Venda (Valores Marketplace)" },
  { value: "global", label: "Global de Vendas" },
]

const SO_TOTAL = new Set<TipoRelatorio>(["resumido", "grade", "local-resumido", "global"])

const ROTULO: Record<TipoRelatorio, string> = {
  detalhado: "Venda",
  resumido: "Produto",
  operador: "Operador",
  grade: "Grade",
  local: "Local de Venda",
  "local-resumido": "Local de Venda",
  "loja-grade": "Loja",
  kits: "Separação",
  marketplace: "Marketplace",
  global: "Global",
}

type Filtros = {
  inicio: string
  fim: string
  loja: string
  codigo: string
  produto: string
  categoria: string
  cliente: string
  vendedor: string
  caixa: string
  tipo: TipoRelatorio
}

type LinhaItem = {
  sale: LojaPdvSale
  at: string
  aberta: string
  codigo: string
  produto: string
  categoria: string
  qtd: number
  unitario: number
  desconto: number
  total: number
  custo: number
  imei: string
  vendedor: string
  loja: string
}

function isoData(data: Date) {
  const mes = String(data.getMonth() + 1).padStart(2, "0")
  const dia = String(data.getDate()).padStart(2, "0")
  return `${data.getFullYear()}-${mes}-${dia}`
}

function filtrosDoMes(): Filtros {
  const hoje = new Date()
  return {
    inicio: isoData(new Date(hoje.getFullYear(), hoje.getMonth(), 1)),
    fim: isoData(hoje),
    loja: "",
    codigo: "",
    produto: "",
    categoria: "Todas",
    cliente: "",
    vendedor: "Todos",
    caixa: "Todos",
    tipo: "detalhado",
  }
}

function when(value?: string | null) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return `${date.toLocaleDateString("pt-BR")} ${date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
}

function diaDe(value?: string | null) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return isoData(date)
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

function qtdTexto(valor: number) {
  return Number.isInteger(valor) ? String(valor) : valor.toLocaleString("pt-BR", { maximumFractionDigits: 3 })
}

function intervaloLongo(inicio: string, fim: string) {
  if (!inicio || !fim) return false
  const a = new Date(`${inicio}T00:00:00`)
  const b = new Date(`${fim}T00:00:00`)
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return false
  return Math.abs(b.getTime() - a.getTime()) > 92 * 24 * 60 * 60 * 1000
}

function achatar(sales: LojaPdvSale[]): LinhaItem[] {
  return sales.flatMap((sale) =>
    (sale.lines || []).map((line) => {
      const extra = line as { cost?: number; seller?: string }
      const qtd = Number(line.qty) || 0
      const unitario = Number(line.price) || 0
      const desconto = Number(line.discount) || 0
      return {
        sale,
        at: sale.finalizedAt || sale.createdAt,
        aberta: sale.createdAt,
        codigo: line.code || "",
        produto: line.name || "",
        categoria: line.category || "Sem categoria",
        qtd,
        unitario,
        desconto,
        total: qtd * Math.max(0, unitario - desconto),
        custo: qtd * (Number(extra.cost) || 0),
        imei: (line.serials || []).filter(Boolean).join(", "),
        vendedor: String(extra.seller || sale.sellerName || "").trim() || "Sem vendedor",
        loja: sale.lojaNome || "",
      }
    }),
  )
}

function passa(item: LinhaItem, filtros: Filtros) {
  const venda = diaDe(item.at)
  if (filtros.inicio && venda && venda < filtros.inicio) return false
  if (filtros.fim && venda && venda > filtros.fim) return false
  if (!venda && (filtros.inicio || filtros.fim)) return false
  if (filtros.loja && item.loja !== filtros.loja) return false
  if (!casaLista(item.codigo, filtros.codigo)) return false
  if (!casaLista(item.produto, filtros.produto)) return false
  if (filtros.categoria !== "Todas" && item.categoria !== filtros.categoria) return false
  if (filtros.cliente.trim() && !item.sale.customerName.toLowerCase().includes(filtros.cliente.trim().toLowerCase())) return false
  if (filtros.vendedor !== "Todos" && item.vendedor !== filtros.vendedor) return false
  if (filtros.caixa !== "Todos" && item.sale.caixaName !== filtros.caixa) return false
  return true
}

function fechar(itens: LinhaItem[]) {
  return itens.reduce((acc, item) => {
    const venda = item.unitario * item.qtd
    const ajuste = -(item.desconto * item.qtd)
    acc.qtd += item.qtd
    acc.itens += item.qtd
    acc.venda += venda
    acc.ajuste += ajuste
    acc.custo += item.custo
    acc.lucro += venda + ajuste - item.custo
    return acc
  }, { qtd: 0, venda: 0, ajuste: 0, custo: 0, lucro: 0, itens: 0 })
}

function chaveGrupo(item: LinhaItem, tipo: TipoRelatorio) {
  if (tipo === "local" || tipo === "local-resumido" || tipo === "marketplace" || tipo === "loja-grade") return item.loja || "Sem local"
  if (tipo === "operador") return item.sale.caixaName || "Sem caixa"
  if (tipo === "grade" || tipo === "resumido") return item.codigo ? `${item.codigo} — ${item.produto}` : item.produto
  if (tipo === "kits") return "Itens"
  if (tipo === "global") return "Vendas"
  return item.sale.code
}

export function RelatorioItensVenda() {
  const verCusto = useVerCusto()
  const { storeId, storeName, stores } = usePdvSession()
  const lojaAberta = storeName || stores.find((item) => item.id === storeId)?.name || stores[0]?.name || ""
  const inicial = filtrosDoMes()
  const [sales, setSales] = useState<LojaPdvSale[]>([])
  const [hint, setHint] = useState("Carregando...")
  const [draft, setDraft] = useState<Filtros>(inicial)
  const [filtros, setFiltros] = useState<Filtros>(inicial)
  const [detail, setDetail] = useState<LojaPdvSale | null>(null)

  function carregar() {
    setHint("Carregando...")
    listLojaSales("finalizada")
      .then((list) => {
        setSales(list)
        setHint(list.length ? "" : "Nenhuma venda da loja neste relatório.")
      })
      .catch((err) => setHint(parseError(err).friend || "Não foi possível carregar o relatório."))
  }

  useEffect(() => {
    carregar()
  }, [])

  useEffect(() => {
    if (!lojaAberta) return
    setDraft((atual) => atual.loja ? atual : { ...atual, loja: lojaAberta })
    setFiltros((atual) => atual.loja ? atual : { ...atual, loja: lojaAberta })
  }, [lojaAberta])

  const todos = useMemo(() => achatar(sales).map((item) => ({
    ...item,
    loja: item.loja || lojaAberta,
  })), [sales, lojaAberta])
  const categorias = useMemo(
    () => ["Todas", ...[...new Set(todos.map((item) => item.categoria).filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR"))],
    [todos],
  )
  const vendedores = useMemo(
    () => ["Todos", ...[...new Set(todos.map((item) => item.vendedor).filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR"))],
    [todos],
  )
  const caixas = useMemo(
    () => ["Todos", ...[...new Set(sales.map((sale) => sale.caixaName).filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR"))],
    [sales],
  )
  const lojas = useMemo(() => {
    const nomes = stores.map((item) => item.name).filter(Boolean)
    const lista = nomes.length ? nomes : todos.map((item) => item.loja).filter(Boolean)
    return [...new Set(lista)].sort((a, b) => a.localeCompare(b, "pt-BR"))
  }, [stores, todos])
  const visiveis = useMemo(() => todos.filter((item) => passa(item, filtros)), [todos, filtros])
  const soTotal = SO_TOTAL.has(filtros.tipo)
  const grupos = useMemo(() => {
    const mapa = new Map<string, LinhaItem[]>()
    for (const item of visiveis) {
      const chave = chaveGrupo(item, filtros.tipo)
      const lista = mapa.get(chave) || []
      lista.push(item)
      mapa.set(chave, lista)
    }
    return [...mapa.entries()].sort((a, b) => a[0].localeCompare(b[0], "pt-BR"))
  }, [visiveis, filtros.tipo])
  const resumo = useMemo(() => fechar(visiveis), [visiveis])


  function setCampo<K extends keyof Filtros>(chave: K, valor: Filtros[K]) {
    setDraft((atual) => ({ ...atual, [chave]: valor }))
  }

  function aplicar(event: FormEvent) {
    event.preventDefault()
    setFiltros(draft)
    carregar()
  }

  const periodoLongo = intervaloLongo(filtros.inicio, filtros.fim)
  const chips = [
    "Tipo mov.: Venda",
    "Estado mov.: Concluída",
    `Loja: ${filtros.loja || lojaAberta || "—"}`,
    filtros.inicio || filtros.fim ? `Período de ${filtros.inicio ? filtros.inicio.split("-").reverse().join("/") : "…"} a ${filtros.fim ? filtros.fim.split("-").reverse().join("/") : "…"}` : "",
    filtros.vendedor !== "Todos" ? `Vendedor: ${filtros.vendedor}` : "",
  ].filter(Boolean)

  return (
    <div className="pdv-venda-round">
      <FilterPage
        title="ITENS DA VENDA"
        pageClass="pdv-cli-page"
        fields={[]}
        lead={(
          <p className="pdv-itens-aviso">
            A busca dos itens fica no intervalo de até 3 meses. Para um prazo maior, use{" "}
            <Link to="/client/relatorios/venda/resumida">Venda Resumida</Link>.
          </p>
        )}
        extra={(
          <>
            <form className="pdv-cad-filters pdv-cad-filters-itens" onSubmit={aplicar}>
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
                Loja
                <SearchableSelect
                  hideEmpty
                  value={draft.loja || lojaAberta}
                  options={lojas.length ? lojas : [lojaAberta].filter(Boolean)}
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
                  value={TIPOS.find((tipo) => tipo.value === draft.tipo)?.label || "Detalhado"}
                  options={TIPOS.map((tipo) => tipo.label)}
                  onChange={(label) => {
                    const tipo = TIPOS.find((item) => item.label === label)
                    if (tipo) setCampo("tipo", tipo.value)
                  }}
                />
              </label>
              <div className="pdv-cad-filters-go">
                <button className="pdv-cad-btn" type="button" onClick={() => { const limpo = { ...filtrosDoMes(), loja: lojaAberta }; setDraft(limpo); setFiltros(limpo) }}>Limpar</button>
                <button className="pdv-cad-btn pdv-cad-btn-blue" type="submit">Buscar</button>
              </div>
            </form>
            <div className="pdv-itens-chips">
              {chips.map((chip) => <span key={chip}>{chip}</span>)}
            </div>
            {periodoLongo ? <p className="pdv-prod-status">Esse período passa de 3 meses. Para o consolidado, abra Venda Resumida.</p> : null}
            <div className="dre-sheet iv-sheet">
              <table>
                <thead>
                  <tr>
                    <th>Data e Hora</th>
                    <th>Venda</th>
                    <th>Cliente</th>
                    <th>Caixa</th>
                    <th>Vendedor</th>
                    <th>Operador</th>
                    <th>Cód do Produto</th>
                    <th>Produto</th>
                    <th className="iv-num">Qtd</th>
                    <th className="iv-num">Venda (Valor)</th>
                    <th className="iv-num">Desconto/Acréscimo</th>
                    {verCusto ? <th className="iv-num">Custo (Valor)</th> : null}
                    {verCusto ? <th className="iv-num">Lucro</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {grupos.length === 0 ? (
                    <tr>
                      <td className="iv-vazio" colSpan={verCusto ? 13 : 11}>{hint || "Nenhuma venda para o filtro atual."}</td>
                    </tr>
                  ) : grupos.map(([nome, itens], grupo) => {
                    const parcial = fechar(itens)
                    const ajusteClasse = parcial.ajuste < 0 ? "dre-neg" : parcial.ajuste > 0 ? "dre-pos" : ""
                    return (
                      <Fragment key={nome}>
                        {grupo > 0 ? (
                          <tr className="iv-grupo-espaco" aria-hidden="true">
                            <td colSpan={verCusto ? 13 : 11}><span className="iv-grupo-faixa" /></td>
                          </tr>
                        ) : null}
                        <tr className="dre-group">
                          <th colSpan={verCusto ? 13 : 11}>{ROTULO[filtros.tipo]}: {nome}</th>
                        </tr>
                        {soTotal ? null : itens.map((item, index) => {
                          const ajuste = -(item.desconto * item.qtd)
                          const lucro = item.unitario * item.qtd + ajuste - item.custo
                          const custoUnit = item.qtd ? item.custo / item.qtd : 0
                          const anterior = index > 0 ? itens[index - 1] : null
                          const mudaVenda = !!anterior && anterior.sale.id !== item.sale.id
                          const mudaCliente = !!anterior && (anterior.sale.customerName || "") !== (item.sale.customerName || "")
                          return (
                            <Fragment key={`${nome}-${item.sale.id}-${item.codigo}-${index}`}>
                            {mudaVenda || mudaCliente ? (
                              <tr className="iv-grupo-espaco" aria-hidden="true">
                                <td colSpan={verCusto ? 13 : 11}><span className="iv-grupo-faixa" /></td>
                              </tr>
                            ) : null}
                            <tr>
                              <td>{when(item.at)}</td>
                              <td>
                                <button className="iv-venda-abre" type="button" onClick={() => setDetail(item.sale)}>{item.sale.code}</button>
                              </td>
                              <td>{item.sale.customerName || "—"}</td>
                              <td>{item.sale.caixaName || "—"}</td>
                              <td>{item.vendedor}</td>
                              <td>—</td>
                              <td>{item.codigo || "—"}</td>
                              <td>{item.produto}</td>
                              <td className="iv-num">{qtdTexto(item.qtd)}</td>
                              <td className="iv-num">{formatMoneyRs(item.unitario)}</td>
                              <td className={`iv-num ${ajuste < 0 ? "dre-neg" : ajuste > 0 ? "dre-pos" : ""}`}>{formatMoneyRs(ajuste)}</td>
                              {verCusto ? <td className="iv-num">{formatMoneyRs(custoUnit)}</td> : null}
                              {verCusto ? <td className={`iv-num ${lucro < 0 ? "dre-neg" : "dre-pos"}`}>{formatMoneyRs(lucro)}</td> : null}
                            </tr>
                            </Fragment>
                          )
                        })}
                        <tr className="dre-strong iv-total-grupo">
                          <th colSpan={8}>Total ({nome})</th>
                          <td className="iv-num">{qtdTexto(parcial.qtd)}</td>
                          <td className="iv-num">{formatMoneyRs(parcial.venda)}</td>
                          <td className={`iv-num ${ajusteClasse}`}>{formatMoneyRs(parcial.ajuste)}</td>
                          {verCusto ? <td className="iv-num">{formatMoneyRs(parcial.custo)}</td> : null}
                          {verCusto ? <td className={`iv-num ${parcial.lucro < 0 ? "dre-neg" : "dre-pos"}`}>{formatMoneyRs(parcial.lucro)}</td> : null}
                        </tr>
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {grupos.length ? <PainelTotalizadores resumo={resumo} mostrarCusto={verCusto} /> : null}
          </>
        )}
        columns={[]}
        hideList
        hint={hint || undefined}
      />
      {detail ? <SaleDetailPanel sale={detail} onClose={() => setDetail(null)} /> : null}
    </div>
  )
}

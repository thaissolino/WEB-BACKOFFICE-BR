import { Component, Fragment, FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { api, parseError } from "../../services/api";
import { todayIso } from "../../utils/todayIso";
import GestaoShell from "./GestaoShell";
import { DatePreset } from "../client/cadastros/catalog/FormBits";
import SearchableSelect from "../client/cadastros/produtos/SearchableSelect";
import "./gestao-pages.css";
import { PainelTotalizadores, type ResumoVenda } from "./TotalizadoresVenda";
import { SaleDetailPanel, type LojaPdvSale } from "../client/movimentacoes/LojaVendasPainel";
import "../client/cadastros/cadastros.css";

type Line = { name: string; code: string; price: number; qty: number; cost?: number; category?: string; discount?: number };
type Buyer = { name: string; document?: string };
type Order = {
  id: string;
  lines: Line[];
  total: number;
  createdAt: string;
  closedAt: string | null;
  client: Buyer | null;
  estornada?: boolean;
  address?: { titulo?: string; nome?: string };
};
type LojaSale = {
  id: string;
  code: string;
  caixaName: string;
  customerName: string;
  sellerName: string;
  lines: Line[];
  createdAt: string;
  finalizedAt: string | null;
};
type LojistaOpcao = { id: string; name: string };

type ItemVenda = {
  at: string;
  venda: string;
  cliente: string;
  clienteCodigo: string;
  caixa: string;
  operador: string;
  loja: string;
  canal: string;
  categoria: string;
  codigo: string;
  produto: string;
  qtd: number;
  compra: number;
  vendaValor: number;
  desconto: number;
  acrescimo: number;
  lucro: number;
  vendedor: string;
  estornada: boolean;
  aberta: string;
  folha: LojaPdvSale;
};

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
  | "global";

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
];

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
};

const SO_TOTAL = new Set<TipoRelatorio>(["resumido", "local-resumido", "global"]);

type Filtros = {
  inicio: string;
  fim: string;
  codigo: string;
  produto: string;
  categoria: string;
  venda: string;
  cliente: string;
  vendedor: string;
  caixa: string;
  loja: string;
  tipo: TipoRelatorio;
};

const VAZIO: Filtros = {
  inicio: "",
  fim: "",
  codigo: "",
  produto: "",
  categoria: "Todas",
  venda: "",
  cliente: "",
  vendedor: "Todos",
  caixa: "Todos",
  loja: "estoque",
  tipo: "detalhado",
};

function filtrosDoDia(): Filtros {
  const hoje = todayIso();
  return { ...VAZIO, inicio: `${hoje.slice(0, 8)}01`, fim: hoje };
}

function money(value: number) {
  const numero = Number(value);
  if (!Number.isFinite(numero)) return "R$ 0,00";
  return numero.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function texto(value: unknown) {
  if (value === null || value === undefined) return "";
  return typeof value === "string" ? value : String(value);
}

function when(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("pt-BR");
}

function termos(valor: string) {
  return valor.split(/[,;]/).map((item) => item.trim().toLowerCase()).filter(Boolean);
}

function casaLista(textoCampo: string, valor: string) {
  const lista = termos(texto(valor));
  if (!lista.length) return true;
  const hay = texto(textoCampo).toLowerCase();
  return lista.some((termo) => hay.includes(termo));
}

function inPeriod(at: string, filtros: Filtros) {
  const date = new Date(at);
  if (Number.isNaN(date.getTime())) return !filtros.inicio && !filtros.fim;
  if (filtros.inicio) {
    const start = new Date(`${filtros.inicio}T00:00:00`);
    if (date < start) return false;
  }
  if (filtros.fim) {
    const end = new Date(`${filtros.fim}T23:59:59`);
    if (date > end) return false;
  }
  return true;
}

function nomesDe(lista: unknown, extra: unknown[]) {
  const nomes = new Set<string>();
  const origem = Array.isArray(lista) ? [...lista, ...extra] : extra;
  for (const item of origem) {
    const nome = texto(item).trim();
    if (nome && nome !== "—") nomes.add(nome);
  }
  return [...nomes].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

function pedidoCompleto(parcial: Partial<Filtros>): Filtros {
  return { ...VAZIO, ...parcial, tipo: parcial.tipo || VAZIO.tipo };
}

function passa(item: ItemVenda, filtros: Filtros) {
  if (!inPeriod(item.at, filtros)) return false;
  if (!casaLista(texto(item.codigo), texto(filtros.codigo))) return false;
  if (!casaLista(texto(item.produto), texto(filtros.produto))) return false;
  if (filtros.categoria !== "Todas" && texto(item.categoria) !== filtros.categoria) return false;
  if (!casaLista(texto(item.venda), texto(filtros.venda))) return false;
  if (!casaLista(texto(item.cliente), texto(filtros.cliente))) return false;
  if (filtros.vendedor !== "Todos" && texto(item.vendedor) !== filtros.vendedor) return false;
  if (filtros.caixa !== "Todos" && texto(item.caixa) !== filtros.caixa) return false;
  return true;
}

function classeCelula(valor: string | number, numerica = false, extra = "") {
  const texto = String(valor).trim();
  const traco = texto === "—" || texto === "-" || texto === "–";
  return [numerica ? "iv-num" : "", traco ? "iv-traco" : "", extra].filter(Boolean).join(" ");
}

function ajusteDe(item: { desconto: number; acrescimo: number }) {
  return (Number(item.acrescimo) || 0) - (Number(item.desconto) || 0);
}

function folhaDaLoja(sale: LojaSale): LojaPdvSale {
  const bruto = sale as LojaSale & Partial<LojaPdvSale>;
  const lines = comoLista<Line & { productId?: string; serials?: string[] }>(sale.lines).map((line, index) => ({
    productId: texto(line.productId) || `${texto(line.code)}-${index}`,
    code: texto(line.code),
    name: texto(line.name) || "—",
    qty: Number(line.qty) || 0,
    price: Number(line.price) || 0,
    discount: Number(line.discount) || 0,
    category: texto(line.category),
    serials: line.serials,
  }));
  const totalLinhas = lines.reduce((soma, line) => soma + line.qty * Math.max(0, line.price - line.discount), 0);
  const total = Number(bruto.total) || totalLinhas;
  return {
    id: texto(sale.id),
    code: texto(sale.code) || texto(sale.id).slice(0, 8).toUpperCase() || "—",
    caixaCode: Number(bruto.caixaCode) || 0,
    caixaName: texto(sale.caixaName),
    status: bruto.status || "finalizada",
    customerName: texto(sale.customerName) || "Consumidor final",
    sellerName: texto(sale.sellerName),
    notes: bruto.notes,
    lojaNome: bruto.lojaNome,
    lines,
    payments: Array.isArray(bruto.payments) ? bruto.payments : [],
    total,
    received: Number(bruto.received) || total,
    changeAmount: Number(bruto.changeAmount) || 0,
    stockPosted: bruto.stockPosted !== false,
    createdAt: texto(sale.createdAt),
    finalizedAt: sale.finalizedAt,
  };
}

function folhaDoPedido(order: Order): LojaPdvSale {
  const lines = comoLista<Line>(order.lines).map((line, index) => ({
    productId: `${texto(line.code)}-${index}`,
    code: texto(line.code),
    name: texto(line.name) || "—",
    qty: Number(line.qty) || 0,
    price: Number(line.price) || 0,
    discount: Number(line.discount) || 0,
    category: texto(line.category),
  }));
  const total = Number(order.total) || lines.reduce((soma, line) => soma + line.qty * Math.max(0, line.price - line.discount), 0);
  return {
    id: texto(order.id),
    code: texto(order.id).slice(0, 8).toUpperCase() || "—",
    caixaCode: 0,
    caixaName: "",
    status: order.estornada ? "estornada" : "finalizada",
    customerName: texto(order.address?.nome) || "Consumidor final",
    sellerName: "",
    lines,
    payments: [],
    total,
    received: total,
    changeAmount: 0,
    stockPosted: true,
    createdAt: texto(order.createdAt),
    finalizedAt: texto(order.closedAt) || null,
  };
}

function montarLinha(base: Omit<ItemVenda, "lucro" | "qtd" | "compra" | "vendaValor" | "desconto" | "acrescimo"> & {
  qtd: number;
  compra: number;
  vendaValor: number;
  desconto: number;
  acrescimo: number;
}): ItemVenda {
  const lucro = (base.vendaValor - base.compra) * base.qtd - base.desconto + base.acrescimo;
  return { ...base, lucro };
}

function comoLista<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return Array.isArray(parsed) ? parsed as T[] : [];
    } catch {
      return [];
    }
  }
  return [];
}

function flatten(orders: Order[]): ItemVenda[] {
  return comoLista<Order>(orders).flatMap((order) => {
    if (!order) return [];
    const lojista = texto(order.client?.name) || "—";
    const folha = folhaDoPedido(order);
    return comoLista<Line>(order.lines).map((line) => {
      const qtd = Number(line?.qty) || 0;
      const vendaValor = Number(line?.price) || 0;
      const compra = Number(line?.cost) || 0;
      return montarLinha({
        at: texto(order.closedAt || order.createdAt),
        venda: texto(order.id).slice(0, 8).toUpperCase() || "—",
        cliente: "—",
        clienteCodigo: "",
        caixa: "—",
        operador: "—",
        loja: "ESTOQUE GERAL",
        aberta: texto(order.createdAt),
        canal: lojista,
        categoria: texto(line?.category) || "—",
        codigo: texto(line?.code) || "—",
        produto: texto(line?.name) || "—",
        qtd,
        compra,
        vendaValor,
        desconto: 0,
        acrescimo: 0,
        vendedor: "—",
        estornada: !!order.estornada,
        folha,
      });
    });
  });
}

function flattenLoja(sales: LojaSale[], loja: string): ItemVenda[] {
  return comoLista<LojaSale>(sales).flatMap((sale) => {
    if (!sale) return [];
    const folha = folhaDaLoja(sale);
    return comoLista<Line>(sale?.lines).map((line) => {
      const qtd = Number(line?.qty) || 0;
      const vendaValor = Number(line?.price) || 0;
      const desconto = (Number(line?.discount) || 0) * qtd;
      return montarLinha({
        at: texto(sale.finalizedAt || sale.createdAt),
        venda: texto(sale?.code) || texto(sale?.id).slice(0, 8).toUpperCase() || "—",
        cliente: texto(sale?.customerName) || "Consumidor final",
        clienteCodigo: "",
        caixa: texto(sale?.caixaName) || "—",
        operador: "—",
        loja,
        canal: loja,
        categoria: texto(line?.category) || "—",
        codigo: texto(line?.code) || "—",
        produto: texto(line?.name) || "—",
        qtd,
        compra: Number(line?.cost) || 0,
        vendaValor,
        desconto,
        acrescimo: 0,
        vendedor: texto(sale?.sellerName) || "—",
        estornada: false,
        aberta: texto(sale?.createdAt),
        folha,
      });
    });
  });
}

function chaveGrupo(item: ItemVenda, tipo: TipoRelatorio) {
  if (tipo === "marketplace" || tipo === "local" || tipo === "local-resumido") return item.canal || "Sem local";
  if (tipo === "operador") return item.operador || "Sem operador";
  if (tipo === "grade" || tipo === "resumido") return item.codigo && item.codigo !== "—" ? `${item.codigo} — ${item.produto}` : item.produto;
  if (tipo === "loja-grade") return item.loja || "Sem loja";
  if (tipo === "kits") return "Itens";
  if (tipo === "global") return "Vendas";
  return texto(item.venda) || "—";
}

class RelatorioErro extends Component<{ children: ReactNode }, { erro: string }> {
  state = { erro: "" };

  static getDerivedStateFromError(error: unknown) {
    const mensagem = error instanceof Error ? error.message : "";
    return { erro: mensagem || "Não foi possível montar o relatório." };
  }

  render() {
    if (this.state.erro) {
      return (
        <GestaoShell title="ITENS DAS VENDAS" subtitle="Venda detalhada, no mesmo quadro do WM10.">
          <p className="iv-vazio">{this.state.erro}</p>
        </GestaoShell>
      );
    }
    return this.props.children;
  }
}

function ItensVendasTela() {
  const [itens, setItens] = useState<ItemVenda[]>([]);
  const [hint, setHint] = useState("Clique em Buscar para carregar.");
  const [carregando, setCarregando] = useState(false);
  const [pronto, setPronto] = useState(false);
  const [draft, setDraft] = useState<Filtros>(filtrosDoDia);
  const [filtros, setFiltros] = useState<Filtros>(filtrosDoDia);
  const [lojistas, setLojistas] = useState<LojistaOpcao[]>([]);
  const [opcoes, setOpcoes] = useState<{
    vendedores: string[];
    caixas: string[];
    categorias: string[];
  }>({ vendedores: [], caixas: [], categorias: [] });
  const [detail, setDetail] = useState<LojaPdvSale | null>(null);

  useEffect(() => {
    api.get("/backoffice/lojistas")
      .then(({ data }) => {
        const rows = (data?.lojistas || []) as LojistaOpcao[];
        setLojistas(rows.filter((item) => item.id && item.name));
      })
      .catch(() => setLojistas([]));
  }, []);

  useEffect(() => {
    api.get("/backoffice/itens-vendas/opcoes", { params: { loja: draft.loja } })
      .then(({ data }) => {
        setOpcoes({
          vendedores: data?.vendedores || [],
          caixas: data?.caixas || [],
          categorias: data?.categorias || [],
        });
      })
      .catch(() => setOpcoes({ vendedores: [], caixas: [], categorias: [] }));
  }, [draft.loja]);

  const categorias = useMemo(
    () => ["Todas", ...nomesDe(opcoes.categorias, itens.map((item) => item.categoria))],
    [opcoes.categorias, itens],
  );
  const vendedores = useMemo(
    () => ["Todos", ...nomesDe(opcoes.vendedores, itens.map((item) => item.vendedor))],
    [opcoes.vendedores, itens],
  );
  const caixas = useMemo(
    () => ["Todos", ...nomesDe(opcoes.caixas, itens.map((item) => item.caixa))],
    [opcoes.caixas, itens],
  );

  const visiveis = useMemo(
    () => (pronto ? itens.filter((item) => passa(item, filtros)) : []),
    [itens, filtros, pronto],
  );
  const grupos = useMemo(() => {
    const map = new Map<string, ItemVenda[]>();
    for (const item of visiveis) {
      const chave = chaveGrupo(item, filtros.tipo);
      const lista = map.get(chave) || [];
      lista.push(item);
      map.set(chave, lista);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0], "pt-BR"));
  }, [visiveis, filtros.tipo]);
  const resumo = useMemo<ResumoVenda>(() => {
    const venda = visiveis.reduce((sum, item) => sum + item.vendaValor * item.qtd, 0);
    const custo = visiveis.reduce((sum, item) => sum + item.compra * item.qtd, 0);
    const lucro = visiveis.reduce((sum, item) => sum + item.lucro, 0);
    const itensQtd = visiveis.reduce((sum, item) => sum + item.qtd, 0);
    return { venda, custo, lucro, itens: itensQtd };
  }, [visiveis]);

  function setCampo<K extends keyof Filtros>(key: K, value: Filtros[K]) {
    setDraft((atual) => ({ ...atual, [key]: value }));
  }

  async function linhasDoEstoque() {
    const { data } = await api.get("/backoffice/vendas-concluidas");
    return flatten((data?.orders || []) as Order[]);
  }

  async function buscar(event: FormEvent) {
    event.preventDefault();
    setCarregando(true);
    setItens([]);
    setPronto(false);
    setHint("Carregando...");
    try {
      const rows = draft.loja === "estoque"
        ? await linhasDoEstoque()
        : flattenLoja(
          ((await api.get(`/backoffice/lojistas/${draft.loja}/vendas`)).data?.sales || []) as LojaSale[],
          lojistas.find((item) => item.id === draft.loja)?.name || "Loja",
        );
      setItens(rows);
      setFiltros(pedidoCompleto(draft));
      setPronto(true);
      setHint(rows.length ? "" : "Nenhuma venda concluída.");
    } catch (err) {
      setItens([]);
      setPronto(false);
      setHint(parseError(err).friend || "Não foi possível carregar as vendas.");
    } finally {
      setCarregando(false);
    }
  }

  function limpar() {
    const base = filtrosDoDia();
    setDraft(base);
    setFiltros(base);
    setItens([]);
    setPronto(false);
    setHint("Clique em Buscar para carregar.");
  }

  function escolherPeriodo(inicio: string, fim: string) {
    setDraft((atual) => ({ ...atual, inicio, fim }));
  }

  return (
    <GestaoShell title="ITENS DAS VENDAS" subtitle="Venda detalhada, no mesmo quadro do WM10.">
      <form className="iv-filtros" onSubmit={buscar}>
        <label>
          Data da venda início
          <span className="pdv-date-field">
            <input type="date" value={draft.inicio} onChange={(event) => setCampo("inicio", event.target.value)} />
            <DatePreset onPick={escolherPeriodo} />
          </span>
        </label>
        <label>
          Data da venda fim
          <span className="pdv-date-field">
            <input type="date" value={draft.fim} onChange={(event) => setCampo("fim", event.target.value)} />
            <DatePreset onPick={escolherPeriodo} />
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
          Loja
          <SearchableSelect
            hideEmpty
            value={draft.loja === "estoque" ? "ESTOQUE GERAL" : (lojistas.find((item) => item.id === draft.loja)?.name || "ESTOQUE GERAL")}
            options={["ESTOQUE GERAL", ...lojistas.map((item) => item.name)]}
            onChange={(nome) => setDraft((atual) => ({
              ...atual,
              loja: nome === "ESTOQUE GERAL" ? "estoque" : (lojistas.find((item) => item.name === nome)?.id || "estoque"),
              vendedor: "Todos",
              caixa: "Todos",
              categoria: "Todas",
            }))}
          />
        </label>
        <label>
          Tipo de relatório
          <SearchableSelect
            hideEmpty
            value={TIPOS.find((tipo) => tipo.value === draft.tipo)?.label || "Detalhado"}
            options={TIPOS.map((tipo) => tipo.label)}
            onChange={(label) => {
              const tipo = TIPOS.find((item) => item.label === label);
              if (tipo) setCampo("tipo", tipo.value);
            }}
          />
        </label>
        <div className="iv-acoes">
          <button type="button" className="iv-limpar" onClick={limpar} disabled={carregando}>Limpar</button>
          <button type="submit" disabled={carregando}>{carregando ? "Buscando..." : "Buscar"}</button>
        </div>
      </form>

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
              <th className="iv-num">Custo (Valor)</th>
              <th className="iv-num">Lucro</th>
            </tr>
          </thead>
          <tbody>
            {grupos.length === 0 ? (
              <tr>
                <td className="iv-vazio" colSpan={13}>{hint || "Nenhuma venda para o filtro atual."}</td>
              </tr>
            ) : (
              grupos.map(([nome, linhas], grupo) => {
                const qtd = linhas.reduce((sum, item) => sum + item.qtd, 0);
                const compra = linhas.reduce((sum, item) => sum + item.compra * item.qtd, 0);
                const vendaValor = linhas.reduce((sum, item) => sum + item.vendaValor * item.qtd, 0);
                const ajuste = linhas.reduce((sum, item) => sum + ajusteDe(item), 0);
                const lucro = linhas.reduce((sum, item) => sum + item.lucro, 0);
                const resumido = SO_TOTAL.has(filtros.tipo);
                return (
                  <Fragment key={nome}>
                    {grupo > 0 ? (
                      <tr className="iv-grupo-espaco" aria-hidden="true">
                        <td colSpan={13}><span className="iv-grupo-faixa" /></td>
                      </tr>
                    ) : null}
                    <tr className="dre-group">
                      <th colSpan={13}>{ROTULO[filtros.tipo]}: {nome}</th>
                    </tr>
                    {resumido ? null : linhas.map((item, index) => {
                      const ajuste = money(ajusteDe(item));
                      const lucro = money(item.lucro);
                      const anterior = index > 0 ? linhas[index - 1] : null;
                      const quebra = !!anterior && (anterior.venda !== item.venda || anterior.cliente !== item.cliente);
                      return (
                      <Fragment key={`${nome}-${item.venda}-${item.codigo}-${index}`}>
                      {quebra ? (
                        <tr className="iv-grupo-espaco" aria-hidden="true">
                          <td colSpan={13}><span className="iv-grupo-faixa" /></td>
                        </tr>
                      ) : null}
                      <tr>
                        <td className={classeCelula(when(item.at))}>{when(item.at)}</td>
                        <td className={classeCelula(item.venda)}>
                          <button className="iv-venda-abre" type="button" onClick={() => setDetail(item.folha)}>{item.venda}</button>
                        </td>
                        <td className={classeCelula(item.cliente)}>{item.cliente}</td>
                        <td className={classeCelula(item.caixa)}>{item.caixa}</td>
                        <td className={classeCelula(item.vendedor)}>{item.vendedor}</td>
                        <td className={classeCelula(item.operador)}>{item.operador}</td>
                        <td className={classeCelula(item.codigo)}>{item.codigo}</td>
                        <td className={classeCelula(item.produto)}>{item.produto}</td>
                        <td className={classeCelula(item.qtd, true)}>{item.qtd}</td>
                        <td className={classeCelula(money(item.vendaValor), true)}>{money(item.vendaValor)}</td>
                        <td className={classeCelula(ajuste, true, ajusteDe(item) < 0 ? "dre-neg" : ajusteDe(item) > 0 ? "dre-pos" : "")}>{ajuste}</td>
                        <td className={classeCelula(money(item.compra), true)}>{money(item.compra)}</td>
                        <td className={classeCelula(lucro, true, item.lucro < 0 ? "dre-neg" : "dre-pos")}>{lucro}</td>
                      </tr>
                      </Fragment>
                      );
                    })}
                    <tr className="dre-strong iv-total-grupo">
                      <th colSpan={8}>Total ({nome})</th>
                      <td className="iv-num">{qtd}</td>
                      <td className="iv-num">{money(vendaValor)}</td>
                      <td className={`iv-num ${ajuste < 0 ? "dre-neg" : ajuste > 0 ? "dre-pos" : ""}`}>{money(ajuste)}</td>
                      <td className="iv-num">{money(compra)}</td>
                      <td className={`iv-num ${lucro < 0 ? "dre-neg" : "dre-pos"}`}>{money(lucro)}</td>
                    </tr>
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {grupos.length ? <PainelTotalizadores resumo={resumo} mostrarCusto /> : null}
      {detail ? <SaleDetailPanel sale={detail} onClose={() => setDetail(null)} /> : null}
    </GestaoShell>
  );
}

export default function ItensVendas() {
  return (
    <RelatorioErro>
      <ItensVendasTela />
    </RelatorioErro>
  );
}

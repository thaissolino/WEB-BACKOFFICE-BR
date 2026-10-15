import { Fragment, FormEvent, useEffect, useMemo, useState } from "react";
import { api, parseError } from "../../services/api";
import { todayIso } from "../../utils/todayIso";
import GestaoShell from "./GestaoShell";
import { DatePreset } from "../client/cadastros/catalog/FormBits";
import "./gestao-pages.css";

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
  loja: string;
  vendedor: string;
  operador: string;
  categoria: string;
  venda: string;
  clienteCodigo: string;
  cliente: string;
  tipo: TipoRelatorio;
};

const VAZIO: Filtros = {
  inicio: "",
  fim: "",
  codigo: "",
  produto: "",
  loja: "estoque",
  vendedor: "",
  operador: "",
  categoria: "",
  venda: "",
  clienteCodigo: "",
  cliente: "",
  tipo: "marketplace",
};

function filtrosDoDia(): Filtros {
  const hoje = todayIso();
  return { ...VAZIO, inicio: hoje, fim: hoje };
}

function money(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function when(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("pt-BR");
}

function has(value: string, query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return value.toLowerCase().includes(needle);
}

function igual(value: string, query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return value.trim().toLowerCase() === needle;
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

function passa(item: ItemVenda, filtros: Filtros) {
  if (!inPeriod(item.at, filtros)) return false;
  if (!has(item.codigo, filtros.codigo)) return false;
  if (!has(item.produto, filtros.produto)) return false;
  if (!igual(item.vendedor, filtros.vendedor)) return false;
  if (!igual(item.operador, filtros.operador)) return false;
  if (!igual(item.categoria, filtros.categoria)) return false;
  if (!has(item.venda, filtros.venda)) return false;
  if (!has(item.clienteCodigo, filtros.clienteCodigo)) return false;
  if (!has(item.cliente, filtros.cliente)) return false;
  return true;
}

function ajusteDe(item: { desconto: number; acrescimo: number }) {
  return (Number(item.acrescimo) || 0) - (Number(item.desconto) || 0);
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

function flatten(orders: Order[]): ItemVenda[] {
  return orders.flatMap((order) => {
    const lojista = order.client?.name || "—";
    return (order.lines || []).map((line) => {
      const qtd = Number(line.qty) || 0;
      const vendaValor = Number(line.price) || 0;
      const compra = Number(line.cost) || 0;
      return montarLinha({
        at: order.closedAt || order.createdAt,
        venda: order.id.slice(0, 8).toUpperCase(),
        cliente: "—",
        clienteCodigo: "",
        caixa: "—",
        operador: "—",
        loja: "Estoque",
        canal: lojista,
        categoria: line.category || "—",
        codigo: line.code || "—",
        produto: line.name || "—",
        qtd,
        compra,
        vendaValor,
        desconto: 0,
        acrescimo: 0,
        vendedor: "—",
        estornada: !!order.estornada,
      });
    });
  });
}

function flattenLoja(sales: LojaSale[], loja: string): ItemVenda[] {
  return sales.flatMap((sale) =>
    (sale.lines || []).map((line) => {
      const qtd = Number(line.qty) || 0;
      const vendaValor = Number(line.price) || 0;
      const desconto = (Number(line.discount) || 0) * qtd;
      return montarLinha({
        at: sale.finalizedAt || sale.createdAt,
        venda: sale.code || sale.id.slice(0, 8).toUpperCase(),
        cliente: sale.customerName || "Consumidor final",
        clienteCodigo: "",
        caixa: sale.caixaName || "—",
        operador: "—",
        loja,
        canal: loja,
        categoria: line.category || "—",
        codigo: line.code || "—",
        produto: line.name || "—",
        qtd,
        compra: Number(line.cost) || 0,
        vendaValor,
        desconto,
        acrescimo: 0,
        vendedor: sale.sellerName || "—",
        estornada: false,
      });
    }),
  );
}

function Completa({
  value,
  options,
  onChange,
}: {
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const needle = value.trim().toLowerCase();
  const sugestoes = needle
    ? options.filter((item) => item.toLowerCase().includes(needle) && item.toLowerCase() !== needle).slice(0, 8)
    : [];
  return (
    <span className="iv-completa">
      <input
        value={value}
        autoComplete="off"
        onChange={(event) => {
          onChange(event.target.value);
          setAberto(true);
        }}
        onFocus={() => setAberto(true)}
        onBlur={() => window.setTimeout(() => setAberto(false), 120)}
      />
      {aberto && sugestoes.length ? (
        <ul>
          {sugestoes.map((item) => (
            <li key={item}>
              <button
                type="button"
                onMouseDown={(event) => {
                  event.preventDefault();
                  onChange(item);
                  setAberto(false);
                }}
              >
                {item}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </span>
  );
}

function chaveGrupo(item: ItemVenda, tipo: TipoRelatorio) {
  if (tipo === "marketplace" || tipo === "local" || tipo === "local-resumido") return item.canal || "Sem local";
  if (tipo === "operador") return item.operador || "Sem operador";
  if (tipo === "grade" || tipo === "resumido") return item.codigo && item.codigo !== "—" ? `${item.codigo} — ${item.produto}` : item.produto;
  if (tipo === "loja-grade") return item.loja || "Sem loja";
  if (tipo === "kits") return "Itens";
  if (tipo === "global") return "Vendas";
  return item.venda;
}

export default function ItensVendas() {
  const [itens, setItens] = useState<ItemVenda[]>([]);
  const [hint, setHint] = useState("Clique em Filtrar para carregar.");
  const [carregando, setCarregando] = useState(false);
  const [pronto, setPronto] = useState(false);
  const [draft, setDraft] = useState<Filtros>(filtrosDoDia);
  const [filtros, setFiltros] = useState<Filtros>(filtrosDoDia);
  const [lojistas, setLojistas] = useState<LojistaOpcao[]>([]);
  const [opcoes, setOpcoes] = useState<{
    vendedores: string[];
    operadores: string[];
    categorias: string[];
    produtos: Array<{ code: string; name: string }>;
  }>({ vendedores: [], operadores: [], categorias: [], produtos: [] });

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
          operadores: data?.operadores || [],
          categorias: data?.categorias || [],
          produtos: data?.produtos || [],
        });
      })
      .catch(() => setOpcoes({ vendedores: [], operadores: [], categorias: [], produtos: [] }));
  }, [draft.loja]);

  const codigos = useMemo(
    () => [...new Set(opcoes.produtos.map((item) => item.code).filter(Boolean))],
    [opcoes.produtos],
  );
  const nomesProduto = useMemo(
    () => [...new Set(opcoes.produtos.map((item) => item.name).filter(Boolean))],
    [opcoes.produtos],
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

  function setCampo<K extends keyof Filtros>(key: K, value: Filtros[K]) {
    setDraft((atual) => ({ ...atual, [key]: value }));
  }

  async function linhasDoEstoque() {
    let lista = lojistas;
    if (!lista.length) {
      const cadastro = await api.get("/backoffice/lojistas");
      lista = ((cadastro.data?.lojistas || []) as LojistaOpcao[]).filter((item) => item.id && item.name);
      setLojistas(lista);
    }
    const { data } = await api.get("/backoffice/vendas-concluidas");
    const atacado = flatten((data?.orders || []) as Order[]);
    const daLoja = await Promise.all(
      lista.map(async (lojista) => {
        try {
          const resposta = await api.get(`/backoffice/lojistas/${lojista.id}/vendas`);
          return flattenLoja((resposta.data?.sales || []) as LojaSale[], lojista.name);
        } catch {
          return [];
        }
      }),
    );
    return [...atacado, ...daLoja.flat()];
  }

  async function buscar(event: FormEvent) {
    event.preventDefault();
    if (carregando) return;
    setCarregando(true);
    setHint("Carregando...");
    try {
      const rows = draft.loja === "estoque"
        ? await linhasDoEstoque()
        : flattenLoja(
          ((await api.get(`/backoffice/lojistas/${draft.loja}/vendas`)).data?.sales || []) as LojaSale[],
          lojistas.find((item) => item.id === draft.loja)?.name || "Loja",
        );
      setItens(rows);
      setFiltros(draft);
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
    setHint("Clique em Filtrar para carregar.");
  }

  function escolherPeriodo(inicio: string, fim: string) {
    setDraft((atual) => ({ ...atual, inicio, fim }));
  }

  return (
    <GestaoShell title="ITENS DAS VENDAS" subtitle="Venda detalhada, no mesmo quadro do WM10.">
      <form className="iv-filtros" onSubmit={buscar}>
        <label>
          Data início
          <span className="pdv-date-field">
            <input type="date" value={draft.inicio} onChange={(event) => setCampo("inicio", event.target.value)} />
            <DatePreset onPick={escolherPeriodo} />
          </span>
        </label>
        <label>
          Data fim
          <span className="pdv-date-field">
            <input type="date" value={draft.fim} onChange={(event) => setCampo("fim", event.target.value)} />
            <DatePreset onPick={escolherPeriodo} />
          </span>
        </label>
        <label>
          Cód. do produto
          <Completa value={draft.codigo} options={codigos} onChange={(value) => setCampo("codigo", value)} />
        </label>
        <label>
          Produto
          <Completa value={draft.produto} options={nomesProduto} onChange={(value) => setCampo("produto", value)} />
        </label>
        <label>
          Loja
          <select
            value={draft.loja}
            onChange={(event) => setDraft((atual) => ({
              ...atual,
              loja: event.target.value,
              vendedor: "",
              operador: "",
              categoria: "",
            }))}
          >
            <option value="estoque">Estoque</option>
            {lojistas.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
        </label>
        <label>
          Vendedor
          <select value={draft.vendedor} onChange={(event) => setCampo("vendedor", event.target.value)}>
            <option value="">Todos</option>
            {opcoes.vendedores.map((nome) => (
              <option key={nome} value={nome}>{nome}</option>
            ))}
          </select>
        </label>
        <label>
          Operador
          <select value={draft.operador} onChange={(event) => setCampo("operador", event.target.value)}>
            <option value="">Todos</option>
            {opcoes.operadores.map((nome) => (
              <option key={nome} value={nome}>{nome}</option>
            ))}
          </select>
        </label>
        <label>
          Categoria
          <select value={draft.categoria} onChange={(event) => setCampo("categoria", event.target.value)}>
            <option value="">Todas</option>
            {opcoes.categorias.map((nome) => (
              <option key={nome} value={nome}>{nome}</option>
            ))}
          </select>
        </label>
        <label>Código da venda<input value={draft.venda} onChange={(event) => setCampo("venda", event.target.value)} /></label>
        <label>Código do cliente<input value={draft.clienteCodigo} onChange={(event) => setCampo("clienteCodigo", event.target.value)} /></label>
        <label>Nome do cliente<input value={draft.cliente} onChange={(event) => setCampo("cliente", event.target.value)} /></label>
        <label>
          Tipo de relatório
          <select value={draft.tipo} onChange={(event) => setCampo("tipo", event.target.value as TipoRelatorio)}>
            {TIPOS.map((tipo) => (
              <option key={tipo.value} value={tipo.value}>{tipo.label}</option>
            ))}
          </select>
        </label>
        <div className="iv-acoes">
          <button type="submit" disabled={carregando}>{carregando ? "Filtrando..." : "Filtrar"}</button>
          <button type="button" className="iv-limpar" onClick={limpar} disabled={carregando}>
            Limpar
          </button>
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
                        <td colSpan={13}>&nbsp;</td>
                      </tr>
                    ) : null}
                    <tr className="dre-group">
                      <th colSpan={13}>{ROTULO[filtros.tipo]}: {nome}</th>
                    </tr>
                    {resumido ? null : linhas.map((item, index) => (
                      <tr key={`${nome}-${item.venda}-${item.codigo}-${index}`}>
                        <td>{when(item.at)}</td>
                        <td>{item.venda}</td>
                        <td>{item.cliente}</td>
                        <td>{item.caixa}</td>
                        <td>{item.vendedor}</td>
                        <td>{item.operador}</td>
                        <td>{item.codigo}</td>
                        <td>{item.produto}</td>
                        <td className="iv-num">{item.qtd}</td>
                        <td className="iv-num">{money(item.vendaValor)}</td>
                        <td className={`iv-num ${ajusteDe(item) < 0 ? "dre-neg" : ajusteDe(item) > 0 ? "dre-pos" : ""}`}>{money(ajusteDe(item))}</td>
                        <td className="iv-num">{money(item.compra)}</td>
                        <td className={`iv-num ${item.lucro < 0 ? "dre-neg" : "dre-pos"}`}>{money(item.lucro)}</td>
                      </tr>
                    ))}
                    <tr className="dre-strong">
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
    </GestaoShell>
  );
}

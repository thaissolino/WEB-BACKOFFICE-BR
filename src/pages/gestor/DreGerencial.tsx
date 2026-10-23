import { FormEvent, Fragment, useEffect, useMemo, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { api, parseError } from "../../services/api";
import { todayIso } from "../../utils/todayIso";
import { clientIdDoLojista, lancamentoDaLoja, listCatalog, type CatalogItem } from "../client/cadastros/catalog/catalogApi";
import { DatePreset } from "../client/cadastros/catalog/FormBits";
import { CadastroFrame } from "../client/cadastros/CadastroShell";
import SearchableSelect from "../client/cadastros/produtos/SearchableSelect";
import GestaoShell from "./GestaoShell";
import "./gestao-pages.css";

type DreScope = "backoffice" | "loja";

type Line = { name: string; code: string; price: number; qty: number; cost?: number; discount?: number };
type Order = { id: string; lines: Line[]; total: number; createdAt: string; closedAt: string | null; estornada?: boolean };
type LojaSale = { id: string; lines: Line[]; createdAt: string; finalizedAt: string | null; status?: string };
type Lojista = { id: string; name: string };

type Conta = { nome: string; planejado: number; realizado: number };
type Grupo = { nome: string; contas: Conta[] };

const GRUPOS_BASE = [
  "CUSTO COM PESSOAL",
  "DESPESAS COMERCIAIS",
  "DESPESAS OPERACIONAIS",
  "DESPESAS BANCÁRIAS",
  "AJUSTES DE LUCROS",
  "INVESTIMENTOS",
  "RETIRADA DOS SÓCIOS",
];

function despesaEntra(item: CatalogItem, scope: DreScope, loja: string, clientId: string) {
  const origem = String(item.payload.origem || "");
  const dono = String(item.payload.clientId || "");
  if (scope === "loja") return lancamentoDaLoja(item, clientId);
  if (loja === "estoque") return origem !== "loja" && !dono;
  if (loja !== "todas") return dono === loja;
  return true;
}

type Filtros = {
  loja: string;
  inicio: string;
  fim: string;
  visualizacao: "completo" | "resumido";
  despesas: "recolhido" | "aberto";
  plano: string;
};

function isoLocal(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function filtrosDoMes(): Filtros {
  const now = new Date();
  const inicio = isoLocal(new Date(now.getFullYear(), now.getMonth(), 1));
  return { loja: "todas", inicio, fim: todayIso(), visualizacao: "completo", despesas: "recolhido", plano: "" };
}

function money(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function percent(value: number) {
  return `${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %`;
}

function brDate(iso: string) {
  const [year, month, day] = iso.split("-");
  if (!year || !month || !day) return iso;
  return `${day}/${month}/${year}`;
}

function tone(value: number) {
  if (value < 0) return "dre-neg";
  if (value > 0) return "dre-pos";
  return "";
}

function parseValor(value: unknown) {
  const raw = String(value ?? "").trim().replace(/[R$\s]/g, "");
  if (!raw) return 0;
  const normalized = raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw;
  const number = Number(normalized);
  return Number.isFinite(number) ? number : 0;
}

function inPeriod(at: string, filtros: Filtros) {
  const date = new Date(at);
  if (Number.isNaN(date.getTime())) return false;
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

function vendaDe(lines: Line[]) {
  return lines.reduce((total, line) => {
    const qty = Number(line.qty) || 0;
    const price = Number(line.price) || 0;
    const discount = (Number(line.discount) || 0) * qty;
    return total + price * qty - discount;
  }, 0);
}

function custoDe(lines: Line[]) {
  return lines.reduce((total, line) => total + (Number(line.cost) || 0) * (Number(line.qty) || 0), 0);
}

function grupoDaDespesa(item: CatalogItem) {
  const bruto = String(item.payload.grupo || item.payload.plano || item.payload.planoConta || "").trim().toUpperCase();
  return GRUPOS_BASE.find((nome) => nome === bruto) || "DESPESAS OPERACIONAIS";
}

function casaPlano(item: CatalogItem, plano: string) {
  if (!plano) return true;
  const alvo = plano.trim().toLowerCase();
  const campos = [item.payload.plano, item.payload.planoConta, item.payload.centro, item.payload.grupo, item.name];
  return campos.some((campo) => String(campo || "").trim().toLowerCase() === alvo);
}

function DreLinha({
  nome,
  planejado,
  realizado,
  receita,
  strong,
  subtotal,
  nested,
  group,
  open,
  onToggle,
}: {
  nome: string;
  planejado: number;
  realizado: number;
  receita: number;
  strong?: boolean;
  subtotal?: boolean;
  nested?: boolean;
  group?: boolean;
  open?: boolean;
  onToggle?: () => void;
}) {
  const saldo = realizado - planejado;
  const pctFaturamento = receita ? (realizado / receita) * 100 : 0;
  const pctRealizado = planejado ? (realizado / planejado) * 100 : 0;
  return (
    <tr className={group ? "dre-group" : nested ? "dre-conta" : subtotal ? "dre-subtotal" : strong ? "dre-strong" : undefined}>
      <th scope="row">
        {onToggle ? (
          <button type="button" className="dre-toggle" onClick={onToggle} aria-expanded={open}>
            {open ? <Minus size={14} /> : <Plus size={14} />}
            <span>{nome}</span>
          </button>
        ) : (
          nome
        )}
      </th>
      {group ? (
        <>
          <td />
          <td />
          <td />
          <td />
          <td />
        </>
      ) : (
        <>
          <td className={tone(planejado)}>{money(planejado)}</td>
          <td className={tone(realizado)}>{money(realizado)}</td>
          <td className={tone(saldo)}>{money(saldo)}</td>
          <td className={tone(pctFaturamento)}>{percent(pctFaturamento)}</td>
          <td className={tone(pctRealizado)}>{percent(pctRealizado)}</td>
        </>
      )}
    </tr>
  );
}

export default function DreGerencial({ scope = "backoffice" }: { scope?: DreScope }) {
  const filtroKey = scope === "loja" ? "loja-dre-ultimo-filtro" : "gestao-dre-ultimo-filtro";
  const lojaId = scope === "loja" ? clientIdDoLojista() : "";
  const base = filtrosDoMes();
  const [lojistas, setLojistas] = useState<Lojista[]>([]);
  const [planos, setPlanos] = useState<string[]>([]);
  const [draft, setDraft] = useState<Filtros>(base);
  const [filtros, setFiltros] = useState<Filtros>(base);
  const [receita, setReceita] = useState(0);
  const [cmv, setCmv] = useState(0);
  const [grupos, setGrupos] = useState<Grupo[]>(GRUPOS_BASE.map((nome) => ({ nome, contas: [] })));
  const [abertos, setAbertos] = useState<Record<string, boolean>>({});
  const [vendas, setVendas] = useState(0);
  const [carregando, setCarregando] = useState(false);
  const [pronto, setPronto] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (scope === "backoffice") {
      api.get("/backoffice/lojistas")
        .then(({ data }) => {
          const rows = (data?.lojistas || []) as Lojista[];
          setLojistas(rows.filter((item) => item.id && item.name));
        })
        .catch(() => setLojistas([]));
    }
    listCatalog("account_plan", true)
      .then((items) => setPlanos(items.map((item) => item.name).filter(Boolean)))
      .catch(() => setPlanos([]));
  }, [scope]);

  const lucroBruto = receita - cmv;
  const despesas = useMemo(
    () => grupos.reduce((total, grupo) => total + grupo.contas.reduce((soma, conta) => soma + conta.realizado, 0), 0),
    [grupos],
  );
  const lucroLiquido = lucroBruto + despesas;
  const pctLiquido = receita ? (lucroLiquido / receita) * 100 : 0;

  function setCampo<K extends keyof Filtros>(key: K, value: Filtros[K]) {
    setDraft((atual) => ({ ...atual, [key]: value }));
  }

  async function vendasDaLoja(loja: string, lista: Lojista[]) {
    if (scope === "loja") {
      const resposta = await api.get("/clients/pdv-vendas", { params: { status: "finalizada" } });
      return ((resposta.data?.sales || []) as LojaSale[])
        .filter((sale) => !sale.status || sale.status === "finalizada")
        .map((sale) => ({ at: sale.finalizedAt || sale.createdAt, lines: sale.lines || [], estornada: false }));
    }
    if (loja !== "todas" && loja !== "estoque") {
      const resposta = await api.get(`/backoffice/lojistas/${loja}/vendas`);
      return ((resposta.data?.sales || []) as LojaSale[])
        .filter((sale) => !sale.status || sale.status === "finalizada")
        .map((sale) => ({ at: sale.finalizedAt || sale.createdAt, lines: sale.lines || [], estornada: false }));
    }
    const { data } = await api.get("/backoffice/vendas-concluidas");
    const atacado = ((data?.orders || []) as Order[])
      .filter((order) => !order.estornada)
      .map((order) => ({ at: order.closedAt || order.createdAt, lines: order.lines || [], estornada: false }));
    if (loja === "estoque") return atacado;
    const dasLojas = await Promise.all(
      lista.map(async (lojista) => {
        try {
          const resposta = await api.get(`/backoffice/lojistas/${lojista.id}/vendas`);
          return ((resposta.data?.sales || []) as LojaSale[])
            .filter((sale) => !sale.status || sale.status === "finalizada")
            .map((sale) => ({ at: sale.finalizedAt || sale.createdAt, lines: sale.lines || [], estornada: false }));
        } catch {
          return [];
        }
      }),
    );
    return [...atacado, ...dasLojas.flat()];
  }

  async function buscar(event?: FormEvent, origem?: Filtros) {
    event?.preventDefault();
    if (carregando) return;
    const pedido = origem || draft;
    setCarregando(true);
    setErro("");
    try {
      let lista = lojistas;
      if (scope === "backoffice" && pedido.loja === "todas" && !lista.length) {
        const cadastro = await api.get("/backoffice/lojistas");
        lista = ((cadastro.data?.lojistas || []) as Lojista[]).filter((item) => item.id && item.name);
        setLojistas(lista);
      }
      const [movimentos, lancamentos] = await Promise.all([
        vendasDaLoja(pedido.loja, lista),
        listCatalog("expense").catch(() => [] as CatalogItem[]),
      ]);
      const noPeriodo = movimentos.filter((item) => inPeriod(item.at, pedido));
      const receitaNova = noPeriodo.reduce((total, item) => total + vendaDe(item.lines), 0);
      const cmvNovo = noPeriodo.reduce((total, item) => total + custoDe(item.lines), 0);
      const contas = new Map<string, Conta[]>();
      for (const nome of GRUPOS_BASE) contas.set(nome, []);
      for (const item of lancamentos) {
        if (String(item.payload.tipo || "despesa") === "receita") continue;
        if (!despesaEntra(item, scope, pedido.loja, lojaId)) continue;
        if (!casaPlano(item, pedido.plano)) continue;
        const data = String(item.payload.data || item.createdAt || "");
        if (!inPeriod(data.length === 10 ? `${data}T12:00:00` : data, pedido)) continue;
        const valor = parseValor(item.payload.total);
        if (!valor) continue;
        const grupo = grupoDaDespesa(item);
        contas.get(grupo)?.push({ nome: item.name, planejado: 0, realizado: -Math.abs(valor) });
      }
      const montados = GRUPOS_BASE.map((nome) => ({ nome, contas: contas.get(nome) || [] }));
      setReceita(receitaNova);
      setCmv(cmvNovo);
      setGrupos(montados);
      setVendas(noPeriodo.length);
      setFiltros(pedido);
      setAbertos(Object.fromEntries(GRUPOS_BASE.map((nome) => [nome, pedido.despesas === "aberto"])));
      setPronto(true);
      sessionStorage.setItem(filtroKey, JSON.stringify(pedido));
    } catch (err) {
      setPronto(false);
      setErro(parseError(err).friend || "Não foi possível montar o DRE.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    void buscar(undefined, base);
    // a primeira leitura é o mês corrente, sem esperar o clique
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function limpar() {
    const proximo = filtrosDoMes();
    setDraft(proximo);
    void buscar(undefined, proximo);
  }

  function ultimo() {
    const salvo = sessionStorage.getItem(filtroKey);
    if (!salvo) return;
    try {
      const proximo = { ...filtrosDoMes(), ...JSON.parse(salvo) } as Filtros;
      setDraft(proximo);
      void buscar(undefined, proximo);
    } catch {
      setErro("Não foi possível recuperar o último filtro.");
    }
  }

  function alternar(nome: string) {
    setAbertos((atual) => ({ ...atual, [nome]: !atual[nome] }));
  }

  const lojaNome = scope === "loja"
    ? "Esta loja"
    : filtros.loja === "todas"
      ? "Todas"
      : filtros.loja === "estoque"
        ? "Estoque"
        : lojistas.find((item) => item.id === filtros.loja)?.name || "Loja";

  const corpo = (
    <>
      <form className="iv-filtros" onSubmit={(event) => void buscar(event)}>
        {scope === "backoffice" ? (
          <label>
            Loja
            <SearchableSelect
              hideEmpty
              value={draft.loja === "estoque" ? "Estoque" : draft.loja === "todas" ? "Todas" : lojistas.find((item) => item.id === draft.loja)?.name || "Todas"}
              options={["Todas", "Estoque", ...lojistas.map((item) => item.name)]}
              onChange={(nome) => {
                if (nome === "Estoque") setCampo("loja", "estoque")
                else if (nome === "Todas") setCampo("loja", "todas")
                else setCampo("loja", lojistas.find((item) => item.name === nome)?.id || "todas")
              }}
            />
          </label>
        ) : null}
        <label>
          Data início
          <span className="pdv-date-field">
            <input type="date" value={draft.inicio} onChange={(event) => setCampo("inicio", event.target.value)} />
            <DatePreset onPick={(inicio, fim) => setDraft((atual) => ({ ...atual, inicio, fim }))} />
          </span>
        </label>
        <label>
          Data fim
          <span className="pdv-date-field">
            <input type="date" value={draft.fim} onChange={(event) => setCampo("fim", event.target.value)} />
            <DatePreset onPick={(inicio, fim) => setDraft((atual) => ({ ...atual, inicio, fim }))} />
          </span>
        </label>
        <label>
          Visualização
          <SearchableSelect
            hideEmpty
            value={draft.visualizacao === "resumido" ? "Resumido" : "Completo"}
            options={["Completo", "Resumido"]}
            onChange={(nome) => setCampo("visualizacao", nome === "Resumido" ? "resumido" : "completo")}
          />
        </label>
        <label>
          Mostrar despesas
          <SearchableSelect
            hideEmpty
            value={draft.despesas === "aberto" ? "Aberto" : "Recolhido"}
            options={["Recolhido", "Aberto"]}
            onChange={(nome) => setCampo("despesas", nome === "Aberto" ? "aberto" : "recolhido")}
          />
        </label>
        <label>
          Plano de conta
          <SearchableSelect
            hideEmpty
            value={draft.plano || "Todos"}
            options={["Todos", ...planos]}
            onChange={(nome) => setCampo("plano", nome === "Todos" ? "" : nome)}
          />
        </label>
        <div className="iv-acoes">
          <button type="button" className="iv-limpar" onClick={ultimo} disabled={carregando}>Último filtro</button>
          <button type="button" className="iv-limpar" onClick={limpar} disabled={carregando}>Limpar</button>
          <button type="submit" disabled={carregando}>{carregando ? "Buscando..." : "Buscar"}</button>
        </div>
      </form>

      {pronto ? (
        <p className="dre-chips">
          Loja: {lojaNome}
          {" · "}
          Período: {brDate(filtros.inicio)} a {brDate(filtros.fim)}
          {" · "}
          {filtros.visualizacao === "completo" ? "Completo" : "Resumido"}
          {" · "}
          Despesas {filtros.despesas}
          {" · "}
          Plano: {filtros.plano || "Todos"}
          {" · "}
          {vendas} venda(s)
        </p>
      ) : null}
      {erro ? <p className="dre-erro" role="alert">{erro}</p> : null}
      {carregando && !pronto ? <p className="dre-chips">Carregando o período...</p> : null}

      {pronto ? (
        <section className="dre">
          <div className="dre-topo">
            <p>
              <span>RECEITA BRUTA DE VENDAS (A)</span>
              <strong className={tone(receita)}>{money(receita)}</strong>
            </p>
            <p>
              <span>CUSTO DA MERCADORIA VENDIDA (B)</span>
              <strong className={tone(cmv)}>{money(cmv)}</strong>
            </p>
            <p>
              <span>LUCRO BRUTO (A) − (B)</span>
              <strong className={tone(lucroBruto)}>{money(lucroBruto)}</strong>
            </p>
            <p>
              <span>DESPESAS</span>
              <strong className={tone(despesas)}>{money(despesas)}</strong>
            </p>
            <p className="dre-liquido">
              <span>LUCRO LÍQUIDO</span>
              <strong className={tone(lucroLiquido)}>
                ({percent(pctLiquido)}) {money(lucroLiquido)}
              </strong>
            </p>
          </div>

          {filtros.visualizacao === "completo" ? (
            <div className="dre-sheet">
              <table>
                <thead>
                  <tr>
                    <th>Despesa</th>
                    <th>Planejado</th>
                    <th>Realizado</th>
                    <th>Saldo</th>
                    <th>% Faturamento</th>
                    <th>% Realizado</th>
                  </tr>
                </thead>
                <tbody>
                  {grupos.map((grupo) => {
                    const planejado = grupo.contas.reduce((total, conta) => total + conta.planejado, 0);
                    const realizado = grupo.contas.reduce((total, conta) => total + conta.realizado, 0);
                    const aberto = !!abertos[grupo.nome];
                    return (
                      <Fragment key={grupo.nome}>
                        <DreLinha
                          nome={grupo.nome}
                          planejado={planejado}
                          realizado={realizado}
                          receita={receita}
                          group
                          open={aberto}
                          onToggle={() => alternar(grupo.nome)}
                        />
                        {aberto
                          ? grupo.contas.map((conta) => (
                              <DreLinha
                                key={`${grupo.nome}-${conta.nome}`}
                                nome={conta.nome}
                                planejado={conta.planejado}
                                realizado={conta.realizado}
                                receita={receita}
                                nested
                              />
                            ))
                          : null}
                        <DreLinha nome="Subtotal" planejado={planejado} realizado={realizado} receita={receita} subtotal />
                      </Fragment>
                    );
                  })}
                  <DreLinha nome="TOTAL DESPESAS" planejado={0} realizado={despesas} receita={receita} strong />
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      ) : null}
    </>
  );

  if (scope === "loja") {
    return (
      <CadastroFrame>
        <section className="pdv-cad-page pdv-cli-page" aria-labelledby="dre-titulo">
          <div className="pdv-cad-sheet">
            <h1 id="dre-titulo" className="dre-titulo">DRE GERENCIAL</h1>
            {corpo}
          </div>
        </section>
      </CadastroFrame>
    );
  }

  return (
    <GestaoShell title="DRE GERENCIAL" subtitle="Receita, custo e despesas do período. Inclui o estoque e cada loja.">
      {corpo}
    </GestaoShell>
  );
}

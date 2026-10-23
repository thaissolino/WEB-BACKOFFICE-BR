import { startTransition, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { formatMoneyRs } from "../../../client/cadastros/produtos/types";

export type ItemLista = { cor: string; preco: number | null };
export type BlocoLista = { secao: "lacrados" | "cpo" | "outros"; modelo: string; itens: ItemLista[] };
export type ListaFornecedorDados = { lugar: string; quando: string; blocos: BlocoLista[] };
export type ProdutoVinculo = { id: string; name: string; code: string; category?: string };

function semAcento(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function resumoModelo(modelo: string) {
  const base = semAcento(modelo)
    .replace(/\biphones?\b/g, " ")
    .replace(/\bapple\b/g, " ")
    .replace(/\b17\s+e\b/g, "17e")
    .replace(/\b16\s+e\b/g, "16e")
    .replace(/\be-?sim\b/g, " ")
    .replace(/\be\s*sims?\b/g, " ")
    .replace(/\bamerican[oa]s?\b/g, " ")
    .replace(/\bindian[oa]s?\b/g, " ")
    .replace(/\banatel\b/g, " ")
    .replace(/\b\d*chips?\b/g, " ")
    .replace(/\bchipi\b/g, " ")
    .replace(/\bfisic[oa]s?\b/g, " ")
    .replace(/\b\d*virtuals?\b/g, " ")
    .replace(/\blla\b/g, " ")
    .replace(/[()]/g, " ")
    .replace(/\bpromax\b/g, "pro max")
    .replace(/(\d+)\s*gb\b/g, "$1gb")
    .replace(/(\d+)\s*g\b/g, "$1gb")
    .replace(/(\d+)\s*tb\b/g, "$1tb")
    .replace(/\s+/g, " ")
    .trim();
  const capacidade = (base.match(/\d+(?:gb|tb)/) || [""])[0];
  const geracao = base.match(/\b1[1-8]e?\b/)?.[0] || (/\bultra\s*4\b/.test(base) ? "ultra 4" : "");
  const familia = base.match(/\b(iphone|ipad|imac|macbook|airpods|watch)\b/)?.[0] || "";
  const linha = /\bpro max\b/.test(base) ? "pro max" : /\bpro\b/.test(base) ? "pro" : /\bplus\b/.test(base) ? "plus" : /\bair\b/.test(base) ? "air" : "";
  const ativado = /\bativado\b/.test(base) ? "ativado" : "";
  const cpo = /\bcpo\b/.test(base) ? "cpo" : "";
  const resumo = `${familia} ${geracao} ${linha} ${capacidade} ${ativado} ${cpo}`.replace(/\s+/g, " ").trim();
  return geracao || familia ? resumo : semAcento(modelo);
}

export function blocoExcluido(excluidos: Set<string>, lugar: string, modelo: string, secao: string) {
  const base = chaveModeloLista(lugar, modelo);
  if (excluidos.has(`${base}|${secao}`)) return true;
  if (secao === "lacrados") return false;
  return excluidos.has(base);
}

export function chaveModeloLista(lugar: string, modelo: string) {
  return `${semAcento(lugar)}|${resumoModelo(modelo)}`;
}

export function migrarChaveVinculo(chave: string) {
  const [lugar, modelo, cor, secao] = chave.split("|");
  if (!lugar || !modelo) return chave;
  const resumo = resumoModelo(modelo);
  if (!cor) return `${lugar}|${resumo}`;
  return `${lugar}|${resumo}|${cor}${secao ? `|${secao}` : ""}`;
}

export function chaveItemLista(lugar: string, modelo: string, cor: string, secao: string) {
  return `${chaveModeloLista(lugar, modelo)}|${semAcento(cor)}|${secao}`;
}

function BuscaVinculo({
  termo,
  onTermo,
  sugestoes,
  onEscolher,
}: {
  termo: string;
  onTermo: (valor: string) => void;
  sugestoes: ProdutoVinculo[];
  onEscolher: (produto: ProdutoVinculo) => void;
}) {
  const campo = useRef<HTMLInputElement>(null);
  const [caixa, setCaixa] = useState({ top: 0, left: 0, width: 280 });

  useLayoutEffect(() => {
    function lugar() {
      const el = campo.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setCaixa({ top: rect.bottom + 4, left: rect.left, width: Math.max(rect.width, 280) });
    }
    lugar();
    window.addEventListener("resize", lugar);
    window.addEventListener("scroll", lugar, true);
    return () => {
      window.removeEventListener("resize", lugar);
      window.removeEventListener("scroll", lugar, true);
    };
  }, [termo, sugestoes.length]);

  return (
    <>
      <input
        ref={campo}
        value={termo}
        onChange={(event) => onTermo(event.target.value)}
        placeholder="Nome do produto no estoque"
        className="w-full rounded-md border border-gray-300 bg-white p-1"
        autoFocus
      />
      {createPortal(
        <ul className="lf-picker-list" style={{ top: caixa.top, left: caixa.left, width: caixa.width }}>
          {sugestoes.map((produto) => (
            <li key={produto.id}>
              <button
                type="button"
                className="lf-picker-hit"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => onEscolher(produto)}
              >
                <span className="lf-picker-code">{produto.code || "—"}</span>
                <span>{produto.name}</span>
              </button>
            </li>
          ))}
          {sugestoes.length === 0 ? <li className="lf-picker-empty">Nenhum produto</li> : null}
        </ul>,
        document.body,
      )}
    </>
  );
}

function dicaBusca(modelo: string, cor: string) {
  const base = semAcento(modelo).replace(/[()*]/g, " ").replace(/-/g, " ");
  const geracao = base.match(/\b1[1-8]e?\b/)?.[0] || "";
  const capacidade = (base.match(/\d+\s*(?:gb|tb)/) || [""])[0].replace(/\s+/g, "");
  const linha = /\bpro max\b/.test(base) ? "pro max" : /\bpro\b/.test(base) ? "pro" : /\bair\b/.test(base) ? "air" : "";
  return `${geracao} ${linha} ${capacidade} ${cor}`.replace(/\s+/g, " ").trim();
}

const FORNECEDORES = [
  { nome: "Fire cell", chave: "fire cel" },
  { nome: "MB Shop", chave: "mb shop" },
  { nome: "Ny-cell", chave: "ny-cell" },
  { nome: "HD Eletrônicos", chave: "hd eletr" },
  { nome: "Tm Natach 2", chave: "tm natach" },
] as const;

export function ehIphone(modelo: string) {
  const base = semAcento(modelo);
  if (/\b(realme|poco|xiaomi|redmi|notes?)\b/.test(base)) return false;
  return /\biphones?\b/.test(base);
}

export function modeloAtivado(modelo: string) {
  return /\bativados?\b/.test(semAcento(modelo));
}

function soIphones(blocos: BlocoLista[]) {
  return blocos.filter((bloco) => ehIphone(bloco.modelo));
}

function juntarBlocos(blocos: BlocoLista[]) {
  const ordem: BlocoLista[] = [];
  const indice = new Map<string, number>();
  for (const bloco of blocos) {
    const id = `${bloco.secao}|${semAcento(bloco.modelo)}`;
    const pos = indice.get(id);
    if (pos == null) {
      indice.set(id, ordem.length);
      ordem.push({ ...bloco, itens: bloco.itens.map((item) => ({ ...item })) });
      continue;
    }
    const destino = ordem[pos];
    for (const item of bloco.itens) {
      const cor = semAcento(item.cor);
      const ja = destino.itens.find((atual) => semAcento(atual.cor) === cor);
      if (!ja) destino.itens.push({ ...item });
      else if (item.preco != null) ja.preco = item.preco;
    }
  }
  return ordem;
}

function chaveDoCard(lugar: string, bloco: BlocoLista) {
  return `${chaveModeloLista(lugar, bloco.modelo)}|${bloco.secao}|${bloco.modelo}`;
}

function faltaVincular(
  lugar: string,
  bloco: BlocoLista,
  vinculos: Record<string, string>,
  casar: (modelo: string, cor: string, secao: BlocoLista["secao"]) => ProdutoVinculo | null,
) {
  return bloco.itens.some((item) => {
    if (!item.cor || item.cor === "único") return false;
    const chave = chaveItemLista(lugar, bloco.modelo, item.cor, bloco.secao);
    if (vinculos[chave]) return false;
    if (item.preco == null) return false;
    if (bloco.secao === "cpo" || modeloAtivado(bloco.modelo)) return true;
    return !casar(bloco.modelo, item.cor, bloco.secao);
  });
}

function fornecedorDaLista(lugar: string) {
  const base = semAcento(lugar).replace(/-/g, " ");
  return FORNECEDORES.find((fornecedor) => base.includes(semAcento(fornecedor.chave).replace(/-/g, " ")))?.nome || "";
}

const ROTULO_SECAO: Record<BlocoLista["secao"], string> = {
  lacrados: "Lacrado",
  cpo: "CPO",
  outros: "Outros",
};

type Filtro = "vincular" | "completa" | "concluidos" | "excluidos";

type Props = {
  listas: ListaFornecedorDados[];
  produtos: ProdutoVinculo[];
  excluidos: string[];
  vinculos: Record<string, string>;
  casar: (modelo: string, cor: string, secao: BlocoLista["secao"]) => ProdutoVinculo | null;
  onExcluir: (chaves: string | string[], excluido: boolean) => void;
  onVincular: (chave: string, produtoId: string | null) => void;
};

export function ListaFornecedor({ listas, produtos, excluidos, vinculos, casar, onExcluir, onVincular }: Props) {
  const [fornecedor, setFornecedor] = useState<(typeof FORNECEDORES)[number]["nome"]>(FORNECEDORES[0].nome);
  const [filtro, setFiltro] = useState<Filtro>("vincular");
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState("");
  const [termo, setTermo] = useState("");
  const [ok, setOk] = useState("");
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const fora = useMemo(() => new Set(excluidos), [excluidos]);
  const listasUnicas = useMemo(
    () => listas.map((lista) => ({ ...lista, blocos: juntarBlocos(lista.blocos) })),
    [listas],
  );
  const pendentesAntes = useRef<Set<string> | null>(null);

  const sugestoes = useMemo(() => {
    const palavras = semAcento(termo).split(" ").filter(Boolean);
    const lacrado = aberto.endsWith("|lacrados");
    const base = palavras.length
      ? produtos.filter((item) => {
          const nome = semAcento(`${item.name} ${item.code}`);
          return palavras.every((palavra) => nome.includes(palavra));
        })
      : produtos;
    return [...base]
      .sort((a, b) => {
        const seminovo = (item: ProdutoVinculo) => semAcento(`${item.category || ""} ${item.name}`).includes("seminovo");
        const nota = (item: ProdutoVinculo) => (lacrado && seminovo(item) ? 1 : 0);
        return nota(a) - nota(b) || a.name.localeCompare(b.name, "pt-BR");
      })
      .slice(0, 8);
  }, [produtos, termo, aberto]);

  const termoBusca = busca.trim().toLocaleLowerCase("pt-BR");

  const pendentes = useMemo(() => {
    const chaves = new Set<string>();
    for (const lista of listasUnicas) {
      if (fornecedorDaLista(lista.lugar) !== fornecedor) continue;
      for (const bloco of lista.blocos) {
        const chaveCard = chaveDoCard(lista.lugar, bloco);
        if (blocoExcluido(fora, lista.lugar, bloco.modelo, bloco.secao)) continue;
        if (faltaVincular(lista.lugar, bloco, vinculos, casar)) chaves.add(chaveCard);
      }
    }
    return chaves;
  }, [listasUnicas, fornecedor, fora, vinculos, casar]);

  const visiveis = useMemo(() => {
    const chaves: string[] = [];
    for (const lista of listasUnicas) {
      if (fornecedorDaLista(lista.lugar) !== fornecedor) continue;
      for (const bloco of soIphones(lista.blocos)) {
        const chaveBloco = `${chaveModeloLista(lista.lugar, bloco.modelo)}|${bloco.secao}`;
        const chaveCard = chaveDoCard(lista.lugar, bloco);
        const excluido = blocoExcluido(fora, lista.lugar, bloco.modelo, bloco.secao);
        if (termoBusca && !`${bloco.modelo} ${bloco.itens.map((item) => item.cor).join(" ")}`.toLocaleLowerCase("pt-BR").includes(termoBusca)) continue;
        if (filtro === "excluidos" && !excluido) continue;
        if (filtro !== "excluidos" && excluido) continue;
        const pendente = pendentes.has(chaveCard);
        const concluido = !excluido && !pendente;
        if (filtro === "vincular" && !pendente) continue;
        if (filtro === "concluidos" && !concluido) continue;
        chaves.push(chaveBloco);
      }
    }
    return chaves;
  }, [listasUnicas, fornecedor, fora, termoBusca, filtro, pendentes]);

  useEffect(() => {
    setSelecionados([]);
    setAberto("");
  }, [fornecedor, filtro]);

  const marcados = selecionados.filter((chave) => visiveis.includes(chave));
  const todosMarcados = visiveis.length > 0 && marcados.length === visiveis.length;

  function alternar(chave: string) {
    setSelecionados((atual) => (atual.includes(chave) ? atual.filter((item) => item !== chave) : [...atual, chave]));
  }

  function marcarVisiveis() {
    setSelecionados(todosMarcados ? [] : visiveis);
  }

  function aplicarSelecao(excluido: boolean) {
    if (marcados.length === 0) return;
    onExcluir(marcados, excluido);
    setSelecionados([]);
  }

  const prontoParaOk = useRef(false);
  const assinaturaPendentes = [...pendentes].sort().join("\n");

  useEffect(() => {
    if (produtos.length === 0) return;
    const antes = pendentesAntes.current;
    const agora = new Set(assinaturaPendentes ? assinaturaPendentes.split("\n") : []);
    pendentesAntes.current = agora;
    if (!prontoParaOk.current) {
      prontoParaOk.current = true;
      return;
    }
    for (const chave of antes || []) {
      if (!agora.has(chave) && !fora.has(chave)) {
        setOk(chave);
        const timer = window.setTimeout(() => setOk((atual) => (atual === chave ? "" : atual)), 1200);
        return () => window.clearTimeout(timer);
      }
    }
  }, [assinaturaPendentes, fora, produtos.length]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-x-5 gap-y-2 border-b border-gray-200 pb-2">
        {FORNECEDORES.map((item) => (
          <button
            key={item.nome}
            type="button"
            onClick={() => startTransition(() => setFornecedor(item.nome))}
            className={`pb-1 text-base font-semibold ${fornecedor === item.nome ? "border-b-2 border-blue-700 text-blue-700" : "text-gray-400"}`}
          >
            {item.nome}
          </button>
        ))}
      </div>
      <p className="mb-4 text-sm text-gray-600">
        Por enquanto só os iPhones da {fornecedor}. O que não casar com o estoque, você vincula ou marca que não trabalham. Em Não trabalhamos o vínculo continua disponível. Ativado e CPO só entram no preço quando você vincular.
      </p>
      <div className="mb-4 flex flex-wrap gap-2">
        {(
            [
            ["vincular", "Falta vincular"],
            ["completa", "Lista completa"],
            ["concluidos", "Concluídos"],
            ["excluidos", "Não trabalhamos"],
          ] as const
        ).map(([id, rotulo]) => (
          <button
            key={id}
            type="button"
            onClick={() => setFiltro(id)}
            className={`rounded-full px-3 py-1 text-sm ${filtro === id ? "bg-blue-700 text-white" : "bg-gray-100 text-gray-600"}`}
          >
            {rotulo}
          </button>
        ))}
      </div>
      <input
        value={busca}
        onChange={(event) => setBusca(event.target.value)}
        placeholder="Buscar na lista do fornecedor..."
        className="mb-4 w-full rounded-md border border-gray-300 p-2"
      />
      {visiveis.length > 0 ? (
        <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
          <label className="flex items-center gap-2 text-gray-700">
            <input type="checkbox" checked={todosMarcados} onChange={marcarVisiveis} />
            Selecionar os desta lista
          </label>
          {marcados.length > 0 ? (
            <>
              <span className="text-gray-500">{marcados.length} selecionado(s)</span>
              {filtro === "excluidos" ? (
                <button type="button" onClick={() => aplicarSelecao(false)} className="rounded-md bg-blue-700 px-3 py-1 text-white">
                  Trabalhamos com estes
                </button>
              ) : (
                <button type="button" onClick={() => aplicarSelecao(true)} className="rounded-md bg-blue-700 px-3 py-1 text-white">
                  Não trabalhamos
                </button>
              )}
              <button type="button" onClick={() => setSelecionados([])} className="text-blue-700">
                Limpar
              </button>
            </>
          ) : null}
        </div>
      ) : null}
      {listasUnicas.filter((lista) => fornecedorDaLista(lista.lugar) === fornecedor).length === 0 ? (
        <p className="text-sm text-gray-500">A lista de hoje da {fornecedor} ainda não chegou.</p>
      ) : null}
      {listasUnicas.filter((lista) => fornecedorDaLista(lista.lugar) === fornecedor).map((lista) => (
        <section key={`${lista.lugar}-${lista.quando}`} className="mb-6">
          <h3 className="mb-3 text-base font-semibold text-gray-800">
            {lista.lugar}
            {lista.quando ? <span className="ml-2 text-sm font-normal text-gray-500">{lista.quando}</span> : null}
          </h3>
          <div className="space-y-3">
            {soIphones(lista.blocos).map((bloco) => {
              const chaveBloco = `${chaveModeloLista(lista.lugar, bloco.modelo)}|${bloco.secao}`;
              const chaveCard = chaveDoCard(lista.lugar, bloco);
              const excluido = blocoExcluido(fora, lista.lugar, bloco.modelo, bloco.secao);
              if (termoBusca && !`${bloco.modelo} ${bloco.itens.map((item) => item.cor).join(" ")}`.toLocaleLowerCase("pt-BR").includes(termoBusca)) {
                return null;
              }
              if (filtro === "excluidos" && !excluido) return null;
              if (filtro !== "excluidos" && excluido) return null;
              const pendente = pendentes.has(chaveCard);
              const concluido = !excluido && !pendente;
              if (filtro === "vincular" && !pendente && ok !== chaveCard) return null;
              if (filtro === "concluidos" && !concluido) return null;
              if (ok === chaveCard && filtro !== "concluidos") {
                return (
                  <article key={chaveCard} className="rounded-xl border border-green-200 bg-green-50 px-3 py-3 text-sm font-semibold text-green-700">
                    OK · {bloco.modelo}
                  </article>
                );
              }
              return (
                <article key={chaveCard} className="rounded-xl border border-gray-200">
                  <header className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-3 py-2">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={selecionados.includes(chaveBloco)} onChange={() => alternar(chaveBloco)} />
                      <span>
                        <span className="mr-2 text-xs font-semibold uppercase text-gray-400">{ROTULO_SECAO[bloco.secao]}</span>
                        <span className="font-medium text-gray-800">{bloco.modelo}</span>
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={() => onExcluir(chaveBloco, !excluido)}
                      className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-600"
                    >
                      {excluido ? "Trabalhamos com este" : "Não trabalhamos"}
                    </button>
                  </header>
                  <table className="min-w-full text-sm">
                    <tbody>
                      {bloco.itens.filter((item) => item.cor && item.cor !== "único").map((item, indice) => {
                        const chave = chaveItemLista(lista.lugar, bloco.modelo, item.cor, bloco.secao);
                        const chaveLinha = `${chave}|${indice}`;
                        const manual = produtos.find((produto) => produto.id === vinculos[chave]);
                        const automatico = item.preco == null || manual || bloco.secao === "cpo" || modeloAtivado(bloco.modelo) ? null : casar(bloco.modelo, item.cor, bloco.secao);
                        const ligado = manual || automatico;
                        const abrir = () => {
                          setAberto(chaveLinha);
                          setTermo(dicaBusca(bloco.modelo, item.cor));
                        };
                        return (
                          <tr key={`${chave}|${indice}`} className="border-t border-gray-50">
                            <td className="px-3 py-2 capitalize text-gray-800">{item.cor && item.cor !== "único" ? item.cor : "—"}</td>
                            <td className="px-3 py-2 text-center tabular-nums text-gray-700">
                              {item.preco == null ? "não vende" : formatMoneyRs(item.preco)}
                            </td>
                            <td className="px-3 py-2 text-left">
                              {aberto === chaveLinha ? (
                                <BuscaVinculo
                                  termo={termo}
                                  onTermo={setTermo}
                                  sugestoes={sugestoes}
                                  onEscolher={(produto) => {
                                    onVincular(chave, produto.id);
                                    setAberto("");
                                    setTermo("");
                                  }}
                                />
                              ) : ligado ? (
                                <span className="text-gray-700">
                                  {manual ? "Vinculado: " : "No estoque: "}
                                  <span className="font-medium">{ligado.name}</span>
                                  <button type="button" className="ml-2 text-xs text-blue-700" onClick={abrir}>
                                    trocar
                                  </button>
                                  {manual ? (
                                    <button type="button" className="ml-2 text-xs text-blue-700" onClick={() => onVincular(chave, null)}>
                                      desfazer
                                    </button>
                                  ) : null}
                                </span>
                              ) : (
                                <button type="button" className="text-blue-700" onClick={abrir}>
                                  Vincular
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

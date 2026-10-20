import { useEffect, useMemo, useState } from "react";
import { api } from "../../../../services/api";
import { loadProductCategories, openCategoryRank, slugifyCategory, toFlatOptions } from "../../../client/cadastros/produtos/categoryModel";
import { formatMoneyRs } from "../../../client/cadastros/produtos/types";
import {
  blocoExcluido,
  chaveItemLista,
  ListaFornecedor,
  migrarChaveVinculo,
  modeloAtivado,
  ehIphone,
  type ListaFornecedorDados,
} from "./ListaFornecedor";

/** Colunas na ordem pedida. A chave casa com o nome do grupo no WhatsApp. */
const LISTAS_SP = [
  { nome: "Fire cell", chave: "fire cel" },
  { nome: "MB Shop", chave: "mb shop" },
  { nome: "Ny-cell", chave: "ny-cell" },
  { nome: "HD Eletrônicos", chave: "hd eletron" },
  { nome: "Tm Natach 2", chave: "tm natach" },
] as const;

const MODELOS = [
  "18 pro max 2tb",
  "18 pro max 1tb",
  "18 pro max 512gb",
  "18 pro max 256gb",
  "17 pro max 512gb",
  "17 pro max 256gb",
  "18 pro 512gb",
  "18 pro 256gb",
  "17 pro 512gb",
  "17 pro 256gb",
  "watch ultra 4",
  "17 256gb",
  "16 128gb",
  "15 128gb",
];

const CORES: [string, string][] = [
  ["titanio natural", "titânio natural"],
  ["titanio preto", "titânio preto"],
  ["titanio branco", "titânio branco"],
  ["titanio azul", "titânio azul"],
  ["titanio deserto", "titânio deserto"],
  ["laranja cosmico", "laranja"],
  ["preto espacial", "preto"],
  ["branco estelar", "branco"],
  ["meia noite", "meia-noite"],
  ["ultramarino", "ultramarino"],
  ["burgundy", "bordô"],
  ["bordo", "bordô"],
  ["vinho", "bordô"],
  ["grafite", "grafite"],
  ["deserto", "deserto"],
  ["laranja", "laranja"],
  ["amarelo", "amarelo"],
  ["dourado", "dourado"],
  ["vermelho", "vermelho"],
  ["prata", "prata"],
  ["branco", "branco"],
  ["preto", "preto"],
  ["verde", "verde"],
  ["roxo", "roxo"],
  ["rosa", "rosa"],
  ["azul", "azul"],
  ["natural", "titânio natural"],
];

function semAcento(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function chaveModelo(texto: string) {
  return semAcento(texto)
    .replace(/[()*]/g, " ")
    .replace(/-/g, " ")
    .replace(/\biphones?\b/g, " ")
    .replace(/\bapple\b/g, " ")
    .replace(/\b(ll|chip|virtual|esim|anatel)\b/g, " ")
    .replace(/(\d+)\s*g(?:b)?\b/g, "$1gb")
    .replace(/(\d+)\s*tb\b/g, "$1tb")
    .replace(/gb\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function identificar(nome: string) {
  const base = chaveModelo(nome);
  const modelo = MODELOS.find((item) => {
    const alvo = chaveModelo(item);
    const indice = base.indexOf(alvo);
    if (indice < 0) return false;
    const antes = indice > 0 ? base[indice - 1] : " ";
    const depois = indice + alvo.length < base.length ? base[indice + alvo.length] : " ";
    return !/[a-z0-9]/.test(antes) && !/[a-z0-9]/.test(depois);
  });
  if (!modelo && !/\bultra 4\b/.test(base)) return null;
  const produto = modelo || "watch ultra 4";
  const texto = semAcento(nome);
  const cor = CORES.find(([alias]) => {
    const indice = texto.indexOf(alias);
    if (indice < 0) return false;
    const antes = indice > 0 ? texto[indice - 1] : " ";
    const depois = indice + alias.length < texto.length ? texto[indice + alias.length] : " ";
    return !/[a-z0-9]/.test(antes) && !/[a-z0-9]/.test(depois);
  });
  if (!cor) return null;
  return { produto, cor: cor[1] };
}

function coresAceitas(cor: string) {
  if (cor === "branco" || cor === "prata") return ["branco", "prata"];
  if (cor === "bordô") return ["bordô", "vinho"];
  return [cor];
}

function posicaoCategoria(nome: string) {
  const slug = slugifyCategory(nome);
  if (slug.includes("seminovo")) return 1;
  if (slug.includes("novo")) return 0;
  const aberta = openCategoryRank("", nome);
  if (aberta >= 0) return 10 + aberta;
  if (nome === "Sem categoria") return 1000;
  return 100;
}

function listaDoLugar(lugar: string) {
  const base = semAcento(lugar);
  return LISTAS_SP.find((lista) => base.includes(lista.chave))?.nome || "";
}

type CotacaoBruta = { produto: string; cor: string; preco: number; lugar: string };

function encaixar(produtos: Catalogo[], brutas: CotacaoBruta[]): Cotacao[] {
  const saida: Cotacao[] = [];
  for (const produto of produtos) {
    const id = identificar(produto.name);
    if (!id) continue;
    const cores = coresAceitas(id.cor);
    for (const item of brutas) {
      if (item.produto !== id.produto || !cores.includes(item.cor)) continue;
      const lista = listaDoLugar(item.lugar);
      if (!lista || !Number.isFinite(item.preco)) continue;
      saida.push({ produtoId: produto.id, lista, preco: item.preco });
    }
  }
  return saida;
}

type Catalogo = {
  id: string;
  name: string;
  code: string;
  category?: string;
  salePrice?: number;
};

type Cotacao = {
  produtoId: string;
  lista: string;
  preco: number;
};

type PreferenciaLista = {
  excluidos: string[];
  vinculos: Record<string, string>;
};

const PREFERENCIA_VAZIA: PreferenciaLista = { excluidos: [], vinculos: {} };

function lerPreferencia(): PreferenciaLista {
  try {
    const salvo = JSON.parse(localStorage.getItem("@gestorvix:lista-vinculos") || "");
    const excluidos = Array.isArray(salvo?.excluidos)
      ? [...new Set(salvo.excluidos.filter((item: unknown) => typeof item === "string").map((item: string) => migrarChaveVinculo(item)))]
      : [];
    const vinculos: Record<string, string> = {};
    if (salvo?.vinculos && typeof salvo.vinculos === "object") {
      for (const [chave, produtoId] of Object.entries(salvo.vinculos as Record<string, unknown>)) {
        if (typeof produtoId === "string") vinculos[migrarChaveVinculo(chave)] = produtoId;
      }
    }
    const preferencia = { excluidos, vinculos };
    localStorage.setItem("@gestorvix:lista-vinculos", JSON.stringify(preferencia));
    return preferencia;
  } catch {
    return PREFERENCIA_VAZIA;
  }
}

function produtoDaLista(produtos: Catalogo[], modelo: string, cor: string, secao?: string) {
  const id = identificar(`${modelo} ${cor}`);
  if (!id) return null;
  const aceitas = new Set(coresAceitas(id.cor));
  const candidatos = produtos.filter((produto) => {
    const deles = identificar(produto.name);
    return !!deles && deles.produto === id.produto && aceitas.has(deles.cor);
  });
  if (secao === "lacrados") {
    const novo = candidatos.find((produto) => !semAcento(`${produto.category || ""} ${produto.name}`).includes("seminovo"));
    if (novo) return novo;
  }
  return candidatos[0] || null;
}

function montarCotacoes(
  produtos: Catalogo[],
  brutas: CotacaoBruta[],
  listas: ListaFornecedorDados[],
  preferencia: PreferenciaLista,
): Cotacao[] {
  const oficiais = new Set(
    listas
      .filter((lista) => lista.blocos.some((bloco) => bloco.itens.some((item) => item.preco != null)))
      .map((lista) => listaDoLugar(lista.lugar))
      .filter(Boolean),
  );
  const saida = encaixar(
    produtos,
    brutas.filter((item) => !oficiais.has(listaDoLugar(item.lugar))),
  );
  const fora = new Set(preferencia.excluidos);
  for (const lista of listas) {
    const nome = listaDoLugar(lista.lugar);
    if (!nome) continue;
    for (const bloco of lista.blocos) {
      if (!ehIphone(bloco.modelo)) continue;
      if (blocoExcluido(fora, lista.lugar, bloco.modelo, bloco.secao)) continue;
      for (const item of bloco.itens) {
        if (item.preco == null) continue;
        const manual = preferencia.vinculos[chaveItemLista(lista.lugar, bloco.modelo, item.cor, bloco.secao)];
        if (manual) {
          saida.push({ produtoId: manual, lista: nome, preco: item.preco });
          continue;
        }
        if (bloco.secao === "cpo" || modeloAtivado(bloco.modelo)) continue;
        const produto = produtoDaLista(produtos, bloco.modelo, item.cor, bloco.secao);
        if (!produto) continue;
        saida.push({ produtoId: produto.id, lista: nome, preco: item.preco });
      }
    }
  }
  return saida;
}

export function MelhoresPrecos() {
  const [produtos, setProdutos] = useState<Catalogo[]>([]);
  const [ordemCategorias, setOrdemCategorias] = useState<string[]>([]);
  const [brutas, setBrutas] = useState<CotacaoBruta[]>([]);
  const [listas, setListas] = useState<ListaFornecedorDados[]>([]);
  const [preferencia, setPreferencia] = useState<PreferenciaLista>(lerPreferencia);
  const [atualizadoEm, setAtualizadoEm] = useState("");
  const [visao, setVisao] = useState<"estoque" | "fornecedor">("estoque");
  const [categoriaAtiva, setCategoriaAtiva] = useState("");
  const [busca, setBusca] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    let cancel = false;
    setCarregando(true);
    Promise.all([
      api.get("/clients/products", { params: { ativo: "true" } }),
      loadProductCategories().catch(() => []),
      fetch(`/melhores-precos.json?t=${Date.now()}`).then((resposta) => (resposta.ok ? resposta.json() : { cotacoes: [] })),
      fetch(`/listas-fornecedor.json?t=${Date.now()}`).then((resposta) => (resposta.ok ? resposta.json() : { listas: [] })),
    ])
      .then(([produtosRes, categorias, precosRes, listasRes]) => {
        if (cancel) return;
        const lista = ((Array.isArray(produtosRes.data) ? produtosRes.data : produtosRes.data?.products || []) as Catalogo[]).filter(
          (item) => item?.name
        );
        setProdutos(lista);
        setOrdemCategorias(toFlatOptions(categorias).map((item) => item.label));
        setBrutas(Array.isArray(precosRes?.cotacoes) ? (precosRes.cotacoes as CotacaoBruta[]) : []);
        setListas(Array.isArray(listasRes?.listas) ? (listasRes.listas as ListaFornecedorDados[]) : []);
        setAtualizadoEm(typeof listasRes?.atualizadoEm === "string" ? listasRes.atualizadoEm : typeof precosRes?.atualizadoEm === "string" ? precosRes.atualizadoEm : "");
      })
      .catch(() => {
        if (!cancel) setErro("Não foi possível carregar os produtos.");
      })
      .finally(() => {
        if (!cancel) setCarregando(false);
      });
    return () => {
      cancel = true;
    };
  }, []);

  useEffect(() => {
    let cancel = false;
    const timer = window.setInterval(() => {
      Promise.all([
        fetch(`/melhores-precos.json?t=${Date.now()}`).then((resposta) => (resposta.ok ? resposta.json() : null)),
        fetch(`/listas-fornecedor.json?t=${Date.now()}`).then((resposta) => (resposta.ok ? resposta.json() : null)),
      ])
        .then(([precosRes, listasRes]) => {
          if (cancel || !precosRes || !listasRes) return;
          setBrutas(Array.isArray(precosRes.cotacoes) ? (precosRes.cotacoes as CotacaoBruta[]) : []);
          setListas(Array.isArray(listasRes.listas) ? (listasRes.listas as ListaFornecedorDados[]) : []);
          const quando = typeof listasRes.atualizadoEm === "string"
            ? listasRes.atualizadoEm
            : typeof precosRes.atualizadoEm === "string"
              ? precosRes.atualizadoEm
              : "";
          if (quando) setAtualizadoEm(quando);
        })
        .catch(() => undefined);
    }, 20_000);
    return () => {
      cancel = true;
      window.clearInterval(timer);
    };
  }, []);

  function gravarPreferencia(proxima: PreferenciaLista) {
    setPreferencia(proxima);
    localStorage.setItem("@gestorvix:lista-vinculos", JSON.stringify(proxima));
  }

  const cotacoes = useMemo(
    () => montarCotacoes(produtos, brutas, listas, preferencia),
    [produtos, brutas, listas, preferencia],
  );

  const precoDe = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const item of cotacoes) {
      const chave = `${item.produtoId}|${item.lista}`;
      const atual = mapa.get(chave);
      if (atual == null || item.preco < atual) mapa.set(chave, item.preco);
    }
    return mapa;
  }, [cotacoes]);

  const abas = useMemo(() => {
    const rank = new Map(ordemCategorias.map((nome, index) => [nome.toLocaleLowerCase("pt-BR"), index]));
    const mapa = new Map<string, Catalogo[]>();
    for (const item of produtos) {
      const categoria = item.category?.trim() || "Sem categoria";
      const lista = mapa.get(categoria) || [];
      lista.push(item);
      mapa.set(categoria, lista);
    }
    return [...mapa.entries()]
      .sort((a, b) => {
        const esquerda = posicaoCategoria(a[0]);
        const direita = posicaoCategoria(b[0]);
        if (esquerda !== direita) return esquerda - direita;
        const ordemA = rank.get(a[0].toLocaleLowerCase("pt-BR"));
        const ordemB = rank.get(b[0].toLocaleLowerCase("pt-BR"));
        if (ordemA != null && ordemB != null && ordemA !== ordemB) return ordemA - ordemB;
        return a[0].localeCompare(b[0], "pt-BR", { sensitivity: "base" });
      })
      .map(([nome, itens]) => ({
        nome,
        itens: itens.sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" })),
      }));
  }, [produtos, ordemCategorias]);

  const categoriaSelecionada = abas.some((aba) => aba.nome === categoriaAtiva) ? categoriaAtiva : abas[0]?.nome || "";

  const linhas = useMemo(() => {
    const grupo = abas.find((aba) => aba.nome === categoriaSelecionada);
    if (!grupo) return [];
    const termo = busca.trim().toLocaleLowerCase("pt-BR");
    if (!termo) return grupo.itens;
    return grupo.itens.filter((item) => `${item.name} ${item.code}`.toLocaleLowerCase("pt-BR").includes(termo));
  }, [abas, categoriaSelecionada, busca]);

  const semPreco = linhas.filter((produto) => !LISTAS_SP.some((lista) => precoDe.has(`${produto.id}|${lista.nome}`))).length;

  function menor(produtoId: string) {
    let melhor: { lista: string; preco: number } | null = null;
    for (const lista of LISTAS_SP) {
      const preco = precoDe.get(`${produtoId}|${lista.nome}`);
      if (preco == null) continue;
      if (!melhor || preco < melhor.preco) melhor = { lista: lista.nome, preco };
    }
    return melhor;
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-x-5 gap-y-2 border-b border-gray-200 pb-2">
        <button
          type="button"
          onClick={() => setVisao("estoque")}
          className={`pb-1 text-base font-semibold ${visao === "estoque" ? "border-b-2 border-blue-700 text-blue-700" : "text-gray-400"}`}
        >
          Nossos produtos
        </button>
        <button
          type="button"
          onClick={() => setVisao("fornecedor")}
          className={`pb-1 text-base font-semibold ${visao === "fornecedor" ? "border-b-2 border-blue-700 text-blue-700" : "text-gray-400"}`}
        >
          Lista do fornecedor
        </button>
      </div>
      {visao === "fornecedor" ? (
        carregando ? (
          <p className="text-sm text-gray-500">Carregando a lista...</p>
        ) : (
          <ListaFornecedor
            listas={listas}
            produtos={produtos}
            excluidos={preferencia.excluidos}
            vinculos={preferencia.vinculos}
            casar={(modelo, cor, secao) => produtoDaLista(produtos, modelo, cor, secao)}
            onExcluir={(chave, excluido) => {
              const chaves = Array.isArray(chave) ? chave : [chave];
              const conjunto = new Set(chaves);
              const excluidos = excluido
                ? [...new Set([...preferencia.excluidos, ...chaves])]
                : preferencia.excluidos.filter((item) => !conjunto.has(item));
              gravarPreferencia({ ...preferencia, excluidos });
            }}
            onVincular={(chave, produtoId) => {
              const vinculos = { ...preferencia.vinculos };
              if (produtoId) vinculos[chave] = produtoId;
              else delete vinculos[chave];
              gravarPreferencia({ ...preferencia, vinculos });
            }}
          />
        )
      ) : null}
      {visao === "estoque" ? (
      <div>
      <div className="sticky top-0 z-10 mb-4 flex flex-wrap gap-x-5 gap-y-2 border-b border-gray-200 bg-white pb-2">
        {abas.map((aba) => {
          const ativa = aba.nome === categoriaSelecionada;
          return (
            <button
              key={aba.nome}
              type="button"
              onClick={() => setCategoriaAtiva(aba.nome)}
              className={`pb-1 text-base font-semibold ${ativa ? "border-b-2 border-blue-700 text-blue-700" : "text-gray-400"}`}
            >
              {aba.nome} ({aba.itens.length})
            </button>
          );
        })}
      </div>
      <p className="mb-4 text-sm text-gray-600">
        Entram todos os produtos da categoria, mesmo sem preço. Onde não aparecer valor, o fornecedor escreveu o nome de outro jeito.
        {linhas.length ? ` ${linhas.length} produtos, ${semPreco} sem preço.` : ""}
        {atualizadoEm ? ` Lido em ${new Date(atualizadoEm).toLocaleString("pt-BR")}.` : ""}
      </p>
      <input
        value={busca}
        onChange={(event) => setBusca(event.target.value)}
        placeholder="Buscar produto..."
        className="mb-4 w-full rounded-md border border-gray-300 p-2"
      />
      {erro ? <p className="text-sm text-red-600">{erro}</p> : null}
      {carregando ? (
        <p className="text-sm text-gray-500">Carregando produtos...</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">Produto</th>
                {LISTAS_SP.map((lista) => (
                  <th key={lista.nome} className="px-3 py-2 text-center text-xs font-medium uppercase text-gray-500">
                    {lista.nome}
                  </th>
                ))}
                <th className="border-l border-gray-200 px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">Ganhadora</th>
                <th className="px-3 py-2 text-right text-xs font-medium uppercase text-gray-500">Preço</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {linhas.map((produto) => {
                const melhor = menor(produto.id);
                return (
                  <tr key={produto.id}>
                    <td className="px-3 py-2 text-left text-gray-800">
                      {produto.name}
                      {produto.code ? <span className="ml-2 text-xs text-gray-400">{produto.code}</span> : null}
                    </td>
                    {LISTAS_SP.map((lista) => {
                      const preco = precoDe.get(`${produto.id}|${lista.nome}`);
                      const marcado = melhor?.lista === lista.nome;
                      return (
                        <td
                          key={lista.nome}
                          className={`px-3 py-2 text-center tabular-nums ${marcado ? "font-semibold text-green-700" : "text-gray-700"}`}
                        >
                          {preco == null ? "—" : formatMoneyRs(preco)}
                        </td>
                      );
                    })}
                    <td className="border-l border-gray-200 px-3 py-2 text-left text-gray-700">
                      {melhor ? <span className="font-semibold text-green-700">{melhor.lista}</span> : "Sem preço"}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-gray-700">
                      {melhor ? <span className="font-semibold text-green-700">{formatMoneyRs(melhor.preco)}</span> : "—"}
                    </td>
                  </tr>
                );
              })}
              {linhas.length === 0 ? (
                <tr>
                  <td className="px-3 py-4 text-gray-500" colSpan={LISTAS_SP.length + 3}>
                    Nenhum produto encontrado.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}
      </div>
      ) : null}
    </div>
  );
}

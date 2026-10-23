import { startTransition, useEffect, useMemo, useState } from "react";
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
  "17 pro max 2tb",
  "17 pro max 1tb",
  "17 pro max 512gb",
  "17 pro max 256gb",
  "18 pro 512gb",
  "18 pro 256gb",
  "17 pro 512gb",
  "17 pro 256gb",
  "17 air 256gb",
  "17e 256gb",
  "17 e 256gb",
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
  ["ultramarine", "ultramarino"],
  ["verde azulado", "verde"],
  ["verde agua", "verde"],
  ["mist blue", "azul"],
  ["glacier", "azul"],
  ["burgundy", "bordô"],
  ["bordo", "bordô"],
  ["vinho", "bordô"],
  ["grafite", "grafite"],
  ["deserto", "deserto"],
  ["laranja", "laranja"],
  ["amarelo", "amarelo"],
  ["dourado", "dourado"],
  ["vermelho", "vermelho"],
  ["silver", "prata"],
  ["prata", "prata"],
  ["branco", "branco"],
  ["preto", "preto"],
  ["salvia", "verde"],
  ["sage", "verde"],
  ["verde", "verde"],
  ["teal", "verde"],
  ["green", "verde"],
  ["lavender", "roxo"],
  ["lavanda", "roxo"],
  ["roxo", "roxo"],
  ["rosa", "rosa"],
  ["azul", "azul"],
  ["natural", "titânio natural"],
];

function semAcento(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u200b-\u200d\ufeff]/g, "")
    .toLowerCase()
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function chaveModelo(texto: string) {
  return semAcento(texto)
    .replace(/[()*·•|*]/g, " ")
    .replace(/\biphones?(?=\d)/g, "iphone ")
    .replace(/\bapple\b/g, " ")
    .replace(/\biphones?\b/g, " ")
    .replace(/\b17\s+e\b/g, "17e")
    .replace(/\b16\s+e\b/g, "16e")
    .replace(/\b\d*chips?\b/g, " ")
    .replace(/\bchipi\b/g, " ")
    .replace(/\bfisic[oa]s?\b/g, " ")
    .replace(/\b\d*virtuals?\b/g, " ")
    .replace(/\be\s*sims?\b/g, " ")
    .replace(/\besims?\b/g, " ")
    .replace(/\banatel\b/g, " ")
    .replace(/\bindian[oa]s?\b/g, " ")
    .replace(/\bamerican[oa]s?\b/g, " ")
    .replace(/\bjapones\b/g, " ")
    .replace(/\b(ll|lla)\b/g, " ")
    .replace(/(\d+)\s*g(?:b)?\b/g, "$1gb")
    .replace(/(\d+)\s*tb\b/g, "$1tb")
    .replace(/gb\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function bordaPalavra(texto: string, inicio: number, fim: number) {
  const antes = inicio > 0 ? texto[inicio - 1] : " ";
  const depois = fim < texto.length ? texto[fim] : " ";
  return !/[a-z0-9]/.test(antes) && !/[a-z0-9]/.test(depois);
}

function modeloDoNome(nome: string) {
  if (/\b(realme|poco|xiaomi|redmi|notes?)\b/.test(semAcento(nome))) return null;
  const base = chaveModelo(nome);
  const modelo = [...MODELOS]
    .sort((a, b) => chaveModelo(b).length - chaveModelo(a).length)
    .find((item) => {
      const alvo = chaveModelo(item);
      let desde = 0;
      while (desde < base.length) {
        const indice = base.indexOf(alvo, desde);
        if (indice < 0) return false;
        if (bordaPalavra(base, indice, indice + alvo.length)) return true;
        desde = indice + 1;
      }
      return false;
    });
  if (modelo) return modelo;
  if (/\bultra 4\b/.test(base)) return "watch ultra 4";
  return null;
}

function corDoNome(nome: string) {
  const texto = semAcento(nome);
  const aliases = [...CORES].sort((a, b) => b[0].length - a[0].length);
  for (const [alias, cor] of aliases) {
    let desde = 0;
    while (desde < texto.length) {
      const indice = texto.indexOf(alias, desde);
      if (indice < 0) break;
      if (bordaPalavra(texto, indice, indice + alias.length)) return cor;
      desde = indice + 1;
    }
  }
  return null;
}

function identificar(nome: string) {
  const produto = modeloDoNome(nome);
  const cor = corDoNome(nome);
  if (!produto || !cor) return null;
  return { produto, cor };
}

function coresAceitas(cor: string) {
  const base = semAcento(cor);
  const grupo = new Set<string>([cor, base]);
  if (cor === "branco" || cor === "prata" || base === "branco" || base === "prata") {
    grupo.add("branco");
    grupo.add("prata");
  }
  if (cor === "bordô" || base === "bordo") {
    grupo.add("bordô");
    grupo.add("vinho");
  }
  if (cor === "verde" || base === "verde") {
    grupo.add("verde");
    grupo.add("teal");
    grupo.add("green");
  }
  for (const [alias, canon] of CORES) {
    if (canon === cor || semAcento(canon) === base) grupo.add(canon);
    if (alias === base) grupo.add(canon);
  }
  return [...grupo];
}

function nomeDoProduto(produto: Catalogo) {
  return [produto.name, produto.lojaName].filter((parte) => parte && parte.trim()).join(" ");
}

function ehSeminovo(produto: Catalogo) {
  return semAcento(`${produto.category || ""} ${nomeDoProduto(produto)}`).includes("seminovo");
}

function mesmaLinha(listaModelo: string, nomeProduto: string) {
  const alvo = modeloDoNome(listaModelo);
  const deles = modeloDoNome(nomeProduto);
  if (!alvo || deles !== alvo) return false;
  const extra = ["plus", "pro", "max", "mini", "air"];
  const lista = chaveModelo(listaModelo);
  const produto = chaveModelo(nomeProduto);
  for (const palavra of extra) {
    if (new RegExp(`\\b${palavra}\\b`).test(produto) !== new RegExp(`\\b${palavra}\\b`).test(lista)) return false;
  }
  if (/\b16e\b/.test(produto) !== /\b16e\b/.test(lista)) return false;
  if (/\b17e\b/.test(produto) !== /\b17e\b/.test(lista)) return false;
  return true;
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
  return LISTAS_SP.find((lista) => base.includes(semAcento(lista.chave)))?.nome || "";
}

function diaDe(valor: string) {
  const brasileiro = valor.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (brasileiro) return `${brasileiro[3]}-${brasileiro[2]}-${brasileiro[1]}`;
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return "";
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${data.getFullYear()}-${mes}-${dia}`;
}

function diaDeHoje() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

function minutoEmSaoPaulo() {
  const partes = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const hora = Number(partes.find((parte) => parte.type === "hour")?.value || 0);
  const minuto = Number(partes.find((parte) => parte.type === "minute")?.value || 0);
  return hora * 60 + minuto;
}

function listasDoDiaProntas(listas: ListaFornecedorDados[], hoje: string) {
  const nomes = new Set(listas.filter((lista) => diaDe(lista.quando) === hoje).map((lista) => listaDoLugar(lista.lugar)).filter(Boolean));
  return LISTAS_SP.every((lista) => nomes.has(lista.nome));
}

type CotacaoBruta = { produto: string; cor: string; preco: number; lugar: string };

function encaixar(produtos: Catalogo[], brutas: CotacaoBruta[]): Cotacao[] {
  const saida: Cotacao[] = [];
  for (const produto of produtos) {
    const id = identificar(nomeDoProduto(produto));
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
  lojaName?: string;
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
  const escolhidos = produtosDaLista(produtos, modelo, cor, secao);
  return escolhidos[0] || null;
}

const indicePorProdutos = new WeakMap<Catalogo[], Map<string, Catalogo[]>>();

function indiceCatalogo(produtos: Catalogo[]) {
  const ja = indicePorProdutos.get(produtos);
  if (ja) return ja;
  const mapa = new Map<string, Catalogo[]>();
  for (const produto of produtos) {
    const modelo = modeloDoNome(nomeDoProduto(produto));
    if (!modelo) continue;
    const chave = chaveModelo(modelo);
    const lista = mapa.get(chave) || [];
    lista.push(produto);
    mapa.set(chave, lista);
  }
  indicePorProdutos.set(produtos, mapa);
  return mapa;
}

function produtosDaLista(produtos: Catalogo[], modelo: string, cor: string, secao?: string) {
  const corAlvo = corDoNome(cor) || corDoNome(`${modelo} ${cor}`);
  if (!corAlvo) return [];
  const aceitas = new Set(coresAceitas(corAlvo).map((item) => semAcento(item)));
  const chave = modeloDoNome(modelo);
  const base = chave ? indiceCatalogo(produtos).get(chaveModelo(chave)) || [] : produtos;
  const candidatos = base.filter((produto) => {
    if (!mesmaLinha(modelo, nomeDoProduto(produto))) return false;
    const deles = corDoNome(nomeDoProduto(produto));
    return !!deles && aceitas.has(semAcento(deles));
  });
  if (secao === "lacrados") {
    const novos = candidatos.filter((produto) => !ehSeminovo(produto));
    if (novos.length) return novos;
    return [];
  }
  return candidatos;
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
      const excluido = blocoExcluido(fora, lista.lugar, bloco.modelo, bloco.secao);
      if (excluido && (bloco.secao !== "lacrados" || modeloAtivado(bloco.modelo))) continue;
      for (const item of bloco.itens) {
        if (item.preco == null) continue;
        const manual = preferencia.vinculos[chaveItemLista(lista.lugar, bloco.modelo, item.cor, bloco.secao)];
        if (bloco.secao === "cpo" || modeloAtivado(bloco.modelo)) {
          if (manual) saida.push({ produtoId: manual, lista: nome, preco: item.preco });
          continue;
        }
        const automaticos = produtosDaLista(produtos, bloco.modelo, item.cor, bloco.secao);
        const ligados = new Set(automaticos.map((produto) => produto.id));
        if (manual && !ligados.has(manual)) {
          const apontado = produtos.find((produto) => produto.id === manual);
          const seminovoRuim = bloco.secao === "lacrados" && apontado && ehSeminovo(apontado) && automaticos.length > 0;
          if (apontado && !seminovoRuim) saida.push({ produtoId: manual, lista: nome, preco: item.preco });
        }
        for (const produto of automaticos) {
          saida.push({ produtoId: produto.id, lista: nome, preco: item.preco });
        }
      }
    }
  }
  const jaTem = new Set(saida.map((item) => `${item.produtoId}|${item.lista}`));
  for (const extra of encaixar(
    produtos,
    brutas.filter((item) => oficiais.has(listaDoLugar(item.lugar))),
  )) {
    const chave = `${extra.produtoId}|${extra.lista}`;
    if (jaTem.has(chave)) continue;
    jaTem.add(chave);
    saida.push(extra);
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
  const [precosEm, setPrecosEm] = useState("");
  const [listasFechadas, setListasFechadas] = useState(false);
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
          (item) => item?.name || item?.lojaName
        );
        setProdutos(lista);
        setOrdemCategorias(toFlatOptions(categorias).map((item) => item.label));
        setBrutas(Array.isArray(precosRes?.cotacoes) ? (precosRes.cotacoes as CotacaoBruta[]) : []);
        setListas(Array.isArray(listasRes?.listas) ? (listasRes.listas as ListaFornecedorDados[]) : []);
        setListasFechadas(listasRes?.fechadas === true);
        setAtualizadoEm(typeof listasRes?.atualizadoEm === "string" ? listasRes.atualizadoEm : typeof precosRes?.atualizadoEm === "string" ? precosRes.atualizadoEm : "");
        setPrecosEm(typeof precosRes?.atualizadoEm === "string" ? precosRes.atualizadoEm : "");
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

  const hoje = diaDeHoje();
  const listasProntas = minutoEmSaoPaulo() >= 12 * 60 && (listasFechadas || listasDoDiaProntas(listas, hoje));

  useEffect(() => {
    if (listasProntas) return;
    let cancel = false;
    const timer = window.setInterval(() => {
      Promise.all([
        fetch(`/melhores-precos.json?t=${Date.now()}`).then((resposta) => (resposta.ok ? resposta.json() : null)),
        fetch(`/listas-fornecedor.json?t=${Date.now()}`).then((resposta) => (resposta.ok ? resposta.json() : null)),
      ])
        .then(([precosRes, listasRes]) => {
          if (cancel || !precosRes || !listasRes) return;
          const quando = typeof listasRes.atualizadoEm === "string"
            ? listasRes.atualizadoEm
            : typeof precosRes.atualizadoEm === "string"
              ? precosRes.atualizadoEm
              : "";
          if (quando && quando === atualizadoEm && precosRes?.atualizadoEm === precosEm) return;
          setBrutas(Array.isArray(precosRes.cotacoes) ? (precosRes.cotacoes as CotacaoBruta[]) : []);
          setListas(Array.isArray(listasRes.listas) ? (listasRes.listas as ListaFornecedorDados[]) : []);
          setListasFechadas(listasRes?.fechadas === true);
          if (quando) setAtualizadoEm(quando);
          if (typeof precosRes.atualizadoEm === "string") setPrecosEm(precosRes.atualizadoEm);
        })
        .catch(() => undefined);
    }, 20_000);
    return () => {
      cancel = true;
      window.clearInterval(timer);
    };
  }, [listasProntas, atualizadoEm, precosEm]);

  function gravarPreferencia(proxima: PreferenciaLista) {
    setPreferencia(proxima);
    localStorage.setItem("@gestorvix:lista-vinculos", JSON.stringify(proxima));
  }

  const listasHoje = useMemo(() => listas.filter((lista) => diaDe(lista.quando) === hoje), [listas, hoje]);
  const casar = useMemo(() => {
    const cache = new Map<string, Catalogo | null>();
    return (modelo: string, cor: string, secao?: string) => {
      const chave = `${modelo}|${cor}|${secao || ""}`;
      if (cache.has(chave)) return cache.get(chave) || null;
      const achado = produtoDaLista(produtos, modelo, cor, secao);
      cache.set(chave, achado);
      return achado;
    };
  }, [produtos]);
  const brutasHoje = useMemo(() => (diaDe(precosEm) === hoje ? brutas : []), [brutas, precosEm, hoje]);
  const cotacoes = useMemo(
    () => montarCotacoes(produtos, brutasHoje, listasHoje, preferencia),
    [produtos, brutasHoje, listasHoje, preferencia],
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
          onClick={() => startTransition(() => setVisao("estoque"))}
          className={`pb-1 text-base font-semibold ${visao === "estoque" ? "border-b-2 border-blue-700 text-blue-700" : "text-gray-400"}`}
        >
          Nossos produtos
        </button>
        <button
          type="button"
          onClick={() => startTransition(() => setVisao("fornecedor"))}
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
            listas={listasHoje}
            produtos={produtos}
            excluidos={preferencia.excluidos}
            vinculos={preferencia.vinculos}
            casar={casar}
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
              onClick={() => startTransition(() => setCategoriaAtiva(aba.nome))}
              className={`pb-1 text-base font-semibold ${ativa ? "border-b-2 border-blue-700 text-blue-700" : "text-gray-400"}`}
            >
              {aba.nome} ({aba.itens.length})
            </button>
          );
        })}
      </div>
      <p className="mb-4 text-sm text-gray-600">
        {listasHoje.length === 0
          ? `Nenhuma lista de hoje. A última leitura foi ${atualizadoEm ? new Date(atualizadoEm).toLocaleString("pt-BR") : "de outro dia"}, e esse preço não entra.`
          : listasProntas
            ? "Listas de hoje já estão gravadas. Não fica buscando de novo."
            : "Entram só as listas de hoje. Ainda faltando algum fornecedor, o painel atualiza sozinho."}
        {listasHoje.length && linhas.length ? ` ${linhas.length} produtos, ${semPreco} sem preço.` : ""}
        {listasHoje.length && atualizadoEm ? ` Lido em ${new Date(atualizadoEm).toLocaleString("pt-BR")}.` : ""}
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
                <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">Código</th>
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
                    <td className="px-3 py-2 text-left text-gray-500">{produto.code || "—"}</td>
                    <td className="px-3 py-2 text-left text-gray-800">{produto.name}</td>
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
                  <td className="px-3 py-4 text-gray-500" colSpan={LISTAS_SP.length + 4}>
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

import { api } from "../../../services/api";

type Bruto = Record<string, unknown>;

const produtos = { lista: null as Bruto[] | null };
const categorias = { lista: null as Bruto[] | null };
const historico = { lista: null as Bruto[] | null };
let voo: Promise<void> | null = null;
let vooHist: Promise<Bruto[]> | null = null;
const HISTORICO = "gv:pedido-historico";
const PRODUTOS = "gv:pedido-produtos";
const CATEGORIAS = "gv:pedido-categorias";

function lerSessao(chave: string) {
  try {
    const bruto = sessionStorage.getItem(chave);
    if (!bruto) return null;
    const lista = JSON.parse(bruto) as unknown;
    return Array.isArray(lista) ? (lista as Bruto[]) : null;
  } catch {
    return null;
  }
}

export function lerProdutosPedido() {
  if (produtos.lista) return produtos.lista;
  const salva = lerSessao(PRODUTOS);
  if (salva) produtos.lista = salva;
  return salva;
}

export function lerCategoriasPedido() {
  if (categorias.lista) return categorias.lista;
  const salva = lerSessao(CATEGORIAS);
  if (salva) categorias.lista = salva;
  return salva;
}

function guardar(chave: string, lista: Bruto[]) {
  try {
    sessionStorage.setItem(chave, JSON.stringify(lista));
  } catch {
    /* a lista da memória segue */
  }
}

export function carregarCatalogoPedido(fresco = false) {
  if (!fresco && voo) return voo;
  const pedido = Promise.all([
    api.get("/clients/products", { params: { ativo: "1", vitrine: "1" } }),
    api.get("/clients/catalog/product_category", { params: { ativo: "1" } }),
  ])
    .then(([produtosRes, categoriasRes]) => {
      const lista = Array.isArray(produtosRes.data?.products) ? (produtosRes.data.products as Bruto[]) : [];
      const itens = Array.isArray(categoriasRes.data?.items) ? (categoriasRes.data.items as Bruto[]) : [];
      produtos.lista = lista;
      categorias.lista = itens;
      guardar(PRODUTOS, lista);
      guardar(CATEGORIAS, itens);
    })
    .finally(() => {
      if (voo === pedido) voo = null;
    });
  voo = pedido;
  return pedido;
}

export function lerHistoricoPedido() {
  if (historico.lista) return historico.lista;
  const salva = lerSessao(HISTORICO);
  if (salva) historico.lista = salva;
  return salva;
}

export function carregarHistoricoPedido(fresco = false) {
  if (!fresco && vooHist) return vooHist;
  const pedido = api
    .get("/clients/pre-vendas/fechadas")
    .then(({ data }) => {
      const lista = Array.isArray(data?.orders) ? (data.orders as Bruto[]) : [];
      historico.lista = lista;
      guardar(HISTORICO, lista);
      return lista;
    })
    .finally(() => {
      if (vooHist === pedido) vooHist = null;
    });
  vooHist = pedido;
  return pedido;
}

/** Começa o catálogo e o histórico no menu do lojista, antes de abrir a página. */
export function aquecerCatalogoPedido() {
  void carregarCatalogoPedido().catch(() => undefined);
  void carregarHistoricoPedido().catch(() => undefined);
}

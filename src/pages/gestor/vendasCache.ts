import { api } from "../../services/api";

type Pedido = { id: string };

const memoria = new Map<string, Pedido[]>();
const voos = new Map<string, Promise<Pedido[]>>();
const selo = new Map<string, number>();
const SESSAO = "gv:vendas-concluidas";

function lerSessao() {
  try {
    const bruto = sessionStorage.getItem(SESSAO);
    if (!bruto) return null;
    const lista = JSON.parse(bruto) as unknown;
    return Array.isArray(lista) ? (lista as Pedido[]) : null;
  } catch {
    return null;
  }
}

export function lerVendas(termo = "") {
  const id = termo.trim();
  if (memoria.has(id)) return memoria.get(id) || null;
  if (id) return null;
  const salva = lerSessao();
  if (salva) memoria.set("", salva);
  return salva;
}

export function carregarVendas(termo = "", fresco = false) {
  const id = termo.trim();
  if (!fresco) {
    const voo = voos.get(id);
    if (voo) return voo;
  }
  const atual = (selo.get(id) || 0) + 1;
  selo.set(id, atual);
  const pedido = api
    .get("/backoffice/vendas-concluidas", {
      params: id ? { search: id } : undefined,
    })
    .then(({ data }) => {
      const lista = Array.isArray(data?.orders) ? (data.orders as Pedido[]) : [];
      if (selo.get(id) === atual) {
        memoria.set(id, lista);
        if (!id) {
          try {
            sessionStorage.setItem(SESSAO, JSON.stringify(lista));
          } catch {
            /* a lista da memória segue */
          }
        }
      }
      return lista;
    })
    .finally(() => {
      if (voos.get(id) === pedido) voos.delete(id);
    });
  voos.set(id, pedido);
  return pedido;
}

/** Começa a lista no menu, antes de abrir a página. */
export function aquecerVendas() {
  void carregarVendas("").catch(() => undefined);
}

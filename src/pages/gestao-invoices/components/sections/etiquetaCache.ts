import { api } from "../../../../services/api";

type GrupoEtiqueta = { date?: string; quantity?: number; entries?: unknown[] };

const grupos = new Map<string, GrupoEtiqueta[]>();
const voos = new Map<string, Promise<GrupoEtiqueta[]>>();
const selo = new Map<string, number>();

function chave(inicio: string, fim: string) {
  return `${inicio}|${fim}`;
}

function iso(data: Date) {
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${data.getFullYear()}-${mes}-${dia}`;
}

export function lerGruposEtiqueta(inicio: string, fim: string) {
  return grupos.get(chave(inicio, fim)) || null;
}

export function carregarGruposEtiqueta(inicio: string, fim: string, fresco = false) {
  const id = chave(inicio, fim);
  if (!fresco) {
    const voo = voos.get(id);
    if (voo) return voo;
  }
  const atual = (selo.get(id) || 0) + 1;
  selo.set(id, atual);
  const pedido = api
    .get("/invoice/receipt-history", { params: { from: inicio, to: fim } })
    .then(({ data }) => {
      const lista = Array.isArray(data?.grouped) ? (data.grouped as GrupoEtiqueta[]) : [];
      if (selo.get(id) === atual) grupos.set(id, lista);
      return lista;
    })
    .finally(() => {
      if (voos.get(id) === pedido) voos.delete(id);
    });
  voos.set(id, pedido);
  return pedido;
}

/** Começa a lista no menu, antes de abrir a página. */
export function aquecerEtiquetas() {
  const hoje = new Date();
  const inicio = iso(new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1));
  const fim = iso(new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0));
  void carregarGruposEtiqueta(inicio, fim).catch(() => undefined);
}

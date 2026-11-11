import { fixInvertedDateString } from "../utils/format";
import { saoPauloDay } from "./InvoiceHistoryReport";

export type LinhaRecebimento = {
  id: string;
  date: string;
  quantity: number;
  invoiceId: string;
  invoiceNumber: string;
  supplierName: string;
  productName: string;
  productCode: string;
  operator?: string;
  labelPrintedAt?: string | null;
  invoicePrinted?: boolean;
};

export function isoDoDia(data: Date) {
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${data.getFullYear()}-${mes}-${dia}`;
}

/** Do dia 1 do mês passado até o último dia do mês que vem. */
export function periodoEtiquetas(hoje = new Date()) {
  return {
    inicio: isoDoDia(new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1)),
    fim: isoDoDia(new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)),
  };
}

function diaDaNota(date: string) {
  const corrigida = fixInvertedDateString(String(date || "").trim());
  const soDia = corrigida.match(/^(\d{4}-\d{2}-\d{2})$/);
  if (soDia) return soDia[1];
  const data = new Date(corrigida);
  if (Number.isNaN(data.getTime())) return "";
  return isoDoDia(data);
}

function noPeriodo(date: string, inicio: string, fim: string) {
  const dia = diaDaNota(date);
  if (!dia) return false;
  if (inicio && dia < inicio) return false;
  if (fim && dia > fim) return false;
  return true;
}

export function contarEtiquetas(groups: Array<{ entries?: LinhaRecebimento[] }>, inicio: string, fim: string) {
  const keys = new Set<string>();
  const printedKeys = new Set<string>();
  const gerar = new Set<string>();
  const impressas = new Set<string>();
  const linhas: LinhaRecebimento[] = [];
  for (const group of groups) {
    for (const entry of group.entries || []) {
      linhas.push(entry);
      const id = String(entry.invoiceId || "");
      const numero = entry.invoiceNumber ? String(entry.invoiceNumber) : "";
      if (entry.labelPrintedAt) {
        const day = saoPauloDay(entry.date);
        if (!day) continue;
        if (id) impressas.add(id);
        if (numero) impressas.add(numero);
        printedKeys.add(`${id || numero}|${day}`);
        continue;
      }
      const day = saoPauloDay(entry.date);
      if (!day || !noPeriodo(day, inicio, fim)) continue;
      if (entry.invoicePrinted) continue;
      if (id) gerar.add(id);
      if (numero) gerar.add(numero);
      keys.add(`${id}|${day}`);
    }
  }
  return {
    linhas,
    idsGerar: [...gerar],
    idsImpressas: [...impressas],
    printCount: keys.size,
    printedCount: printedKeys.size,
  };
}

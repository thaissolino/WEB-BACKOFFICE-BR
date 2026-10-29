import { useEffect, useMemo, useState } from "react";
import { api } from "../../services/api";
import { InvoiceHistoryReport, saoPauloDay } from "../gestao-invoices/components/sections/InvoiceHistoryReport";
import type { InvoiceData } from "../gestao-invoices/components/sections/InvoiceHistory";
import { fixInvertedDateString } from "../gestao-invoices/components/utils/format";
import { DatePreset } from "../client/cadastros/catalog/FormBits";
import GestaoShell from "./GestaoShell";
import "../client/cadastros/cadastros.css";

function isFinalizedInvoice(invoice: InvoiceData) {
  return Boolean(invoice.completed && invoice.paid && invoice.labelsPrintedAt);
}

function isoDoDia(data: Date) {
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${data.getFullYear()}-${mes}-${dia}`;
}

function mesAtual() {
  const hoje = new Date();
  return {
    inicio: isoDoDia(new Date(hoje.getFullYear(), hoje.getMonth(), 1)),
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

export default function GestorEtiquetasEntrada() {
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [printCount, setPrintCount] = useState(0);
  const [markTick, setMarkTick] = useState(0);
  const [card, setCard] = useState<"gerar" | "finalizadas">("gerar");
  const [rascunho, setRascunho] = useState(mesAtual);
  const [periodo, setPeriodo] = useState(mesAtual);
  const [pronto, setPronto] = useState(false);

  const noMes = (invoice: InvoiceData) => noPeriodo(invoice.date, periodo.inicio, periodo.fim);
  const labelQueue = useMemo(
    () => invoices.filter((invoice) => !invoice.labelsPrintedAt && noMes(invoice)),
    [invoices, periodo],
  );
  const finalized = useMemo(
    () => invoices.filter((invoice) => isFinalizedInvoice(invoice) && noMes(invoice)),
    [invoices, periodo],
  );

  useEffect(() => {
    api
      .get("/invoice/get")
      .then(({ data }) => setInvoices((data || []) as InvoiceData[]))
      .catch(() => setInvoices([]))
      .finally(() => setPronto(true));
  }, []);

  useEffect(() => {
    let cancel = false;
    const openIds = new Set(invoices.filter((invoice) => !invoice.labelsPrintedAt).map((invoice) => invoice.id));
    api
      .get("/invoice/receipt-history")
      .then(({ data }) => {
        if (cancel) return;
        const keys = new Set<string>();
        const groups = Array.isArray(data?.grouped) ? data.grouped : [];
        for (const group of groups) {
          for (const entry of group.entries || []) {
            if (entry.labelPrintedAt || !openIds.has(entry.invoiceId)) continue;
            const day = saoPauloDay(entry.date);
            if (!day || !noPeriodo(day, periodo.inicio, periodo.fim)) continue;
            keys.add(`${entry.invoiceId}|${day}`);
          }
        }
        setPrintCount(keys.size);
      })
      .catch(() => {
        if (!cancel) setPrintCount(0);
      });
    return () => {
      cancel = true;
    };
  }, [invoices, markTick, periodo]);

  return (
    <GestaoShell
      title="Etiquetas da entrada"
      subtitle="Imprime a invoice que já teve entrada, no padrão da loja, na impressora de etiqueta."
      badge="Etiquetas"
    >
      <section className="pdv-cad-page pdv-cli-page mb-4">
        <div className="pdv-cad-sheet pdv-cad-sheet-wide">
          <form className="pdv-cad-filters" onSubmit={(event) => {
            event.preventDefault();
            setPeriodo(rascunho);
          }}>
            <label>
              Data início
              <span className="pdv-date-field">
                <input
                  type="date"
                  value={rascunho.inicio}
                  onChange={(event) => setRascunho((atual) => ({ ...atual, inicio: event.target.value }))}
                  autoComplete="off"
                />
                <DatePreset onPick={(inicio, fim) => setRascunho({ inicio, fim })} />
              </span>
            </label>
            <label>
              Data fim
              <span className="pdv-date-field">
                <input
                  type="date"
                  value={rascunho.fim}
                  onChange={(event) => setRascunho((atual) => ({ ...atual, fim: event.target.value }))}
                  autoComplete="off"
                />
                <DatePreset onPick={(inicio, fim) => setRascunho({ inicio, fim })} />
              </span>
            </label>
            <div className="pdv-cad-filters-go">
              <button
                className="pdv-cad-btn"
                type="button"
                onClick={() => {
                  const mes = mesAtual();
                  setRascunho(mes);
                  setPeriodo(mes);
                }}
              >
                Limpar
              </button>
              <button className="pdv-cad-btn pdv-cad-btn-blue" type="submit">Buscar</button>
            </div>
          </form>
        </div>
      </section>

      <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        <button
          type="button"
          onClick={() => setCard("gerar")}
          className={`rounded-2xl border bg-white p-6 text-center shadow-sm ${
            card === "gerar" ? "border-gray-900" : "border-gray-100"
          }`}
        >
          <h3 className="mb-2 text-lg font-medium text-blue-700">Gerar etiquetas</h3>
          <p className="text-3xl font-bold text-gray-900">{printCount}</p>
          <p className="text-sm text-gray-600">Recebimento do dia, mesmo parcial</p>
        </button>
        <button
          type="button"
          onClick={() => setCard("finalizadas")}
          className={`rounded-2xl border bg-white p-6 text-center shadow-sm ${
            card === "finalizadas" ? "border-gray-900" : "border-gray-100"
          }`}
        >
          <h3 className="mb-2 text-lg font-medium text-teal-700">Impressas</h3>
          <p className="text-3xl font-bold text-teal-600">{finalized.length}</p>
          <p className="text-sm text-gray-600">Depois da impressão</p>
        </button>
      </div>

      <InvoiceHistoryReport
        printTable
        listReady={pronto}
        reprint={card === "finalizadas"}
        printInvoiceIds={(card === "gerar" ? labelQueue : finalized).map((invoice) => invoice.id)}
        onLabelsPrinted={async ({ invoiceId, invoiceNumber, day, historyIds }) => {
          const id = invoiceId || invoices.find((invoice) => String(invoice.number) === String(invoiceNumber))?.id;
          if (!id) return;
          const reprint = card === "finalizadas";
          const { data } = await api.post(`/invoice/labels-printed/${id}`, {
            ...(day && !reprint ? { day } : {}),
            ...(historyIds?.length ? { ids: historyIds } : {}),
          });
          if (!data?.invoicePrinted) {
            setMarkTick((value) => value + 1);
            return;
          }
          const stamped = data.labelsPrintedAt || new Date().toISOString();
          setInvoices((current) =>
            current.map((invoice) => (invoice.id === id ? { ...invoice, labelsPrintedAt: stamped } : invoice)),
          );
          setMarkTick((value) => value + 1);
        }}
        invoiceHistory={(card === "gerar" ? labelQueue : finalized) as unknown as import("../gestao-invoices/components/sections/InvoiceHistoryReport").InvoiceData[]}
        setInvoiceHistory={
          setInvoices as unknown as React.Dispatch<
            React.SetStateAction<import("../gestao-invoices/components/sections/InvoiceHistoryReport").InvoiceData[]>
          >
        }
      />
    </GestaoShell>
  );
}

import { useEffect, useState } from "react";
import { api } from "../../services/api";
import { InvoiceHistoryReport } from "../gestao-invoices/components/sections/InvoiceHistoryReport";
import type { InvoiceData } from "../gestao-invoices/components/sections/InvoiceHistory";
import { contarEtiquetas, periodoEtiquetas, type LinhaRecebimento } from "../gestao-invoices/components/sections/contagemEtiquetas";
import { carregarGruposEtiqueta, lerGruposEtiqueta } from "../gestao-invoices/components/sections/etiquetaCache";
import { DatePreset } from "../client/cadastros/catalog/FormBits";
import GestaoShell from "./GestaoShell";
import "../client/cadastros/cadastros.css";

function periodoInicial() {
  return periodoEtiquetas();
}

function contaDoPeriodo(inicio: string, fim: string) {
  const groups = lerGruposEtiqueta(inicio, fim);
  if (!groups) return null;
  return contarEtiquetas(groups as Array<{ entries?: LinhaRecebimento[] }>, inicio, fim);
}

export default function GestorEtiquetasEntrada() {
  const faixaInicial = periodoInicial();
  const pronta = contaDoPeriodo(faixaInicial.inicio, faixaInicial.fim);
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [linhas, setLinhas] = useState<LinhaRecebimento[]>(pronta?.linhas ?? []);
  const [printCount, setPrintCount] = useState(pronta?.printCount ?? 0);
  const [printedCount, setPrintedCount] = useState(pronta?.printedCount ?? 0);
  const [markTick, setMarkTick] = useState(0);
  const [card, setCard] = useState<"gerar" | "finalizadas">("gerar");
  const [rascunho, setRascunho] = useState(periodoInicial);
  const [periodo, setPeriodo] = useState(periodoInicial);
  const [pronto, setPronto] = useState(Boolean(pronta));
  const [idsGerar, setIdsGerar] = useState<string[]>(pronta?.idsGerar ?? []);
  const [idsImpressas, setIdsImpressas] = useState<string[]>(pronta?.idsImpressas ?? []);

  useEffect(() => {
    let cancel = false;
    const aplicar = (inicio: string, fim: string) => {
      const conta = contaDoPeriodo(inicio, fim);
      if (!conta) return;
      setLinhas(conta.linhas);
      setIdsGerar(conta.idsGerar);
      setIdsImpressas(conta.idsImpressas);
      setPrintCount(conta.printCount);
      setPrintedCount(conta.printedCount);
      setPronto(true);
    };
    aplicar(periodo.inicio, periodo.fim);
    carregarGruposEtiqueta(periodo.inicio, periodo.fim, markTick > 0)
      .then(() => {
        if (!cancel) aplicar(periodo.inicio, periodo.fim);
      })
      .catch(() => {
        if (!cancel) setPronto(true);
      });
    return () => {
      cancel = true;
    };
  }, [markTick, periodo]);

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
                  const faixa = periodoInicial();
                  setRascunho(faixa);
                  setPeriodo(faixa);
                }}
              >
                Limpar
              </button>
              <button className="pdv-cad-btn pdv-cad-btn-blue" type="submit">Buscar</button>
            </div>
          </form>
        </div>
      </section>

      <div className="pdv-compra-cards pdv-compra-cards-2">
        <button
          type="button"
          className={`pdv-compra-card pdv-compra-card-estornadas${card === "gerar" ? " is-on" : ""}`}
          onClick={() => setCard("gerar")}
        >
          <span>Etiquetas</span>
          <strong>{printCount}</strong>
          <em>Recebimento do dia</em>
        </button>
        <button
          type="button"
          className={`pdv-compra-card pdv-rel-card-impressas${card === "finalizadas" ? " is-on" : ""}`}
          onClick={() => setCard("finalizadas")}
        >
          <span>Impressas</span>
          <strong>{printedCount}</strong>
          <em>Depois da impressão</em>
        </button>
      </div>

      <InvoiceHistoryReport
        printTable
        listReady={pronto}
        seedEntries={linhas}
        onReload={() => setMarkTick((value) => value + 1)}
        reprint={card === "finalizadas"}
        printInvoiceIds={card === "gerar" ? idsGerar : idsImpressas}
        onLabelsPrinted={async ({ invoiceId, invoiceNumber, day, historyIds }) => {
          const id = invoiceId || linhas.find((linha) => String(linha.invoiceNumber) === String(invoiceNumber))?.invoiceId;
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
        invoiceHistory={invoices as unknown as import("../gestao-invoices/components/sections/InvoiceHistoryReport").InvoiceData[]}
        setInvoiceHistory={
          setInvoices as unknown as React.Dispatch<
            React.SetStateAction<import("../gestao-invoices/components/sections/InvoiceHistoryReport").InvoiceData[]>
          >
        }
      />
    </GestaoShell>
  );
}

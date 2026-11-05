import { useEffect, useMemo, useState } from "react";
import { formatCurrency } from "../../../cambiobackoffice/formatCurrencyUtil";
import { InvoiceData, InvoiceHistory } from "./InvoiceHistory";
import { api } from "../../../../services/api";
import { InvoiceHistoryReport } from "./InvoiceHistoryReport";
import { contarEtiquetas, periodoEtiquetas, type LinhaRecebimento } from "./contagemEtiquetas";
import { carregarGruposEtiqueta, lerGruposEtiqueta } from "./etiquetaCache";
import { DatePreset } from "../../../client/cadastros/catalog/FormBits";
import SearchableSelect from "../../../client/cadastros/produtos/SearchableSelect";

const STATUS_OPCOES = [
  { id: "all", label: "Pendentes + Pagas" },
  { id: "pending", label: "Apenas Pendentes" },
  { id: "paid", label: "Apenas Pagas" },
  { id: "completed", label: "Apenas Concluídas" },
  { id: "finalized", label: "Apenas Impressas" },
];

function isFinalizedInvoice(invoice: InvoiceData) {
  return Boolean(invoice.completed && invoice.paid && invoice.labelsPrintedAt);
}

function isAwaitingPrint(invoice: InvoiceData) {
  return Boolean(invoice.completed && invoice.paid && !isFinalizedInvoice(invoice));
}

export function ReportsTab() {
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);

  const [isSaving, setIsSaving] = useState(false);
  const [isSaving2, setIsSaving2] = useState(false);
  const [loading, setLoading] = useState(true);

  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [invoiceResponse, suppliersget] = await Promise.all([
        api.get("/invoice/get"),
        api.get("/invoice/supplier"),
      ]);
      setSuppliers(suppliersget.data);
      setInvoices(invoiceResponse.data);
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchData();
  }, []);

  const faixaEtiquetas = periodoEtiquetas();
  const initialRange = {
    startDate: faixaEtiquetas.inicio,
    endDate: faixaEtiquetas.fim,
  };
  const [filters, setFilters] = useState({
    startDate: initialRange.startDate,
    endDate: initialRange.endDate,
    status: "all",
    supplier: "all",
  });
  const [showReceipts, setShowReceipts] = useState(false);
  const contaInicial = (() => {
    const groups = lerGruposEtiqueta(initialRange.startDate, initialRange.endDate);
    return groups ? contarEtiquetas(groups as Array<{ entries?: LinhaRecebimento[] }>, initialRange.startDate, initialRange.endDate) : null;
  })();
  const [printCount, setPrintCount] = useState(contaInicial?.printCount ?? 0);
  const [printedCount, setPrintedCount] = useState(contaInicial?.printedCount ?? 0);
  const [linhasEtiqueta, setLinhasEtiqueta] = useState<LinhaRecebimento[]>(contaInicial?.linhas ?? []);
  const [idsGerar, setIdsGerar] = useState<string[]>(contaInicial?.idsGerar ?? []);
  const [idsImpressas, setIdsImpressas] = useState<string[]>(contaInicial?.idsImpressas ?? []);
  const [etiquetasProntas, setEtiquetasProntas] = useState(Boolean(contaInicial));
  const [markTick, setMarkTick] = useState(0);

  const pickStatus = (status: string) => {
    setShowReceipts(false);
    setFilters({ ...filters, status });
  };

  const filteredInvoices = invoices.filter((invoice) => {

          const dataTransacao = new Date(invoice.date);

    // Ajusta para o horário local sem afetar a data
    const localDataTransacao = new Date(
      dataTransacao.getFullYear(),
      dataTransacao.getMonth(),
      dataTransacao.getDate()
    );


    // Filtrar por data
    if (filters.startDate && new Date(invoice.date) < new Date(filters.startDate)) {
      return false;
    }
    if (new Date(`${filters.endDate}T23:59:59`) && new Date(invoice.date) > new Date(`${filters.endDate}T23:59:59`)) {
      return false;
    }
    // Filtrar por fornecedor
    if (filters.supplier !== "all" && invoice.supplierId !== filters.supplier) {
      return false;
    }

    // Filtrar por status.
    // Importante: quando o usuário escolhe "Todos", NÃO mostramos concluídas
    // por padrão — concluídas só aparecem na aba específica de Concluídas
    // (ou quando o usuário escolher explicitamente "Apenas Concluídas").
    if (filters.status === "pending") {
      return !invoice.completed && !invoice.paid;
    }
    if (filters.status === "paid") {
      return invoice.paid && !invoice.completed;
    }
    if (filters.status === "completed") {
      return isAwaitingPrint(invoice);
    }
    if (filters.status === "finalized") {
      return isFinalizedInvoice(invoice);
    }
    // status === "all" (Todos): pendentes + pagas, SEM concluídas
    return !invoice.completed;
  });

  const pendingCount = invoices.filter((inv) => !inv.completed && !inv.paid).length;
  const paidCount = invoices.filter((inv) => inv.paid && !inv.completed).length;
  const awaitingPrint = useMemo(() => invoices.filter(isAwaitingPrint), [invoices]);
  const completedCount = awaitingPrint.length;

  useEffect(() => {
    let cancel = false;
    const aplicar = () => {
      const groups = lerGruposEtiqueta(filters.startDate, filters.endDate);
      if (!groups) return;
      const conta = contarEtiquetas(groups as Array<{ entries?: LinhaRecebimento[] }>, filters.startDate, filters.endDate);
      setLinhasEtiqueta(conta.linhas);
      setIdsGerar(conta.idsGerar);
      setIdsImpressas(conta.idsImpressas);
      setPrintCount(conta.printCount);
      setPrintedCount(conta.printedCount);
      setEtiquetasProntas(true);
    };
    aplicar();
    carregarGruposEtiqueta(filters.startDate, filters.endDate, markTick > 0)
      .then(() => {
        if (!cancel) aplicar();
      })
      .catch(() => {
        if (!cancel) setEtiquetasProntas(true);
      });
    return () => {
      cancel = true;
    };
  }, [filters.startDate, filters.endDate, markTick]);

  const statusLabel = STATUS_OPCOES.find((item) => item.id === filters.status)?.label || "Pendentes + Pagas";
  const supplierName = filters.supplier === "all" ? "" : suppliers.find((item) => item.id === filters.supplier)?.name || "";

  return (
    <div className="pdv-cli-page pdv-relatorio-compra">
      <form className="pdv-cad-filters pdv-rel-filters" onSubmit={(event) => event.preventDefault()}>
        <label>
          Data inicial
          <span className="pdv-date-field">
            <input
              type="date"
              value={filters.startDate}
              onChange={(event) => setFilters({ ...filters, startDate: event.target.value })}
            />
            <DatePreset onPick={(startDate, endDate) => setFilters({ ...filters, startDate, endDate })} />
          </span>
        </label>
        <label>
          Data final
          <span className="pdv-date-field">
            <input
              type="date"
              value={filters.endDate}
              onChange={(event) => setFilters({ ...filters, endDate: event.target.value })}
            />
            <DatePreset onPick={(startDate, endDate) => setFilters({ ...filters, startDate, endDate })} />
          </span>
        </label>
        <label>
          Status
          <SearchableSelect
            value={filters.status === "all" ? "" : statusLabel}
            emptyLabel="Pendentes + Pagas"
            options={STATUS_OPCOES.filter((item) => item.id !== "all").map((item) => item.label)}
            onChange={(next) => {
              const achado = STATUS_OPCOES.find((item) => item.label === next);
              pickStatus(achado?.id || "all");
            }}
          />
        </label>
        <label>
          Fornecedor
          <SearchableSelect
            value={supplierName}
            emptyLabel="Todos"
            options={suppliers.map((item) => item.name)}
            onChange={(next) => {
              const achado = suppliers.find((item) => item.name === next);
              setFilters({ ...filters, supplier: achado?.id || "all" });
            }}
          />
        </label>
      </form>

      <div className="pdv-compra-cards pdv-rel-cards">
        <button type="button" className={`pdv-compra-card pdv-compra-card-abertas${filters.status === "pending" && !showReceipts ? " is-on" : ""}`} onClick={() => pickStatus("pending")}>
          <span>Pendentes</span>
          <strong>{pendingCount}</strong>
          <em>Aguardando pagamento</em>
        </button>
        <button type="button" className={`pdv-compra-card pdv-compra-card-concluidas${filters.status === "paid" && !showReceipts ? " is-on" : ""}`} onClick={() => pickStatus("paid")}>
          <span>Pagas</span>
          <strong>{paidCount}</strong>
          <em>Invoices pagas</em>
        </button>
        <button type="button" className={`pdv-compra-card pdv-compra-card-nova${filters.status === "completed" && !showReceipts ? " is-on" : ""}`} onClick={() => pickStatus("completed")}>
          <span>Concluídas</span>
          <strong>{completedCount}</strong>
          <em>Aguardando impressão</em>
        </button>
        <button type="button" className={`pdv-compra-card pdv-compra-card-estornadas${showReceipts ? " is-on" : ""}`} onClick={() => setShowReceipts(true)}>
          <span>Etiquetas</span>
          <strong>{printCount}</strong>
          <em>Recebimento do dia</em>
        </button>
        <button type="button" className={`pdv-compra-card pdv-rel-card-impressas${filters.status === "finalized" && !showReceipts ? " is-on" : ""}`} onClick={() => pickStatus("finalized")}>
          <span>Impressas</span>
          <strong>{printedCount}</strong>
          <em>Depois da impressão</em>
        </button>
      </div>

      {/* Tabela de Relatórios */}
      {/* <InvoiceHistoryReport invoiceHistory={filteredInvoices} setInvoiceHistory={setInvoices} /> */}
      <InvoiceHistoryReport
        printTable={showReceipts || filters.status === "finalized"}
        listReady={etiquetasProntas}
        seedEntries={linhasEtiqueta}
        reprint={filters.status === "finalized" && !showReceipts}
        printInvoiceIds={
          showReceipts
            ? idsGerar
            : filters.status === "finalized"
              ? idsImpressas
              : undefined
        }
        onLabelsPrinted={async ({ invoiceId, invoiceNumber, day, historyIds }) => {
          const id = invoiceId || invoices.find((invoice) => String(invoice.number) === String(invoiceNumber))?.id;
          if (!id) return;
          const reprint = filters.status === "finalized" && !showReceipts;
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
        invoiceHistory={(showReceipts ? awaitingPrint : filteredInvoices) as unknown as import("./InvoiceHistoryReport").InvoiceData[]}
        setInvoiceHistory={
          setInvoices as unknown as React.Dispatch<React.SetStateAction<import("./InvoiceHistoryReport").InvoiceData[]>>
        }
      />
    </div>
  );
}

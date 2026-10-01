import { FormEvent, useEffect, useMemo, useState } from "react";
import { api, parseError } from "../../services/api";
import GestaoShell from "./GestaoShell";

type Line = {
  id: string;
  code: string;
  category: string;
  name: string;
  salePrice: number;
  receivedQuantity: number;
};

type Row = Line & {
  printQty: number;
  selected: boolean;
};

type Loaded = {
  invoice: { id: string; number: string; supplier: string; date: string };
  lines: Line[];
};

function money(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function GestorEtiquetasEntrada() {
  const [number, setNumber] = useState("");
  const [fantasy, setFantasy] = useState("Black Rabbit");
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [printing, setPrinting] = useState(false);

  const total = useMemo(
    () => rows.reduce((sum, row) => sum + (row.selected ? Math.max(0, row.printQty) : 0), 0),
    [rows],
  );

  const labels = useMemo(() => {
    const list: Row[] = [];
    for (const row of rows) {
      if (!row.selected) continue;
      const count = Math.max(0, Math.round(row.printQty));
      for (let index = 0; index < count; index += 1) list.push(row);
    }
    return list;
  }, [rows]);

  async function load(event: FormEvent) {
    event.preventDefault();
    const term = number.trim();
    if (!term) return;
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/invoice/etiquetas-entrada", { params: { number: term } });
      const next = data as Loaded;
      setLoaded(next);
      setRows(
        (next.lines || []).map((line) => ({
          ...line,
          printQty: Math.max(0, Math.round(Number(line.receivedQuantity) || 0)),
          selected: true,
        })),
      );
      if (!next.lines?.length) {
        setError("Essa invoice não tem quantidade recebida. A etiqueta sai da entrada já confirmada.");
      }
    } catch (err) {
      const parsed = parseError(err);
      setLoaded(null);
      setRows([]);
      setError(parsed.friend || parsed.message || "Não foi possível abrir a invoice.");
    } finally {
      setLoading(false);
    }
  }

  function setQty(id: string, value: string) {
    const qty = Math.max(0, Math.round(Number(value.replace(",", ".")) || 0));
    setRows((current) => current.map((row) => (row.id === id ? { ...row, printQty: qty, selected: qty > 0 } : row)));
  }

  function toggle(id: string) {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, selected: !row.selected } : row)));
  }

  function toggleAll(checked: boolean) {
    setRows((current) => current.map((row) => ({ ...row, selected: checked })));
  }

  useEffect(() => {
    if (!printing) return;
    const done = () => setPrinting(false);
    window.addEventListener("afterprint", done);
    const id = window.setTimeout(() => window.print(), 80);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener("afterprint", done);
    };
  }, [printing]);

  function printLabels() {
    if (!labels.length) {
      setError("Marque ao menos um produto com quantidade para imprimir.");
      return;
    }
    setError("");
    setPrinting(true);
  }

  const allOn = rows.length > 0 && rows.every((row) => row.selected);

  return (
    <GestaoShell
      title="Etiquetas da entrada"
      subtitle="Imprime a invoice que já teve entrada, no padrão da loja, na impressora de etiqueta."
      badge="Etiquetas"
    >
      <form className="mb-4 flex flex-wrap items-end gap-3" onSubmit={load}>
        <label className="text-sm font-semibold text-gray-800">
          Número da invoice
          <input
            className="mt-1 block w-48 rounded border border-gray-300 px-3 py-2"
            value={number}
            onChange={(event) => setNumber(event.target.value)}
            placeholder="Ex.: 2247"
          />
        </label>
        <button
          type="submit"
          className="rounded bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
          disabled={loading}
        >
          {loading ? "Abrindo…" : "Abrir entrada"}
        </button>
      </form>

      {error ? (
        <div className="mb-4 rounded border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </div>
      ) : null}

      {loaded ? (
        <div className="etq-sheet rounded border border-gray-200 bg-white p-4">
          <p className="mb-3 text-sm text-gray-700">
            Invoice {loaded.invoice.number}
            {loaded.invoice.supplier ? ` · ${loaded.invoice.supplier}` : ""}
          </p>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b text-xs uppercase tracking-wide text-blue-800">
                <tr>
                  <th className="px-2 py-2">Cód. produto</th>
                  <th className="px-2 py-2">Categoria</th>
                  <th className="px-2 py-2">Nome</th>
                  <th className="px-2 py-2 text-right">Preço venda</th>
                  <th className="px-2 py-2 text-right">Qtd. imp.</th>
                  <th className="px-2 py-2 text-center">
                    <label className="inline-flex items-center gap-1">
                      Imprimir
                      <input type="checkbox" checked={allOn} onChange={(event) => toggleAll(event.target.checked)} />
                    </label>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className="px-2 py-2 font-mono font-semibold">{row.code}</td>
                    <td className="px-2 py-2">{row.category || "—"}</td>
                    <td className="px-2 py-2">{row.name}</td>
                    <td className="px-2 py-2 text-right">{money(row.salePrice)}</td>
                    <td className="px-2 py-2 text-right">
                      <input
                        className="w-16 rounded border border-gray-300 px-2 py-1 text-right"
                        inputMode="numeric"
                        value={row.printQty}
                        onChange={(event) => setQty(row.id, event.target.value)}
                      />
                    </td>
                    <td className="px-2 py-2 text-center">
                      <input type="checkbox" checked={row.selected} onChange={() => toggle(row.id)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
            <label className="text-sm font-semibold text-gray-800">
              Total imprimir
              <input className="mt-1 block w-28 rounded border border-gray-300 px-3 py-2" value={total} readOnly />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-semibold text-gray-800">
                Nome fantasia
                <input
                  className="mt-1 block w-full rounded border border-gray-300 px-3 py-2"
                  value={fantasy}
                  onChange={(event) => setFantasy(event.target.value)}
                />
              </label>
              <label className="text-sm font-semibold text-gray-800">
                Etiqueta
                <input className="mt-1 block w-full rounded border border-gray-300 bg-gray-50 px-3 py-2" value="Padrão Black Rabbit" readOnly />
              </label>
            </div>
            <button
              type="button"
              className="rounded bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
              onClick={printLabels}
            >
              Imprimir
            </button>
          </div>
          <p className="mt-4 text-sm text-gray-600">
            Na janela de impressão, escolha a impressora de etiqueta. Cada unidade sai em uma etiqueta de 50×30 mm, com o nome fantasia, o produto, o código e o preço.
          </p>
        </div>
      ) : null}

      {printing ? (
        <div className="etq-print">
          {labels.map((row, index) => (
            <article className="etq-label" key={`${row.id}-${index}`}>
              <p className="etq-brand">{fantasy || "Black Rabbit"}</p>
              <p className="etq-name">{row.name}</p>
              <p className="etq-code">{row.code}</p>
              <p className="etq-price">{money(row.salePrice)}</p>
            </article>
          ))}
        </div>
      ) : null}

      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .etq-print, .etq-print * { visibility: visible !important; }
          .etq-print {
            position: absolute;
            left: 0;
            top: 0;
          }
          @page { size: 50mm 30mm; margin: 0; }
        }
        .etq-label {
          width: 50mm;
          height: 30mm;
          box-sizing: border-box;
          padding: 2mm 2.5mm;
          page-break-after: always;
          break-after: page;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          color: #111;
          background: #fff;
        }
        .etq-brand { margin: 0; font-size: 8px; letter-spacing: 0.04em; text-transform: uppercase; }
        .etq-name { margin: 0; font-size: 11px; font-weight: 700; line-height: 1.15; }
        .etq-code { margin: 0; font-family: ui-monospace, monospace; font-size: 10px; }
        .etq-price { margin: 0; font-size: 12px; font-weight: 700; }
      `}</style>
    </GestaoShell>
  );
}

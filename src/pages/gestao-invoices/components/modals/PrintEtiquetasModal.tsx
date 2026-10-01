import { useEffect, useMemo, useState } from "react";
import { Printer, X } from "lucide-react";
import { api, parseError } from "../../../../services/api";

type Line = {
  id: string;
  code: string;
  category: string;
  name: string;
  salePrice: number;
  receivedQuantity: number;
};

type Row = Line & { printQty: number; selected: boolean };

function money(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function PrintEtiquetasModal({ number, onClose }: { number: string; onClose: () => void }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [fantasy, setFantasy] = useState("Black Rabbit");
  const [supplier, setSupplier] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    setError("");
    api
      .get("/invoice/etiquetas-entrada", { params: { number } })
      .then(({ data }) => {
        if (cancel) return;
        setSupplier(data?.invoice?.supplier || "");
        setRows(
          ((data?.lines || []) as Line[]).map((line) => ({
            ...line,
            printQty: Math.max(0, Math.round(Number(line.receivedQuantity) || 0)),
            selected: true,
          })),
        );
        if (!data?.lines?.length) {
          setError("Essa invoice ainda não tem quantidade recebida para imprimir.");
        }
      })
      .catch((err) => {
        if (cancel) return;
        const parsed = parseError(err);
        setError(parsed.friend || parsed.message || "Não foi possível abrir a invoice.");
      })
      .finally(() => {
        if (!cancel) setLoading(false);
      });
    return () => {
      cancel = true;
    };
  }, [number]);

  const labels = useMemo(() => {
    const list: Row[] = [];
    for (const row of rows) {
      if (!row.selected) continue;
      const count = Math.max(0, Math.round(row.printQty));
      for (let index = 0; index < count; index += 1) list.push(row);
    }
    return list;
  }, [rows]);

  const total = labels.length;
  const allOn = rows.length > 0 && rows.every((row) => row.selected);

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

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Imprimir etiquetas</h3>
            <p className="text-sm text-gray-600">
              Invoice {number}
              {supplier ? ` · ${supplier}` : ""}. Escolha os produtos desta nota.
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-800" aria-label="Fechar">
            <X size={20} />
          </button>
        </div>

        {loading ? <p className="py-6 text-center text-gray-500">Carregando entrada…</p> : null}
        {error ? (
          <div className="mb-3 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {error}
          </div>
        ) : null}

        {!loading && rows.length ? (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b text-xs uppercase tracking-wide text-blue-800">
                  <tr>
                    <th className="px-2 py-2">Cód.</th>
                    <th className="px-2 py-2">Categoria</th>
                    <th className="px-2 py-2">Nome</th>
                    <th className="px-2 py-2 text-right">Preço</th>
                    <th className="px-2 py-2 text-right">Qtd. imp.</th>
                    <th className="px-2 py-2 text-center">
                      <label className="inline-flex items-center gap-1">
                        Imprimir
                        <input
                          type="checkbox"
                          checked={allOn}
                          onChange={(event) =>
                            setRows((current) => current.map((row) => ({ ...row, selected: event.target.checked })))
                          }
                        />
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
                          onChange={(event) => {
                            const qty = Math.max(0, Math.round(Number(event.target.value) || 0));
                            setRows((current) =>
                              current.map((item) =>
                                item.id === row.id ? { ...item, printQty: qty, selected: qty > 0 } : item,
                              ),
                            );
                          }}
                        />
                      </td>
                      <td className="px-2 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={row.selected}
                          onChange={() =>
                            setRows((current) =>
                              current.map((item) => (item.id === row.id ? { ...item, selected: !item.selected } : item)),
                            )
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
              <label className="text-sm font-semibold text-gray-800">
                Nome fantasia
                <input
                  className="mt-1 block rounded border border-gray-300 px-3 py-2"
                  value={fantasy}
                  onChange={(event) => setFantasy(event.target.value)}
                />
              </label>
              <p className="text-sm text-gray-700">
                Total imprimir: <strong>{total}</strong>
              </p>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
                onClick={() => {
                  if (!labels.length) {
                    setError("Marque ao menos um produto com quantidade.");
                    return;
                  }
                  setError("");
                  setPrinting(true);
                }}
              >
                <Printer size={16} />
                Imprimir
              </button>
            </div>
            <p className="mt-3 text-sm text-gray-600">
              Cada invoice imprime separado. Na janela do Windows, escolha a impressora de etiqueta. O modelo é o Padrão Black Rabbit, 50×30 mm.
            </p>
          </>
        ) : null}
      </div>

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
          .etq-print { position: absolute; left: 0; top: 0; }
          @page { size: 50mm 30mm; margin: 0; }
        }
        .etq-label {
          width: 50mm; height: 30mm; box-sizing: border-box; padding: 2mm 2.5mm;
          page-break-after: always; break-after: page;
          display: flex; flex-direction: column; justify-content: space-between;
          color: #111; background: #fff;
        }
        .etq-brand { margin: 0; font-size: 8px; letter-spacing: 0.04em; text-transform: uppercase; }
        .etq-name { margin: 0; font-size: 11px; font-weight: 700; line-height: 1.15; }
        .etq-code { margin: 0; font-family: ui-monospace, monospace; font-size: 10px; }
        .etq-price { margin: 0; font-size: 12px; font-weight: 700; }
      `}</style>
    </div>
  );
}

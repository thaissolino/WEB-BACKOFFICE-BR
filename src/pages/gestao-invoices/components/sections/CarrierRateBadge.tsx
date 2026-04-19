import { Pencil } from "lucide-react";
import { useEffect, useState } from "react";

interface CarrierRateBadgeProps {
  /** Tipo do freteiro: "percentage" | "perKg" | "perUnit" */
  type?: string;
  /** Valor atual (snapshot da nota OU valor do cadastro). */
  rate: number;
  /** Callback chamado ao salvar um novo valor (override da nota). */
  onSave: (newRate: number) => void;
  /** Rótulo exibido no modal. */
  label?: string;
}

/**
 * Badge clicável que exibe a % (ou valor) do freteiro vigente para a nota
 * e abre um modal para sobrescrever esse valor APENAS para a nota atual.
 *
 * Importante: o valor digitado aqui é gravado em `carrierRateSnapshot`/
 * `carrier2RateSnapshot` da própria invoice. Mudanças posteriores no cadastro
 * do freteiro NÃO afetam esta nota.
 */
export function CarrierRateBadge({ type, rate, onSave, label }: CarrierRateBadgeProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string>("");

  useEffect(() => {
    if (open) {
      setDraft(String(rate ?? "").replace(".", ","));
    }
  }, [open, rate]);

  const unit = type === "percentage" ? "%" : type === "perKg" ? "$/kg" : "$/un";

  const formatted =
    type === "percentage"
      ? `${(rate ?? 0).toLocaleString("pt-BR", {
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        })}%`
      : (rate ?? 0).toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 4,
        });

  const handleSave = () => {
    // Aceita tanto vírgula quanto ponto como separador decimal
    const normalized = draft.replace(",", ".").trim();
    const parsed = Number(normalized);
    if (!normalized || isNaN(parsed) || parsed < 0) {
      return;
    }
    onSave(parsed);
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Clique para editar a % deste freteiro APENAS nesta nota"
        className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 text-sm"
      >
        <span className="font-semibold">{formatted}</span>
        <Pencil size={14} />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-1">
              Ajustar valor do {label ?? "freteiro"}
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Este valor será gravado APENAS nesta nota. Alterações posteriores no
              cadastro do freteiro não vão afetar esta invoice.
            </p>

            <label className="block text-sm font-medium text-gray-700 mb-1">
              Valor ({unit})
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={draft}
              onChange={(e) => {
                const v = e.target.value;
                if (/^[0-9]*[.,]?[0-9]*$/.test(v)) {
                  setDraft(v);
                }
              }}
              placeholder={type === "percentage" ? "Ex: 5,5" : "Ex: 0,12"}
              className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
              autoFocus
            />

            <div className="flex justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-3 py-1.5 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-3 py-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-700"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

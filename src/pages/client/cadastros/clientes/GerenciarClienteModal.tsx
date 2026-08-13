import { createPortal } from "react-dom";
import { useEffect, useRef } from "react";
import {
  ArrowLeftRight,
  BarChart3,
  Calendar,
  CreditCard,
  Folder,
  Printer,
  ScanBarcode,
  Search,
  Truck,
  X,
} from "lucide-react";
import { GERENCIAR_ACTIONS } from "./types";

const ICONS = {
  historico: Folder,
  crediario: CreditCard,
  consignado: ArrowLeftRight,
  imprimir: Printer,
  "analise-credito": BarChart3,
  "gerar-boleto": ScanBarcode,
  "gerenciar-boleto": ScanBarcode,
  "endereco-entrega": Truck,
  caixa: CreditCard,
  "consulta-crediario": Search,
  agendar: Calendar,
} as const;

export default function GerenciarClienteModal({
  name,
  onClose,
  onPick,
}: {
  name: string;
  onClose: () => void;
  onPick: (actionId: string, label: string) => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    cardRef.current?.querySelector<HTMLElement>("[data-pdv-modal-close]")?.focus();

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    }

    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKey);
      previous?.focus?.();
    };
  }, [onClose]);

  return createPortal(
    <div
      className="pdv-cad-manage-scrim"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={cardRef}
        className="pdv-cad-manage-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pdv-cad-manage-title"
      >
        <div className="pdv-cad-manage-head">
          <h2 id="pdv-cad-manage-title">Gerenciar o Cliente: {name}</h2>
          <button
            className="pdv-cad-manage-close"
            type="button"
            aria-label="Fechar"
            data-pdv-modal-close=""
            onClick={onClose}
          >
            <X size={18} strokeWidth={2.2} aria-hidden="true" />
          </button>
        </div>
        <ul className="pdv-cad-manage-list">
          {GERENCIAR_ACTIONS.map((item) => {
            const Icon = ICONS[item.id];
            return (
              <li key={item.id}>
                <button type="button" onClick={() => onPick(item.id, item.label)}>
                  <Icon size={16} strokeWidth={2} aria-hidden="true" />
                  {item.label}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>,
    document.body,
  );
}

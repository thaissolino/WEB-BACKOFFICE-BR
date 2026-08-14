import { X } from "lucide-react";
import { usePdvSession } from "../../dashboard/PdvShell";
import type { PdvProduct } from "./types";

function qtyLabel(value: number) {
  return String(value).replace(".", ",");
}

export default function EstoqueGradeModal({
  product,
  onClose,
}: {
  product: PdvProduct;
  onClose: () => void;
}) {
  const { storeId, stores } = usePdvSession();
  const title = `Estoque da Grade: ${product.code} - ${product.name}`;

  return (
    <div className="pdv-prod-modal-scrim" onClick={onClose}>
      <div
        className="pdv-prod-modal pdv-prod-estoque-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pdv-estoque-grade-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="pdv-prod-estoque-head">
          <h2 id="pdv-estoque-grade-title">{title}</h2>
          <button type="button" className="pdv-prod-win-close" aria-label="Fechar" onClick={onClose}>
            <X size={12} strokeWidth={3} aria-hidden="true" />
          </button>
        </header>
        <div className="pdv-prod-estoque-body">
          <table className="pdv-prod-estoque-table">
            <thead>
              <tr>
                <th rowSpan={2}>Cor</th>
                <th>Estoque</th>
                <th rowSpan={2}>Total</th>
              </tr>
              <tr>
                <th>S/T</th>
              </tr>
            </thead>
            <tbody>
              {stores.map((store) => {
                const qty = qtyLabel(store.id === storeId ? product.stockQuantity : 0);
                return (
                  <StoreBlock key={store.id} name={store.name} qty={qty} />
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StoreBlock({ name, qty }: { name: string; qty: string }) {
  return (
    <>
      <tr className="pdv-prod-estoque-store">
        <td colSpan={3}>{name}</td>
      </tr>
      <tr>
        <td>S/C</td>
        <td>{qty}</td>
        <td>
          <strong>{qty}</strong>
        </td>
      </tr>
      <tr className="pdv-prod-estoque-total">
        <td>Total {name}</td>
        <td>{qty}</td>
        <td>-</td>
      </tr>
      <tr className="pdv-prod-estoque-gap">
        <td colSpan={3}>&nbsp;</td>
      </tr>
    </>
  );
}

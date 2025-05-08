// components/modals/ModalAnaliseProduct.tsx
import React, { useState } from "react";
import { createPortal } from "react-dom";

type Props = {
  product: any;
  onClose: () => void;
  onConfirm: (analiseQuantity: number) => void;
};

export function ModalAnaliseProduct({ product, onClose, onConfirm }: Props) {
  const [quantity, setQuantity] = useState(product.quantity || 0);

  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded shadow max-w-sm w-full">
        <h2 className="text-lg font-semibold mb-4">Enviar para Análise</h2>
        <p className="mb-2 text-sm text-gray-600">
          Produto: <strong>{product.product.name}</strong>
        </p>
        <input
          type="number"
          min={1}
          max={product.quantity}
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
          className="w-full p-2 border rounded mb-4"
        />
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="bg-gray-200 px-4 py-2 rounded">
            Cancelar
          </button>
          <button
            onClick={() => onConfirm(quantity)}
            className="bg-yellow-500 text-white px-4 py-2 rounded"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

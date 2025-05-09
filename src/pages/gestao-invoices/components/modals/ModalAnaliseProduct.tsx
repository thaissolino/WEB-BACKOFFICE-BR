// components/modals/ModalAnaliseProduct.tsx
import { X } from "lucide-react";
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
    <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-md border border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-gray-800">Enviar para Análise</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-red-500 transition-colors">
            <X size={22} />
          </button>
        </div>

        <p className="mb-2 text-sm text-gray-700">
          Produto: <strong>{product.product.name}</strong>
        </p>

        <input
          type="number"
          min={1}
          max={product.quantity}
          value={quantity}
          placeholder="Qtd a analisar"
          onChange={(e) => {
            const val = Number(e.target.value);
            if (val <= product.quantity && val >= 1) {
              setQuantity(val);
            }
          }}
          className="w-full mb-4 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 text-sm text-gray-800 placeholder-gray-400"
        />

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => onConfirm(quantity)}
            className="px-4 py-2 rounded-md text-sm bg-yellow-500 text-white hover:bg-yellow-600 transition-colors"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

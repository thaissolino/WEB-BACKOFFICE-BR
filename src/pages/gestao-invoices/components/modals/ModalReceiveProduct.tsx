// ModalReceiveProduct.tsx
import React from "react";
import ReactDOM from "react-dom";
import { X } from "lucide-react";

export type ProductData = {
  id: string;
  invoiceId: string;
  productId: string;
  quantity: number;
  value: number;
  weight: number;
  total: number;
  received: boolean;
  receivedQuantity: number;
  product: {
    id: string;
    name: string;
    code: string;
    priceweightAverage: number;
    weightAverage: number;
    description: string;
    active: boolean;
  };
};

interface ModalReceiveProductProps {
  product: ProductData;
  onClose: () => void;
  onConfirm: (receivedQuantity: number) => void;
}
export const ModalReceiveProduct: React.FC<ModalReceiveProductProps> = ({ product, onClose, onConfirm }) => {
  const [receivedQuantity, setReceivedQuantity] = React.useState<number | "">("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    // Permite apenas números e vazio
    if (/^\d*$/.test(value)) {
      const num = Number(value);
      if (num <= product.quantity) {
        setReceivedQuantity(value as unknown as number);
      }
    }
  };

  const handleConfirm = () => {
    const num = Number(receivedQuantity);
    if (!isNaN(num)) {
      onConfirm(num);
    }
  };

  return ReactDOM.createPortal(
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-2xl w-full max-w-md shadow-xl border border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-gray-800">Receber Produto</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-red-500 transition-colors">
            <X size={22} />
          </button>
        </div>

        <div className="text-sm text-gray-700 mb-1">
          Produto: <span className="font-semibold">{product.product.name}</span>
        </div>
        <div className="text-sm text-gray-600 mb-4">
          Quantidade total: <span className="font-medium">{product.quantity}</span>
        </div>

        <input
          type="number"
          min={0}
          max={product.quantity - product.receivedQuantity}
          value={receivedQuantity}
          placeholder="Qtd a receber"
          onChange={(e) => {
            const val = Number(e.target.value);
            if (val <= product.quantity - product.receivedQuantity) {
              setReceivedQuantity(val);
            }
          }}
          className="w-full mb-4 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-800 placeholder-gray-400"
        />

        <div className="flex justify-end gap-2 mt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              if (typeof receivedQuantity === "number") onConfirm(receivedQuantity);
            }}
            className="px-4 py-2 rounded-md text-sm bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>,
    document.getElementById("modal-root") as HTMLElement
  );
};

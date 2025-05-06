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
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-full max-w-md shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Receber Produto</h3>
          <button onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <p className="mb-2 text-sm text-gray-700">
          Produto: <strong>{product.product.name}</strong>
        </p>
        <p className="mb-4 text-sm text-gray-600">
          Quantidade Total: <strong>{product.quantity}</strong>
        </p>

        <input
          type="number"
          className="..."
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
        />

        <div className="flex justify-end space-x-2">
          <button onClick={onClose} className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-gray-800">
            Cancelar
          </button>
          <button
            onClick={() => {
              if (typeof receivedQuantity === "number") onConfirm(receivedQuantity);
            }}
            className="..."
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>,
    document.getElementById("modal-root") as HTMLElement
  );
};

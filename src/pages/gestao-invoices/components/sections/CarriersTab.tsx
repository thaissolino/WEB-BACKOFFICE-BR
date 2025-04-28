import { useState } from "react";
import { Truck, Plus, Edit, Trash2 } from "lucide-react";
import { formatCurrency } from "../../../cambiobackoffice/formatCurrencyUtil";
import Swal from "sweetalert2";

interface Carrier {
  id: string;
  name: string;
  type: "percentage" | "perKg" | "perUnit";
  value: number;
}

export function CarriersTab() {
  const [carriers, setCarriers] = useState<Carrier[]>([
    { id: "1", name: "Freteiro X", type: "percentage", value: 5 },
    { id: "2", name: "Freteiro Y", type: "perKg", value: 0.5 },
    { id: "3", name: "Freteiro Z", type: "perUnit", value: 2.0 },
  ]);

  const [showModal, setShowModal] = useState(false);
  const [currentCarrier, setCurrentCarrier] = useState<Carrier | null>(null);

  const getShippingTypeText = (type: string) => {
    switch (type) {
      case "percentage":
        return "%";
      case "perKg":
        return "$/kg";
      case "perUnit":
        return "$/un";
      default:
        return type;
    }
  };

  const handleEdit = (carrier: Carrier) => {
    setCurrentCarrier(carrier);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: "Tem certeza?",
      text: "Você não poderá reverter esta ação!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Sim, excluir!",
      cancelButtonText: "Cancelar",
    });

    if (result.isConfirmed) {
      setCarriers(carriers.filter((carrier) => carrier.id !== id));
      Swal.fire("Excluído!", "O freteiro foi removido com sucesso.", "success");
    }
  };

  const handleSave = () => {
    if (!currentCarrier) return;

    if (currentCarrier.id) {
      // Edição
      setCarriers(carriers.map((c) => (c.id === currentCarrier.id ? currentCarrier : c)));
    } else {
      // Novo
      setCarriers([...carriers, { ...currentCarrier, id: Date.now().toString() }]);
    }

    setShowModal(false);
    setCurrentCarrier(null);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-blue-700">
          <Truck className="mr-2 inline" size={18} />
          Cadastro de Freteiros
        </h2>
        <button
          onClick={() => {
            setCurrentCarrier({
              id: "",
              name: "",
              type: "percentage",
              value: 0,
            });
            setShowModal(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
        >
          <Plus className="mr-2 inline" size={16} />
          Novo Freteiro
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tipo de Frete
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Valor</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {carriers.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                  Nenhum freteiro cadastrado
                </td>
              </tr>
            ) : (
              carriers.map((carrier) => (
                <tr key={carrier.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{carrier.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {getShippingTypeText(carrier.type)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                    {formatCurrency(carrier.value)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onClick={() => handleEdit(carrier)} className="text-blue-600 hover:text-blue-900 mr-3">
                      <Edit size={16} />
                    </button>
                    <button onClick={() => handleDelete(carrier.id)} className="text-red-600 hover:text-red-900">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de Freteiro */}
      {showModal && currentCarrier && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h3 className="text-lg font-medium mb-4">{currentCarrier.id ? "Editar Freteiro" : "Adicionar Freteiro"}</h3>
            <div className="space-y-4">
              <input type="hidden" value={currentCarrier.id} />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input
                  type="text"
                  value={currentCarrier.name}
                  onChange={(e) => setCurrentCarrier({ ...currentCarrier, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Frete</label>
                  <select
                    value={currentCarrier.type}
                    onChange={(e) =>
                      setCurrentCarrier({
                        ...currentCarrier,
                        type: e.target.value as "percentage" | "perKg" | "perUnit",
                      })
                    }
                    className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="percentage">Porcentagem (%)</option>
                    <option value="perKg">Por kg ($/kg)</option>
                    <option value="perUnit">Por peça ($/un)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valor</label>
                  <input
                    type="number"
                    step="0.01"
                    value={currentCarrier.value}
                    onChange={(e) =>
                      setCurrentCarrier({
                        ...currentCarrier,
                        value: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-300 rounded-md">
                Cancelar
              </button>
              <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-md">
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

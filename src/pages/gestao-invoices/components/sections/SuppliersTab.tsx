import { useState } from "react";
import { Building, Plus, Edit, Trash2 } from "lucide-react";
import Swal from "sweetalert2";

interface Supplier {
  id: string;
  name: string;
  phone: string;
}

export function SuppliersTab() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([
    { id: "1", name: "Fornecedor A", phone: "(11) 99999-9999" },
    { id: "2", name: "Fornecedor B", phone: "(21) 88888-8888" },
  ]);

  const [showModal, setShowModal] = useState(false);
  const [currentSupplier, setCurrentSupplier] = useState<Supplier | null>(null);

  const handleEdit = (supplier: Supplier) => {
    setCurrentSupplier(supplier);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: "Remover fornecedor?",
      html: `<p>Esta ação irá:<br>
             • Remover o fornecedor<br>
             • <strong>Não</strong> afetará invoices existentes</p>`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sim, remover",
      cancelButtonText: "Manter fornecedor",
      backdrop: `
        rgba(0,0,0,0.7)
        url("/images/alert-bg.png")
        center top
        no-repeat
      `,
    });

    if (result.isConfirmed) {
      setSuppliers(suppliers.filter((supplier) => supplier.id !== id));
    }
  };

//   Para operações assíncronas:

// ts
// const handleDelete = async (id: string) => {
//   const result = await Swal.fire({
//     title: 'Processando',
//     html: 'Aguarde enquanto excluímos...',
//     allowOutsideClick: false,
//     didOpen: () => {
//       Swal.showLoading();
//     }
//   });

//   try {
//     await api.delete(`/carriers/${id}`);
//     Swal.fire('Sucesso!', 'Excluído com sucesso', 'success');
//   } catch (error) {
//     Swal.fire('Erro!', 'Falha na exclusão', 'error');
//   }
// };
  const handleSave = () => {
    if (!currentSupplier) return;

    if (currentSupplier.id) {
      // Edição
      setSuppliers(suppliers.map((s) => (s.id === currentSupplier.id ? currentSupplier : s)));
    } else {
      // Novo
      setSuppliers([...suppliers, { ...currentSupplier, id: Date.now().toString() }]);
    }

    setShowModal(false);
    setCurrentSupplier(null);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-blue-700">
          <Building className="mr-2 inline" size={18} />
          Cadastro de Fornecedores
        </h2>
        <button
          onClick={() => {
            setCurrentSupplier({ id: "", name: "", phone: "" });
            setShowModal(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
        >
          <Plus className="mr-2 inline" size={16} />
          Novo Fornecedor
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Telefone
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {suppliers.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-4 text-center text-gray-500">
                  Nenhum fornecedor cadastrado
                </td>
              </tr>
            ) : (
              suppliers.map((supplier) => (
                <tr key={supplier.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{supplier.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{supplier.phone || "-"}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onClick={() => handleEdit(supplier)} className="text-blue-600 hover:text-blue-900 mr-3">
                      <Edit size={16} />
                    </button>
                    <button onClick={() => handleDelete(supplier.id)} className="text-red-600 hover:text-red-900">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de Fornecedor */}
      {showModal && currentSupplier && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h3 className="text-lg font-medium mb-4">
              {currentSupplier.id ? "Editar Fornecedor" : "Adicionar Fornecedor"}
            </h3>
            <div className="space-y-4">
              <input type="hidden" value={currentSupplier.id} />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input
                  type="text"
                  value={currentSupplier.name}
                  onChange={(e) => setCurrentSupplier({ ...currentSupplier, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                <input
                  type="text"
                  value={currentSupplier.phone}
                  onChange={(e) => setCurrentSupplier({ ...currentSupplier, phone: e.target.value })}
                  className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                />
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

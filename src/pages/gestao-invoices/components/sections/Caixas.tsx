import React, { useEffect, useState } from "react";
import ModalCaixa from "../modals/ModalCaixa";
import { api } from "../../../../services/api";
import Swal from 'sweetalert2';

export interface Caixa {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

const CaixasTab: React.FC = () => {
  const [caixas, setCaixas] = useState<Caixa[]>([]);
  const [caixaSelecionado, setCaixaSelecionado] = useState<Caixa | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [loadingFetch, setLoadingFetch] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoadingFetch(true);
    try {
      const operacoesResponse = await api.get("/invoice/box");
      setCaixas(operacoesResponse.data);
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
      Swal.fire("Erro", "Erro ao carregar caixas.", "error");
    } finally {
      setLoadingFetch(false);
    }
  };

  const salvarCaixa = async (nome: string, description: string) => {
    // Lógica de salvar caixa
  };

  return (
    <div className="fade-in">
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Selecione um usuário</label>

        {loadingFetch ? (
          <p className="text-sm text-gray-500">Carregando caixas...</p>
        ) : (
          <div className="flex items-center space-x-4">
            <select
              className="border border-gray-300 rounded p-2 w-full"
              value={selectedUserId || ""}
              onChange={(e) => {
                setSelectedUserId(Number(e.target.value));
                setCaixaSelecionado(null);
              }}
              disabled={loadingFetch}
            >
              <option value="" disabled>
                -- Selecione --
              </option>
              {caixas.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => setShowModal(true)}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
              disabled={loadingFetch}
            >
              <i className="fas fa-plus mr-2"></i> ADICIONAR
            </button>
          </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-blue-600 font-semibold text-lg flex items-center mb-2">
          <i className="fas fa-store mr-2"></i> CAIXAS INDIVIDUAIS
        </h2>
        <table className="min-w-full bg-white">
          <thead>
            <tr className="bg-gray-100 text-gray-700">
              <th className="py-2 px-4 border">NOME</th>
              <th className="py-2 px-4 border">SALDO (USD)</th>
              <th className="py-2 px-4 border">AÇÕES</th>
            </tr>
          </thead>
          <tbody>
              <tr className="hover:bg-gray-50">
                <td className="py-2 px-4 border">{'teste'}</td>
                <td className="py-2 px-4 border">{'tesate'}</td>
                <td className="py-2 px-4 border space-x-2 text-center">
                  <button
                    // onClick={() => abrirCaixa(c)}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded"
                  >
                    Caixa
                  </button>
                  <button
                    onClick={() => {
                      // setEditarCaixa(c);
                      setShowModal(true);
                    }}
                    className="bg-yellow-400 hover:bg-yellow-500 text-white px-3 py-1 rounded"
                  >
                    Editar
                  </button>
                  <button
                    // onClick={() => confirmarDeleteCaixa(c.id)}
                    className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded"
                  >
                    <i className="fas fa-trash"></i>
                  </button>
                </td>
              </tr>
            
          </tbody>
        </table>
      </div>

      <ModalCaixa
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSave={salvarCaixa}
      />
    </div>
  );
};

export default CaixasTab;

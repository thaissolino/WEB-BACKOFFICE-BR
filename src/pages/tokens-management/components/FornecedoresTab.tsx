import React, { useEffect, useState } from "react";
import { formatCurrency } from "./format";

interface FornecedoresTabProps {
  onOpenModal: () => void;
}

interface Fornecedor {
  id: number;
  nome: string;
  taxa: number;
  saldo: number;
  transacoes: any[];
}

const FornecedoresTab: React.FC<FornecedoresTabProps> = ({ onOpenModal }) => {
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);

  useEffect(() => {
    const dados = localStorage.getItem("fornecedores") || "[]";
    setFornecedores(JSON.parse(dados));
  }, []);

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-green-700 flex items-center">
          <i className="fas fa-truck mr-2"></i> FORNECEDORES
        </h2>
        <button
          onClick={onOpenModal}
          className="flex items-center bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2 rounded"
        >
          <i className="fas fa-plus mr-2"></i> ADICIONAR
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white rounded-lg overflow-hidden">
          <thead>
            <tr className="bg-gray-100 text-gray-700 text-sm">
              <th className="py-2 px-4 border text-center">NOME</th>
              <th className="py-2 px-4 border text-center">TAXA</th>
              <th className="py-2 px-4 border text-center">SALDO (USD)</th>
              <th className="py-2 px-4 border text-center">AÇÕES</th>
            </tr>
          </thead>
          <tbody id="tabelaFornecedores">
            {fornecedores.length > 0 ? (
              fornecedores.map((f) => (
                <tr key={f.id} className="hover:bg-gray-50 text-sm">
                  <td className="py-2 px-4 border text-center font-medium">
                    {f.nome.toUpperCase()}
                  </td>
                  <td className="py-2 px-4 border text-center">{f.taxa}</td>
                  <td
                    className={`py-2 px-4 border text-center font-semibold ${
                      f.saldo >= 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {formatCurrency(f.saldo)}
                  </td>
                  <td className="py-2 px-4 border text-center space-x-2">
                    <button
                      className="text-blue-500 hover:text-blue-700"
                      title="Editar"
                    >
                      <i className="fas fa-edit"></i>
                    </button>
                    <button
                      className="text-red-500 hover:text-red-700"
                      title="Excluir"
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="py-6 text-center text-gray-500">
                  NENHUM FORNECEDOR CADASTRADO
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default FornecedoresTab;

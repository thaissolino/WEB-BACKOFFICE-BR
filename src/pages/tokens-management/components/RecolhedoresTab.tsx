import React, { useEffect, useState } from "react";
import { formatCurrency } from "./format";

interface RecolhedoresTabProps {
  onOpenModal: () => void;
}

interface Recolhedor {
  id: number;
  nome: string;
  taxa: number;
  saldo: number;
  transacoes: any[];
}

const RecolhedoresTab: React.FC<RecolhedoresTabProps> = ({ onOpenModal }) => {
  const [recolhedores, setRecolhedores] = useState<Recolhedor[]>([]);

  useEffect(() => {
    const dados = localStorage.getItem("recolhedores") || "[]";
    setRecolhedores(JSON.parse(dados));
  }, []);

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-blue-700">
          <i className="fas fa-users mr-2"></i>RECOLHEDORES
        </h2>
        <button
          onClick={onOpenModal}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
        >
          <i className="fas fa-plus mr-2"></i>ADICIONAR
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white">
          <thead>
            <tr className="bg-gray-200">
              <th className="py-2 px-4 border">NOME</th>
              <th className="py-2 px-4 border">TAXA</th>
              <th className="py-2 px-4 border">SALDO (USD)</th>
              <th className="py-2 px-4 border">AÇÕES</th>
            </tr>
          </thead>
          <tbody>
            {recolhedores.length > 0 ? (
              recolhedores.map((r) => (
                <tr
                  key={r.id}
                  className="hover:bg-gray-50 cursor-pointer"
                >
                  <td className="py-2 px-4 border text-center">
                    {r.nome.toUpperCase()}
                  </td>
                  <td className="py-2 px-4 border text-center">{r.taxa}</td>
                  <td
                    className={`py-2 px-4 border text-center ${
                      r.saldo > 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {formatCurrency(r.saldo)}
                  </td>
                  <td className="py-2 px-4 border text-center">
                    <button className="text-blue-500 hover:text-blue-700 mr-2">
                      <i className="fas fa-edit"></i>
                    </button>
                    <button className="text-red-500 hover:text-red-700">
                      <i className="fas fa-trash"></i>
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={4}
                  className="py-4 text-center text-gray-500"
                >
                  NENHUM RECOLHEDOR CADASTRADO
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RecolhedoresTab;

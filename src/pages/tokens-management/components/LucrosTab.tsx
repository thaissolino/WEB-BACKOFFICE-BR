import React, { useEffect, useState } from "react";
import { formatCurrency, formatDate } from "./format";

interface Operacao {
  id: number;
  date: string;
  city: string;
  value: number;
  collectorId: number;
  supplierId: number;
  collectorTax: number;
  supplierTax: number;
  profit: number;
}

interface Recolhedor {
  id: number;
  nome: string;
}

interface Fornecedor {
  id: number;
  nome: string;
}

const LucrosTab: React.FC = () => {
  const [operacoes, setOperacoes] = useState<Operacao[]>([]);
  const [recolhedores, setRecolhedores] = useState<Recolhedor[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const itensPorPagina = 10;

  useEffect(() => {
    const storedOperacoes = JSON.parse(localStorage.getItem("operacoes") || "[]");
    setOperacoes(storedOperacoes);

    const storedRecolhedores = JSON.parse(localStorage.getItem("recolhedores") || "[]");
    setRecolhedores(storedRecolhedores);

    const storedFornecedores = JSON.parse(localStorage.getItem("fornecedores") || "[]");
    setFornecedores(storedFornecedores);
  }, []);

  const lucroMesAtual = operacoes
    .filter((op) => {
      const data = new Date(op.date);
      return !isNaN(data.getTime()) && data.getMonth() === new Date().getMonth();
    })
    .reduce((acc, op) => acc + (op.profit || 0), 0);

  const lucroMesAnterior = operacoes
    .filter((op) => {
      const data = new Date(op.date);
      const mesAtual = new Date().getMonth();
      return !isNaN(data.getTime()) && data.getMonth() === (mesAtual === 0 ? 11 : mesAtual - 1);
    })
    .reduce((acc, op) => acc + (op.profit || 0), 0);

  const totalAcumulado = operacoes
    .filter((op) => !isNaN(new Date(op.date).getTime()))
    .reduce((acc, op) => acc + (op.profit || 0), 0);

  const totalPaginas = Math.ceil(operacoes.length / itensPorPagina);
  const operacoesPaginadas = operacoes.slice((paginaAtual - 1) * itensPorPagina, paginaAtual * itensPorPagina);

  const getRecolhedorNome = (id: number) => recolhedores.find((r) => r.id === id)?.nome || "Desconhecido";
  const getFornecedorNome = (id: number) => fornecedores.find((f) => f.id === id)?.nome || "Desconhecido";

  return (
    <div className="fade-in">
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4 text-green-700 border-b pb-2">
          <i className="fas fa-chart-line mr-2"></i> HISTÓRICO DE LUCROS
        </h2>

        {/* Resumo */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-medium mb-2">LUCRO ESTE MÊS</h3>
            <p className="text-2xl font-bold text-blue-600">{formatCurrency(lucroMesAtual)}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="font-medium mb-2">LUCRO MÊS ANTERIOR</h3>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(lucroMesAnterior)}</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <h3 className="font-medium mb-2">TOTAL ACUMULADO</h3>
            <p className="text-2xl font-bold text-purple-600">{formatCurrency(totalAcumulado)}</p>
          </div>
        </div>

        {/* Tabela */}
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white">
            <thead>
              <tr className="bg-gray-200">
                <th className="py-2 px-4 border">DATA</th>
                <th className="py-2 px-4 border">OPERAÇÃO</th>
                <th className="py-2 px-4 border">RECOLHEDOR</th>
                <th className="py-2 px-4 border">FORNECEDOR</th>
                <th className="py-2 px-4 border">VALOR OPERAÇÃO</th>
                <th className="py-2 px-4 border">LUCRO</th>
              </tr>
            </thead>
            <tbody>
              {operacoesPaginadas.map((op) => {
                if (!op.date || isNaN(new Date(op.date).getTime())) return null;

                return (
                  <tr key={op.id}>
                    <td className="py-2 px-4 border">{formatDate(op.date)}</td>
                    <td className="py-2 px-4 border">{op.city || "Desconhecido"}</td>
                    <td className="py-2 px-4 border">{getRecolhedorNome(op.collectorId)}</td>
                    <td className="py-2 px-4 border">{getFornecedorNome(op.supplierId)}</td>
                    <td className="py-2 px-4 border text-right">{formatCurrency(op.value || 0)}</td>
                    <td className="py-2 px-4 border text-right">{formatCurrency(op.profit || 0)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        <div className="mt-4 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            Página {paginaAtual} de {totalPaginas}
          </div>
          <div className="flex space-x-2">
            <button
              disabled={paginaAtual === 1}
              onClick={() => setPaginaAtual((prev) => prev - 1)}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              ANTERIOR
            </button>
            <button
              disabled={paginaAtual === totalPaginas}
              onClick={() => setPaginaAtual((prev) => prev + 1)}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              PRÓXIMA
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LucrosTab;

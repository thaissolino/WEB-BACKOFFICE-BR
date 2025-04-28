// src/components/LucrosTab.tsx

import React, { useEffect, useState } from "react";
import { formatCurrency, formatDate } from "./format";

interface Lucro {
  id: number;
  operacaoId: number;
  data: string;
  valor: number;
  recolhedorId: number;
  fornecedorId: number;
}

const LucrosTab: React.FC = () => {
  const [lucros, setLucros] = useState<Lucro[]>([]);
  const [operacoes, setOperacoes] = useState<any[]>([]);
  const [recolhedores, setRecolhedores] = useState<any[]>([]);
  const [fornecedores, setFornecedores] = useState<any[]>([]);

  const [paginaAtual, setPaginaAtual] = useState(1);
  const itensPorPagina = 20;

  useEffect(() => {
    const dados = localStorage.getItem("lucros") || "[]";
    const ops = localStorage.getItem("operacoes") || "[]";
    const rec = localStorage.getItem("recolhedores") || "[]";
    const forn = localStorage.getItem("fornecedores") || "[]";

    setLucros(JSON.parse(dados));
    setOperacoes(JSON.parse(ops));
    setRecolhedores(JSON.parse(rec));
    setFornecedores(JSON.parse(forn));
  }, []);

  const lucroTotal = lucros.reduce((acc, l) => acc + l.valor, 0);

  const lucroMesAtual = lucros.filter((l) => {
    const d = new Date(l.data);
    const hoje = new Date();
    return d.getMonth() === hoje.getMonth() && d.getFullYear() === hoje.getFullYear();
  }).reduce((acc, l) => acc + l.valor, 0);

  const lucroMesAnterior = lucros.filter((l) => {
    const d = new Date(l.data);
    const hoje = new Date();
    const mesAnterior = hoje.getMonth() === 0 ? 11 : hoje.getMonth() - 1;
    const anoAnterior = hoje.getMonth() === 0 ? hoje.getFullYear() - 1 : hoje.getFullYear();
    return d.getMonth() === mesAnterior && d.getFullYear() === anoAnterior;
  }).reduce((acc, l) => acc + l.valor, 0);

  const totalPaginas = Math.ceil(lucros.length / itensPorPagina);
  const inicio = (paginaAtual - 1) * itensPorPagina;
  const fim = inicio + itensPorPagina;
  const lucrosPaginados = [...lucros].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()).slice(inicio, fim);

  const getNomeRecolhedor = (id: number) => recolhedores.find((r) => r.id === id)?.nome || "N/A";
  const getNomeFornecedor = (id: number) => fornecedores.find((f) => f.id === id)?.nome || "N/A";

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4 text-green-700 border-b pb-2 flex items-center">
        <i className="fas fa-chart-line mr-2"></i> HISTÓRICO DE LUCROS
      </h2>

      {/* Resumo Mensal */}
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
          <p className="text-2xl font-bold text-purple-600">{formatCurrency(lucroTotal)}</p>
        </div>
      </div>

      {/* Tabela de Lucros */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white">
          <thead>
            <tr className="bg-gray-200 text-gray-700 text-sm">
              <th className="py-2 px-4 border text-center">DATA</th>
              <th className="py-2 px-4 border text-center">OPERAÇÃO</th>
              <th className="py-2 px-4 border text-center">RECOLHEDOR</th>
              <th className="py-2 px-4 border text-center">FORNECEDOR</th>
              <th className="py-2 px-4 border text-center">VALOR OPERAÇÃO</th>
              <th className="py-2 px-4 border text-center">LUCRO</th>
            </tr>
          </thead>
          <tbody>
            {lucrosPaginados.length > 0 ? (
              lucrosPaginados.map((lucro) => {
                const operacao = operacoes.find((op) => op.id === lucro.operacaoId);
                return (
                  <tr key={lucro.id} className="hover:bg-gray-50 text-sm">
                    <td className="py-2 px-4 border text-center">{formatDate(lucro.data)}</td>
                    <td className="py-2 px-4 border text-center">{operacao ? operacao.local.toUpperCase() : "N/A"}</td>
                    <td className="py-2 px-4 border text-center">{getNomeRecolhedor(lucro.recolhedorId)}</td>
                    <td className="py-2 px-4 border text-center">{getNomeFornecedor(lucro.fornecedorId)}</td>
                    <td className="py-2 px-4 border text-center">{operacao ? formatCurrency(operacao.valor) : "-"}</td>
                    <td className="py-2 px-4 border text-center text-green-600 font-semibold">
                      {formatCurrency(lucro.valor)}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={6} className="py-6 text-center text-gray-500">
                  NENHUM LUCRO REGISTRADO
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      <div className="mt-4 flex justify-between items-center">
        <div className="text-sm text-gray-600">
          PÁGINA {paginaAtual} DE {totalPaginas} - {lucros.length} REGISTROS
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setPaginaAtual((prev) => Math.max(1, prev - 1))}
            disabled={paginaAtual === 1}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            ANTERIOR
          </button>
          <button
            onClick={() => setPaginaAtual((prev) => Math.min(totalPaginas, prev + 1))}
            disabled={paginaAtual === totalPaginas}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            PRÓXIMA
          </button>
        </div>
      </div>
    </div>
  );
};

export default LucrosTab;

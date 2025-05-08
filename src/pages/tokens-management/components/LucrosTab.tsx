import React, { useEffect, useState } from "react";
import { formatCurrency, formatDate } from "./format";
import { api } from "../../../services/api"; // Importe sua instância do Axios pré-configurada
import { motion } from "framer-motion";

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
  comission: number;
}

interface Recolhedor {
  id: number;
  name: string;
}

interface Fornecedor {
  id: number;
  name: string;
}

const LucrosTab: React.FC = () => {
  const [operacoes, setOperacoes] = useState<Operacao[]>([]);
  const [recolhedores, setRecolhedores] = useState<Recolhedor[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [itensPorPagina] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOperacoes = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get(`/operations/list_operations`, {
          params: {
            _page: paginaAtual,
            _limit: itensPorPagina,
          },
        });

        setOperacoes(response.data);
        const totalCount = response.headers["x-total-count"];
        setTotalPaginas(totalCount ? Math.ceil(parseInt(totalCount, 10) / itensPorPagina) : 1);

        // Fetch collectors and suppliers concurrently
        const collectorIds = Array.from(new Set<number>(response.data.map((op: any) => op.collectorId)));
        const supplierIds = Array.from(new Set<number>(response.data.map((op: any) => op.supplierId)));

        const fetchCollectors = Promise.all(
          collectorIds.map(async (id) => {
            try {
              const res = await api.get<Recolhedor>(`/collectors/list_collector/${id}`);
              return res.data;
            } catch (error) {
              console.error(`Erro ao buscar recolhedor com ID ${id}:`, error);
              return null; // Ou algum objeto padrão para indicar falha
            }
          })
        );

        const fetchSuppliers = Promise.all(
          supplierIds.map(async (id) => {
            try {
              const res = await api.get<Fornecedor>(`/suppliers/list_supplier/${id}`);
              return res.data;
            } catch (error) {
              console.error(`Erro ao buscar fornecedor com ID ${id}:`, error);
              return null; // Ou algum objeto padrão para indicar falha
            }
          })
        );

        const [collectorsData, suppliersData] = await Promise.all([fetchCollectors, fetchSuppliers]);

        // Filter out any null results in case of failed requests
        setRecolhedores(collectorsData.filter((r): r is Recolhedor => r !== null));
        setFornecedores(suppliersData.filter((f): f is Fornecedor => f !== null));
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    fetchOperacoes();
  }, [paginaAtual, itensPorPagina]);

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

  const getRecolhedorNome = (id: number) => recolhedores.find((r) => r?.id === id)?.name || "Desconhecido";
  const getFornecedorNome = (id: number) => fornecedores.find((f) => f?.id === id)?.name || "Desconhecido";

  const deletarOperacao = async (id: number) => {
    try {
      await api.delete(`/operations/delete_operation/${id}`);
      setOperacoes((prev) => prev.filter((op) => op.id !== id));
      alert("Operação deletada com sucesso.");
    } catch (e: any) {
      alert(`Erro ao deletar operação: ${e.message}`);
    }
  };

  if (loading) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-center h-64">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
            className="inline-block w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full mb-4"
          ></motion.div>
          <p className="text-lg text-green-700 font-medium">Carregando Lucros...</p>
        </div>
      </motion.div>
    );
  }

  if (error) {
    return <div>Erro ao carregar dados: {error}</div>;
  }

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
            <p className="text-2xl font-bold text-purple-600">{formatCurrency(lucroMesAnterior + lucroMesAtual)}</p>
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
                <th className="py-2 px-4 border">AÇÕES</th>
              </tr>
            </thead>
            <tbody>
              {operacoes
                .filter((op) => op.comission === undefined || op.comission === null || op.comission === 0)
                .map((op) => {
                  if (!op.date || isNaN(new Date(op.date).getTime())) return null;
                  const recolhedorNome = getRecolhedorNome(op.collectorId);
                  const fornecedorNome = getFornecedorNome(op.supplierId);

                  return (
                    <tr key={op.id}>
                      <td className="py-2 px-4 text-center border">{formatDate(op.date)}</td>
                      <td className="py-2 px-4 text-center border">{op.city || "Desconhecido"}</td>
                      <td className="py-2 px-4 text-center border">{recolhedorNome}</td>
                      <td className="py-2 px-4 text-center border">{fornecedorNome}</td>
                      <td className="py-2 px-4 border text-center">{formatCurrency(op.value || 0)}</td>
                      <td className="py-2 px-4 border text-center">{formatCurrency(op.profit || 0)}</td>
                      <td className="py-2 px-4 border text-center">
                        <button
                          onClick={() => deletarOperacao(op.id)}
                          className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded justify-self-end"
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      </td>
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

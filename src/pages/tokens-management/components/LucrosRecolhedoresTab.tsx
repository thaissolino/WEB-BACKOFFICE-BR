import React, { useEffect, useState } from "react";
import { formatCurrency, formatDate } from "./format";
import { motion, AnimatePresence } from "framer-motion";
import ModalRecolhedor from "./ModalRecolhedor";
import ConfirmModal from "./ConfirmModal";
import { api } from "../../../services/api";

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

interface Transacao {
  id: number | string;
  date: string;
  valor: number;
  descricao: string;
  tipo: string;
}

interface Recolhedor {
  id: number;
  name: string;
  tax: number;
  balance: number;
  transacoes?: Transacao[];
}

interface Fornecedor {
  id: number;
  name: string;
}

interface Payment {
  id: number;
  date: string;
  amount: number;
  description: string;
  collectorId?: number;
  supplierId?: number;
}

const LucrosRecolhedoresFusionTab: React.FC = () => {
  const [operacoes, setOperacoes] = useState<Operacao[]>([]);
  const [recolhedores, setRecolhedores] = useState<Recolhedor[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [saldoAcumulado, setSaldoAcumulado] = useState(0);
  const [calculatedBalances, setCalculatedBalances] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [itensPorPagina] = useState(10);

  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [opRes, recRes, payRes] = await Promise.all([
          api.get("/operations/list_operations", {
            params: { _page: paginaAtual, _limit: itensPorPagina },
          }),
          api.get("/collectors/list_collectors"),
          api.get("/api/payments"),
        ]);

        setOperacoes(opRes.data);
        setRecolhedores(recRes.data);
        setPayments(payRes.data);

        const totalCount = opRes.headers["x-total-count"];
        setTotalPaginas(totalCount ? Math.ceil(parseInt(totalCount, 10) / itensPorPagina) : 1);

        const balances: Record<number, number> = {};
        recRes.data.forEach((r: Recolhedor) => {
          balances[r.id] = computeBalance(r, opRes.data, payRes.data);
        });
        setCalculatedBalances(balances);
        setSaldoAcumulado(Object.values(balances).reduce((a, b) => a + b, 0));

        const supplierIds = Array.from(new Set(opRes.data.map((op: any) => op.supplierId)));
        const supplierData = await Promise.all(
          supplierIds.map(async (id) => {
            try {
              const res = await api.get<Fornecedor>(`/suppliers/list_supplier/${id}`);
              return res.data;
            } catch (e) {
              return null;
            }
          })
        );
        setFornecedores(supplierData.filter((f): f is Fornecedor => f !== null));
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [paginaAtual, itensPorPagina]);

  const lucroMesAtual = operacoes
    .filter((op) => new Date(op.date).getMonth() === new Date().getMonth())
    .reduce((acc, op) => acc + (op.profit || 0), 0);

  const lucroMesAnterior = operacoes
    .filter((op) => new Date(op.date).getMonth() === new Date().getMonth() - 1)
    .reduce((acc, op) => acc + (op.profit || 0), 0);

  const deletarOperacao = async (id: number) => {
    try {
      await api.delete(`/operations/delete_operation/${id}`);
      setOperacoes((prev) => prev.filter((op) => op.id !== id));
      alert("Operação deletada com sucesso.");
    } catch (e: any) {
      alert(`Erro ao deletar operação: ${e.message}`);
    }
  };

  function computeBalance(r: Recolhedor, ops: Operacao[], payments: Payment[]) {
    const collectorOperations = ops
      .filter((o) => o.collectorId === r.id)
      .map((o) => -(o.value / (o.collectorTax || r.tax || 1)));
    const collectorPayments = payments.filter((p) => p.collectorId === r.id).map((p) => p.amount);
    return [...collectorOperations, ...collectorPayments].reduce((a, b) => a + b, 0);
  }

  if (loading) {
     return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-center h-64">
            <div className="text-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                className="inline-block w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full mb-4"
              ></motion.div>
              <p className="text-lg text-green-700 font-medium">Carregando Lucro Recolhedores...</p>
            </div>
          </motion.div>
        );
  }

  if (error) {
    return <div className="text-red-600 p-4">Erro: {error}</div>;
  }

  return (
    <div className="fade-in space-y-6">
      {/* Parte 1: Lucros */}
      <div className="bg-white p-2 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4 text-green-700 border-b pb-2">
          <i className="fas fa-users mr-2"></i> HISTÓRICO DE LUCROS POR RECOLHEDORES
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-purple-50 p-4 rounded-lg mb-4">
            <h3 className="font-medium mb-2">SALDO ACUMULADO</h3>
            <p className="text-2xl font-bold text-purple-600">{formatCurrency(saldoAcumulado, 2, "USD")}</p>
          </div>
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
            <p className="text-2xl font-bold text-purple-600">{formatCurrency(lucroMesAtual + lucroMesAnterior)}</p>
          </div>
        </div>
      </div>

      {/* Parte 2: Recolhedores */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white">
            <thead className="bg-gray-200">
              <tr>
                <th className="py-2 px-4 border">NOME</th>
                <th className="py-2 px-4 border">SALDO (USD)</th>
                <th className="py-2 px-4 border">AÇÕES</th>
              </tr>
            </thead>
            <tbody>
              {recolhedores.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="py-2 px-4 border text-center">{r.name}</td>
                  <td
                    className={`py-2 px-4 border text-center font-bold ${
                      calculatedBalances[r.id] < 0 ? "text-red-600" : "text-green-600"
                    }`}
                  >
                    {formatCurrency(calculatedBalances[r.id] || 0)}
                  </td>
                  <td className="py-2 px-4 border text-center">
                    <button className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded mr-2">Caixa</button>
                    <button className="bg-yellow-400 hover:bg-yellow-500 text-white px-3 py-1 rounded mr-2">
                      Editar
                    </button>
                    <button className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded">
                      <i className="fas fa-trash"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default LucrosRecolhedoresFusionTab;

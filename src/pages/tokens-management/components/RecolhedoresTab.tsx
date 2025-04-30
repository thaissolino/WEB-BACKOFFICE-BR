import type React from "react";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ModalRecolhedor from "./ModalRecolhedor";
import { formatCurrency, formatDate } from "./format";
import ConfirmModal from "./ConfirmModal";
import { api } from "../../../services/api";

interface Transacao {
  id: number;
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
  transacoes: Transacao[];
}

export interface Payment {
  id: number;
  date: string;
  amount: number;
  description: string;
  collectorId?: number;
  supplierId?: number;
}

export interface Operacao {
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

const RecolhedoresTab: React.FC = () => {
  const [recolhedores, setRecolhedores] = useState<Recolhedor[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [recolhedorEdit, setRecolhedorEdit] = useState<Recolhedor | undefined>(undefined);
  const [selectedRecolhedor, setSelectedRecolhedor] = useState<Recolhedor | null>(null);
  const [valorPagamento, setValorPagamento] = useState<number>(0);
  const [descricaoPagamento, setDescricaoPagamento] = useState("");
  const [dataPagamento, setDataPagamento] = useState<string>(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recolhedorToDelete, setRecolhedorToDelete] = useState<number | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [operacoes, setOperacoes] = useState<Operacao[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [newPaymentId, setNewPaymentId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const operacoesResponse = await api.get<Operacao[]>("/operations/list_operations");
      console.log("operalçioes", operacoesResponse);
      setOperacoes(operacoesResponse.data);
    } catch (error) {
      console.log("error ao buscar dados das operações", error);
      console.error("Erro ao buscar dados:", error);
    }
  };

  const fetchRecolhedores = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<Recolhedor[]>("/collectors/list_collectors");
      setRecolhedores(response.data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchPayments = async (collectorId?: number) => {
    try {
      const query = collectorId ? `?collectorId=${collectorId}` : "";
      const paymentsResponse = await api.get<Payment[]>(`/api/payments${query}`);
      setPayments(paymentsResponse.data);
    } catch (error) {
      console.error("Erro ao buscar pagamentos:", error);
    }
  };

  useEffect(() => {
    fetchRecolhedores();
    fetchData();
    fetchPayments();
  }, []);

  // Clear new payment highlight after 3 seconds
  useEffect(() => {
    if (newPaymentId) {
      const timer = setTimeout(() => {
        setNewPaymentId(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [newPaymentId]);

  const salvarRecolhedor = async (name: string, tax: number, balance: number) => {
    try {
      if (recolhedorEdit) {
        await api.put(`/collectors/update_collector/${recolhedorEdit.id}`, { name, tax, balance });
        fetchRecolhedores(); // Refetch after successful edit
      } else {
        const response = await api.post<Recolhedor>("/collectors/create_collector", { name, tax, balance });
        setRecolhedores([...recolhedores, response.data]);
      }
      setShowModal(false);
      setRecolhedorEdit(undefined);
    } catch (e: any) {
      alert(`Erro ao salvar recolhedor: ${e.message}`);
    }
  };

  const abrirCaixa = async (recolhedor: Recolhedor) => {
    setSelectedRecolhedor(recolhedor);
    try {
      const response = await api.get<Recolhedor>(`/collectors/list_collector/${recolhedor.id}`);
      setSelectedRecolhedor(response.data); // Update with transactions
      fetchPayments(recolhedor.id); // Fetch payments for this collector
    } catch (error: any) {
      console.error("Erro ao buscar detalhes do recolhedor:", error.message);
      alert("Erro ao carregar detalhes do recolhedor.");
      setSelectedRecolhedor(null);
    }
  };

  const fecharCaixa = () => {
    setSelectedRecolhedor(null);
    setValorPagamento(0);
    setDescricaoPagamento("");
  };

  const registrarPagamento = async () => {
    if (!selectedRecolhedor) return;
    if (!valorPagamento || !descricaoPagamento.trim()) {
      alert("Preencha todos os campos de pagamento.");
      return;
    }

    setIsProcessingPayment(true);

    try {
      // Create payment using the new API endpoint
      const paymentData = {
        collectorId: selectedRecolhedor.id,
        amount: valorPagamento,
        description: descricaoPagamento,
        date: dataPagamento,
      };

      const response = await api.post("/api/payments", paymentData);
      console.log("response ", response);

      // Refresh payments list
      fetchPayments(selectedRecolhedor.id);

      // Update local state with the new payment
      const newPayment: Payment = response.data;
      setNewPaymentId(`pay-${newPayment.id}`);

      // Update the collector's balance
      const updatedBalance = selectedRecolhedor.balance + valorPagamento;

      // Update the recolhedor in the list
      const updatedRecolhedores = recolhedores.map((r) =>
        r.id === selectedRecolhedor.id ? { ...r, balance: updatedBalance } : r
      );

      setRecolhedores(updatedRecolhedores);
      setSelectedRecolhedor({ ...selectedRecolhedor, balance: updatedBalance });

      // Reset form
      setValorPagamento(0);
      setDescricaoPagamento("");
      setDataPagamento(new Date().toISOString().split("T")[0]);

      alert("Pagamento registrado com sucesso!");
    } catch (e: any) {
      console.log("error", e);
      alert(`Erro ao registrar pagamento: ${e.message}`);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const confirmarDeleteRecolhedor = (id: number) => {
    setRecolhedorToDelete(id);
    setShowConfirmModal(true);
  };

  const deletarRecolhedor = async () => {
    if (recolhedorToDelete !== null) {
      try {
        await api.delete(`/collectors/delete_collector/${recolhedorToDelete}`);
        setRecolhedores(recolhedores.filter((r) => r.id !== recolhedorToDelete));
        setRecolhedorToDelete(null);
      } catch (e: any) {
        alert(`Erro ao deletar recolhedor: ${e.message}`);
      }
    }
    setShowConfirmModal(false);
  };

  function computeBalance(r: Recolhedor, ops: Operacao[], payments: Payment[]) {
    // Get all operations for this collector and convert to negative values
    console.log("payments", payments);

    const collectorOperations = ops
      .filter((o) => o.collectorId === r.id)
      .map((o) => ({
        date: o.date,
        value: -(o.value / (o.collectorTax || r.tax || 1)), // Negative value for operations
        type: "operation",
      }));

    // Get all payments for this collector (positive values)
    const collectorPayments = payments
      .filter((p) => p.collectorId === r.id)
      .map((p) => ({
        date: p.date,
        value: p.amount, // Positive value for payments
        type: "payment",
      }));

    console.log("collector", collectorPayments);

    // Combine and sort by date
    const allTransactions = [...collectorOperations, ...collectorPayments].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Calculate running balance
    let balance = 0;
    for (const transaction of allTransactions) {
      balance += transaction.value;
    }

    return balance;
  }

  if (loading) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-center h-64">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
            className="inline-block w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mb-4"
          ></motion.div>
          <p className="text-lg text-blue-700 font-medium">Carregando recolhedores...</p>
        </div>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-red-50 p-4 rounded-lg text-red-700 border border-red-200"
      >
        Erro ao carregar recolhedores: {error}
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="fade-in">
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="bg-white p-6 rounded-lg shadow mb-6"
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-blue-700">
            <i className="fas fa-users mr-2"></i> RECOLHEDORES
          </h2>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              setRecolhedorEdit(undefined);
              setShowModal(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            <i className="fas fa-plus mr-2"></i> ADICIONAR
          </motion.button>
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
              <AnimatePresence>
                {recolhedores.map((r) => (
                  <motion.tr
                    key={r.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="hover:bg-gray-50"
                  >
                    <td className="py-2 px-4 border">{r.name}</td>
                    <td className="py-2 px-4 border">{r.tax}</td>
                    <td
                      className={`py-2 px-4 border text-right font-bold ${
                        computeBalance(r, operacoes, payments) < 0 ? "text-red-600" : "text-green-600"
                      }`}
                    >
                      {formatCurrency(computeBalance(r, operacoes, payments))}
                    </td>
                    <td className="py-2 px-4 border space-x-2 text-center">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => abrirCaixa(r)}
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded"
                      >
                        Caixa
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          setRecolhedorEdit(r);
                          setShowModal(true);
                        }}
                        className="bg-yellow-400 hover:bg-yellow-500 text-white px-3 py-1 rounded"
                      >
                        Editar
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => confirmarDeleteRecolhedor(r.id)}
                        className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded"
                      >
                        <i className="fas fa-trash"></i>
                      </motion.button>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </motion.div>

      <AnimatePresence>
        {selectedRecolhedor && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="bg-white p-6 rounded-lg shadow mb-6"
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-blue-700">
                <i className="fas fa-user mr-2"></i> CAIXA DE {selectedRecolhedor.name}
              </h2>
              <div>
                <span className="mr-4">
                  SALDO:{" "}
                  <span
                    className={`font-bold ${
                      computeBalance(selectedRecolhedor, operacoes, payments) < 0 ? "text-red-600" : "text-green-600"
                    }`}
                  >
                    {formatCurrency(computeBalance(selectedRecolhedor, operacoes, payments))}
                  </span>
                </span>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={fecharCaixa}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <i className="fas fa-times"></i>
                </motion.button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <motion.div
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="bg-gray-50 p-4 rounded border"
              >
                <h3 className="font-medium mb-3 text-blue-700 border-b pb-2">
                  <i className="fas fa-hand-holding-usd mr-2"></i> REGISTRAR PAGAMENTO
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">DATA</label>
                    <input
                      type="date"
                      className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                      value={dataPagamento}
                      onChange={(e) => setDataPagamento(e.target.value)}
                      disabled={isProcessingPayment}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">VALOR (USD)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                      value={valorPagamento}
                      onChange={(e) => setValorPagamento(Number(e.target.value))}
                      disabled={isProcessingPayment}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">DESCRIÇÃO</label>
                    <input
                      type="text"
                      className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                      value={descricaoPagamento}
                      onChange={(e) => setDescricaoPagamento(e.target.value)}
                      disabled={isProcessingPayment}
                    />
                  </div>
                  <motion.button
                    whileHover={!isProcessingPayment ? { scale: 1.02 } : {}}
                    whileTap={!isProcessingPayment ? { scale: 0.98 } : {}}
                    onClick={registrarPagamento}
                    className={`${
                      isProcessingPayment ? "bg-blue-400" : "bg-blue-600 hover:bg-blue-700"
                    } text-white px-4 py-2 rounded w-full flex items-center justify-center`}
                    disabled={isProcessingPayment}
                  >
                    {isProcessingPayment ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                          className="w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-2"
                        ></motion.div>
                        PROCESSANDO...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-check mr-2"></i> REGISTRAR
                      </>
                    )}
                  </motion.button>
                </div>
              </motion.div>

              {/* Histórico */}
              <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
                <h3 className="font-medium mb-2 border-b pb-2">HISTÓRICO DE TRANSAÇÕES (ÚLTIMOS 6)</h3>
                <div className="overflow-x-auto max-h-96">
                  <table className="min-w-full bg-white">
                    <thead>
                      <tr className="bg-gray-200">
                        <th className="py-2 px-4 border">DATA</th>
                        <th className="py-2 px-4 border">DESCRIÇÃO</th>
                        <th className="py-2 px-4 border">VALOR (USD)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <AnimatePresence>
                        {[
                          ...(selectedRecolhedor.transacoes || []),
                          ...operacoes
                            .filter((op) => op.collectorId === selectedRecolhedor.id)
                            .map((op) => ({
                              id: `op-${op.id}`,
                              date: op.date || new Date().toISOString(),
                              valor: -(op.value || 0) / (op.collectorTax || selectedRecolhedor.tax || 1),
                              descricao: `Operação #${op.id} - ${op.city || ""}`,
                              tipo: "debito",
                            })),
                          ...payments
                            .filter((p) => p.collectorId === selectedRecolhedor.id)
                            .map((p) => ({
                              id: `pay-${p.id}`,
                              date: p.date,
                              valor: p.amount,
                              descricao: p.description,
                              tipo: p.amount < 0 ? "debito" : "pagamento",
                            })),
                        ]
                          .slice(-6)
                          .reverse()
                          .map((t) => (
                            <motion.tr
                              key={t.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{
                                opacity: 1,
                                y: 0,
                                backgroundColor:
                                  newPaymentId === t.id
                                    ? ["#f0f9ff", "#e0f2fe", "#f0f9ff"]
                                    : t.id.toString().startsWith("op-")
                                    ? "#ebf5ff"
                                    : t.id.toString().startsWith("pay-")
                                    ? "#f0fdf4"
                                    : "#ffffff",
                              }}
                              exit={{ opacity: 0, y: -10 }}
                              transition={{
                                duration: 0.3,
                                backgroundColor: {
                                  duration: 1.5,
                                  repeat: newPaymentId === t.id ? 2 : 0,
                                  repeatType: "reverse",
                                },
                              }}
                              className={
                                t.id.toString().startsWith("op-")
                                  ? "bg-blue-50"
                                  : t.id.toString().startsWith("pay-")
                                  ? "bg-green-50"
                                  : ""
                              }
                            >
                              <td className="py-2 px-4 border">{formatDate(t.date)}</td>
                              <td className="py-2 px-4 border">{t.descricao}</td>
                              <td
                                className={`py-2 px-4 border text-right ${
                                  t.valor < 0 ? "text-red-600" : "text-green-600"
                                }`}
                              >
                                {formatCurrency(t.valor)}
                              </td>
                            </motion.tr>
                          ))}
                      </AnimatePresence>
                    </tbody>
                  </table>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ModalRecolhedor
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSave={salvarRecolhedor}
        recolhedorEdit={recolhedorEdit}
      />
      <ConfirmModal
        isOpen={showConfirmModal}
        title="Confirmar Exclusão"
        message="Tem certeza que deseja deletar este recolhedor?"
        onConfirm={deletarRecolhedor}
        onClose={() => setShowConfirmModal(false)}
      />
    </motion.div>
  );
};

export default RecolhedoresTab;

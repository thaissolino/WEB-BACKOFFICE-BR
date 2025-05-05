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
  comission: number;
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
  comission: number;
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
  const [valorPagamento, setValorPagamento] = useState<number | null>(null);
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
  const [saldoAcumulado, setSaldoAcumulado] = useState(0);
  const [calculatedBalances, setCalculatedBalances] = useState<Record<number, number>>({});
  const [paginaAtual, setPaginaAtual] = useState(0);
  const itensPorPagina = 6;

  const fetchRecolhedores = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<Recolhedor[]>("/collectors/list_collectors");
      setRecolhedores(response.data);

      // Calcular saldos iniciais
      const balances: Record<number, number> = {};
      response.data.forEach((r) => {
        balances[r.id] = computeBalance(r, operacoes, payments);
      });
      setCalculatedBalances(balances);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllData = async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. Primeiro carregue as operações (não dependem de outros dados)
      const operacoesResponse = await api.get<Operacao[]>("/operations/list_operations");
      setOperacoes(operacoesResponse.data);

      // 2. Carregue todos os recolhedores
      const recolhedoresResponse = await api.get<Recolhedor[]>("/collectors/list_collectors");
      setRecolhedores(recolhedoresResponse.data);

      // 3. Carregue todos os pagamentos (sem filtro inicial)
      const paymentsResponse = await api.get<Payment[]>("/api/payments");
      setPayments(paymentsResponse.data);

      // 4. Agora calcule os saldos iniciais com todos os dados disponíveis
      const initialBalances: Record<number, number> = {};
      recolhedoresResponse.data.forEach((r) => {
        initialBalances[r.id] = computeBalance(r, operacoesResponse.data, paymentsResponse.data);
      });
      setCalculatedBalances(initialBalances);

      // 5. Calcule o saldo acumulado
      const totalBalance = Object.values(initialBalances).reduce((a, b) => a + b, 0);
      setSaldoAcumulado(totalBalance);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Substitua o useEffect inicial por:
  useEffect(() => {
    fetchAllData();
  }, []);

  // Atualize a função abrirCaixa para lidar com o carregamento específico:
  const abrirCaixa = async (recolhedor: Recolhedor) => {
    setSelectedRecolhedor(recolhedor);
    try {
      // Carrega os dados específicos do recolhedor
      const [recolhedorDetalhes, paymentsFiltrados] = await Promise.all([
        api.get<Recolhedor>(`/collectors/list_collector/${recolhedor.id}`),
        api.get<Payment[]>(`/api/payments?collectorId=${recolhedor.id}`),
      ]);

      // Atualiza os pagamentos mantendo os existentes e adicionando os filtrados
      setPayments((prevPayments) => {
        const updatedPayments = [
          ...prevPayments.filter((p) => p.collectorId !== recolhedor.id),
          ...paymentsFiltrados.data,
        ];

        // Recalcula os saldos com os novos dados
        const updatedBalances: Record<number, number> = {};
        recolhedores.forEach((r) => {
          updatedBalances[r.id] = computeBalance(r, operacoes, updatedPayments);
        });
        setCalculatedBalances(updatedBalances);

        return updatedPayments;
      });

      setSelectedRecolhedor(recolhedorDetalhes.data);
    } catch (error: any) {
      console.error("Erro ao buscar detalhes do recolhedor:", error.message);
      alert("Erro ao carregar detalhes do recolhedor.");
      setSelectedRecolhedor(null);
    }
  };

  // Clear new payment highlight after 3 seconds
  useEffect(() => {
    if (newPaymentId) {
      const timer = setTimeout(() => {
        setNewPaymentId(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [newPaymentId]);

  const salvarRecolhedor = async (name: string, tax: number, balance: number, comission: number) => {
    try {
      if (recolhedorEdit) {
        await api.put(`/collectors/update_collector/${recolhedorEdit.id}`, { name, tax, balance, comission });
        fetchRecolhedores(); // Refetch after successful edit
      } else {
        const response = await api.post<Recolhedor>("/collectors/create_collector", { name, tax, balance, comission });
        setRecolhedores([...recolhedores, response.data]);
      }
      setShowModal(false);
      setRecolhedorEdit(undefined);
    } catch (e: any) {
      alert(`Erro ao salvar recolhedor: ${e.message}`);
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
      const isHoje = dataPagamento === new Date().toISOString().split("T")[0];
      const dataFinal = isHoje ? new Date().toISOString() : new Date(`${dataPagamento}T00:00:00`).toISOString();

      const paymentData = {
        collectorId: selectedRecolhedor.id,
        amount: valorPagamento,
        description: descricaoPagamento,
        date: dataFinal,
      };

      const response = await api.post("/api/payments", paymentData);
      const newPayment: Payment = response.data;

      // Atualizar a lista de pagamentos
      const updatedPayments = [...payments, newPayment];
      setPayments(updatedPayments);

      // Recalcular o saldo para este recolhedor
      const updatedBalance = computeBalance(selectedRecolhedor, operacoes, updatedPayments);

      // Atualizar o estado de saldos calculados
      setCalculatedBalances((prev) => ({
        ...prev,
        [selectedRecolhedor.id]: updatedBalance,
      }));

      // Atualizar o saldo acumulado
      setSaldoAcumulado(Object.values(calculatedBalances).reduce((a, b) => a + b, 0) + valorPagamento);

      // Resetar o formulário
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

  const deletarOperacao = async (id: number) => {
    try {
      await api.delete(`/operations/delete_operation/${id}`);
      
      // Atualiza as operações
      const updatedOperacoes = operacoes.filter((op) => op.id !== id);
      setOperacoes(updatedOperacoes);
      
      // Recalcula todos os saldos
      const updatedBalances: Record<number, number> = {};
      recolhedores.forEach((r) => {
        updatedBalances[r.id] = computeBalance(r, updatedOperacoes, payments);
      });
      setCalculatedBalances(updatedBalances);
      
      // Atualiza o saldo acumulado
      const totalBalance = Object.values(updatedBalances).reduce((a, b) => a + b, 0);
      setSaldoAcumulado(totalBalance);
      
      alert("Operação deletada com sucesso.");
    } catch (e: any) {
      alert(`Erro ao deletar operação: ${e.message}`);
    }
  };
  
  const deletarPagamento = async (id: number) => {
    try {
      await api.delete(`/api/delete_payment/${id}`);
      
      // Atualiza os pagamentos
      const updatedPayments = payments.filter((p) => p.id !== id);
      setPayments(updatedPayments);
      
      // Recalcula todos os saldos
      const updatedBalances: Record<number, number> = {};
      recolhedores.forEach((r) => {
        updatedBalances[r.id] = computeBalance(r, operacoes, updatedPayments);
      });
      setCalculatedBalances(updatedBalances);
      
      // Atualiza o saldo acumulado
      const totalBalance = Object.values(updatedBalances).reduce((a, b) => a + b, 0);
      setSaldoAcumulado(totalBalance);
      
      alert("Pagamento deletado com sucesso.");
    } catch (e: any) {
      alert(`Erro ao deletar pagamento: ${e.message}`);
    }
  };

  const todasTransacoes = [
    ...(selectedRecolhedor!?.transacoes || []),
    ...operacoes
      .filter((op) => op.collectorId === selectedRecolhedor!?.id)
      .map((op) => ({
        id: `op-${op.id}`,
        date: op.date || new Date().toISOString(),
        valor: -op.comission>0 || op.comission !== null ? -op.comission : - (op.value || 0) / (op.collectorTax || selectedRecolhedor!?.tax || 1),
        descricao: op.comission > 0 || op.comission !== null  ? `Comissão #${op.id} · ${op.city?.toLowerCase() || ""}`: `Operação #${op.id} · ${op.city?.toLowerCase() || ""}`,
        tipo: "debito",
      })),
    ...payments
      .filter((p) => p.collectorId === selectedRecolhedor!?.id)
      .map((p) => ({
        id: `pay-${p.id}`,
        date: p.date,
        valor: p.amount,
        descricao: p.description,
        tipo: "pagamento",
      })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const transacoesPaginadas = todasTransacoes.slice(paginaAtual * itensPorPagina, (paginaAtual + 1) * itensPorPagina);

  function computeBalance(r: Recolhedor, ops: Operacao[], payments: Payment[]) {
    const collectorOperations = ops
      .filter((o) => o.collectorId === r.id)
      .map((o) => ({
        date: o.date,
        value: -(o.value / (o.collectorTax || r.tax || 1)),
        type: "operation",
      }));

    const collectorPayments = payments
      .filter((p) => p.collectorId === r.id)
      .map((p) => ({
        date: p.date,
        value: p.amount,
        type: "payment",
      }));

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
  useEffect(() => {
    let totalBalance = 0;
    recolhedores.forEach((recolhedor) => {
      totalBalance += computeBalance(recolhedor, operacoes, payments);
    });
    setSaldoAcumulado(totalBalance);
  }, [recolhedores, operacoes, payments]);
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
        <div className="flex justify-between items-start mb-4">
          <div className="flex flex-col">
            <h2 className="text-xl font-semibold text-blue-700">
              <i className="fas fa-users mr-2"></i> RECOLHEDORES
            </h2>
            <div className="mb-6 grid grid-cols-1 md:grid-cols-1 gap-4">
              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="font-medium mb-2">SALDO ACUMULADO</h3>
                <p className="text-2xl font-bold text-purple-600">{formatCurrency(saldoAcumulado, 2, "USD")}</p>
              </div>
            </div>
          </div>

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
                    <td className="py-2 px-4 border text-center">{r.name}</td>

                    <td
                      className={`py-2 px-4 border text-center font-bold ${
                        calculatedBalances[r.id] < 0 ? "text-red-600" : "text-green-600"
                      }`}
                    >
                      {formatCurrency(calculatedBalances[r.id] || 0)}
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
                      calculatedBalances[selectedRecolhedor.id] < 0 ? "text-red-600" : "text-green-600"
                    }`}
                  >
                    {formatCurrency(calculatedBalances[selectedRecolhedor.id] || 0)}
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
                      inputMode="decimal"
                      className="mt-1 block w-full border border-gray-300 rounded-md p-2 appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      value={valorPagamento || ""}
                      onChange={(e) => setValorPagamento(Number(e.target.value.replace(",", ".")))}
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
                        <th className="py-2 px-4 border">AÇÕES</th>
                      </tr>
                    </thead>
                    <tbody>
                      <AnimatePresence>
                        {transacoesPaginadas.map((t) => (
                          <motion.tr
                            key={t.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{
                              opacity: 1,
                              y: 0,
                              backgroundColor:
                                newPaymentId === t.id
                                  ? ["#f0fdf4", "#dcfce7", "#f0fdf4"]
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
                            <td className="py-2 px-4 border text-sm text-gray-700">
                              <div className="flex items-center gap-2" title={new Date(t.date).toISOString()}>
                                <i className="fas fa-clock text-gray-500"></i>
                                {formatDate(t.date)}
                              </div>
                            </td>
                            <td className="py-2 px-4 border text-sm text-gray-700">{t.descricao}</td>
                            <td
                              className={`py-2 px-4 border text-right ${
                                t.valor < 0 ? "text-red-600" : "text-green-600"
                              }`}
                            >
                              {formatCurrency(t.valor)}
                            </td>
                            <td className="py-2 px-4 border text-right">
                              {t.id.toString().startsWith("pay-") && (
                                <button
                                  onClick={() => deletarPagamento(Number(t.id.toString().replace("pay-", "")))}
                                  className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded justify-self-end"
                                >
                                  <i className="fas fa-trash"></i>
                                </button>
                              )}
                              {t.id.toString().startsWith("op-") && (
                                <button
                                  onClick={() => deletarOperacao(Number(t.id.toString().replace("op-", "")))}
                                  className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded justify-self-end"
                                >
                                  <i className="fas fa-trash"></i>
                                </button>
                              )}
                            </td>
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                    </tbody>
                  </table>
                  <div className="flex justify-between items-center mt-4">
                    <button
                      onClick={() => setPaginaAtual((prev) => Math.max(0, prev - 1))}
                      disabled={paginaAtual === 0}
                      className="px-3 py-1 bg-gray-200 text-sm rounded disabled:opacity-50"
                    >
                      Anterior
                    </button>
                    <span className="text-sm text-gray-600">
                      Página {paginaAtual + 1} de {Math.ceil(todasTransacoes.length / itensPorPagina)}
                    </span>
                    <button
                      onClick={() =>
                        setPaginaAtual((prev) =>
                          Math.min(prev + 1, Math.ceil(todasTransacoes.length / itensPorPagina) - 1)
                        )
                      }
                      disabled={(paginaAtual + 1) * itensPorPagina >= todasTransacoes.length}
                      className="px-3 py-1 bg-gray-200 text-sm rounded disabled:opacity-50"
                    >
                      Próxima
                    </button>
                  </div>
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

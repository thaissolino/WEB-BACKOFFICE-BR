import type React from "react";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ModalFornecedor from "./ModalFornecedor";
import { formatCurrency, formatDate } from "./format";
import ConfirmModal from "./ConfirmModal";
import { api } from "../../../services/api";

interface Transacao {
  id: number;
  date: string;
  valor: number;
  descricao: string;
  tipo: "pagamento" | "credito";
}

interface Fornecedor {
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

const FornecedoresTab: React.FC = () => {
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [fornecedorEdit, setFornecedorEdit] = useState<Fornecedor | undefined>(undefined);
  const [fornecedorSelecionado, setFornecedorSelecionado] = useState<Fornecedor | null>(null);
  const [valorPagamento, setValorPagamento] = useState<number | null>(null);
  const [descricaoPagamento, setDescricaoPagamento] = useState("");
  const [dataPagamento, setDataPagamento] = useState<string>(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fornecedorToDelete, setFornecedorToDelete] = useState<number | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [operacoes, setOperacoes] = useState<Operacao[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [newPaymentId, setNewPaymentId] = useState<string | null>(null);
  const [saldoAcumulado, setSaldoAcumulado] = useState(0);
  const fetchFornecedores = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<Fornecedor[]>("/suppliers/list_suppliers");
      console.log("response", response.data);
      setFornecedores(response.data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchPayments = async (supplierId?: number) => {
    try {
      const query = supplierId ? `?supplierId=${supplierId}` : "";
      const paymentsResponse = await api.get<Payment[]>(`/api/payments${query}`);
      setPayments(paymentsResponse.data);
    } catch (error) {
      console.error("Erro ao buscar pagamentos:", error);
    }
  };

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

  useEffect(() => {
    fetchFornecedores();
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

  const salvarFornecedor = async (name: string, tax: number, balance: number) => {
    try {
      if (fornecedorEdit) {
        await api.put(`/suppliers/update_supplier/${fornecedorEdit.id}`, { name, tax, balance });
        // After successful edit, refetch the fornecedores
        fetchFornecedores();
      } else {
        const response = await api.post<Fornecedor>("/suppliers/create_supplier", { name, tax, balance });
        setFornecedores([...fornecedores, response.data]);
      }
      setShowModal(false);
      setFornecedorEdit(undefined);
    } catch (e: any) {
      alert(`Erro ao salvar fornecedor: ${e.message}`);
    }
  };

  const abrirCaixa = async (fornecedor: Fornecedor) => {
    setFornecedorSelecionado(fornecedor);
    try {
      const response = await api.get<Fornecedor>(`/suppliers/list_supplier/${fornecedor.id}`);
      setFornecedorSelecionado(response.data); // Update with transactions
      fetchPayments(fornecedor.id); // Fetch payments for this collector
    } catch (error: any) {
      console.error("Erro ao buscar detalhes do fornecedor:", error.message);
      alert("Erro ao carregar detalhes do fornecedor.");
      setFornecedorSelecionado(null);
    }
  };

  const fecharCaixa = () => {
    setFornecedorSelecionado(null);
    setValorPagamento(0);
    setDescricaoPagamento("");
  };

  const registrarPagamento = async () => {
    if (!fornecedorSelecionado) return;
    if (!valorPagamento || !descricaoPagamento.trim()) {
      alert("Preencha todos os campos de pagamento.");
      return;
    }

    setIsProcessingPayment(true);

    try {
      // Create payment using the new API endpoint
      const paymentData = {
        supplierId: fornecedorSelecionado.id,
        amount: valorPagamento,
        description: descricaoPagamento,
        date: dataPagamento,
      };

      const response = await api.post("/api/payments", paymentData);
      console.log("response ", response);

      // Refresh payments list
      fetchPayments(fornecedorSelecionado.id);

      // Update local state with the new payment
      const newPayment: Payment = response.data;
      setNewPaymentId(`pay-${newPayment.id}`);

      // Update the collector's balance
      const updatedBalance = fornecedorSelecionado.balance + valorPagamento;

      // Update the recolhedor in the list
      const updatedFornecedores = fornecedores.map((f) =>
        f.id === fornecedorSelecionado.id ? { ...f, balance: updatedBalance } : f
      );

      setFornecedores(updatedFornecedores);
      setFornecedorSelecionado({ ...fornecedorSelecionado, balance: updatedBalance });

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

  const confirmarDeleteFornecedor = (id: number) => {
    setFornecedorToDelete(id);
    setShowConfirmModal(true);
  };

  const deletarFornecedor = async () => {
    if (fornecedorToDelete !== null) {
      try {
        await api.delete(`/suppliers/delete_supplier/${fornecedorToDelete}`);
        setFornecedores(fornecedores.filter((f) => f.id !== fornecedorToDelete));
        setFornecedorToDelete(null);
      } catch (e: any) {
        alert(`Erro ao deletar fornecedor: ${e.message}`);
      }
    }
    setShowConfirmModal(false);
  };

  function computeBalance(f: Fornecedor, ops: Operacao[], payments: Payment[]) {
    // Get all operations for this collector and convert to negative values
    console.log("payments", payments);

    const supplierOperations = ops
      .filter((o) => o.supplierId === f.id)
      .map((o) => ({
        date: o.date,
        value: -(o.value / (o.supplierTax || f.tax || 1)), // Negative value for operations
        type: "operation",
      }));

    // Get all payments for this supplier (positive values)
    const supplierPayments = payments
      .filter((p) => p.supplierId === f.id)
      .map((p) => ({
        date: p.date,
        value: p.amount, // Positive value for payments
        type: "payment",
      }));

    console.log("supplier", supplierPayments);

    // Combine and sort by date
    const allTransactions = [...supplierOperations, ...supplierPayments].sort(
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
    fornecedores.forEach((fornecedor) => {
      totalBalance += computeBalance(fornecedor, operacoes, payments);
    });
    setSaldoAcumulado(totalBalance);
  }, [fornecedores, operacoes, payments]);

  if (loading) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-center h-64">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
            className="inline-block w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full mb-4"
          ></motion.div>
          <p className="text-lg text-green-700 font-medium">Carregando fornecedores...</p>
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
        Erro ao carregar fornecedores: {error}
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
            <h2 className="text-xl font-semibold text-green-700">
              <i className="fas fa-truck mr-2"></i> FORNECEDORES
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
              setFornecedorEdit(undefined);
              setShowModal(true);
            }}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
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
                {fornecedores.map((f) => (
                  <motion.tr
                    key={f.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="hover:bg-gray-50"
                  >
                    <td className="py-2 px-4 border text-center">{f.name}</td>

                    <td
                      className={`py-2 px-4 border text-center font-bold ${
                        computeBalance(f, operacoes, payments) < 0 ? "text-red-600" : "text-green-600"
                      }`}
                    >
                      {formatCurrency(computeBalance(f, operacoes, payments))}
                    </td>
                    <td className="py-2 px-4 border space-x-2 text-center">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => abrirCaixa(f)}
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded"
                      >
                        Caixa
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          setFornecedorEdit(f);
                          setShowModal(true);
                        }}
                        className="bg-yellow-400 hover:bg-yellow-500 text-white px-3 py-1 rounded"
                      >
                        Editar
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => confirmarDeleteFornecedor(f.id)}
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
        {fornecedorSelecionado && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="bg-white p-6 rounded-lg shadow mb-6"
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-green-700">
                <i className="fas fa-truck mr-2"></i> CAIXA DE {fornecedorSelecionado.name}
              </h2>
              <div>
                <span className="mr-4">
                  SALDO:{" "}
                  <span
                    className={`font-bold ${
                      computeBalance(fornecedorSelecionado, operacoes, payments) < 0 ? "text-red-600" : "text-green-600"
                    }`}
                  >
                    {formatCurrency(computeBalance(fornecedorSelecionado, operacoes, payments))}
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
                          transition={{
                            duration: 1,
                            repeat: Number.POSITIVE_INFINITY,
                            ease: "linear",
                          }}
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
                          ...(fornecedorSelecionado.transacoes || []),
                          ...operacoes
                            .filter((op) => op.supplierId === fornecedorSelecionado.id)
                            .map((op) => ({
                              id: `op-${op.id}`,
                              date: op.date || new Date().toISOString(),
                              valor: -(op.value || 0) / (op.supplierTax || fornecedorSelecionado.tax || 1),
                              descricao: `operação #${op.id} · ${op.city?.toLowerCase() || ""}`,
                              tipo: "debito",
                            })),
                          ...payments
                            .filter((p) => p.supplierId === fornecedorSelecionado.id)
                            .map((p) => ({
                              id: `pay-${p.id}`,
                              date: p.date,
                              valor: p.amount,
                              descricao: p.description,
                              tipo: p.amount < 0 ? "debito" : "pagamento",
                            })),
                        ]
                          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) // ✅ mais recente por último
                          .slice(-6)
                          .map((t) => (
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
                              <td className="py-2 px-4 border">{formatDate(t.date)}</td>
                              <td className="py-2 px-4 border text-sm text-gray-700">{t.descricao}</td>
                              <td
                                className={`py-2 px-4 border text-right ${
                                  t.valor < 0 ? "text-red-600" : "text-green-600"
                                }`}
                              >
                                {formatCurrency(t.valor)}
                              </td>
                              <td className="py-2 px-4 border text-right">
                                <button
                                  // onClick={() => deletarTransacao(t.id)}
                                  className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded justify-self-end"
                                >
                                  <i className="fas fa-trash"></i>
                                </button>
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

      <ModalFornecedor
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSave={salvarFornecedor}
        fornecedorEdit={fornecedorEdit}
      />
      <ConfirmModal
        isOpen={showConfirmModal}
        title="Confirmar Exclusão"
        message="Tem certeza que deseja deletar este fornecedor?"
        onConfirm={deletarFornecedor}
        onClose={() => setShowConfirmModal(false)}
      />
    </motion.div>
  );
};

export default FornecedoresTab;

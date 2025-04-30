import React, { useEffect, useState } from "react";
import ModalRecolhedor from "./ModalRecolhedor";
import { formatCurrency, formatDate } from "./format";
import ConfirmModal from "./ConfirmModal";
import { api } from "../../../services/api";

interface Transacao {
  id: number;
  date: string;
  valor: number;
  descricao: string;
  tipo: "debito" | "pagamento";
}

interface Recolhedor {
  id: number;
  name: string;
  tax: number;
  balance: number;
  transacoes: Transacao[];
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

  useEffect(() => {
    fetchRecolhedores();
  }, []);

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

    const novaTransacao: Transacao = {
      id: Date.now(),
      date: dataPagamento,
      valor: valorPagamento,
      descricao: descricaoPagamento,
      tipo: "pagamento",
    };

    try {
      const updatedRecolhedorResponse = await api.patch<Recolhedor>(`/recolhedores/${selectedRecolhedor.id}`, {
        saldo: selectedRecolhedor.balance + valorPagamento,
        transacoes: [...(selectedRecolhedor.transacoes || []), novaTransacao],
      });
      setRecolhedores(recolhedores.map((r) =>
        r.id === selectedRecolhedor.id ? updatedRecolhedorResponse.data : r
      ));
      setSelectedRecolhedor(updatedRecolhedorResponse.data);
      fecharCaixa();
      alert("Pagamento registrado!");
    } catch (e: any) {
      alert(`Erro ao registrar pagamento: ${e.message}`);
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

  if (loading) {
    return <div>Carregando recolhedores...</div>;
  }

  if (error) {
    return <div>Erro ao carregar recolhedores: {error}</div>;
  }

  return (
    <div className="fade-in">
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-blue-700">
            <i className="fas fa-users mr-2"></i> RECOLHEDORES
          </h2>
          <button
            onClick={() => {
              setRecolhedorEdit(undefined);
              setShowModal(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            <i className="fas fa-plus mr-2"></i> ADICIONAR
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
              {recolhedores.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="py-2 px-4 border">{r.name}</td>
                  <td className="py-2 px-4 border">{r.tax}</td>
                  <td
                    className={`py-2 px-4 border text-right font-bold ${
                      r.balance < 0 ? "text-red-600" : "text-green-600"
                    }`}
                  >
                    {formatCurrency(r.balance)}
                  </td>
                  <td className="py-2 px-4 border space-x-2 text-center">
                    <button
                      onClick={() => abrirCaixa(r)}
                      className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded"
                    >
                      Caixa
                    </button>
                    <button
                      onClick={() => {
                        setRecolhedorEdit(r);
                        setShowModal(true);
                      }}
                      className="bg-yellow-400 hover:bg-yellow-500 text-white px-3 py-1 rounded"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => confirmarDeleteRecolhedor(r.id)}
                      className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded"
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedRecolhedor && (
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-blue-700">
              <i className="fas fa-user mr-2"></i> CAIXA DE {selectedRecolhedor.name}
            </h2>
            <div>
              <span className="mr-4">
                SALDO:{" "}
                <span className={`font-bold ${selectedRecolhedor.balance < 0 ? "text-red-600" : "text-green-600"}`}>
                  {formatCurrency(selectedRecolhedor.balance)}
                </span>
              </span>
              <button onClick={fecharCaixa} className="text-gray-500 hover:text-gray-700">
                <i className="fas fa-times"></i>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-50 p-4 rounded border">
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
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">DESCRIÇÃO</label>
                  <input
                    type="text"
                    className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                    value={descricaoPagamento}
                    onChange={(e) => setDescricaoPagamento(e.target.value)}
                  />
                </div>
                <button
                  onClick={registrarPagamento}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded w-full"
                >
                  <i className="fas fa-check mr-2"></i> REGISTRAR
                </button>
              </div>
            </div>

            {/* Histórico */}
            <div>
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
                    {selectedRecolhedor.transacoes
                      ?.slice(-6)
                      .reverse()
                      .map((t) => (
                        <tr key={t.id}>
                          <td className="py-2 px-4 border">{formatDate(t.date)}</td>
                          <td className="py-2 px-4 border">{t.descricao}</td>
                          <td
                            className={`py-2 px-4 border text-right ${
                              t.tipo === "debito" ? "text-red-600" : "text-green-600"
                            }`}
                          >
                            {t.tipo === "debito" ? "-" : "+"}
                            {formatCurrency(Math.abs(t.valor))}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

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
    </div>
  );
};

export default RecolhedoresTab;
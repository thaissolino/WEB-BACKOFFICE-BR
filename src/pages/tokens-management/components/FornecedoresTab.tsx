import React, { useEffect, useState } from "react";
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

const FornecedoresTab: React.FC = () => {
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [fornecedorEdit, setFornecedorEdit] = useState<Fornecedor | undefined>(undefined);
  const [fornecedorSelecionado, setFornecedorSelecionado] = useState<Fornecedor | null>(null);
  const [valorPagamento, setValorPagamento] = useState<number>(0);
  const [descricaoPagamento, setDescricaoPagamento] = useState("");
  const [dataPagamento, setDataPagamento] = useState<string>(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fornecedorToDelete, setFornecedorToDelete] = useState<number | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const fetchFornecedores = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<Fornecedor[]>("/suppliers/list_suppliers");
      setFornecedores(response.data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFornecedores();
  }, []);

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
      const response = await api.get<Fornecedor>(`/fornecedores/${fornecedor.id}`);
      setFornecedorSelecionado(response.data); // Update with transactions
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

    const novaTransacao: Transacao = {
      id: Date.now(),
      date: dataPagamento,
      valor: valorPagamento,
      descricao: descricaoPagamento,
      tipo: "pagamento",
    };

    try {
      const updatedFornecedorResponse = await api.patch<Fornecedor>(`/suppliers/list_supplier/${fornecedorSelecionado.id}`, {
        saldo: fornecedorSelecionado.balance + valorPagamento,
        transacoes: [...(fornecedorSelecionado.transacoes || []), novaTransacao],
      });
      setFornecedores(fornecedores.map((f) =>
        f.id === fornecedorSelecionado.id ? updatedFornecedorResponse.data : f
      ));
      setFornecedorSelecionado(updatedFornecedorResponse.data);
      fecharCaixa();
      alert("Pagamento registrado!");
    } catch (e: any) {
      alert(`Erro ao registrar pagamento: ${e.message}`);
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

  if (loading) {
    return <div>Carregando fornecedores...</div>;
  }

  if (error) {
    return <div>Erro ao carregar fornecedores: {error}</div>;
  }

  return (
    <div className="fade-in">
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-green-700">
            <i className="fas fa-truck mr-2"></i> FORNECEDORES
          </h2>
          <button
            onClick={() => {
              setFornecedorEdit(undefined);
              setShowModal(true);
            }}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
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
              {fornecedores.map((f) => (
                <tr key={f.id} className="hover:bg-gray-50">
                  <td className="py-2 px-4 border">{f.name}</td>
                  <td className="py-2 px-4 border">{f.tax}</td>
                  <td
                    className={`py-2 px-4 border text-right font-bold ${
                      f.balance < 0 ? "text-red-600" : "text-green-600"
                    }`}
                  >
                    {formatCurrency(f.balance)}
                  </td>
                  <td className="py-2 px-4 border space-x-2 text-center">
                    <button
                      onClick={() => abrirCaixa(f)}
                      className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded"
                    >
                      Caixa
                    </button>
                    <button
                      onClick={() => {
                        setFornecedorEdit(f);
                        setShowModal(true);
                      }}
                      className="bg-yellow-400 hover:bg-yellow-500 text-white px-3 py-1 rounded"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => confirmarDeleteFornecedor(f.id)}
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

      {fornecedorSelecionado && (
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-green-700">
              <i className="fas fa-truck mr-2"></i> CAIXA DE {fornecedorSelecionado.name}
            </h2>
            <div>
              <span className="mr-4">
                SALDO:{" "}
                <span className={`font-bold ${fornecedorSelecionado.balance < 0 ? "text-red-600" : "text-green-600"}`}>
                  {formatCurrency(fornecedorSelecionado.balance)}
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
                    {fornecedorSelecionado.transacoes
                      ?.slice(-6)
                      .reverse()
                      .map((t) => (
                        <tr key={t.id}>
                          <td className="py-2 px-4 border">{formatDate(t.date)}</td>
                          <td className="py-2 px-4 border">{t.descricao}</td>
                          <td
                            className={`py-2 px-4 border text-right ${
                              t.tipo === "credito" ? "text-red-600" : "text-green-600"
                            }`}
                          >
                            {t.tipo === "credito" ? "-" : "+"}
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
    </div>
  );
};

export default FornecedoresTab;
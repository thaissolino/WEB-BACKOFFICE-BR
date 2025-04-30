// CÓDIGO COM VISUAL REPRODUZIDO DA IMAGEM REFERÊNCIA
import React, { useEffect, useState } from "react";
import ModalCaixa from "../modals/ModalCaixa";
import { formatCurrency, formatDate } from "../modals/format";
import ConfirmModal from "../modals/ConfirmModal";

interface Transacao {
  id: number;
  date: string;
  valor: number;
  descricao: string;
  tipo: "pagamento" | "credito";
}

interface Caixa {
  id: number;
  userId: number;
  nome: string;
  taxa: number;
  saldo: number;
  transacoes: Transacao[];
}

const usuariosMock = [
  { id: 1, nome: "João Silva" },
  { id: 2, nome: "Maria Oliveira" },
  { id: 3, nome: "Carlos Souza" },
  { id: 4, nome: "Ana Lima" },
  { id: 5, nome: "Fernanda Costa" },
  { id: 6, nome: "Bruno Rocha" },
  { id: 7, nome: "Juliana Martins" },
  { id: 8, nome: "Ricardo Pereira" },
  { id: 9, nome: "Larissa Melo" },
  { id: 10, nome: "Felipe Araújo" },
];

const CaixasTab: React.FC = () => {
  const [caixas, setCaixas] = useState<Caixa[]>([]);
  const [caixaSelecionado, setCaixaSelecionado] = useState<Caixa | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editarCaixa, setEditarCaixa] = useState<Caixa | undefined>(undefined);
  const [valorPagamento, setValorPagamento] = useState<number>(0);
  const [descricaoPagamento, setDescricaoPagamento] = useState("");
  const [dataPagamento, setDataPagamento] = useState<string>(new Date().toISOString().split("T")[0]);
  const [caixaToDelete, setCaixaToDelete] = useState<number | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("caixas") || "[]");
    setCaixas(stored);
  }, []);

  useEffect(() => {
    if (selectedUserId !== null) {
      const existe = caixas.some((c) => c.userId === selectedUserId);
      if (!existe) {
        const novo: Caixa = {
          id: Date.now(),
          userId: selectedUserId,
          nome: "Caixa Padrão",
          taxa: 0,
          saldo: 0,
          transacoes: [],
        };
        const atualizados = [...caixas, novo];
        setCaixas(atualizados);
        localStorage.setItem("caixas", JSON.stringify(atualizados));
      }
    }
  }, [selectedUserId]);

  const salvarCaixa = (nome: string, taxa: number, userId: number) => {
    if (editarCaixa) {
      const updated = caixas.map((c) =>
        c.id === editarCaixa.id ? { ...c, nome, taxa } : c
      );
      setCaixas(updated);
      localStorage.setItem("caixas", JSON.stringify(updated));
    } else {
      const novo: Caixa = {
        id: Date.now(),
        userId,
        nome,
        taxa,
        saldo: 0,
        transacoes: [],
      };
      const updated = [...caixas, novo];
      setCaixas(updated);
      localStorage.setItem("caixas", JSON.stringify(updated));
    }
    setShowModal(false);
    setEditarCaixa(undefined);
  };

  const abrirCaixa = (caixa: Caixa) => setCaixaSelecionado(caixa);
  const fecharCaixa = () => {
    setCaixaSelecionado(null);
    setValorPagamento(0);
    setDescricaoPagamento("");
  };

  const registrarPagamento = () => {
    if (!caixaSelecionado || !selectedUserId) return;
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

    const updatedCaixas = caixas.map((c) =>
      c.id === caixaSelecionado.id
        ? {
            ...c,
            saldo: c.saldo + valorPagamento,
            transacoes: [...c.transacoes, novaTransacao],
          }
        : c
    );

    setCaixas(updatedCaixas);
    localStorage.setItem("caixas", JSON.stringify(updatedCaixas));
    setCaixaSelecionado(updatedCaixas.find((c) => c.id === caixaSelecionado.id) || null);
    fecharCaixa();
    alert("Pagamento registrado!");
  };

  const confirmarDeleteCaixa = (id: number) => {
    setCaixaToDelete(id);
    setShowConfirmModal(true);
  };

  const deletarCaixa = () => {
    if (caixaToDelete !== null) {
      const updated = caixas.filter((c) => c.id !== caixaToDelete);
      setCaixas(updated);
      localStorage.setItem("caixas", JSON.stringify(updated));
      setCaixaSelecionado(null);
      setCaixaToDelete(null);
    }
    setShowConfirmModal(false);
  };

  const caixasDoUsuario = selectedUserId ? caixas.filter((c) => c.userId === selectedUserId) : [];
  const caixaAtual = caixasDoUsuario[0] || null;

  return (
    <div className="fade-in">
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Selecione um usuário</label>
        <div className="flex items-center space-x-4">
          <select
            className="border border-gray-300 rounded p-2 w-full"
            value={selectedUserId || ""}
            onChange={(e) => {
              setSelectedUserId(Number(e.target.value));
              setCaixaSelecionado(null);
            }}
          >
            <option value="" disabled>
              -- Selecione --
            </option>
            {usuariosMock.map((user) => (
              <option key={user.id} value={user.id}>
                {user.nome}
              </option>
            ))}
          </select>
          <button
            onClick={() => {
              if (!selectedUserId) return;
              setEditarCaixa({
                id: 0,
                nome: "Caixa Padrão",
                taxa: 0,
                saldo: 0,
                userId: selectedUserId,
                transacoes: [],
              });
              setShowModal(true);
            }}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
            disabled={!selectedUserId}
          >
            <i className="fas fa-plus mr-2"></i> ADICIONAR
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-blue-600 font-semibold text-lg flex items-center mb-2">
          <i className="fas fa-store mr-2"></i> CAIXAS INDIVIDUAIS
        </h2>
        <table className="min-w-full bg-white">
          <thead>
            <tr className="bg-gray-100 text-gray-700">
              <th className="py-2 px-4 border">NOME</th>
              <th className="py-2 px-4 border">TAXA</th>
              <th className="py-2 px-4 border">SALDO (USD)</th>
              <th className="py-2 px-4 border">AÇÕES</th>
            </tr>
          </thead>
          <tbody>
            {caixasDoUsuario.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="py-2 px-4 border">{c.nome}</td>
                <td className="py-2 px-4 border">{c.taxa}</td>
                <td className={`py-2 px-4 border text-right font-bold ${c.saldo < 0 ? "text-red-600" : "text-green-600"}`}>{formatCurrency(c.saldo)}</td>
                <td className="py-2 px-4 border space-x-2 text-center">
                  <button onClick={() => abrirCaixa(c)} className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded">Caixa</button>
                  <button onClick={() => { setEditarCaixa(c); setShowModal(true); }} className="bg-yellow-400 hover:bg-yellow-500 text-white px-3 py-1 rounded">Editar</button>
                  <button onClick={() => confirmarDeleteCaixa(c.id)} className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded">
                    <i className="fas fa-trash"></i>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {caixaAtual && (
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-blue-600 font-semibold text-lg flex items-center">
              <i className="fas fa-store mr-2"></i> CAIXA DE {caixaAtual.nome}
            </h2>
            <div className="text-sm text-right">
              SALDO: <span className={`font-bold ${caixaAtual.saldo < 0 ? "text-red-600" : "text-green-600"}`}>{formatCurrency(caixaAtual.saldo)}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-50 p-4 rounded border">
              <h3 className="font-medium mb-3 text-blue-700 border-b pb-2 flex items-center">
                <i className="fas fa-hand-holding-usd mr-2"></i> REGISTRAR PAGAMENTO
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">DATA</label>
                  <input type="date" className="mt-1 block w-full border border-gray-300 rounded-md p-2" value={dataPagamento} onChange={(e) => setDataPagamento(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">VALOR (USD)</label>
                  <input type="number" step="0.01" className="mt-1 block w-full border border-gray-300 rounded-md p-2" value={valorPagamento} onChange={(e) => setValorPagamento(Number(e.target.value))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">DESCRIÇÃO</label>
                  <input type="text" className="mt-1 block w-full border border-gray-300 rounded-md p-2" value={descricaoPagamento} onChange={(e) => setDescricaoPagamento(e.target.value)} />
                </div>
                <button onClick={registrarPagamento} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded w-full">
                  <i className="fas fa-check mr-2"></i> REGISTRAR
                </button>
              </div>
            </div>

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
                    {caixaAtual.transacoes.slice(-6).reverse().map((t) => (
                      <tr key={t.id} className="bg-red-50">
                        <td className="py-2 px-4 border">{formatDate(t.date)}</td>
                        <td className="py-2 px-4 border">{t.descricao}</td>
                        <td className={`py-2 px-4 border text-right ${t.tipo === "credito" ? "text-red-600" : "text-green-600"}`}>
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

      <ModalCaixa isOpen={showModal} onClose={() => setShowModal(false)} onSave={salvarCaixa} fornecedorEdit={editarCaixa} />
      <ConfirmModal isOpen={showConfirmModal} title="Confirmar Exclusão" message="Tem certeza que deseja deletar este caixa?" onConfirm={deletarCaixa} onClose={() => setShowConfirmModal(false)} />
    </div>
  );
};

export default CaixasTab;

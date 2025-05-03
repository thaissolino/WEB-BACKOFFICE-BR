import React, { useEffect, useState } from "react";
import { formatCurrency, formatDate } from "./format";
import SuccessModal from "./SuccessModal";
import OperationDetailsModal from "./OperationDetailsModal";
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

interface Recolhedor {
  id: number;
  name: string;
  tax: number;
  balance: number;
}

interface Fornecedor {
  id: number;
  name: string;
  tax: number;
  balance: number;
}

const OperacoesTab: React.FC = () => {
  const [recolhedores, setRecolhedores] = useState<Recolhedor[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [operacoes, setOperacoes] = useState<Operacao[]>([]);

  const [dataOperacao, setDataOperacao] = useState<string>(new Date().toISOString().slice(0, 16));
  const [localOperacao, setLocalOperacao] = useState("");
  const [valorOperacao, setValorOperacao] = useState<number | null>(null);
  const [recolhedorOperacao, setRecolhedorOperacao] = useState<number | "">("");
  const [fornecedorOperacao, setFornecedorOperacao] = useState<number | "">("");
  const [taxaRecolhedorOperacao, setTaxaRecolhedorOperacao] = useState<number>(1.025);
  const [taxaFornecedorOperacao, setTaxaFornecedorOperacao] = useState<number>(1.05);

  const [successMessage, setSuccessMessage] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const [selectedOperation, setSelectedOperation] = useState<Operacao | null>(null);
  const [showOperationModal, setShowOperationModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const recolhedoresResponse = await api.get<Recolhedor[]>("/collectors/list_collectors");
      setRecolhedores(recolhedoresResponse.data);

      const fornecedoresResponse = await api.get<Fornecedor[]>("/suppliers/list_suppliers");
      setFornecedores(fornecedoresResponse.data);

      const operacoesResponse = await api.get<Operacao[]>("/operations/list_operations");
      setOperacoes(operacoesResponse.data);
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
      setSuccessMessage("Erro ao carregar os dados. Por favor, tente novamente.");
      setShowSuccessModal(true);
    }
  };

  const calcularResumo = () => {
    if (!valorOperacao) return { valorFornecedor: 0, valorRecolhedor: 0, lucro: 0 };
    const valorFornecedor = valorOperacao / taxaFornecedorOperacao;
    const valorRecolhedor = valorOperacao / taxaRecolhedorOperacao;
    const lucro = valorRecolhedor - valorFornecedor;
    return { valorFornecedor, valorRecolhedor, lucro };
  };

  const { valorFornecedor, valorRecolhedor, lucro } = calcularResumo();

  // const registrarOperacao = async () => {
  //   if (!dataOperacao || !localOperacao || !valorOperacao || !recolhedorOperacao || !fornecedorOperacao) {
  //     setSuccessMessage("Por favor, preencha todos os campos corretamente!");
  //     setShowSuccessModal(true);
  //     return;
  //   }
  //   const formattedDate = new Date(dataOperacao).toISOString();
  //   const novaOperacao = {
  //     date: formattedDate,
  //     city: localOperacao.toUpperCase(),
  //     value: valorOperacao,
  //     collectorId: recolhedorOperacao,
  //     supplierId: fornecedorOperacao,
  //     collectorTax: taxaRecolhedorOperacao,
  //     supplierTax: taxaFornecedorOperacao,
  //     profit: lucro, // O lucro já foi calculado
  //   };

  //   try {
  //     await api.post<Operacao>("/operations/create_operation", novaOperacao);
  //     // Após criar a operação, refetch os dados para atualizar saldos e a lista de operações
  //     await fetchData();

  //     // Resetar campos
  //     setLocalOperacao("");
  //     setValorOperacao(0);
  //     setRecolhedorOperacao("");
  //     setFornecedorOperacao("");
  //     setTaxaRecolhedorOperacao(1.025);
  //     setTaxaFornecedorOperacao(1.05);

  //     setSuccessMessage("Operação registrada com sucesso!");
  //     setShowSuccessModal(true);
  //   } catch (error) {
  //     console.error("Erro ao registrar operação:", error);
  //     setSuccessMessage("Erro ao registrar a operação. Por favor, tente novamente.");
  //     setShowSuccessModal(true);
  //   }
  // };

  const registrarOperacao = async () => {
    if (!dataOperacao || !localOperacao || !valorOperacao || !recolhedorOperacao || !fornecedorOperacao) {
      setSuccessMessage("Por favor, preencha todos os campos corretamente!");
      setShowSuccessModal(true);
      return;
    }
  
    // Combina a data selecionada (apenas o dia) com o horário atual
    const selectedDateOnly = dataOperacao.split("T")[0]; // ex: "2025-05-02"
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 8); // ex: "14:37:00"
    const finalDate = new Date(`${selectedDateOnly}T${currentTime}`);
    const formattedDate = finalDate.toISOString(); // Envia como UTC
  
    const novaOperacao = {
      date: formattedDate,
      city: localOperacao.toUpperCase(),
      value: valorOperacao,
      collectorId: recolhedorOperacao,
      supplierId: fornecedorOperacao,
      collectorTax: taxaRecolhedorOperacao,
      supplierTax: taxaFornecedorOperacao,
      profit: lucro, // O lucro já foi calculado
    };
  
    try {
      await api.post<Operacao>("/operations/create_operation", novaOperacao);
  
      // Recarrega dados para atualizar a interface
      await fetchData();
  
      // Resetar campos
      setLocalOperacao("");
      setValorOperacao(0);
      setRecolhedorOperacao("");
      setFornecedorOperacao("");
      setTaxaRecolhedorOperacao(1.025);
      setTaxaFornecedorOperacao(1.05);
  
      setSuccessMessage("Operação registrada com sucesso!");
      setShowSuccessModal(true);
    } catch (error: any) {
      console.error("Erro ao registrar operação:", error);
      setSuccessMessage("Erro ao registrar a operação. Por favor, tente novamente.");
      setShowSuccessModal(true);
    }
  };
  
  const getRecolhedorNome = (id: number) => recolhedores.find((r) => r.id === id)?.name || "DESCONHECIDO";
  const getFornecedorNome = (id: number) => fornecedores.find((f) => f.id === id)?.name || "DESCONHECIDO";

  const abrirDetalhesOperacao = (operacao: Operacao) => {
    setSelectedOperation(operacao);
    setShowOperationModal(true);
  };

  return (
    <div className="fade-in">
      {/* Success Modal */}
      <SuccessModal isOpen={showSuccessModal} onClose={() => setShowSuccessModal(false)} message={successMessage} />

      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-xl font-semibold mb-4 text-blue-700 border-b pb-2">
          <i className="fas fa-handshake mr-2"></i> NOVA OPERAÇÃO
        </h2>

        {/* Campos de entrada para nova operação */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">DATA</label>
            <input
              type="date"
              className="mt-1 block w-full border border-gray-300 rounded-md p-2"
              value={dataOperacao}
              onChange={(e) => setDataOperacao(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">LOCAL (CIDADE)</label>
            <input
              type="text"
              className="mt-1 block w-full border border-gray-300 rounded-md p-2"
              value={localOperacao}
              onChange={(e) => setLocalOperacao(e.target.value)}
              placeholder="EX: GOIÂNIA"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">VALOR (USD)</label>
            <input
              type="number"
              inputMode="decimal"
              className="mt-1 block w-full border border-gray-300 rounded-md p-2 appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              value={valorOperacao || ""}
              onChange={(e) => setValorOperacao(Number(e.target.value.replace(",", ".")))}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">RECOLHEDOR</label>
            <select
              className="mt-1 block w-full border border-gray-300 rounded-md p-2"
              value={recolhedorOperacao}
              onChange={(e) => setRecolhedorOperacao(Number(e.target.value))}
            >
              <option value="">SELECIONE UM RECOLHEDOR</option>
              {recolhedores.map((rec) => (
                <option key={rec.id} value={rec.id}>
                  {rec.name}
                </option>
              ))}
            </select>
            <div className="mt-1 flex items-center">
              <span className="text-xs text-gray-500 mr-2">TAXA:</span>
              <input
                type="number"
                className="text-xs w-16 border border-gray-300 rounded p-1"
                value={taxaRecolhedorOperacao}
                onChange={(e) => setTaxaRecolhedorOperacao(Number(e.target.value))}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">FORNECEDOR</label>
            <select
              className="mt-1 block w-full border border-gray-300 rounded-md p-2"
              value={fornecedorOperacao}
              onChange={(e) => setFornecedorOperacao(Number(e.target.value))}
            >
              <option value="">SELECIONE UM FORNECEDOR</option>
              {fornecedores.map((forn) => (
                <option key={forn.id} value={forn.id}>
                  {forn.name}
                </option>
              ))}
            </select>
            <div className="mt-1 flex items-center">
              <span className="text-xs text-gray-500 mr-2">TAXA:</span>
              <input
                type="number"
                className="text-xs w-16 border border-gray-300 rounded p-1"
                value={taxaFornecedorOperacao}
                onChange={(e) => setTaxaFornecedorOperacao(Number(e.target.value))}
              />
            </div>
          </div>
        </div>

        <div className="mt-6 bg-blue-50 p-4 rounded">
          <h3 className="font-medium mb-2">RESUMO DA OPERAÇÃO</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-700">PARA FORNECEDOR:</p>
              <p className="font-bold">{formatCurrency(valorFornecedor)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-700">DÉBITO DO RECOLHEDOR:</p>
              <p className="font-bold">{formatCurrency(valorRecolhedor)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-700">SEU LUCRO:</p>
              <p className="font-bold text-green-600">{formatCurrency(lucro)}</p>
            </div>
          </div>
        </div>

        <button
          onClick={registrarOperacao}
          className="mt-6 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md w-full"
        >
          <i className="fas fa-save mr-2"></i> REGISTRAR OPERAÇÃO
        </button>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4 text-blue-700 border-b pb-2">
          <i className="fas fa-history mr-2"></i> ÚLTIMAS OPERAÇÕES
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white">
            <thead>
              <tr className="bg-gray-200">
                <th className="py-2 text-center px-4 border">DATA</th>
                <th className="py-2 text-center px-4 border">LOCAL</th>
                <th className="py-2 px-4 border text-center">RECOLHEDOR</th>
                <th className="py-2 px-4 border text-center">FORNECEDOR</th>
                <th className="py-2 px-4 border text-center">VALOR (USD)</th>
                <th className="py-2 px-4 border text-center">AÇÕES</th>
              </tr>
            </thead>
            <tbody>
              {operacoes.map((op) => (
                <tr key={op.id}>
                  <td className="py-2 px-4 border text-center algin-middle">
                    {/* {new Intl.DateTimeFormat("pt-BR", {
                      timeZone: "UTC",
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    }).format(new Date(op.date))} */}
                    {formatDate(new Date(op.date))}
                  </td>
                  <td className="py-2 px-4 border align-middle text-center">{op.city}</td>
                  <td className="py-2 px-4 border align-middle text-center">{getRecolhedorNome(op.collectorId)}</td>
                  <td className="py-2 px-4 border align-middle text-center ">{getFornecedorNome(op.supplierId)}</td>
                  <td className="py-2 px-4 border text-center align-middle">{formatCurrency(op.value)}</td>
                  <td className="py-2 px-4 border text-center align-middle">
                    <button onClick={() => abrirDetalhesOperacao(op)} className="text-blue-600 hover:text-blue-800">
                      <i className="fas fa-eye"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Operation Details Modal */}
      {showOperationModal && selectedOperation && (
        <OperationDetailsModal
          operation={selectedOperation}
          recolhedorNome={getRecolhedorNome(selectedOperation.collectorId)}
          fornecedorNome={getFornecedorNome(selectedOperation.supplierId)}
          onClose={() => setShowOperationModal(false)}
        />
      )}
    </div>
  );
};

export default OperacoesTab;

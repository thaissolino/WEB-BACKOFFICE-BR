// src/components/OperacoesTab.tsx

import React, { useEffect, useState } from "react";
import { formatCurrency, formatDate } from "./format";

interface Operacao {
  id: number;
  data: string;
  local: string;
  recolhedorId: number;
  fornecedorId: number;
  valor: number;
  taxaRecolhedor: number;
  taxaFornecedor: number;
  valorFornecedor: number;
  valorRecolhedor: number;
  lucro: number;
}

const OperacoesTab: React.FC = () => {
  const [recolhedores, setRecolhedores] = useState<any[]>([]);
  const [fornecedores, setFornecedores] = useState<any[]>([]);
  const [operacoes, setOperacoes] = useState<Operacao[]>([]);

  const [dataOperacao, setDataOperacao] = useState<string>(new Date().toISOString().split("T")[0]);
  const [localOperacao, setLocalOperacao] = useState("");
  const [valorOperacao, setValorOperacao] = useState<number>(0);
  const [recolhedorId, setRecolhedorId] = useState<string>("");
  const [fornecedorId, setFornecedorId] = useState<string>("");
  const [taxaRecolhedor, setTaxaRecolhedor] = useState("1.025");
  const [taxaFornecedor, setTaxaFornecedor] = useState("1.05");

  const [valorFornecedor, setValorFornecedor] = useState(0);
  const [valorRecolhedor, setValorRecolhedor] = useState(0);
  const [valorLucro, setValorLucro] = useState(0);

  useEffect(() => {
    const r = localStorage.getItem("recolhedores") || "[]";
    const f = localStorage.getItem("fornecedores") || "[]";
    const o = localStorage.getItem("operacoes") || "[]";
    setRecolhedores(JSON.parse(r));
    setFornecedores(JSON.parse(f));
    setOperacoes(JSON.parse(o));
  }, []);

  useEffect(() => {
    if (!valorOperacao || !recolhedorId || !fornecedorId) return;
    const val = parseFloat(valorOperacao.toString());
    const taxaR = parseFloat(taxaRecolhedor);
    const taxaF = parseFloat(taxaFornecedor);

    const valorF = val / taxaF;
    const valorR = val / taxaR;
    const lucro = valorR - valorF;

    setValorFornecedor(valorF);
    setValorRecolhedor(valorR);
    setValorLucro(lucro);
  }, [valorOperacao, recolhedorId, fornecedorId, taxaRecolhedor, taxaFornecedor]);

  const registrarOperacao = () => {
    if (!dataOperacao || !localOperacao || !valorOperacao || !recolhedorId || !fornecedorId) {
      alert("Preencha todos os campos corretamente.");
      return;
    }

    const novaOperacao: Operacao = {
      id: Date.now(),
      data: dataOperacao,
      local: localOperacao,
      recolhedorId: parseInt(recolhedorId),
      fornecedorId: parseInt(fornecedorId),
      valor: valorOperacao,
      taxaRecolhedor: parseFloat(taxaRecolhedor),
      taxaFornecedor: parseFloat(taxaFornecedor),
      valorFornecedor,
      valorRecolhedor,
      lucro: valorLucro,
    };

    const novaLista = [novaOperacao, ...operacoes];
    setOperacoes(novaLista);
    localStorage.setItem("operacoes", JSON.stringify(novaLista));

    setDataOperacao(new Date().toISOString().split("T")[0]);
    setLocalOperacao("");
    setValorOperacao(0);
    setRecolhedorId("");
    setFornecedorId("");
    setTaxaRecolhedor("1.025");
    setTaxaFornecedor("1.05");
    setValorFornecedor(0);
    setValorRecolhedor(0);
    setValorLucro(0);
  };

  const getNomeRecolhedor = (id: number) => recolhedores.find((r) => r.id === id)?.nome || "N/A";
  const getNomeFornecedor = (id: number) => fornecedores.find((f) => f.id === id)?.nome || "N/A";

  return (
    <div className="space-y-8">
      {/* NOVA OPERAÇÃO */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-xl font-semibold text-blue-700 border-b pb-2 mb-4 flex items-center">
          <i className="fas fa-handshake mr-2"></i> NOVA OPERAÇÃO
        </h2>

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
              step="0.01"
              className="mt-1 block w-full border border-gray-300 rounded-md p-2"
              value={valorOperacao}
              onChange={(e) => setValorOperacao(parseFloat(e.target.value))}
              placeholder="0.00"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">RECOLHEDOR</label>
            <select
              className="mt-1 block w-full border border-gray-300 rounded-md p-2"
              value={recolhedorId}
              onChange={(e) => setRecolhedorId(e.target.value)}
            >
              <option value="">SELECIONE UM RECOLHEDOR</option>
              {recolhedores.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nome.toUpperCase()}
                </option>
              ))}
            </select>
            <div className="mt-1 flex items-center">
              <span className="text-xs text-gray-500 mr-2">TAXA:</span>
              <input
                type="number"
                step="0.001"
                className="text-xs w-16 border border-gray-300 rounded p-1"
                value={taxaRecolhedor}
                onChange={(e) => setTaxaRecolhedor(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">FORNECEDOR</label>
            <select
              className="mt-1 block w-full border border-gray-300 rounded-md p-2"
              value={fornecedorId}
              onChange={(e) => setFornecedorId(e.target.value)}
            >
              <option value="">SELECIONE UM FORNECEDOR</option>
              {fornecedores.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nome.toUpperCase()}
                </option>
              ))}
            </select>
            <div className="mt-1 flex items-center">
              <span className="text-xs text-gray-500 mr-2">TAXA:</span>
              <input
                type="number"
                step="0.01"
                className="text-xs w-16 border border-gray-300 rounded p-1"
                value={taxaFornecedor}
                onChange={(e) => setTaxaFornecedor(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* RESUMO DA OPERAÇÃO */}
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
              <p className="font-bold text-green-600">{formatCurrency(valorLucro)}</p>
            </div>
          </div>
        </div>

        <button
          onClick={registrarOperacao}
          className="mt-6 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md w-full flex justify-center items-center"
        >
          <i className="fas fa-save mr-2"></i> REGISTRAR OPERAÇÃO
        </button>
      </div>

      {/* TABELA DE ÚLTIMAS OPERAÇÕES */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold text-blue-700 border-b pb-2 mb-4 flex items-center">
          <i className="fas fa-history mr-2"></i> ÚLTIMAS OPERAÇÕES
        </h2>

        <div className="overflow-x-auto">
          <table className="min-w-full bg-white">
            <thead>
              <tr className="bg-gray-200 text-gray-700 text-sm">
                <th className="py-2 px-4 border">DATA</th>
                <th className="py-2 px-4 border">LOCAL</th>
                <th className="py-2 px-4 border">RECOLHEDOR</th>
                <th className="py-2 px-4 border">FORNECEDOR</th>
                <th className="py-2 px-4 border">VALOR (USD)</th>
                <th className="py-2 px-4 border">AÇÕES</th>
              </tr>
            </thead>
            <tbody>
              {operacoes.length > 0 ? (
                operacoes.map((op) => (
                  <tr key={op.id} className="hover:bg-gray-50 text-sm">
                    <td className="py-2 px-4 border text-center">{formatDate(op.data)}</td>
                    <td className="py-2 px-4 border text-center">{op.local}</td>
                    <td className="py-2 px-4 border text-center">{getNomeRecolhedor(op.recolhedorId)}</td>
                    <td className="py-2 px-4 border text-center">{getNomeFornecedor(op.fornecedorId)}</td>
                    <td className="py-2 px-4 border text-center">{formatCurrency(op.valor)}</td>
                    <td className="py-2 px-4 border text-center space-x-2">
                      <button className="text-blue-500 hover:text-blue-700">
                        <i className="fas fa-edit"></i>
                      </button>
                      <button className="text-red-500 hover:text-red-700">
                        <i className="fas fa-trash"></i>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-gray-500">
                    NENHUMA OPERAÇÃO REGISTRADA
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default OperacoesTab;

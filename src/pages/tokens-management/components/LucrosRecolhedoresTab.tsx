import React, { useEffect, useState } from "react";
import { formatCurrency, formatDate } from "./format";
import { api } from "../../../services/api";
import { motion } from "framer-motion";
import { GenericSearchSelect } from "../../gestao-invoices/components/sections/SearchSelect";
import ModalCaixa from "../../gestao-invoices/components/modals/ModalCaixa";

interface Fornecedor {
  id: number;
  name: string;
}

interface Recolhedor {
  id: number;
  name: string;
  tax: number;
}

export interface Operacao {
  id: number;
  date: string;
  city: string;
  value: number;
  profit: number;
  collectorId: number;
  supplierId: number;
  collectorTax: number;
  supplierTax: number;
}

export interface Caixa {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  input: number;
  output: number;
  balance: number;
}

const LucrosRecolhedoresFusionTab: React.FC = () => {
  const [operacoes, setOperacoes] = useState<Operacao[]>([]);
  const [recolhedores, setRecolhedores] = useState<Recolhedor[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [selectedRecolhedor, setSelectedRecolhedor] = useState<Recolhedor | null>(null);
  const [loading, setLoading] = useState(true);
  const [paginaAtual, setPaginaAtual] = useState(0);
  const itensPorPagina = 10;

  const operacoesFiltradas = selectedRecolhedor
    ? operacoes.filter((op) => op.collectorId === selectedRecolhedor.id)
    : operacoes;

  const operacoesPaginadas = operacoesFiltradas.slice(paginaAtual * itensPorPagina, (paginaAtual + 1) * itensPorPagina);

  const getRecolhedorNome = (id: number) => recolhedores.find((r) => r.id === id)?.name || "Desconhecido";
  const getFornecedorNome = (id: number) => fornecedores.find((f) => f.id === id)?.name || "Desconhecido";

  const lucroMesAtual = operacoesFiltradas
    .filter((op) => new Date(op.date).getMonth() === new Date().getMonth())
    .reduce((acc, op) => acc + (op.value - (op.value || 0) / (op.collectorTax || 0) || 0), 0);

  const lucroMesAnterior = operacoesFiltradas
    .filter((op) => {
      const d = new Date(op.date);
      const mesAtual = new Date().getMonth();
      return d.getMonth() === (mesAtual === 0 ? 11 : mesAtual - 1);
    })
    .reduce((acc, op) => acc + (op.value - (op.value || 0) / (op.collectorTax || 0) || 0), 0);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      const [opRes, cxRes, rcRes, fnRes] = await Promise.all([
        api.get("/operations/list_operations"),
        api.get("/invoice/box"),
        api.get("/collectors/list_collectors"),
        api.get("/suppliers/list_suppliers"),
      ]);
      setOperacoes(opRes.data);
      setRecolhedores(rcRes.data);
      setFornecedores(fnRes.data);
      setLoading(false);
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
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

  return (
    <div className="fade-in">
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4 text-green-700 border-b pb-2">
          <i className="fas fa-chart-line mr-2"></i> HISTÓRICO DE LUCROS
        </h2>
        {selectedRecolhedor && (
          <>
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
                <p className="text-2xl font-bold text-purple-600">{formatCurrency(lucroMesAtual + lucroMesAnterior)}</p>
              </div>
            </div>
          </>
        )}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <div className="flex items-center space-x-4">
            <GenericSearchSelect
              items={recolhedores}
              value={selectedRecolhedor?.id.toString() || ""}
              getLabel={(r) => r.name}
              getId={(r) => r.id.toString()} // Também converte aqui
              onChange={(id) => {
                const rec = recolhedores.find((r) => r.id.toString() === id);
                setSelectedRecolhedor(rec || null);
              }}
              label="Selecione um recolhedor"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          {selectedRecolhedor && (
            <>
              <table className="min-w-full bg-white">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="py-2 px-4 border">DATA</th>
                    <th className="py-2 px-4 border">OPERAÇÃO</th>
                    <th className="py-2 px-4 border">RECOLHEDOR</th>
                    <th className="py-2 px-4 border">FORNECEDOR</th>
                    <th className="py-2 px-4 border">VALOR OPERAÇÃO</th>
                    <th className="py-2 px-4 border">LUCRO</th>
                  </tr>
                </thead>
                <tbody>
                  {operacoesPaginadas.map((op) => {
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
                        <td className="py-2 px-4 border text-center text-green-500 border-lime-500 bg-yellow-100 text-lg">
                          {/* {formatCurrency(op.profit || 0)} */}
                          {formatCurrency(op.value - (op.value || 0) / (op.collectorTax || 0))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="mt-4 flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  Página {paginaAtual + 1} de {Math.ceil(operacoesFiltradas.length / itensPorPagina)}
                </div>
                <div className="flex space-x-2">
                  <button
                    disabled={paginaAtual === 0}
                    onClick={() => setPaginaAtual((prev) => Math.max(0, prev - 1))}
                    className="px-3 py-1 border rounded disabled:opacity-50"
                  >
                    Anterior
                  </button>
                  <button
                    disabled={(paginaAtual + 1) * itensPorPagina >= operacoesFiltradas.length}
                    onClick={() =>
                      setPaginaAtual((prev) =>
                        Math.min(prev + 1, Math.ceil(operacoesFiltradas.length / itensPorPagina) - 1)
                      )
                    }
                    className="px-3 py-1 border rounded disabled:opacity-50"
                  >
                    Próxima
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default LucrosRecolhedoresFusionTab;

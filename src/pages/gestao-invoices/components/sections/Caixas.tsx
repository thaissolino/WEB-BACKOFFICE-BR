import type React from "react";
import { useEffect, useState } from "react";
import ModalCaixa from "../modals/ModalCaixa";
import { api } from "../../../../services/api";
import Swal from "sweetalert2";
import { GenericSearchSelect } from "./SearchSelect";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import type { Supplier } from "./SuppliersTab";

interface Transaction {
  id: string;
  value: number;
  userId: string;
  date: string;
  direction: "IN" | "OUT";
  description: string;
  createdAt: string;
  updatedAt: string;
  supplierId?: string;
  carrierId?: string;
}

export interface Caixa {
  id: string;
  name: string;
  type: "freteiro" | "fornecedor";

  description: string;
  createdAt: string;
  updatedAt: string;
  input: number;
  output: number;
  balance?: number;
  transactions: Transaction[];
}

const CaixasTab: React.FC = () => {
  const [combinedItems, setCombinedItems] = useState<any[]>([]);
  const [caixaUser, setCaixaUser] = useState<Caixa>();
  const [showModal, setShowModal] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<any | null>(null);

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [loadingFetch, setLoadingFetch] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingFetch2, setLoadingFetch2] = useState(false);
  const [loadingFetch3, setLoadingFetch3] = useState(false);
  const [loadingClearId, setLoadingClearId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    date: "",
    value: "",
    description: "",
  });

  useEffect(() => {
    console.log("foi?");
    fetchAllData();
  }, []);

  console.log(selectedUserId);

  const fetchAllData = async () => {
    setLoadingFetch(true);
    setIsLoading(true);
    try {
      // Fetch only carriers and suppliers in parallel
      const [carriersRes, suppliersRes] = await Promise.all([
        api.get("/invoice/carriers"),
        api.get("/invoice/supplier"),
      ]);

      // Combine carriers and suppliers with type labels
      const carrierItems = carriersRes.data.map((item: any) => ({
        ...item,
        typeInvoice: "freteiro",
      }));

      const supplierItems = suppliersRes.data.map((item: any) => ({
        ...item,
        typeInvoice: "fornecedor",
      }));

      // Combine all items
      const combined = [...carrierItems, ...supplierItems];
      setCombinedItems(combined);

      console.log("All data fetched:", combined);
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
      Swal.fire("Erro", "Erro ao carregar dados.", "error");
    } finally {
      setLoadingFetch(false);
      setIsLoading(false);
    }
  };

  const fetchEntityData = async (entityId: string) => {
    try {
      setLoadingFetch2(true);
      const res = await api.get(`/invoice/box/transaction/${entityId}`);
      const entity = combinedItems.find((item) => item.id === entityId);
      setSelectedEntity({
        ...entity,
        ...res.data,
      });
      console.log("res.data", res.data);

      console.log("entity", entity);
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
      Swal.fire("Erro", "Erro ao carregar dados.", "error");
    } finally {
      setLoadingFetch2(false);
    }
  };

  const salvarCaixa = async (nome: string, description: string) => {
    // Implemente lógica de criação de caixa com POST
  };

  const limparHistorico = async (recolhedorId: string) => {
    // const confirm = window.confirm("Deseja realmente excluir TODO o histórico de transações deste recolhedor?");
    // if (!confirm) return;

    setLoadingClearId(recolhedorId);
    try {
      await api.delete(`/invoice/box/trasnsaction/user/${recolhedorId}`);
      await fetchDatUser();
      // alert("Histórico excluído com sucesso.");
    } catch (e: any) {
      Swal.fire("Erro", "Erro ao apagar registo de pagamento", "error");
    } finally {
      setLoadingClearId(null);
    }
  };

  const caixaAtual = combinedItems.find((c) => c.id === selectedUserId);
  console.log(caixaAtual);

  console.log();
  const fetchDatUser = async () => {
    try {
      if (!selectedUserId) return;
      setLoadingFetch2(true);

      // Find the selected item to determine its type
      const selectedItem = combinedItems.find((item) => item.id === selectedUserId);

      if (!selectedItem) {
        console.error("Item selecionado não encontrado");
        return;
      }

      // Use the appropriate endpoint based on the item type
      let endpoint = `/invoice/box/transaction/${selectedUserId}`;
      if (selectedItem.typeInvoice === "freteiro" || selectedItem.typeInvoice === "fornecedor") {
        // Assuming the endpoint is the same for both types
        endpoint = `/invoice/box/transaction/${selectedUserId}`;
      }

      const res = await api.get(endpoint);
      console.log(res.data);
      setCaixaUser(res.data);
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
      Swal.fire("Erro", "Erro ao carregar dados.", "error");
    } finally {
      setLoadingFetch2(false);
    }
  };

  function isValidNumber(value: string): boolean {
    const number = Number(value);
    return !isNaN(number) && isFinite(number);
  }

  console.log(caixaUser);

  useEffect(() => {
    fetchDatUser();
  }, [selectedUserId]);

  console.log("selectedEntity", selectedEntity);

  const submitPayment = async () => {
    try {
      if (!formData.date) {
        Swal.fire("Erro", "Selecione uma data", "error");
        return;
      }
      if (!isValidNumber(formData.value)) {
        Swal.fire("Erro", "Informe um valor válido", "error");
        return;
      }
      if (!formData.description) {
        Swal.fire("Erro", "Informe uma descrição para o pagamento", "error");
        return;
      }
      if (!selectedEntity) {
        Swal.fire("Erro", "Nenhum usuário selecionado", "error");
        return;
      }

      console.log("selectedEntity", selectedEntity);

      setLoadingFetch3(true);
      await api.post(`/invoice/box/transaction`, {
        value: Math.abs(Number(formData.value)),
        entityId: selectedEntity.id,
        direction: Number(formData.value) > 0 ? "IN" : "OUT",
        date: formData.date,
        description: formData.description,
        entityType: selectedEntity.typeInvoice === "freteiro" ? "CARRIER" : "SUPPLIER",
        userId: caixaUser?.id,
      });

      await fetchEntityData(selectedEntity.id);
      setFormData({ date: "", value: "", description: "" });
      fetchDatUser();
      Swal.fire("Sucesso", "Transação registrada com sucesso", "success");
    } catch (error) {
      console.error("Erro ao buscar caixas:", error);
      Swal.fire("Erro", "Erro ao resgistrar pagamento", "error");
    } finally {
      setLoadingFetch3(false);
    }
  };

  return (
    <div className="fade-in">
      {/* Seletor de usuário */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        {loadingFetch ? (
          <div className="flex items-center space-x-4">
            <p className="text-sm text-gray-500">Carregando caixas...</p>
          </div>
        ) : (
          <div className="flex items-center space-x-4">
            <GenericSearchSelect
              items={combinedItems}
              value={selectedEntity?.id || ""}
              getLabel={(p) => `${p.name} (${p.typeInvoice === "freteiro" ? "Transportadora" : "Fornecedor"})`}
              getId={(p) => p.id}
              onChange={(id) => {
                const entity = combinedItems.find((item) => item.id === id);
                if (entity) {
                  setSelectedEntity(entity);
                  fetchEntityData(id);
                }
              }}
              label="Selecione um usuário"
            />
            <button
              onClick={() => setShowModal(true)}
              className="bg-blue-500 flex flex-row text-center items-center hover:bg-blue-600 text-white px-4 py-2 rounded"
              disabled={loadingFetch}
            >
              <i className="fas fa-plus mr-2"></i> ADICIONAR
            </button>
          </div>
        )}
      </div>

      {/* Dados do caixa selecionado */}
      {selectedEntity && (
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-blue-600 font-semibold text-lg">
              {selectedEntity.typeInvoice === "freteiro" ? "TRANSPORTADORA" : "FORNECEDOR"}: {selectedEntity.name}
            </h2>
            <div className="text-sm text-right">
              Entradas:{" "}
              <span className="mr-4 font-bold text-green-600">
                {loadingFetch2 ? (
                  <Loader2 className="inline w-4 h-4 animate-spin" />
                ) : (
                  `$ ${(selectedEntity.input || 0).toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`
                )}
              </span>
              Saídas:{" "}
              <span className="mr-4 font-bold text-red-600">
                {loadingFetch2 ? (
                  <Loader2 className="inline w-4 h-4 animate-spin" />
                ) : (
                  `$ ${(selectedEntity.output || 0).toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`
                )}
              </span>
              Saldo:{" "}
              <span
                className={`font-bold ${
                  (selectedEntity.balance?.balance || 0) < 0 ? "text-red-600" : "text-green-600"
                }`}
              >
                {loadingFetch2 ? (
                  <Loader2 className="inline w-4 h-4 animate-spin" />
                ) : (
                  `$ ${(selectedEntity.balance?.balance || 0).toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`
                )}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-50 p-4 rounded border">
              <h3 className="font-medium mb-3 text-blue-700 border-b pb-2">REGISTRAR TRANSAÇÃO</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">DATA</label>
                  <input
                    type="date"
                    className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">VALOR</label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-md p-2"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    placeholder="Use negativo para saída"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">DESCRIÇÃO</label>
                  <input
                    type="text"
                    className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
                <button
                  onClick={submitPayment}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded w-full flex items-center justify-center"
                  disabled={loadingFetch3}
                >
                  {loadingFetch3 ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Registrando...
                    </>
                  ) : (
                    "REGISTRAR TRANSAÇÃO"
                  )}
                </button>
              </div>
            </div>

            <div>
              <h3 className="font-medium mb-2 border-b pb-2">HISTÓRICO DE TRANSAÇÕES</h3>
              <div className="overflow-x-auto max-h-96">
                <table className="min-w-full bg-white">
                  <thead>
                    <tr className="bg-gray-200">
                      <th className="py-2 px-4 border">DATA</th>
                      <th className="py-2 px-4 border">DESCRIÇÃO</th>
                      <th className="py-2 px-4 border">VALOR</th>
                      <th className="py-2 px-4 border">AÇÕES</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingFetch2 ? (
                      <tr>
                        <td colSpan={4} className="text-center py-4">
                          <Loader2 className="inline animate-spin w-4 h-4 mr-2" />
                          Carregando...
                        </td>
                      </tr>
                    ) : selectedEntity.TransactionBoxUserInvoice?.length ? (
                      selectedEntity.TransactionBoxUserInvoice.slice()
                        .reverse()
                        .map((t : any) => (
                          <tr key={t.id} className="hover:bg-gray-50">
                            <td className="py-2 px-4 border text-center">
                              {new Date(t.date).toLocaleDateString("pt-BR")}
                            </td>
                            <td className="py-2 px-4 border">{t.description}</td>
                            <td
                              className={`py-2 px-4 border text-right ${
                                t.direction === "OUT" ? "text-red-600" : "text-green-600"
                              }`}
                            >
                              {t.direction === "OUT" ? "-" : "+"} ${t.value.toFixed(2)}
                            </td>
                            <td className="py-2 px-4 border text-center">
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => limparHistorico(t.id)}
                                disabled={loadingClearId === t.id}
                                className="bg-red-500 hover:bg-red-700 text-white px-3 py-1 rounded"
                              >
                                {loadingClearId === t.id ? <Loader2 className="w-4 h-4 animate-spin" /> : "Excluir"}
                              </motion.button>
                            </td>
                          </tr>
                        ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="text-center py-4 text-gray-500">
                          Nenhuma transação registrada
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de adicionar caixa */}
      <ModalCaixa
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSave={salvarCaixa}
        fetchDataUser={fetchAllData}
      />
    </div>
  );
};

export default CaixasTab;
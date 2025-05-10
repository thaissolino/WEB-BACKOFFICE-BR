import { useEffect, useState } from "react";
import ModalCaixa from "../modals/ModalCaixa";
import { api } from "../../../../services/api";
import Swal from "sweetalert2";
import { GenericSearchSelect } from "./SearchSelect";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { formatCurrency } from "../modals/format";
import { Truck, HandCoins, Handshake, CircleDollarSign } from "lucide-react";
import { useBalanceStore } from "../../../../store/useBalanceStore";
import { BalanceSharp } from "@mui/icons-material";

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
  type: "freteiro" | "fornecedor" | "parceiro";

  description: string;
  createdAt: string;
  updatedAt: string;
  input: number;
  output: number;
  balance?: number;
  transactions: Transaction[];
}

interface TransactionHistory {
  id: string;
  date: string;
  description: string;
  value: number;
  isInvoice: boolean;
  direction: "IN" | "OUT";
}

export const CaixasTab = () => {
  const [combinedItems, setCombinedItems] = useState<any[]>([]);
  const [caixaUser, setCaixaUser] = useState<Caixa>();
  // const [showModal, setShowModal] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<any | null>(null);
  const [totalBalance, setTotalBalance] = useState<number>(0);

  const [transactionHistoryList, setTransactionHistoryList] = useState<TransactionHistory[]>([]);

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

  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 6; // ou o número que preferir
  const { getBalances, balanceCarrier, balanceGeneralUSD, balancePartnerUSD, balanceSupplier } = useBalanceStore();

  const paginatedTransactions = transactionHistoryList.slice(
    currentPage * itemsPerPage,
    (currentPage + 1) * itemsPerPage
  );

  useEffect(() => {
    console.log("foi?");
    fetchAllData();
    getBalances();
  }, []);

  console.log(selectedUserId);

  const fetchAllData = async () => {
    setLoadingFetch(true);
    setIsLoading(true);
    try {
      // Fetch only carriers and suppliers in parallel
      const [carriersRes, suppliersRes, partnerRes] = await Promise.all([
        api.get("/invoice/carriers"),
        api.get("/invoice/supplier"),
        api.get("/invoice/partner"),
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

      console.log("partners", partnerRes);

      const partnerItems = partnerRes.data.usd.map((item: any) => ({
        ...item,
        typeInvoice: "parceiro",
      }));

      // Combine all items
      const combined = [...carrierItems, ...supplierItems, ...partnerItems];
      setCombinedItems(combined);

      console.log("combined", combined);

      // Calculate total balance from all entities
      let total = 0;
      combined.forEach((entity) => {
        if (entity.balance && entity.balance.balance) {
          total += entity.balance.balance;
        }
      });
      setTotalBalance(total);

      console.log("All data fetched:", combined);
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
      Swal.fire({
        icon: "error",
        title: "Erro!",
        text: "Erro ao carregar dados.",
        buttonsStyling: false,
        customClass: {
          confirmButton: "bg-red-600 text-white hover:bg-red-700 px-4 py-2 rounded font-semibold",
        },
      });
    } finally {
      setLoadingFetch(false);
      setIsLoading(false);
    }
  };

  const fetchEntityData = async (entityId: string) => {
    console.log("foi?");
    try {
      setTransactionHistoryList([]);
      setLoadingFetch2(true);

      const res = await api.get(`/invoice/box/transaction/${entityId}`);
      console.log("res", res.data);
      const entity = combinedItems.find((item) => item.id === entityId);
      setSelectedEntity({
        ...entity,
        ...res.data,
      });

      // Adiciona as transações normais
      const transactions = res.data.TransactionBoxUserInvoice.map((transactionBox: any) => ({
        id: transactionBox.id,
        date: transactionBox.date,
        description: transactionBox.description,
        value: transactionBox.value,
        isInvoice: false,
        direction: transactionBox.direction,
      }));

      // Busca invoices baseado no tipo da entidade
      let invoices = [];
      if (entity?.typeInvoice === "fornecedor") {
        const { data: listInvoicesBySupplier } = await api.get(`/invoice/list/supplier/${entityId}`);
        console.log("istInvoicesBySupplier", listInvoicesBySupplier);

        invoices = listInvoicesBySupplier.map((invoice: any) => ({
          id: invoice.id,
          date: invoice.date,
          description: invoice.number,
          value: invoice.subAmount,
          isInvoice: true,
          direction: "OUT", // Invoices são sempre saídas
        }));
      } else if (entity?.typeInvoice === "freteiro") {
        const { data: listInvoicesByCarrier } = await api.get(`/invoice/list/carrier/${entityId}`);
        console.log("istInvoicesByCarrier", listInvoicesByCarrier);

        invoices = listInvoicesByCarrier.map((invoice: any) => ({
          id: invoice.id,
          date: invoice.date,
          description: invoice.number,
          value: invoice.subAmount,
          isInvoice: true,
          direction: "OUT", // Invoices são sempre saídas
        }));
      } else if (entity?.typeInvoice === "parceiro") {
        // Se necessário, adicione lógica similar para parceiros
      }

      // Combina transações e invoices, ordenando por data
      setTransactionHistoryList(
        [...transactions, ...invoices].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      );
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
      Swal.fire({
        icon: "error",
        title: "Erro!",
        text: "Erro ao carregar caixas.",
        buttonsStyling: false,
        customClass: {
          confirmButton: "bg-red-600 text-white hover:bg-red-700 px-4 py-2 rounded font-semibold",
        },
      });
    } finally {
      setLoadingFetch2(false);
    }
  };
  const getTotalBalance = () => {
    // Calcula o saldo baseado nas transações e invoices
    return transactionHistoryList.reduce((acc, transaction) => {
      // Para transações normais (não invoices)
      if (!transaction.isInvoice) {
        return acc + (transaction.direction === "IN" ? transaction.value : -transaction.value);
      }
      // Para invoices (sempre subtrai o valor)
      else {
        return acc - transaction.value;
      }
    }, 0);
  };

  const salvarCaixa = async (nome: string, description: string) => {
    // Implemente lógica de criação de caixa com POST
  };

  const limparHistorico = async (recolhedorId: string) => {
    // const confirm = window.confirm("Deseja realmente excluir TODO o histórico de transações deste recolhedor?");
    // if (!confirm) return;

    setLoadingClearId(recolhedorId);
    try {
      setLoadingFetch3(true);

      await api.delete(`/invoice/box/trasnsaction/user/${recolhedorId}`);

      await fetchEntityData(selectedEntity.id);
      fetchDatUser();
      Swal.fire({
        icon: "success",
        title: "Sucesso",
        text: "Transação deletada com sucesso",
        confirmButtonText: "Ok",
        buttonsStyling: false,
        customClass: {
          confirmButton: "bg-green-600 text-white hover:bg-green-700 px-4 py-2 rounded font-semibold",
        },
      });
    } catch (e: any) {
      Swal.fire({
        icon: "error",
        title: "Erro!",
        text: "Erro ao apagar registo de pagamento",
        buttonsStyling: false,
        customClass: {
          confirmButton: "bg-red-600 text-white hover:bg-red-700 px-4 py-2 rounded font-semibold",
        },
      });
    } finally {
      setLoadingClearId(null);
      setLoadingFetch3(false);
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
      if (
        selectedItem.typeInvoice === "freteiro" ||
        selectedItem.typeInvoice === "fornecedor" ||
        selectedItem.typeInvoice === "parceiro"
      ) {
        // Assuming the endpoint is the same for both types
        endpoint = `/invoice/box/transaction/${selectedUserId}`;
      }

      const res = await api.get(endpoint);
      console.log(res.data);
      setCaixaUser(res.data);
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
      Swal.fire({
        icon: "error",
        title: "Erro!",
        text: "Erro ao carregar caixas.",
        buttonsStyling: false,
        customClass: {
          confirmButton: "bg-red-600 text-white hover:bg-red-700 px-4 py-2 rounded font-semibold",
        },
      });
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
        Swal.fire({
          icon: "error",
          title: "Erro!",
          text: "selecione um data",
          buttonsStyling: false,
          customClass: {
            confirmButton: "bg-red-600 text-white hover:bg-red-700 px-4 py-2 rounded font-semibold",
          },
        });
        return;
      }
      if (!isValidNumber(formData.value)) {
        Swal.fire({
          icon: "error",
          title: "Erro!",
          text: "selecione um valor válido",
          buttonsStyling: false,
          customClass: {
            confirmButton: "bg-red-600 text-white hover:bg-red-700 px-4 py-2 rounded font-semibold",
          },
        });
        return;
      }
      if (!formData.description) {
        Swal.fire({
          icon: "error",
          title: "Erro!",
          text: "Informe uma descrição para o pagamento",
          buttonsStyling: false,
          customClass: {
            confirmButton: "bg-red-600 text-white hover:bg-red-700 px-4 py-2 rounded font-semibold",
          },
        });
        return;
      }
      if (!selectedEntity) {
        Swal.fire({
          icon: "error",
          title: "Erro!",
          text: "Nenhum usuário selecionado",
          buttonsStyling: false,
          customClass: {
            confirmButton: "bg-red-600 text-white hover:bg-red-700 px-4 py-2 rounded font-semibold",
          },
        });
        return;
      }

      console.log("selectedEntity", selectedEntity);
      const now = new Date();
      const currentTime = now.toTimeString().split(" ")[0]; // HH:MM:SS
      const fullDate = new Date(`${formData.date}T${currentTime}`);

      setLoadingFetch3(true);
      await api.post(`/invoice/box/transaction`, {
        value: Math.abs(Number(formData.value)),
        entityId: selectedEntity.id,
        direction: Number(formData.value) > 0 ? "IN" : "OUT",
        date: fullDate.toISOString(),
        description: formData.description,
        entityType:
          selectedEntity.typeInvoice === "freteiro"
            ? "CARRIER"
            : selectedEntity.typeInvoice === "parceiro"
            ? "PARTNER"
            : selectedEntity.typeInvoice === "fornecedor"
            ? "SUPPLIER"
            : "",
        userId: caixaUser?.id,
      });

      await fetchEntityData(selectedEntity.id);

      getBalances();

      setFormData({ date: "", value: "", description: "" });
      fetchDatUser();
      Swal.fire({
        icon: "success",
        title: "Sucesso",
        text: "Transação registrada com sucesso",
        confirmButtonText: "Ok",
        buttonsStyling: false,
        customClass: {
          confirmButton: "bg-green-600 text-white hover:bg-green-700 px-4 py-2 rounded font-semibold",
        },
      });
    } catch (error) {
      console.error("Erro ao buscar caixas:", error);
      Swal.fire({
        icon: "error",
        title: "Erro",
        text: "Erro ao resgistrar pagamento",
        confirmButtonText: "Ok",
        buttonsStyling: false,
        customClass: {
          confirmButton: "bg-red-600 text-white hover:bg-red-700 px-4 py-2 rounded font-semibold",
        },
      });
    } finally {
      setLoadingFetch3(false);
    }
  };

  return (
    <div className="fade-in">
      {/* Seletor de usuário total acumulado de fornecedores, outros, fretes e total geral */}
      <h2 className="text-xl font-semibold mb-4 text-blue-700 border-b pb-2">
        <i className="fas fa-chart-line mr-2"></i> CONTROLE CENTRAL DE CAIXAS
      </h2>
      {/* Resumo */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div whileHover={{ scale: 1.02 }} className="bg-yellow-50 p-4 rounded-lg shadow relative group">
          <div className="flex items-center gap-2 mb-2">
            <HandCoins className="text-yellow-600 w-5 h-5" />
            <h3 className="font-medium truncate max-w-[180px]">TOTAL FORNECEDORES</h3>
          </div>
          <p className="text-2xl font-bold text-yellow-600 truncate" title={formatCurrency(balanceSupplier || 0)}>
            {/* {formatCurrency(balanceSupplier || 0).length > 12
              ? `${formatCurrency(balanceSupplier || 0).substring(0, 12)}...`
              : formatCurrency(balanceSupplier || 0)} */}
            {formatCurrency(balanceSupplier || 0)}
          </p>
          {formatCurrency(balanceSupplier || 0).length > 12 && (
            <div className="absolute hidden group-hover:block bg-gray-800 text-white text-xs p-2 rounded z-10 bottom-full mb-2 whitespace-nowrap">
              {formatCurrency(balanceSupplier || 0)}
            </div>
          )}
        </motion.div>

        <motion.div whileHover={{ scale: 1.02 }} className="bg-blue-50 p-4 rounded-lg shadow relative group">
          <div className="flex items-center gap-2 mb-2">
            <Truck className="text-blue-600 w-5 h-5" />
            <h3 className="font-medium truncate max-w-[180px]">TOTAL FRETES</h3>
          </div>
          <p className="text-2xl font-bold text-blue-600 truncate" title={formatCurrency(balanceCarrier || 0)}>
            {/* {formatCurrency(balanceCarrier || 0).length > 12
              ? `${formatCurrency(balanceCarrier || 0).substring(0, 12)}...`
              : formatCurrency(balanceCarrier || 0)} */}
            {formatCurrency(balanceCarrier || 0)}
          </p>
          {formatCurrency(balanceCarrier || 0).length > 5 && (
            <div className="absolute hidden group-hover:block bg-gray-800 text-white text-xs p-2 rounded z-10 bottom-full mb-2 whitespace-nowrap">
              {formatCurrency(balanceCarrier || 0)}
            </div>
          )}
        </motion.div>

        <motion.div whileHover={{ scale: 1.02 }} className="bg-teal-50 p-4 rounded-lg shadow relative group">
          <div className="flex items-center gap-2 mb-2">
            <Handshake className="text-teal-600 w-5 h-5" />
            <h3 className="font-medium truncate max-w-[180px]">TOTAL PARCEIROS</h3>
          </div>
          <p className="text-2xl font-bold text-teal-600 truncate" title={formatCurrency(balancePartnerUSD || 0)}>
            {/* {formatCurrency(balancePartnerUSD || 0).length > 12
              ? `${formatCurrency(balancePartnerUSD || 0).substring(0, 12)}...`
              : formatCurrency(balancePartnerUSD || 0)} */}
            {formatCurrency(balancePartnerUSD || 0)}
          </p>
          {/* {formatCurrency(balancePartnerUSD || 0).length > 12 && (
            <div className="absolute hidden group-hover:block bg-gray-800 text-white text-xs p-2 rounded z-10 bottom-full mb-2 whitespace-nowrap">
              {formatCurrency(balancePartnerUSD || 0)}
            </div>
          )} */}
          <div className="absolute hidden group-hover:block bg-gray-800 text-white text-xs p-2 rounded z-10 bottom-full mb-2 whitespace-nowrap">
            {formatCurrency(balancePartnerUSD || 0)}
          </div>
        </motion.div>

        <motion.div whileHover={{ scale: 1.02 }} className="bg-purple-50 p-4 rounded-lg shadow relative group">
          <div className="flex items-center gap-2 mb-2">
            <CircleDollarSign className="text-purple-600 w-5 h-5" />
            <h3 className="font-medium truncate max-w-[180px]">TOTAL GERAL</h3>
          </div>
          <p className="text-2xl font-bold text-purple-600 truncate" title={formatCurrency(balanceGeneralUSD || 0)}>
            {/* {formatCurrency(balanceGeneralUSD || 0).length > 12
              ? `${formatCurrency(balanceGeneralUSD || 0).substring(0, 12)}...`
              : formatCurrency(balanceGeneralUSD || 0)} */}
            {formatCurrency(balanceGeneralUSD || 0)}
          </p>
          {formatCurrency(balanceGeneralUSD || 0).length > 12 && (
            <div className="absolute hidden group-hover:block bg-gray-800 text-white text-xs p-2 rounded z-10 bottom-full mb-2 whitespace-nowrap">
              {formatCurrency(balanceGeneralUSD || 0)}
            </div>
          )}
        </motion.div>
      </div>
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <div className="flex items-center mb-4">
          <i className="fas fa-search text-blue-600 mr-2"></i>
          <h2 className="text-lg font-semibold text-blue-700">Selecionar Entidade</h2>
        </div>

        {loadingFetch ? (
          <div className="flex items-center space-x-4">
            <p className="text-sm text-gray-500">Carregando caixas...</p>
          </div>
        ) : (
          <div className="flex items-center space-x-4">
            <GenericSearchSelect
              items={combinedItems}
              value={selectedEntity?.id || ""}
              getLabel={(p) => (
                <span className="flex items-center">
                  {p.typeInvoice === "freteiro" && <i className="fas fa-truck mr-2 text-blue-600"></i>}
                  {p.typeInvoice === "fornecedor" && <i className="fas fa-hand-holding-usd mr-2 text-green-600"></i>}
                  {p.typeInvoice === "parceiro" && <i className="fas fa-handshake mr-2 text-red-600"></i>}
                  {p.name} (
                  {
                    (
                      {
                        freteiro: "Transportadora",
                        fornecedor: "Fornecedor",
                        parceiro: "Parceiro",
                      } as const
                    )[p.typeInvoice as "freteiro" | "fornecedor" | "parceiro"]
                  }
                  )
                </span>
              )}
              getSearchString={(p) => p.name}
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
          </div>
        )}
      </div>
      {/* Dados do caixa selecionado */}
      {selectedEntity && (
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-blue-600 font-semibold text-lg flex items-center space-x-2">
              {selectedEntity.typeInvoice === "freteiro" && <i className="fas fa-truck text-blue-600"></i>}
              {selectedEntity.typeInvoice === "fornecedor" && (
                <i className="fas fa-hand-holding-usd text-green-600"></i>
              )}
              {selectedEntity.typeInvoice === "parceiro" && <i className="fas fa-handshake text-red-600"></i>}
              <span>
                {selectedEntity.typeInvoice === "freteiro"
                  ? "TRANSPORTADORA"
                  : selectedEntity.typeInvoice === "fornecedor"
                  ? "FORNECEDOR"
                  : selectedEntity.typeInvoice === "parceiro"
                  ? "PARCEIRO"
                  : ""}{" "}
                : {selectedEntity.name}
              </span>
            </h2>
            <div className="text-sm text-right">
              {/* Entradas:{" "}
              <span className="mr-4 font-bold text-green-600">
                {loadingFetch2 ? (
                  <Loader2 className="inline w-4 h-4 animate-spin" />
                ) : (
                  `$ ${(selectedEntity.input || 0).toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`
                )}
              </span> */}
              {/* Saídas:{" "}
              <span className="mr-4 font-bold text-red-600">
                {loadingFetch2 ? (
                  <Loader2 className="inline w-4 h-4 animate-spin" />
                ) : (
                  `$ ${(selectedEntity.output || 0).toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`
                )}
              </span> */}
              Saldo:{" "}
              <span className={`font-bold ${(getTotalBalance() || 0) < 0 ? "text-red-600" : "text-green-600"}`}>
                {loadingFetch2 ? (
                  <Loader2 className="inline w-4 h-4 animate-spin" />
                ) : (
                  `$ ${getTotalBalance().toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`
                )}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-50 p-4 rounded border">
              <h3 className="font-medium mb-3 text-blue-700 border-b pb-2">
                {" "}
                <i className="fas fa-hand-holding-usd mr-2"></i> REGISTRAR TRANSAÇÃO
              </h3>
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
                    type="number"
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
                    ) : paginatedTransactions.length ? (
                      paginatedTransactions.map((t: any) => (
                        <motion.tr
                          key={t.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.3 }}
                          className="odd:bg-blue-50 even:bg-green-50"
                        >
                          <td className="py-2 px-4 border text-center">
                            {new Date(t.date).toLocaleString("pt-BR", {
                           //   timeZone: "UTC",
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                          <td className="py-2 px-4 border">{t.description}</td>
                          <td
                            className={`py-2 px-4 border text-right ${
                              t.direction === "OUT" ? "text-red-600" : "text-green-600"
                            }`}
                          >
                            {t.direction === "OUT" ? "-" : "+"}
                            {new Intl.NumberFormat("en-US", {
                              style: "currency",
                              currency: "USD",
                              minimumFractionDigits: 2,
                            }).format(t.value)}{" "}
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
                        </motion.tr>
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
                {transactionHistoryList.length > itemsPerPage && (
                  <div className="flex justify-between items-center mt-4">
                    <button
                      onClick={() => setCurrentPage((prev) => Math.max(0, prev - 1))}
                      disabled={currentPage === 0}
                      className="px-3 py-1 bg-gray-200 text-sm rounded disabled:opacity-50"
                    >
                      Anterior
                    </button>
                    <span className="text-sm text-gray-600">
                      Página {currentPage + 1} de {Math.ceil(transactionHistoryList.length / itemsPerPage)}
                    </span>
                    <button
                      onClick={() =>
                        setCurrentPage((prev) =>
                          Math.min(prev + 1, Math.ceil(transactionHistoryList.length / itemsPerPage) - 1)
                        )
                      }
                      disabled={(currentPage + 1) * itemsPerPage >= transactionHistoryList.length}
                      className="px-3 py-1 bg-gray-200 text-sm rounded disabled:opacity-50"
                    >
                      Próxima
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Modal de adicionar caixa */}
      {/* <ModalCaixa
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSave={salvarCaixa}
        fetchDataUser={fetchAllData}
      /> */}
    </div>
  );
};

export default CaixasTab;

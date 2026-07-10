import { History, Eye, Edit, XIcon, RotateCcw, Loader2, PlusCircle, Trash } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../../../../services/api";
import { Product } from "./ProductsTab";
import Swal from "sweetalert2";
import { useActionLoading } from "../../context/ActionLoadingContext";
import { ProductSearchSelect } from "./SupplierSearchSelect";
import { ProductImeis } from "../ProductImeis";
import { fixInvertedDateString, formatDateToBR, formatDateTimeToBR } from "../utils/format";
import { CarrierRateBadge } from "./CarrierRateBadge";
import {
  formatProductMoney,
  isBrlSupplierCurrency,
  productCurrencySymbol,
  SupplierCurrency,
} from "../utils/invoiceCurrency";

export type InvoiceData = {
  id: string;
  number: string;
  date: string;
  supplierId: string;
  carrierId: string;
  carrier2Id: string;
  taxaSpEs: number;
  amountTaxcarrier: number;
  amountTaxcarrier2: number;
  amountTaxSpEs: number;
  subAmount: number;
  overallValue: number;
  paid: boolean;
  paidDate: string | null;
  paidDollarRate: number | null;
  completed: boolean;
  completedDate: string | null;
  /** Snapshot imutável da % do freteiro 1 no momento desta nota. */
  carrierRateSnapshot?: number | null;
  /** Snapshot imutável da % do freteiro 2 no momento desta nota. */
  carrier2RateSnapshot?: number | null;
  products: {
    id: string;
    invoiceId: string;
    productId: string;
    quantity: number;
    value: number;
    weight: number;
    total: number;
    received: boolean;
    receivedQuantity: number;
    product: {
      id: string;
      name: string;
      code: string;
      priceweightAverage: number;
      weightAverage: number;
      description: string;
      active: boolean;
    };
  }[];
  supplier: {
    id: string;
    name: string;
    phone: string;
    active: boolean;
    currency?: SupplierCurrency;
  };
  carrier: {
    id: string;
    name: string;
    type: string;
    value: number;
    active: boolean;
  };
  carrier2: {
    id: string;
    name: string;
    type: string;
    value: number;
    active: boolean;
  };
  user?: {
    id: string;
    name: string;
    email: string;
  } | null;
};

interface InvoiceHistoryProps {
  reloadTrigger: boolean;
}

export function InvoiceHistory({ reloadTrigger }: InvoiceHistoryProps) {
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [showAddProductForm, setShowAddProductForm] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 10;
  // Histórico de Invoices da página principal: SOMENTE pendentes.
  // Pagas e Concluídas aparecem apenas em Relatórios (aba específica).
  const [newProduct, setNewProduct] = useState({
    productId: "",
    quantity: 1,
    value: "",
    weight: "",
    // Os campos abaixo são calculados ou têm valores padrão
    // total será calculado no momento do envio
    // received e receivedQuantity têm valores padrão
  });
  const [valorRaw, setValorRaw] = useState("");
  const { isLoading: isActionLoading, executeAction } = useActionLoading();

  useEffect(() => {
    fetchInvoicesAndSuppliers();
  }, [reloadTrigger]); // atualiza quando for alterado

  // Escutar eventos de atualização de invoice de outras abas
  useEffect(() => {
    const handleInvoiceUpdate = () => {
      console.log("🔄 [INVOICE HISTORY] Evento invoiceUpdated recebido, recarregando lista...");
      fetchInvoicesAndSuppliers();
    };

    window.addEventListener("invoiceUpdated", handleInvoiceUpdate);

    return () => {
      window.removeEventListener("invoiceUpdated", handleInvoiceUpdate);
    };
  }, []);
  const fetchInvoicesAndSuppliers = async () => {
    try {
      setLoading(true);
      const [invoiceResponse, supplierResponse, productsResponse] = await Promise.all([
        api.get("/invoice/get"),
        api.get("/invoice/supplier"),
        api.get("/invoice/product"),
      ]);

      console.log("📋 [INVOICE HISTORY] Resposta completa:", invoiceResponse);
      // Debug: verificar se invoices têm user
      if (invoiceResponse.data && invoiceResponse.data.length > 0) {
        console.log("📋 [INVOICE HISTORY] Total de invoices recebidas:", invoiceResponse.data.length);
        console.log("📋 [INVOICE HISTORY] Primeira invoice:", invoiceResponse.data[0]);
        console.log("📋 [INVOICE HISTORY] User da primeira invoice:", invoiceResponse.data[0]?.user);
        // Debug: verificar invoices não completas
        const notCompleted = invoiceResponse.data.filter((inv: any) => !inv.completed);
        console.log("📋 [INVOICE HISTORY] Invoices não completas:", notCompleted.length);
        console.log(
          "📋 [INVOICE HISTORY] Invoices não completas (detalhes):",
          notCompleted.map((inv: any) => ({ id: inv.id, number: inv.number, paid: inv.paid, completed: inv.completed }))
        );
        
        // Debug: verificar quantas passam pelo filtro final (não completas E não pagas)
        const notCompletedAndNotPaid = invoiceResponse.data.filter((inv: any) => !inv.completed && !inv.paid);
        console.log("📋 [INVOICE HISTORY] Invoices não completas E não pagas (que aparecerão na lista):", notCompletedAndNotPaid.length);
        console.log(
          "📋 [INVOICE HISTORY] Invoices não completas E não pagas (detalhes):",
          notCompletedAndNotPaid.map((inv: any) => ({ id: inv.id, number: inv.number, paid: inv.paid, completed: inv.completed }))
        );
      }
      // O backend agora retorna { products: [...], totalProducts: ..., page: ..., limit: ..., totalPages: ... }
      setProducts(Array.isArray(productsResponse.data) ? productsResponse.data : productsResponse.data.products || []);
      
      // Corrigir datas invertidas antes de salvar (YYYY-DD-MM → YYYY-MM-DD)
      const invoicesWithFixedDates = invoiceResponse.data.map((inv: any) => ({
        ...inv,
        date: fixInvertedDateString(inv.date),
        paidDate: inv.paidDate ? fixInvertedDateString(inv.paidDate) : null,
        completedDate: inv.completedDate ? fixInvertedDateString(inv.completedDate) : null,
      }));
      
      setInvoices(invoicesWithFixedDates);
      setSuppliers(supplierResponse.data);
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoicesAndSuppliers();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeModal();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const deleteInvoice = (idInvoice: string) => {
    if (!idInvoice) return;

    // Proteção imediata contra cliques duplos
    if (isActionLoading) {
      return;
    }

    Swal.fire({
      title: "Tem certeza?",
      text: "Você não poderá reverter isso!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sim, deletar!",
      cancelButtonText: "Cancelar",
      customClass: {
        confirmButton: "bg-red-600 text-white hover:bg-red-700 px-4 py-2 rounded font-semibold",
        cancelButton: "bg-gray-300 text-gray-800 hover:bg-gray-400 px-4 py-2 rounded font-semibold",
      },
    }).then((result) => {
      if (result.isConfirmed) {
        executeAction(async () => {
          await api.delete(`/invoice/delete/${idInvoice}`);
          setInvoices((prevInvoices) => prevInvoices.filter((invoice) => invoice.id !== idInvoice));
          Swal.fire({
            icon: "success",
            title: "Deletado!",
            text: "Invoice deletada com sucesso.",
            confirmButtonText: "Ok",
            buttonsStyling: false,
            customClass: {
              confirmButton: "bg-green-600 text-white hover:bg-green-700 px-4 py-2 rounded font-semibold",
            },
          });
        }, `deleteInvoice-${idInvoice}`).catch((error) => {
          console.error("Erro ao deletar invoice:", error);
          Swal.fire({
            icon: "error",
            title: "Error ",
            text: "Erro ao deletar invoice. Tente novamente.",
            confirmButtonText: "Ok",
            buttonsStyling: false,
            customClass: {
              confirmButton: "bg-green-600 text-white hover:bg-green-700 px-4 py-2 rounded font-semibold",
            },
          });
        });
      }
    });
  };

  const getStatusText = (invoice: InvoiceData) => {
    if (invoice.completed && invoice.paid) return "Concluída";
    if (!invoice.completed && invoice.paid) return "Paga";
    return "Pendente";
  };

  const getStatusClass = (invoice: InvoiceData) => {
    if (invoice.completed && invoice.paid) return "bg-green-100 text-green-800";
    if (invoice.completed) return "bg-blue-100 text-blue-800";
    return "bg-yellow-100 text-yellow-800";
  };

  const openModal = (invoice: InvoiceData, editMode: boolean) => {
    // if(invoice) return
    setSelectedInvoice(invoice);
    setIsEditMode(editMode);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedInvoice(null);
  };

  const getShippingTypeText = (type: string) => {
    switch (type) {
      case "percentage":
        return "%";
      case "perKg":
        return "$/kg";
      case "perUnit":
        return "$/un";
      default:
        return type;
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    // Proteção imediata contra cliques duplos
    if (isActionLoading) {
      return;
    }

    if (!selectedInvoice) return;

    console.log("procuct", productId);

    await executeAction(async () => {
      // Chama a API para deletar o produto
      await api.delete(`/invoice/product/delete/${productId}`, {
        data: {
          invoiceProductId: productId,
          invoiceId: selectedInvoice.id,
        },
      });

      // Atualiza a invoice selecionada
      const [invoiceResponse] = await Promise.all([api.get("/invoice/get")]);
      const findInvoice = invoiceResponse.data.find((item: InvoiceData) => item.id === selectedInvoice.id);

      setSelectedInvoice(findInvoice);
      setInvoices(invoiceResponse.data);
    }, `deleteProduct-${productId}`).catch((error) => {
      console.error("Erro ao deletar produto:", error);
    });
  };

  const handleAddNewProduct = async () => {
    // Proteção imediata contra cliques duplos
    if (isActionLoading) {
      return;
    }

    if (!selectedInvoice || !newProduct.productId) return;

    await executeAction(async () => {
      const total = Number(newProduct.value) * newProduct.quantity;

      await api.post("/invoice/product/add-invoice", {
        invoiceId: selectedInvoice.id,
        productId: newProduct.productId,
        quantity: newProduct.quantity,
        value: Number(newProduct.value),
        weight: Number(newProduct.weight),
        total: total, // Calculado automaticamente
        received: false, // Padrão para false quando adiciona novo produto
        receivedQuantity: 0, // Padrão 0 quando adiciona novo produto
      });

      // Atualiza a invoice selecionada

      // Atualiza a lista completa de invoices
      const [invoiceResponse] = await Promise.all([api.get("/invoice/get")]);

      const findInvoice = invoiceResponse.data.find((item: InvoiceData) => item.id === selectedInvoice.id);

      fetchInvoicesAndSuppliers();
      setSelectedInvoice(findInvoice);

      // Reseta o formulário
      setNewProduct({
        productId: "",
        quantity: 1,
        value: "",
        weight: "",
      });
      setValorRaw("");
      setShowAddProductForm(false);
    }, "addNewProduct").catch((error) => {
      console.error("Erro ao adicionar produto:", error);
    });
  };

  const totalQuantidade = selectedInvoice?.products.reduce((sum, product) => sum + product.quantity, 0);
  const supplierCurrency: SupplierCurrency = selectedInvoice?.supplier?.currency ?? null;
  const isBrlSupplier = isBrlSupplierCurrency(supplierCurrency);
  const moneySymbol = productCurrencySymbol(supplierCurrency);

  // Página principal: lista APENAS invoices pendentes (sem pagas e sem concluídas).
  // Pagas/Concluídas vivem na aba "Relatórios".
  const filteredInvoices = invoices.filter(
    (invoice) => !invoice.paid && !invoice.completed,
  );

  return (
    <div className="mt-8 bg-white p-6 pt-4 rounded-lg shadow">
      <h2 className="text-xl  w-full justify-between items-center flex  flex-row font-semibold mb-4 text-blue-700 border-b pb-2">
        <div className="flex justify-center items-center">
          <History className="mr-2 inline" size={18} />
          Histórico de Invoices
        </div>
        <button
          onClick={() => fetchInvoicesAndSuppliers()}
          className="flex justify-center items-center disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isActionLoading}
        >
          <RotateCcw className="mr-2 inline" size={24} />
        </button>
      </h2>

      <div className="overflow-x-auto">
        {loading ? (
          <p className="text-center text-gray-500 py-6">Carregando invoices...</p>
        ) : (
          <>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Número
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fornecedor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Valor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usuário
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    Nenhuma invoice encontrada
                  </td>
                </tr>
              ) : (
                filteredInvoices
                  .slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage) // ✅ Paginação
                  .map((invoice) => {
                    const supplier = suppliers.find((s) => s.id === invoice.supplierId);
                    const subtotal = invoice.products?.reduce((sum, product) => sum + product.total, 0) || 0;
                    const total = subtotal;

                    return (
                      <tr key={invoice.id} className="odd:bg-blue-50 even:bg-green-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {invoice.number}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{supplier?.name || "-"}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <i className="fas fa-clock text-green-500 mr-2"></i>
                          {formatDateTimeToBR(invoice.date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                          {formatProductMoney(total, invoice.supplier?.currency)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(
                              invoice
                            )}`}
                          >
                            {getStatusText(invoice)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {invoice.user ? (
                            <span title={invoice.user.email}>
                              {invoice.user.name || invoice.user.email || "Usuário"}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6  py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end gap-2">
                            {/* Se está paga E concluída: apenas visualizar (read-only) */}
                            {invoice.paid && invoice.completed ? (
                              <button
                                onClick={() => openModal(invoice, false)}
                                className="text-blue-600 hover:text-blue-900 disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Visualizar"
                                disabled={isActionLoading}
                              >
                                <Eye size={16} />
                              </button>
                            ) : invoice.paid ? (
                              /* Se está paga mas não concluída: visualizar + editar */
                              <>
                                <button
                                  onClick={() => openModal(invoice, false)}
                                  className="text-blue-600 hover:text-blue-900 disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="Visualizar"
                                  disabled={isActionLoading}
                                >
                                  <Eye size={16} />
                                </button>
                                <button
                                  onClick={() => openModal(invoice, true)}
                                  className="text-green-600 hover:text-green-900 disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="Editar"
                                  disabled={isActionLoading}
                                >
                                  <Edit size={16} />
                                </button>
                              </>
                            ) : (
                              /* Se não está paga: editar + deletar */
                              <>
                                <button
                                  onClick={() => openModal(invoice, true)}
                                  className="text-green-600 hover:text-green-900 disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="Editar"
                                  disabled={isActionLoading}
                                >
                                  <Edit size={16} />
                                </button>
                                <button
                                  onClick={() => deleteInvoice(invoice.id)}
                                  className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="Deletar"
                                  disabled={isActionLoading}
                                >
                                  <Trash size={16} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
              )}
            </tbody>
          </table>
          </>
        )}
        {/* Paginação */}
        {filteredInvoices.length > itemsPerPage && (
          <div className="flex justify-between items-center mt-4">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(0, prev - 1))}
              disabled={currentPage === 0}
              className="px-3 py-1 bg-gray-200 text-sm rounded disabled:opacity-50"
            >
              Anterior
            </button>
            <span className="text-sm text-gray-600">
              Página {currentPage + 1} de {Math.ceil(filteredInvoices.length / itemsPerPage)}
            </span>
            <button
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, Math.ceil(filteredInvoices.length / itemsPerPage) - 1))
              }
              disabled={(currentPage + 1) * itemsPerPage >= filteredInvoices.length}
              className="px-3 py-1 bg-gray-200 text-sm rounded disabled:opacity-50"
            >
              Próxima
            </button>
          </div>
        )}
      </div>

      {isModalOpen && selectedInvoice && (
        // <!-- Modal Visualizar Invoice -->
        <div
          id="modalViewInvoice"
          className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50 "
          onClick={closeModal}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white p-6 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto mx-4"
          >
            {/* Seção para adicionar novo produto */}
            <div className="mb-6">
              {!isEditMode && !showAddProductForm ? null : !showAddProductForm ? (
                <button
                  onClick={() => setShowAddProductForm(true)}
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-4"
                  disabled={!isEditMode}
                >
                  <PlusCircle className="inline" size={16} /> Adicionar Novo Produto
                </button>
              ) : (
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <ProductSearchSelect
                        products={products}
                        value={newProduct.productId}
                        onChange={(selectedId) => {
                          const product = products.find((p) => p.id === selectedId);

                          const price = product?.priceweightAverage ?? 0;
                          setValorRaw(
                            product?.priceweightAverage != null
                              ? formatProductMoney(product.priceweightAverage, supplierCurrency)
                              : ""
                          );

                          setNewProduct({
                            ...newProduct,
                            productId: selectedId,
                            value: price > 0 ? String(price) : "",
                            weight: price > 0 ? String(price) : "",
                          });
                        }}
                        inline={true}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Qtd</label>
                      <input
                        type="text"
                        min="1"
                        className="w-full p-2 border border-gray-300 rounded-md text-sm"
                        value={newProduct.quantity}
                        onChange={(e) => setNewProduct({ ...newProduct, quantity: Number(e.target.value) })}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Valor ({moneySymbol})</label>
                      <input
                        type="text"
                        placeholder="digite o valor"
                        // inputMode="decimal"
                        className="w-full p-2 border border-gray-300 rounded-md text-sm"
                        value={valorRaw}
                        onChange={(e) => {
                          // Permite números, ponto decimal e sinal negativo
                          const cleanedValue = e.target.value.replace(/[^0-9.-]/g, "");

                          // Garante que há apenas um sinal negativo no início
                          let newValue = cleanedValue;
                          if ((cleanedValue.match(/-/g) || []).length > 1) {
                            newValue = cleanedValue.replace(/-/g, "");
                          }

                          // Garante que há apenas um ponto decimal
                          if ((cleanedValue.match(/\./g) || []).length > 1) {
                            const parts = cleanedValue.split(".");
                            newValue = parts[0] + "." + parts.slice(1).join("");
                          }

                          setValorRaw(newValue);

                          // Converte para número para o estado do pagamento
                          // const numericValue = parseFloat(newValue) || 0;
                          // setValorOperacao(isNaN(numericValue) ? null : numericValue);
                          setNewProduct({ ...newProduct, value: newValue });
                        }}
                        // onChange={(e) => {
                        //   const inputValue = e.target.value;

                        //   // Permite número com ponto ou vírgula, até duas casas decimais
                        //   if (/^\d*[.,]?\d{0,2}$/.test(inputValue) || inputValue === "") {
                        //     setNewProduct({ ...newProduct, value: inputValue.replace(",", ".") });
                        //   }
                        // }}

                        onBlur={(e) => {
                          // Formata apenas se houver valor
                          if (valorRaw) {
                            const numericValue = parseFloat(valorRaw);
                            if (!isNaN(numericValue)) {
                              // Formata mantendo o sinal negativo se existir
                              const formattedValue = numericValue.toLocaleString(
                                isBrlSupplier ? "pt-BR" : "en-US",
                                {
                                  style: "currency",
                                  currency: isBrlSupplier ? "BRL" : "USD",
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                }
                              );
                              setValorRaw(formattedValue);
                              setNewProduct({ ...newProduct, value: numericValue.toString() });
                            }
                          }
                        }}
                        onFocus={(e) => {
                          // Remove formatação quando o input recebe foco
                          if (valorRaw) {
                            const numericValue = parseFloat(valorRaw.replace(/[^0-9.-]/g, ""));
                            if (!isNaN(numericValue)) {
                              setValorRaw(numericValue.toString());
                            }
                          }
                        }}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Peso (kg)</label>
                      <input
                        type="text"
                        placeholder="digite o valor"
                        inputMode="decimal"
                        className="w-full p-2 border border-gray-300 rounded-md text-sm"
                        value={newProduct.weight}
                        onChange={(e) => {
                          const inputValue = e.target.value;

                          // Permite número com ponto ou vírgula, até duas casas decimais
                          if (/^\d*[.,]?\d{0,2}$/.test(inputValue) || inputValue === "") {
                            setNewProduct({ ...newProduct, weight: inputValue.replace(",", ".") });
                          }
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2 mt-4">
                    <button
                      onClick={() => setShowAddProductForm(false)}
                      className="px-3 py-1 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleAddNewProduct}
                      disabled={!newProduct.productId || isActionLoading}
                      className="px-3 py-1 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-green-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isActionLoading ? (
                        <>
                          <Loader2 className="animate-spin mr-2 inline" size={14} />
                          Salvando...
                        </>
                      ) : (
                        "Adicionar Produto"
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-medium">
                  Invoice #<span id="modalInvoiceNumber">{selectedInvoice.number}</span>
                </h3>
                <p className="text-sm text-gray-600">
                  ID: <span id="modalInvoiceSupplier">{selectedInvoice.id}</span>
                </p>
                <p className="text-sm text-gray-600">
                  Fornecedor: <span id="modalInvoiceSupplier">{selectedInvoice.supplier?.name || "Não informado"}</span>
                </p>
                <p className="text-sm text-gray-600">
                  Data:{" "}
                  <span id="modalInvoiceDate">
                    {selectedInvoice.date ? formatDateToBR(selectedInvoice.date) : "Não informado"}
                  </span>
                </p>
                <p className="text-sm text-gray-600 flex items-center gap-2 flex-wrap">
                  <span>Freteiro:</span>
                  {selectedInvoice.carrier?.name ? (
                    <>
                      <span id="modalInvoiceCarrier">
                        {selectedInvoice.carrier.name} -{" "}
                      </span>
                      <CarrierRateBadge
                        type={selectedInvoice.carrier.type}
                        rate={
                          selectedInvoice.carrierRateSnapshot ??
                          selectedInvoice.carrier?.value ??
                          0
                        }
                        label="Freteiro 1"
                        onSave={async (newRate) => {
                          try {
                            await api.patch(`/invoice/update/${selectedInvoice.id}`, {
                              ...selectedInvoice,
                              date: selectedInvoice.date,
                              carrier2Id: selectedInvoice.carrier2?.id
                                ? Number(selectedInvoice.carrier2.id)
                                : undefined,
                              carrierRateSnapshot: newRate,
                            });
                            setSelectedInvoice({
                              ...selectedInvoice,
                              carrierRateSnapshot: newRate,
                            });
                            fetchInvoicesAndSuppliers();
                          } catch (err) {
                            console.error("Falha ao salvar override de % do freteiro:", err);
                            Swal.fire({
                              icon: "error",
                              title: "Erro",
                              text: "Não foi possível salvar a % deste freteiro.",
                            });
                          }
                        }}
                      />
                      <span className="text-xs text-gray-500">
                        {getShippingTypeText(selectedInvoice.carrier?.type || "")}
                      </span>
                    </>
                  ) : (
                    <span>Não informado</span>
                  )}
                </p>
                <p className="text-sm text-gray-600 flex items-center gap-2 flex-wrap">
                  <span>Freteiro 2:</span>
                  {selectedInvoice.carrier2?.name ? (
                    <>
                      <span id="modalInvoiceCarrier">
                        {selectedInvoice.carrier2.name} -{" "}
                      </span>
                      <CarrierRateBadge
                        type={selectedInvoice.carrier2.type}
                        rate={
                          selectedInvoice.carrier2RateSnapshot ??
                          selectedInvoice.carrier2?.value ??
                          0
                        }
                        label="Freteiro 2"
                        onSave={async (newRate) => {
                          try {
                            await api.patch(`/invoice/update/${selectedInvoice.id}`, {
                              ...selectedInvoice,
                              date: selectedInvoice.date,
                              carrier2Id: selectedInvoice.carrier2?.id
                                ? Number(selectedInvoice.carrier2.id)
                                : undefined,
                              carrier2RateSnapshot: newRate,
                            });
                            setSelectedInvoice({
                              ...selectedInvoice,
                              carrier2RateSnapshot: newRate,
                            });
                            fetchInvoicesAndSuppliers();
                          } catch (err) {
                            console.error("Falha ao salvar override de % do freteiro 2:", err);
                            Swal.fire({
                              icon: "error",
                              title: "Erro",
                              text: "Não foi possível salvar a % deste freteiro.",
                            });
                          }
                        }}
                      />
                      <span className="text-xs text-gray-500">
                        {getShippingTypeText(selectedInvoice.carrier2?.type || "")}
                      </span>
                    </>
                  ) : (
                    <span>não existe</span>
                  )}
                </p>
              </div>
              <div>
                <span id="modalInvoiceStatus" className="px-3 py-1 rounded-full text-xs font-medium"></span>
                <button onClick={() => setIsModalOpen(false)} className="ml-2 text-gray-500 hover:text-gray-700">
                  <XIcon className="mr-2 inline" size={26} />
                </button>
              </div>
            </div>

            <div className="mb-6">
              <h4 className="font-medium mb-2 text-blue-700 border-b pb-2">
                Produtos Pendentes
                {selectedInvoice.products.filter((item) => !item.received).length > 0 && (
                  <span className="ml-2 text-sm font-normal text-gray-600">
                    (Subtotal:{" "}
                    {formatProductMoney(
                      selectedInvoice.products
                        .filter((item) => !item.received)
                        .reduce((sum, product) => sum + product.total, 0),
                      supplierCurrency
                    )}
                    )
                  </span>
                )}
              </h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Produto
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Qtd
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Valor ({moneySymbol})
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Peso (kg)
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total ({moneySymbol})
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody id="modalInvoicePendingProducts" className="bg-white divide-y divide-gray-200">
                    {selectedInvoice.products
                      .filter((item) => !item.received)
                      .map((product, index) => (
                        <tr key={index}>
                          <td className="px-4 py-2 text-sm text-gray-700">
                            <div>
                              {products.find((item) => item.id === product.productId)?.name}
                              <ProductImeis
                                invoiceProductId={product.id}
                                productName={products.find((item) => item.id === product.productId)?.name || "Produto"}
                              />
                            </div>
                          </td>
                          <td className="px-4 py-2 text-sm text-right">{product.quantity}</td>
                          <td className="px-4 py-2 text-sm text-right">
                            {formatProductMoney(product.value, supplierCurrency)}
                          </td>
                          <td className="px-4 py-2 text-sm text-right">{product.weight.toFixed(2)}</td>
                          <td className="px-4 py-2 text-sm text-right">
                            {formatProductMoney(product.total, supplierCurrency)}
                          </td>
                          <td className="px-4 py-2 text-sm text-right">
                            {isEditMode && (
                              <div className="flex justify-end items-center ">
                                <button
                                  onClick={() => handleDeleteProduct(product.id)}
                                  disabled={isActionLoading}
                                  className={`flex items-center justify-center gap-2 text-sm font-medium px-3 py-1 rounded-md shadow-sm transition 
      ${
        isActionLoading
          ? "bg-gray-400 cursor-not-allowed opacity-60 text-white"
          : "bg-red-600 hover:bg-red-500 text-white"
      }`}
                                >
                                  {isActionLoading ? (
                                    <>
                                      <Loader2 className="animate-spin" size={16} /> Removendo...
                                    </>
                                  ) : (
                                    <>
                                      <XIcon size={16} /> Remover
                                    </>
                                  )}
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className={`bg-gray-50 p-4 rounded-2xl border shadow-sm text-center ${isBrlSupplier ? "opacity-50" : ""}`}>
                <p className="text-sm text-gray-600">Frete 1</p>
                <p id="modalInvoiceSubtotal" className="text-lg font-semibold">
                  {isBrlSupplier
                    ? "—"
                    : formatProductMoney(selectedInvoice.amountTaxcarrier, supplierCurrency)}
                </p>
              </div>

              <div className={`bg-gray-50 p-4 rounded-2xl border shadow-sm text-center ${isBrlSupplier ? "opacity-50" : ""}`}>
                <p className="text-sm text-gray-600">Frete 2</p>
                <p id="modalInvoiceShipping" className="text-lg font-semibold">
                  {isBrlSupplier
                    ? "—"
                    : formatProductMoney(selectedInvoice.amountTaxcarrier2, supplierCurrency)}
                </p>
              </div>

              <div className="bg-gray-50 p-4 rounded-2xl border shadow-sm text-center">
                <p className="text-sm text-gray-600">Frete SP x ES</p>
                <p id="modalInvoiceTax" className="text-lg font-semibold">
                  R${" "}
                  {selectedInvoice.amountTaxSpEs.toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>

              <div className="bg-gray-50 p-4 rounded-2xl border shadow-sm text-center">
                <p className="text-sm text-gray-600">Total de Itens (Qtd)</p>
                <p id="taxCost" className="text-lg font-semibold">
                  Qtd {totalQuantidade}
                </p>
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-2xl border shadow-sm mt-2">
              <div className="flex flex-col md:flex-row justify-between items-center">
                <p className="text-sm font-medium text-blue-800">Total da Invoice:</p>
                <p id="modalInvoiceTotal" className="text-xl font-bold text-blue-800">
                  {formatProductMoney(selectedInvoice.subAmount, supplierCurrency)}
                </p>
              </div>
              <div className="flex flex-col md:flex-row justify-between items-center mt-1" id="modalInvoicePaymentInfo">
                <p className="text-xs text-green-600">Total com frete:</p>
                <p className="text-xs font-medium text-green-600">
                  {isBrlSupplier
                    ? formatProductMoney(
                        selectedInvoice.subAmount + selectedInvoice.amountTaxSpEs,
                        supplierCurrency
                      )
                    : formatProductMoney(
                        selectedInvoice.subAmount +
                          selectedInvoice.amountTaxcarrier +
                          selectedInvoice.amountTaxcarrier2,
                        supplierCurrency
                      )}
                </p>
              </div>
              {isBrlSupplier && (
                <p className="text-xs text-amber-700 mt-2 text-center">
                  Valores em R$ — sem conversão para dólar.
                </p>
              )}
            </div>

            {/* <div className="bg-blue-50 p-4 rounded border">
              <div className="flex justify-between items-center">
                <p className="text-sm font-medium text-blue-800">Total da Invoice:</p>
                <p id="modalInvoiceTotal" className="text-xl font-bold text-blue-800">
                  ${" "}
                  {selectedInvoice.subAmount.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>
              <div className="flex justify-between items-center mt-1" id="modalInvoicePaymentInfo">
                <p className="text-xs text-green-600">Total com frete:</p>
                <p className="text-xs font-medium text-green-600">
                  <span id="modalInvoicePaidDate"></span> $ <span id="modalInvoiceDollarRate"></span>
                  {(
                    selectedInvoice.subAmount +
                    selectedInvoice.amountTaxcarrier +
                    selectedInvoice.amountTaxcarrier2
                  ).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div> */}

            <div className="mt-6 flex justify-end">
              {/* <button id="printInvoiceBtn" className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md mr-2">
                            <i className="fas fa-print mr-2"></i>Imprimir
                        </button>
                        <button id="exportInvoiceBtn" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md">
                            <i className="fas fa-file-export mr-2"></i>Exportar
                        </button> */}
              {/* <button id="completeInvoiceBtn" className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md ml-2">
                            <i className="fas fa-check mr-2"></i>Marcar como Concluída
                        </button> */}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

///moottin

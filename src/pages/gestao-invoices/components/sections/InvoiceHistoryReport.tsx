import { History, Eye, Edit, XIcon, RotateCcw, Check, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../../../../services/api";
import { Invoice } from "../types/invoice"; // Se necessário, ajuste o caminho do tipo
import { Product } from "./ProductsTab";
import { ModalReceiveProduct } from "../modals/ModalReceiveProduct";
import { an } from "framer-motion/dist/types.d-B50aGbjN";

export type exchange = {
  id: string;
  date: Date;
  type: string;
  usd: number;
  rate: number;
  description: string;
  invoiceId: string;
  createdAt: Date;
  updatedAt: Date;
};

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
};

type ProductData = {
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
};
type InvoiceHistoryReportProps = {
  invoiceHistory: InvoiceData[];
  setInvoiceHistory: React.Dispatch<React.SetStateAction<InvoiceData[]>>;
};


export function InvoiceHistoryReport({
  invoiceHistory: invoices,
  setInvoiceHistory: setInvoices,
}: InvoiceHistoryReportProps) {
  // const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingId, setIsSavingId] = useState("");
  const [exchanges, setExchangeResponse] = useState<exchange[]>([]);
  const [selectedProductToReceive, setSelectedProductToReceive] = useState<ProductData | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 10;

  const fetchInvoicesAndSuppliers = async () => {
    try {
      setLoading(true);
      const [invoiceResponse, supplierResponse, productsResponse, exchangeResponse] = await Promise.all([
        api.get("/invoice/get"),
        api.get("/invoice/supplier"),
        api.get("/invoice/product"),
        api.get("/invoice/exchange-records"),
      ]);
      setExchangeResponse(exchangeResponse.data);
      setProducts(productsResponse.data);
      setInvoices(invoiceResponse.data);
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

  const getStatusText = (invoice: InvoiceData) => {
    console.log(invoice);
    if (invoice.completed && invoice.paid) return "Concluída";
    if (!invoice.completed && invoice.paid) return "Pago";
    return "Pendente";
  };

  const getStatusClass = (invoice: InvoiceData) => {
    if (invoice.completed && invoice.paid) return "bg-blue-100 text-blue-800";
    if (!invoice.completed && invoice.paid) return "bg-green-100 text-green-800";
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

  const sendUpdateProductStatus = async (product: ProductData) => {
    if (!product) return;

    try {
      setIsSavingId(product.id);
      setIsSaving(true);
      await api.patch("/invoice/update/product", {
        idProductInvoice: product.id,
        bodyupdate: {
          received: true,
        },
      });
      const [invoiceResponse] = await Promise.all([api.get("/invoice/get")]);

      const findInvoice = invoiceResponse.data.find((item: InvoiceData) => item.id === product.invoiceId);

      setSelectedInvoice(findInvoice);

      setInvoices(invoiceResponse.data);
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const taxInvoice = exchanges.find((item) => item.invoiceId === selectedInvoice?.id);

  
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

  return (
    <div className="mt-8 bg-white p-6 pt-4 rounded-lg shadow">
      <h2  className="text-xl  w-full justify-between items-center flex  flex-row font-semibold mb-4 text-blue-700 border-b pb-2">
        <div className="flex justify-center items-center">
          <History className="mr-2 inline" size={18} />
          Histórico de Invoices
        </div>
        <button onClick={() => fetchInvoicesAndSuppliers()} className="flex justify-center items-center">
          <RotateCcw className="mr-2 inline" size={24} />
        </button>
      </h2>

      <div className="overflow-x-auto">
        {loading ? (
          <p className="text-center text-gray-500 py-6">Carregando invoices...</p>
        ) : (
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
                  Valor (R$)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    Nenhuma invoice encontrada
                  </td>
                </tr>
              ) : (
                invoices.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage).map((invoice) => {
                  const supplier = suppliers.find((s) => s.id === invoice.supplierId);
                  const subtotal = invoice.products?.reduce((sum, product) => sum + product.total, 0) || 0;
                  const total = subtotal;
                  const tax = exchanges.find((item) => item.invoiceId === invoice.id);

                  return (
                    <tr key={invoice.id} className="odd:bg-blue-50 even:bg-green-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {invoice.number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{supplier?.name || "-"}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(new Date(invoice.date).getTime() + 3 * 60 * 60 * 1000).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                        {formatCurrency(total)}
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex justify-end items-center">
                          {invoice.completed && invoice.paid ? (
                            <button
                              onClick={() => openModal(invoice, false)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              <Eye size={16} />
                            </button>
                          ) : (
                            <button
                              onClick={() => openModal(invoice, true)}
                              className="text-green-600 hover:text-green-900"
                            >
                              <Edit size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
        {/* Paginação */}
        {invoices.length > itemsPerPage && (
          <div className="flex justify-between items-center mt-4">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(0, prev - 1))}
              disabled={currentPage === 0}
              className="px-3 py-1 bg-gray-200 text-sm rounded disabled:opacity-50"
            >
              Anterior
            </button>
            <span className="text-sm text-gray-600">
              Página {currentPage + 1} de {Math.ceil(invoices.length / itemsPerPage)}
            </span>
            <button
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, Math.ceil(invoices.length / itemsPerPage) - 1))
              }
              disabled={(currentPage + 1) * itemsPerPage >= invoices.length}
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
          <div  onClick={(e) => e.stopPropagation()} className="bg-white p-6 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto mx-4">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-medium">
                  Invoice #<span id="modalInvoiceNumber">{selectedInvoice.number}</span>
                </h3>
                <p className="text-sm text-gray-600">
                  ID: <span id="modalInvoiceSupplier">{selectedInvoice.id}</span>
                </p>
                <p className="text-sm text-gray-600">
                  Fornecedor: <span id="modalInvoiceSupplier">{selectedInvoice.supplier.name}</span>
                </p>
                <p className="text-sm text-gray-600">
                  Data:{" "}
                  <span id="modalInvoiceDate">
                    {new Date(new Date(selectedInvoice.date).getTime() + 3 * 60 * 60 * 1000).toLocaleDateString(
                      "pt-BR"
                    )}
                  </span>
                </p>
                <p className="text-sm text-gray-600">
                  Freteiro:{" "}
                  <span id="modalInvoiceCarrier">
                    {selectedInvoice.carrier.name} - {selectedInvoice.carrier?.value}{" "}
                    {getShippingTypeText(selectedInvoice.carrier?.type)}
                  </span>
                </p>
                <p className="text-sm text-gray-600">
                  Freteiro 2:{" "}
                  <span id="modalInvoiceCarrier">
                    {selectedInvoice.carrier2
                      ? `${selectedInvoice.carrier2.name} - ${selectedInvoice.carrier2.value} ${getShippingTypeText(
                          selectedInvoice.carrier2.type
                        )}`
                      : "não existe"}
                  </span>
                </p>
                <p className="text-sm text-gray-600">
                  Frete Sp x ES: R$ <span id="modalInvoiceCarrier">{selectedInvoice.taxaSpEs}</span>
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
              <h4 className="font-medium mb-2 text-blue-700 border-b pb-2">Produtos Pendentes</h4>
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
                        Valor ($)
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Peso (kg)
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total ($)
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
                            {products.find((item) => item.id === product.productId)?.name}
                          </td>
                          <td className="px-4 py-2 text-sm text-right">{product.quantity}</td>
                          <td className="px-4 py-2 text-sm text-right">{product.value.toFixed(2)}</td>
                          <td className="px-4 py-2 text-sm text-right">{product.weight.toFixed(2)}</td>
                          <td className="px-4 py-2 text-sm text-right">
                            {product.total.toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </td>
                          <td className="px-4 py-2 text-sm text-right">
                            <div className="flex justify-end items-center ">
                              {/* <button disabled={isSaving} onClick={()=> sendUpdateProductStatus(product)} className="flex items-center gap-1 text-white px-2 bg-green-600 hover:bg-green-300 rounded-sm">
                                            { isSaving && isSavingId === product.id ? 
                                            (
                                            <> <Loader2 className="animate-spin mr-2" size={18} />
                                              Salvando...
                                            </>
                                            )
                                            :
                                            (
                                              <>
                                              <Check size={18} /> Receber 
                                              </>
                                          )}
                                          </button> */}
                              <button
                                onClick={() => setSelectedProductToReceive(product)}
                                className="flex items-center gap-1 text-white px-2 bg-green-600 hover:bg-green-500 rounded-sm"
                              >
                                <Check size={18} /> Receber
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
                {selectedProductToReceive && (
                  <ModalReceiveProduct
                    product={selectedProductToReceive}
                    onClose={() => setSelectedProductToReceive(null)}
                    onConfirm={async (receivedQuantity: number) => {
                      try {
                        setIsSavingId(selectedProductToReceive.id);
                        setIsSaving(true);

                        const totalReceived = selectedProductToReceive.receivedQuantity + receivedQuantity;
                        const isFullyReceived = totalReceived >= selectedProductToReceive.quantity;

                        await api.patch("/invoice/update/product", {
                          idProductInvoice: selectedProductToReceive.id,
                          bodyupdate: {
                            received: isFullyReceived,
                            receivedQuantity: totalReceived,
                          },
                        });

                        const { data: updatedInvoices } = await api.get("/invoice/get");
                        setInvoices(updatedInvoices);

                        const updated = updatedInvoices.find(
                          (i: InvoiceData) => i.id === selectedProductToReceive.invoiceId
                        );

                        if (updated) {
                          const allReceived = updated.products.every(
                            (p: any) => p.received || p.receivedQuantity >= p.quantity
                          );

                          if (allReceived && !updated.completed) {
                            await api.patch("/invoice/update", {
                              id: updated.id,
                              bodyupdate: {
                                completed: true,
                                completedDate: new Date().toISOString(),
                              },
                            });

                            const { data: refreshedInvoices } = await api.get("/invoice/get");
                            setInvoices(refreshedInvoices);
                            setSelectedInvoice(refreshedInvoices.find((i: any) => i.id === updated.id) || null);
                          } else {
                            setSelectedInvoice(updated);
                          }
                        }
                      } catch (err) {
                        console.error("Erro ao atualizar produto", err);
                      } finally {
                        setIsSaving(false);
                        setSelectedProductToReceive(null);
                      }
                    }}
                  />
                )}
              </div>
            </div>

            <div className="mb-6">
              <h4 className="font-medium mb-2 text-blue-700 border-b pb-2">Produtos Recebidos</h4>
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
                        Valor ($)
                      </th>
                      {/* <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Valor (R$)</th> */}
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Peso (kg)
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total (R$)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {selectedInvoice.products
                      .filter((item) => item.receivedQuantity > 0)
                      .map((product, index) => (
                        <tr key={index}>
                          <td className="px-4 py-2 text-sm text-gray-700">
                            {products.find((item) => item.id === product.productId)?.name}
                          </td>
                          <td className="px-4 py-2 text-sm text-right">
                            {product.receivedQuantity} / {product.quantity}
                          </td>
                          <td className="px-4 py-2 text-sm text-right">{product.value.toFixed(2)}</td>
                          <td className="px-4 py-2 text-sm text-right">{product.weight.toFixed(2)}</td>
                          <td className="px-4 py-2 text-sm text-right">
                            {product.total.toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mb-6">
              <h4 className="font-medium mb-2 text-blue-700 border-b pb-2">Produtos Pendentes de Análise</h4>
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
                        Valor ($)
                      </th>
                      {/* <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Valor (R$)</th> */}
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Peso (kg)
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total (R$)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {selectedInvoice.products
                      .filter((item) => item.receivedQuantity > 0)
                      .map((product, index) => (
                        <tr key={index}>
                          <td className="px-4 py-2 text-sm text-gray-700">
                            {products.find((item) => item.id === product.productId)?.name}
                          </td>
                          <td className="px-4 py-2 text-sm text-right">
                            {product.receivedQuantity} / {product.quantity}
                          </td>
                          <td className="px-4 py-2 text-sm text-right">{product.value.toFixed(2)}</td>
                          <td className="px-4 py-2 text-sm text-right">{product.weight.toFixed(2)}</td>
                          <td className="px-4 py-2 text-sm text-right">
                            {product.total.toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-50 p-3 rounded border">
                <p className="text-sm text-gray-600">Frete 1:</p>
                <p id="modalInvoiceSubtotal" className="text-lg font-semibold">
                  {taxInvoice?.rate ? (
                    <>
                      R${" "}
                      {(selectedInvoice.amountTaxcarrier * taxInvoice.rate).toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </>
                  ) : (
                    <>
                      ${" "}
                      {selectedInvoice.amountTaxcarrier.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </>
                  )}
                </p>
              </div>
              <div className="bg-gray-50 p-3 rounded border">
                <p className="text-sm text-gray-600">Frete :</p>
                <p id="modalInvoiceShipping" className="text-lg font-semibold">
                  {/* R${" "}
                  {selectedInvoice.amountTaxcarrier2.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })} */}

                  {taxInvoice?.rate ? (
                    <>
                      R${" "}
                      {(selectedInvoice.amountTaxcarrier2 * taxInvoice.rate).toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </>
                  ) : (
                    <>
                      ${" "}
                      {selectedInvoice.amountTaxcarrier2.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </>
                  )}
                </p>
              </div>
              <div className="bg-gray-50 p-3 rounded border">
                <p className="text-sm text-gray-600">Total com frete:</p>
                <p id="modalInvoiceTax" className="text-lg font-semibold">
                  {/* R${" "}
                  {(
                    selectedInvoice.subAmount +
                    selectedInvoice.amountTaxcarrier +
                    selectedInvoice.amountTaxcarrier2
                  ).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} */}

                  {taxInvoice?.rate ? (
                    <>
                      R${" "}
                      {(
                        (selectedInvoice.subAmount +
                          selectedInvoice.amountTaxcarrier +
                          selectedInvoice.amountTaxcarrier2) *
                        taxInvoice.rate
                      ).toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </>
                  ) : (
                    <>
                      ${" "}
                      {(
                        selectedInvoice.subAmount +
                        selectedInvoice.amountTaxcarrier +
                        selectedInvoice.amountTaxcarrier2
                      ).toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </>
                  )}
                </p>
              </div>
              <div className="bg-gray-50 p-3 rounded border">
                <p className="text-sm text-gray-600">Frete SP x ES:</p>
                <p id="modalInvoiceTax" className="text-lg font-semibold">
                  R${" "}
                  {selectedInvoice.amountTaxSpEs.toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded border">
              <div className="flex justify-between items-center">
                <p className="text-sm font-medium text-blue-800">Total da Invoice:</p>
                <p id="modalInvoiceTotal" className="text-xl font-bold text-blue-800">
                  {/* R${" "}
                  {selectedInvoice.subAmount.toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })} */}

                  {taxInvoice?.rate ? (
                    <>
                      R${" "}
                      {(
                        (selectedInvoice.subAmount +
                          selectedInvoice.amountTaxcarrier +
                          selectedInvoice.amountTaxcarrier2) *
                          taxInvoice.rate +
                        selectedInvoice.amountTaxSpEs
                      ).toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </>
                  ) : (
                    <>
                      ${" "}
                      {selectedInvoice.subAmount.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </>
                  )}
                </p>
              </div>
              <div className="flex justify-between items-center mt-1" id="modalInvoicePaymentInfo">
                <p className="text-xs text-green-600">Pago em:</p>
                <p className="text-xs font-medium text-green-600">
                  {selectedInvoice.paidDate
                    ? `${new Date(selectedInvoice.paidDate).toLocaleDateString("pt-BR")}` +
                      (taxInvoice?.rate ? ` (R$ ${taxInvoice?.rate.toFixed(4)})` : "")
                    : "data não foi incluida"}
                </p>
              </div>
            </div>

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

function formatCurrency(value: number, decimals = 2, currency = "BRL") {
  if (isNaN(value)) value = 0;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

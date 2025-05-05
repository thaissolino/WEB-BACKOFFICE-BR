import { useState, useEffect } from "react";
import { Box, Loader2, Plus, Save, Trash2, X } from "lucide-react";
import { api } from "../../../../services/api";
import { Invoice } from "../types/invoice";
import Swal from "sweetalert2";
import { ProductSearchSelect } from "./SupplierSearchSelect";

export type InvoiceProduct = {
  id: string;
  invoiceId: string;
  productId: string;
  quantity: number;
  value: number;
  price: number;
  weight: number;
  total: number;
  received: boolean;
  receivedQuantity: number;
};

type CarrierEnum = "percentage" | "perKg" | "perUnit";

export type Carrier = {
  id: string;
  name: string;
  type: CarrierEnum;
  value: number;
  active: true;
};

interface InvoiceProductsProps {
  currentInvoice: Invoice;
  setCurrentInvoice: (invoice: any) => void;
  [key: string]: any;
}

export function InvoiceProducts({ currentInvoice, setCurrentInvoice, ...props }: InvoiceProductsProps) {
  const [showProductForm, setShowProductForm] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [productForm, setProductForm] = useState({
    productId: "",
    quantity: "",
    value: "",
    weight: "",
    total: "",
    price: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [productsResponse, carriersResponse] = await Promise.all([
          api.get("/invoice/product"),
          api.get("/invoice/carriers"),
        ]);
        console.log(productsResponse.data);
        setProducts(productsResponse.data);
        setCarriers(carriersResponse.data);
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
        // Swal.fire({
        //   icon: 'error',
        //   title: 'Erro',
        //   text: 'Erro ao carregar dados',
        //   confirmButtonColor: '#3085d6',
        // });
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const deleteProduct = (index: number) => {
    const newProducts = [...currentInvoice.products];
    newProducts.splice(index, 1);
    setCurrentInvoice({ ...currentInvoice, products: newProducts });
  };

  const subTotal = currentInvoice.products.reduce((acc, item) => acc + Number(item.total), 0);
  const taxSpEs = currentInvoice.products.reduce((acc: number, item) => {
    return acc + item.quantity * Number(currentInvoice.taxaSpEs);
  }, 0);

  const shippingStrategies: Record<string, (carrierSelectedType: Carrier, item: InvoiceProduct) => number> = {
    percentage: (carrierSelectedType, item) => item.value * (carrierSelectedType.value / 100) * item.quantity,
    perKg: (carrierSelectedType, item) => item.weight * carrierSelectedType.value,
    perUnit: (carrierSelectedType, item) => item.quantity * carrierSelectedType.value,
  };

  const carrierSelectedType = carriers.find((carrier) => carrier.id === currentInvoice.carrierId);
  const carrierSelectedType2 = carriers.find((carrier) => carrier.id === currentInvoice?.carrier2Id);
  const amountTaxCarrieFrete1 = currentInvoice.products.reduce((acc: number, item) => {
    if (!carrierSelectedType) return acc;
    return acc + shippingStrategies[carrierSelectedType.type](carrierSelectedType, item);
  }, 0);

  const amountTaxCarrieFrete2 = currentInvoice.products.reduce((acc: number, item) => {
    if (!carrierSelectedType2) return acc;
    return acc + shippingStrategies[carrierSelectedType2.type](carrierSelectedType2, item);
  }, 0);

  const weightData =
    productForm.weight || products.find((item) => item.id === productForm.productId)?.weightAverage || "";
  const priceData =
    productForm.value || products.find((item) => item.id === productForm.productId)?.priceweightAverage || "";

  const totalWithFreight = amountTaxCarrieFrete1 + amountTaxCarrieFrete2 + subTotal;

  console.log(amountTaxCarrieFrete1);
  console.log(amountTaxCarrieFrete2);
  console.log(subTotal);
  console.log(totalWithFreight);
  const calculateProductTotal = () => {
    const quantity = parseFloat(productForm.quantity) || 0;
    const value = parseFloat(priceData) || 0;
    const total = quantity * value;
    setProductForm({ ...productForm, total: total.toFixed(2) });
  };

  useEffect(() => {
    setCurrentInvoice((prevInvoice: Invoice) => ({
      ...prevInvoice,
      amountTaxSpEs: taxSpEs,
      amountTaxcarrier: amountTaxCarrieFrete1,
      amountTaxcarrier2: amountTaxCarrieFrete2,
      subAmount: subTotal,
    }));
  }, [taxSpEs, amountTaxCarrieFrete1, amountTaxCarrieFrete2, subTotal]);

  const addProduct = () => {
    const product = products.find((p) => p.id === productForm.productId);
    if (!product) return;

    const quantity = parseFloat(productForm.quantity);
    const value = parseFloat(priceData);
    const weight = parseFloat(weightData) || product.weight || 0;
    const total = parseFloat(productForm.total);

    if (!productForm.productId || isNaN(quantity) || isNaN(value) || isNaN(total)) {
      Swal.fire({
        icon: "warning",
        title: "Atenção",
        text: "Preencha todos os campos obrigatórios do produto!",
        confirmButtonColor: "#3085d6",
      });
      return;
    }

    const invoiceProduct = {
      id: productForm.productId,
      name: product.name,
      quantity,
      value,
      weight,
      total,
      received: false,
      receivedQuantity: 0,
    };

    setCurrentInvoice({
      ...currentInvoice,
      products: [...currentInvoice.products, invoiceProduct],
    });

    setProductForm({
      productId: "",
      price: "",
      quantity: "",
      value: "",
      weight: "",
      total: "",
    });

    setShowProductForm(false);
  };

  const saveInvoice = async () => {
    if (currentInvoice.products.length === 0) {
      Swal.fire({
        icon: "warning",
        title: "Atenção",
        text: "Adicione pelo menos um produto à invoice!",
        confirmButtonText: "Ok",
        buttonsStyling: false,
        customClass: {
          confirmButton: "bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded font-semibold",
        },
      });
      return;
    }

    if (!currentInvoice.number) {
      Swal.fire({
        icon: "warning",
        title: "Atenção",
        text: "Informe o número da invoice!",
        confirmButtonText: "Ok",
        buttonsStyling: false,
        customClass: {
          confirmButton: "bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded font-semibold",
        },
      });
      return;
    }

    if (!currentInvoice.date) {
      Swal.fire({
        icon: "warning",
        title: "Atenção",
        text: "Informe a data da invoice!",
        confirmButtonText: "Ok",
        buttonsStyling: false,
        customClass: {
          confirmButton: "bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded font-semibold",
        },
      });
      return;
    }

    if (!currentInvoice.supplierId) {
      Swal.fire({
        icon: "warning",
        title: "Atenção",
        text: "Selecione um fornecedor!",
        confirmButtonText: "Ok",
        buttonsStyling: false,
        customClass: {
          confirmButton: "bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded font-semibold",
        },
      });
      return;
    }

    setIsSaving(true);
    try {
      const response = await api.post("/invoice/create", currentInvoice);
      Swal.fire({
        icon: "success",
        title: "Sucesso!",
        text: "Invoice salva com sucesso!",
        confirmButtonText: "Ok",
        buttonsStyling: false,
        customClass: {
          confirmButton: "bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded font-semibold",
        },
      });

      setCurrentInvoice({
        id: null,
        number: "",
        date: new Date().toISOString().split("T")[0],
        supplierId: "",
        products: [],
        carrierId: "",
        carrier2Id: "",
        taxaSpEs: 0.0,
        paid: false,
        paidDate: null,
        paidDollarRate: null,
        completed: false,
        completedDate: null,
        amountTaxcarrier: 0,
        amountTaxcarrier2: 0,
        amountTaxSpEs: 0,
        overallValue: 0,
        subAmount: 0,
      });

      // setCurrentInvoice({
      //   id: null,
      //   number: '',
      //   date: new Date().toISOString().split('T')[0],
      //   supplierId: '',
      //   products: [],
      //   carrierId: '',
      //   carrier2Id: '',
      //   taxaSpEs: 0.0,
      //   paid: false,
      //   paidDate: null,
      //   paidDollarRate: null,
      //   completed: false,
      //   completedDate: null,
      //   amountTaxcarrier: 0,
      //   amountTaxcarrier2: 0,
      //   amountTaxSpEs: 0,
      //   overallValue: 0,
      //   subAmount: 0
      // });
    } catch (error) {
      console.error("Erro ao salvar a invoice:", error);
      Swal.fire({
        icon: "error",
        title: "Erro",
        text: "Erro ao salvar a invoice",
        confirmButtonText: "Ok",
        buttonsStyling: false,
        customClass: {
          confirmButton: "bg-red-600 text-white hover:bg-red-700 px-4 py-2 rounded font-semibold",
        },
      });
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    calculateProductTotal();
  }, [productForm.quantity, priceData, weightData, productForm.productId]);

  if (isLoading) {
    return (
      <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-md flex justify-center items-center h-64">
        <Loader2 className="animate-spin text-blue-500 mr-2" size={24} />
        <span>Carregando produtos...</span>
      </div>
    );
  }

  const totalQuantidade = currentInvoice.products.reduce((sum, product) => sum + product.quantity, 0);

  return (
    <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-blue-700">
          <Box className="mr-2 inline" size={18} />
          Produtos
        </h2>
        {!showProductForm && (
          <button
            onClick={() => setShowProductForm(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm flex items-center"
            disabled={isSaving}
          >
            <Plus className="mr-1 inline" size={16} />
            Adicionar Produto
          </button>
        )}
      </div>

      {showProductForm && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
          <h3 className="font-medium mb-3 text-blue-700 border-b pb-2">Adicionar Produto</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="relative">
              {/* <label className="block text-sm font-medium text-gray-700 mb-1">Produto</label> */}
              <ProductSearchSelect
                products={products}
                value={productForm.productId}
                onChange={(e: any) => setProductForm({ ...productForm, productId: e })}
              ></ProductSearchSelect>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantidade</label>
              <input
                type="number"
                value={productForm.quantity}
                onChange={(e) => {
                  console.log(e.target.value);
                  setProductForm({ ...productForm, quantity: e.target.value });
                }}
                className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500 appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                placeholder="Qtd"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valor Unitário ($)</label>
              <input
                type="number"
                step="0.01"
                value={priceData}
                onChange={(e) => {
                  setProductForm({ ...productForm, value: e.target.value });
                }}
                className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500 appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                placeholder="$"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Peso (kg)</label>
              <input
                type="number"
                step="0.01"
                value={weightData}
                onChange={(e) => {
                  setProductForm({ ...productForm, weight: e.target.value });
                }}
                className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500 appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                placeholder="kg"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total ($)</label>
              <input
                type="number"
                step="0.01"
                value={productForm.total}
                readOnly
                className="w-full border border-gray-300 rounded-md p-2 bg-gray-100 focus:ring-blue-500 focus:border-blue-500"
                placeholder="$"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={() => setShowProductForm(false)}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-4 rounded mr-2"
              >
                <X className="mr-1 inline" size={16} />
                Cancelar
              </button>
              <button
                onClick={addProduct}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded"
              >
                <Plus className="mr-1 inline" size={16} />
                Adicionar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">
            Invoice: <span className="font-bold">{currentInvoice.number || "-"}</span>
          </span>
          <span className="text-sm text-gray-500">
            Criada em: <span>{new Date().toLocaleDateString("pt-BR")}</span>
          </span>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Produto
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Qtd</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Valor ($)
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Peso (kg)
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total ($)
                </th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {currentInvoice.products.map((product, index) => (
                <tr key={index}>
                  <td className="px-4 py-2 text-sm text-gray-800">
                    {products.find((item) => item.id === product.id)?.name}
                  </td>
                  <td className="px-4 py-2 text-sm text-right">{product.quantity}</td>
                  <td className="px-4 py-2 text-sm text-right">
                    {product.value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-2 text-sm text-right">{product.weight.toFixed(2)}</td>
                  <td className="px-4 py-2 text-sm text-right">
                    {product.total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-2 text-center">
                    <button onClick={() => deleteProduct(index)} className="text-red-600 hover:text-red-800">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="bg-gray-50 p-4 rounded-lg border">
            <h3 className="font-medium mb-3 text-blue-700 border-b pb-2">Resumo da Invoice</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              {/* <div className="bg-white p-3 rounded border">
                <p className="text-sm text-gray-600">Subtotal:</p>
                <p id="subtotal" className="text-lg font-semibold">$ {subTotal.toLocaleString('en-US', {  currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits:2 }) || "0.00"}</p>
              </div> */}
              <div className="bg-white p-3 rounded border">
                <p className="text-sm text-gray-600">Frete 1:</p>
                <p id="shippingCost" className="text-lg font-semibold">
                  ${" "}
                  {amountTaxCarrieFrete1.toLocaleString("en-US", {
                    currency: "USD",
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }) || "0.00"}
                </p>
              </div>
              <div className="bg-white p-3 rounded border">
                <p className="text-sm text-gray-600">Frete 2:</p>
                <p id="shippingCost" className="text-lg font-semibold">
                  ${" "}
                  {amountTaxCarrieFrete2.toLocaleString("en-US", {
                    currency: "USD",
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }) || "0.00"}
                </p>
              </div>

              <div className="bg-white p-3 rounded border">
                <p className="text-sm text-gray-600">Frete SP x ES:</p>
                <p id="taxCost" className="text-lg font-semibold">
                  R${" "}
                  {taxSpEs.toLocaleString("pt-BR", {
                    currency: "BRL",
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }) || "0.00"}
                </p>
              </div>

              <div className="bg-white p-3 rounded border">
                <p className="text-sm text-gray-600">Total de Itens:</p>
                <p id="taxCost" className="text-lg font-semibold flex justify-start ml-10">
                  {totalQuantidade}
                </p>
              </div>
            </div>
            <div className="bg-blue-50 p-3 rounded border  mb-5">
              <div className="flex justify-between items-center">
                <p className="text-sm font-medium text-blue-800">Total da Invoice:</p>
                <p id="invoiceTotal" className="text-xl font-bold text-blue-800">
                  ${" "}
                  {subTotal.toLocaleString("en-US", {
                    currency: "USD",
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }) || "0.00"}
                </p>
              </div>
            </div>
            <div className="bg-green-50 p-3 rounded border">
              <div className="flex justify-between items-center">
                <p className="text-sm font-medium text-green-800">Total com frete:</p>
                <p id="invoiceTotal" className="text-xl font-bold text-green-800">
                  ${" "}
                  {totalWithFreight.toLocaleString("pt-BR", {
                    currency: "BRL",
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }) || "0.00"}
                </p>
              </div>
            </div>
          </div>
        </div>
        <button
          onClick={saveInvoice}
          className="w-full bg-blue-600 mt-4 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md flex items-center justify-center"
          disabled={isSaving}
        >
          {isSaving ? (
            <>
              <Loader2 className="animate-spin mr-2" size={18} />
              Salvando...
            </>
          ) : (
            <>
              <Save className="mr-2" size={18} />
              Salvar Invoice
            </>
          )}
        </button>
      </div>
    </div>
  );
}

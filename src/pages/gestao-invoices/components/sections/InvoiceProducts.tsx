import { useState, useEffect } from 'react';
import { Box, Plus, Trash2, X } from 'lucide-react';
import { api } from '../../../../services/api';

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
}

interface InvoiceProductsProps {
  currentInvoice: {
    id: string | null;
    number: string;
    products: InvoiceProduct[];
  };
  setCurrentInvoice: (invoice: any) => void;
}

export function InvoiceProducts({ currentInvoice, setCurrentInvoice }: InvoiceProductsProps) {
  const [showProductForm, setShowProductForm] = useState(false);
  const [products, setProducts] = useState<any[]>([]); // Array de produtos da API
  const [productForm, setProductForm] = useState({
    productId: '',
    quantity: '',
    value: '',
    weight: '',
    total: '',
    price:''
  });

  useEffect(() => {
    // Carregar os produtos da API ao montar o componente
    api.get('/invoice/product')
      .then(response => {
        setProducts(response.data); // Supondo que a resposta seja uma lista de produtos
      })
      .catch(error => {
        console.error('Erro ao carregar produtos:', error);
      });
  }, []);

  const calculateProductTotal = () => {
    const quantity = parseFloat(productForm.quantity) || 0;
    const value = parseFloat(productForm.value) || 0;
    const total = quantity * value;
    setProductForm({ ...productForm, total: total.toFixed(2) });
  };

  const addProduct = () => {
    const product = products.find((p) => p.id === productForm.productId);
    if (!product) return;

    const quantity = parseFloat(productForm.quantity);
    const value = parseFloat(productForm.value);
    const weight = parseFloat(productForm.weight) || product.weight || 0;
    const total = parseFloat(productForm.total);

    if (!productForm.productId || isNaN(quantity) || isNaN(value) || isNaN(total)) {
      alert('Preencha todos os campos obrigatórios do produto!');
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
      productId: '',
      price:'',
      quantity: '',
      value: '',
      weight: '',
      total: '',
    });

    setShowProductForm(false);
  };

  const deleteProduct = (index: number) => {
    const newProducts = [...currentInvoice.products];
    newProducts.splice(index, 1);
    setCurrentInvoice({ ...currentInvoice, products: newProducts });
  };
  useEffect(() => {
    calculateProductTotal();
  }, [productForm.quantity, productForm.value, productForm.weight]);



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
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Produto</label>
              <select
                value={productForm.productId}
                onChange={(e) => setProductForm({ ...productForm, productId: e.target.value })}
                className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Selecione um produto</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantidade</label>
              <input
                type="number"
                value={productForm.quantity}
                onChange={(e) => {
                  console.log(e.target.value)
                  setProductForm({ ...productForm, quantity: e.target.value });
                  // calculateProductTotal();
                }}
                className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Qtd"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valor Unitário ($)</label>
              <input
                type="number"
                step="0.01"
                value={productForm.value}
                onChange={(e) => {
                  setProductForm({ ...productForm, value: e.target.value });
                  // calculateProductTotal();
                }}
                className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="$"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Peso (kg)</label>
              <input
                type="number"
                step="0.01"
                value={productForm.weight}
                onChange={(e) => {
                  setProductForm({ ...productForm, weight: e.target.value });
                  // calculateProductTotal();
                }}
                className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
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
            Invoice: <span className="font-bold">{currentInvoice.number || '-'}</span>
          </span>
          <span className="text-sm text-gray-500">
            Criada em: <span>{new Date().toLocaleDateString('pt-BR')}</span>
          </span>
        </div>

        <div className="border rounded-lg overflow-hidden">
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
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {currentInvoice.products.map((product, index) => (
                <tr key={product.id}>
                  <td className="px-4 py-2 text-sm text-gray-800">{products.find((item)=> item.productId === product.productId).name}</td>
                  <td className="px-4 py-2 text-sm text-right">{product.quantity}</td>
                  <td className="px-4 py-2 text-sm text-right">{product.value.toFixed(2)}</td>
                  <td className="px-4 py-2 text-sm text-right">{product.weight.toFixed(2)}</td>
                  <td className="px-4 py-2 text-sm text-right">{product.total.toFixed(2)}</td>
                  <td className="px-4 py-2 text-center">
                    <button
                      onClick={() => deleteProduct(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

                        <div className="bg-gray-50 p-4 rounded-lg border">
                            <h3 className="font-medium mb-3 text-blue-700 border-b pb-2">Resumo da Invoice</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                <div className="bg-white p-3 rounded border">
                                    <p className="text-sm text-gray-600">Subtotal:</p>
                                    <p id="subtotal" className="text-lg font-semibold">$ 0.00</p>
                                </div>
                                <div className="bg-white p-3 rounded border">
                                    <p className="text-sm text-gray-600">Frete:</p>
                                    <p id="shippingCost" className="text-lg font-semibold">$ 0.00</p>
                                </div>
                                <div className="bg-white p-3 rounded border">
                                    <p className="text-sm text-gray-600">Frete SP x ES:</p>
                                    <p id="taxCost" className="text-lg font-semibold">R$ 0,00</p>
                                </div>
                            </div>
                            <div className="bg-blue-50 p-3 rounded border">
                                <div className="flex justify-between items-center">
                                    <p className="text-sm font-medium text-blue-800">Total da Invoice:</p>
                                    <p id="invoiceTotal" className="text-xl font-bold text-blue-800">$ 0.00</p>
                                </div>
                            </div>
                        </div>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Box, Plus, FileText , Save, Trash2, X } from 'lucide-react';

interface InvoiceProduct {
  id: string;
  name: string;
  quantity: number;
  value: number;
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
  const [products] = useState([
    { id: '1', name: 'Produto 1', code: 'P001', price: 10.5, weight: 0.5, description: 'Descrição do Produto 1' },
    { id: '2', name: 'Produto 2', code: 'P002', price: 25.75, weight: 1.2, description: 'Descrição do Produto 2' },
    { id: '3', name: 'Produto 3', code: 'P003', price: 15.0, weight: 0.8, description: 'Descrição do Produto 3' },
  ]);
  const [productForm, setProductForm] = useState({
    productId: '',
    productName: '',
    quantity: '',
    value: '',
    weight: '',
    total: '',
  });

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
      productName: '',
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

  const updateInvoiceTotals = () => {
    // Implement calculation logic here
  };

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
              <input
                type="text"
                value={productForm.productName}
                onChange={(e) => {
                  const searchTerm = e.target.value.toLowerCase();
                  setProductForm({ ...productForm, productName: e.target.value });
                }}
                className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Pesquisar produto..."
              />
              {/* Product options dropdown would go here */}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantidade</label>
              <input
                type="number"
                value={productForm.quantity}
                onChange={(e) => {
                  setProductForm({ ...productForm, quantity: e.target.value });
                  calculateProductTotal();
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
                  calculateProductTotal();
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
                  calculateProductTotal();
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
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentInvoice.products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-4 text-center text-gray-500">
                    Nenhum produto adicionado ainda
                  </td>
                </tr>
              ) : (
                currentInvoice.products.map((product, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{product.name}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 text-right">
                      {product.quantity}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 text-right">
                      {formatCurrency(product.value)}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 text-right">
                      {product.weight ? product.weight.toFixed(2) + ' kg' : '-'}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 text-right">
                      {formatCurrency(product.total)}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => deleteProduct(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50">
                <td colSpan={3} className="px-4 py-2 text-right text-sm font-medium text-gray-700">
                  Peso Total:
                </td>
                <td className="px-4 py-2 text-right text-sm font-medium text-gray-700">
                  {currentInvoice.products
                    .reduce((sum, product) => sum + (product.weight || 0), 0)
                    .toFixed(2)}{' '}
                  kg
                </td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="bg-gray-50 p-4 rounded-lg border">
        <h3 className="font-medium mb-3 text-blue-700 border-b pb-2">Resumo da Invoice</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="bg-white p-3 rounded border">
            <p className="text-sm text-gray-600">Subtotal:</p>
            <p className="text-lg font-semibold">
              {formatCurrency(
                currentInvoice.products.reduce((sum, product) => sum + product.total, 0)
              )}
            </p>
          </div>
          <div className="bg-white p-3 rounded border">
            <p className="text-sm text-gray-600">Frete:</p>
            <p className="text-lg font-semibold">$ 0.00</p>
          </div>
          <div className="bg-white p-3 rounded border">
            <p className="text-sm text-gray-600">Frete SP x ES:</p>
            <p className="text-lg font-semibold">R$ 0,00</p>
          </div>
        </div>
        <div className="bg-blue-50 p-3 rounded border">
          <div className="flex justify-between items-center">
            <p className="text-sm font-medium text-blue-800">Total da Invoice:</p>
            <p className="text-xl font-bold text-blue-800">$ 0.00</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatCurrency(value: number, decimals = 2, currency = 'USD') {
  if (isNaN(value)) value = 0;
  if (currency === 'USD') {
    return `$ ${value.toFixed(decimals)}`;
  } else {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  }
}
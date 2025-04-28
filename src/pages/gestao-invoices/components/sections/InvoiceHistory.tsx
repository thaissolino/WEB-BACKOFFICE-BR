import { History, FileText, Eye, Edit } from 'lucide-react';
import { useState } from 'react';

interface Invoice {
  id: string;
  number: string;
  date: string;
  supplierId: string;
  products: any[];
  carrierId: string;
  paid: boolean;
  paidDate: string | null;
  completed: boolean;
}

export function InvoiceHistory() {
  const [invoices, setInvoices] = useState<Invoice[]>([
    {
      id: '1',
      number: 'INV-20230001',
      date: '2023-05-15',
      supplierId: '1',
      products: [],
      carrierId: '1',
      paid: true,
      paidDate: '2023-05-20',
      completed: false,
    },
    {
      id: '2',
      number: 'INV-20230002',
      date: '2023-06-10',
      supplierId: '2',
      products: [],
      carrierId: '2',
      paid: false,
      paidDate: null,
      completed: false,
    },
  ]);

  const [suppliers] = useState([
    { id: '1', name: 'Fornecedor A' },
    { id: '2', name: 'Fornecedor B' },
  ]);

  const getStatusText = (invoice: Invoice) => {
    if (invoice.completed) return 'Concluída';
    if (invoice.paid) return 'Paga';
    return 'Pendente';
  };

  const getStatusClass = (invoice: Invoice) => {
    if (invoice.completed) return 'bg-blue-100 text-blue-800';
    if (invoice.paid) return 'bg-green-100 text-green-800';
    return 'bg-yellow-100 text-yellow-800';
  };

  const viewInvoice = (id: string) => {
    // Implementar lógica para visualizar invoice
    console.log('View invoice:', id);
  };

  const editInvoice = (id: string) => {
    // Implementar lógica para editar invoice
    console.log('Edit invoice:', id);
  };

  return (
    <div className="mt-8 bg-white p-6 rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4 text-blue-700 border-b pb-2">
        {/* <FileText className="mr-2 inline" size={18} /> */}
        <History className="mr-2 inline" size={18} /> Histórico de Invoices
      </h2>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Número
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fornecedor
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Data
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Valor ($)
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
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
              invoices.map((invoice: Invoice) => {
                const supplier = suppliers.find((s: { id: string; }) => s.id === invoice.supplierId);
                const subtotal = invoice.products.reduce((sum, product) => sum + product.total, 0);
                // Calcular frete aqui se necessário
                const total = subtotal;

                return (
                  <tr key={invoice.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {invoice.number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {supplier?.name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(invoice.date).toLocaleDateString('pt-BR')}
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
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => viewInvoice(invoice.id)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => editInvoice(invoice.id)}
                        className="text-green-600 hover:text-green-900"
                      >
                        <Edit size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
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
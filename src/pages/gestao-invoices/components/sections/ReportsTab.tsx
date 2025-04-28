import { useState } from 'react';
import { ChartBar, Eye } from 'lucide-react';
import { formatCurrency } from '../../../cambiobackoffice/formatCurrencyUtil';

interface Invoice {
  id: string;
  number: string;
  date: string;
  supplierId: string;
  paid: boolean;
  completed: boolean;
  products: any[];
}

export function ReportsTab() {
  const [invoices, setInvoices] = useState<Invoice[]>([
    {
      id: '1',
      number: 'INV-20230001',
      date: '2023-05-15',
      supplierId: '1',
      paid: true,
      completed: false,
      products: [],
    },
    {
      id: '2',
      number: 'INV-20230002',
      date: '2023-06-10',
      supplierId: '2',
      paid: false,
      completed: false,
      products: [],
    },
    {
      id: '3',
      number: 'INV-20230003',
      date: '2023-07-20',
      supplierId: '1',
      paid: true,
      completed: true,
      products: [],
    },
  ]);

  const [suppliers] = useState([
    { id: '1', name: 'Fornecedor A' },
    { id: '2', name: 'Fornecedor B' },
  ]);

  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    status: 'all',
    supplier: 'all',
  });

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

  const filteredInvoices = invoices.filter((invoice) => {
    // Filtrar por data
    if (filters.startDate && new Date(invoice.date) < new Date(filters.startDate)) {
      return false;
    }
    if (filters.endDate && new Date(invoice.date) > new Date(filters.endDate)) {
      return false;
    }

    // Filtrar por status
    if (filters.status !== 'all') {
      if (filters.status === 'pending' && (invoice.paid || invoice.completed)) {
        return false;
      }
      if (filters.status === 'paid' && (!invoice.paid || invoice.completed)) {
        return false;
      }
      if (filters.status === 'completed' && !invoice.completed) {
        return false;
      }
    }

    // Filtrar por fornecedor
    if (filters.supplier !== 'all' && invoice.supplierId !== filters.supplier) {
      return false;
    }

    return true;
  });

  const pendingCount = invoices.filter((inv) => !inv.paid && !inv.completed).length;
  const paidCount = invoices.filter((inv) => inv.paid && !inv.completed).length;
  const completedCount = invoices.filter((inv) => inv.completed).length;

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-6 text-blue-700 border-b pb-2">
        <ChartBar className="mr-2 inline" size={18} />
        Relatórios
      </h2>

      {/* Filtros */}
      <div className="bg-gray-50 p-6 rounded-lg border mb-8">
        <h3 className="text-lg font-medium mb-4 text-blue-700 border-b pb-2">Filtrar Relatório</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data Inicial</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data Final</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Todos</option>
              <option value="pending">Pendentes</option>
              <option value="paid">Pagas</option>
              <option value="completed">Concluídas</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fornecedor</label>
            <select
              value={filters.supplier}
              onChange={(e) => setFilters({ ...filters, supplier: e.target.value })}
              className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Todos</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={() => setFilters({ ...filters })}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded"
          >
            Gerar Relatório
          </button>
        </div>
      </div>

      {/* Dashboard de Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg border text-center">
          <h3 className="text-lg font-medium mb-2 text-blue-700">Pendentes</h3>
          <p className="text-3xl font-bold text-yellow-600">{pendingCount}</p>
          <p className="text-sm text-gray-600">Invoices aguardando pagamento</p>
        </div>
        <div className="bg-white p-6 rounded-lg border text-center">
          <h3 className="text-lg font-medium mb-2 text-blue-700">Pagas</h3>
          <p className="text-3xl font-bold text-green-600">{paidCount}</p>
          <p className="text-sm text-gray-600">Invoices pagas</p>
        </div>
        <div className="bg-white p-6 rounded-lg border text-center">
          <h3 className="text-lg font-medium mb-2 text-blue-700">Concluídas</h3>
          <p className="text-3xl font-bold text-blue-600">{completedCount}</p>
          <p className="text-sm text-gray-600">Invoices finalizadas</p>
        </div>
      </div>

      {/* Tabela de Relatórios */}
      <div>
        <h3 className="text-lg font-medium mb-4 text-blue-700 border-b pb-2">Histórico de Invoices</h3>
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
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    Nenhuma invoice encontrada com os filtros aplicados
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((invoice) => {
                  const supplier = suppliers.find((s) => s.id === invoice.supplierId);
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
                        <button className="text-blue-600 hover:text-blue-900">
                          <Eye size={16} />
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
    </div>
  );
}
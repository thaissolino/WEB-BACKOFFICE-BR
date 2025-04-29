import { History, Eye, Edit } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../../../../services/api';
import { Invoice } from '../types/invoice'; // Se necessário, ajuste o caminho do tipo

export function InvoiceHistory() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    const fetchInvoicesAndSuppliers = async () => {
      try {
        const [invoiceResponse, supplierResponse] = await Promise.all([
          api.get('/invoice/get'),
          api.get('/invoice/supplier'),
        ]);

        setInvoices(invoiceResponse.data);
        setSuppliers(supplierResponse.data);
      } catch (error) {
        console.error('Erro ao buscar dados:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInvoicesAndSuppliers();
  }, []);

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

  const openModal = (invoice: Invoice, editMode: boolean) => {
    setSelectedInvoice(invoice);
    setIsEditMode(editMode);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedInvoice(null);
  };

  return (
    <div className="mt-8 bg-white p-6 rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4 text-blue-700 border-b pb-2">
        <History className="mr-2 inline" size={18} />
        Histórico de Invoices
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Valor (R$)
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
                invoices.map((invoice) => {
                  const supplier = suppliers.find((s) => s.id === invoice.supplierId);
                  const subtotal = invoice.products?.reduce((sum, product) => sum + product.total, 0) || 0;
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
                          onClick={() => openModal(invoice, false)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => openModal(invoice, true)}
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
        )}
      </div>

      {/* Modal */}
      {isModalOpen && selectedInvoice && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-96">
            <h3 className="text-xl font-semibold mb-4">{isEditMode ? 'Editar Invoice' : 'Visualizar Invoice'}</h3>
            <div className="space-y-4">
              <p><strong>Número:</strong> {selectedInvoice.number}</p>
              <p><strong>Fornecedor:</strong> {suppliers.find(s => s.id === selectedInvoice.supplierId)?.name || '-'}</p>
              <p><strong>Data:</strong> {new Date(selectedInvoice.date).toLocaleDateString('pt-BR')}</p>
              <p><strong>Status:</strong> {getStatusText(selectedInvoice)}</p>
              <p><strong>Total:</strong> {formatCurrency(selectedInvoice.products?.reduce((sum, product) => sum + product.total, 0) || 0)}</p>

              {isEditMode && (
                <div className="space-y-2">
                  <label>
                    <span>Alterar valor:</span>
                    <input type="number" className="border border-gray-300 rounded p-2 w-full" />
                  </label>
                </div>
              )}
            </div>
            <div className="mt-4 flex justify-end space-x-2">
              <button onClick={closeModal} className="text-gray-500 hover:text-gray-700">
                Fechar
              </button>
              {isEditMode && (
                <button onClick={() => console.log('Salvar alterações')} className="bg-blue-600 text-white p-2 rounded">
                  Salvar
                </button>
              )}
            </div>
          </div>
        </div>
      )}

{isModalOpen && selectedInvoice && (
            // <!-- Modal Visualizar Invoice -->
            <div id="modalViewInvoice" className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
                <div className="bg-white p-6 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="text-lg font-medium">Invoice teste #<span id="modalInvoiceNumber"></span></h3>
                            <p className="text-sm text-gray-600">Fornecedor: <span id="modalInvoiceSupplier"></span></p>
                            <p className="text-sm text-gray-600">Data: <span id="modalInvoiceDate"></span></p>
                            <p className="text-sm text-gray-600">Freteiro: <span id="modalInvoiceCarrier"></span></p>
                        </div>
                        <div>
                            <span id="modalInvoiceStatus" className="px-3 py-1 rounded-full text-xs font-medium"></span>
                            <button id="closeModalInvoice" className="ml-2 text-gray-500 hover:text-gray-700">
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                    </div>
                    
                    <div className="mb-6">
                        <h4 className="font-medium mb-2 text-blue-700 border-b pb-2">Produtos Pendentes</h4>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Produto</th>
                                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Qtd</th>
                                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Valor ($)</th>
                                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Peso (kg)</th>
                                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total ($)</th>
                                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                                    </tr>
                                </thead>
                                <tbody id="modalInvoicePendingProducts" className="bg-white divide-y divide-gray-200">
                                </tbody>
                            </table>
                        </div>
                    </div>
                    
                    <div className="mb-6">
                        <h4 className="font-medium mb-2 text-blue-700 border-b pb-2">Produtos Recebidos</h4>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Produto</th>
                                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Qtd</th>
                                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Valor ($)</th>
                                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Valor (R$)</th>
                                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Peso (kg)</th>
                                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total (R$)</th>
                                    </tr>
                                </thead>
                                <tbody id="modalInvoiceReceivedProducts" className="bg-white divide-y divide-gray-200">
                                </tbody>
                            </table>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="bg-gray-50 p-3 rounded border">
                            <p className="text-sm text-gray-600">Subtotal:</p>
                            <p id="modalInvoiceSubtotal" className="text-lg font-semibold">$ 0.00</p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded border">
                            <p className="text-sm text-gray-600">Frete:</p>
                            <p id="modalInvoiceShipping" className="text-lg font-semibold">$ 0.00</p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded border">
                            <p className="text-sm text-gray-600">Frete SP x ES:</p>
                            <p id="modalInvoiceTax" className="text-lg font-semibold">R$ 0,00</p>
                        </div>
                    </div>
                    
                    <div className="bg-blue-50 p-4 rounded border">
                        <div className="flex justify-between items-center">
                            <p className="text-sm font-medium text-blue-800">Total da Invoice:</p>
                            <p id="modalInvoiceTotal" className="text-xl font-bold text-blue-800">$ 0.00</p>
                        </div>
                        <div className="flex justify-between items-center mt-1" id="modalInvoicePaymentInfo">
                            <p className="text-xs text-green-600">Pago em:</p>
                            <p className="text-xs font-medium text-green-600"><span id="modalInvoicePaidDate"></span> (R$ <span id="modalInvoiceDollarRate"></span>)</p>
                        </div>
                    </div>
                    
                    <div className="mt-6 flex justify-end">
                        <button id="printInvoiceBtn" className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md mr-2">
                            <i className="fas fa-print mr-2"></i>Imprimir
                        </button>
                        <button id="exportInvoiceBtn" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md">
                            <i className="fas fa-file-export mr-2"></i>Exportar
                        </button>
                        <button id="completeInvoiceBtn" className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md ml-2">
                            <i className="fas fa-check mr-2"></i>Marcar como Concluída
                        </button>
                    </div>
                </div>
            </div>
  )
}
    </div>
  );
}

function formatCurrency(value: number, decimals = 2, currency = 'BRL') {
  if (isNaN(value)) value = 0;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

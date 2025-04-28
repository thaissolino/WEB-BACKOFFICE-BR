import { FilePlus, Save } from 'lucide-react';
import { useState } from 'react';

interface Invoice {
  id: string | null;
  number: string;
  date: string;
  supplierId: string;
  products: any[];
  carrierId: string;
  taxValue: number;
  paid: boolean;
  paidDate: string | null;
  paidDollarRate: number | null;
  completed: boolean;
  completedDate: string | null;
}

interface NewInvoiceFormProps {
  currentInvoice: Invoice;
  setCurrentInvoice: (invoice: Invoice) => void;
}

export function NewInvoiceForm({ currentInvoice, setCurrentInvoice }: NewInvoiceFormProps) {
  const [suppliers] = useState([
    { id: '1', name: 'Fornecedor A', phone: '(11) 99999-9999' },
    { id: '2', name: 'Fornecedor B', phone: '(21) 88888-8888' },
  ]);

  const [carriers] = useState([
    { id: '1', name: 'Freteiro X', type: 'percentage', value: 5 },
    { id: '2', name: 'Freteiro Y', type: 'perKg', value: 0.5 },
    { id: '3', name: 'Freteiro Z', type: 'perUnit', value: 2.0 },
  ]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setCurrentInvoice({ ...currentInvoice, [name]: value });
  };

  const saveInvoice = () => {
    // Validar invoice
    if (currentInvoice.products.length === 0) {
      alert('Adicione pelo menos um produto à invoice!');
      return;
    }
  
    const invoiceNumber = currentInvoice.number;
    if (!invoiceNumber) {
      alert('Informe o número da invoice!');
      return;
    }
  
    const invoiceDate = currentInvoice.date;
    if (!invoiceDate) {
      alert('Informe a data da invoice!');
      return;
    }
  
    const supplierId = currentInvoice.supplierId;
    if (!supplierId) {
      alert('Selecione um fornecedor!');
      return;
    }
  
    // Aqui você faria a chamada à API ou atualizaria o estado global
    console.log('Invoice salva:', currentInvoice);
    alert('Invoice salva com sucesso!');
    
    // Criar nova invoice vazia
    setCurrentInvoice({
      id: null,
      number: '',
      date: new Date().toISOString().split('T')[0],
      supplierId: '',
      products: [],
      carrierId: '',
      taxValue: 5.0,
      paid: false,
      paidDate: null,
      paidDollarRate: null,
      completed: false,
      completedDate: null,
    });
  };
  
  return (
    <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4 text-blue-700 border-b pb-2">
        <FilePlus className="mr-2 inline" size={18} />
        Nova Invoice
      </h2>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Fornecedor</label>
        <select
          name="supplierId"
          value={currentInvoice.supplierId}
          onChange={handleInputChange}
          className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Selecione um fornecedor</option>
          {suppliers.map((supplier) => (
            <option key={supplier.id} value={supplier.id}>
              {supplier.name}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Número da Invoice</label>
        <input
          type="text"
          name="number"
          value={currentInvoice.number}
          onChange={handleInputChange}
          className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Número da invoice"
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
        <input
          type="date"
          name="date"
          value={currentInvoice.date}
          onChange={handleInputChange}
          className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Freteiro</label>
        <select
          name="carrierId"
          value={currentInvoice.carrierId}
          onChange={handleInputChange}
          className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Selecione um freteiro</option>
          {carriers.map((carrier) => (
            <option key={carrier.id} value={carrier.id}>
              {carrier.name} ({carrier.type === 'percentage' ? '%' : carrier.type === 'perKg' ? '$/kg' : '$/un'})
            </option>
          ))}
        </select>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Frete SP x ES (R$ por item)
        </label>
        <input
          type="number"
          step="0.01"
          name="taxValue"
          value={currentInvoice.taxValue}
          onChange={handleInputChange}
          className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Valor em R$ por item"
        />
      </div>

      <button
        onClick={() => saveInvoice()}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md"
      >
        <Save className="mr-2 inline" size={18} />
        Salvar Invoice
      </button>
    </div>
  );
}
import { FilePlus, Save } from 'lucide-react';
import { useState, useEffect } from 'react';
import { api } from '../../../../services/api';
import { Invoice } from '../types/invoice';

interface NewInvoiceFormProps {
  currentInvoice: Invoice;
  setCurrentInvoice: (invoice: Invoice) => void;
}

export function NewInvoiceForm({ currentInvoice, setCurrentInvoice }: NewInvoiceFormProps) {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [carriers, setCarriers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  // Buscar fornecedores, transportadoras e produtos via API
  useEffect(() => {
    const fetchData = async () => {
      try {
        const suppliersResponse = await api.get('/invoice/supplier');
        const carriersResponse = await api.get('/invoice/carriers');
        const productsResponse = await api.get('/invoice/product');
        
        setSuppliers(suppliersResponse.data);
        setCarriers(carriersResponse.data);
        setProducts(productsResponse.data);
      } catch (error) {
        console.error('Erro ao buscar dados:', error);
      }
    };
    fetchData();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setCurrentInvoice({ ...currentInvoice, [name]: value });
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

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Freteiro 2</label>
        <select
          name="carrier2Id"
          value={currentInvoice.carrier2Id}
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
          name="taxaSpEs"
          value={currentInvoice.taxaSpEs}
          onChange={handleInputChange}
          className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Valor em R$ por item"
        />
      </div>


    </div>
  );
}

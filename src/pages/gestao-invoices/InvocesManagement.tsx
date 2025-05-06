import { useState } from 'react';
import { Tabs } from './layout/Tabs';
import { InvoicesTab } from './components/sections/InvoicesTab';
import { ProductsTab } from './components/sections/ProductsTab';
import { SuppliersTab } from './components/sections/SuppliersTab';
import { CarriersTab } from './components/sections/CarriersTab';
import { ExchangeTab } from './components/sections/ExchangeTab';
import { ReportsTab } from './components/sections/ReportsTab';
import CaixasTab from './components/sections/Caixas';
import { OtherPartnersTab } from './components/sections/OtherPartners';

export type TabType = 'invoices' | 'products' | 'suppliers' | 'carriers' | 'media-dolar' | 'relatorios' | 'caixas' | 'others';

export default function InvocesManagement() {
  const [activeTab, setActiveTab] = useState<TabType>('invoices');
  const [totalBalance, setTotalBalance] = useState<string>('');

  const handleTotalBalance = (callback: () => string) => {
    const totalBalance = callback();
    setTotalBalance(totalBalance);
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-blue-800">Sistema de Gestão de Invoices { totalBalance }</h1>
          <p className="text-gray-600">Controle completo de produtos, invoices e fornecedores</p>
        </header>

        <Tabs
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onHandleTotalBalance={handleTotalBalance}
        />

        <div className="mt-6">
          {activeTab === 'invoices' && <InvoicesTab />}
          {activeTab === 'products' && <ProductsTab />}
          {activeTab === 'suppliers' && <SuppliersTab />}
          {activeTab === 'carriers' && <CarriersTab />}
          {activeTab === 'others' && <OtherPartnersTab />}
          {activeTab === 'media-dolar' && <ExchangeTab />}
          {activeTab === 'relatorios' && <ReportsTab />}
          {activeTab === 'caixas' && <CaixasTab onHandleTotalBalance={handleTotalBalance} />}

        </div>
      </div>
    </div>
  );
}

import { useState } from "react";
import { Tabs } from "./layout/Tabs";
import { InvoicesTab } from "./components/sections/InvoicesTab";
import { ProductsTab } from "./components/sections/ProductsTab";
import { SuppliersTab } from "./components/sections/SuppliersTab";
import { CarriersTab } from "./components/sections/CarriersTab";
import { ExchangeTab } from "./components/sections/ExchangeTab";
import { ReportsTab } from "./components/sections/ReportsTab";
import CaixasTab from "./components/sections/Caixas";
import { OtherPartnersTab } from "./components/sections/OtherPartners";
import { Invoice } from "./components/types/invoice";
import CaixasTabBrl from "./components/sections/CaixasBrl";

export type TabType =
  | "invoices"
  | "products"
  | "suppliers"
  | "carriers"
  | "media-dolar"
  | "relatorios"
  | "caixas"
  | "others"
  | "caixas-brl";

export default function InvocesManagement() {
  const [activeTab, setActiveTab] = useState<TabType>("invoices");

  const [currentInvoice, setCurrentInvoice] = useState<Invoice>({
    id: null,
    number: `INV-${Date.now()}`,
    date: new Date().toLocaleDateString('en-CA'),
    supplierId: "",
    products: [],
    amountTaxcarrier: 0,
    amountTaxcarrier2: 0,
    taxaSpEs: "",
    carrierId: "",
    carrier2Id: "",
    paid: false,
    paidDate: null,
    paidDollarRate: null,
    completed: false,
    completedDate: null,
    amountTaxSpEs: 0,
    overallValue: 0,
    subAmount: 0,
  });

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-blue-800">Sistema de Gestão de Invoices</h1>
          <p className="text-gray-600">Controle completo de produtos, invoices e fornecedores</p>
        </header>

        <Tabs activeTab={activeTab} setActiveTab={setActiveTab} />

        <div className="mt-6">
          {activeTab === "invoices" && (
            <InvoicesTab currentInvoice={currentInvoice} setCurrentInvoice={setCurrentInvoice} />
          )}
          {activeTab === "products" && <ProductsTab />}
          {activeTab === "suppliers" && <SuppliersTab />}
          {activeTab === "carriers" && <CarriersTab />}
          {activeTab === "others" && <OtherPartnersTab />}
          {activeTab === "media-dolar" && <ExchangeTab />}
          {activeTab === "relatorios" && <ReportsTab />}
          {activeTab === "caixas" && <CaixasTab />}
          {activeTab === "caixas-brl" && <CaixasTabBrl />}
        </div>
      </div>
    </div>
  );
}

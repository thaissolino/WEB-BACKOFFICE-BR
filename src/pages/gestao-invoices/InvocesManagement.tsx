import { useEffect, useState } from "react";
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
import { usePermissionStore } from "../../store/permissionsStore";

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
  const {getPermissions, permissions} = usePermissionStore()
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

  useEffect(() => {
    getPermissions();
    console.log(permissions)
  }, [activeTab]);

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-blue-800">Sistema de Gestão de Invoices</h1>
          <p className="text-gray-600">Controle completo de produtos, invoices e fornecedores</p>
        </header>

        <Tabs activeTab={activeTab} setActiveTab={setActiveTab} />

        <div className="mt-6">
          {activeTab === "invoices" && permissions?.GERENCIAR_INVOICES?.enabled && (
            <InvoicesTab currentInvoice={currentInvoice} setCurrentInvoice={setCurrentInvoice} />
          )}

          {activeTab === "products" && permissions?.GERENCIAR_INVOICES?.PRODUTOS && <ProductsTab />}
          
          {activeTab === "suppliers" && permissions?.GERENCIAR_INVOICES?.FORNECEDORES && <SuppliersTab />}
          
          {activeTab === "carriers" && permissions?.GERENCIAR_INVOICES?.FRETEIROS && <CarriersTab />}
          
          {activeTab === "others" && permissions?.GERENCIAR_INVOICES?.OUTROS && <OtherPartnersTab />}
          
          {activeTab === "media-dolar" && permissions?.GERENCIAR_INVOICES?.MEDIA_DOLAR && <ExchangeTab />}
          
          {activeTab === "relatorios" && permissions?.GERENCIAR_INVOICES?.RELATORIOS && <ReportsTab />}
          
          {activeTab === "caixas" && Array.isArray(permissions?.GERENCIAR_INVOICES?.CAIXAS_PERMITIDOS) && permissions.GERENCIAR_INVOICES.CAIXAS_PERMITIDOS.length > 0 && <CaixasTab />}
          
          {activeTab === "caixas-brl" && Array.isArray(permissions?.GERENCIAR_INVOICES?.CAIXAS_BR_PERMITIDOS) && permissions.GERENCIAR_INVOICES.CAIXAS_BR_PERMITIDOS.length > 0 && <CaixasTabBrl />}
        </div>

      </div>
    </div>
  );
}

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
import { ShoppingListsTab } from "./components/sections/ShoppingListsTab";
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
  | "caixas-brl"
  | "shopping-lists"
  | "";

export const permissionTabMap: Record<string, TabType> = {
  INVOICES: "invoices",
  PRODUTOS: "products",
  FORNECEDORES: "suppliers",
  FRETEIROS: "carriers",
  MEDIA_DOLAR: "media-dolar",
  RELATORIOS: "relatorios",
  CAIXAS_PERMITIDOS: "caixas",
  OUTROS: "others",
  CAIXAS_BR_PERMITIDOS: "caixas-brl",
};

export default function InvocesManagement() {
  const [activeTab, setActiveTab] = useState<TabType>("");
  const { getPermissions, permissions, user } = usePermissionStore();
  const [currentInvoice, setCurrentInvoice] = useState<Invoice>({
    id: null,
    number: `INV-${Date.now()}`,
    date: new Date().toLocaleDateString("en-CA"),
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
  }, []);

  useEffect(() => {
    if (!permissions?.GERENCIAR_INVOICES) return;

    for (const [permKey, tab] of Object.entries(permissionTabMap)) {
      const value = permissions.GERENCIAR_INVOICES[permKey as keyof typeof permissions.GERENCIAR_INVOICES];

      if (Array.isArray(value) ? value.length > 0 : value === true) {
        setActiveTab(tab);
        break;
      }
    }
  }, []);

  const canShowTab = (key: string): boolean => {
    if (user?.role === "MASTER") return true;

    const perms = permissions?.GERENCIAR_INVOICES;
    if (!perms) return false;

    if (key === "CAIXAS_PERMITIDOS" || key === "CAIXAS_BR_PERMITIDOS") {
      return Array.isArray(perms[key]) && perms[key].length > 0;
    }

    return perms[key as keyof typeof perms] === true;
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-blue-800">Sistema de Gestão de Invoices</h1>
          <p className="text-gray-600">Controle completo de produtos, invoices e fornecedores</p>
        </header>

        <Tabs activeTab={activeTab} setActiveTab={setActiveTab} />

        <div className="mt-6">
          {activeTab === "invoices" && canShowTab("INVOICES") && (
            <InvoicesTab currentInvoice={currentInvoice} setCurrentInvoice={setCurrentInvoice} />
          )}
          {activeTab === "products" && canShowTab("PRODUTOS") && <ProductsTab />}
          {activeTab === "suppliers" && canShowTab("FORNECEDORES") && <SuppliersTab />}
          {activeTab === "carriers" && canShowTab("FRETEIROS") && <CarriersTab />}
          {activeTab === "others" && canShowTab("OUTROS") && <OtherPartnersTab />}
          {activeTab === "media-dolar" && canShowTab("MEDIA_DOLAR") && <ExchangeTab />}
          {activeTab === "relatorios" && canShowTab("RELATORIOS") && <ReportsTab />}
          {activeTab === "caixas" && canShowTab("CAIXAS_PERMITIDOS") && <CaixasTab />}
          {activeTab === "caixas-brl" && canShowTab("CAIXAS_BR_PERMITIDOS") && <CaixasTabBrl />}
          {activeTab === "shopping-lists" && <ShoppingListsTab />}
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import "../gestor/gestao-pages.css";
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
import { LostProductsTab } from "./components/sections/LostProductsTab";
import { ImeiSearchTab } from "./components/sections/ImeiSearchTab";
import { usePermissionStore } from "../../store/permissionsStore";
import { api } from "../../services/api";
import { ActionLoadingProvider } from "./context/ActionLoadingContext";
import { DisableButtonsWrapper } from "./components/DisableButtonsWrapper";

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
  | "lost-products"
  | "imei-search"
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

export type GestaoArea = "cadastro" | "compras" | "caixas";

const AREA_TABS: Record<GestaoArea, TabType[]> = {
  cadastro: ["products", "suppliers", "carriers", "others"],
  compras: ["invoices", "media-dolar", "relatorios", "shopping-lists", "imei-search", "lost-products"],
  caixas: ["caixas", "caixas-brl"],
};

const AREA_COPY: Record<GestaoArea, { title: string; subtitle: string }> = {
  cadastro: {
    title: "Cadastro",
    subtitle: "Produtos, fornecedores, freteiros e outros",
  },
  compras: {
    title: "Compras",
    subtitle: "Invoices, média dólar, relatórios, lista de compras e busca de IMEI",
  },
  caixas: {
    title: "Gestão de caixas",
    subtitle: "Caixas e caixas BR",
  },
};

export default function InvocesManagement({ area = "compras" }: { area?: GestaoArea }) {
  const allowed = AREA_TABS[area];
  const [searchParams] = useSearchParams();
  const aba = searchParams.get("aba") as TabType | null;
  const [activeTab, setActiveTab] = useState<TabType>("");
  const { getPermissions, permissions, user } = usePermissionStore();
  const defaultEmptyInvoice = (): Invoice => ({
    id: null,
    number: "",
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
  const [draftInvoices, setDraftInvoices] = useState<Invoice[]>([defaultEmptyInvoice()]);
  const [activeDraftIndex, setActiveDraftIndex] = useState(0);
  const currentInvoice = draftInvoices[activeDraftIndex] ?? defaultEmptyInvoice();
  const setCurrentInvoice = (inv: Invoice | ((prev: Invoice) => Invoice)) => {
    setDraftInvoices((prev) => {
      const next = [...prev];
      const current = next[activeDraftIndex];
      next[activeDraftIndex] = typeof inv === "function" ? inv(current) : inv;
      return next;
    });
  };
  /** Adiciona novas invoices às abas sem remover as que já estão na tela (importar em massa de novo não afeta o que já está) */
  const handleAddDraftInvoices = (invoices: Invoice[]) => {
    if (invoices.length === 0) return;
    const firstNewIndex = draftInvoices.length;
    setDraftInvoices((prev) => [...prev, ...invoices]);
    setActiveDraftIndex(firstNewIndex); // foca a primeira das novas
  };
  const handleDraftSaved = () => {
    setDraftInvoices((prev) => {
      const next = prev.filter((_, i) => i !== activeDraftIndex);
      if (next.length === 0) return [defaultEmptyInvoice()];
      return next;
    });
    setActiveDraftIndex((prev) => {
      const newLen = draftInvoices.length - 1;
      if (newLen <= 0) return 0;
      return Math.min(prev, newLen - 1);
    });
  };

  /** Remove uma invoice específica das abas pelo índice */
  const handleRemoveDraftInvoice = (indexToRemove: number) => {
    setDraftInvoices((prev) => {
      const next = prev.filter((_, i) => i !== indexToRemove);
      if (next.length === 0) return [defaultEmptyInvoice()];
      return next;
    });
    setActiveDraftIndex((prev) => {
      const newLen = draftInvoices.length - 1;
      if (newLen <= 0) return 0;
      // Se a invoice removida era a ativa ou estava antes dela, ajustar o índice
      if (indexToRemove <= prev) {
        return Math.max(0, prev - 1);
      }
      return prev;
    });
  };

  // Função para buscar o próximo número de invoice
  const fetchNextInvoiceNumber = async () => {
    try {
      const response = await api.get("/invoice/next-number");
      if (response.data?.nextNumber) {
        setCurrentInvoice((prev) => ({
          ...prev,
          number: response.data.nextNumber,
        }));
      }
    } catch (error) {
      console.error("Erro ao buscar próximo número de invoice:", error);
      // Em caso de erro, usar um número baseado em timestamp como fallback
      setCurrentInvoice((prev) => ({
        ...prev,
        number: `INV-${Date.now()}`,
      }));
    }
  };

  useEffect(() => {
    getPermissions();
    // Buscar o próximo número quando o componente for montado
    fetchNextInvoiceNumber();
  }, []);

  useEffect(() => {
    setActiveTab((current) => {
      if (aba && allowed.includes(aba)) return aba;
      if (current && allowed.includes(current)) return current;
      if (user?.role === "MASTER") return allowed[0];

      const perms = permissions?.GERENCIAR_INVOICES;
      if (!perms) return allowed[0];

      for (const tab of allowed) {
        const permKey = Object.entries(permissionTabMap).find(([, value]) => value === tab)?.[0];
        if (!permKey) return tab;
        const value = perms[permKey as keyof typeof perms];
        if (Array.isArray(value) ? value.length > 0 : value === true) return tab;
      }
      return allowed[0];
    });
  }, [permissions, user, area, aba]);

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
    <ActionLoadingProvider>
      <DisableButtonsWrapper>
        <div className="gestao-page">
          <div className="w-full px-2 py-4">
            <header className="mb-4">
              <h1 className="text-3xl font-bold text-blue-800">{AREA_COPY[area].title}</h1>
              <p className="text-gray-600">{AREA_COPY[area].subtitle}</p>
            </header>

            <Tabs activeTab={activeTab} setActiveTab={setActiveTab} allowed={allowed} />

            <div className="mt-4">
              {activeTab === "invoices" && canShowTab("INVOICES") && (
                <InvoicesTab
                  currentInvoice={currentInvoice}
                  setCurrentInvoice={setCurrentInvoice}
                  draftInvoices={draftInvoices}
                  activeDraftIndex={activeDraftIndex}
                  setActiveDraftIndex={setActiveDraftIndex}
                  onAddDraftInvoices={handleAddDraftInvoices}
                  onDraftSaved={handleDraftSaved}
                  onRemoveDraftInvoice={handleRemoveDraftInvoice}
                />
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
              {activeTab === "lost-products" && canShowTab("RELATORIOS") && <LostProductsTab />}
              {activeTab === "imei-search" && <ImeiSearchTab />}
            </div>
          </div>
        </div>
      </DisableButtonsWrapper>
    </ActionLoadingProvider>
  );
}

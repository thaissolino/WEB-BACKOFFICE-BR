import { TabType } from "../InvocesManagement";
import { FileText, Boxes, Truck, DollarSign, ChartBar, Users, Package, ShoppingCart, AlertTriangle, Search } from "lucide-react";
import { usePermissionStore } from "../../../store/permissionsStore";
import { ABA_GESTAO, podeGestao } from "../../../store/acessoGestao";

interface TabsProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  allowed?: string[];
}

const allTabs = [
  { id: "invoices", icon: <FileText className="mr-2" size={16} />, label: "Invoices", permissionKey: "INVOICES" },
  { id: "products", icon: <Boxes className="mr-2" size={16} />, label: "Produtos", permissionKey: "PRODUTOS" },
  {
    id: "suppliers",
    icon: <Package className="mr-2" size={16} />,
    label: "Fornecedores",
    permissionKey: "FORNECEDORES",
  },
  { id: "carriers", icon: <Truck className="mr-2" size={16} />, label: "Freteiros", permissionKey: "FRETEIROS" },
  { id: "others", icon: <Users className="mr-2" size={16} />, label: "Outros", permissionKey: "OUTROS" },
  {
    id: "media-dolar",
    icon: <DollarSign className="mr-2" size={16} />,
    label: "Média Dólar",
    permissionKey: "MEDIA_DOLAR",
  },
  { id: "caixas", icon: <Boxes className="mr-2" size={16} />, label: "Caixas", permissionKey: "CAIXAS_PERMITIDOS" },
  {
    id: "caixas-brl",
    icon: <Boxes className="mr-2" size={16} />,
    label: "Caixas BR",
    permissionKey: "CAIXAS_BR_PERMITIDOS",
  },
  {
    id: "melhores-precos",
    icon: <DollarSign className="mr-2" size={16} />,
    label: "Melhores preços",
    permissionKey: null,
  },
  {
    id: "shopping-lists",
    icon: <ShoppingCart className="mr-2" size={16} />,
    label: "Listas de Compras",
    permissionKey: null,
  },
  {
    id: "lost-products",
    icon: <AlertTriangle className="mr-2" size={16} />,
    label: "Perdidos",
    permissionKey: null,
  },
  {
    id: "imei-search",
    icon: <Search className="mr-2" size={16} />,
    label: "Buscar IMEI",
    permissionKey: null,
  },
  // {
  //   id: "afi-imei",
  //   icon: <Smartphone className="mr-2" size={16} />,
  //   label: "IMEI AFI",
  //   permissionKey: null, // Visível para todos
  // },
  { id: "relatorios", icon: <ChartBar className="mr-2" size={16} />, label: "Relatórios", permissionKey: "RELATORIOS" },
];

export function Tabs({ activeTab, setActiveTab, allowed }: TabsProps) {
  const { permissions, user } = usePermissionStore();

  const canShowTab = (key: string | null): boolean => {
    if (user?.role === "MASTER") return true;

    // Shopping Lists sempre visível para todos os usuários autenticados
    if (key === null) return true;

    const perms = permissions?.GERENCIAR_INVOICES;
    if (!perms) return false;

    if (key === "CAIXAS_PERMITIDOS") {
      return Array.isArray(perms.CAIXAS_PERMITIDOS) && perms.CAIXAS_PERMITIDOS.length > 0;
    }
    if (key === "CAIXAS_BR_PERMITIDOS") {
      return Array.isArray(perms.CAIXAS_BR_PERMITIDOS) && perms.CAIXAS_BR_PERMITIDOS.length > 0;
    }

    return perms[key as keyof typeof perms] === true;
  };

  return (
    <div className="mb-6 flex flex-wrap gap-2">
      {allTabs
        .filter((tab) => {
          if (allowed && !allowed.includes(tab.id)) return false;
          if (tab.permissionKey === null) {
            if (user?.role === "MASTER") return true;
            const chave = ABA_GESTAO[tab.id];
            return chave ? podeGestao(permissions?.GERENCIAR_INVOICES, chave) : true;
          }
          return canShowTab(tab.permissionKey);
        })
        .map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={`inline-flex items-center px-5 py-2.5 rounded-2xl text-sm font-medium transition-all ${
              activeTab === tab.id
                ? "bg-blue-500 text-white shadow-sm"
                : "bg-gray-100/80 text-gray-600 hover:bg-gray-200/80 border border-gray-200/80"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
    </div>
  );
}

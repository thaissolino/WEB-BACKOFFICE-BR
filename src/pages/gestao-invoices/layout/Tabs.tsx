import { JSX } from "react";
import { TabType } from "../InvocesManagement";
import { FileText, Boxes, Building, Truck, DollarSign, ChartBar, Users, Package } from "lucide-react";

interface TabsProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

const tabs: { id: TabType; icon: JSX.Element; label: string }[] = [
  { id: "invoices", icon: <FileText className="mr-2" size={16} />, label: "Invoices" },
  { id: "products", icon: <Boxes className="mr-2" size={16} />, label: "Produtos" },
  { id: "suppliers", icon: <Package className="mr-2" size={16} />, label: "Fornecedores" },
  { id: "carriers", icon: <Truck className="mr-2" size={16} />, label: "Freteiros" },
  { id: "others", icon: <Users className="mr-2" size={16} />, label: "Outros" },
  { id: "media-dolar", icon: <DollarSign className="mr-2" size={16} />, label: "Média Dólar" },
  { id: "relatorios", icon: <ChartBar className="mr-2" size={16} />, label: "Relatórios" },
  { id: "caixas", icon: <Boxes className="mr-2" size={16} />, label: "Caixas" },
  { id: "caixas-brl", icon: <Boxes className="mr-2" size={16} />, label: "Caixas BR" },
  
];

export function Tabs({ activeTab, setActiveTab }: TabsProps) {
  return (
    <div className="mb-6 border-b border-gray-200">
      <ul className="flex flex-wrap -mb-px">
        {tabs.map((tab) => (
          <li key={tab.id} className="mr-2">
            <button
              onClick={() => {
                setActiveTab(tab.id);
              }}
              className={`inline-flex items-center p-4 border-b-2 rounded-t-lg ${
                activeTab === tab.id
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent hover:text-gray-600 hover:border-gray-300"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

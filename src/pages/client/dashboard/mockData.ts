export type StoreOption = {
  id: string;
  name: string;
  stock: string;
  code: string;
  label: string;
};

export function toStoreOption(store: {
  id: string;
  name: string;
  storeCode?: string | null;
  code?: string | null;
}): StoreOption {
  const raw = String(store.storeCode || store.code || "").trim();
  const code = /^\d{1,6}$/.test(raw) ? raw.padStart(6, "0") : raw;
  const name = String(store.name || "").trim();
  return {
    id: store.id,
    name,
    stock: name,
    code,
    label: code && name ? `${code} - ${name}` : name || code,
  };
}

export const NEWS = [
  "Novos filtros nos Relatórios de Clientes",
  "Editor de Etiquetas",
  "Defina Sua Etiqueta Padrão e Ganhe Agilidade",
  "Gere XMLs de Todas as Suas Lojas com um Só Clique!",
  "Estoque Compartilhado para TrayCommerce",
  "Gestão Inteligente de Entregas e Transferências",
];

export const PLAN = {
  storeCode: "1598",
  name: "GestorVix COR...",
  product: "Ilimitado",
  user: "Ilimitado",
  pdv: "Ilimitado",
  storage: "1,53 MB",
  files: "75",
  lastPayment: "—",
  monthly: "Em dia",
};

export function periodLabels(now = new Date()) {
  const months = [
    "JANEIRO",
    "FEVEREIRO",
    "MARÇO",
    "ABRIL",
    "MAIO",
    "JUNHO",
    "JULHO",
    "AGOSTO",
    "SETEMBRO",
    "OUTUBRO",
    "NOVEMBRO",
    "DEZEMBRO",
  ];
  const start = new Date(now);
  start.setDate(now.getDate() - now.getDay());
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return {
    today: `HOJE ${now.toLocaleDateString("pt-BR")}`,
    week: `ESTA SEMANA ${start.getDate()}/${start.getMonth() + 1} A ${end.getDate()}/${end.getMonth() + 1}`,
    month: `ESTE MÊS ${months[now.getMonth()]} DE ${now.getFullYear()}`,
  };
}

export const SOCIAL_VIDEOS = {
  featured: "GestorVix SISTEMA ERP | NOTAS FISCAIS...",
  latest: "Entenda o GestorVix | Sistema online...",
};

export const NENHUM_CAIXA = "Nenhum >>";

export const STORE_STORAGE_KEY = "pdv-store-id";
export const CAIXA_STORAGE_KEY = "pdv-selected-caixa";

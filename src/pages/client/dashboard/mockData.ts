export type StoreOption = {
  id: string;
  name: string;
  stock: string;
  code: string;
  label: string;
};

export const STORES: StoreOption[] = [
  { id: "estoque-1", name: "ESTOQUE 1", stock: "ESTOQUE 1", code: "001598", label: "001598 - ESTOQUE 1" },
  { id: "estoque-2", name: "ESTOQUE 2", stock: "ESTOQUE 2", code: "001839", label: "001839 - ESTOQUE 2" },
  { id: "conecta-store", name: "CONECTA STORE", stock: "CONECTA STORE", code: "001937", label: "001937 - CONECTA STORE" },
];

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
  lastPayment: "02/08/2018",
  monthly: "Em dia",
};

export const TOP_BUYERS = [
  { name: "MARCELO BAUTZ - REVENDA", amount: "R$ 1.669.070,00" },
  { name: "LOJA VILASTORE - REVENDA", amount: "R$ 906.500,00" },
  { name: "LOJA CONECTA STORE - REVENDA", amount: "R$ 259.250,00" },
  { name: "XREELETRO - REVENDA", amount: "R$ 141.200,00" },
  { name: "WELLINGTON JACOMINI - REVENDA", amount: "R$ 100.000,00" },
  { name: "RODOLFO BARTH - REVENDA", amount: "R$ 50.500,00" },
];

export const PAYABLES = {
  total: "R$ 776.750,00",
  today: "0,00",
  week: "0,00",
  month: "0,00",
};

export const RECEIVABLES = {
  total: "R$ 892.400,00",
  today: "0,00",
  week: "0,00",
  month: "0,00",
};

export const PERIOD_LABELS = {
  today: "HOJE 12/08/2026",
  week: "ESTA SEMANA 9/8 A 15/8",
  month: "ESTE MÊS AGOSTO DE 2026",
};

export const BILLING_SERIES = [
  25000, 18000, 32000, 22000, 45000, 38000, 160000, 245000, 330000, 430000, 575000, 88000,
];

export const SOCIAL_VIDEOS = {
  featured: "GestorVix SISTEMA ERP | NOTAS FISCAIS...",
  latest: "Entenda o GestorVix | Sistema online...",
};

export const CERTIFICATE_DUE = "09/12/2025";

export const NENHUM_CAIXA = "Nenhum >>";

export const CAIXAS = [
  NENHUM_CAIXA,
  "ADMINISTRATIVO - ESTOQUE",
  "BARTH",
  "MARCELO",
  "VITOR IMPORTS",
  "ALLENDER",
  "ANTONIO JUNIOR",
  "BRENNO CARNEIRO",
  "LOJA VILASTORE",
  "DINHEIRO EM ESPECIE",
  "CARTAO DA SEMANA",
  "CAIXA CENTRAL",
  "LOJA CONECTASTORE",
  "WELLINGTON ARACRUZ",
  "UAIPLACE",
  "WILLIAN AR",
  "XREELETRO",
] as const;

export const STORE_STORAGE_KEY = "pdv-store-id";
export const CAIXA_STORAGE_KEY = "pdv-selected-caixa";

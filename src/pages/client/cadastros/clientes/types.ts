export type StoreCustomer = {
  id: string;
  code: string;
  name: string;
  responsible: string;
  portfolio: string;
  phone: string;
  registeredAt: string;
  classification: string;
  city: string;
  state: string;
  cep: string;
  document: string;
  financialCode: string;
  active: boolean;
};

export const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS",
  "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC",
  "SP", "SE", "TO",
] as const;

export const CITIES_BY_UF: Record<string, string[]> = {
  ES: ["Vitória", "Vila Velha", "Serra", "Cariacica"],
  BA: ["Salvador", "Feira de Santana", "Vitória da Conquista"],
  SP: ["São Paulo", "Campinas", "Santos"],
  MG: ["Belo Horizonte", "Uberlândia", "Juiz de Fora"],
  RJ: ["Rio de Janeiro", "Niterói", "Petrópolis"],
};

export const GERENCIAR_ACTIONS = [
  { id: "historico", label: "Histórico" },
  { id: "crediario", label: "Crediário" },
  { id: "consignado", label: "Consignado" },
  { id: "imprimir", label: "Imprimir" },
  { id: "analise-credito", label: "Análise de Crédito" },
  { id: "gerar-boleto", label: "Gerar Boleto Recorrente" },
  { id: "gerenciar-boleto", label: "Gerenciar Boleto Recorrente" },
  { id: "endereco-entrega", label: "Endereço de Entrega" },
  { id: "caixa", label: "Caixa" },
  { id: "consulta-crediario", label: "Consulta Meu Crediário" },
  { id: "agendar", label: "Agendar uma atividade" },
] as const;

export type ClassificationRow = {
  code: number;
  name: string;
  discountType: "geral" | "categoria";
  discountPercent: number;
  discountOnPromo: boolean;
  creditUnlimited: boolean;
  creditLimit: number;
  consignado: boolean;
  blockFiscal: boolean;
  sortOrder: number;
  active: boolean;
};

export type PortfolioRow = {
  code: number;
  name: string;
  userName: string;
  active: boolean;
};

export function classificationFilterLabel(row: Pick<ClassificationRow, "code" | "name" | "discountType">) {
  if (row.code === 0 || row.name === "NENHUM") return "NENHUM";
  if (row.discountType === "categoria") return `${row.name}Desconto por Categoria`;
  return row.name;
}

export function formatBrMoney(value: number) {
  return value.toFixed(2).replace(".", ",");
}

export function parseBrMoney(value: string) {
  const normalized = value.replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, "");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}

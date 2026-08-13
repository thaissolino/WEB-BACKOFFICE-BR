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

export const MOCK_CUSTOMERS: StoreCustomer[] = [
  {
    id: "c1",
    code: "138201",
    name: "MARINA COSTA ENGENHARIA",
    responsible: "",
    portfolio: "",
    phone: "",
    registeredAt: "04/09/2020 11:25:13",
    classification: "",
    city: "",
    state: "",
    cep: "",
    document: "",
    financialCode: "",
    active: true,
  },
  {
    id: "c2",
    code: "138448",
    name: "CANTINHO DO BOSQUE",
    responsible: "",
    portfolio: "testes",
    phone: "(27) 99811-2200",
    registeredAt: "18/09/2020 09:14:02",
    classification: "Clube 1",
    city: "Vitória",
    state: "ES",
    cep: "29010-000",
    document: "",
    financialCode: "",
    active: true,
  },
  {
    id: "c3",
    code: "139002",
    name: "GRUPO AURORA ME",
    responsible: "",
    portfolio: "",
    phone: "",
    registeredAt: "02/10/2020 16:41:55",
    classification: "",
    city: "",
    state: "",
    cep: "",
    document: "",
    financialCode: "",
    active: true,
  },
  {
    id: "c4",
    code: "140118",
    name: "NORTE COMERCIO DE ARTIGOS",
    responsible: "PAULO LIMA",
    portfolio: "testes",
    phone: "(27) 3333-4411",
    registeredAt: "22/10/2020 08:03:19",
    classification: "Clube 1",
    city: "Serra",
    state: "ES",
    cep: "29160-000",
    document: "",
    financialCode: "4411",
    active: true,
  },
  {
    id: "c5",
    code: "141550",
    name: "PADARIA BOA VISTA",
    responsible: "",
    portfolio: "",
    phone: "(11) 98765-4321",
    registeredAt: "11/11/2020 13:22:40",
    classification: "",
    city: "São Paulo",
    state: "SP",
    cep: "01310-100",
    document: "",
    financialCode: "",
    active: true,
  },
  {
    id: "c6",
    code: "142003",
    name: "OFICINA LITORAL LTDA",
    responsible: "",
    portfolio: "",
    phone: "",
    registeredAt: "03/12/2020 10:08:11",
    classification: "",
    city: "",
    state: "",
    cep: "",
    document: "",
    financialCode: "",
    active: true,
  },
  {
    id: "c7",
    code: "143771",
    name: "CASA DAS TINTAS SUL",
    responsible: "ANA SOUZA",
    portfolio: "",
    phone: "(21) 98888-1100",
    registeredAt: "19/01/2021 15:47:33",
    classification: "Clube 1",
    city: "Niterói",
    state: "RJ",
    cep: "24020-000",
    document: "",
    financialCode: "",
    active: true,
  },
  {
    id: "c8",
    code: "144290",
    name: "MERCADO DO BAIRRO",
    responsible: "",
    portfolio: "testes",
    phone: "(31) 99900-2211",
    registeredAt: "08/02/2021 09:55:02",
    classification: "",
    city: "Belo Horizonte",
    state: "MG",
    cep: "30130-000",
    document: "",
    financialCode: "",
    active: true,
  },
  {
    id: "c9",
    code: "145012",
    name: "ATELIE LUZ E COR",
    responsible: "",
    portfolio: "",
    phone: "",
    registeredAt: "27/02/2021 18:12:44",
    classification: "",
    city: "",
    state: "",
    cep: "",
    document: "",
    financialCode: "",
    active: true,
  },
  {
    id: "c10",
    code: "146880",
    name: "REVENDA HORIZONTE AZUL",
    responsible: "",
    portfolio: "",
    phone: "(27) 98877-6655",
    registeredAt: "14/03/2021 11:01:09",
    classification: "Clube 1",
    city: "Vila Velha",
    state: "ES",
    cep: "29100-000",
    document: "",
    financialCode: "6655",
    active: true,
  },
  {
    id: "i1",
    code: "2107",
    name: "ALEX NT",
    responsible: "-",
    portfolio: "",
    phone: "",
    registeredAt: "27/05/2019 16:53:03",
    classification: "",
    city: "",
    state: "",
    cep: "",
    document: "",
    financialCode: "",
    active: false,
  },
  {
    id: "i2",
    code: "2807",
    name: "CAMILA ROCHA - REVENDA",
    responsible: "-",
    portfolio: "",
    phone: "(74) 9188-0096",
    registeredAt: "13/06/2019 09:37:24",
    classification: "",
    city: "",
    state: "BA",
    cep: "",
    document: "",
    financialCode: "",
    active: false,
  },
  {
    id: "i3",
    code: "4138",
    name: "AMERICO SILVA - REVENDA",
    responsible: "-",
    portfolio: "",
    phone: "",
    registeredAt: "12/07/2019 14:06:18",
    classification: "",
    city: "",
    state: "",
    cep: "",
    document: "",
    financialCode: "",
    active: false,
  },
  {
    id: "i4",
    code: "551",
    name: "BERNARDO COSTA - REVENDA",
    responsible: "-",
    portfolio: "testes",
    phone: "(27) 99875-6442",
    registeredAt: "16/05/2019 16:54:21",
    classification: "Clube 1",
    city: "Vitória",
    state: "ES",
    cep: "",
    document: "",
    financialCode: "",
    active: false,
  },
  {
    id: "i5",
    code: "159401",
    name: "DANIELA PEREIRA VIEIRA SOUZA",
    responsible: "-",
    portfolio: "",
    phone: "",
    registeredAt: "27/07/2023 17:02:23",
    classification: "",
    city: "",
    state: "",
    cep: "",
    document: "",
    financialCode: "",
    active: false,
  },
  {
    id: "i6",
    code: "1602",
    name: "OFICINA NORTE - REVENDA",
    responsible: "-",
    portfolio: "",
    phone: "(11) 97654-3210",
    registeredAt: "04/08/2019 10:22:11",
    classification: "",
    city: "São Paulo",
    state: "SP",
    cep: "",
    document: "",
    financialCode: "",
    active: false,
  },
];

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

export const PORTFOLIO_USERS = ["ADRIANE GOMES", "MARCOS SILVA", "JULIANA FREITAS"];

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

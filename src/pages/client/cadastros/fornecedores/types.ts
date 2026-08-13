export type PersonType = "fisica" | "juridica" | "estrangeiro";
export type SupplierKind = "produto" | "despesas";

export type PdvSupplier = {
  code: number;
  type: string;
  personType: PersonType;
  document: string;
  razao: string;
  fantasia: string;
  inscricaoEstadual: string;
  cep: string;
  address: string;
  number: string;
  neighborhood: string;
  city: string;
  uf: string;
  phone: string;
  mobile: string;
  contact: string;
  profitCalc: string;
  email: string;
  supplierKind: SupplierKind;
  internal: boolean;
  notes: string;
  active: boolean;
};

const BASE = {
  type: "Geral" as const,
  personType: "juridica" as PersonType,
  inscricaoEstadual: "",
  contact: "",
  profitCalc: "Por Produto",
  email: "",
  supplierKind: "produto" as SupplierKind,
  internal: false,
  notes: "",
};

export const MOCK_SUPPLIERS: PdvSupplier[] = [
  {
    ...BASE,
    code: 24101,
    document: "12.847.305/0001-66",
    razao: "DISTRIBUIDORA ATLANTICO LTDA",
    fantasia: "DISTRIBUIDORA ATLANTICO",
    cep: "29010-140",
    address: "Rua das Palmeiras",
    number: "410",
    neighborhood: "Centro",
    city: "Vitória",
    uf: "ES",
    phone: "(27) 3331-4400",
    mobile: "",
    active: true,
  },
  {
    ...BASE,
    code: 24104,
    document: "08.441.902/0001-20",
    razao: "INDUSTRIA VALE VERDE LTDA",
    fantasia: "INDUSTRIA VALE VERDE",
    cep: "",
    address: "Avenida do Contorno",
    number: "1200",
    neighborhood: "Funcionários",
    city: "Belo Horizonte",
    uf: "MG",
    phone: "(31) 98811-2233",
    mobile: "",
    active: true,
  },
  {
    ...BASE,
    code: 24140,
    document: "",
    razao: "ATACADO RIO BRANCO LTDA",
    fantasia: "ATACADO RIO BRANCO",
    cep: "",
    address: "",
    number: "",
    neighborhood: "",
    city: "",
    uf: "",
    phone: "",
    mobile: "",
    active: true,
  },
  {
    ...BASE,
    code: 24181,
    document: "",
    razao: "EMBALAGENS LITORAL SUL LTDA",
    fantasia: "EMBALAGENS LITORAL SUL",
    cep: "29140-000",
    address: "",
    number: "",
    neighborhood: "",
    city: "Cariacica",
    uf: "ES",
    phone: "",
    mobile: "",
    active: true,
  },
  {
    ...BASE,
    code: 24234,
    document: "33.109.774/0001-51",
    razao: "GRAFICA HORIZONTE LTDA",
    fantasia: "GRAFICA HORIZONTE",
    cep: "01310-100",
    address: "Rua Augusta",
    number: "88",
    neighborhood: "Consolação",
    city: "São Paulo",
    uf: "SP",
    phone: "(11) 3344-7788",
    mobile: "",
    active: true,
  },
  {
    ...BASE,
    code: 24283,
    document: "",
    razao: "LOGISTICA SERRA AZUL LTDA",
    fantasia: "LOGISTICA SERRA AZUL",
    cep: "",
    address: "",
    number: "",
    neighborhood: "",
    city: "Serra",
    uf: "ES",
    phone: "",
    mobile: "",
    active: true,
  },
  {
    ...BASE,
    code: 24310,
    document: "",
    razao: "MATERIAIS UNIAO LTDA",
    fantasia: "MATERIAIS UNIAO",
    cep: "",
    address: "",
    number: "",
    neighborhood: "",
    city: "Vila Velha",
    uf: "ES",
    phone: "(27) 99900-3344",
    mobile: "",
    active: true,
  },
  {
    ...BASE,
    code: 24355,
    document: "",
    razao: "PAPELARIA CENTRAL NORTE ME",
    fantasia: "PAPELARIA CENTRAL NORTE",
    cep: "",
    address: "",
    number: "",
    neighborhood: "",
    city: "",
    uf: "",
    phone: "",
    mobile: "",
    active: true,
  },
  {
    ...BASE,
    code: 8801,
    document: "",
    razao: "FORNECEDORA ANTIGA LTDA",
    fantasia: "FORNECEDORA ANTIGA",
    cep: "",
    address: "",
    number: "",
    neighborhood: "",
    city: "",
    uf: "",
    phone: "",
    mobile: "",
    active: false,
  },
  {
    ...BASE,
    code: 1188,
    document: "14.220.881/0001-07",
    razao: "COMERCIO BAHIA INSUMOS LTDA",
    fantasia: "COMERCIO BAHIA INSUMOS",
    cep: "",
    address: "Rua Chile",
    number: "55",
    neighborhood: "Comércio",
    city: "Salvador",
    uf: "BA",
    phone: "(71) 98811-0099",
    mobile: "",
    active: false,
  },
  {
    ...BASE,
    code: 1305,
    document: "",
    razao: "TEXTIL COSTA AZUL LTDA",
    fantasia: "TEXTIL COSTA AZUL",
    cep: "",
    address: "",
    number: "",
    neighborhood: "",
    city: "Vila Velha",
    uf: "ES",
    phone: "",
    mobile: "",
    active: false,
  },
];

export function findMockSupplier(id?: string) {
  if (!id) return undefined;
  return MOCK_SUPPLIERS.find((item) => String(item.code) === id);
}

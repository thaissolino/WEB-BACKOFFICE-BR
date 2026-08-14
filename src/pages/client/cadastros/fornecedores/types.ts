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

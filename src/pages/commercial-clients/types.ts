export type CommercialClient = {
  id: string;
  name: string;
  document: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  active: boolean;
  storesCount: number;
  createdAt: string;
  updatedAt: string;
};

export type CommercialClientStore = {
  id: string;
  name: string;
  slug: string;
  status: string;
  city: string | null;
};

export const emptyCommercialClientForm = {
  name: "",
  document: "",
  email: "",
  phone: "",
  notes: "",
  active: true,
};

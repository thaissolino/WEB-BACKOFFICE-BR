export type StoreStatus = "ACTIVE" | "INACTIVE";
export type MovementType = "IN" | "OUT" | "ADJUST";

export type Store = {
  id: string;
  name: string;
  slug: string;
  document: string | null;
  phone?: string | null;
  email?: string | null;
  status: StoreStatus;
  address: string | null;
  city: string | null;
  manager: string | null;
  commercialClientId: string | null;
  commercialClientName: string | null;
  clientId?: string | null;
  clientName?: string | null;
  storeCode?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type StoreProduct = {
  id: string;
  storeId: string;
  name: string;
  sku: string;
  quantity: number;
  price: number | null;
  /** Vínculo opcional com o catálogo oficial das invoices (tabela Product). */
  catalogProductId?: string | null;
  catalogName?: string | null;
  catalogCode?: string | null;
  createdAt: string;
  updatedAt: string;
};

/** Item do catálogo oficial (GET /invoice/product) usado para vincular estoque. */
export type CatalogProduct = {
  id: string;
  name: string;
  code: string;
  active?: boolean;
};

export type StoreMetrics = {
  products: number;
  units: number;
  skus: number;
  lastMovementAt: string | null;
};

export type StockRankItem = {
  name: string;
  sku: string;
  quantity: number;
  stores: number;
};

export type StockMovement = {
  id: string;
  storeId: string;
  storeName: string;
  productId: string;
  productName: string;
  sku: string;
  type: MovementType;
  quantity: number;
  balanceAfter: number;
  note: string | null;
  createdAt: string;
};

export function movementLabel(type: string) {
  if (type === "IN") return "Entrada";
  if (type === "OUT") return "Saída";
  return "Ajuste";
}

export function formatDateTime(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("pt-BR");
}

export function formatMoney(value?: number | null) {
  if (value === null || value === undefined) return "—";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

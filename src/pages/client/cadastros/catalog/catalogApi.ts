import { api } from "../../../../services/api"

export type CatalogKind =
  | "user"
  | "group"
  | "representative"
  | "identifier"
  | "payment"
  | "account_plan"
  | "cash_register"
  | "promotion"
  | "price_table"
  | "sector"
  | "location"
  | "expense"
  | "commission"
  | "activity_type"
  | "letter"
  | "store_group"
  | "carrier"
  | "sigep_package"
  | "shared_stock"
  | "product_category"
  | "brand"
  | "collection"

export type CatalogItem = {
  code: number
  kind: CatalogKind
  name: string
  active: boolean
  payload: Record<string, unknown>
  createdAt: string
}

export async function listCatalog(kind: CatalogKind, ativo?: boolean) {
  const { data } = await api.get(`/clients/catalog/${kind}`, {
    params: ativo === undefined ? undefined : { ativo: ativo ? "1" : "0" },
  })
  return (data.items as CatalogItem[]) ?? []
}

export async function getCatalog(kind: CatalogKind, code: number) {
  const { data } = await api.get(`/clients/catalog/${kind}/${code}`)
  return data.item as CatalogItem
}

export async function createCatalog(
  kind: CatalogKind,
  body: { name: string; active?: boolean; payload?: Record<string, unknown> },
) {
  const { data } = await api.post(`/clients/catalog/${kind}`, body)
  return data.item as CatalogItem
}

export async function updateCatalog(
  kind: CatalogKind,
  code: number,
  body: { name?: string; active?: boolean; payload?: Record<string, unknown> },
) {
  const { data } = await api.put(`/clients/catalog/${kind}/${code}`, body)
  return data.item as CatalogItem
}

export function payloadStr(item: CatalogItem, key: string) {
  const value = item.payload[key]
  if (value === true) return "Sim"
  if (value === false) return "Não"
  if (value == null) return ""
  return String(value)
}

export function formatCadDate(iso: string) {
  if (!iso) return ""
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleString("pt-BR")
}

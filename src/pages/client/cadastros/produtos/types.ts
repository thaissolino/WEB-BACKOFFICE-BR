export type PdvProduct = {
  id: string
  name: string
  code: string
  priceweightAverage: number
  weightAverage: number
  description: string
  active: boolean
  barcode: string
  ncm: string
  brand: string
  collection: string
  gender: string
  unit: string
  reference: string
  model: string
  categoryId: string
  category: string
  salePrice: number
  lojaSalePrice?: number
  tableSalePrice?: number
  costPrice: number
  lojaCostPrice?: number
  lojaCostAverage?: number
  stockQuantity: number
  lojaStock?: number
  supplierCode: string
  supplierName: string
  origin: string
  composition: string
  warranty: string
  validity: string
  height: number
  width: number
  depth: number
  photoFileId: string | null
  photoPath: string | null
  lojaName?: string
}

export type PdvProductCategory = {
  id: string
  name: string
  productCount: number
}

export function formatMoneyBr(value: number) {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/** Largura (em `ch`) do maior valor formatado da coluna, para o título centralizar em cima dos números. */
export function moneyWidthCh(values: Array<number | string | null | undefined>) {
  let width = 3.5
  for (const value of values) {
    const text = formatMoneyBr(Number(value) || 0)
    const digits = text.replace(/\D/g, "").length
    const separators = text.length - digits
    const length = digits + separators * 0.5
    if (length > width) width = length
  }
  return Math.round(width * 10) / 10
}

export function formatMoneyRs(value: number) {
  return `R$ ${formatMoneyBr(value)}`
}

export function productSalePrice(product: { tableSalePrice?: number | null; lojaSalePrice?: number | null; salePrice?: number | null }) {
  const table = Number(product.tableSalePrice)
  if (product.tableSalePrice != null && Number.isFinite(table)) return table
  return Number(product.lojaSalePrice ?? product.salePrice) || 0
}

export function lojaProductName(product: { name?: string | null; lojaName?: string | null }) {
  const custom = String(product.lojaName || "").trim()
  return custom || String(product.name || "")
}

export function lojaProductTitle(product: { name?: string | null; lojaName?: string | null }) {
  const official = String(product.name || "").trim()
  const store = String(product.lojaName || "").trim()
  const custom = Boolean(store) && store !== official
  return { main: custom ? store : official, linked: custom ? official : "" }
}

/** Tamanhos da listagem por grade no WM10 (pesquisa_preco_produto). */
export const GRADE_SIZES = [
  "S/T",
  "PP",
  "P",
  "M",
  "G",
  "GG",
  "XG",
  "XGG",
  "PENDENTE",
  "36",
  "38",
  "40",
  "42",
  "44",
  "46",
  "48",
  "50",
] as const

export const GRADE_COMPARE_OPS = ["Todos", "=", ">", ">=", "<", "<=", "<>"] as const

export type GradeCompareOp = (typeof GRADE_COMPARE_OPS)[number]

export function parseMoneyBr(value: string) {
  const n = Number(String(value).replace(/\./g, "").replace(",", "."))
  return Number.isFinite(n) ? n : 0
}

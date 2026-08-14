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
  costPrice: number
  stockQuantity: number
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

export function formatMoneyRs(value: number) {
  return `R$ ${formatMoneyBr(value)}`
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

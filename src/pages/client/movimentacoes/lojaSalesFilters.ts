import { todayIso } from "../../../utils/todayIso"
import type { LojaPdvSale } from "./LojaVendasPainel"

export type SaleFilters = {
  inicio: string
  fim: string
  cod: string
  nome: string
  caixa: string
  obs?: string
  forma?: string
  estornadas?: boolean
  vendedor?: string
}

export const EMPTY_SALE_FILTERS: SaleFilters = {
  inicio: todayIso(),
  fim: todayIso(),
  cod: "",
  nome: "",
  caixa: "Todos",
  obs: "",
  forma: "",
  estornadas: true,
}

export const ALL_SALE_FILTERS: SaleFilters = {
  inicio: "",
  fim: "",
  cod: "",
  nome: "",
  caixa: "Todos",
  obs: "",
  forma: "",
  estornadas: true,
}

export function mesAtualSaleFilters(): SaleFilters {
  const hoje = new Date()
  const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
  const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)
  const iso = (data: Date) => {
    const mes = String(data.getMonth() + 1).padStart(2, "0")
    const dia = String(data.getDate()).padStart(2, "0")
    return `${data.getFullYear()}-${mes}-${dia}`
  }
  return { ...ALL_SALE_FILTERS, inicio: iso(inicio), fim: iso(fim) }
}

export function filtroVendaAtivo(filters: SaleFilters) {
  return Boolean(
    filters.inicio
    || filters.fim
    || filters.cod.trim()
    || filters.nome.trim()
    || (filters.obs || "").trim()
    || (filters.forma || "").trim()
    || (filters.vendedor || "").trim()
    || (filters.caixa.trim() && filters.caixa.trim() !== "Todos")
    || filters.estornadas === false,
  )
}

export function filterLojaSales(sales: LojaPdvSale[], filters: SaleFilters) {
  const cod = filters.cod.trim().toLowerCase()
  const digitos = cod.replace(/\D/g, "")
  const nome = filters.nome.trim().toLowerCase()
  const caixa = filters.caixa.trim()
  const obs = (filters.obs || "").trim().toLowerCase()
  const forma = (filters.forma || "").trim().toLowerCase()
  const vendedor = (filters.vendedor || "").trim().toLowerCase()
  const porData = Boolean(filters.inicio || filters.fim)
  return sales.filter((sale) => {
    if (filters.estornadas === false && sale.status === "estornada") return false
    const code = String(sale.code ?? "").toLowerCase()
    if (cod && !code.includes(digitos || cod) && !code.includes(cod)) return false
    if (nome && !String(sale.customerName ?? "").toLowerCase().includes(nome)) return false
    if (vendedor && !String(sale.sellerName ?? "").toLowerCase().includes(vendedor)) return false
    if (obs && !String(sale.notes || "").toLowerCase().includes(obs)) return false
    const payments = Array.isArray(sale.payments) ? sale.payments : []
    if (forma && !payments.some((pay) => String(pay?.method || "").trim().toLowerCase() === forma)) return false
    if (caixa && caixa !== "Todos" && String(sale.caixaName || "") !== caixa) return false
    const dia = diaLocal(sale.finalizedAt || sale.createdAt)
    if (porData && !dia) return false
    if (filters.inicio && dia < filters.inicio) return false
    if (filters.fim && dia > filters.fim) return false
    return true
  })
}

function diaLocal(value?: string | null) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value.slice(0, 10)
  const mes = String(date.getMonth() + 1).padStart(2, "0")
  const dia = String(date.getDate()).padStart(2, "0")
  return `${date.getFullYear()}-${mes}-${dia}`
}

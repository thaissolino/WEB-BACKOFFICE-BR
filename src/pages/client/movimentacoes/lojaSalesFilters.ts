import { todayIso } from "../../../utils/todayIso"
import type { LojaPdvSale } from "./LojaVendasPainel"

export type SaleFilters = {
  inicio: string
  fim: string
  cod: string
  nome: string
  caixa: string
}

export const EMPTY_SALE_FILTERS: SaleFilters = {
  inicio: todayIso(),
  fim: todayIso(),
  cod: "",
  nome: "",
  caixa: "Todos",
}

export function filterLojaSales(sales: LojaPdvSale[], filters: SaleFilters) {
  const cod = filters.cod.trim()
  const nome = filters.nome.trim().toLowerCase()
  const caixa = filters.caixa.trim()
  const inicio = filters.inicio ? new Date(`${filters.inicio}T00:00:00`) : null
  const fim = filters.fim ? new Date(`${filters.fim}T23:59:59`) : null

  return sales.filter((sale) => {
    if (cod && !sale.code.includes(cod.replace(/\D/g, "") || cod)) return false
    if (nome && !sale.customerName.toLowerCase().includes(nome)) return false
    if (caixa && caixa !== "Todos" && sale.caixaName !== caixa) return false
    const at = new Date(sale.finalizedAt || sale.createdAt)
    if (inicio && !Number.isNaN(inicio.getTime()) && at < inicio) return false
    if (fim && !Number.isNaN(fim.getTime()) && at > fim) return false
    return true
  })
}

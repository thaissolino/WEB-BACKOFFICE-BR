import { useEffect, useState } from "react"
import { api } from "../../services/api"

export type HomeRanking = {
  loja: string
  lojista: string
  vendas: number
  total: number
}

export type HomeVenda = {
  code: string
  status: string
  total: number
  cliente: string
  criada: string
  loja: string
}

export type HomePainel = {
  lojasAtivas: number
  lojasInativas: number
  lojistas: number
  vendasHoje: number
  faturamentoHoje: number
  vendasMes: number
  faturamentoMes: number
  abertas: number
  concluidas: number
  estornadas: number
  ticketMedio: number
  ranking: HomeRanking[]
  recentes: HomeVenda[]
}

export function useHomePainel() {
  const [painel, setPainel] = useState<HomePainel | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let vivo = true
    api.get<HomePainel>("/backoffice/dashboard")
      .then(({ data }) => {
        if (!vivo) return
        setPainel(data)
      })
      .catch(() => {
        if (!vivo) return
        setError("Não foi possível carregar os números do sistema.")
      })
      .finally(() => {
        if (vivo) setLoading(false)
      })
    return () => {
      vivo = false
    }
  }, [])

  return { painel, loading, error }
}

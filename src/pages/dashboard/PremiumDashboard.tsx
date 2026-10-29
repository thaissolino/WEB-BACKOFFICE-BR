import { Link } from "react-router-dom"
import { BarChart3, Clock3, RotateCcw, Store, TrendingUp, Users } from "lucide-react"
import { useHomePainel } from "./useDashboardData"
import "./premium.css"

function reais(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

function quando(iso: string) {
  if (!iso) return "—"
  const data = new Date(iso)
  if (Number.isNaN(data.getTime())) return "—"
  return data.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
}

function statusLabel(status: string) {
  if (status === "espera") return "Em aberto"
  if (status === "estornada") return "Estornada"
  return "Concluída"
}

function numero(loading: boolean, value: number | undefined) {
  if (loading || value === undefined) return "—"
  return value.toLocaleString("pt-BR")
}

export default function PremiumDashboard() {
  const { painel, loading, error } = useHomePainel()
  const hoje = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })
  const maior = Math.max(1, ...(painel?.ranking.map((item) => item.total) || [1]))

  const cards: Array<{
    to: string
    label: string
    value: string
    note: string
    tone: string
    icon: typeof Store
  }> = [
    {
      to: "/lojas",
      label: "Lojas",
      value: numero(loading, painel?.lojasAtivas),
      note: painel ? `${painel.lojasInativas.toLocaleString("pt-BR")} inativa${painel.lojasInativas === 1 ? "" : "s"}` : "Ativas no cadastro",
      tone: "loja",
      icon: Store,
    },
    {
      to: "/cadastro-lojistas",
      label: "Lojistas",
      value: numero(loading, painel?.lojistas),
      note: "Contas do PDV",
      tone: "pessoa",
      icon: Users,
    },
    {
      to: "/gestao/movimentacoes/vendas/concluidas",
      label: "Vendas hoje",
      value: numero(loading, painel?.vendasHoje),
      note: painel ? reais(painel.faturamentoHoje) : "Faturamento do dia",
      tone: "hoje",
      icon: TrendingUp,
    },
    {
      to: "/gestao/movimentacoes/vendas/concluidas",
      label: "Vendas no mês",
      value: numero(loading, painel?.vendasMes),
      note: painel ? reais(painel.faturamentoMes) : "Faturamento do mês",
      tone: "mes",
      icon: BarChart3,
    },
    {
      to: "/gestao/movimentacoes/vendas/abertas",
      label: "Em aberto",
      value: numero(loading, painel?.abertas),
      note: painel ? `${painel.concluidas.toLocaleString("pt-BR")} concluídas` : "Ainda no caixa",
      tone: "aberta",
      icon: Clock3,
    },
    {
      to: "/gestao/movimentacoes/vendas/estornadas",
      label: "Estornadas",
      value: numero(loading, painel?.estornadas),
      note: painel ? `Ticket médio ${reais(painel.ticketMedio)}` : "Ticket do mês",
      tone: "ticket",
      icon: RotateCcw,
    },
  ]

  return (
    <div className="pdv-board pdv-home">
      <div className="pdv-board-inner">
        <header className="pdv-home-head">
          <div>
            <h1 className="pdv-board-title">Visão geral</h1>
            <p className="pdv-board-lede">{hoje}</p>
          </div>
        </header>

        {error ? <p className="pdv-error" role="alert">{error}</p> : null}

        <div className="pdv-home-grid">
          {cards.map((card) => {
            const Icon = card.icon
            return (
              <Link key={card.label} className="pdv-home-card" to={card.to} data-tone={card.tone}>
                <span className="pdv-home-icon" aria-hidden="true"><Icon size={20} strokeWidth={1.8} /></span>
                <span className="pdv-home-label">{card.label}</span>
                <strong>{card.value}</strong>
                <em>{card.note}</em>
              </Link>
            )
          })}
        </div>

        <div className="pdv-home-split">
          <section className="pdv-board-section" aria-labelledby="home-lojas">
            <div className="pdv-board-section-head">
              <h2 id="home-lojas">Lojas no mês</h2>
            </div>
            {loading ? <p className="pdv-empty">Carregando lojas...</p> : null}
            {!loading && !(painel?.ranking.length) ? <p className="pdv-empty">Nenhuma venda concluída neste mês.</p> : null}
            <ul className="pdv-home-rank">
              {(painel?.ranking || []).map((item) => (
                <li key={`${item.loja}-${item.lojista}`}>
                  <div>
                    <strong>{item.loja}</strong>
                    <span>{item.vendas.toLocaleString("pt-BR")} {item.vendas === 1 ? "venda" : "vendas"} · {reais(item.total)}</span>
                  </div>
                  <i style={{ width: `${Math.max(8, Math.round((item.total / maior) * 100))}%` }} />
                </li>
              ))}
            </ul>
          </section>

          <section className="pdv-board-section" aria-labelledby="home-vendas">
            <div className="pdv-board-section-head">
              <h2 id="home-vendas">Últimas vendas</h2>
              <Link className="pdv-home-more" to="/gestao/movimentacoes/vendas/todas">Ver todas</Link>
            </div>
            {loading ? <p className="pdv-empty">Carregando vendas...</p> : null}
            {!loading && !(painel?.recentes.length) ? <p className="pdv-empty">Nenhuma venda registrada.</p> : null}
            {painel?.recentes.length ? (
              <table className="pdv-board-table pdv-home-table">
                <thead>
                  <tr>
                    <th>Venda</th>
                    <th>Loja</th>
                    <th>Cliente</th>
                    <th>Quando</th>
                    <th>Total</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {painel.recentes.map((venda) => (
                    <tr key={`${venda.code}-${venda.criada}`}>
                      <td>{venda.code}</td>
                      <td>{venda.loja}</td>
                      <td>{venda.cliente || "—"}</td>
                      <td>{quando(venda.criada)}</td>
                      <td>{reais(venda.total)}</td>
                      <td><span className="pdv-home-status" data-status={venda.status}>{statusLabel(venda.status)}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  )
}

import { useEffect, useState } from "react"
import FilterPage, { type FilterPageProps } from "../pdv/FilterPage"
import { VendasRelatorio } from "../movimentacoes/LojaVendasPainel"
import { listCatalog } from "../cadastros/catalog/catalogApi"
import { api, parseError } from "../../../services/api"

function brl(value: string) {
  const clean = value.trim().replace(/[R$\s]/g, "")
  if (!clean) return "—"
  const normalized = clean.includes(",") ? clean.replace(/\./g, "").replace(",", ".") : clean
  const number = Number(normalized)
  if (!Number.isFinite(number)) return value
  return number.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

function LancamentosRelatorio({ title, tipo }: { title: string; tipo: "despesa" | "receita" }) {
  const [rows, setRows] = useState<string[][]>([])
  const [hint, setHint] = useState("Carregando...")
  useEffect(() => {
    listCatalog("expense")
      .then((items) => {
        const filtered = items.filter((item) => String(item.payload.tipo || "despesa") === tipo)
        setRows(filtered.map((item) => [
          item.name,
          String(item.payload.data || "—"),
          String(item.payload.caixa || "—"),
          brl(String(item.payload.total || "")),
        ]))
        setHint(filtered.length ? "" : tipo === "despesa" ? "Nenhuma despesa lançada." : "Nenhuma receita lançada.")
      })
      .catch(() => setHint("Não foi possível carregar."))
  }, [tipo])
  return (
    <FilterPage
      title={title}
      fields={[{ key: "inicio", label: "Data inicio", kind: "date" }]}
      columns={["Descrição", "Data", "Caixa", "Valor"]}
      rows={rows}
      hint={hint || undefined}
    />
  )
}

function AuditoriaEstoque() {
  const [rows, setRows] = useState<string[][]>([])
  const [hint, setHint] = useState("Carregando...")
  useEffect(() => {
    api
      .get("/clients/estoque/movimentos")
      .then(({ data }) => {
        const moves = (data.moves || []) as Array<{ at: string; product: string; kind: string; qty: number; who: string; detail: string }>
        setRows(moves.map((move) => [
          move.at ? new Date(move.at).toLocaleString("pt-BR") : "—",
          move.product,
          move.kind,
          String(move.qty),
          move.who,
          move.detail,
        ]))
        setHint(moves.length ? "" : "Nenhum movimento de estoque da loja.")
      })
      .catch((err) => setHint(parseError(err).friend || "Não foi possível carregar a auditoria."))
  }, [])
  return (
    <FilterPage
      title="AUDITORIA ESTOQUE"
      fields={[{ key: "produto", label: "Produto" }]}
      columns={["Data", "Produto", "Movimento", "Qtd", "Quem", "O que aconteceu"]}
      rows={rows}
      hint={hint || undefined}
    />
  )
}

export function RelatorioScreen({ def }: { def: FilterPageProps & { path?: string } }) {
  if (def.path && (def.path.startsWith("venda/") || def.path.startsWith("venda-gerencial/"))) {
    return <VendasRelatorio def={{ ...def, path: def.path }} />
  }
  if (def.path === "despesa") return <LancamentosRelatorio title={def.title} tipo="despesa" />
  if (def.path === "financeiro/recebimento") return <LancamentosRelatorio title="RECEITAS" tipo="receita" />
  if (def.path === "auditoria/estoque") return <AuditoriaEstoque />
  return <FilterPage {...def} />
}

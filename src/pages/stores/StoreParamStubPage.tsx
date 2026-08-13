import { useParams } from "react-router-dom"
import { usePremiumPage } from "../../components/premium/PremiumPageShell"
import { PremiumStage } from "../../components/premium/PremiumStage"
import { StoreParamStub } from "./loja/StoreParamNav"
import "./loja/loja.css"

const TITLES = {
  grupos: "Grupos de Loja",
  estoque: "Estoque Compartilhado",
  plano: "Meu Plano, Mensalidades e Contrato",
} as const

export default function StoreParamStubPage({ kind }: { kind: keyof typeof TITLES }) {
  const { id } = useParams()
  const premium = usePremiumPage("stores")
  const basePath = id ? `/lojas/${id}` : "/lojas"
  const body = <StoreParamStub title={TITLES[kind]} basePath={basePath} current={kind} />
  if (!premium) return body
  return (
    <PremiumStage title={TITLES[kind]} hint="em breve">
      {body}
    </PremiumStage>
  )
}

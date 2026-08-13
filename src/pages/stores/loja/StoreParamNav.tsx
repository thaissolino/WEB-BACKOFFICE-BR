import { NavLink } from "react-router-dom"

const ITEMS = [
  { to: "", label: "Configurações da Loja", end: true },
  { to: "?tab=integracoes", label: "Integrações", query: true },
  { to: "/grupos-de-loja", label: "Grupos de Loja" },
  { to: "/estoque-compartilhado", label: "Estoque Compartilhado" },
  { to: "/plano", label: "Meu Plano, Mensalidades e Contrato" },
] as const

export default function StoreParamNav({
  basePath,
  current,
}: {
  basePath: string
  current?: "loja" | "integracoes" | "grupos" | "estoque" | "plano"
}) {
  return (
    <nav className="loja-param-nav" aria-label="PARÂMETROS DA LOJA">
      <h2>PARÂMETROS DA LOJA</h2>
      <ul>
        {ITEMS.map((item) => {
          const href = item.query ? `${basePath}${item.to}` : `${basePath}${item.to}`
          const isCurrent =
            (current === "loja" && item.label === "Configurações da Loja") ||
            (current === "integracoes" && item.label === "Integrações") ||
            (current === "grupos" && item.label === "Grupos de Loja") ||
            (current === "estoque" && item.label === "Estoque Compartilhado") ||
            (current === "plano" && item.label === "Meu Plano, Mensalidades e Contrato")
          return (
            <li key={item.label}>
              <NavLink to={href} aria-current={isCurrent ? "page" : undefined}>
                {item.label}
              </NavLink>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

export function StoreParamStub({
  title,
  basePath,
  current,
}: {
  title: string
  basePath: string
  current: "grupos" | "estoque" | "plano"
}) {
  return (
    <div className="loja-page" lang="pt-BR">
      <StoreParamNav basePath={basePath} current={current} />
      <section className="loja-stub">
        <h1>{title}</h1>
        <p>em breve</p>
      </section>
    </div>
  )
}

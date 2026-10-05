import FilterPage, { type FilterPageProps } from "../pdv/FilterPage"
import { VendasRelatorio } from "../movimentacoes/LojaVendasPainel"

export function RelatorioScreen({ def }: { def: FilterPageProps & { path?: string } }) {
  if (def.path && (def.path.startsWith("venda/") || def.path.startsWith("venda-gerencial/"))) {
    return <VendasRelatorio def={{ ...def, path: def.path }} />
  }
  return <FilterPage {...def} />
}

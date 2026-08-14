import FilterPage, { type FilterPageProps } from "../pdv/FilterPage"

export function RelatorioScreen({ def }: { def: FilterPageProps }) {
  return <FilterPage {...def} />
}

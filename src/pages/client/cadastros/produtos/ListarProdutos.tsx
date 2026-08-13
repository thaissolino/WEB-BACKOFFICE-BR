import { FormEvent, useId, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  Eraser,
  Filter,
  LayoutGrid,
  List,
  Search,
  X,
} from "lucide-react";
import CadastroShell from "../CadastroShell";
import CategorySelect from "./CategorySelect";
import { useDismissable } from "./SelectOverlay";

const LAST_FILTER_KEY = "pdv-prod-last-filter";

type ProdutoTab = "produto" | "grade" | "kits" | "grade-beta";

type Filters = {
  codProduto: string;
  codBarra: string;
  codGrade: string;
  codFornecedor: string;
  nome: string;
  modelo: string;
  referencia: string;
  categorias: string[];
};

const EMPTY_FILTERS: Filters = {
  codProduto: "",
  codBarra: "",
  codGrade: "",
  codFornecedor: "",
  nome: "",
  modelo: "",
  referencia: "",
  categorias: [],
};

const CATALOG_ITEMS = [
  { id: "com-preco", label: "Com Preço de Venda", kind: "ok" as const },
  { id: "com-preco-estoque", label: "Com Preço de Venda e Estoque", kind: "ok" as const },
  { id: "por-grade", label: "Por Grade Com Preço de Venda", kind: "grid" as const },
  { id: "sem-preco", label: "Sem Preço de Venda", kind: "off" as const },
  { id: "sem-preco-estoque", label: "Sem Preço de Venda com Estoque", kind: "off" as const },
  { id: "simplificado", label: "Catálogo Simplificado", kind: "list" as const },
];

function readLastFilter(): Filters {
  try {
    const raw = sessionStorage.getItem(LAST_FILTER_KEY);
    if (!raw) return EMPTY_FILTERS;
    return { ...EMPTY_FILTERS, ...(JSON.parse(raw) as Filters) };
  } catch {
    return EMPTY_FILTERS;
  }
}

export default function ListarProdutos() {
  const [tab, setTab] = useState<ProdutoTab>("produto");
  const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);
  const [moreOpen, setMoreOpen] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const catalogRef = useRef<HTMLDivElement>(null);
  const catLabelId = useId();

  useDismissable(catalogOpen, () => setCatalogOpen(false), catalogRef);

  function onSearch(event: FormEvent) {
    event.preventDefault();
    sessionStorage.setItem(LAST_FILTER_KEY, JSON.stringify(draft));
  }

  function onClear() {
    setDraft(EMPTY_FILTERS);
  }

  function onLastFilter() {
    setDraft(readLastFilter());
  }

  return (
    <CadastroShell>
      <section className="pdv-cad-page pdv-prod-page" aria-labelledby="pdv-prod-list-title">
        <div className="pdv-cad-sheet pdv-prod-sheet">
          <h1 id="pdv-prod-list-title">LISTAR PRODUTO</h1>

          <div className="pdv-prod-tabs" role="tablist" aria-label="Listar produto">
            <button
              className="pdv-prod-tab"
              type="button"
              role="tab"
              aria-selected={tab === "produto"}
              onClick={() => setTab("produto")}
            >
              Produto
            </button>
            <button
              className="pdv-prod-tab"
              type="button"
              role="tab"
              aria-selected={tab === "grade"}
              onClick={() => setTab("grade")}
            >
              Grade
            </button>
            <button
              className="pdv-prod-tab"
              type="button"
              role="tab"
              aria-selected={tab === "kits"}
              onClick={() => setTab("kits")}
            >
              Kit's
            </button>
            <button
              className="pdv-prod-tab"
              type="button"
              role="tab"
              aria-selected={tab === "grade-beta"}
              onClick={() => setTab("grade-beta")}
            >
              Grade(Beta)
            </button>
          </div>

          {tab === "produto" ? (
            <form className="pdv-prod-list-form" onSubmit={onSearch}>
              <div className="pdv-prod-list-grid">
                <label>
                  Cód. Produto
                  <input
                    value={draft.codProduto}
                    onChange={(event) => setDraft({ ...draft, codProduto: event.target.value })}
                    autoComplete="off"
                  />
                </label>
                <label>
                  Cód. Barra
                  <input
                    value={draft.codBarra}
                    onChange={(event) => setDraft({ ...draft, codBarra: event.target.value })}
                    autoComplete="off"
                  />
                </label>
                <label>
                  Cód. Grade:
                  <input
                    value={draft.codGrade}
                    onChange={(event) => setDraft({ ...draft, codGrade: event.target.value })}
                    autoComplete="off"
                  />
                </label>
                <label>
                  Cód. Produto Fornecedor
                  <input
                    value={draft.codFornecedor}
                    onChange={(event) => setDraft({ ...draft, codFornecedor: event.target.value })}
                    autoComplete="off"
                  />
                </label>
                <label>
                  Nome do produto
                  <input
                    value={draft.nome}
                    onChange={(event) => setDraft({ ...draft, nome: event.target.value })}
                    autoComplete="off"
                  />
                </label>
                <label>
                  Modelo
                  <input
                    value={draft.modelo}
                    onChange={(event) => setDraft({ ...draft, modelo: event.target.value })}
                    autoComplete="off"
                  />
                </label>
                <label>
                  Referência
                  <input
                    value={draft.referencia}
                    onChange={(event) => setDraft({ ...draft, referencia: event.target.value })}
                    autoComplete="off"
                  />
                </label>
                <label>
                  <span id={catLabelId}>Categoria</span>
                  <CategorySelect
                    multiple
                    selected={draft.categorias}
                    onChange={(categorias) => setDraft({ ...draft, categorias })}
                    labelledBy={catLabelId}
                    placeholder="Nenhum selecionado"
                  />
                </label>
              </div>

              {moreOpen ? <div className="pdv-prod-more" aria-label="Mais filtros" /> : null}

              <div className="pdv-prod-toolbar">
                <button className="pdv-prod-btn" type="button" onClick={onLastFilter}>
                  <Filter size={15} strokeWidth={2.2} aria-hidden="true" />
                  Ultimo Filtro
                </button>
                <button className="pdv-prod-btn" type="button" onClick={onClear}>
                  <Eraser size={15} strokeWidth={2.2} aria-hidden="true" />
                  Limpar
                </button>
                <button
                  className="pdv-prod-btn"
                  type="button"
                  aria-expanded={moreOpen}
                  onClick={() => setMoreOpen((current) => !current)}
                >
                  <ChevronDown size={15} strokeWidth={2.2} aria-hidden="true" />
                  Mais filtros
                </button>
                <div className="pdv-prod-catalog-wrap" ref={catalogRef}>
                  <button
                    className="pdv-prod-btn pdv-prod-btn-blue"
                    type="button"
                    aria-haspopup="menu"
                    aria-expanded={catalogOpen}
                    onClick={() => setCatalogOpen((current) => !current)}
                  >
                    <List size={15} strokeWidth={2.2} aria-hidden="true" />
                    Catálogo Virtual
                  </button>
                  {catalogOpen ? (
                    <ul className="pdv-prod-catalog-menu" role="menu">
                      {CATALOG_ITEMS.map((item) => (
                        <li key={item.id} role="none">
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => setCatalogOpen(false)}
                          >
                            {item.kind === "ok" ? (
                              <Check size={16} className="pdv-prod-ico-ok" aria-hidden="true" />
                            ) : null}
                            {item.kind === "off" ? (
                              <X size={16} className="pdv-prod-ico-off" aria-hidden="true" />
                            ) : null}
                            {item.kind === "grid" ? <LayoutGrid size={16} aria-hidden="true" /> : null}
                            {item.kind === "list" ? <List size={16} aria-hidden="true" /> : null}
                            {item.label}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
                <button className="pdv-prod-btn pdv-prod-btn-blue" type="submit">
                  <Search size={15} strokeWidth={2.2} aria-hidden="true" />
                  Buscar
                </button>
              </div>
            </form>
          ) : (
            <div className="pdv-prod-stub" />
          )}
        </div>
      </section>
    </CadastroShell>
  );
}

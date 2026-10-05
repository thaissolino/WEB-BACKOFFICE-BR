import { FormEvent, useId, useRef, useState } from "react";
import { Check, ChevronDown, Eraser, Filter, LayoutGrid, List, Search, X } from "lucide-react";
import CategorySelect from "./CategorySelect";
import SearchableSelect from "./SearchableSelect";
import { useDismissable } from "./SelectOverlay";
import type { FlatOption } from "./categoryModel";
import { GRADE_COMPARE_OPS, parseMoneyBr, type GradeCompareOp } from "./types";

export const CLIENT_PRODUCT_FILTER_KEY = "pdv-prod-last-filter";
export const OFFICE_PRODUCT_FILTER_KEY = "gestao-prod-last-filter";

export type CompareFilter = { op: GradeCompareOp; value: string };

export type ProductFilters = {
  codProduto: string;
  codBarra: string;
  codGrade: string;
  codFornecedor: string;
  nome: string;
  modelo: string;
  referencia: string;
  categorias: string[];
  marca: string;
  colecao: string;
  genero: string;
  fornecedor: string;
  preco: CompareFilter;
  precoLv: CompareFilter;
  estoque: CompareFilter;
};

const EMPTY_COMPARE: CompareFilter = { op: "Todos", value: "" };

export const EMPTY_PRODUCT_FILTERS: ProductFilters = {
  codProduto: "",
  codBarra: "",
  codGrade: "",
  codFornecedor: "",
  nome: "",
  modelo: "",
  referencia: "",
  categorias: [],
  marca: "",
  colecao: "",
  genero: "",
  fornecedor: "",
  preco: EMPTY_COMPARE,
  precoLv: EMPTY_COMPARE,
  estoque: EMPTY_COMPARE,
};

const CATALOG_ITEMS = [
  { id: "com-preco", label: "Com Preço de Venda", kind: "ok" as const },
  { id: "com-preco-estoque", label: "Com Preço de Venda e Estoque", kind: "ok" as const },
  { id: "por-grade", label: "Por Grade Com Preço de Venda", kind: "grid" as const },
  { id: "sem-preco", label: "Sem Preço de Venda", kind: "off" as const },
  { id: "sem-preco-estoque", label: "Sem Preço de Venda com Estoque", kind: "off" as const },
  { id: "simplificado", label: "Catálogo Simplificado", kind: "list" as const },
];

export type FilterableProduct = {
  code?: string;
  barcode?: string;
  supplierCode?: string;
  supplierName?: string;
  name?: string;
  model?: string;
  reference?: string;
  categoryId?: string;
  category?: string;
  brand?: string;
  collection?: string;
  gender?: string;
  salePrice?: number;
  priceweightAverage?: number;
};

export function readProductFilters(key: string): ProductFilters {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return EMPTY_PRODUCT_FILTERS;
    const parsed = JSON.parse(raw) as Partial<ProductFilters>;
    return {
      ...EMPTY_PRODUCT_FILTERS,
      ...parsed,
      categorias: Array.isArray(parsed.categorias) ? parsed.categorias : [],
      preco: { ...EMPTY_COMPARE, ...parsed.preco },
      precoLv: { ...EMPTY_COMPARE, ...parsed.precoLv },
      estoque: { ...EMPTY_COMPARE, ...parsed.estoque },
    };
  } catch {
    return EMPTY_PRODUCT_FILTERS;
  }
}

function categoryLabel(id: string, options: FlatOption[]) {
  return options.find((item) => item.id === id)?.label ?? id;
}

function matchCompare(op: GradeCompareOp, actual: number, raw: string) {
  if (op === "Todos") return true;
  const expected = parseMoneyBr(raw);
  if (op === "=") return actual === expected;
  if (op === ">") return actual > expected;
  if (op === ">=") return actual >= expected;
  if (op === "<") return actual < expected;
  if (op === "<=") return actual <= expected;
  if (op === "<>") return actual !== expected;
  return true;
}

export function productMatchesFilters(
  item: FilterableProduct,
  applied: ProductFilters,
  categoryOptions: FlatOption[],
  stock: number,
) {
  const qNome = applied.nome.trim().toLowerCase();
  const qCode = applied.codProduto.trim();
  const qGrade = applied.codGrade.trim();
  const qBar = applied.codBarra.trim();
  const qForn = applied.codFornecedor.trim().toLowerCase();
  const qModel = applied.modelo.trim().toLowerCase();
  const qRef = applied.referencia.trim().toLowerCase();
  const code = item.code || "";
  const barcode = item.barcode || "";
  if (qCode && !code.includes(qCode)) return false;
  if (qGrade && !code.includes(qGrade)) return false;
  if (qBar && !barcode.includes(qBar)) return false;
  if (qForn && !`${item.supplierCode || ""} ${item.supplierName || ""}`.toLowerCase().includes(qForn)) {
    return false;
  }
  if (qNome && !(item.name || "").toLowerCase().includes(qNome)) return false;
  if (qModel && !(item.model || "").toLowerCase().includes(qModel)) return false;
  if (qRef && !(item.reference || "").toLowerCase().includes(qRef)) return false;
  if (applied.categorias.length > 0) {
    const hit = applied.categorias.some(
      (cat) =>
        item.categoryId === cat ||
        item.category === cat ||
        item.category === categoryLabel(cat, categoryOptions),
    );
    if (!hit) return false;
  }
  if (applied.marca && item.brand !== applied.marca) return false;
  if (applied.colecao && item.collection !== applied.colecao) return false;
  if (applied.genero && item.gender !== applied.genero) return false;
  if (applied.fornecedor && item.supplierName !== applied.fornecedor) return false;
  if (!matchCompare(applied.preco.op, item.salePrice || item.priceweightAverage || 0, applied.preco.value)) {
    return false;
  }
  if (!matchCompare(applied.estoque.op, stock, applied.estoque.value)) return false;
  return true;
}

function CompareField({
  label,
  prefix,
  value,
  onChange,
}: {
  label: string;
  prefix?: string;
  value: CompareFilter;
  onChange: (next: CompareFilter) => void;
}) {
  const name = useId();
  return (
    <fieldset className="pdv-prod-more-cmp">
      <legend>{label}</legend>
      <div className="pdv-prod-more-ops">
        {GRADE_COMPARE_OPS.map((op) => (
          <label key={op}>
            <input
              type="radio"
              name={name}
              checked={value.op === op}
              onChange={() => onChange({ ...value, op })}
            />
            {op}
          </label>
        ))}
      </div>
      <div className="pdv-prod-more-amt">
        {prefix ? <span>{prefix}</span> : null}
        <input
          value={value.value}
          onChange={(event) => onChange({ ...value, value: event.target.value })}
          autoComplete="off"
        />
      </div>
    </fieldset>
  );
}

export function ProductFilterForm({
  draft,
  onChange,
  onSubmit,
  onClear,
  onLastFilter,
  categoryOptions,
  brands,
  collections,
  genders,
  suppliers,
}: {
  draft: ProductFilters;
  onChange: (next: ProductFilters) => void;
  onSubmit: (event: FormEvent) => void;
  onClear: () => void;
  onLastFilter: () => void;
  categoryOptions: FlatOption[];
  brands: string[];
  collections: string[];
  genders: string[];
  suppliers: string[];
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const catalogRef = useRef<HTMLDivElement>(null);
  const catLabelId = useId();
  useDismissable(catalogOpen, () => setCatalogOpen(false), catalogRef);

  return (
    <form className="pdv-prod-list-form" onSubmit={onSubmit}>
      <div className="pdv-prod-list-grid">
        <label>
          Cód. Produto
          <input
            value={draft.codProduto}
            onChange={(event) => onChange({ ...draft, codProduto: event.target.value })}
            autoComplete="off"
          />
        </label>
        <label>
          Cód. Barra
          <input
            value={draft.codBarra}
            onChange={(event) => onChange({ ...draft, codBarra: event.target.value })}
            autoComplete="off"
          />
        </label>
        <label>
          Cód. Grade:
          <input
            value={draft.codGrade}
            onChange={(event) => onChange({ ...draft, codGrade: event.target.value })}
            autoComplete="off"
          />
        </label>
        <label>
          Cód. Produto Fornecedor
          <input
            value={draft.codFornecedor}
            onChange={(event) => onChange({ ...draft, codFornecedor: event.target.value })}
            autoComplete="off"
          />
        </label>
        <label>
          Nome do produto
          <input
            value={draft.nome}
            onChange={(event) => onChange({ ...draft, nome: event.target.value })}
            autoComplete="off"
          />
        </label>
        <label>
          Modelo
          <input
            value={draft.modelo}
            onChange={(event) => onChange({ ...draft, modelo: event.target.value })}
            autoComplete="off"
          />
        </label>
        <label>
          Referência
          <input
            value={draft.referencia}
            onChange={(event) => onChange({ ...draft, referencia: event.target.value })}
            autoComplete="off"
          />
        </label>
        <label>
          <span id={catLabelId}>Categoria</span>
          <CategorySelect
            multiple
            selected={draft.categorias}
            onChange={(categorias) => onChange({ ...draft, categorias })}
            labelledBy={catLabelId}
            placeholder="Nenhum selecionado"
            options={categoryOptions}
          />
        </label>
      </div>

      {moreOpen ? (
        <div className="pdv-prod-more" aria-label="Mais filtros">
          <label>
            Marca
            <SearchableSelect
              value={draft.marca}
              onChange={(marca) => onChange({ ...draft, marca })}
              options={brands}
              emptyLabel="Todas"
            />
          </label>
          <label>
            Coleção
            <SearchableSelect
              value={draft.colecao}
              onChange={(colecao) => onChange({ ...draft, colecao })}
              options={collections}
              emptyLabel="Todas"
            />
          </label>
          <label>
            Gênero
            <SearchableSelect
              value={draft.genero}
              onChange={(genero) => onChange({ ...draft, genero })}
              options={genders}
              emptyLabel="Todos"
            />
          </label>
          <label>
            Fornecedor
            <SearchableSelect
              value={draft.fornecedor}
              onChange={(fornecedor) => onChange({ ...draft, fornecedor })}
              options={suppliers}
              emptyLabel="Todos"
            />
          </label>
          <CompareField
            label="Preço"
            prefix="R$"
            value={draft.preco}
            onChange={(preco) => onChange({ ...draft, preco })}
          />
          <CompareField
            label="Preço LV"
            prefix="R$"
            value={draft.precoLv}
            onChange={(precoLv) => onChange({ ...draft, precoLv })}
          />
          <CompareField
            label="Estoque"
            value={draft.estoque}
            onChange={(estoque) => onChange({ ...draft, estoque })}
          />
        </div>
      ) : null}

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
                  <button type="button" role="menuitem" onClick={() => setCatalogOpen(false)}>
                    {item.kind === "ok" ? <Check size={16} className="pdv-prod-ico-ok" aria-hidden="true" /> : null}
                    {item.kind === "off" ? <X size={16} className="pdv-prod-ico-off" aria-hidden="true" /> : null}
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
  );
}

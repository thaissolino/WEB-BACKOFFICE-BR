import { FormEvent, Fragment, useEffect, useId, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  Check,
  ChevronDown,
  Eraser,
  Filter,
  LayoutGrid,
  List,
  Plus,
  Search,
  X,
} from "lucide-react";
import { api, parseError } from "../../../../services/api";
import { usePdvSession } from "../../dashboard/PdvShell";
import CadastroShell from "../CadastroShell";
import CategorySelect from "./CategorySelect";
import EstoqueGradeModal from "./EstoqueGradeModal";
import GradePhotoThumb from "./GradePhotoThumb";
import { useDismissable } from "./SelectOverlay";
import SearchableSelect from "./SearchableSelect";
import { loadProductCategories, toFlatOptions, type FlatOption } from "./categoryModel";
import {
  formatMoneyBr,
  formatMoneyRs,
  GRADE_COMPARE_OPS,
  GRADE_SIZES,
  parseMoneyBr,
  type GradeCompareOp,
  type PdvProduct,
} from "./types";

const LAST_FILTER_KEY = "pdv-prod-last-filter";

type ProdutoTab = "produto" | "grade" | "kits" | "grade-beta";

type CompareFilter = { op: GradeCompareOp; value: string };

type Filters = {
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

const EMPTY_FILTERS: Filters = {
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

function tabFromSearch(raw: string | null): ProdutoTab {
  if (raw === "grade") return "grade";
  if (raw === "kits") return "kits";
  if (raw === "grade-beta") return "grade-beta";
  return "produto";
}

function readLastFilter(): Filters {
  try {
    const raw = sessionStorage.getItem(LAST_FILTER_KEY);
    if (!raw) return EMPTY_FILTERS;
    const parsed = JSON.parse(raw) as Partial<Filters>;
    return {
      ...EMPTY_FILTERS,
      ...parsed,
      categorias: Array.isArray(parsed.categorias) ? parsed.categorias : [],
      preco: { ...EMPTY_COMPARE, ...parsed.preco },
      precoLv: { ...EMPTY_COMPARE, ...parsed.precoLv },
      estoque: { ...EMPTY_COMPARE, ...parsed.estoque },
    };
  } catch {
    return EMPTY_FILTERS;
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

function uniqField(rows: PdvProduct[], key: keyof PdvProduct) {
  const set = new Set<string>();
  for (const row of rows) {
    const value = String(row[key] ?? "").trim();
    if (value) set.add(value);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" }));
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

export default function ListarProdutos() {
  return (
    <CadastroShell>
      <ProdutosBoard />
    </CadastroShell>
  );
}

function ProdutosBoard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { storeName } = usePdvSession();
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState<ProdutoTab>(() =>
    location.pathname.includes("pesquisa-preco") ? "grade" : tabFromSearch(params.get("tipo")),
  );
  const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<Filters>(EMPTY_FILTERS);
  const [moreOpen, setMoreOpen] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [rows, setRows] = useState<PdvProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState(params.get("cod") || "");
  const [estoqueProduct, setEstoqueProduct] = useState<PdvProduct | null>(null);
  const [photoProduct, setPhotoProduct] = useState<PdvProduct | null>(null);
  const [categoryOptions, setCategoryOptions] = useState<FlatOption[]>([]);
  const catalogRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLTableRowElement>(null);
  const catLabelId = useId();

  useDismissable(catalogOpen, () => setCatalogOpen(false), catalogRef);

  function setTabAndUrl(next: ProdutoTab, code?: string) {
    setTab(next);
    const nextParams = new URLSearchParams(params);
    if (next === "produto") nextParams.delete("tipo");
    else nextParams.set("tipo", next);
    const cod = code ?? selectedId;
    if (cod) nextParams.set("cod", cod);
    else nextParams.delete("cod");
    setParams(nextParams, { replace: true });
  }

  function load() {
    setLoading(true);
    api
      .get("/clients/products", { params: { ativo: "1" } })
      .then(({ data }) => {
        setRows((data.products as PdvProduct[]) ?? []);
        setError("");
      })
      .catch((err) => {
        const parsed = parseError(err);
        setError(parsed.friend || parsed.message || "Não foi possível carregar os produtos.");
        setRows([]);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    loadProductCategories(true)
      .then((rows) => setCategoryOptions(toFlatOptions(rows)))
      .catch(() => setCategoryOptions([]));
  }, []);

  useEffect(() => {
    if (!selectedId || !selectedRef.current) return;
    selectedRef.current.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [selectedId, tab, loading]);

  const brands = useMemo(() => uniqField(rows, "brand"), [rows]);
  const collections = useMemo(() => uniqField(rows, "collection"), [rows]);
  const genders = useMemo(() => uniqField(rows, "gender"), [rows]);
  const suppliers = useMemo(() => uniqField(rows, "supplierName"), [rows]);

  const visible = useMemo(() => {
    const qNome = applied.nome.trim().toLowerCase();
    const qCode = applied.codProduto.trim();
    const qGrade = applied.codGrade.trim();
    const qBar = applied.codBarra.trim();
    const qForn = applied.codFornecedor.trim().toLowerCase();
    const qModel = applied.modelo.trim().toLowerCase();
    const qRef = applied.referencia.trim().toLowerCase();
    return rows.filter((item) => {
      if (qCode && !item.code.includes(qCode)) return false;
      if (qGrade && !item.code.includes(qGrade)) return false;
      if (qBar && !item.barcode.includes(qBar)) return false;
      if (qForn && !`${item.supplierCode} ${item.supplierName}`.toLowerCase().includes(qForn)) {
        return false;
      }
      if (qNome && !item.name.toLowerCase().includes(qNome)) return false;
      if (qModel && !item.model.toLowerCase().includes(qModel)) return false;
      if (qRef && !item.reference.toLowerCase().includes(qRef)) return false;
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
      if (!matchCompare(applied.preco.op, item.salePrice || item.priceweightAverage, applied.preco.value)) {
        return false;
      }
      if (!matchCompare(applied.estoque.op, item.stockQuantity, applied.estoque.value)) return false;
      return true;
    });
  }, [applied, rows, categoryOptions]);

  function onSearch(event: FormEvent) {
    event.preventDefault();
    sessionStorage.setItem(LAST_FILTER_KEY, JSON.stringify(draft));
    setApplied(draft);
  }

  function onClear() {
    setDraft(EMPTY_FILTERS);
    setApplied(EMPTY_FILTERS);
  }

  function onLastFilter() {
    const last = readLastFilter();
    setDraft(last);
    setApplied(last);
  }

  function selectProduct(item: PdvProduct, openEstoque = false) {
    setSelectedId(item.id);
    const nextParams = new URLSearchParams(params);
    nextParams.set("tipo", "grade");
    nextParams.set("cod", item.code);
    setParams(nextParams, { replace: true });
    setTab("grade");
    if (openEstoque) setEstoqueProduct(item);
  }

  const showForm = tab === "produto" || tab === "grade";

  return (
    <>
      <section className="pdv-cad-page pdv-prod-page" aria-labelledby="pdv-prod-list-title">
        <div className="pdv-cad-sheet pdv-prod-sheet">
          <div className="pdv-prod-cad-head">
            <h1 id="pdv-prod-list-title">LISTAR PRODUTO</h1>
            <button
              className="pdv-cad-btn pdv-cad-btn-green"
              type="button"
              onClick={() => navigate("/client/produtos/cadastrar")}
            >
              <Plus size={16} strokeWidth={2.4} aria-hidden="true" />
              Cadastrar
            </button>
          </div>

          <div className="pdv-prod-tabs" role="tablist" aria-label="Listar produto">
            <button
              className="pdv-prod-tab"
              type="button"
              role="tab"
              aria-selected={tab === "produto"}
              onClick={() => setTabAndUrl("produto")}
            >
              Produto
            </button>
            <button
              className="pdv-prod-tab"
              type="button"
              role="tab"
              aria-selected={tab === "grade"}
              onClick={() => setTabAndUrl("grade")}
            >
              Grade
            </button>
            <button
              className="pdv-prod-tab"
              type="button"
              role="tab"
              aria-selected={tab === "kits"}
              onClick={() => setTabAndUrl("kits")}
            >
              Kit's
            </button>
            <button
              className="pdv-prod-tab"
              type="button"
              role="tab"
              aria-selected={tab === "grade-beta"}
              onClick={() => setTabAndUrl("grade-beta")}
            >
              Grade(Beta)
            </button>
          </div>

          {showForm ? (
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
                      onChange={(marca) => setDraft({ ...draft, marca })}
                      options={brands}
                      emptyLabel="Todas"
                    />
                  </label>
                  <label>
                    Coleção
                    <SearchableSelect
                      value={draft.colecao}
                      onChange={(colecao) => setDraft({ ...draft, colecao })}
                      options={collections}
                      emptyLabel="Todas"
                    />
                  </label>
                  <label>
                    Gênero
                    <SearchableSelect
                      value={draft.genero}
                      onChange={(genero) => setDraft({ ...draft, genero })}
                      options={genders}
                      emptyLabel="Todos"
                    />
                  </label>
                  <label>
                    Fornecedor
                    <SearchableSelect
                      value={draft.fornecedor}
                      onChange={(fornecedor) => setDraft({ ...draft, fornecedor })}
                      options={suppliers}
                      emptyLabel="Todos"
                    />
                  </label>
                  <CompareField
                    label="Preço"
                    prefix="R$"
                    value={draft.preco}
                    onChange={(preco) => setDraft({ ...draft, preco })}
                  />
                  <CompareField
                    label="Preço LV"
                    prefix="R$"
                    value={draft.precoLv}
                    onChange={(precoLv) => setDraft({ ...draft, precoLv })}
                  />
                  <CompareField
                    label="Estoque"
                    value={draft.estoque}
                    onChange={(estoque) => setDraft({ ...draft, estoque })}
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
          ) : null}

          {error ? <p className="pdv-cad-error">{error}</p> : null}
          {loading ? <p className="pdv-cad-kicker">Carregando produtos…</p> : null}

          {tab === "produto" ? (
            <>
              {!loading && !error && visible.length === 0 ? (
                <p className="pdv-cad-kicker">
                  Nenhum produto cadastrado. Cadastre em PDV ou no módulo Gerenciar Invoices.
                </p>
              ) : null}
              {!loading && visible.length > 0 ? (
                <div className="pdv-cad-table-wrap">
                  <table className="pdv-cad-table">
                    <thead>
                      <tr>
                        <th>Cód.</th>
                        <th>Nome</th>
                        <th>Categoria</th>
                        <th>Estoque</th>
                        <th>Venda</th>
                        <th>Custo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visible.map((item) => (
                        <tr
                          key={item.id}
                          data-pick="true"
                          data-selected={selectedId === item.id ? "true" : undefined}
                          onClick={() => selectProduct(item, true)}
                        >
                          <td>{item.code}</td>
                          <td>{item.name}</td>
                          <td>{item.category || categoryLabel(item.categoryId, categoryOptions) || "—"}</td>
                          <td>{String(item.stockQuantity).replace(".", ",")}</td>
                          <td>{formatMoneyBr(item.salePrice || item.priceweightAverage)}</td>
                          <td>{formatMoneyBr(item.costPrice || item.priceweightAverage)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </>
          ) : null}

          {tab === "grade" ? (
            <>
              <h2 className="pdv-prod-grade-title">Listagem por Grade</h2>
              {!loading && visible.length === 0 ? (
                <p className="pdv-cad-kicker">Nenhum produto na grade.</p>
              ) : null}
              {!loading && visible.length > 0 ? (
                <div className="pdv-cad-table-wrap pdv-prod-grade-wrap">
                  <table className="pdv-prod-grade-table">
                    <thead>
                      <tr>
                        <th rowSpan={3}>Cod Grade</th>
                        <th rowSpan={3}>Foto</th>
                        <th rowSpan={3}>Loja</th>
                        <th rowSpan={3}>Nome Grade</th>
                        <th rowSpan={3}>Cor</th>
                        <th colSpan={GRADE_SIZES.length * 2}>Tamanho</th>
                        <th rowSpan={3}>Outras Lojas</th>
                      </tr>
                      <tr>
                        {GRADE_SIZES.map((size) => (
                          <th key={size} colSpan={2}>
                            {size}
                          </th>
                        ))}
                      </tr>
                      <tr>
                        {GRADE_SIZES.map((size) => (
                          <Fragment key={size}>
                            <th>P.V.</th>
                            <th>E.A.</th>
                          </Fragment>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {visible.map((item) => {
                        const sale = item.salePrice || item.priceweightAverage;
                        const selected = selectedId === item.id || selectedId === item.code;
                        return (
                          <tr
                            key={item.id}
                            ref={selected ? selectedRef : undefined}
                            data-selected={selected ? "true" : undefined}
                            onClick={() => selectProduct(item)}
                          >
                            <td>{item.code}</td>
                            <td>
                              <GradePhotoThumb
                                productId={item.id}
                                photoFileId={item.photoFileId}
                                name={item.name}
                                onOpen={() => setPhotoProduct(item)}
                              />
                            </td>
                            <td>{storeName || "—"}</td>
                            <td className="pdv-prod-grade-name">{item.name}</td>
                            <td>S/C</td>
                            {GRADE_SIZES.map((size) => {
                              const isDefault = size === "S/T";
                              return (
                                <Fragment key={`${item.id}-${size}`}>
                                  <td className="pdv-prod-grade-pv">{formatMoneyRs(isDefault ? sale : 0)}</td>
                                  <td className="pdv-prod-grade-ea">
                                    {isDefault ? String(item.stockQuantity).replace(".", ",") : "0"}
                                  </td>
                                </Fragment>
                              );
                            })}
                            <td>
                              <button
                                className="pdv-prod-grade-plus"
                                type="button"
                                aria-label="Outras Lojas"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  selectProduct(item, true);
                                }}
                              >
                                <Plus size={16} strokeWidth={2.6} aria-hidden="true" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </>
          ) : null}

          {tab === "kits" || tab === "grade-beta" ? <div className="pdv-prod-stub" /> : null}

          {showForm ? (
            <p className="pdv-cad-record">
              Registro 1 de {visible.length} total de {rows.length}
            </p>
          ) : null}
        </div>
      </section>

      {estoqueProduct ? (
        <EstoqueGradeModal product={estoqueProduct} onClose={() => setEstoqueProduct(null)} />
      ) : null}

      {photoProduct ? (
        <PhotoPreview product={photoProduct} onClose={() => setPhotoProduct(null)} />
      ) : null}
    </>
  );
}

function PhotoPreview({ product, onClose }: { product: PdvProduct; onClose: () => void }) {
  const [src, setSrc] = useState("");

  useEffect(() => {
    if (!product.photoFileId) return;
    let url = "";
    let cancelled = false;
    api
      .get(`/clients/products/${product.id}/photo`, { responseType: "blob" })
      .then(({ data }) => {
        if (cancelled || !(data instanceof Blob)) return;
        url = URL.createObjectURL(data);
        setSrc(url);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [product.id, product.photoFileId]);

  return (
    <div className="pdv-prod-modal-scrim" onClick={onClose}>
      <div
        className="pdv-prod-modal pdv-prod-photo-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pdv-prod-photo-view"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="pdv-prod-estoque-head">
          <h2 id="pdv-prod-photo-view">{product.name}</h2>
          <button type="button" className="pdv-prod-win-close" aria-label="Fechar" onClick={onClose}>
            <X size={12} strokeWidth={3} aria-hidden="true" />
          </button>
        </header>
        <div className="pdv-prod-photo-view">
          {src ? <img src={src} alt="" /> : <p className="pdv-cad-kicker">Nenhuma foto selecionada.</p>}
        </div>
      </div>
    </div>
  );
}

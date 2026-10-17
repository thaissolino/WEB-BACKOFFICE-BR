import { FormEvent, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Ban, Save, Settings, X } from "lucide-react";
import { api, parseError } from "../../../../services/api";
import { scrollPageToTop } from "../../dashboard/PageJumps";
import CadastroShell from "../CadastroShell";
// import EstoqueGradeModal from "./EstoqueGradeModal";
import GradePhotoThumb, { useProductPhotoUrl } from "./GradePhotoThumb";
import { loadProductCategories, toFlatOptions, type FlatOption } from "./categoryModel";
import {
  CLIENT_PRODUCT_FILTER_KEY,
  CLIENT_PRODUCT_LIST_PAGE_KEY,
  CLIENT_PRODUCT_OPEN_KEY,
  CLIENT_PRODUCT_RETURN_CODE_KEY,
  CLIENT_PRODUCT_RETURN_ID_KEY,
  EMPTY_PRODUCT_FILTERS,
  PRODUCT_PAGE_SIZE,
  ProductFilterForm,
  productFilterParams,
  readProductFilters,
  type ProductFacets,
  type ProductFilters,
} from "./productFilters";
import { formatMoneyBr, lojaProductTitle, parseMoneyBr, type PdvProduct } from "./types";

type ProdutoTab = "produto" | "grade" | "kits" | "grade-beta";

function tabFromSearch(_raw: string | null): ProdutoTab {
  return "produto";
}

function categoryLabel(id: string, options: FlatOption[]) {
  return options.find((item) => item.id === id)?.label ?? id;
}

function uniqField(rows: PdvProduct[], key: keyof PdvProduct) {
  const set = new Set<string>();
  for (const row of rows) {
    const value = String(row[key] ?? "").trim();
    if (value) set.add(value);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" }));
}

export default function ListarProdutos() {
  return (
    <CadastroShell>
      <ProdutosBoard />
    </CadastroShell>
  );
}

function maskFixedMoney(raw: string) {
  const digits = raw.replace(/\D/g, "").slice(0, 12);
  return formatMoneyBr(Number(digits || "0") / 100);
}

function EditableAmount({
  value,
  money,
  label,
  onSave,
}: {
  value: number;
  money?: boolean;
  label: string;
  onSave: (next: number) => Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingFocus = useRef(false);
  const [draft, setDraft] = useState<string | null>(null);
  const text = money ? formatMoneyBr(value) : String(value).replace(".", ",");
  const shown = draft ?? text;
  const open = draft !== null;

  useEffect(() => {
    if (!pendingFocus.current || !open) return;
    pendingFocus.current = false;
    const input = inputRef.current;
    input?.focus();
    input?.select();
  }, [open]);

  function close() {
    pendingFocus.current = false;
    setDraft(null);
    inputRef.current?.blur();
  }

  function openEdit() {
    pendingFocus.current = true;
    setDraft(text);
  }

  function commit() {
    const next = parseMoneyBr(shown);
    close();
    if (next === value) return;
    void onSave(next);
  }

  return (
    <span className="pdv-prod-edit-line" onClick={(event) => event.stopPropagation()}>
      <label className={`pdv-prod-edit${open ? " is-open" : ""}`}>
        {money ? <span className="pdv-prod-edit-symbol">R$</span> : null}
        <input
          ref={inputRef}
          className="pdv-prod-edit-input"
          aria-label={label}
          inputMode="decimal"
          readOnly={!open}
          value={shown}
          onMouseDown={(event) => {
            if (!open) event.preventDefault();
          }}
          onDoubleClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            if (!open) openEdit();
          }}
          onFocus={(event) => {
            if (!open) return;
            const input = event.currentTarget;
            requestAnimationFrame(() => input.select());
          }}
          onMouseUp={(event) => {
            if (!open) return;
            event.preventDefault();
            event.currentTarget.select();
          }}
          onChange={(event) => {
            if (!money) {
              setDraft(event.target.value);
              return;
            }
            const next = maskFixedMoney(event.target.value);
            setDraft(next);
            const input = event.currentTarget;
            requestAnimationFrame(() => input.setSelectionRange(next.length, next.length));
          }}
          onBlur={() => setDraft(null)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              close();
              return;
            }
            if (event.key !== "Enter") return;
            event.preventDefault();
            commit();
          }}
        />
      </label>
      {draft !== null ? (
        <>
          <button
            type="button"
            className="pdv-prod-edit-x"
            aria-label={`Cancelar ${label}`}
            title="Cancelar"
            onMouseDown={(event) => event.preventDefault()}
            onClick={close}
          >
            <X size={16} strokeWidth={2.6} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="pdv-prod-edit-save"
            aria-label={`Salvar ${label}`}
            title="Salvar"
            onMouseDown={(event) => event.preventDefault()}
            onClick={commit}
          >
            <Save size={16} strokeWidth={2.2} aria-hidden="true" />
          </button>
        </>
      ) : null}
    </span>
  );
}

function rememberProductList(filters: ProductFilters, nextPage: number) {
  sessionStorage.setItem(CLIENT_PRODUCT_FILTER_KEY, JSON.stringify(filters));
  sessionStorage.setItem(CLIENT_PRODUCT_LIST_PAGE_KEY, String(nextPage));
}

function readReturnProduct() {
  const id = sessionStorage.getItem(CLIENT_PRODUCT_RETURN_ID_KEY) || "";
  const code = sessionStorage.getItem(CLIENT_PRODUCT_RETURN_CODE_KEY) || "";
  let product: PdvProduct | null = null;
  try {
    const raw = sessionStorage.getItem(CLIENT_PRODUCT_OPEN_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PdvProduct;
      if (parsed?.id && (!id || parsed.id === id)) product = parsed;
    }
  } catch {
    product = null;
  }
  return { id: id || product?.id || "", code: code || product?.code || "", product };
}

function clearReturnProduct() {
  sessionStorage.removeItem(CLIENT_PRODUCT_RETURN_CODE_KEY);
  sessionStorage.removeItem(CLIENT_PRODUCT_RETURN_ID_KEY);
  sessionStorage.removeItem(CLIENT_PRODUCT_OPEN_KEY);
}

let heldReturn: { id: string; code: string; product: PdvProduct | null } | null = null;
let heldReturnReady = false;

function takeReturnedProduct(fromBack: boolean, stateId: string) {
  const empty = { id: "", code: "", product: null as PdvProduct | null };
  if (!fromBack) {
    clearReturnProduct();
    heldReturn = null;
    heldReturnReady = false;
    return empty;
  }
  if (heldReturnReady && heldReturn) return heldReturn;
  heldReturnReady = true;
  const data = readReturnProduct();
  clearReturnProduct();
  const id = data.id || stateId;
  const product = data.product && (!id || data.product.id === id) ? data.product : null;
  heldReturn = { id, code: data.code || product?.code || "", product };
  return heldReturn.id ? heldReturn : empty;
}

function ProdutosBoard() {
  const navigate = useNavigate();
  const location = useLocation();
  const backState = location.state as { returnedProductId?: string } | null;
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState<ProdutoTab>(() => tabFromSearch(params.get("tipo")));
  const [returned] = useState(() => takeReturnedProduct(Boolean(backState?.returnedProductId), backState?.returnedProductId || ""));
  const [draft, setDraft] = useState<ProductFilters>(EMPTY_PRODUCT_FILTERS);
  const [applied, setApplied] = useState<ProductFilters>(EMPTY_PRODUCT_FILTERS);
  const [rows, setRows] = useState<PdvProduct[]>(() => (returned.product ? [returned.product] : []));
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(() => (returned.product ? 1 : 0));
  const [facets, setFacets] = useState<ProductFacets>({ brands: [], collections: [], genders: [], suppliers: [] });
  const [loading, setLoading] = useState(Boolean(returned.id) && !returned.product);
  const [searched, setSearched] = useState(Boolean(returned.id));
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState(() => (returned.id ? "" : params.get("cod") || ""));
  // const [estoqueProduct, setEstoqueProduct] = useState<PdvProduct | null>(null);
  const [photoProduct, setPhotoProduct] = useState<PdvProduct | null>(null);
  const [categoryOptions, setCategoryOptions] = useState<FlatOption[]>([]);
  const selectedRef = useRef<HTMLTableRowElement>(null);

  useEffect(() => {
    const tipo = params.get("tipo");
    if (tipo !== "grade" && tipo !== "kits" && tipo !== "grade-beta") return;
    const next = new URLSearchParams(params);
    next.delete("tipo");
    setParams(next, { replace: true });
  }, [params, setParams]);

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

  function load(nextPage: number, filters: ProductFilters, remember = true, scrollTop = false) {
    if (scrollTop) scrollPageToTop();
    if (remember) rememberProductList(filters, nextPage);
    setLoading(true);
    setPage(nextPage);
    api
      .get("/clients/products", { params: productFilterParams(filters, nextPage, "loja") })
      .then(({ data }) => {
        setRows((data.products as PdvProduct[]) ?? []);
        setTotal(Number(data.total) || 0);
        if (data.facets) setFacets(data.facets as ProductFacets);
        setError("");
      })
      .catch((err) => {
        const parsed = parseError(err);
        setError(parsed.friend || parsed.message || "Não foi possível carregar os produtos.");
        setRows([]);
        setTotal(0);
      })
      .finally(() => {
        setLoading(false);
        if (scrollTop) requestAnimationFrame(() => scrollPageToTop());
      });
  }

  useEffect(() => {
    if (!returned.id) return;
    if (params.get("cod")) {
      const next = new URLSearchParams(params);
      next.delete("cod");
      setParams(next, { replace: true });
    }
    if (!returned.product) setLoading(true);
    api
      .get(`/clients/products/${returned.id}`)
      .then(({ data }) => {
        const product = data.product as PdvProduct;
        if (!product?.id) return;
        setRows([product]);
        setTotal(1);
        setPage(1);
        setSearched(true);
        setError("");
      })
      .catch((err) => {
        if (returned.product) return;
        const parsed = parseError(err);
        setError(parsed.friend || parsed.message || "Não foi possível carregar o produto.");
        setRows([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadProductCategories(true)
      .then((rows) => setCategoryOptions(toFlatOptions(rows)))
      .catch(() => setCategoryOptions([]));
  }, []);

  useEffect(() => {
    if (!selectedId || !selectedRef.current) return;
    selectedRef.current.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [selectedId, tab, loading]);

  const brands = facets.brands.length ? facets.brands : uniqField(rows, "brand");
  const collections = facets.collections.length ? facets.collections : uniqField(rows, "collection");
  const genders = facets.genders.length ? facets.genders : uniqField(rows, "gender");
  const suppliers = facets.suppliers.length ? facets.suppliers : uniqField(rows, "supplierName");
  const visible = rows;
  const pageCount = Math.max(1, Math.ceil(total / PRODUCT_PAGE_SIZE));

  function onSearch(event: FormEvent) {
    event.preventDefault();
    sessionStorage.removeItem(CLIENT_PRODUCT_RETURN_CODE_KEY);
    sessionStorage.removeItem(CLIENT_PRODUCT_RETURN_ID_KEY);
    setApplied(draft);
    setSearched(true);
    load(1, draft);
  }

  function onClear() {
    sessionStorage.removeItem(CLIENT_PRODUCT_LIST_PAGE_KEY);
    sessionStorage.removeItem(CLIENT_PRODUCT_RETURN_CODE_KEY);
    sessionStorage.removeItem(CLIENT_PRODUCT_RETURN_ID_KEY);
    setDraft(EMPTY_PRODUCT_FILTERS);
    setApplied(EMPTY_PRODUCT_FILTERS);
    setSearched(false);
    setRows([]);
    setTotal(0);
    setPage(1);
    setError("");
  }

  function onLastFilter() {
    const last = readProductFilters(CLIENT_PRODUCT_FILTER_KEY);
    setDraft(last);
    setApplied(last);
    setSearched(true);
    load(1, last);
  }

  async function saveAmount(item: PdvProduct, field: "sale" | "cost" | "stock", next: number) {
    const key = field === "stock" ? "lojaStock" : field === "sale" ? "lojaSalePrice" : "lojaCostAverage";
    const previous = Number(item[key]) || 0;
    setRows((current) => current.map((row) => (row.id === item.id ? { ...row, [key]: next } : row)));
    try {
      if (field === "stock") await api.patch(`/clients/products/${item.id}/stock`, { stockQuantity: next });
      else await api.put(`/clients/products/${item.id}`, field === "sale" ? { lojaSalePrice: next } : { lojaCostAverage: next });
      setError("");
    } catch (err) {
      setRows((current) => current.map((row) => (row.id === item.id ? { ...row, [key]: previous } : row)));
      const parsed = parseError(err);
      setError(parsed.friend || parsed.message || "Não foi possível salvar.");
    }
  }

  async function inactivateProduct(item: PdvProduct) {
    if (!window.confirm(`Inativar ${item.name}? Ele sai da lista principal.`)) return;
    try {
      await api.put(`/clients/products/${item.id}`, { name: item.name, active: false });
      setRows((current) => current.filter((row) => row.id !== item.id));
      setError("");
    } catch (err) {
      const parsed = parseError(err);
      setError(parsed.friend || parsed.message || "Não foi possível inativar o produto.");
    }
  }

  function openProduct(item: PdvProduct) {
    heldReturn = null;
    heldReturnReady = false;
    sessionStorage.setItem(CLIENT_PRODUCT_RETURN_CODE_KEY, item.code);
    sessionStorage.setItem(CLIENT_PRODUCT_RETURN_ID_KEY, item.id);
    sessionStorage.setItem(CLIENT_PRODUCT_OPEN_KEY, JSON.stringify(item));
    navigate(`/client/produtos/cadastrar?id=${item.id}`);
  }

  function selectProduct(item: PdvProduct) {
    setSelectedId(item.id);
    const nextParams = new URLSearchParams(params);
    nextParams.delete("tipo");
    nextParams.set("cod", item.code);
    setParams(nextParams, { replace: true });
    setTab("produto");
  }

  const showForm = tab === "produto" || tab === "grade";

  return (
    <>
      <section className="pdv-cad-page pdv-prod-page pdv-cat-page" aria-labelledby="pdv-prod-list-title">
        <div className="pdv-cad-sheet pdv-prod-sheet">
          <div className="pdv-prod-cad-head">
            <h1 id="pdv-prod-list-title">LISTAR PRODUTO</h1>
          </div>

          {showForm ? (
            <ProductFilterForm
              draft={draft}
              onChange={setDraft}
              onSubmit={onSearch}
              onClear={onClear}
              onLastFilter={onLastFilter}
              categoryOptions={categoryOptions}
              showInStock
              brands={brands}
              collections={collections}
              genders={genders}
              suppliers={suppliers}
            />
          ) : null}
          {error ? <p className="pdv-cad-error">{error}</p> : null}
          {loading ? <p className="pdv-cad-kicker">Carregando produtos…</p> : null}

          {tab === "produto" ? (
            <>
              {searched && !loading && !error && visible.length === 0 ? (
                <p className="pdv-cad-kicker">Nenhum produto para esse filtro.</p>
              ) : null}
              {searched && !loading && visible.length > 0 ? (
                <div className="pdv-cad-table-wrap">
                  <table className="pdv-cad-table">
                    <thead>
                      <tr>
                        <th>Cód.</th>
                        <th>Nome</th>
                        <th>Categoria</th>
                        <th className="pdv-prod-edit-head">Estoque</th>
                        <th className="pdv-prod-edit-head">Venda</th>
                        <th className="pdv-prod-edit-head">Custo médio</th>
                        <th className="pdv-prod-actions-head">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visible.map((item) => {
                        const title = lojaProductTitle(item);
                        return (
                        <tr
                          key={item.id}
                          data-pick="true"
                          data-selected={selectedId === item.id ? "true" : undefined}
                          onClick={() => selectProduct(item)}
                        >
                          <td>{item.code}</td>
                          <td>
                            <span className="pdv-prod-name">
                              {item.photoFileId ? (
                                <GradePhotoThumb
                                  productId={item.id}
                                  photoFileId={item.photoFileId}
                                  name={title.main}
                                  onOpen={() => setPhotoProduct(item)}
                                />
                              ) : null}
                              <span className="pdv-prod-name-copy">
                                <button
                                  type="button"
                                  className="pdv-prod-name-link"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    openProduct(item);
                                  }}
                                >
                                  {title.main}
                                </button>
                                {title.linked ? (
                                  <span className="pdv-prod-linked">Vinculado: {title.linked}</span>
                                ) : null}
                              </span>
                            </span>
                          </td>
                          <td>{item.category || categoryLabel(item.categoryId, categoryOptions) || "—"}</td>
                          <td className="pdv-prod-edit-cell">
                            <EditableAmount
                              value={Number(item.lojaStock) || 0}
                              label={`Estoque de ${title.main}`}
                              onSave={(next) => saveAmount(item, "stock", next)}
                            />
                          </td>
                          <td className="pdv-prod-edit-cell">
                            <EditableAmount
                              money
                              value={Number(item.lojaSalePrice) || 0}
                              label={`Preço de venda de ${title.main}`}
                              onSave={(next) => saveAmount(item, "sale", next)}
                            />
                          </td>
                          <td className="pdv-prod-edit-cell">
                            <EditableAmount
                              money
                              value={Number(item.lojaCostAverage) || 0}
                              label={`Custo médio de ${title.main}`}
                              onSave={(next) => saveAmount(item, "cost", next)}
                            />
                          </td>
                          <td className="pdv-prod-actions-cell">
                            <div className="pdv-prod-row-actions">
                              <button
                                type="button"
                                className="pdv-prod-gear"
                                title="Abrir produto"
                                aria-label={`Abrir ${title.main}`}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  openProduct(item);
                                }}
                              >
                                <Settings size={16} aria-hidden="true" />
                              </button>
                              <button
                                type="button"
                                className="pdv-prod-off"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  void inactivateProduct(item);
                                }}
                              >
                                <Ban size={14} aria-hidden="true" />
                                Inativar
                              </button>
                            </div>
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

          {/* {tab === "grade" ? (
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
                        const sale = Number(item.lojaSalePrice) || 0;
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
                                    {isDefault ? String(Number(item.lojaStock) || 0).replace(".", ",") : "0"}
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
          ) : null} */}

          {tab === "kits" || tab === "grade-beta" ? <div className="pdv-prod-stub" /> : null}

          {showForm && searched && !loading ? (
            <p className="pdv-cad-record">
              {total === 0
                ? "Nenhum registro"
                : `Página ${page} de ${pageCount} · ${rows.length} nesta página · ${total} no total`}
            </p>
          ) : null}
          {showForm && searched && pageCount > 1 ? (
            <div className="pdv-prod-toolbar">
              <button
                className="pdv-prod-btn"
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => load(page - 1, applied, true, true)}
              >
                Anterior
              </button>
              <button
                className="pdv-prod-btn"
                type="button"
                disabled={page >= pageCount || loading}
                onClick={() => load(page + 1, applied, true, true)}
              >
                Próxima
              </button>
            </div>
          ) : null}
        </div>
      </section>

      {/* {estoqueProduct ? (
        <EstoqueGradeModal product={estoqueProduct} onClose={() => setEstoqueProduct(null)} />
      ) : null} */}

      {photoProduct ? (
        <PhotoPreview product={photoProduct} onClose={() => setPhotoProduct(null)} />
      ) : null}
    </>
  );
}

function PhotoPreview({ product, onClose }: { product: PdvProduct; onClose: () => void }) {
  const src = useProductPhotoUrl(product.photoFileId);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  return createPortal(
    <div className="pdv-photo-zoom" role="dialog" aria-modal="true" aria-label={product.name} onClick={onClose}>
      <button type="button" className="pdv-photo-zoom-close" aria-label="Fechar" onClick={onClose}>
        <X size={22} strokeWidth={2.4} aria-hidden="true" />
      </button>
      <figure className="pdv-photo-zoom-frame" onClick={(event) => event.stopPropagation()}>
        {src ? <img src={src} alt={product.name} /> : <p>Carregando foto...</p>}
        <figcaption>{product.name}</figcaption>
      </figure>
    </div>,
    document.body,
  );
}

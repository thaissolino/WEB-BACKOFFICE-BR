import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Ban, Pencil, Plus, Settings } from "lucide-react";
import { api, parseError } from "../../../../services/api";
import CadastroShell from "../CadastroShell";
// import EstoqueGradeModal from "./EstoqueGradeModal";
import GradePhotoThumb from "./GradePhotoThumb";
import { loadProductCategories, toFlatOptions, type FlatOption } from "./categoryModel";
import {
  CLIENT_PRODUCT_FILTER_KEY,
  EMPTY_PRODUCT_FILTERS,
  ProductFilterForm,
  productMatchesFilters,
  readProductFilters,
  type ProductFilters,
} from "./productFilters";
import { formatMoneyBr, parseMoneyBr, type PdvProduct } from "./types";

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
  const [draft, setDraft] = useState<string | null>(null);
  const text = money ? formatMoneyBr(value) : String(value).replace(".", ",");
  return (
    <label className="pdv-prod-edit" onClick={(event) => event.stopPropagation()}>
      <input
        className="pdv-prod-edit-input"
        aria-label={label}
        inputMode="decimal"
        value={draft ?? text}
        onFocus={() => setDraft(text)}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={(event) => {
          const next = parseMoneyBr(event.currentTarget.value);
          setDraft(null);
          if (next === value) return;
          void onSave(next);
        }}
        onKeyDown={(event) => {
          if (event.key !== "Enter") return;
          event.preventDefault();
          event.currentTarget.blur();
        }}
      />
      <Pencil className="pdv-prod-edit-mark" size={14} strokeWidth={2.2} aria-hidden />
    </label>
  );
}

function ProdutosBoard() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState<ProdutoTab>(() => tabFromSearch(params.get("tipo")));
  const [draft, setDraft] = useState<ProductFilters>(EMPTY_PRODUCT_FILTERS);
  const [applied, setApplied] = useState<ProductFilters>(EMPTY_PRODUCT_FILTERS);
  const [rows, setRows] = useState<PdvProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState(params.get("cod") || "");
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

  const visible = useMemo(
    () =>
      rows.filter((item) =>
        productMatchesFilters(item, applied, categoryOptions, Number(item.lojaStock) || 0),
      ),
    [applied, rows, categoryOptions],
  );

  function onSearch(event: FormEvent) {
    event.preventDefault();
    sessionStorage.setItem(CLIENT_PRODUCT_FILTER_KEY, JSON.stringify(draft));
    setApplied(draft);
    setSearched(true);
    load();
  }

  function onClear() {
    setDraft(EMPTY_PRODUCT_FILTERS);
    setApplied(EMPTY_PRODUCT_FILTERS);
    setSearched(false);
    setRows([]);
    setError("");
  }

  function onLastFilter() {
    const last = readProductFilters(CLIENT_PRODUCT_FILTER_KEY);
    setDraft(last);
    setApplied(last);
    setSearched(true);
    load();
  }

  async function saveAmount(item: PdvProduct, field: "sale" | "cost" | "stock", next: number) {
    try {
      const { data } =
        field === "stock"
          ? await api.patch(`/clients/products/${item.id}/stock`, { stockQuantity: next })
          : await api.put(`/clients/products/${item.id}`, field === "sale" ? { salePrice: next } : { lojaCostAverage: next });
      const product = data.product as PdvProduct;
      setRows((current) => current.map((row) => (row.id === item.id ? { ...row, ...product } : row)));
      setError("");
    } catch (err) {
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
            {/*
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
            */}
          </div>

          {showForm ? (
            <ProductFilterForm
              draft={draft}
              onChange={setDraft}
              onSubmit={onSearch}
              onClear={onClear}
              onLastFilter={onLastFilter}
              categoryOptions={categoryOptions}
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
                      {visible.map((item) => (
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
                                  name={item.name}
                                  onOpen={() => setPhotoProduct(item)}
                                />
                              ) : null}
                              <span>{item.name}</span>
                            </span>
                          </td>
                          <td>{item.category || categoryLabel(item.categoryId, categoryOptions) || "—"}</td>
                          <td className="pdv-prod-edit-cell">
                            <EditableAmount
                              value={Number(item.lojaStock) || 0}
                              label={`Estoque de ${item.name}`}
                              onSave={(next) => saveAmount(item, "stock", next)}
                            />
                          </td>
                          <td className="pdv-prod-edit-cell">
                            <EditableAmount
                              money
                              value={Number(item.salePrice || item.priceweightAverage) || 0}
                              label={`Preço de venda de ${item.name}`}
                              onSave={(next) => saveAmount(item, "sale", next)}
                            />
                          </td>
                          <td className="pdv-prod-edit-cell">
                            <EditableAmount
                              money
                              value={Number(item.lojaCostAverage) || 0}
                              label={`Custo médio de ${item.name}`}
                              onSave={(next) => saveAmount(item, "cost", next)}
                            />
                          </td>
                          <td className="pdv-prod-actions-cell">
                            <div className="pdv-prod-row-actions">
                              <button
                                type="button"
                                className="pdv-prod-gear"
                                title="Abrir produto"
                                aria-label={`Abrir ${item.name}`}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  navigate(`/client/produtos/cadastrar?id=${item.id}`);
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
                      ))}
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

          {showForm && searched ? (
            <p className="pdv-cad-record">
              Registro 1 de {visible.length} total de {rows.length}
            </p>
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

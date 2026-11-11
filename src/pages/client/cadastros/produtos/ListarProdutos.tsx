import { CSSProperties, FormEvent, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Ban, Settings, X } from "lucide-react";
import { api, parseError } from "../../../../services/api";
import { avisarSalvo } from "../../avisoSalvo";
import { scrollPageToTop } from "../../dashboard/PageJumps";
import CadastroShell from "../CadastroShell";
// import EstoqueGradeModal from "./EstoqueGradeModal";
import { urlFotoProduto, useProductPhotoUrl } from "./GradePhotoThumb";
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
import { lojaProductTitle, moneyWidthCh, type PdvProduct } from "./types";
import { usePermissoesProduto, useVerCusto } from "../usuarios/useVerCusto";

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
  const location = useLocation();
  return (
    <CadastroShell>
      <ProdutosBoard key={location.key} />
    </CadastroShell>
  );
}

type PriceTable = { id: string; name: string; isDefault: boolean };
type CellField = "sale" | "cost" | "stock" | "weight" | `table:${string}`;

function money(value: number) {
  return (Number(value) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
  const verCusto = useVerCusto();
  const { verVenda, editarVenda, editarEstoque, editarPeso } = usePermissoesProduto();
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
  const [gridTables, setGridTables] = useState<PriceTable[]>([]);
  const [gridPrices, setGridPrices] = useState<Record<string, Record<string, number>>>({});
  const [editingCell, setEditingCell] = useState<{ id: string; field: CellField } | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "code">("name");
  const sortRef = useRef(sortBy);
  sortRef.current = sortBy;
  const appliedRef = useRef(applied);
  appliedRef.current = applied;
  const searchedRef = useRef(searched);
  searchedRef.current = searched;
  const selectedRef = useRef<HTMLTableRowElement>(null);
  const skipBlur = useRef(false);

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

  const buscaRef = useRef(0);
  const primeiraOrdem = useRef(true);

  useEffect(() => {
    if (primeiraOrdem.current) {
      primeiraOrdem.current = false;
      return;
    }
    if (!searchedRef.current) return;
    load(1, appliedRef.current, true, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy]);

  async function loadGrid(ids: string[]) {
    if (!ids.length) {
      setGridTables([]);
      setGridPrices({});
      return;
    }
    try {
      const { data } = await api.get("/clients/price-tables/grid", { params: { ids: ids.join(",") } });
      const tables = ((data.tables || []) as PriceTable[]).filter((table) => !table.isDefault);
      const prices: Record<string, Record<string, number>> = {};
      for (const row of (data.prices || []) as Array<{ productId: string; priceTableId: string; price: number }>) {
        if (!prices[row.productId]) prices[row.productId] = {};
        prices[row.productId][row.priceTableId] = Number(row.price) || 0;
      }
      setGridTables(tables);
      setGridPrices(prices);
    } catch {
      setGridTables([]);
      setGridPrices({});
    }
  }

  function load(nextPage: number, filters: ProductFilters, remember = true, scrollTop = false) {
    const token = ++buscaRef.current;
    if (scrollTop) scrollPageToTop();
    if (remember) rememberProductList(filters, nextPage);
    setLoading(true);
    setError("");
    setPage(nextPage);
    api
      .get("/clients/products", { params: productFilterParams(filters, nextPage, "loja", { order: sortRef.current }) })
      .then(({ data }) => {
        if (token !== buscaRef.current) return;
        setRows((data.products as PdvProduct[]) ?? []);
        setTotal(Number(data.total) || 0);
        if (data.facets) setFacets(data.facets as ProductFacets);
        setError("");
        void loadGrid(((data.products as PdvProduct[]) ?? []).map((item) => item.id));
      })
      .catch((err) => {
        if (token !== buscaRef.current) return;
        const parsed = parseError(err);
        setError(parsed.friend || parsed.message || "Não foi possível carregar os produtos.");
        setRows([]);
        setTotal(0);
        setGridTables([]);
        setGridPrices({});
      })
      .finally(() => {
        if (token !== buscaRef.current) return;
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
        void loadGrid([product.id]);
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
    setGridTables([]);
    setGridPrices({});
    setError("");
  }

  function onLastFilter() {
    const last = readProductFilters(CLIENT_PRODUCT_FILTER_KEY);
    setDraft(last);
    setApplied(last);
    setSearched(true);
    load(1, last);
  }

  async function saveAmount(item: PdvProduct, field: "sale" | "cost" | "stock" | "weight", next: number) {
    const key = field === "stock" ? "lojaStock" : field === "sale" ? "lojaSalePrice" : field === "cost" ? "lojaCostAverage" : "weightAverage";
    const previous = Number(item[key]) || 0;
    setRows((current) => current.map((row) => (row.id === item.id ? { ...row, [key]: next } : row)));
    try {
      if (field === "stock") await api.patch(`/clients/products/${item.id}/stock`, { stockQuantity: next });
      else if (field === "weight") await api.put(`/clients/products/${item.id}`, { weightAverage: next });
      else await api.put(`/clients/products/${item.id}`, field === "sale" ? { lojaSalePrice: next } : { lojaCostAverage: next });
      avisarSalvo("Salvo.");
      setError("");
    } catch (err) {
      setRows((current) => current.map((row) => (row.id === item.id ? { ...row, [key]: previous } : row)));
      const parsed = parseError(err);
      setError(parsed.friend || parsed.message || "Não foi possível salvar.");
    }
  }

  async function saveTablePrice(item: PdvProduct, tableId: string, next: number | null) {
    const table = gridTables.find((entry) => entry.id === tableId);
    const previous = gridPrices[item.id]?.[tableId];
    setGridPrices((current) => {
      const copy = { ...current, [item.id]: { ...(current[item.id] || {}) } };
      if (next == null) delete copy[item.id][tableId];
      else copy[item.id][tableId] = next;
      return copy;
    });
    try {
      await api.put(`/clients/products/${item.id}/table-prices`, {
        prices: [{ priceTableId: tableId, price: next }],
      });
      avisarSalvo("Salvo.");
      setError("");
    } catch (err) {
      setGridPrices((current) => {
        const copy = { ...current, [item.id]: { ...(current[item.id] || {}) } };
        if (previous == null) delete copy[item.id][tableId];
        else copy[item.id][tableId] = previous;
        return copy;
      });
      const parsed = parseError(err);
      setError(parsed.friend || parsed.message || `Não foi possível atualizar a tabela ${table?.name || ""}.`);
    }
  }

  function startCellEdit(item: PdvProduct, field: CellField) {
    if (field === "sale" && !editarVenda) return;
    if (field === "stock" && !editarEstoque) return;
    if (field === "weight" && !editarPeso) return;
    if (field.startsWith("table:")) {
      const current = gridPrices[item.id]?.[field.slice(6)];
      setEditingCell({ id: item.id, field });
      setEditingValue(current == null ? "" : String(current));
      return;
    }
    const current =
      field === "sale" ? Number(item.lojaSalePrice) || 0
      : field === "cost" ? Number(item.lojaCostAverage) || 0
      : field === "stock" ? Number(item.lojaStock) || 0
      : Number(item.weightAverage) || 0;
    setEditingCell({ id: item.id, field });
    setEditingValue(current === 0 ? "" : String(current));
  }

  function cancelCellEdit() {
    setEditingCell(null);
    setEditingValue("");
  }

  function commitCellEdit(item: PdvProduct) {
    if (!editingCell || editingCell.id !== item.id) return;
    const field = editingCell.field;
    const raw = editingValue.trim();
    if (field.startsWith("table:")) {
      const parsed = raw === "" ? null : parseFloat(raw.replace(",", "."));
      if (parsed != null && (Number.isNaN(parsed) || parsed < 0)) {
        cancelCellEdit();
        return;
      }
      cancelCellEdit();
      void saveTablePrice(item, field.slice(6), parsed);
      return;
    }
    const parsed = raw === "" ? 0 : parseFloat(raw.replace(",", "."));
    if (Number.isNaN(parsed) || parsed < 0) {
      cancelCellEdit();
      return;
    }
    cancelCellEdit();
    if ((field === "sale" && !editarVenda) || (field === "stock" && !editarEstoque) || (field === "weight" && !editarPeso)) return;
    if (field === "sale" || field === "cost" || field === "stock" || field === "weight") {
      void saveAmount(item, field, parsed);
    }
  }

  function cellInput(item: PdvProduct) {
    return (
      <input
        autoFocus
        type="text"
        inputMode="decimal"
        value={editingValue}
        className="gestao-prod-edit"
        onClick={(event) => event.stopPropagation()}
        onChange={(event) => {
          const value = event.target.value.replace(",", ".");
          if (/^\d*\.?\d{0,2}$/.test(value) || value === "") setEditingValue(value);
        }}
        onBlur={() => {
          if (skipBlur.current) {
            skipBlur.current = false;
            return;
          }
          commitCellEdit(item);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            skipBlur.current = true;
            commitCellEdit(item);
          }
          if (event.key === "Escape") {
            event.preventDefault();
            skipBlur.current = true;
            cancelCellEdit();
          }
        }}
      />
    );
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
              busy={loading}
              exibirPor={sortBy}
              onExibirPor={setSortBy}
            />
          ) : null}
          {error ? <p className="pdv-cad-error">{error}</p> : null}

          {tab === "produto" ? (
            <>
              {searched && !loading && !error && visible.length === 0 ? (
                <p className="pdv-cad-kicker">Nenhum produto para esse filtro.</p>
              ) : null}
              {searched && visible.length > 0 ? (
                <div className={`pdv-cad-table-wrap${loading ? " pdv-prod-refreshing" : ""}`}>
                  <table
                    className="pdv-cad-table"
                    style={{
                      "--sale-ch": `${moneyWidthCh(visible.map((product) => product.lojaSalePrice))}ch`,
                      "--cost-ch": `${moneyWidthCh(visible.map((product) => product.lojaCostAverage))}ch`,
                    } as CSSProperties}
                  >
                    <thead>
                      <tr>
                        <th>Cód</th>
                        <th>Categoria</th>
                        <th className="gestao-prod-photo">Foto</th>
                        <th>Nome</th>
                        {verVenda ? (
                          <th className="num gestao-prod-sale">
                            <span className="gestao-prod-money-title">Preço de venda</span>
                          </th>
                        ) : null}
                        {gridTables.map((table) => (
                          <th
                            key={table.id}
                            className="num gestao-prod-sale gestao-prod-table-price"
                            style={{ "--money-ch": `${moneyWidthCh(visible.map((product) => gridPrices[product.id]?.[table.id]))}ch` } as CSSProperties}
                          >
                            <span className="gestao-prod-money-title">{table.name}</span>
                          </th>
                        ))}
                        {verCusto ? (
                          <th className="num gestao-prod-cost">
                            <span className="gestao-prod-money-title">Preço de compra</span>
                          </th>
                        ) : null}
                        <th className="num">Estoque</th>
                        <th className="num">Peso</th>
                        <th className="act">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visible.map((item) => {
                        const title = lojaProductTitle(item);
                        return (
                          <tr
                            key={item.id}
                            ref={selectedId === item.id ? selectedRef : undefined}
                            data-pick="true"
                            data-selected={selectedId === item.id ? "true" : undefined}
                            onClick={() => selectProduct(item)}
                          >
                            <td className="text-sm">{item.code}</td>
                            <td className="text-sm">{item.category || categoryLabel(item.categoryId, categoryOptions) || "—"}</td>
                            <td className="gestao-prod-photo">
                              <ListPhoto
                                productId={item.id}
                                photoFileId={item.photoFileId}
                                name={title.main}
                                onOpen={() => setPhotoProduct(item)}
                              />
                            </td>
                            <td className="gestao-prod-name text-sm">
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
                              {title.linked ? <span className="pdv-prod-linked">Vinculado: {title.linked}</span> : null}
                            </td>
                            {verVenda ? (
                              <td
                                className="num text-sm gestao-prod-sale"
                                title={editarVenda ? "Clique duas vezes para editar o preço de venda" : "Preço de venda"}
                                onClick={(event) => event.stopPropagation()}
                                onDoubleClick={() => startCellEdit(item, "sale")}
                              >
                                <span className="gestao-prod-money">
                                  <span className="gestao-prod-rs">R$</span>
                                  {editingCell?.id === item.id && editingCell.field === "sale" ? cellInput(item) : <span className="cursor-text">{money(Number(item.lojaSalePrice) || 0)}</span>}
                                </span>
                              </td>
                            ) : null}
                            {gridTables.map((table) => {
                              const value = gridPrices[item.id]?.[table.id];
                              const editing = editingCell?.id === item.id && editingCell.field === `table:${table.id}`;
                              return (
                                <td
                                  key={table.id}
                                  className="num text-sm gestao-prod-sale"
                                  style={{ "--money-ch": `${moneyWidthCh(visible.map((product) => gridPrices[product.id]?.[table.id]))}ch` } as CSSProperties}
                                  title={value == null ? `Usa o preço de venda. Duplo clique para definir ${table.name}.` : `Clique duas vezes para editar ${table.name}`}
                                  onClick={(event) => event.stopPropagation()}
                                  onDoubleClick={() => startCellEdit(item, `table:${table.id}`)}
                                >
                                  {editing ? (
                                    <span className="gestao-prod-money">
                                      <span className="gestao-prod-rs">R$</span>
                                      {cellInput(item)}
                                    </span>
                                  ) : value == null ? (
                                    <span className="cursor-text text-gray-400">—</span>
                                  ) : (
                                    <span className="gestao-prod-money">
                                      <span className="gestao-prod-rs">R$</span>
                                      <span className="cursor-text">{money(value)}</span>
                                    </span>
                                  )}
                                </td>
                              );
                            })}
                            {verCusto ? (
                              <td
                                className="num text-sm gestao-prod-cost"
                                title="Clique duas vezes para editar o preço de compra"
                                onClick={(event) => event.stopPropagation()}
                                onDoubleClick={() => startCellEdit(item, "cost")}
                              >
                                <span className="gestao-prod-money">
                                  <span className="gestao-prod-rs">R$</span>
                                  {editingCell?.id === item.id && editingCell.field === "cost" ? cellInput(item) : <span className="cursor-text">{money(Number(item.lojaCostAverage) || 0)}</span>}
                                </span>
                              </td>
                            ) : null}
                            <td
                              className="num text-sm"
                              title={editarEstoque ? "Clique duas vezes para editar o estoque" : "Estoque"}
                              onClick={(event) => event.stopPropagation()}
                              onDoubleClick={() => startCellEdit(item, "stock")}
                            >
                              {editingCell?.id === item.id && editingCell.field === "stock" ? cellInput(item) : <span className="cursor-text">{String(Number(item.lojaStock) || 0)}</span>}
                            </td>
                            <td
                              className="num text-sm"
                              title={editarPeso ? "Clique duas vezes para editar o peso" : "Peso"}
                              onClick={(event) => event.stopPropagation()}
                              onDoubleClick={() => startCellEdit(item, "weight")}
                            >
                              {editingCell?.id === item.id && editingCell.field === "weight"
                                ? cellInput(item)
                                : <span className="cursor-text">{`${money(Number(item.weightAverage) || 0)} kg`}</span>}
                            </td>
                            <td className="act pdv-prod-actions-cell">
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

          {showForm && searched && (rows.length > 0 || !loading) ? (
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

function ListPhoto({
  productId,
  photoFileId,
  name,
  onOpen,
}: {
  productId: string;
  photoFileId: string | null;
  name: string;
  onOpen: () => void;
}) {
  const [remota, setRemota] = useState(false);
  const direta = remota ? "" : urlFotoProduto(productId, photoFileId);
  const loaded = useProductPhotoUrl(remota ? photoFileId : null);
  const src = direta || loaded;

  return (
    <button
      type="button"
      className="pdv-prod-grade-photo"
      title={photoFileId ? `Foto de ${name}` : "Sem foto"}
      onClick={(event) => {
        event.stopPropagation();
        if (photoFileId) onOpen();
      }}
    >
      {src ? (
        <img
          src={src}
          alt=""
          className="h-full w-full object-contain"
          onError={() => {
            if (!remota) setRemota(true);
          }}
        />
      ) : (
        <span className="text-[11px] text-gray-400">{photoFileId ? "" : "Sem foto"}</span>
      )}
    </button>
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

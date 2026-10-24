import { CSSProperties, FormEvent, useState, useEffect, useRef } from "react";
import { Plus, Ban, RotateCcw, Boxes, Loader2, Settings, Copy, X } from "lucide-react";
import Swal from "sweetalert2";
import { api } from "../../../../services/api";
import { sameProductCode } from "../utils/productBarcode";
import { useNotification } from "../../../../hooks/notification";
import { useActionLoading } from "../../context/ActionLoadingContext";
import "../../../client/cadastros/cadastros.css";
import { scrollPageToTop } from "../../../client/dashboard/PageJumps";
import { createCatalog } from "../../../client/cadastros/catalog/catalogApi";
import { isOpenStoreCategory, loadProductCategories, openCategoryRank, slugifyCategory, toFlatOptions, type FlatOption } from "../../../client/cadastros/produtos/categoryModel";
import {
  EMPTY_PRODUCT_FILTERS,
  OFFICE_PRODUCT_FILTER_KEY,
  PRODUCT_PAGE_SIZE,
  ProductFilterForm,
  productFilterParams,
  readProductFilters,
  type ProductFacets,
  type ProductFilters,
} from "../../../client/cadastros/produtos/productFilters";
import { useProductPhotoUrl } from "../../../client/cadastros/produtos/GradePhotoThumb";
import { formatMoneyBr, moneyWidthCh, parseMoneyBr } from "../../../client/cadastros/produtos/types";

export interface Product {
  id: string;
  name: string;
  code: string;
  priceweightAverage: number;
  weightAverage: number;
  salePrice?: number;
  costPrice?: number;
  stockQuantity?: number;
  description: string;
  active?: boolean;
  photoFileId?: string | null;
  barcode?: string;
  model?: string;
  reference?: string;
  categoryId?: string;
  category?: string;
  brand?: string;
  collection?: string;
  gender?: string;
  supplierCode?: string;
  supplierName?: string;
}

type FixedColumn = "code" | "category" | "photo" | "name" | "sale" | "cost" | "stock" | "weight";
type ProductColumn = FixedColumn | `table:${string}`;

type TablePriceRow = {
  id: string;
  name: string;
  slug: string;
  isDefault: boolean;
  price: number | null;
};

function pinProduct(rows: Product[], leadId: string, lead: Product | null, page: number) {
  if (!leadId || page !== 1) return rows;
  const index = rows.findIndex((item) => item.id === leadId);
  if (index === 0) return rows;
  if (index > 0) {
    const next = rows.slice();
    const [item] = next.splice(index, 1);
    next.unshift(item);
    return next;
  }
  if (lead?.id === leadId) return [lead, ...rows];
  return rows;
}

function parseMoneyDraft(raw: string) {
  const text = raw.trim();
  if (!text) return null;
  const value = parseMoneyBr(text);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

function maskModalMoney(raw: string, previous: string) {
  let digits = raw.replace(/\D/g, "").slice(0, 12);
  const prevDigits = previous.replace(/\D/g, "");
  const deleting = raw.length < previous.length;
  if (deleting && digits.replace(/0/g, "") === "") return "";
  if (deleting && (digits === prevDigits || formatMoneyBr(Number(digits || "0") / 100) === previous)) {
    digits = prevDigits.slice(0, -1);
  }
  if (!digits) return "";
  return formatMoneyBr(Number(digits) / 100);
}

function MoneyInput({
  value,
  onChange,
  placeholder,
  disabled,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center rounded-xl border border-gray-200 bg-white focus-within:border-blue-300 focus-within:ring-2 focus-within:ring-blue-400">
      <span className="pl-3 font-semibold text-gray-800">R$</span>
      <input
        type="text"
        inputMode="numeric"
        placeholder={placeholder}
        value={value}
        disabled={disabled}
        onChange={(event) => {
          const input = event.currentTarget;
          const next = maskModalMoney(event.target.value, value);
          onChange(next);
          requestAnimationFrame(() => input.setSelectionRange(next.length, next.length));
        }}
        className="w-full border-0 bg-transparent p-3 outline-none"
      />
    </div>
  );
}

const PRODUCT_COLUMNS: { id: ProductColumn; label: string; numeric?: boolean }[] = [
  { id: "code", label: "Cód" },
  { id: "category", label: "Categoria" },
  { id: "photo", label: "Foto" },
  { id: "name", label: "Nome" },
  { id: "sale", label: "Preço de venda", numeric: true },
  { id: "cost", label: "Preço de compra", numeric: true },
  { id: "stock", label: "Estoque", numeric: true },
  { id: "weight", label: "Peso", numeric: true },
];

const DEFAULT_COLUMN_ORDER = PRODUCT_COLUMNS.map((column) => column.id);
const COLUMN_ORDER_KEY = "gestao-prod-column-order";

function isColumnId(id: string): id is ProductColumn {
  return (DEFAULT_COLUMN_ORDER as string[]).includes(id) || id.startsWith("table:");
}

function readColumnOrder(): ProductColumn[] {
  try {
    const raw = JSON.parse(localStorage.getItem(COLUMN_ORDER_KEY) || "null");
    if (!Array.isArray(raw)) return [...DEFAULT_COLUMN_ORDER];
    const next = raw.filter((id): id is ProductColumn => typeof id === "string" && isColumnId(id));
    for (const id of DEFAULT_COLUMN_ORDER) {
      if (!next.includes(id)) next.push(id);
    }
    return next;
  } catch {
    return [...DEFAULT_COLUMN_ORDER];
  }
}

function placeTableColumns(order: ProductColumn[], tables: Array<{ id: string }>): ProductColumn[] {
  const tableIds = tables.map((table) => `table:${table.id}` as ProductColumn);
  const allowed = new Set<string>([...DEFAULT_COLUMN_ORDER, ...tableIds]);
  const next = order.filter((id) => allowed.has(id));
  for (const id of DEFAULT_COLUMN_ORDER) {
    if (!next.includes(id)) next.push(id);
  }
  let at = next.indexOf("sale") + 1;
  for (const id of tableIds) {
    if (next.includes(id)) continue;
    next.splice(at, 0, id);
    at += 1;
  }
  return next;
}

function fieldOptions(rows: Product[], key: keyof Product) {
  const set = new Set<string>();
  for (const row of rows) {
    const value = String(row[key] ?? "").trim();
    if (value) set.add(value);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" }));
}

function ProductThumb({
  photoFileId,
  onFile,
  disabled,
  large,
}: {
  productId: string;
  photoFileId?: string | null;
  onFile: (file: File | undefined) => void;
  disabled?: boolean;
  large?: boolean;
}) {
  const src = useProductPhotoUrl(photoFileId);
  const box = large ? "h-28 w-28" : "h-14 w-14";
  const fit = large ? "max-h-28 max-w-28" : "max-h-14 max-w-14";

  return (
    <label
      className="relative inline-flex shrink-0 cursor-pointer items-center justify-center"
      title={photoFileId ? "Clique para trocar a foto" : "Clique para adicionar a foto"}
    >
      {src ? (
        <img src={src} alt="" decoding="async" className={`${fit} h-auto w-auto rounded-lg border border-gray-200 bg-white object-contain`} />
      ) : (
        <span
          className={`flex ${box} items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 text-[11px] text-gray-400`}
        >
          {photoFileId ? "" : "Sem foto"}
        </span>
      )}
      <input
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        disabled={disabled}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          onFile(file);
        }}
      />
    </label>
  );
}

export function ProductsTab() {
  // allProducts = lista bruta vinda do backend, só depois de Buscar.
  // products = essa lista filtrada pelos campos do formulário.
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [facets, setFacets] = useState<ProductFacets>({ brands: [], collections: [], genders: [], suppliers: [] });
  const [showModal, setShowModal] = useState(false);
  const [duplicateAsk, setDuplicateAsk] = useState(false);
  const [copyNotice, setCopyNotice] = useState("");
  const leadIdRef = useRef("");
  const leadProductRef = useRef<Product | null>(null);
  const [newCategoryOpen, setNewCategoryOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sortBy, setSortBy] = useState<"name" | "code">("name");
  const [tablePrices, setTablePrices] = useState<TablePriceRow[]>([]);
  const [gridTables, setGridTables] = useState<TablePriceRow[]>([]);
  const [gridPrices, setGridPrices] = useState<Record<string, Record<string, number>>>({});
  const [tableDrafts, setTableDrafts] = useState<Record<string, string>>({});
  const [costDraft, setCostDraft] = useState("");
  const [draft, setDraft] = useState<ProductFilters>(EMPTY_PRODUCT_FILTERS);
  const [applied, setApplied] = useState<ProductFilters>(EMPTY_PRODUCT_FILTERS);
  const [searched, setSearched] = useState(false);
  const searchedRef = useRef(false);
  const [categoryOptions, setCategoryOptions] = useState<FlatOption[]>([]);
  const [columns, setColumns] = useState<ProductColumn[]>(readColumnOrder);
  const [draggingColumn, setDraggingColumn] = useState<ProductColumn | null>(null);
  const draggingColumnRef = useRef<ProductColumn | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [showInactive, setShowInactive] = useState(false);
  const [editingCell, setEditingCell] = useState<{
    id: string;
    field: "price" | "weight" | "sale" | "cost" | "stock" | `table:${string}`;
  } | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [cellNotice, setCellNotice] = useState("");
  const { setOpenNotification } = useNotification();
  const { isLoading: isActionLoading, executeAction } = useActionLoading();

  const appliedRef = useRef(applied);
  appliedRef.current = applied;
  const sortRef = useRef(sortBy);
  sortRef.current = sortBy;
  const inactiveRef = useRef(showInactive);
  inactiveRef.current = showInactive;

  const loadGridPrices = async (ids: string[]) => {
    if (!ids.length) {
      setGridTables([]);
      setGridPrices({});
      return;
    }
    try {
      const { data } = await api.get("/clients/price-tables/grid", { params: { ids: ids.join(",") } });
      const tables = ((data.tables || []) as TablePriceRow[]).filter((table) => !table.isDefault);
      const prices: Record<string, Record<string, number>> = {};
      for (const row of (data.prices || []) as Array<{ productId: string; priceTableId: string; price: number }>) {
        if (!prices[row.productId]) prices[row.productId] = {};
        prices[row.productId][row.priceTableId] = Number(row.price) || 0;
      }
      setGridTables(tables);
      setGridPrices(prices);
      setColumns((current) => placeTableColumns(current, tables));
    } catch (error) {
      console.error("Erro ao buscar tabelas de preço:", error);
    }
  };

  const fetchData = async (filters: ProductFilters, nextPage: number, scrollTop = false) => {
    if (scrollTop) scrollPageToTop();
    setIsLoading(true);
    setPage(nextPage);
    try {
      const { data } = await api.get("/clients/products", {
        params: productFilterParams(filters, nextPage, "backoffice", {
          ativo: inactiveRef.current ? "0" : "1",
          order: sortRef.current,
        }),
      });
      const rows = pinProduct((data.products || []) as Product[], leadIdRef.current, leadProductRef.current, nextPage);
      setAllProducts(rows);
      void loadGridPrices(rows.map((product) => product.id));
      setTotal(Number(data.total) || 0);
      if (data.facets) setFacets(data.facets as ProductFacets);
    } catch (error) {
      console.error("Erro ao buscar produtos:", error);
      setAllProducts([]);
      setGridTables([]);
      setGridPrices({});
      setTotal(0);
    } finally {
      setIsLoading(false);
      if (scrollTop) requestAnimationFrame(() => scrollPageToTop());
    }
  };

  useEffect(() => {
    loadProductCategories(true)
      .then((rows) =>
        setCategoryOptions(
          toFlatOptions(rows.filter((item) => isOpenStoreCategory(item.id, item.name) || item.storePick))
            .sort((a, b) => openCategoryRank(a.id, a.label) - openCategoryRank(b.id, b.label))
            .map((item) => ({ ...item, depth: 0 })),
        ),
      )
      .catch(() => setCategoryOptions([]));
  }, []);

  useEffect(() => {
    if (!searchedRef.current) return;
    void fetchData(appliedRef.current, 1);
  }, [showInactive, sortBy]);

  const products = allProducts;
  const pageCount = Math.max(1, Math.ceil(total / PRODUCT_PAGE_SIZE));
  const brands = facets.brands.length ? facets.brands : fieldOptions(allProducts, "brand");
  const collections = facets.collections.length ? facets.collections : fieldOptions(allProducts, "collection");
  const genders = facets.genders.length ? facets.genders : fieldOptions(allProducts, "gender");
  const suppliers = facets.suppliers.length ? facets.suppliers : fieldOptions(allProducts, "supplierName");

  function runSearch(filters: ProductFilters) {
    leadIdRef.current = "";
    leadProductRef.current = null;
    sessionStorage.setItem(OFFICE_PRODUCT_FILTER_KEY, JSON.stringify(filters));
    setApplied(filters);
    searchedRef.current = true;
    setSearched(true);
    void fetchData(filters, 1);
  }

  function onSearch(event: FormEvent) {
    event.preventDefault();
    runSearch(draft);
  }

  function onClear() {
    leadIdRef.current = "";
    leadProductRef.current = null;
    setDraft(EMPTY_PRODUCT_FILTERS);
    setApplied(EMPTY_PRODUCT_FILTERS);
    searchedRef.current = false;
    setSearched(false);
    setAllProducts([]);
    setTotal(0);
    setPage(1);
    setSelectedProducts([]);
  }

  function onLastFilter() {
    const last = readProductFilters(OFFICE_PRODUCT_FILTER_KEY);
    setDraft(last);
    runSearch(last);
  }

  async function showSavedProduct(id: string, fallback: Product) {
    let product = fallback;
    try {
      const { data } = await api.get(`/clients/products/${id}`);
      if (data?.product?.id) product = data.product as Product;
    } catch (error) {
      console.error("Erro ao abrir o produto salvo:", error);
    }
    const filters: ProductFilters = {
      ...EMPTY_PRODUCT_FILTERS,
      codProduto: String(product.code || fallback.code || "").trim(),
    };
    leadIdRef.current = "";
    leadProductRef.current = null;
    setCopyNotice("");
    setDraft(filters);
    setApplied(filters);
    searchedRef.current = true;
    setSearched(true);
    sessionStorage.setItem(OFFICE_PRODUCT_FILTER_KEY, JSON.stringify(filters));
    setAllProducts([product]);
    setTotal(1);
    setPage(1);
    setSelectedProducts([]);
    void loadGridPrices([product.id]);
    scrollPageToTop();
  }

  const loadTablePrices = async (product: Product | null) => {
    setCostDraft(product && Number(product.costPrice) ? formatMoneyBr(Number(product.costPrice)) : "");
    try {
      const { data } = product?.id
        ? await api.get(`/clients/products/${product.id}/table-prices`)
        : await api.get("/clients/price-tables");
      const tables = ((data.tables || []) as TablePriceRow[]).map((table) => ({ ...table, price: table.price ?? null }));
      setTablePrices(tables);
      const drafts: Record<string, string> = {};
      for (const table of tables) {
        const value = table.price != null ? table.price : table.isDefault ? Number(product?.salePrice) || null : null;
        drafts[table.id] = value == null ? "" : formatMoneyBr(Number(value) || 0);
      }
      setTableDrafts(drafts);
    } catch {
      setTablePrices([]);
      setTableDrafts({});
    }
  };

  function closeProduct() {
    setShowModal(false);
    setDuplicateAsk(false);
    setCopyNotice("");
    setCurrentProduct(null);
    if (leadIdRef.current && searchedRef.current) {
      void fetchData(appliedRef.current, 1, true);
    }
  }

  useEffect(() => {
    if (!showModal) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      closeProduct();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showModal]);

  const handleEdit = (product: Product) => {
    setDuplicateAsk(false);
    setCopyNotice("");
    setNewCategoryOpen(false);
    setNewCategoryName("");
    setCurrentProduct(product);
    setShowModal(true);
    void loadTablePrices(product);
  };

  const createCategory = async () => {
    const name = newCategoryName.trim();
    if (!name || !currentProduct) return;
    try {
      const slug = slugifyCategory(name);
      await createCatalog("product_category", {
        name,
        payload: {
          slug,
          parentSlug: "",
          grade: "Sem Grade",
          commission: "0,00",
          discount: "0,00",
          profit: "0,00",
          type: "Produto c/ Controle de Estoque",
          description: "",
          ncmSuggest: false,
          ncm: "",
          defaultDiscount: false,
          defaultDiscountValue: "0,00",
          storePick: true,
        },
      });
      setCategoryOptions((current) =>
        current.some((item) => item.id === slug) ? current : [...current, { id: slug, label: name, depth: 0 }],
      );
      setCurrentProduct({ ...currentProduct, categoryId: slug, category: name });
      setNewCategoryName("");
      setNewCategoryOpen(false);
    } catch (error) {
      console.error("Erro ao criar categoria:", error);
      Swal.fire({
        icon: "error",
        title: "Erro",
        text: "Não foi possível criar a categoria.",
        buttonsStyling: false,
        customClass: {
          confirmButton: "bg-red-600 text-white hover:bg-red-700 px-4 py-2 rounded font-semibold",
        },
      });
    }
  };

  const handleSelectProduct = (id: string) => {
    setSelectedProducts((prev) =>
      prev.includes(id) ? prev.filter((pId) => pId !== id) : [...prev, id]
    );
  };

  const setProductsActive = async (ids: string[], active: boolean) => {
    if (isActionLoading || ids.length === 0) return;

    const result = await Swal.fire({
      title: active ? "Ativar produtos?" : "Inativar produtos?",
      text: active
        ? `${ids.length} produto(s) voltam para a lista de ativos.`
        : `${ids.length} produto(s) saem da lista principal. Para ver de novo, marque "Ver desativados".`,
      icon: "warning",
      showCancelButton: true,
      buttonsStyling: false,
      customClass: {
        confirmButton: active
          ? "bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded font-semibold mr-2"
          : "bg-amber-600 text-white hover:bg-amber-700 px-4 py-2 rounded font-semibold mr-2",
        cancelButton: "bg-gray-500 text-white hover:bg-gray-600 px-4 py-2 rounded font-semibold",
      },
      confirmButtonText: active ? "Sim, ativar" : "Sim, inativar",
      cancelButtonText: "Cancelar",
    });

    if (!result.isConfirmed) return;

    await executeAction(async () => {
      await Promise.all(ids.map((id) => api.patch(`/invoice/product/${id}`, { active })));
      const removidos = new Set(ids);
      setAllProducts((current) => current.filter((product) => !removidos.has(product.id)));
      setTotal((current) => Math.max(0, current - ids.length));
      setSelectedProducts([]);
      setOpenNotification({
        type: "success",
        title: "Sucesso!",
        notification: active
          ? `${ids.length} produto(s) ativado(s).`
          : `${ids.length} produto(s) inativado(s).`,
      });
    }, `setProductsActive-${active}`).catch((error) => {
      console.error("Erro ao alterar status do produto:", error);
      Swal.fire({
        icon: "error",
        title: "Erro!",
        text: active
          ? "Não foi possível ativar os produtos."
          : "Não foi possível inativar os produtos.",
        confirmButtonText: "OK",
        buttonsStyling: false,
        customClass: {
          confirmButton:
            "!bg-blue-600 !text-white hover:!bg-blue-700 px-5 py-2.5 rounded-md font-semibold shadow-sm",
        },
      });
    });
  };

  const applyAverageCost = async () => {
    if (isActionLoading || selectedProducts.length === 0) return;
    const chosen = allProducts.filter((product) => selectedProducts.includes(product.id));
    if (!chosen.length) return;
    const money = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    const qtyOf = (product: Product) => Math.max(0, Number(product.stockQuantity) || 0);
    const costOf = (product: Product) => Math.max(0, Number(product.costPrice) || 0);
    const priced = chosen.filter((product) => costOf(product) > 0 && qtyOf(product) > 0);
    const totalQty = priced.reduce((sum, product) => sum + qtyOf(product), 0);
    const totalValue = priced.reduce((sum, product) => sum + qtyOf(product) * costOf(product), 0);
    const preview = priced.length > 1 && totalQty > 0 ? totalValue / totalQty : 0;
    const skipped = chosen.length - priced.length;
    const lines = priced
      .slice(0, 6)
      .map((product) => `${product.name}: ${qtyOf(product)} un. a ${money(costOf(product))}`)
      .join("<br>");
    const more = priced.length > 6 ? `<br>e mais ${priced.length - 6} produto(s)` : "";
    const leftOut = skipped
      ? `<br><br>${skipped} marcado(s) com preço ou estoque zero ficam de fora e não mudam.`
      : "";
    const together =
      chosen.length > 1
        ? priced.length > 1
          ? `<br><br>A média pelo estoque fica ${money(preview)} e entra só nos produtos acima.`
          : "<br><br>Precisa de pelo menos dois produtos com preço de compra e estoque maiores que zero."
        : "<br><br>Usa as entradas pagas deste produto.";
    const result = await Swal.fire({
      title: "Calcular custo médio?",
      html: `${lines}${more}${together}${leftOut}`,
      icon: "question",
      showCancelButton: true,
      buttonsStyling: false,
      customClass: {
        confirmButton: "!bg-blue-600 !text-white hover:!bg-blue-700 px-5 py-2.5 rounded-md font-semibold shadow-sm mr-2",
        cancelButton: "!bg-gray-500 !text-white hover:!bg-gray-600 px-5 py-2.5 rounded-md font-semibold shadow-sm",
      },
      confirmButtonText: "Calcular",
      cancelButtonText: "Cancelar",
    });
    if (!result.isConfirmed) return;
    if (chosen.length > 1 && priced.length < 2) return;

    await executeAction(async () => {
      const included = chosen.length > 1 ? priced : chosen;
      const before = new Map(included.map((product) => [product.id, Number(product.costPrice) || 0]));
      const { data } = await api.post("/clients/products/average-cost", {
        ids: included.map((product) => product.id),
      });
      const updated = (data.products || []) as Product[];
      setAllProducts((prev) =>
        prev.map((product) => {
          const next = updated.find((item) => item.id === product.id);
          return next ? { ...product, costPrice: Number(next.costPrice) || 0 } : product;
        }),
      );
      setSelectedProducts([]);
      const changed = updated.filter(
        (product) => Math.abs((Number(product.costPrice) || 0) - (before.get(product.id) || 0)) >= 0.01,
      );
      const average = Number(data.average) || 0;
      setOpenNotification({
        type: "success",
        title: "Custo médio",
        notification:
          chosen.length > 1 && average > 0
            ? `Preço de compra atualizado para ${money(average)} em ${changed.length} produto(s). Zerados ficaram de fora.`
            : changed.length
              ? `${changed.length} produto(s) tiveram o custo médio atualizado.`
              : "Nenhum produto mudou.",
      });
    }, "applyAverageCost").catch((error) => {
      console.error("Erro ao aplicar custo médio:", error);
      Swal.fire({
        icon: "error",
        title: "Erro!",
        text: "Não foi possível calcular o custo médio.",
        confirmButtonText: "OK",
        buttonsStyling: false,
        customClass: {
          confirmButton: "!bg-blue-600 !text-white hover:!bg-blue-700 px-5 py-2.5 rounded-md font-semibold shadow-sm",
        },
      });
    });
  };

  const saveProductPhoto = async (product: Product, file: File | undefined) => {
    if (!file) return;
    try {
      const body = new FormData();
      body.append("file", file);
      const { data } = await api.post(`/clients/products/${product.id}/photo`, body);
      const photoFileId = (data?.product?.photoFileId as string | undefined) || "updated";
      setAllProducts((current) =>
        current.map((item) => (item.id === product.id ? { ...item, photoFileId } : item)),
      );
      setCurrentProduct((current) =>
        current && current.id === product.id ? { ...current, photoFileId } : current,
      );
    } catch (error) {
      console.error("Erro ao salvar foto do produto:", error);
      Swal.fire({
        icon: "error",
        title: "Erro",
        text: "Não foi possível salvar a imagem.",
        confirmButtonText: "OK",
        buttonsStyling: false,
        customClass: {
          confirmButton:
            "!bg-blue-600 !text-white hover:!bg-blue-700 px-5 py-2.5 rounded-md font-semibold",
        },
      });
    }
  };

  const deleteProductPhoto = async (product: Product) => {
    try {
      await api.delete(`/clients/products/${product.id}/photo`);
      setAllProducts((current) =>
        current.map((item) => (item.id === product.id ? { ...item, photoFileId: null } : item)),
      );
      setCurrentProduct((current) =>
        current && current.id === product.id ? { ...current, photoFileId: null } : current,
      );
    } catch (error) {
      console.error("Erro ao apagar foto do produto:", error);
      Swal.fire({
        icon: "error",
        title: "Erro",
        text: "Não foi possível apagar a imagem.",
        confirmButtonText: "OK",
        buttonsStyling: false,
        customClass: {
          confirmButton:
            "!bg-blue-600 !text-white hover:!bg-blue-700 px-5 py-2.5 rounded-md font-semibold",
        },
      });
    }
  };

  const handleSave = async () => {
    if (isActionLoading) return;
    if (!currentProduct) return;

    await executeAction(async () => {
      const trimmedName = currentProduct.name.trim();
      const trimmedCode = currentProduct.code.trim();
      if (trimmedName === "" || trimmedCode === "") {
        Swal.fire({
          icon: "error",
          title: "Erro",
          text: "Nome e código do produto são obrigatórios.",
          buttonsStyling: false,
          customClass: {
            confirmButton: "bg-red-600 text-white hover:bg-red-700 px-4 py-2 rounded font-semibold",
          },
        });
        return;
      }

      // Validar se já existe produto com o mesmo nome (case-insensitive) ou código
      const existingProduct = products.find(
        (p) =>
          p.id !== currentProduct.id && // Não verificar o próprio produto se estiver editando
          (p.name.toLowerCase() === trimmedName.toLowerCase() || sameProductCode(p.code, trimmedCode))
      );

      if (existingProduct) {
        Swal.fire({
          icon: "error",
          title: "Produto duplicado!",
          text: `Já existe um produto com o nome "${existingProduct.name}" ou código "${existingProduct.code}".`,
          buttonsStyling: false,
          customClass: {
            confirmButton: "bg-red-600 text-white hover:bg-red-700 px-4 py-2 rounded font-semibold",
          },
        });
        return;
      }

      try {
      let createdProduct: Product | null = null;
      if (currentProduct.id) {
        const categoryId = currentProduct.categoryId || "";
        const category = categoryOptions.find((item) => item.id === categoryId)?.label || "";
        await api.patch(`/invoice/product/${currentProduct.id}`, currentProduct);
        const padrao = tablePrices.find((table) => table.isDefault);
        const salePrice = padrao ? parseMoneyDraft(tableDrafts[padrao.id] || "") : null;
        const nextCost = parseMoneyDraft(costDraft) ?? 0;
        const costChanged = Math.abs(nextCost - (Number(currentProduct.costPrice) || 0)) >= 0.01;
        await api.put(`/clients/products/${currentProduct.id}`, {
          name: currentProduct.name,
          ...(currentProduct.code ? { code: String(currentProduct.code) } : {}),
          categoryId,
          category,
          priceweightAverage: Number(currentProduct.priceweightAverage) || 0,
          ...(costChanged ? { costPrice: nextCost } : {}),
          ...(salePrice != null ? { salePrice } : {}),
        });
        await api.put(`/clients/products/${currentProduct.id}/table-prices`, {
          prices: tablePrices.map((table) => ({
            priceTableId: table.id,
            price: parseMoneyDraft(tableDrafts[table.id] || ""),
          })),
        });
        setOpenNotification({
          type: "success",
          title: "Sucesso!",
          notification: "Produto atualizado com sucesso!",
        });
      } else {
        const { data: created } = await api.post("/invoice/product", currentProduct);
        createdProduct = created;
        if (created?.id) {
          const padrao = tablePrices.find((table) => table.isDefault);
          const salePrice = padrao ? parseMoneyDraft(tableDrafts[padrao.id] || "") : null;
          await api.put(`/clients/products/${created.id}`, {
            name: currentProduct.name,
            ...(currentProduct.code ? { code: String(currentProduct.code) } : {}),
            costPrice: parseMoneyDraft(costDraft) ?? 0,
            ...(salePrice != null ? { salePrice } : {}),
          });
          await api.put(`/clients/products/${created.id}/table-prices`, {
            prices: tablePrices.map((table) => ({
              priceTableId: table.id,
              price: parseMoneyDraft(tableDrafts[table.id] || ""),
            })),
          });
        }
        setOpenNotification({
          type: "success",
          title: "Sucesso!",
          notification: "Produto criado com sucesso!",
        });
      }
        window.dispatchEvent(new Event("productsUpdated"));
        const savedId = currentProduct.id || createdProduct?.id || "";
        setShowModal(false);
        setDuplicateAsk(false);
        setCurrentProduct(null);
        if (savedId) {
          await showSavedProduct(savedId, { ...currentProduct, ...(createdProduct || {}), id: savedId });
        }
      } catch (error: any) {
        console.error("Erro ao salvar produto:", error);
        const errorMessage = error?.response?.data?.message || error?.message || "Não foi possível salvar o produto.";

        // Se o erro for de produto duplicado, mostrar mensagem específica
        if (error?.response?.status === 409 || errorMessage.includes("já existe")) {
          Swal.fire({
            icon: "error",
            title: "Produto duplicado!",
            text: errorMessage || "Já existe um produto com este nome ou código.",
            buttonsStyling: false,
            customClass: {
              confirmButton: "bg-red-600 text-white hover:bg-red-700 px-4 py-2 rounded font-semibold",
            },
          });
        } else {
          Swal.fire({
            icon: "error",
            title: "Erro!",
            text: errorMessage,
            buttonsStyling: false,
            customClass: {
              confirmButton: "bg-red-600 text-white hover:bg-red-700 px-4 py-2 rounded font-semibold",
            },
          });
        }
      }
    }, "saveProduct").catch((error: any) => {
      console.error("Erro no executeAction:", error);
    });
  };

  const handleDuplicate = async (withStock: boolean) => {
    if (isActionLoading || !currentProduct?.id) return;
    await executeAction(async () => {
      const names = new Set(allProducts.map((item) => item.name.trim().toLowerCase()));
      const root = currentProduct.name.trim().toUpperCase();
      let name = `${root} CÓPIA`;
      let copyNumber = 2;
      while (names.has(name.toLowerCase())) {
        name = `${root} CÓPIA ${copyNumber}`;
        copyNumber += 1;
      }
      const categoryId = currentProduct.categoryId || "";
      const category = categoryOptions.find((item) => item.id === categoryId)?.label || currentProduct.category || "";
      try {
        const payload = {
          description: "",
          priceweightAverage: Number(currentProduct.priceweightAverage) || 0,
          weightAverage: Number(currentProduct.weightAverage) || 0,
          salePrice: Number(currentProduct.salePrice) || 0,
          costPrice: Number(currentProduct.costPrice) || 0,
          categoryId,
          category,
          stockQuantity: withStock ? Number(currentProduct.stockQuantity) || 0 : 0,
          active: true,
        };
        let created: Product | null = null;
        for (let attempt = 0; attempt < 20 && !created; attempt += 1) {
          try {
            const { data } = await api.post("/clients/products", { ...payload, name });
            created = (data?.product || data) as Product;
          } catch (error: any) {
            const status = error?.response?.status;
            const message = String(error?.response?.data?.message || "");
            if (status !== 409 && !message.toLowerCase().includes("já existe")) throw error;
            name = `${root} CÓPIA ${copyNumber}`;
            copyNumber += 1;
          }
        }
        if (!created?.id) throw new Error("Não foi possível duplicar o produto.");
        if (currentProduct.photoFileId && created?.id) {
          try {
            const { data: blob } = await api.get(`/clients/products/${currentProduct.id}/photo`, { responseType: "blob" });
            if (blob instanceof Blob && blob.size > 16) {
              const type = blob.type || "image/jpeg";
              const ext = type.includes("png") ? "png" : "jpg";
              const body = new FormData();
              body.append("file", new File([blob], `foto.${ext}`, { type }));
              const { data: photo } = await api.post(`/clients/products/${created.id}/photo`, body);
              created.photoFileId = (photo?.product?.photoFileId as string | undefined) || created.photoFileId;
            }
          } catch (error) {
            console.error("Erro ao copiar a foto do produto:", error);
          }
        }
        try {
          const { data: tablesData } = await api.get(`/clients/products/${currentProduct.id}/table-prices`);
          const tables = (tablesData?.tables || []) as TablePriceRow[];
          if (tables.length) {
            await api.put(`/clients/products/${created.id}/table-prices`, {
              prices: tables.map((table) => ({
                priceTableId: table.id,
                price: table.price ?? null,
              })),
            });
          }
        } catch (error) {
          console.error("Erro ao copiar as tabelas de preço:", error);
        }
        let opened = { ...created, description: "" };
        try {
          await api.put(`/clients/products/${created.id}`, { description: "" });
          const { data: loaded } = await api.get(`/clients/products/${created.id}`);
          if (loaded?.product?.id) opened = { ...(loaded.product as Product), description: "" };
        } catch (error) {
          console.error("Erro ao abrir a cópia:", error);
        }
        leadIdRef.current = opened.id;
        leadProductRef.current = opened;
        setAllProducts((prev) => [opened, ...prev.filter((item) => item.id !== opened.id)]);
        setPage(1);
        setDuplicateAsk(false);
        setCopyNotice("Produto duplicado. Altere o que precisar e salve.");
        setCurrentProduct(opened);
        void loadTablePrices(opened);
        window.dispatchEvent(new Event("productsUpdated"));
      } catch (error: any) {
        const errorMessage = error?.response?.data?.message || error?.message || "Não foi possível duplicar o produto.";
        Swal.fire({
          icon: "error",
          title: "Erro!",
          text: errorMessage,
          buttonsStyling: false,
          customClass: {
            confirmButton: "bg-red-600 text-white hover:bg-red-700 px-4 py-2 rounded font-semibold",
          },
        });
      }
    }, "duplicateProduct").catch((error: any) => {
      console.error("Erro no executeAction:", error);
    });
  };

  const startCellEdit = (product: Product, field: "price" | "weight" | "sale" | "cost" | "stock" | `table:${string}`) => {
    if (isActionLoading) return;
    if (field.startsWith("table:")) {
      const current = gridPrices[product.id]?.[field.slice(6)];
      setEditingCell({ id: product.id, field });
      setEditingValue(current == null ? "" : String(current));
      return;
    }
    const current =
      field === "price"
        ? product.priceweightAverage
        : field === "weight"
          ? product.weightAverage
          : field === "sale"
            ? product.salePrice || 0
            : field === "cost"
              ? product.costPrice || 0
              : product.stockQuantity || 0;
    setEditingCell({ id: product.id, field });
    setEditingValue(current === 0 ? "" : String(current));
  };

  const cancelCellEdit = () => {
    setEditingCell(null);
    setEditingValue("");
  };

  const commitCellEdit = async (product: Product) => {
    if (!editingCell || editingCell.id !== product.id) return;
    if (editingCell.field.startsWith("table:")) {
      const tableId = editingCell.field.slice(6);
      const table = gridTables.find((item) => item.id === tableId);
      const raw = editingValue.trim();
      const parsed = raw === "" ? null : parseFloat(raw.replace(",", "."));
      if (parsed != null && (isNaN(parsed) || parsed < 0)) {
        cancelCellEdit();
        return;
      }
      const previous = gridPrices[product.id]?.[tableId];
      setGridPrices((current) => {
        const next = { ...current, [product.id]: { ...(current[product.id] || {}) } };
        if (parsed == null) delete next[product.id][tableId];
        else next[product.id][tableId] = parsed;
        return next;
      });
      cancelCellEdit();
      try {
        await api.put(`/clients/products/${product.id}/table-prices`, {
          prices: [{ priceTableId: tableId, price: parsed }],
        });
      } catch (error: any) {
        console.error("Erro ao atualizar tabela de preço:", error);
        setGridPrices((current) => {
          const next = { ...current, [product.id]: { ...(current[product.id] || {}) } };
          if (previous == null) delete next[product.id][tableId];
          else next[product.id][tableId] = previous;
          return next;
        });
        const serverMessage = String(error?.response?.data?.message || "");
        setCellNotice(serverMessage && serverMessage !== "Internal server error." ? serverMessage : `Não foi possível atualizar a tabela ${table?.name || ""}.`);
      }
      return;
    }
    const parsed = editingValue.trim() === "" ? 0 : parseFloat(editingValue.replace(",", "."));
    if (isNaN(parsed) || parsed < 0) {
      cancelCellEdit();
      return;
    }

    const saleField =
      editingCell.field === "sale"
        ? "salePrice"
        : editingCell.field === "cost"
          ? "costPrice"
          : editingCell.field === "stock"
            ? "stockQuantity"
            : null;
    const fieldLabel =
      editingCell.field === "sale"
        ? "preço de venda"
        : editingCell.field === "cost"
          ? "preço de custo"
          : editingCell.field === "stock"
            ? "estoque"
            : editingCell.field === "price"
              ? "preço médio"
              : "peso médio";
    const payload = saleField
      ? {
          name: product.name,
          ...(product.code ? { code: String(product.code) } : {}),
          [saleField]: parsed,
        }
      : editingCell.field === "price"
        ? { priceweightAverage: parsed }
        : { weightAverage: parsed };
    const previous = { ...product };

    setAllProducts((prev) =>
      prev.map((p) => (p.id === product.id ? { ...p, ...payload } : p))
    );
    cancelCellEdit();

    try {
      if (saleField) await api.put(`/clients/products/${product.id}`, payload);
      else await api.patch(`/invoice/product/${product.id}`, payload);
      window.dispatchEvent(new Event("productsUpdated"));
    } catch (error: any) {
      console.error("Erro ao atualizar produto:", error);
      setAllProducts((prev) => prev.map((p) => (p.id === product.id ? previous : p)));
      const serverMessage = String(error?.response?.data?.message || "");
      const useful =
        serverMessage &&
        serverMessage !== "Internal server error." &&
        serverMessage !== "Validation error.";
      setCellNotice(useful ? serverMessage : `Não foi possível atualizar o ${fieldLabel}.`);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowModal(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleSelectAll = () => {
    if (selectedProducts.length === products.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(products.map((p) => p.id));
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
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

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-blue-700">
          <Boxes className="mr-2 inline" size={18} />
          Cadastro de Produtos
        </h2>
        <div className="flex flex-wrap items-center gap-4">
          {selectedProducts.length > 0 && (
            <button
              onClick={() => setProductsActive(selectedProducts, showInactive)}
              className={
                showInactive
                  ? "bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl flex items-center shadow-sm"
                  : "bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-xl flex items-center shadow-sm"
              }
              disabled={isActionLoading}
            >
              {showInactive ? <RotateCcw className="mr-2" size={16} /> : <Ban className="mr-2" size={16} />}
              {showInactive ? "Ativar" : "Inativar"} selecionados ({selectedProducts.length})
            </button>
          )}
          {selectedProducts.length > 0 && (
            <button
              onClick={() => void applyAverageCost()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl flex items-center shadow-sm"
              disabled={isActionLoading}
            >
              Custo médio
            </button>
          )}
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 select-none">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => {
                setShowInactive(e.target.checked);
                setSelectedProducts([]);
              }}
              className="rounded"
            />
            Ver desativados
          </label>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Ordenar por:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "name" | "code")}
              className="border border-gray-200 rounded-xl bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-300"
            >
              <option value="name">Nome (Alfabético)</option>
              <option value="code">Código</option>
            </select>
          </div>
          <button
            onClick={async () => {
              // Sugestão local imediata (evita travar UI), substituída pelo backend em seguida
              let maiorCodigo = 0;
              products.forEach((p) => {
                const numero = parseInt(p.code);
                if (!isNaN(numero) && numero > maiorCodigo) {
                  maiorCodigo = numero;
                }
              });

              setDuplicateAsk(false);
              setCopyNotice("");
              setCurrentProduct({
                id: "",
                name: "",
                code: String(maiorCodigo + 1),
                priceweightAverage: 0,
                weightAverage: 0,
                description: "",
              });
              setShowModal(true);
              void loadTablePrices(null);

              // Buscar do backend o próximo código levando em conta TODOS os produtos
              // (inclusive inativos / fora da página atual). Isso evita colisão.
              try {
                const { data } = await api.get("/invoice/product/next-code");
                if (data?.code) {
                  setCurrentProduct((prev) =>
                    prev ? { ...prev, code: data.code } : prev
                  );
                }
              } catch (err) {
                console.warn(
                  "Falha ao consultar /invoice/product/next-code, usando sugestão local",
                  err
                );
              }
            }}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-xl flex items-center shadow-sm"
            disabled={isActionLoading}
          >
            <Plus className="mr-2" size={16} />
            Novo Produto
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-8">
          <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
        </div>
      ) : searched ? (
        <div className="overflow-x-auto rounded-2xl border border-gray-100 shadow-sm">
          <table
            className="gestao-prod-table min-w-full divide-y divide-gray-100"
            style={{
              "--sale-ch": `${moneyWidthCh(products.map((product) => product.salePrice))}ch`,
              "--cost-ch": `${moneyWidthCh(products.map((product) => product.costPrice))}ch`,
            } as CSSProperties}
          >
            <colgroup>
              <col className="gestao-prod-check" />
              {columns.map((id) => (
                <col
                  key={id}
                  className={
                    id === "code"
                      ? "gestao-prod-code"
                      : id === "category"
                        ? "gestao-prod-cat"
                        : id === "photo"
                          ? "gestao-prod-foto"
                          : id === "sale" || id === "cost" || id.startsWith("table:")
                            ? "gestao-prod-money"
                            : id === "stock" || id === "weight"
                              ? "gestao-prod-qty"
                              : "gestao-prod-name"
                  }
                />
              ))}
              <col className="gestao-prod-actions" />
            </colgroup>
            <thead className="bg-gray-100">
              <tr>
                <th className="gestao-prod-check">
                  <input
                    type="checkbox"
                    checked={selectedProducts.length === products.length && products.length > 0}
                    onChange={handleSelectAll}
                    className="rounded"
                  />
                </th>
                {columns.map((id) => {
                  const column = PRODUCT_COLUMNS.find((item) => item.id === id);
                  const table = id.startsWith("table:") ? gridTables.find((item) => `table:${item.id}` === id) : undefined;
                  if (!column && !table) return null;
                  const label = column?.label || table?.name || "";
                  const active = draggingColumn === id;
                  const tableWidth = table
                    ? `${moneyWidthCh(products.map((product) => gridPrices[product.id]?.[table.id]))}ch`
                    : undefined;
                  return (
                    <th
                      key={id}
                      draggable
                      title="Segure e arraste para mudar a posição"
                      style={tableWidth ? ({ "--money-ch": tableWidth } as CSSProperties) : undefined}
                      className={`${column?.numeric || table ? "num" : ""} ${id === "sale" ? "gestao-prod-sale" : ""} ${table ? "gestao-prod-sale gestao-prod-table-price" : ""} ${id === "cost" ? "gestao-prod-cost" : ""} ${id === "photo" ? "gestao-prod-photo" : ""} cursor-grab select-none ${active ? "bg-blue-100 opacity-60" : ""}`}
                      onDragStart={(event) => {
                        draggingColumnRef.current = id;
                        setDraggingColumn(id);
                        event.dataTransfer.effectAllowed = "move";
                        event.dataTransfer.setData("text/plain", id);
                      }}
                      onDragOver={(event) => {
                        event.preventDefault();
                        const from = draggingColumnRef.current;
                        if (!from || from === id) return;
                        setColumns((current) => {
                          const next = current.filter((item) => item !== from);
                          next.splice(next.indexOf(id), 0, from);
                          localStorage.setItem(COLUMN_ORDER_KEY, JSON.stringify(next));
                          return next;
                        });
                      }}
                      onDrop={(event) => event.preventDefault()}
                      onDragEnd={() => {
                        draggingColumnRef.current = null;
                        setDraggingColumn(null);
                      }}
                    >
                      {id === "sale" || id === "cost" || table ? (
                        <span className="gestao-prod-money-title">{label}</span>
                      ) : (
                        label
                      )}
                    </th>
                  );
                })}
                <th className="act">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {products.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 2} className="px-6 py-4 text-center text-gray-500">
                    {isLoading
                      ? "Carregando..."
                      : "Nenhum produto para esse filtro."}
                  </td>
                </tr>
              ) : (
                products.map((product) => {
                  const money = (value: number) =>
                    (Number(value) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                  const editable = (
                    field: "sale" | "cost" | "stock" | "weight",
                    text: string,
                    label: string,
                  ) => {
                    const editing = editingCell?.id === product.id && editingCell.field === field;
                    const priced = field === "sale" || field === "cost";
                    const fieldInput = (
                      <input
                        autoFocus
                        type="text"
                        inputMode="decimal"
                        value={editingValue}
                        onChange={(event) => {
                          const value = event.target.value.replace(",", ".");
                          if (/^\d*\.?\d{0,2}$/.test(value) || value === "") setEditingValue(value);
                        }}
                        onBlur={() => commitCellEdit(product)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            commitCellEdit(product);
                          }
                          if (event.key === "Escape") {
                            event.preventDefault();
                            cancelCellEdit();
                          }
                        }}
                        className="gestao-prod-edit"
                      />
                    );
                    return (
                      <td
                        key={field}
                        className={`num text-sm ${field === "sale" ? "gestao-prod-sale" : ""} ${field === "cost" ? "gestao-prod-cost" : ""}`}
                        onDoubleClick={() => startCellEdit(product, field)}
                        title={`Clique duas vezes para editar o ${label}`}
                      >
                        {priced ? (
                          <span className="gestao-prod-money">
                            <span className="gestao-prod-rs">R$</span>
                            {editing ? fieldInput : <span className="cursor-text">{text}</span>}
                          </span>
                        ) : editing ? (
                          fieldInput
                        ) : (
                          <span className="cursor-text">{text}</span>
                        )}
                      </td>
                    );
                  };
                  return (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="gestao-prod-check">
                        <input
                          type="checkbox"
                          checked={selectedProducts.includes(product.id)}
                          onChange={() => handleSelectProduct(product.id)}
                          className="rounded"
                        />
                      </td>
                      {columns.map((id) => {
                        if (id === "code") {
                          return <td key={id} className="text-sm">{product.code}</td>;
                        }
                        if (id === "category") {
                          const label = product.category
                            || categoryOptions.find((item) => item.id === product.categoryId)?.label
                            || "—";
                          return <td key={id} className="text-sm">{label}</td>;
                        }
                        if (id === "photo") {
                          return (
                            <td key={id} className="gestao-prod-photo">
                              <ProductThumb
                                productId={product.id}
                                photoFileId={product.photoFileId}
                                disabled={isActionLoading}
                                onFile={(file) => saveProductPhoto(product, file)}
                              />
                            </td>
                          );
                        }
                        if (id === "name") {
                          return <td key={id} className="gestao-prod-name text-sm">{product.name}</td>;
                        }
                        if (id.startsWith("table:")) {
                          const tableId = id.slice(6);
                          const table = gridTables.find((item) => item.id === tableId);
                          const value = gridPrices[product.id]?.[tableId];
                          const editing = editingCell?.id === product.id && editingCell.field === id;
                          const width = `${moneyWidthCh(products.map((item) => gridPrices[item.id]?.[tableId]))}ch`;
                          return (
                            <td
                              key={id}
                              className="num text-sm gestao-prod-sale"
                              style={{ "--money-ch": width } as CSSProperties}
                              onDoubleClick={() => startCellEdit(product, id)}
                              title={
                                value == null
                                  ? `Usa o preço de venda. Duplo clique para definir ${table?.name || "a tabela"}.`
                                  : `Clique duas vezes para editar ${table?.name || "a tabela"}`
                              }
                            >
                              {editing ? (
                                <span className="gestao-prod-money">
                                  <span className="gestao-prod-rs">R$</span>
                                  <input
                                    autoFocus
                                    type="text"
                                    inputMode="decimal"
                                    value={editingValue}
                                    onChange={(event) => {
                                      const next = event.target.value.replace(",", ".");
                                      if (/^\d*\.?\d{0,2}$/.test(next) || next === "") setEditingValue(next);
                                    }}
                                    onBlur={() => commitCellEdit(product)}
                                    onKeyDown={(event) => {
                                      if (event.key === "Enter") {
                                        event.preventDefault();
                                        commitCellEdit(product);
                                      }
                                      if (event.key === "Escape") {
                                        event.preventDefault();
                                        cancelCellEdit();
                                      }
                                    }}
                                    className="gestao-prod-edit"
                                  />
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
                        }
                        if (id === "sale") return editable("sale", money(product.salePrice || 0), "preço de venda");
                        if (id === "cost") return editable("cost", money(product.costPrice || 0), "preço de compra");
                        if (id === "stock") return editable("stock", String(product.stockQuantity || 0), "estoque");
                        return editable(
                          "weight",
                          `${product.weightAverage.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg`,
                          "peso",
                        );
                      })}
                      <td className="act text-sm font-medium">
                        <div className="flex flex-wrap justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleEdit(product)}
                            className="rounded-lg border border-gray-300 p-1.5 text-gray-700 hover:bg-gray-100"
                            title="Abrir produto"
                            disabled={isActionLoading}
                          >
                            <Settings size={16} />
                          </button>
                          <button
                            onClick={() => setProductsActive([product.id], showInactive)}
                            className={
                              showInactive
                                ? "rounded-lg border border-blue-200 px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                                : "rounded-lg border border-amber-300 px-2 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-50"
                            }
                            disabled={isActionLoading}
                          >
                            {showInactive ? "Ativar" : "Inativar"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      ) : null}

      {searched && !isLoading ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-gray-600">
            {total === 0
              ? "Nenhum registro"
              : `Página ${page} de ${pageCount} · ${products.length} nesta página · ${total} no total`}
          </p>
          {pageCount > 1 ? (
            <div className="flex gap-2">
              <button
                className="pdv-prod-btn"
                type="button"
                disabled={page <= 1}
                onClick={() => void fetchData(applied, page - 1, true)}
              >
                Anterior
              </button>
              <button
                className="pdv-prod-btn"
                type="button"
                disabled={page >= pageCount}
                onClick={() => void fetchData(applied, page + 1, true)}
              >
                Próxima
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {showModal && currentProduct && (
        <div
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) event.preventDefault();
          }}
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 backdrop-blur-sm"
        >
          <div className="bg-white p-6 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl border border-gray-100">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-lg font-medium">{copyNotice ? "Produto duplicado" : currentProduct.id ? "Editar Produto" : "Novo Produto"}</h3>
              <button
                type="button"
                aria-label="Fechar"
                onClick={closeProduct}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100"
              >
                <X size={18} aria-hidden />
              </button>
            </div>
            <div className="space-y-4">
              {copyNotice ? (
                <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">{copyNotice}</p>
              ) : null}
              {currentProduct.id ? (
                <div>
                  <span className="mb-2 block text-sm font-medium text-gray-700">Foto</span>
                  <div className="flex items-center gap-4">
                    <ProductThumb
                      large
                      productId={currentProduct.id}
                      photoFileId={currentProduct.photoFileId}
                      disabled={isActionLoading}
                      onFile={(file) => saveProductPhoto(currentProduct, file)}
                    />
                    <div className="space-y-2">
                      <p className="text-sm text-gray-500">Clique na foto para adicionar ou trocar.</p>
                      {currentProduct.photoFileId ? (
                        <button
                          type="button"
                          onClick={() => deleteProductPhoto(currentProduct)}
                          className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-50"
                          disabled={isActionLoading}
                        >
                          Apagar foto
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : null}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input
                  type="text"
                  value={currentProduct.name}
                  onChange={(e) => {
                    const cursorPosition = e.target.selectionStart;
                    const newValue = e.target.value.toUpperCase();
                    setCurrentProduct({ ...currentProduct, name: newValue });
                    // Restaurar posição do cursor após atualização
                    setTimeout(() => {
                      const input = e.target as HTMLInputElement;
                      if (input) {
                        input.setSelectionRange(cursorPosition, cursorPosition);
                      }
                    }, 0);
                  }}
                  className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-400 focus:border-blue-300"
                  disabled={isActionLoading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Código</label>
                <input
                  type="text"
                  value={currentProduct.code}
                  disabled // <- campo agora é somente leitura
                  className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="produto-categoria">
                  Categoria
                </label>
                <div className="flex items-center gap-2">
                  <select
                    id="produto-categoria"
                    value={currentProduct.categoryId || ""}
                    disabled={isActionLoading}
                    onChange={(event) => {
                      const categoryId = event.target.value;
                      const category = categoryOptions.find((item) => item.id === categoryId)?.label || "";
                      setCurrentProduct({ ...currentProduct, categoryId, category });
                    }}
                    className="w-full rounded-xl border border-gray-200 bg-white p-3 text-gray-900 focus:border-blue-300 focus:ring-2 focus:ring-blue-400"
                  >
                    <option value="">Selecione</option>
                    {currentProduct.categoryId && !categoryOptions.some((item) => item.id === currentProduct.categoryId) ? (
                      <option value={currentProduct.categoryId}>{currentProduct.category || currentProduct.categoryId}</option>
                    ) : null}
                    {categoryOptions.map((item) => (
                      <option key={item.id} value={item.id}>
                        {`${"\u00A0\u00A0".repeat(item.depth)}${item.label}`}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    aria-label="Criar categoria"
                    title="Criar categoria"
                    onClick={() => setNewCategoryOpen((open) => !open)}
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-800 hover:bg-gray-50"
                    disabled={isActionLoading}
                  >
                    <Plus size={18} />
                  </button>
                </div>
                {newCategoryOpen ? (
                  <div className="mt-2 flex gap-2">
                    <input
                      type="text"
                      value={newCategoryName}
                      placeholder="Nome da categoria"
                      onChange={(event) => setNewCategoryName(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          void createCategory();
                        }
                      }}
                      className="w-full rounded-xl border border-gray-200 bg-white p-3 text-gray-900 focus:border-blue-300 focus:ring-2 focus:ring-blue-400"
                    />
                    <button
                      type="button"
                      onClick={() => void createCategory()}
                      className="px-4 py-2 rounded-xl bg-blue-500 text-white hover:bg-blue-600"
                      disabled={isActionLoading || !newCategoryName.trim()}
                    >
                      Criar
                    </button>
                  </div>
                ) : null}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Preço ($)</label>
                  <MoneyInput
                    placeholder="0,00"
                    value={currentProduct.priceweightAverage ? formatMoneyBr(currentProduct.priceweightAverage) : ""}
                    onChange={(next) =>
                      setCurrentProduct({
                        ...currentProduct,
                        priceweightAverage: next ? parseMoneyBr(next) : 0,
                      })
                    }
                    disabled={isActionLoading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Peso (kg)</label>
                  <input
                    type="text"
                    placeholder="0.00"
                    inputMode="decimal"
                    value={currentProduct.weightAverage === 0 ? "" : String(currentProduct.weightAverage)}
                    onChange={(e) => {
                      const value = e.target.value.replace(",", ".");
                      if (/^\d*\.?\d{0,2}$/.test(value) || value === "") {
                        setCurrentProduct({
                          ...currentProduct,
                          weightAverage: value === "" ? 0 : parseFloat(value),
                        });
                      }
                    }}
                    className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-400 focus:border-blue-300"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Preço de custo</label>
                <MoneyInput
                  placeholder="0,00"
                  value={costDraft}
                  onChange={setCostDraft}
                  disabled={isActionLoading}
                />
              </div>
              {[...tablePrices]
                .sort((a, b) => {
                  if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
                  if (a.slug === "lojas") return -1;
                  if (b.slug === "lojas") return 1;
                  return a.name.localeCompare(b.name, "pt-BR");
                })
                .map((table) => (
                  <div key={table.id}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {table.isDefault ? "Preço de venda" : table.slug === "lojas" ? "Preço lojas" : `Preço ${table.name}`}
                    </label>
                    <MoneyInput
                      placeholder={table.isDefault ? "0,00" : "Usa o padrão"}
                      value={tableDrafts[table.id] || ""}
                      onChange={(next) => setTableDrafts((current) => ({ ...current, [table.id]: next }))}
                      disabled={isActionLoading}
                    />
                    {table.isDefault ? null : (
                      <p className="mt-1 text-xs text-gray-500">Vazio usa o preço padrão. Vale só para o cliente desta tabela.</p>
                    )}
                  </div>
                ))}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                <textarea
                  rows={3}
                  value={currentProduct.description}
                  onChange={(e) => {
                    const cursorPosition = e.target.selectionStart;
                    const newValue = e.target.value.toUpperCase();
                    setCurrentProduct({ ...currentProduct, description: newValue });
                    // Restaurar posição do cursor após atualização
                    setTimeout(() => {
                      const textarea = e.target as HTMLTextAreaElement;
                      if (textarea) {
                        textarea.setSelectionRange(cursorPosition, cursorPosition);
                      }
                    }, 0);
                  }}
                  className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-400 focus:border-blue-300"
                  disabled={isActionLoading}
                ></textarea>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
              {currentProduct.id ? (
                duplicateAsk ? (
                  <div className="mr-auto flex flex-wrap items-center gap-2">
                    <span className="text-sm text-gray-600">Duplicar</span>
                    <button
                      type="button"
                      onClick={() => handleDuplicate(true)}
                      className="px-4 py-2 border border-gray-200 rounded-xl hover:bg-gray-50"
                      disabled={isActionLoading}
                    >
                      Com estoque
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDuplicate(false)}
                      className="px-4 py-2 border border-gray-200 rounded-xl hover:bg-gray-50"
                      disabled={isActionLoading}
                    >
                      Sem estoque
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setDuplicateAsk(true)}
                    className="mr-auto px-4 py-2 border border-gray-200 rounded-xl hover:bg-gray-50 inline-flex items-center gap-2"
                    disabled={isActionLoading}
                  >
                    <Copy size={16} />
                    Duplicar
                  </button>
                )
              ) : null}
              <button
                onClick={closeProduct}
                className="px-4 py-2 border border-gray-200 rounded-xl hover:bg-gray-50"
                disabled={isActionLoading}
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-500 text-white rounded-xl flex items-center justify-center shadow-sm hover:bg-blue-600"
                disabled={isActionLoading}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Salvar"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {cellNotice ? (
        <div className="pdv-chrome-dialog" role="alertdialog" aria-labelledby="cell-notice-title">
          <div className="pdv-chrome-dialog-card">
            <p className="pdv-chrome-kicker">Produto</p>
            <h2 id="cell-notice-title">Não atualizou</h2>
            <p style={{ margin: "0 0 4px", color: "var(--chrome-muted)" }}>{cellNotice}</p>
            <div className="pdv-chrome-dialog-actions">
              <button className="primary" type="button" onClick={() => setCellNotice("")}>
                Ok
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

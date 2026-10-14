import { FormEvent, useState, useEffect, useRef } from "react";
import { Plus, Ban, RotateCcw, Boxes, Loader2, Settings, Copy } from "lucide-react";
import Swal from "sweetalert2";
import { api } from "../../../../services/api";
import { sameProductCode } from "../utils/productBarcode";
import { useNotification } from "../../../../hooks/notification";
import { useActionLoading } from "../../context/ActionLoadingContext";
import "../../../client/cadastros/cadastros.css";
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

type ProductColumn = "code" | "category" | "photo" | "name" | "sale" | "cost" | "stock" | "weight";

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

function readColumnOrder(): ProductColumn[] {
  try {
    const raw = JSON.parse(localStorage.getItem(COLUMN_ORDER_KEY) || "null");
    if (!Array.isArray(raw)) return [...DEFAULT_COLUMN_ORDER];
    const known = new Set<string>(DEFAULT_COLUMN_ORDER);
    const next = raw.filter((id): id is ProductColumn => typeof id === "string" && known.has(id));
    for (const id of DEFAULT_COLUMN_ORDER) {
      if (!next.includes(id)) next.push(id);
    }
    return next;
  } catch {
    return [...DEFAULT_COLUMN_ORDER];
  }
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
  productId,
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
  const [src, setSrc] = useState("");
  const box = large ? "h-28 w-28" : "h-14 w-14";

  const [node, setNode] = useState<HTMLLabelElement | null>(null);

  useEffect(() => {
    if (!photoFileId) {
      setSrc("");
      return;
    }
    if (!node) return;
    let url = "";
    let cancelled = false;
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      io.disconnect();
      api
        .get(`/clients/products/${productId}/photo`, { responseType: "blob" })
        .then(({ data }) => {
          if (cancelled || !(data instanceof Blob) || data.size < 16) return;
          url = URL.createObjectURL(data);
          setSrc(url);
        })
        .catch(() => {
          if (!cancelled) setSrc("");
        });
    }, { rootMargin: "120px" });
    io.observe(node);
    return () => {
      cancelled = true;
      io.disconnect();
      if (url) URL.revokeObjectURL(url);
    };
  }, [productId, photoFileId, node]);

  return (
    <label
      ref={setNode}
      className={`relative inline-flex shrink-0 cursor-pointer ${box}`}
      title={photoFileId ? "Clique para trocar a foto" : "Clique para adicionar a foto"}
    >
      {src ? (
        <img src={src} alt="" className={`${box} rounded-lg border border-gray-200 object-cover`} />
      ) : (
        <span
          className={`flex ${box} items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 text-[11px] text-gray-400`}
        >
          Sem foto
        </span>
      )}
      <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white shadow ring-2 ring-white">
        <Plus size={14} aria-hidden />
      </span>
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
  const [newCategoryOpen, setNewCategoryOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sortBy, setSortBy] = useState<"name" | "code">("name");
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
    field: "price" | "weight" | "sale" | "cost" | "stock";
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

  const fetchData = async (filters: ProductFilters, nextPage: number) => {
    setIsLoading(true);
    setPage(nextPage);
    try {
      const { data } = await api.get("/clients/products", {
        params: productFilterParams(filters, nextPage, "backoffice", {
          ativo: inactiveRef.current ? "0" : "1",
          order: sortRef.current,
        }),
      });
      setAllProducts((data.products || []) as Product[]);
      setTotal(Number(data.total) || 0);
      if (data.facets) setFacets(data.facets as ProductFacets);
    } catch (error) {
      console.error("Erro ao buscar produtos:", error);
      setAllProducts([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
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

  const handleEdit = (product: Product) => {
    setDuplicateAsk(false);
    setNewCategoryOpen(false);
    setNewCategoryName("");
    setCurrentProduct(product);
    setShowModal(true);
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
      await fetchData();
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
        const { data: updated } = await api.patch(`/invoice/product/${currentProduct.id}`, currentProduct);
        await api.put(`/clients/products/${currentProduct.id}`, {
          name: currentProduct.name,
          ...(currentProduct.code ? { code: String(currentProduct.code) } : {}),
          categoryId,
          category,
          priceweightAverage: Number(currentProduct.priceweightAverage) || 0,
        });
        setAllProducts((prev) =>
          prev.map((p) => (p.id === currentProduct.id ? { ...p, ...updated, ...currentProduct, categoryId, category } : p))
        );
        setOpenNotification({
          type: "success",
          title: "Sucesso!",
          notification: "Produto atualizado com sucesso!",
        });
      } else {
        const { data: created } = await api.post("/invoice/product", currentProduct);
        createdProduct = created;
        setAllProducts((prev) => {
          if (prev.some((p) => p.id === created.id)) return prev;
          return [...prev, created];
        });
        setOpenNotification({
          type: "success",
          title: "Sucesso!",
          notification: "Produto criado com sucesso!",
        });
      }
        window.dispatchEvent(new Event("productsUpdated"));
        await fetchData();
        if (createdProduct) {
          setAllProducts((prev) => {
            if (prev.some((p) => p.id === createdProduct!.id)) return prev;
            return [...prev, createdProduct!];
          });
        }
        setShowModal(false);
        setCurrentProduct(null);
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
          description: currentProduct.description || "",
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
        setAllProducts((prev) => (prev.some((item) => item.id === created.id) ? prev : [...prev, created]));
        setDuplicateAsk(false);
        setShowModal(false);
        setCurrentProduct(null);
        window.dispatchEvent(new Event("productsUpdated"));
        await fetchData();
        setOpenNotification({
          type: "success",
          title: "Sucesso!",
          notification: withStock ? "Produto duplicado com estoque." : "Produto duplicado sem estoque.",
        });
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

  const startCellEdit = (product: Product, field: "price" | "weight" | "sale" | "cost" | "stock") => {
    if (isActionLoading) return;
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
              setCurrentProduct({
                id: "",
                name: "",
                code: String(maiorCodigo + 1),
                priceweightAverage: 0,
                weightAverage: 0,
                description: "",
              });
              setShowModal(true);

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
            disabled={isLoading || isActionLoading}
          >
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2" size={16} />}
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
          <table className="gestao-prod-table min-w-full divide-y divide-gray-100">
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
                  const column = PRODUCT_COLUMNS.find((item) => item.id === id)!;
                  const active = draggingColumn === id;
                  return (
                    <th
                      key={id}
                      draggable
                      title="Segure e arraste para mudar a posição"
                      className={`${column.numeric ? "num" : ""} cursor-grab select-none ${active ? "bg-blue-100 opacity-60" : ""}`}
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
                      {column.label}
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
                    (value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
                  const editable = (
                    field: "sale" | "cost" | "stock" | "weight",
                    text: string,
                    label: string,
                  ) => {
                    const editing = editingCell?.id === product.id && editingCell.field === field;
                    return (
                      <td
                        key={field}
                        className="num text-sm text-gray-500"
                        onDoubleClick={() => startCellEdit(product, field)}
                        title={`Clique duas vezes para editar o ${label}`}
                      >
                        {editing ? (
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
                            className="ml-auto w-24 rounded-lg border border-blue-400 px-2 py-1 text-right focus:outline-none focus:ring-2 focus:ring-blue-400"
                          />
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
                          return <td key={id} className="text-sm text-gray-500">{product.code}</td>;
                        }
                        if (id === "category") {
                          const label = product.category
                            || categoryOptions.find((item) => item.id === product.categoryId)?.label
                            || "—";
                          return <td key={id} className="text-sm text-gray-500">{label}</td>;
                        }
                        if (id === "photo") {
                          return (
                            <td key={id}>
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
                          return <td key={id} className="gestao-prod-name text-sm font-medium text-gray-900">{product.name}</td>;
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
                        <div className="flex flex-wrap justify-end gap-2">
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
                onClick={() => void fetchData(applied, page - 1)}
              >
                Anterior
              </button>
              <button
                className="pdv-prod-btn"
                type="button"
                disabled={page >= pageCount}
                onClick={() => void fetchData(applied, page + 1)}
              >
                Próxima
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {showModal && currentProduct && (
        <div
          onClick={() => setShowModal(false)}
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 backdrop-blur-sm"
        >
          <div onClick={(e) => e.stopPropagation()} className="bg-white p-6 rounded-2xl w-full max-w-md shadow-xl border border-gray-100">
            <h3 className="text-lg font-medium mb-4">{currentProduct.id ? "Editar Produto" : "Novo Produto"}</h3>
            <div className="space-y-4">
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
                  <input
                    type="text"
                    placeholder="0.00"
                    inputMode="decimal"
                    value={currentProduct.priceweightAverage === 0 ? "" : String(currentProduct.priceweightAverage)}
                    onChange={(e) => {
                      const value = e.target.value.replace(",", "."); // permite , ou .
                      if (/^\d*\.?\d{0,2}$/.test(value) || value === "") {
                        setCurrentProduct({
                          ...currentProduct,
                          priceweightAverage: value === "" ? 0 : parseFloat(value),
                        });
                      }
                    }}
                    className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-400 focus:border-blue-300"
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
                onClick={() => setShowModal(false)}
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

import { CSSProperties, FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Ban, Boxes, CircleCheck, ClipboardList, LoaderCircle, PackageX, PartyPopper, Search, ShoppingBag, ShoppingCart, Trash2, Wallet, X } from "lucide-react";
import { api, parseError } from "../../../services/api";
import { isOpenStoreCategory, openCategoryRank } from "../cadastros/produtos/categoryModel";
function supplierOrderPrice(product: { tableSalePrice?: number | null; salePrice?: number | null }) {
  if (product.tableSalePrice != null && Number.isFinite(Number(product.tableSalePrice))) {
    return Number(product.tableSalePrice);
  }
  return Number(product.salePrice) || 0;
}
import { ProductPhoto } from "../cadastros/produtos/GradePhotoThumb";
import { CategoryCoverImage } from "../cadastros/produtos/categoryCover";
import PdvShell from "../dashboard/PdvShell";
import { useClientAuth } from "../../../hooks/clientAuth";
import "../dashboard/dashboard.css";
import "./pedidos.css";

function LojaScrim({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return createPortal(
    <div className="loja-confirm" role="presentation" onClick={onClick}>
      {children}
    </div>,
    document.body,
  )
}

type CatalogProduct = {
  id: string;
  name: string;
  code: string;
  price: number;
  costPrice: number;
  category: string;
  categoryId: string;
  photoFileId: string | null;
  stockQuantity: number;
  search: string;
};

function saleBelowCost(price: number, cost: number) {
  const costCents = Math.round((Number(cost) || 0) * 100);
  if (costCents <= 0) return false;
  return Math.round((Number(price) || 0) * 100) < costCents;
}

type StoreCategory = {
  id: string;
  name: string;
  code: number;
  coverFileId: string | null;
};

type CartLine = CatalogProduct & { qty: number; imeis?: string[] };

type Address = {
  titulo?: string;
  nome?: string;
  cep?: string;
  rua?: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  obs?: string;
};

type SavedOrder = {
  id: string;
  lines: CartLine[];
  address: Address;
  total: number;
  observacao?: string;
  createdAt: string;
  closedAt: string | null;
  estornada?: boolean;
  estornadaAt?: string | null;
  dispatchStatus?: string;
};

type PurchaseView = {
  number: string;
  date: string;
  observacao: string;
  lines: Array<{ code: string; name: string; qty: number }>;
};

const EMPTY_ADDRESS: Address = {};

const NAV = [
  { to: "/client/pedidos", label: "Início", end: true },
  { to: "/client/pedidos/venda", label: "Novo pedido" },
  { to: "/client/pedidos/historico", label: "Histórico" },
  { to: "/client/pedidos/financeiro", label: "Financeiro" },
];

function orderDone(value?: string) {
  return value === "ENVIADO" || value === "CONFERIDO";
}

function orderStatus(value?: string) {
  return orderDone(value) ? "Concluído" : "Em separação";
}

function StatusLabel({ value, estornada }: { value?: string; estornada?: boolean }) {
  if (estornada) return <span className="loja-status loja-status-void">Estornada</span>;
  const done = orderDone(value);
  return <span className={done ? "loja-status loja-status-done" : "loja-status loja-status-wait"}>{orderStatus(value)}</span>;
}

function money(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function signedMoney(value: number) {
  const text = money(Math.abs(value));
  if (value < 0) return `-${text}`;
  if (value > 0) return text;
  return text;
}

function stockLevel(quantity: number) {
  if (quantity <= 0) return "indisponivel";
  if (quantity <= 10) return "baixo";
  if (quantity <= 30) return "medio";
  return "alto";
}

function stockLabel(quantity: number) {
  const level = stockLevel(quantity);
  if (level === "indisponivel") return "Indisponível";
  if (level === "baixo") return "Baixo";
  if (level === "medio") return "Médio";
  return "Alto";
}

async function loadOpen(): Promise<SavedOrder | null> {
  const { data } = await api.get("/clients/pre-vendas/aberta");
  return (data?.order as SavedOrder | null) ?? null;
}

function saveOpen(lines: CartLine[], address: Address, observacao?: string) {
  return api.put("/clients/pre-vendas/aberta", { lines, address, observacao });
}

function cartTotal(lines: CartLine[], discount = 0) {
  const raw = lines.reduce((sum, line) => sum + line.price * line.qty, 0);
  return Math.max(0, raw - discount);
}

const cartBadge = { count: 0, open: () => {} };
const cartBadgeListeners = new Set<() => void>();

function publishCartBadge(next: { count: number; open: () => void }) {
  cartBadge.count = next.count;
  cartBadge.open = next.open;
  cartBadgeListeners.forEach((listener) => listener());
}

function useCartBadge() {
  const [, refresh] = useState(0);
  useEffect(() => {
    const listener = () => refresh((value) => value + 1);
    cartBadgeListeners.add(listener);
    return () => {
      cartBadgeListeners.delete(listener);
    };
  }, []);
  return cartBadge;
}

function QtyField({
  stock,
  value,
  onChange,
  disabled = false,
}: {
  stock: number;
  value: number;
  onChange: (qty: number) => void;
  disabled?: boolean;
}) {
  const [more, setMore] = useState(false);
  const [draft, setDraft] = useState("");
  const qty = Math.max(1, Math.floor(Number(value) || 1));
  const knownStock = Math.floor(Number(stock));
  const max = Math.max(qty, Number.isFinite(knownStock) && knownStock > 0 ? knownStock : qty);
  const shown = Math.min(qty, max);
  const presets = [1, 2, 3, 4, 5, 6].filter((item) => item <= max);
  return (
    <div className="loja-qty-field">
      <label>
        Quantidade
        <select
          aria-label="Quantidade"
          value={more ? "more" : String(shown)}
          disabled={disabled || max <= 0}
          onChange={(event) => {
            if (event.target.value === "more") {
              setMore(true);
              setDraft(String(Math.min(max, Math.max(shown, 7))));
              return;
            }
            setMore(false);
            onChange(Number(event.target.value));
          }}
        >
          {presets.map((item) => (
            <option key={item} value={item}>
              {item} {item === 1 ? "unidade" : "unidades"}
            </option>
          ))}
          {shown > 6 ? <option value={shown}>{shown} unidades</option> : null}
          {max > 6 ? <option value="more">Mais de 6 unidades</option> : null}
        </select>
      </label>
      {more ? (
        <div className="loja-qty-more">
          <label>
            Quantidade
            <input
              type="number"
              min={1}
              max={max}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
            />
          </label>
          <button
            type="button"
            onClick={() => {
              const next = Math.min(max, Math.max(1, Math.round(Number(draft) || 1)));
              onChange(next);
              setMore(false);
            }}
          >
            Aplicar
          </button>
        </div>
      ) : null}
    </div>
  );
}

function LojaFrame({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const cart = useCartBadge();
  const onSale = pathname.startsWith("/client/pedidos/venda");
  const onHome = pathname === "/client/pedidos" || pathname === "/client/pedidos/";
  function goBack() {
    if (onSale) {
      const event = new CustomEvent("loja-voltar", { cancelable: true });
      if (window.dispatchEvent(event)) navigate("/client/pedidos");
      return;
    }
    if (onHome) {
      navigate("/client/dashboard");
      return;
    }
    if (pathname.includes("/historico/") || pathname.includes("/imprimir")) {
      navigate("/client/pedidos/historico");
      return;
    }
    navigate("/client/pedidos");
  }
  return (
      <div className="loja-pedidos">
        <div className="loja-head loja-no-print">
        <div className="loja-top">
          <div className="loja-top-title">
            <button type="button" className="loja-back" onClick={goBack}>
              <ArrowLeft size={15} aria-hidden="true" />
              Voltar
            </button>
            <p className="loja-kicker">Gestão de pedidos</p>
          </div>
          <div className="loja-top-actions">
            {onSale ? (
              <button type="button" className="loja-cart-top" onClick={cart.open} aria-label="Abrir carrinho">
                <ShoppingCart size={18} strokeWidth={1.9} aria-hidden="true" />
                <span>Carrinho</span>
                {cart.count > 0 ? <b>{cart.count}</b> : null}
              </button>
            ) : null}
          </div>
        </div>
        <nav className="loja-nav" aria-label="Pedidos do lojista">
          {NAV.map((item) => {
            const current = item.end ? pathname === item.to : pathname.startsWith(item.to);
            return (
              <Link key={item.to} to={item.to} aria-current={current ? "page" : undefined}>
                {item.label}
              </Link>
            );
          })}
          {pathname.includes("/imprimir") ? (
            <button type="button" className="loja-print-btn" onClick={() => window.print()}>
              Imprimir
            </button>
          ) : null}
        </nav>
        </div>
        {children}
      </div>
  );
}

function Home() {
  const [lines, setLines] = useState<CartLine[]>([]);
  useEffect(() => {
    loadOpen()
      .then((order) => setLines(order?.lines || []))
      .catch(() => setLines([]));
  }, []);
  return (
    <>
      <header>
        <h1 className="loja-title">Pedidos</h1>
        <p className="loja-lede">
          {lines.length
            ? `${lines.length} ${lines.length === 1 ? "item" : "itens"} no pedido aberto.`
            : "Nenhum pedido aberto. Escolha por onde começar."}
        </p>
      </header>
      <div className="loja-split-home">
        <Link className="loja-order-panel" to="/client/pedidos/venda">
          <img src="/pedidos-novo-claro.jpg" alt="" />
          <span className="loja-order-panel-copy">
            <strong>Novo pedido</strong>
            <span>
              {lines.length
                ? `${lines.length} ${lines.length === 1 ? "item" : "itens"} no pedido aberto.`
                : "Escolha os produtos e a quantidade."}
            </span>
          </span>
        </Link>
        <div className="loja-side-actions">
          <Link className="loja-action" to="/client/pedidos/historico">
            <span className="loja-action-ico" aria-hidden="true">
              <ClipboardList size={30} strokeWidth={1.75} />
            </span>
            <strong>Histórico</strong>
            <span>Pedidos já fechados.</span>
          </Link>
          <Link className="loja-action" to="/client/pedidos/financeiro">
            <span className="loja-action-ico" aria-hidden="true">
              <Wallet size={30} strokeWidth={1.75} />
            </span>
            <strong>Financeiro</strong>
            <span>Conta da loja com o atacado.</span>
          </Link>
        </div>
      </div>
    </>
  );
}

function Venda() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Todas");
  const [onlyInStock, setOnlyInStock] = useState(true);
  const [storeCategories, setStoreCategories] = useState<StoreCategory[]>([]);
  const [lines, setLines] = useState<CartLine[]>([]);
  const [picks, setPicks] = useState<Record<string, number>>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [addedPopup, setAddedPopup] = useState<{ product: CatalogProduct; qty: number } | null>(null);
  const [address, setAddress] = useState<Address>(EMPTY_ADDRESS);
  const [observacao, setObservacao] = useState("");
  const [ready, setReady] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [closeStep, setCloseStep] = useState<"ask" | "sending" | "done">("ask");
  const [closedFlash, setClosedFlash] = useState<{ id: string; total: number; qty: number } | null>(null);
  const [error, setError] = useState("");
  const [blockedNotice, setBlockedNotice] = useState<CatalogProduct[]>([]);
  const hadOpen = useRef(false);
  const closing = useRef(false);

  useEffect(() => {
    loadOpen()
      .then((order) => {
        if (order) {
          hadOpen.current = true;
          setLines(order.lines || []);
          setAddress(order.address || EMPTY_ADDRESS);
          setObservacao(order.observacao || "");
        }
      })
      .catch(() => setError("Não foi possível abrir o pedido gravado."))
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!ready || closing.current) return;
    if (!lines.length && !hadOpen.current) return;
    const timer = window.setTimeout(() => {
      hadOpen.current = true;
      saveOpen(lines, address, observacao).catch(() => setError("Não foi possível gravar o pedido."));
    }, 400);
    return () => window.clearTimeout(timer);
  }, [lines, address, observacao, ready]);

  useEffect(() => {
    api
      .get("/clients/catalog/product_category", { params: { ativo: "1" } })
      .then(({ data }) => {
        const items = (data?.items || []) as Array<{ code?: number; name?: string; payload?: { slug?: string; coverFileId?: string } }>;
        setStoreCategories(
          items
            .map((item) => ({
              id: String(item.payload?.slug || item.name || ""),
              name: String(item.name || ""),
              code: Number(item.code) || 0,
              coverFileId: item.payload?.coverFileId ? String(item.payload.coverFileId) : null,
            }))
            .filter((item) => item.id && item.name),
        );
      })
      .catch(() => setStoreCategories([]));
  }, []);

  useEffect(() => {
    api
      .get("/clients/products", { params: { ativo: "1" } })
      .then(({ data }) => {
        const list = (data?.products || data || []) as Record<string, unknown>[];
        setProducts(
          list.map((item) => ({
            id: String(item.id),
            name: String(item.lojaName || "").trim() || String(item.name || ""),
            code: String(item.code || ""),
            price: supplierOrderPrice(item as { tableSalePrice?: number | null; salePrice?: number | null }),
            costPrice: Number(item.costPrice || 0),
            category: String(item.category || ""),
            categoryId: String(item.categoryId || ""),
            photoFileId: item.photoFileId ? String(item.photoFileId) : null,
            stockQuantity: Number(item.stockQuantity || 0),
            search: [item.name, item.lojaName, item.code, item.category, item.barcode, item.brand, item.model, item.reference, item.description, item.supplierCode, item.supplierName, item.ncm]
              .filter(Boolean)
              .join(" ")
              .toLowerCase(),
          })),
        );
      })
      .catch(() => setError("Não foi possível carregar o catálogo da central."));
  }, []);

  useEffect(() => {
    if (!products.length) return;
    setLines((current) => {
      let changed = false;
      const next = current.map((line) => {
        const product = products.find((item) => item.id === line.id);
        if (!product) return line;
        if (
          line.photoFileId === product.photoFileId &&
          line.stockQuantity === product.stockQuantity &&
          line.price === product.price &&
          line.costPrice === product.costPrice
        ) {
          return line;
        }
        changed = true;
        return {
          ...line,
          photoFileId: product.photoFileId,
          stockQuantity: product.stockQuantity || line.stockQuantity,
          price: product.price,
          costPrice: product.costPrice,
        };
      });
      return changed ? next : current;
    });
  }, [products]);

  const categories = useMemo(() => {
    const listed = products.filter((item) => item.stockQuantity > 0);
    const usedIds = new Set(listed.map((item) => item.categoryId).filter(Boolean));
    const usedNames = new Set(listed.map((item) => item.category).filter(Boolean));
    const fromStore = storeCategories.filter((item) => usedIds.has(item.id) || usedNames.has(item.name));
    const known = new Set(fromStore.flatMap((item) => [item.id, item.name]));
    const extras = Array.from(usedNames)
      .filter((name) => !known.has(name))
      .map((name) => ({ id: name, name, code: 0, coverFileId: null as string | null }));
    const ordered = [...fromStore, ...extras]
      .filter((item) => isOpenStoreCategory(item.id, item.name))
      .sort((a, b) => openCategoryRank(a.id, a.name) - openCategoryRank(b.id, b.name));
    return [{ id: "Todas", name: "Todas", code: 0, coverFileId: null }, ...ordered];
  }, [products, storeCategories]);

  const categoryCards = useMemo(() => {
    return categories
      .filter((item) => item.id !== "Todas" && item.id !== "papelaria" && item.name.toLowerCase() !== "papelaria")
      .map((item) => {
        const inCategory = products.filter(
          (product) =>
            product.stockQuantity > 0 &&
            (product.categoryId === item.id || product.category === item.name),
        );
        const sample = inCategory.find((product) => product.photoFileId) || inCategory[0];
        return {
          ...item,
          productId: sample?.id || "",
          photoFileId: item.coverFileId ? null : sample?.photoFileId || null,
          inStock: inCategory.length,
        };
      })
      .filter((item) => item.inStock > 0);
  }, [categories, products]);

  const showCategories = category === "Todas" && !query.trim();

  const visible = products.filter((item) => {
    const text = item.search || `${item.name} ${item.code} ${item.category}`.toLowerCase();
    const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const matchesQuery = !terms.length || terms.every((term) => text.includes(term));
    const matchesCategory =
      category === "Todas"
        ? Boolean(query.trim()) || isOpenStoreCategory(item.categoryId, item.category)
        : item.categoryId === category || item.category === category;
    const hasBackofficeStock = item.stockQuantity > 0;
    const matchesStock = onlyInStock ? hasBackofficeStock : !hasBackofficeStock;
    return matchesQuery && matchesCategory && matchesStock;
  });

  function add(product: CatalogProduct, amount = 1) {
    if (!(Number(product.price) > 0)) return false;
    if (saleBelowCost(product.price, product.costPrice)) {
      setBlockedNotice([product]);
      return false;
    }
    const stock = Math.max(0, Math.floor(Number(product.stockQuantity) || 0));
    const want = Math.max(1, Math.round(Number(amount) || 1));
    const found = lines.find((line) => line.id === product.id);
    if (stock <= 0 || stock - (found?.qty || 0) <= 0) return false;
    setLines((current) => {
      const line = current.find((item) => item.id === product.id);
      const room = stock - (line?.qty || 0);
      if (room <= 0) return current;
      const extra = Math.min(room, want);
      if (line) {
        return current.map((item) =>
          item.id === product.id ? { ...item, qty: item.qty + extra, stockQuantity: stock } : item,
        );
      }
      return [...current, { ...product, stockQuantity: stock, qty: extra }];
    });
    return true;
  }

  async function finish() {
    if (!lines.length || closing.current) return;
    const blocked = lines.filter((line) => saleBelowCost(line.price, line.costPrice));
    if (blocked.length) {
      setConfirmClose(false);
      setCloseStep("ask");
      setBlockedNotice(blocked);
      return;
    }
    closing.current = true;
    const payload = {
      lines: lines.map((line) => ({
        id: line.id,
        name: line.name,
        code: String(line.code || ""),
        price: Number(line.price) || 0,
        qty: Math.max(1, Math.round(Number(line.qty) || 0)),
        category: line.category || undefined,
      })),
      address,
      observacao,
    };
    const qty = payload.lines.reduce((sum, line) => sum + line.qty, 0);
    const total = payload.lines.reduce((sum, line) => sum + line.price * line.qty, 0);
    setCloseStep("sending");
    try {
      const [{ data }] = await Promise.all([
        api.post("/clients/pre-vendas/fechar", payload),
        new Promise((resolve) => window.setTimeout(resolve, 900)),
      ]);
      const order = (data?.order || {}) as { id?: string; total?: number };
      setLines([]);
      setClosedFlash({
        id: String(order.id || ""),
        total: Number(order.total) || total,
        qty,
      });
      setCloseStep("done");
      closing.current = false;
    } catch (err) {
      closing.current = false;
      setCloseStep("ask");
      setConfirmClose(false);
      const parsed = parseError(err);
      if (parsed.code === "BELOW_COST") {
        const blocked = lines.filter((line) => saleBelowCost(line.price, line.costPrice));
        setBlockedNotice(blocked.length ? blocked : lines);
        return;
      }
      setError(parsed.friend || parsed.message || "Não foi possível gravar o pedido fechado.");
    }
  }

  function openClosedHistory() {
    navigate("/client/pedidos/historico", { state: { justClosed: closedFlash } });
  }

  function setQty(id: string, qty: number) {
    setLines((current) => {
      const line = current.find((item) => item.id === id);
      if (!line) return current;
      if (qty < 1) return current.filter((item) => item.id !== id);
      const stock = Math.max(0, Math.floor(Number(line.stockQuantity) || 0));
      const next = Math.min(qty, stock || qty);
      if (stock > 0 && qty > stock) return current.map((item) => (item.id === id ? { ...item, qty: stock } : item));
      return current.map((item) => (item.id === id ? { ...item, qty: next } : item));
    });
  }

  const splitRef = useRef<HTMLDivElement>(null);
  const categoryRef = useRef(category);
  const queryRef = useRef(query);
  const cartOpenRef = useRef(cartOpen);
  categoryRef.current = category;
  queryRef.current = query;
  cartOpenRef.current = cartOpen;
  useEffect(() => {
    publishCartBadge({
      count: lines.reduce((sum, line) => sum + line.qty, 0),
      open: () => setCartOpen(true),
    });
    return () => publishCartBadge({ count: 0, open: () => {} });
  }, [lines]);
  useEffect(() => {
    function onBack(event: Event) {
      if (cartOpenRef.current) {
        event.preventDefault();
        setCartOpen(false);
        return;
      }
      if (categoryRef.current === "Todas" && !queryRef.current.trim()) return;
      event.preventDefault();
      setCategory("Todas");
      setQuery("");
    }
    window.addEventListener("loja-voltar", onBack);
    return () => window.removeEventListener("loja-voltar", onBack);
  }, []);
  useEffect(() => {
    const root = splitRef.current?.closest(".loja-pedidos");
    if (!root) return;
    root.toggleAttribute("data-categorias", showCategories && !cartOpen);
    return () => root.removeAttribute("data-categorias");
  }, [showCategories, cartOpen]);

  const cartUnits = lines.reduce((sum, line) => sum + line.qty, 0);

  return (
    <div className={showCategories && !cartOpen ? "loja-split loja-split-cats" : "loja-split loja-split-full"} ref={splitRef}>
      <section className={cartOpen ? "loja-cart-section" : undefined}>
        <h1 className="loja-title">{cartOpen ? "Carrinho" : showCategories ? "Categoria" : "Pedido"}</h1>
        <p className="loja-lede">
          {cartOpen
            ? cartUnits
              ? `${cartUnits} ${cartUnits === 1 ? "unidade" : "unidades"} no carrinho.`
              : "O carrinho está vazio."
            : showCategories
              ? "Escolha a categoria."
              : "Escolha o produto e a quantidade."}
        </p>
        {error ? <p className="loja-note">{error}</p> : null}
        {cartOpen ? null : (
        <div className="loja-tools loja-search-line">
          <label className="loja-search">
            <Search size={16} strokeWidth={2.4} aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={category === "Todas" ? "Buscar em todas as categorias" : "Buscar nesta categoria"}
              aria-label={category === "Todas" ? "Buscar em todas as categorias" : "Buscar nesta categoria"}
            />
          </label>
          <button
            type="button"
            className="loja-stock-switch"
            aria-pressed={onlyInStock}
            onClick={() => setOnlyInStock((current) => !current)}
          >
            {onlyInStock ? <Boxes size={16} aria-hidden="true" /> : <PackageX size={16} aria-hidden="true" />}
            <span>EXIBIR DISPONÍVEIS</span>
            <span className="loja-switch" aria-hidden="true">
              <span className="loja-switch-knob" />
            </span>
          </button>
        </div>
        )}
        {cartOpen ? (
          <div className="loja-cart-page">
            <div className="loja-cart-list">
              {lines.length === 0 ? <p className="loja-lede">Nenhum item no carrinho.</p> : null}
              {lines.map((line) => {
                const stock = Math.max(0, Math.floor(Number(line.stockQuantity) || line.qty));
                return (
                  <article key={line.id} className="loja-cart-row">
                    <ProductPhoto productId={line.id} photoFileId={line.photoFileId} name={line.name} />
                    <div className="loja-cart-row-body">
                      <strong>{line.name}</strong>
                      {line.code ? <small>Cód. {line.code}</small> : null}
                      <div className="loja-step">
                        <button type="button" aria-label={`Diminuir ${line.name}`} onClick={() => setQty(line.id, line.qty - 1)}>
                          −
                        </button>
                        <span>{line.qty}</span>
                        <button
                          type="button"
                          aria-label={`Aumentar ${line.name}`}
                          disabled={line.qty >= stock}
                          onClick={() => setQty(line.id, line.qty + 1)}
                        >
                          +
                        </button>
                      </div>
                    </div>
                    {line.price > 0 ? (
                      <div className="loja-cart-price">
                        <span className="loja-money">{money(line.price * line.qty)}</span>
                        {line.qty > 1 ? <small>{money(line.price)} un.</small> : null}
                      </div>
                    ) : (
                      <span />
                    )}
                    <button type="button" className="loja-cart-remove" aria-label={`Remover ${line.name}`} onClick={() => setQty(line.id, 0)}>
                      <Trash2 size={18} strokeWidth={1.7} />
                    </button>
                  </article>
                );
              })}
            </div>
            <aside className="loja-cart-summary">
              <h2>Resumo da compra</h2>
              <p>
                <span>Produtos ({lines.length})</span>
                <b>{money(cartTotal(lines))}</b>
              </p>
              <p className="loja-cart-total">
                <span>Total</span>
                <b>{money(cartTotal(lines))}</b>
              </p>
              <button
                type="button"
                className="loja-btn primary loja-buy-now"
                disabled={!lines.length}
                onClick={() => {
                  const blocked = lines.filter((line) => saleBelowCost(line.price, line.costPrice));
                  if (blocked.length) {
                    setBlockedNotice(blocked);
                    return;
                  }
                  setCloseStep("ask");
                  setConfirmClose(true);
                }}
              >
                Finalizar pedido{cartUnits ? ` (${cartUnits})` : ""}
              </button>
              <button
                type="button"
                className="loja-cart-keep"
                onClick={() => {
                  setCartOpen(false);
                  setCategory("Todas");
                  setQuery("");
                }}
              >
                Continuar comprando
              </button>
            </aside>
          </div>
        ) : showCategories ? (
          <div
            className="loja-cat-cards"
            aria-label="Categorias"
            style={
              {
                "--cat-cols": String(categoryCards.length > 6 ? Math.ceil(categoryCards.length / 2) : Math.max(categoryCards.length, 1)),
                "--cat-rows": String(categoryCards.length > 6 ? 2 : 1),
              } as CSSProperties
            }
          >
            {categoryCards.map((item) => {
              const fallbackCover = !item.coverFileId && !item.photoFileId && /ipad/i.test(`${item.id} ${item.name}`) ? "/capa-ipad.jpg" : "";
              const hasCover = Boolean(item.coverFileId || item.photoFileId || fallbackCover);
              return (
              <button
                key={item.id}
                type="button"
                className={hasCover ? "loja-cat-card has-cover" : "loja-cat-card"}
                onClick={() => setCategory(item.id)}
              >
                {item.coverFileId && item.code ? (
                  <span className="loja-photo">
                    <CategoryCoverImage code={item.code} coverFileId={item.coverFileId} name={item.name} />
                  </span>
                ) : fallbackCover ? (
                  <span className="loja-photo">
                    <img src={fallbackCover} alt="" />
                  </span>
                ) : (
                  <ProductPhoto productId={item.productId} photoFileId={item.photoFileId} name={item.name} />
                )}
                <strong>{item.name}</strong>
              </button>
              );
            })}
          </div>
        ) : (
          <>
            <div className="loja-products">
          {visible.slice(0, 80).map((product) => {
            const inCart = lines.find((item) => item.id === product.id)?.qty ?? 0;
            const stock = Math.max(0, Math.floor(product.stockQuantity));
            const semPreco = !(product.price > 0);
            const pick = Math.min(Math.max(1, picks[product.id] || 1), Math.max(stock, 1));
            return (
              <article key={product.id} className="loja-product">
                <ProductPhoto productId={product.id} photoFileId={product.photoFileId} name={product.name} />
                <div className="loja-product-body">
                  <div className="loja-product-title">
                    <strong
                      title={product.name}
                      style={{ "--chars": String(Math.max(product.name.length, 1)) } as CSSProperties}
                    >
                      {product.name}
                    </strong>
                  </div>
                  <p className="loja-meta">
                    <span className="loja-stock">
                      Estoque:{" "}
                      {product.stockQuantity <= 0 ? (
                        <b className="loja-stock-indisponivel">Indisponível</b>
                      ) : (
                        <b className={`loja-stock-${stockLevel(product.stockQuantity)}`}>{stockLabel(product.stockQuantity)}</b>
                      )}
                    </span>
                    <small>Cód. {product.code}</small>
                  </p>
                  <div className="loja-buy loja-buy-actions">
                    <span className="loja-money">{money(product.price)}</span>
                    <QtyField
                      stock={stock}
                      value={pick}
                      disabled={semPreco}
                      onChange={(qty) => setPicks((current) => ({ ...current, [product.id]: qty }))}
                    />
                    <button
                      type="button"
                      className="loja-btn primary loja-buy-now"
                      disabled={semPreco || stock <= 0 || inCart >= stock}
                      onClick={() => {
                        if (!add(product, pick)) return;
                        setCartOpen(true);
                      }}
                    >
                      Comprar agora
                    </button>
                    <button
                      type="button"
                      className="loja-btn loja-add-cart"
                      disabled={semPreco || stock <= 0 || inCart >= stock}
                      onClick={() => {
                        if (!add(product, pick)) return;
                        setAddedPopup({ product, qty: pick });
                      }}
                    >
                      <ShoppingCart size={16} strokeWidth={2} aria-hidden="true" />
                      Adicionar ao carrinho
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
          </>
        )}
      </section>
      {blockedNotice.length ? (
        <LojaScrim onClick={() => setBlockedNotice([])}>
          <div
            className="loja-confirm-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="loja-blocked-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="loja-confirm-status">
              <span className="loja-confirm-icon loja-confirm-block" aria-hidden="true">
                <Ban size={28} strokeWidth={1.8} />
              </span>
              <h2 id="loja-blocked-title">Produto bloqueado para compra</h2>
              <p>Entre em contato com o suporte.</p>
              <ul>
                {blockedNotice.map((item) => (
                  <li key={item.id}>
                    <span>{item.name}</span>
                    {item.code ? <b>Cód. {item.code}</b> : null}
                  </li>
                ))}
              </ul>
              <div className="loja-confirm-actions loja-blocked-actions">
                <button type="button" className="loja-btn primary" onClick={() => setBlockedNotice([])}>
                  Entendi
                </button>
              </div>
            </div>
          </div>
        </LojaScrim>
      ) : null}
      {addedPopup ? (
        <LojaScrim onClick={() => setAddedPopup(null)}>
          <div
            className="loja-confirm-card loja-added-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="loja-added-title"
            onClick={(event) => event.stopPropagation()}
          >
            <ProductPhoto productId={addedPopup.product.id} photoFileId={addedPopup.product.photoFileId} name={addedPopup.product.name} />
            <h2 id="loja-added-title">Adicionado ao carrinho</h2>
            <p>{addedPopup.product.name}</p>
            <strong>
              {addedPopup.qty} {addedPopup.qty === 1 ? "unidade" : "unidades"}
              {addedPopup.product.price > 0 ? ` · ${money(addedPopup.product.price * addedPopup.qty)}` : ""}
            </strong>
            <div className="loja-confirm-actions">
              <button
                type="button"
                className="loja-btn primary loja-buy-now"
                onClick={() => {
                  setAddedPopup(null);
                  setCartOpen(true);
                }}
              >
                Ir ao carrinho
              </button>
              <button type="button" className="loja-btn loja-go-cart" onClick={() => setAddedPopup(null)}>
                Continuar comprando
              </button>
            </div>
          </div>
        </LojaScrim>
      ) : null}
      {confirmClose ? (
        <LojaScrim
          onClick={() => {
            if (closeStep === "ask") setConfirmClose(false);
          }}
        >
          <div
            className="loja-confirm-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="loja-confirm-title"
            onClick={(event) => event.stopPropagation()}
          >
            {closeStep === "sending" ? (
              <div className="loja-confirm-status">
                <span className="loja-confirm-icon loja-confirm-spin" aria-hidden="true">
                  <LoaderCircle size={28} strokeWidth={1.8} />
                </span>
                <h2 id="loja-confirm-title">Estamos confirmando seu pedido</h2>
                <p>Só um instante.</p>
              </div>
            ) : null}
            {closeStep === "done" ? (
              <div className="loja-confirm-status">
                <span className="loja-confirm-icon loja-confirm-ok" aria-hidden="true">
                  <PartyPopper size={28} strokeWidth={1.8} />
                </span>
                <h2 id="loja-confirm-title">Parabéns!</h2>
                <p>Seu pedido foi confirmado com sucesso.</p>
                <div className="loja-confirm-sum">
                  <span>{closedFlash?.id ? `Pedido ${closedFlash.id.slice(0, 8).toUpperCase()}` : "Pedido fechado"}</span>
                  {closedFlash && closedFlash.total > 0 ? <strong>{money(closedFlash.total)}</strong> : null}
                </div>
                <div className="loja-confirm-actions">
                  <button type="button" className="loja-btn primary" onClick={openClosedHistory}>
                    <CircleCheck size={16} strokeWidth={2} aria-hidden="true" />
                    Ver no histórico
                  </button>
                </div>
              </div>
            ) : null}
            {closeStep === "ask" ? (
              <>
                <div className="loja-confirm-head">
                  <span className="loja-confirm-icon" aria-hidden="true">
                    <ShoppingBag size={22} strokeWidth={1.8} />
                  </span>
                  <div>
                    <h2 id="loja-confirm-title">Fechar pedido?</h2>
                    <p>Confira os itens antes de enviar.</p>
                  </div>
                </div>
                <div className="loja-confirm-sum">
                  <span>
                    {lines.reduce((sum, line) => sum + line.qty, 0)}{" "}
                    {lines.reduce((sum, line) => sum + line.qty, 0) === 1 ? "item" : "itens"}
                  </span>
                  {cartTotal(lines) > 0 ? <strong>{money(cartTotal(lines))}</strong> : null}
                </div>
                <ul>
                  {lines.map((line) => (
                    <li key={line.id}>
                      <span className="loja-confirm-item">
                        <ProductPhoto productId={line.id} photoFileId={line.photoFileId} name={line.name} />
                        {line.name}
                      </span>
                      <b>{line.qty}</b>
                    </li>
                  ))}
                </ul>
                <div className="loja-confirm-actions">
                  <button type="button" className="loja-btn" onClick={() => setConfirmClose(false)}>
                    Voltar
                  </button>
                  <button type="button" className="loja-btn primary" onClick={finish}>
                    <CircleCheck size={16} strokeWidth={2} aria-hidden="true" />
                    Confirmar
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </LojaScrim>
      ) : null}
    </div>
  );
}

function shown(value?: string | null) {
  const text = (value || "").trim();
  return text || "—";
}

function when(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

function ledgerDay(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sem data";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function addressLine(address: Address) {
  const street = [address.rua, address.numero, address.bairro].filter(Boolean).join(", ");
  const city = [address.cidade, address.cep].filter(Boolean).join(" · ");
  return [street, city].filter(Boolean).join(" — ") || "—";
}

function Historico() {
  const navigate = useNavigate();
  const location = useLocation();
  const justClosed = (location.state as { justClosed?: { id: string; total: number; qty: number } } | null)?.justClosed || null;
  const [orders, setOrders] = useState<SavedOrder[]>([]);
  const [faixa, setFaixa] = useState<"separacao" | "concluidas" | "estornadas">("separacao");
  useEffect(() => {
    api
      .get("/clients/pre-vendas/fechadas")
      .then(({ data }) => setOrders((data?.orders || []) as SavedOrder[]))
      .catch(() => setOrders([]));
  }, []);
  const grupos = useMemo(() => ({
    separacao: orders.filter((order) => !order.estornada && !orderDone(order.dispatchStatus)),
    concluidas: orders.filter((order) => !order.estornada && orderDone(order.dispatchStatus)),
    estornadas: orders.filter((order) => order.estornada),
  }), [orders]);
  const visiveis = grupos[faixa];
  const cards = [
    ["separacao", "Em separação", grupos.separacao.length, "hist-card-separacao"],
    ["concluidas", "Concluídas", grupos.concluidas.length, "hist-card-concluidas"],
    ["estornadas", "Estornadas", grupos.estornadas.length, "hist-card-estornadas"],
  ] as const;
  return (
    <section className="loja-panel">
      {justClosed ? (
        <div className="loja-success">
          <span className="loja-confirm-icon loja-confirm-ok" aria-hidden="true">
            <PartyPopper size={22} strokeWidth={1.8} />
          </span>
          <div>
            <h2>Parabéns! Pedido confirmado com sucesso.</h2>
            <p>
              {justClosed.id ? `Pedido ${justClosed.id.slice(0, 8).toUpperCase()}` : "Seu pedido"}
              {justClosed.qty ? ` · ${justClosed.qty} ${justClosed.qty === 1 ? "item" : "itens"}` : ""}
              {justClosed.total > 0 ? ` · ${money(justClosed.total)}` : ""}
              {" "}já está na lista.
            </p>
          </div>
        </div>
      ) : null}
      <h1 className="loja-title">Histórico de pedido</h1>
      <div className="hist-cards">
        {cards.map(([id, label, total, tone]) => (
          <button
            key={id}
            type="button"
            className={`hist-card ${tone}${faixa === id ? " is-on" : ""}`}
            onClick={() => setFaixa(id)}
          >
            <span>{label}</span>
            <strong>{total}</strong>
          </button>
        ))}
      </div>
      <table className="loja-table">
        <thead>
          <tr>
            <th>Código</th>
            <th>Feito em</th>
            <th>Estornado em</th>
            <th>Valor</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {visiveis.map((order) => (
            <tr
              key={order.id}
              className="loja-row-link"
              onClick={() => navigate(`/client/pedidos/historico/${order.id}`)}
            >
              <td>{order.id.slice(0, 8)}</td>
              <td>{when(order.closedAt || order.createdAt)}</td>
              <td>{order.estornada ? when(order.estornadaAt) : ""}</td>
              <td className="loja-money">{money(order.total)}</td>
              <td><StatusLabel value={order.dispatchStatus} estornada={order.estornada} /></td>
              <td>
                <Link to={`/client/pedidos/imprimir/${order.id}`} onClick={(event) => event.stopPropagation()}>
                  Imprimir
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function PedidoDetalhe() {
  const { pathname } = useLocation();
  const { client } = useClientAuth();
  const orderId = pathname.split("/historico/")[1]?.split("/")[0] || "";
  const [order, setOrder] = useState<SavedOrder | null>(null);
  const [missing, setMissing] = useState(false);
  const [openLines, setOpenLines] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!orderId) {
      setMissing(true);
      return;
    }
    api
      .get("/clients/pre-vendas/fechadas")
      .then(({ data }) => {
        const found = ((data?.orders || []) as SavedOrder[]).find((item) => item.id === orderId) || null;
        setOrder(found);
        setMissing(!found);
      })
      .catch(() => setMissing(true));
  }, [orderId]);

  if (missing) {
    return (
      <section className="loja-panel">
        <h1 className="loja-title">Pedido</h1>
        <p className="loja-lede">Esse pedido não está no histórico desta loja.</p>
        <Link className="loja-btn" to="/client/pedidos/historico">
          Voltar ao histórico
        </Link>
      </section>
    );
  }

  if (!order) return <p className="loja-lede">Carregando pedido…</p>;

  const lines = order.lines || [];
  const gross = lines.reduce((sum, line) => sum + line.price * line.qty, 0);
  const total = order.total || gross;
  const qty = lines.reduce((sum, line) => sum + line.qty, 0);
  const code = order.id.slice(0, 8).toUpperCase();

  return (
    <section className="loja-panel loja-detail">
      <div className="loja-detail-head">
        <div>
          <p className="loja-kicker">Pedido</p>
          <h1 className="loja-title">Pedido nº {code}</h1>
        </div>
        <div className="loja-detail-actions">
          <Link className="loja-btn" to="/client/pedidos/historico">
            Voltar
          </Link>
          <Link className="loja-btn primary" to={`/client/pedidos/imprimir/${order.id}`}>
            Imprimir
          </Link>
        </div>
      </div>
      <p className="loja-detail-meta">
        Abertura: {when(order.createdAt)}
        <span>Fechamento: {when(order.closedAt)}</span>
      </p>

      <div className="loja-detail-sheet">
        <p>Nome: {shown(order.address?.nome || client?.name)}</p>
        <p>CPF/CNPJ: {shown(client?.document)}</p>
        <p>E-mail: {shown(client?.email)}</p>
        <p>Endereço: {addressLine(order.address || {})}</p>
      </div>

      <table className="loja-table">
        <thead>
          <tr>
            <th>Código</th>
            <th>Produto</th>
            <th>Valor unit.</th>
            <th>Qtd</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => {
            const imeis = orderDone(order.dispatchStatus) ? line.imeis || [] : [];
            const open = !!openLines[line.id];
            return (
              <tr key={line.id}>
                <td>{shown(line.code)}</td>
                <td>
                  <div className="loja-prod">
                    {imeis.length ? (
                      <button
                        type="button"
                        className="loja-plus"
                        aria-expanded={open}
                        aria-label={open ? "Fechar IMEIs" : "Abrir IMEIs"}
                        onClick={() => setOpenLines((current) => ({ ...current, [line.id]: !current[line.id] }))}
                      >
                        {open ? "–" : "+"}
                      </button>
                    ) : null}
                    <span>{line.name}</span>
                  </div>
                  {open && imeis.length ? (
                    <ul className="loja-imeis">
                      {imeis.map((serial) => (
                        <li key={serial}>{serial}</li>
                      ))}
                    </ul>
                  ) : null}
                </td>
                <td>{money(line.price)}</td>
                <td>{line.qty}</td>
                <td className="loja-money">{money(line.price * line.qty)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="loja-totals">
        <p><span>Total sem desconto</span><strong>{money(gross)}</strong></p>
        <p><span>Total descontos</span><strong>{money(0)}</strong></p>
        <p><span>Total frete</span><strong>{money(0)}</strong></p>
        <p><span>Total outras despesas</span><strong>{money(0)}</strong></p>
        <p><span>Total seguro</span><strong>{money(0)}</strong></p>
        <p><span>Total itens</span><strong>{qty}</strong></p>
        <p className="loja-totals-main"><span>Total do pedido</span><strong>{money(total)}</strong></p>
      </div>

      <div className="loja-detail-sheet">
        <p>Feito em: {when(order.closedAt || order.createdAt)}</p>
        <p>Estornado em: {order.estornada ? when(order.estornadaAt) : "—"}</p>
        <p>Status: <StatusLabel value={order.dispatchStatus} estornada={order.estornada} /></p>
        <p>Obs: {shown(order.observacao || order.address?.obs)}</p>
      </div>
    </section>
  );
}

function Financeiro() {
  const [orders, setOrders] = useState<SavedOrder[]>([]);
  const [payments, setPayments] = useState<{ date: string; description: string; value: number }[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  useEffect(() => {
    api
      .get("/clients/pre-vendas/fechadas")
      .then(({ data }) => setOrders((data?.orders || []) as SavedOrder[]))
      .catch(() => setOrders([]));
    api
      .get("/clients/conta")
      .then(({ data }) => {
        const lines = Array.isArray(data?.lines) ? data.lines : [];
        setPayments(
          lines.filter(
            (line: { description?: string }) => !/^(pedido|estorno pedido)\b/i.test(line.description || ""),
          ),
        );
      })
      .catch(() => setPayments([]));
  }, []);

  const groups = useMemo(() => {
    const sorted = [...orders].sort(
      (a, b) => new Date(a.closedAt || a.createdAt).getTime() - new Date(b.closedAt || b.createdAt).getTime(),
    );
    let balance = 0;
    const byDate = new Map<string, { label: string; amount: number; balance: number; orderId: string }[]>();
    const events = [
      ...sorted.flatMap((order) => {
        const code = order.id.slice(0, 8).toUpperCase();
        const rows = [{ at: order.closedAt || order.createdAt, label: `Pedido: ${code}`, amount: -Math.abs(order.total || 0), orderId: order.id }];
        if (order.estornada) {
          rows.push({
            at: order.estornadaAt || order.closedAt || order.createdAt,
            label: `Estorno pedido: ${code}`,
            amount: Math.abs(order.total || 0),
            orderId: order.id,
          });
        }
        return rows;
      }),
      ...payments.map((line) => ({
        at: line.date,
        label: line.description || "Lançamento",
        amount: Number(line.value) || 0,
        orderId: "",
      })),
    ].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
    events.forEach((event) => {
      const date = ledgerDay(event.at);
      balance += event.amount;
      const rows = byDate.get(date) || [];
      rows.push({ label: event.label, amount: event.amount, balance, orderId: event.orderId });
      byDate.set(date, rows);
    });
    return { balance, dates: [...byDate.entries()] };
  }, [orders, payments]);

  const openOrder = orders.find((order) => order.id === openId) || null;

  useEffect(() => {
    if (!openOrder) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenId(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openOrder]);

  return (
    <section className="loja-panel loja-ledger">
      <h1 className="loja-title">Financeiro</h1>
      <p className="loja-lede">Conta desta loja com o atacado. Pedido fechado entra como débito. Estorno e pagamento lançado no caixa entram como crédito.</p>
      {groups.dates.length === 0 ? <p>Nenhum movimento nesta conta.</p> : null}
      {groups.dates.length > 0 ? (
        <p className="loja-ledger-open">
          <span>Saldo anterior</span>
          <strong>{signedMoney(0)}</strong>
        </p>
      ) : null}
      {groups.dates.map(([date, rows]) => {
        const dayBalance = rows[rows.length - 1]?.balance || 0;
        return (
          <div key={date} className="loja-ledger-day">
            <h2>{date}</h2>
            <p className="loja-ledger-head">
              <span>Movimento</span>
              <span>Valor</span>
              <span>Saldo</span>
            </p>
            {rows.map((row) => (
              <p key={`${row.orderId}-${row.label}`} className="loja-ledger-row">
                {row.orderId ? (
                  <button type="button" onClick={() => setOpenId(row.orderId)}>{row.label}</button>
                ) : (
                  <span>{row.label}</span>
                )}
                <span className={row.amount < 0 ? "neg" : "pos"}>{signedMoney(row.amount)}</span>
                <strong className={row.balance < 0 ? "neg" : "pos"}>{signedMoney(row.balance)}</strong>
              </p>
            ))}
            <p className="loja-ledger-close">
              <span>Saldo do dia</span>
              <strong className={dayBalance < 0 ? "neg" : "pos"}>{signedMoney(dayBalance)}</strong>
            </p>
          </div>
        );
      })}
      {groups.dates.length > 0 ? (
        <p className={`loja-ledger-final ${groups.balance < 0 ? "neg" : "pos"}`}>{signedMoney(groups.balance)}</p>
      ) : null}
      {openOrder ? (
        <LojaScrim onClick={() => setOpenId(null)}>
          <div
            className="loja-confirm-card loja-order-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="loja-order-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button className="loja-order-close" type="button" aria-label="Fechar" onClick={() => setOpenId(null)}>
              <X size={18} />
            </button>
            <h2 id="loja-order-title">Pedido {openOrder.id.slice(0, 8).toUpperCase()}</h2>
            <p>{when(openOrder.closedAt || openOrder.createdAt)} · {money(openOrder.total || 0)}</p>
            <ul className="loja-order-lines">
              {openOrder.lines.map((line) => (
                <li key={`${line.id}-${line.code}`}>
                  <b>{line.name}</b>
                  <span>{line.code}</span>
                  <span>{line.qty} × {money(line.price || 0)}</span>
                </li>
              ))}
            </ul>
            <p>Status: <StatusLabel value={openOrder.dispatchStatus} estornada={openOrder.estornada} /></p>
            <p>Obs: {shown(openOrder.observacao || openOrder.address?.obs)}</p>
          </div>
        </LojaScrim>
      ) : null}
    </section>
  );
}

function Rastreio() {
  const [code, setCode] = useState("");
  const [cep, setCep] = useState("");
  const [result, setResult] = useState("");

  function search(event: FormEvent) {
    event.preventDefault();
    if (code.trim().length < 8) {
      setResult("Informe o código de rastreio.");
      return;
    }
    setResult(
      `Simulação Correios para ${code.trim().toUpperCase()}${cep ? `, CEP ${cep}` : ""}. Objeto postado. A API dos Correios ainda não está ligada.`,
    );
  }

  return (
    <section className="loja-panel">
      <h1 className="loja-title">Rastreio</h1>
      <p className="loja-note">Os Correios ainda não estão ligados. Esta tela mostra um rastreio de exemplo.</p>
      <form className="loja-tools" onSubmit={search}>
        <input value={code} onChange={(event) => setCode(event.target.value)} placeholder="Código de rastreio" aria-label="Código de rastreio" />
        <input value={cep} onChange={(event) => setCep(event.target.value)} placeholder="CEP" aria-label="CEP" />
        <button className="loja-btn primary" type="submit">
          Buscar
        </button>
      </form>
      {result ? <p>{result}</p> : null}
    </section>
  );
}

function Observacao() {
  const [term, setTerm] = useState("");
  const [order, setOrder] = useState<PurchaseView | null>(null);
  const [message, setMessage] = useState("");

  async function search(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    setOrder(null);
    if (term.trim().length < 8) {
      setMessage("Digite pelo menos 8 caracteres do IMEI ou do serial.");
      return;
    }
    try {
      const { data } = await api.get("/clients/pre-vendas/imei", { params: { imei: term.trim() } });
      setOrder((data?.order as PurchaseView) || null);
      if (!data?.order) setMessage("Nenhum pedido encontrado para esse IMEI ou serial.");
    } catch {
      setMessage("Nenhum pedido encontrado para esse IMEI ou serial.");
    }
  }

  return (
    <section className="loja-panel">
      <h1 className="loja-title">Busca IMEI/serial</h1>
      <p className="loja-lede">
        A lista só abre se este IMEI estiver na compra desta loja. Compra de outra loja, ou nota de fornecedor, não aparece.
      </p>
      <form className="loja-tools" onSubmit={search}>
        <input
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="IMEI ou serial, ex. SDRD4GN7FW0"
          aria-label="IMEI ou serial"
        />
        <button className="loja-btn primary" type="submit">
          Buscar
        </button>
      </form>
      {message ? <p>{message}</p> : null}
      {order ? (
        <>
          <p>
            Pedido {order.number}
            {order.date ? ` · ${new Date(order.date).toLocaleDateString("pt-BR")}` : ""}
            {order.observacao ? ` · ${order.observacao}` : ""}
          </p>
          <table className="loja-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Produto</th>
                <th>Qtd</th>
              </tr>
            </thead>
            <tbody>
              {order.lines.map((line, index) => (
                <tr key={`${line.code}-${index}`}>
                  <td>{line.code || "—"}</td>
                  <td>{line.name}</td>
                  <td>{line.qty}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : null}
    </section>
  );
}

function Endereco() {
  const navigate = useNavigate();
  const [lines, setLines] = useState<CartLine[]>([]);
  const [form, setForm] = useState({
    titulo: "",
    nome: "",
    cep: "",
    rua: "",
    numero: "",
    bairro: "",
    cidade: "",
    obs: "",
  });

  useEffect(() => {
    loadOpen()
      .then((order) => {
        if (!order) return;
        setLines(order.lines || []);
        const saved = order.address || {};
        setForm({
          titulo: saved.titulo || "",
          nome: saved.nome || "",
          cep: saved.cep || "",
          rua: saved.rua || "",
          numero: saved.numero || "",
          bairro: saved.bairro || "",
          cidade: saved.cidade || "",
          obs: saved.obs || "",
        });
      })
      .catch(() => undefined);
  }, []);

  async function save(event: FormEvent) {
    event.preventDefault();
    await saveOpen(lines, form);
    navigate("/client/pedidos/venda");
  }

  function set(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  return (
    <form className="loja-panel loja-field" onSubmit={save}>
      <h1 className="loja-title">Endereço de entrega</h1>
      <input placeholder="Título" value={form.titulo} onChange={(event) => set("titulo", event.target.value)} />
      <input placeholder="Nome" value={form.nome} onChange={(event) => set("nome", event.target.value)} />
      <input placeholder="CEP" value={form.cep} onChange={(event) => set("cep", event.target.value)} />
      <input placeholder="Rua" value={form.rua} onChange={(event) => set("rua", event.target.value)} />
      <input placeholder="Número" value={form.numero} onChange={(event) => set("numero", event.target.value)} />
      <input placeholder="Bairro" value={form.bairro} onChange={(event) => set("bairro", event.target.value)} />
      <input placeholder="Cidade" value={form.cidade} onChange={(event) => set("cidade", event.target.value)} />
      <textarea placeholder="Observação" value={form.obs} onChange={(event) => set("obs", event.target.value)} />
      <button className="loja-btn primary" type="submit">
        Usar este endereço
      </button>
    </form>
  );
}

const CODE128_PATTERNS = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213",
  "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132",
  "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211",
  "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313",
  "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331",
  "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111",
  "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214",
  "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111",
  "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141",
  "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141",
  "114131", "311141", "411131", "211412", "211214", "211232", "2331112",
];

function code128Bars(value: string) {
  const codes = [104];
  for (const char of value) {
    const symbol = char.charCodeAt(0) - 32;
    if (symbol >= 0 && symbol <= 94) codes.push(symbol);
  }
  let checksum = codes[0];
  for (let index = 1; index < codes.length; index += 1) checksum += codes[index] * index;
  codes.push(checksum % 103, 106);
  const bars: { x: number; width: number }[] = [];
  let cursor = 0;
  codes.forEach((code) => {
    const pattern = CODE128_PATTERNS[code] || "";
    let ink = true;
    for (const part of pattern) {
      const width = Number(part);
      if (ink) bars.push({ x: cursor, width });
      cursor += width;
      ink = !ink;
    }
  });
  return { bars, width: cursor };
}

function barcodePng(value: string) {
  const { bars, width } = code128Bars(value);
  const scale = 3;
  const height = 46;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, width * scale);
  canvas.height = height * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#111";
  bars.forEach((bar) => {
    ctx.fillRect(bar.x * scale, 0, Math.max(1, bar.width * scale), canvas.height);
  });
  return canvas.toDataURL("image/png");
}

function OrderBarcode({ value }: { value: string }) {
  const src = useMemo(() => barcodePng(value), [value]);
  if (!src) return null;
  return <img className="loja-slip-barcode" src={src} alt={`Código de barras do pedido ${value}`} />;
}

function Imprimir() {
  const { pathname } = useLocation();
  const { client } = useClientAuth();
  const orderId = pathname.split("/imprimir/")[1] || "";
  const [order, setOrder] = useState<SavedOrder | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!orderId) {
      setMissing(true);
      return;
    }
    api
      .get("/clients/pre-vendas/fechadas")
      .then(({ data }) => {
        const found = ((data?.orders || []) as SavedOrder[]).find((item) => item.id === orderId) || null;
        setOrder(found);
        setMissing(!found);
      })
      .catch(() => setMissing(true));
  }, [orderId]);

  if (missing) {
    return (
      <section className="loja-panel">
        <h1 className="loja-title">Imprimir</h1>
        <p className="loja-lede">A impressão abre só depois que o pedido está fechado, pelo histórico.</p>
        <Link className="loja-btn" to="/client/pedidos/historico">
          Histórico
        </Link>
      </section>
    );
  }

  if (!order) return <p className="loja-lede">Carregando pedido…</p>;

  const lines = order.lines || [];
  const code = order.id.slice(0, 8).toUpperCase();

  return (
    <section className="loja-print">
      <article className="loja-slip">
        <p className="loja-slip-kicker">Pedido</p>
        <OrderBarcode value={code} />
        <strong className="loja-slip-code">{code}</strong>
        <p className="loja-slip-when">{when(order.closedAt || order.createdAt)}</p>
        <div className="loja-slip-client">
          <span>Cliente</span>
          <strong>{shown(order.address?.nome || client?.name)}</strong>
        </div>
        <ul className="loja-slip-items">
          {lines.map((line) => (
            <li key={line.id}>
              <b>{shown(line.code)}</b>
              <span>{line.qty} un</span>
              <em>{line.name}</em>
            </li>
          ))}
        </ul>
      </article>
    </section>
  );
}

export default function LojistaPedidos() {
  const { pathname } = useLocation();
  const view =
    pathname.endsWith("/venda") ? (
      <Venda />
    ) :     pathname.includes("/historico/") ? (
      <PedidoDetalhe />
    ) : pathname.endsWith("/historico") ? (
      <Historico />
    ) : pathname.endsWith("/financeiro") ? (
      <Financeiro />
    ) : pathname.endsWith("/rastreio") ? (
      <Rastreio />
    ) : pathname.endsWith("/observacao") ? (
      <Observacao />
    ) : pathname.endsWith("/endereco") ? (
      <Endereco />
    ) : pathname.includes("/imprimir") ? (
      <Imprimir />
    ) : (
      <Home />
    );

  return (
    <PdvShell className="loja-vitrine">
      <LojaFrame>{view}</LojaFrame>
    </PdvShell>
  );
}

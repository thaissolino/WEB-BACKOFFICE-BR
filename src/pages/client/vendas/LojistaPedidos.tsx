import { CSSProperties, FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ClipboardList, ScanLine, ShoppingBag, Truck, Wallet } from "lucide-react";
import { api, parseError } from "../../../services/api";
import { ProductPhoto } from "../cadastros/produtos/GradePhotoThumb";
import PdvShell from "../dashboard/PdvShell";
import { useClientAuth } from "../../../hooks/clientAuth";
import "../dashboard/dashboard.css";
import "./pedidos.css";

type CatalogProduct = {
  id: string;
  name: string;
  code: string;
  price: number;
  category: string;
  categoryId: string;
  photoFileId: string | null;
  stockQuantity: number;
};

type StoreCategory = {
  id: string;
  name: string;
};

const CATEGORY_ORDER = ["iphone-novos", "iphone-seminovos", "apple-watch", "ipad", "macbook"];

function categorySortKey(id: string) {
  const index = CATEGORY_ORDER.indexOf(id);
  return index === -1 ? CATEGORY_ORDER.length : index;
}

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
  { to: "/client/pedidos/venda", label: "Pedido" },
  { to: "/client/pedidos/historico", label: "Histórico" },
  { to: "/client/pedidos/financeiro", label: "Financeiro" },
  { to: "/client/pedidos/rastreio", label: "Rastreio" },
  { to: "/client/pedidos/observacao", label: "Busca IMEI/serial" },
];

function orderDone(value?: string) {
  return value === "ENVIADO" || value === "CONFERIDO";
}

function orderStatus(value?: string) {
  return orderDone(value) ? "Concluído" : "Em separação";
}

function StatusLabel({ value }: { value?: string }) {
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

function LojaFrame({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  return (
      <div className="loja-pedidos">
        <div className="loja-top loja-no-print">
          <p className="loja-kicker">Gestão de pedidos</p>
          <Link to="/client/dashboard">Painel da loja</Link>
        </div>
        <nav className="loja-nav loja-no-print" aria-label="Pedidos do lojista">
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
  const total = cartTotal(lines);
  return (
    <>
      <header>
        <h1 className="loja-title">Pedido</h1>
        <p className="loja-lede">
          {lines.length
            ? `Pedido aberto com ${lines.length} item(ns), total ${money(total)}.`
            : "Nenhum pedido aberto."}
        </p>
      </header>
      <div className="loja-grid">
        <Link className="loja-card loja-card-feature" to="/client/pedidos/venda">
          <span className="loja-card-kicker">Pedido</span>
          <strong>{lines.length ? money(total) : "Abrir pedido"}</strong>
          <span className="loja-card-copy">
            {lines.length
              ? `${lines.length} ${lines.length === 1 ? "item" : "itens"} no pedido aberto.`
              : "Escolha os produtos e a quantidade."}
          </span>
          <span className="loja-card-go">Continuar</span>
          <ShoppingBag className="loja-card-mark" size={148} strokeWidth={1.15} aria-hidden="true" />
        </Link>
        <Link className="loja-card" to="/client/pedidos/historico">
          <ClipboardList size={26} strokeWidth={1.75} aria-hidden="true" />
          <strong>Histórico</strong>
          <span>Pedidos já fechados.</span>
        </Link>
        <Link className="loja-card" to="/client/pedidos/financeiro">
          <Wallet size={26} strokeWidth={1.75} aria-hidden="true" />
          <strong>Financeiro</strong>
          <span>Conta da loja com o atacado.</span>
        </Link>
        <Link className="loja-card" to="/client/pedidos/rastreio">
          <Truck size={26} strokeWidth={1.75} aria-hidden="true" />
          <strong>Rastreio</strong>
          <span>Entrega do pedido.</span>
        </Link>
        <Link className="loja-card" to="/client/pedidos/observacao">
          <ScanLine size={26} strokeWidth={1.75} aria-hidden="true" />
          <strong>IMEI / serial</strong>
          <span>Achar uma compra desta loja.</span>
        </Link>
      </div>
    </>
  );
}

function Venda() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Todas");
  const [stockFilter, setStockFilter] = useState<"todos" | "com">("todos");
  const [storeCategories, setStoreCategories] = useState<StoreCategory[]>([]);
  const [lines, setLines] = useState<CartLine[]>([]);
  const [address, setAddress] = useState<Address>(EMPTY_ADDRESS);
  const [observacao, setObservacao] = useState("");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
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
        const items = (data?.items || []) as Array<{ name?: string; payload?: { slug?: string } }>;
        setStoreCategories(
          items
            .map((item) => ({
              id: String(item.payload?.slug || item.name || ""),
              name: String(item.name || ""),
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
            name: String(item.name || ""),
            code: String(item.code || ""),
            price: Number(item.salePrice || item.priceweightAverage || 0),
            category: String(item.category || ""),
            categoryId: String(item.categoryId || ""),
            photoFileId: item.photoFileId ? String(item.photoFileId) : null,
            stockQuantity: Number(item.stockQuantity || 0),
          })),
        );
      })
      .catch(() => setError("Não foi possível carregar o catálogo da central."));
  }, []);

  const categories = useMemo(() => {
    const priced = products.filter((item) => item.price > 0);
    const usedIds = new Set(priced.map((item) => item.categoryId).filter(Boolean));
    const usedNames = new Set(priced.map((item) => item.category).filter(Boolean));
    const fromStore = storeCategories.filter((item) => usedIds.has(item.id) || usedNames.has(item.name));
    const known = new Set(fromStore.flatMap((item) => [item.id, item.name]));
    const extras = Array.from(usedNames)
      .filter((name) => !known.has(name))
      .map((name) => ({ id: name, name }));
    const ordered = [...fromStore, ...extras].sort((a, b) => {
      const rank = categorySortKey(a.id) - categorySortKey(b.id);
      if (rank !== 0) return rank;
      return a.name.localeCompare(b.name, "pt-BR");
    });
    return [{ id: "Todas", name: "Todas" }, ...ordered];
  }, [products, storeCategories]);

  const categoryCards = useMemo(() => {
    return categories
      .filter((item) => item.id !== "Todas" && item.id !== "papelaria" && item.name.toLowerCase() !== "papelaria")
      .map((item) => {
        const inCategory = products.filter(
          (product) => product.price > 0 && (product.categoryId === item.id || product.category === item.name),
        );
        const sample = inCategory.find((product) => product.photoFileId) || inCategory[0];
        return {
          ...item,
          productId: sample?.id || "",
          photoFileId: sample?.photoFileId || null,
        };
      });
  }, [categories, products]);

  const showCategories = category === "Todas" && !query.trim();

  const visible = products.filter((item) => {
    if (!(item.price > 0)) return false;
    const text = `${item.name} ${item.code}`.toLowerCase();
    const matchesQuery = text.includes(query.trim().toLowerCase());
    const matchesCategory =
      category === "Todas" || item.categoryId === category || item.category === category;
    const matchesStock = stockFilter === "todos" || item.stockQuantity > 0;
    return matchesQuery && matchesCategory && matchesStock;
  });

  function add(product: CatalogProduct) {
    setLines((current) => {
      const found = current.find((line) => line.id === product.id);
      if (found) {
        return current.map((line) => (line.id === product.id ? { ...line, qty: line.qty + 1 } : line));
      }
      return [...current, { ...product, qty: 1 }];
    });
  }

  async function finish() {
    if (!lines.length || closing.current) return;
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
    try {
      await api.post("/clients/pre-vendas/fechar", payload);
      setLines([]);
      navigate("/client/pedidos/historico");
    } catch (err) {
      closing.current = false;
      const parsed = parseError(err);
      setError(parsed.friend || parsed.message || "Não foi possível gravar o pedido fechado.");
    }
  }

  function setQty(id: string, qty: number) {
    setLines((current) =>
      qty < 1 ? current.filter((line) => line.id !== id) : current.map((line) => (line.id === id ? { ...line, qty } : line)),
    );
  }

  return (
    <div className="loja-split">
      <section>
        <h1 className="loja-title">Pedido</h1>
        <p className="loja-lede">Escolha o produto, a quantidade e feche o pedido.</p>
        {error ? <p className="loja-note">{error}</p> : null}
        <div className="loja-tools">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar produto"
            aria-label="Buscar produto"
          />
        </div>
        {showCategories ? (
          <div className="loja-cat-cards" aria-label="Categorias">
            {categoryCards.map((item) => (
              <button key={item.id} type="button" className="loja-cat-card" onClick={() => setCategory(item.id)}>
                <ProductPhoto productId={item.productId} photoFileId={item.photoFileId} name={item.name} />
                <strong>{item.name}</strong>
              </button>
            ))}
          </div>
        ) : (
          <>
            <div className="loja-cats" aria-label="Estoque">
              <button type="button" onClick={() => { setCategory("Todas"); setQuery(""); }}>
                Categorias
              </button>
              <button type="button" aria-pressed={stockFilter === "todos"} onClick={() => setStockFilter("todos")}>
                Todos
              </button>
              <button type="button" aria-pressed={stockFilter === "com"} onClick={() => setStockFilter("com")}>
                Com estoque
              </button>
            </div>
            <div className="loja-products">
          {visible.slice(0, 80).map((product) => {
            const qty = lines.find((item) => item.id === product.id)?.qty ?? 0;
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
                  <div className="loja-buy">
                    <span className="loja-money">{money(product.price)}</span>
                    <div className="loja-qty">
                      <button
                        type="button"
                        aria-label={`Diminuir ${product.name}`}
                        disabled={qty === 0}
                        onClick={() => setQty(product.id, qty - 1)}
                      >
                        −
                      </button>
                      <span>{qty}</span>
                      <button
                        type="button"
                        aria-label={`Aumentar ${product.name}`}
                        onClick={() => (qty === 0 ? add(product) : setQty(product.id, qty + 1))}
                        disabled={product.stockQuantity <= 0}
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
          </>
        )}
      </section>
      <aside className="loja-panel loja-cart">
        <strong>Pedido</strong>
        {lines.length === 0 ? <p className="loja-lede">Nenhum item no pedido.</p> : null}
        {lines.map((line) => (
          <div key={line.id} className="loja-line">
            <ProductPhoto productId={line.id} photoFileId={line.photoFileId} name={line.name} />
            <div>
              <span>{line.name}</span>
              <div className="loja-qty">
                <button type="button" aria-label={`Diminuir ${line.name}`} onClick={() => setQty(line.id, line.qty - 1)}>
                  −
                </button>
                <span>{line.qty}</span>
                <button type="button" aria-label={`Aumentar ${line.name}`} onClick={() => setQty(line.id, line.qty + 1)}>
                  +
                </button>
              </div>
            </div>
            {line.price > 0 ? <span className="loja-money">{money(line.price * line.qty)}</span> : <span />}
          </div>
        ))}
        {cartTotal(lines) > 0 ? <p className="loja-money">Total {money(cartTotal(lines))}</p> : null}
        <button type="button" className="loja-btn primary" onClick={finish} disabled={!lines.length}>
          Fechar pedido
        </button>
      </aside>
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
  return date.toLocaleString("pt-BR");
}

function addressLine(address: Address) {
  const street = [address.rua, address.numero, address.bairro].filter(Boolean).join(", ");
  const city = [address.cidade, address.cep].filter(Boolean).join(" · ");
  return [street, city].filter(Boolean).join(" — ") || "—";
}

function Historico() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<SavedOrder[]>([]);
  useEffect(() => {
    api
      .get("/clients/pre-vendas/fechadas")
      .then(({ data }) => setOrders((data?.orders || []) as SavedOrder[]))
      .catch(() => setOrders([]));
  }, []);
  return (
    <section className="loja-panel">
      <h1 className="loja-title">Histórico de pedido</h1>
      <p className="loja-lede">Pedidos fechados gravados no banco. A compra no atacado, pelo IMEI, fica em Busca IMEI/serial.</p>
      {orders.length === 0 ? <p>Nenhum pedido fechado ainda.</p> : null}
      <table className="loja-table">
        <thead>
          <tr>
            <th>Código</th>
            <th>Data</th>
            <th>Valor</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr
              key={order.id}
              className="loja-row-link"
              onClick={() => navigate(`/client/pedidos/historico/${order.id}`)}
            >
              <td>{order.id.slice(0, 8)}</td>
              <td>{when(order.closedAt || order.createdAt)}</td>
              <td className="loja-money">{money(order.total)}</td>
              <td><StatusLabel value={order.dispatchStatus} /></td>
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
        <p>Status: <StatusLabel value={order.dispatchStatus} /></p>
        <p>Obs: {shown(order.observacao || order.address?.obs)}</p>
      </div>
    </section>
  );
}

function Financeiro() {
  const [orders, setOrders] = useState<SavedOrder[]>([]);
  useEffect(() => {
    api
      .get("/clients/pre-vendas/fechadas")
      .then(({ data }) => setOrders((data?.orders || []) as SavedOrder[]))
      .catch(() => setOrders([]));
  }, []);

  const groups = useMemo(() => {
    const sorted = [...orders].sort(
      (a, b) => new Date(a.closedAt || a.createdAt).getTime() - new Date(b.closedAt || b.createdAt).getTime(),
    );
    let balance = 0;
    const byDate = new Map<string, { label: string; amount: number; balance: number; href: string }[]>();
    sorted.forEach((order) => {
      const whenAt = order.closedAt || order.createdAt;
      const date = new Date(whenAt).toLocaleDateString("pt-BR");
      const amount = -Math.abs(order.total || 0);
      balance += amount;
      const rows = byDate.get(date) || [];
      rows.push({
        label: `Pedido: ${order.id.slice(0, 8).toUpperCase()}`,
        amount,
        balance,
        href: `/client/pedidos/historico/${order.id}`,
      });
      byDate.set(date, rows);
    });
    return { balance, dates: [...byDate.entries()] };
  }, [orders]);

  return (
    <section className="loja-panel loja-ledger">
      <h1 className="loja-title">Financeiro</h1>
      <p className="loja-lede">Conta desta loja com o atacado. Pedido fechado entra como débito.</p>
      {groups.dates.length === 0 ? <p>Nenhum movimento nesta conta.</p> : null}
      {groups.dates.map(([date, rows], index) => (
        <div key={date} className="loja-ledger-day">
          <h2>{date}</h2>
          {index === 0 ? (
            <>
              <p className="loja-ledger-open">
                <span>Saldo anterior</span>
                <strong>{signedMoney(0)}</strong>
              </p>
              <h2>{date}</h2>
            </>
          ) : null}
          {rows.map((row) => (
            <p key={row.href} className="loja-ledger-row">
              <Link to={row.href}>{row.label}</Link>
              <span className={row.amount < 0 ? "neg" : "pos"}>{signedMoney(row.amount)}</span>
              <strong className={row.balance < 0 ? "neg" : "pos"}>{signedMoney(row.balance)}</strong>
            </p>
          ))}
        </div>
      ))}
      {groups.dates.length > 0 ? (
        <p className={`loja-ledger-final ${groups.balance < 0 ? "neg" : "pos"}`}>{signedMoney(groups.balance)}</p>
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
  const gross = lines.reduce((sum, line) => sum + line.price * line.qty, 0);
  const total = order.total || gross;
  const qty = lines.reduce((sum, line) => sum + line.qty, 0);
  const code = order.id.slice(0, 8).toUpperCase();
  const city = shown(order.address?.cidade);

  return (
    <section className="loja-print">
      <article className="loja-slip">
        <header className="loja-slip-top">
          <span>{when(order.closedAt || order.createdAt)}</span>
          <strong>{shown(client?.name)}</strong>
          <span>1/1</span>
        </header>
        <h1>PEDIDO</h1>

        <h2>Dados do pedido</h2>
        <p>Cód. pedido: {code}</p>
        <p>Emissão: {when(order.createdAt)}</p>
        <p>Fechamento: {when(order.closedAt)}</p>
        <p>Identificação: {shown(order.address?.nome || client?.name)}</p>

        <h2>Dados do cliente</h2>
        <p>Cliente: {shown(order.address?.nome || client?.name)}</p>
        <p>CPF/CNPJ: {shown(client?.document)}</p>
        <p>E-mail: {shown(client?.email)}</p>
        <p>Cidade: {city}</p>
        <p>Endereço: {addressLine(order.address || {})}</p>

        <h2>Dados dos produtos</h2>
        <table>
          <thead>
            <tr>
              <th>Cód.</th>
              <th>Prod.</th>
              <th>V. unit.</th>
              <th>Qtd</th>
              <th>Valor</th>
              <th>Desc.</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => (
              <tr key={line.id}>
                <td>{shown(line.code)}</td>
                <td>{line.name}</td>
                <td>{money(line.price)}</td>
                <td>{line.qty}</td>
                <td>{money(line.price * line.qty)}</td>
                <td>{money(0)}</td>
                <td>{money(line.price * line.qty)}</td>
              </tr>
            ))}
            <tr className="loja-slip-sum">
              <td colSpan={3}>Totais:</td>
              <td>{qty}</td>
              <td>{money(gross)}</td>
              <td>{money(0)}</td>
              <td>{money(total)}</td>
            </tr>
          </tbody>
        </table>

        <h2>Totais do pedido</h2>
        <div className="loja-slip-totals">
          <p><span>Total sem desconto</span><strong>{money(gross)}</strong></p>
          <p><span>Total descontos</span><strong>{money(0)}</strong></p>
          <p><span>Total outras despesas</span><strong>{money(0)}</strong></p>
          <p><span>Total frete</span><strong>{money(0)}</strong></p>
          <p><span>Total seguro</span><strong>{money(0)}</strong></p>
          <p><span>Total itens</span><strong>{qty}</strong></p>
          <p><span>Total geral</span><strong>{money(total)}</strong></p>
        </div>
        <p className="loja-slip-obs">Obs: {shown(order.observacao || order.address?.obs)}</p>
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
    <PdvShell className="loja-vitrine" showStrip={false}>
      <LojaFrame>{view}</LojaFrame>
    </PdvShell>
  );
}

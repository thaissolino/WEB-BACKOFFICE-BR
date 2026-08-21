import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { BrToast, PremiumStage } from "../../components/premium/PremiumStage";
import { api, parseError } from "../../services/api";
import {
  formatDateTime,
  formatMoney,
  movementLabel,
  type MovementType,
  type StockMovement,
  type Store,
  type StoreMetrics,
  type StoreProduct,
} from "./types";

const emptyProduct = { name: "", sku: "", quantity: "0", price: "" };

export default function PremiumStoreDetail({ storeId: storeIdProp }: { storeId?: string } = {}) {
  const { id: idParam } = useParams();
  const id = storeIdProp || idParam;
  const navigate = useNavigate();
  const [store, setStore] = useState<Store | null>(null);
  const [metrics, setMetrics] = useState<StoreMetrics | null>(null);
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [productForm, setProductForm] = useState(emptyProduct);
  const [stockDialog, setStockDialog] = useState<{
    product: StoreProduct;
    type: MovementType;
    quantity: string;
    note: string;
  } | null>(null);
  const [toast, setToast] = useState({ open: false, message: "" });

  function fail(err: unknown, fallback: string) {
    const parsed = parseError(err);
    setToast({ open: true, message: parsed.friend || parsed.message || fallback });
  }

  async function loadStore() {
    if (!id) return;
    try {
      const { data } = await api.get(`/backoffice/stores/${id}`);
      setStore(data.store);
      setMetrics(data.metrics);
      setProducts(data.products || []);
    } catch (err) {
      fail(err, "Não foi possível carregar a loja.");
    }
  }

  async function loadMovements() {
    if (!id) return;
    try {
      const { data } = await api.get("/backoffice/stock/movements", {
        params: { storeId: id, from: from || undefined, to: to || undefined },
      });
      setMovements(data.movements || []);
    } catch (err) {
      fail(err, "Não foi possível carregar o histórico.");
    }
  }

  useEffect(() => {
    loadStore();
    loadMovements();
  }, [id]);

  async function createProduct(event: FormEvent) {
    event.preventDefault();
    if (!id) return;
    try {
      await api.post(`/backoffice/stores/${id}/products`, {
        name: productForm.name.trim(),
        sku: productForm.sku.trim(),
        quantity: Number(productForm.quantity || 0),
        price: productForm.price === "" ? null : Number(productForm.price),
      });
      setProductForm(emptyProduct);
      await loadStore();
      await loadMovements();
    } catch (err) {
      fail(err, "Não foi possível cadastrar o produto.");
    }
  }

  async function removeProduct(productId: string) {
    if (!id) return;
    try {
      await api.delete(`/backoffice/stores/${id}/products/${productId}`);
      await loadStore();
      await loadMovements();
    } catch (err) {
      fail(err, "Não foi possível remover o produto.");
    }
  }

  async function applyStock() {
    if (!id || !stockDialog) return;
    try {
      await api.post(`/backoffice/stores/${id}/products/${stockDialog.product.id}/stock`, {
        type: stockDialog.type,
        quantity: Number(stockDialog.quantity),
        note: stockDialog.note || undefined,
      });
      setStockDialog(null);
      await loadStore();
      await loadMovements();
    } catch (err) {
      fail(err, "Não foi possível ajustar o estoque.");
    }
  }

  return (
    <PremiumStage
      title={store?.name || "Loja"}
      hint={store ? `${store.slug} · ${store.city || "sem cidade"} · ${store.commercialClientName || "sem cliente comercial"}` : "Detalhe da vitrine"}
      actions={
        <>
          <button className="br-btn br-btn-ghost" type="button" onClick={() => navigate("/lojas")}>
            Lojas
          </button>
          <button className="br-btn br-btn-ghost" type="button" onClick={() => navigate(`/lojas/${id}`)}>
            Configurações da Loja
          </button>
          <button className="br-btn br-btn-ghost" type="button" onClick={() => navigate("/estoque")}>
            Estoque
          </button>
        </>
      }
    >
      <div className="br-metrics">
        <div className="br-metric">
          <span>Produtos</span>
          <b>{metrics?.products ?? 0}</b>
        </div>
        <div className="br-metric">
          <span>Unidades</span>
          <b>{metrics?.units ?? 0}</b>
        </div>
        <div className="br-metric">
          <span>SKUs</span>
          <b>{metrics?.skus ?? 0}</b>
        </div>
        <div className="br-metric">
          <span>Último movimento</span>
          <b style={{ fontSize: "0.875rem" }}>{formatDateTime(metrics?.lastMovementAt)}</b>
        </div>
      </div>

      <form className="br-panel" onSubmit={createProduct}>
        <h2>Novo produto</h2>
        <div className="br-grid two">
          <label className="br-field">
            <span>Nome</span>
            <input required value={productForm.name} onChange={(e) => setProductForm((c) => ({ ...c, name: e.target.value }))} />
          </label>
          <label className="br-field">
            <span>SKU</span>
            <input required value={productForm.sku} onChange={(e) => setProductForm((c) => ({ ...c, sku: e.target.value }))} />
          </label>
          <label className="br-field">
            <span>Quantidade</span>
            <input type="number" value={productForm.quantity} onChange={(e) => setProductForm((c) => ({ ...c, quantity: e.target.value }))} />
          </label>
          <label className="br-field">
            <span>Preço</span>
            <input type="number" value={productForm.price} onChange={(e) => setProductForm((c) => ({ ...c, price: e.target.value }))} />
          </label>
        </div>
        <div className="br-actions" style={{ marginTop: 12 }}>
          <button className="br-btn br-btn-brass" type="submit">
            Adicionar
          </button>
        </div>
      </form>

      <section className="br-panel">
        <h2>Produtos</h2>
        {products.length === 0 ? <p className="br-empty">Nenhum produto. Adicione o primeiro SKU.</p> : null}
        {products.length > 0 ? (
          <div className="br-list">
            {products.map((product) => (
              <div className="br-row" key={product.id}>
                <div className="br-row-main">
                  <strong>{product.name}</strong>
                  <small>
                    {product.sku} · {product.quantity} un · {formatMoney(product.price)}
                  </small>
                </div>
                <div className="br-row-actions">
                  <button className="br-btn" type="button" onClick={() => setStockDialog({ product, type: "IN", quantity: "1", note: "" })}>
                    Movimentar
                  </button>
                  <button className="br-btn br-btn-danger" type="button" onClick={() => removeProduct(product.id)}>
                    Excluir
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      <section className="br-panel">
        <div className="br-panel-head">
          <h2>Histórico</h2>
        </div>
        <div className="br-toolbar" style={{ marginBottom: 8 }}>
          <label className="br-field">
            <span>De</span>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label className="br-field">
            <span>Até</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
          <button className="br-btn" type="button" onClick={loadMovements}>
            Filtrar
          </button>
        </div>
        {movements.length === 0 ? <p className="br-empty">Nenhum movimento neste recorte.</p> : null}
        {movements.length > 0 ? (
          <div className="br-list">
            {movements.map((item) => (
              <div className="br-row" key={item.id}>
                <div className="br-row-main">
                  <strong>{item.productName}</strong>
                  <small>
                    {formatDateTime(item.createdAt)} · {movementLabel(item.type)} · {item.quantity} → {item.balanceAfter}
                  </small>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      {stockDialog ? (
        <div className="br-dialog" role="dialog" aria-modal="true" aria-labelledby="movimentar-titulo">
          <div className="br-dialog-card">
            <h2 id="movimentar-titulo">Movimentar</h2>
            <p className="br-seg-hint">
              {stockDialog.product.name} · atual {stockDialog.product.quantity}
            </p>
            <label className="br-field">
              <span>Tipo</span>
              <select value={stockDialog.type} onChange={(e) => setStockDialog({ ...stockDialog, type: e.target.value as MovementType })}>
                <option value="IN">Entrada</option>
                <option value="OUT">Saída</option>
                <option value="ADJUST">Ajuste (define o saldo)</option>
              </select>
            </label>
            <label className="br-field" style={{ marginTop: 12 }}>
              <span>Quantidade</span>
              <input type="number" value={stockDialog.quantity} onChange={(e) => setStockDialog({ ...stockDialog, quantity: e.target.value })} />
            </label>
            <label className="br-field" style={{ marginTop: 12 }}>
              <span>Observação</span>
              <input value={stockDialog.note} onChange={(e) => setStockDialog({ ...stockDialog, note: e.target.value })} />
            </label>
            <div className="br-actions" style={{ marginTop: 14 }}>
              <button className="br-btn" type="button" onClick={() => setStockDialog(null)}>
                Cancelar
              </button>
              <button className="br-btn br-btn-brass" type="button" onClick={applyStock}>
                Aplicar
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <BrToast open={toast.open} message={toast.message} onClose={() => setToast({ open: false, message: "" })} />
    </PremiumStage>
  );
}

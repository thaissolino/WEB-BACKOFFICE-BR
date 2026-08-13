import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BrToast, PremiumStage } from "../../components/premium/PremiumStage";
import { api, parseError } from "../../services/api";
import { formatDateTime, movementLabel, type StockMovement, type StockRankItem, type Store } from "./types";

export default function PremiumStockOverview() {
  const navigate = useNavigate();
  const [ranking, setRanking] = useState<StockRankItem[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [storeId, setStoreId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [toast, setToast] = useState({ open: false, message: "" });

  function fail(err: unknown, fallback: string) {
    const parsed = parseError(err);
    setToast({ open: true, message: parsed.friend || parsed.message || fallback });
  }

  async function loadRanking() {
    try {
      const { data } = await api.get("/backoffice/stock/top", { params: { limit: 30 } });
      setRanking(data.items || []);
    } catch (err) {
      fail(err, "Não foi possível carregar o ranking.");
    }
  }

  async function loadMovements() {
    try {
      const { data } = await api.get("/backoffice/stock/movements", {
        params: { storeId: storeId || undefined, from: from || undefined, to: to || undefined },
      });
      setMovements(data.movements || []);
    } catch (err) {
      fail(err, "Não foi possível carregar o histórico.");
    }
  }

  useEffect(() => {
    api
      .get("/backoffice/stores")
      .then(({ data }) => setStores(data.stores || []))
      .catch(() => undefined);
    loadRanking();
    loadMovements();
  }, []);

  return (
    <PremiumStage
      title="Estoque"
      hint="Ranking da rede e movimentações."
      actions={
        <button className="br-btn br-btn-ghost" type="button" onClick={() => navigate("/lojas")}>
          Lojas
        </button>
      }
    >
      <section className="br-panel">
        <h2>Mais estocados</h2>
        {ranking.length === 0 ? <p className="br-empty">Ainda não há volume na rede.</p> : null}
        {ranking.length > 0 ? (
          <div className="br-list">
            {ranking.map((item, index) => (
              <div className="br-row" key={`${item.sku}-${item.name}`}>
                <div className="br-row-main">
                  <strong>
                    #{index + 1} {item.name}
                  </strong>
                  <small>
                    {item.sku} · {item.quantity} un · {item.stores} loja(s)
                  </small>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      <section className="br-panel">
        <div className="br-panel-head">
          <h2>Movimentos</h2>
        </div>
        <div className="br-toolbar" style={{ marginBottom: 8 }}>
          <label className="br-field">
            <span>Loja</span>
            <select value={storeId} onChange={(e) => setStoreId(e.target.value)}>
              <option value="">Todas</option>
              {stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
          </label>
          <label className="br-field">
            <span>De</span>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label className="br-field">
            <span>Até</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
          <button className="br-btn br-btn-brass" type="button" onClick={loadMovements}>
            Aplicar
          </button>
        </div>
        {movements.length === 0 ? <p className="br-empty">Nada neste período.</p> : null}
        {movements.length > 0 ? (
          <div className="br-list">
            {movements.map((item) => (
              <button className="br-row" type="button" key={item.id} onClick={() => navigate(`/lojas/${item.storeId}`)}>
                <div className="br-row-main">
                  <strong>{item.productName}</strong>
                  <small>
                    {item.storeName} · {formatDateTime(item.createdAt)} · {movementLabel(item.type)} {item.quantity}
                  </small>
                </div>
              </button>
            ))}
          </div>
        ) : null}
      </section>
      <BrToast open={toast.open} message={toast.message} onClose={() => setToast({ open: false, message: "" })} />
    </PremiumStage>
  );
}

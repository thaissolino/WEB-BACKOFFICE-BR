import { Navigate, useNavigate } from "react-router-dom";
import { useClientAuth } from "../../hooks/clientAuth";
import PdvShell, { PdvLoading, usePdvSession } from "./dashboard/PdvShell";
import { STORES } from "./dashboard/mockData";

function StubBoard({ title }: { title: string }) {
  const navigate = useNavigate();
  const { storeId, storeName } = usePdvSession();
  const store = STORES.find((item) => item.id === storeId);
  const storeLabel = store?.label ?? storeName;

  return (
    <section className="pdv-caixa-page" aria-labelledby="pdv-store-param-title">
      <div className="pdv-caixa-sheet">
        <div className="pdv-caixa-head">
          <h1 id="pdv-store-param-title">{title}</h1>
          <button className="pdv-wm-btn" type="button" onClick={() => navigate("/client/dashboard")}>
            Voltar
          </button>
        </div>
        <p className="pdv-caixa-kicker">Loja atual: {storeLabel}</p>
        <p>em breve</p>
      </div>
    </section>
  );
}

export default function StoreParamStub({ title }: { title: string }) {
  const { client, loadingClient } = useClientAuth();

  if (loadingClient) return <PdvLoading />;
  if (!client) return <Navigate to="/signin/client" replace />;

  return (
    <PdvShell variant="form">
      <StubBoard title={title} />
    </PdvShell>
  );
}

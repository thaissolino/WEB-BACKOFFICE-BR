import { Navigate, useNavigate } from "react-router-dom";
import { useClientAuth } from "../../hooks/clientAuth";
import PdvShell, { PdvLoading, usePdvSession } from "./dashboard/PdvShell";
import { CAIXA_STORAGE_KEY, NENHUM_CAIXA } from "./dashboard/mockData";

function readStoredCaixa() {
  if (typeof sessionStorage === "undefined") return NENHUM_CAIXA;
  return sessionStorage.getItem(CAIXA_STORAGE_KEY) || NENHUM_CAIXA;
}

function PdvBoard() {
  const navigate = useNavigate();
  const { storeName } = usePdvSession();
  const caixa = readStoredCaixa();

  return (
    <section className="pdv-caixa-page" aria-labelledby="pdv-sale-title">
      <div className="pdv-caixa-sheet">
        <div className="pdv-caixa-head">
          <h1 id="pdv-sale-title">PDV</h1>
          <button className="pdv-wm-btn" type="button" onClick={() => navigate("/client/caixa")}>
            Voltar
          </button>
        </div>
        <p className="pdv-caixa-kicker">Tela de venda</p>
        <ul className="pdv-facts">
          <li>
            <span>Loja</span>
            <strong>{storeName}</strong>
          </li>
          <li>
            <span>Caixa</span>
            <strong>{caixa}</strong>
          </li>
        </ul>
      </div>
      <p className="pdv-caixa-foot">
        Caixa: <strong>{caixa}</strong>
      </p>
    </section>
  );
}

export default function ClientPdv() {
  const { client, loadingClient } = useClientAuth();

  if (loadingClient) return <PdvLoading />;
  if (!client) return <Navigate to="/signin/client" replace />;

  return (
    <PdvShell variant="form">
      <PdvBoard />
    </PdvShell>
  );
}

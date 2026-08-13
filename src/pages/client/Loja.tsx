import { Navigate, useNavigate } from "react-router-dom";
import { useClientAuth } from "../../hooks/clientAuth";
import PdvShell, { PdvLoading, usePdvSession } from "./dashboard/PdvShell";
import { STORES } from "./dashboard/mockData";
import { useEffect, useState } from "react";
import { api, parseError } from "../../services/api";
import StoreLojaForm from "../stores/loja/StoreLojaForm";

function LojaBoard() {
  const navigate = useNavigate();
  const { storeId, storeName } = usePdvSession();
  const mock = STORES.find((item) => item.id === storeId);
  const [resolvedId, setResolvedId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const name = mock?.name || storeName;
    api
      .get("/clients/stores/resolve", { params: { name } })
      .then(({ data }) => {
        if (!active) return;
        setResolvedId(data.store.id);
        setError("");
      })
      .catch((err) => {
        if (!active) return;
        const parsed = parseError(err);
        setError(parsed.friend || parsed.message || "Não foi possível localizar a loja.");
        setResolvedId(null);
      });
    return () => {
      active = false;
    };
  }, [mock?.name, storeName]);

  if (error) {
    return (
      <section className="pdv-caixa-page">
        <div className="pdv-caixa-sheet">
          <h1>LOJA</h1>
          <p role="alert">{error}</p>
          <button className="pdv-wm-btn" type="button" onClick={() => navigate("/client/dashboard")}>
            Voltar
          </button>
        </div>
      </section>
    );
  }

  if (!resolvedId) {
    return (
      <section className="pdv-caixa-page">
        <p>Carregando loja…</p>
      </section>
    );
  }

  return (
    <StoreLojaForm
      storeId={resolvedId}
      apiBase="/clients/stores"
      extraActions={
        <button className="loja-btn" type="button" onClick={() => navigate("/client/dashboard")}>
          Dashboard
        </button>
      }
      backTo="/client/dashboard"
    />
  );
}

export default function ClientLoja() {
  const { client, loadingClient } = useClientAuth();

  if (loadingClient) return <PdvLoading />;
  if (!client) return <Navigate to="/signin/client" replace />;

  return (
    <PdvShell variant="form">
      <LojaBoard />
    </PdvShell>
  );
}

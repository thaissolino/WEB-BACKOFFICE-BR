import { Navigate, useNavigate } from "react-router-dom";
import { useClientAuth } from "../../hooks/clientAuth";
import PdvShell, { PdvLoading, usePdvSession } from "./dashboard/PdvShell";
import { useEffect, useState } from "react";
import { api, parseError } from "../../services/api";
import StoreLojaForm from "../stores/loja/StoreLojaForm";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function LojaBoard() {
  const navigate = useNavigate();
  const { storeId, storeName } = usePdvSession();
  const [resolvedId, setResolvedId] = useState<string | null>(UUID.test(storeId) ? storeId : null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    if (UUID.test(storeId)) {
      setResolvedId(storeId);
      setError("");
      return;
    }
    if (!storeName) return undefined;
    api
      .get("/clients/stores/resolve", { params: { name: storeName } })
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
  }, [storeId, storeName]);

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

import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api, parseError } from "../../services/api";
import "./dashboard/dashboard.css";

const CLIENT_TOKEN_KEY = "@client:token";
const CLIENT_USER_KEY = "@client:user";

export default function ClientSso() {
  const [params] = useSearchParams();
  const [message, setMessage] = useState("Abrindo o PDV da loja.");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const code = params.get("code") || "";
    if (code.length < 16) {
      setFailed(true);
      setMessage("O banco não enviou um código de troca válido.");
      return;
    }
    let cancelled = false;
    api
      .post("/clients/vila-vault/handoff/redeem", { code })
      .then(({ data }) => {
        if (cancelled) return;
        localStorage.setItem(CLIENT_TOKEN_KEY, data.token);
        localStorage.setItem(CLIENT_USER_KEY, JSON.stringify(data.client));
        window.location.replace("/client/dashboard");
      })
      .catch((error) => {
        if (cancelled) return;
        const parsed = parseError(error);
        setFailed(true);
        setMessage(parsed.friend || parsed.message || "Não foi possível entrar no PDV.");
      });
    return () => {
      cancelled = true;
    };
  }, [params]);

  return (
    <div className="pdv-root" data-surface="cream" lang="pt-BR">
      <div className="pdv-bank-scrim" role="alertdialog" aria-modal="true" aria-labelledby="pdv-sso-title">
        <div className="pdv-bank-card">
          <p className="pdv-bank-kicker">Troca de conta</p>
          <h2 id="pdv-sso-title">Banco e GestorVix</h2>
          <div className="pdv-bank-marks" data-phase={failed ? "error" : "run"}>
            <span>Banco</span>
            <span className="pdv-bank-rail" aria-hidden="true" />
            <span>GestorVix</span>
          </div>
          <p className="pdv-bank-msg">{message}</p>
          {failed ? (
            <button type="button" onClick={() => window.location.assign("/signin/lojista")}>
              Ir para o login
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

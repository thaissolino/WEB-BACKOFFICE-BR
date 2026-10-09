import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api, parseError } from "../../services/api";
import { BankSwitchOverlay } from "./dashboard/BankSwitch";
import "./dashboard/dashboard.css";

const CLIENT_TOKEN_KEY = "@client:token";
const CLIENT_USER_KEY = "@client:user";

export default function ClientSso() {
  const [params] = useSearchParams();
  const [message, setMessage] = useState("");
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
      <BankSwitchOverlay
        phase={failed ? "error" : "run"}
        message={message}
        onClose={() => window.location.assign("/signin/lojista")}
        from="Banco"
        to="GestorVix"
        pending="Abrindo o GestorVix."
        backLabel="Voltar ao login"
      />
    </div>
  );
}

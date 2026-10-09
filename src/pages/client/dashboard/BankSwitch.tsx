import { useState } from "react";
import { Landmark } from "lucide-react";
import { api, parseError } from "../../../services/api";
import PdvTip from "./PdvTip";

const LIMIT_MS = 2000;

type Phase = "idle" | "run" | "error";

export function BankSwitchOverlay({
  phase,
  message,
  onClose,
}: {
  phase: Exclude<Phase, "idle">;
  message: string;
  onClose: () => void;
}) {
  return (
    <div className="pdv-bank-splash" data-phase={phase} role="alertdialog" aria-modal="true" aria-labelledby="pdv-bank-title">
      <div className="pdv-bank-mark" aria-hidden="true">
        <Landmark size={32} strokeWidth={1.8} />
      </div>
      <p className="pdv-bank-kicker">Troca de conta</p>
      <div className="pdv-bank-route" data-phase={phase}>
        <span>GestorVix</span>
        <span className="pdv-bank-rail" aria-hidden="true" />
        <span>Banco</span>
      </div>
      <p id="pdv-bank-title" className="pdv-bank-msg">
        {phase === "error" ? message : "Abrindo a conta vinculada."}
      </p>
      {phase === "error" ? (
        <button type="button" className="pdv-bank-back" onClick={onClose}>
          Voltar ao PDV
        </button>
      ) : null}
    </div>
  );
}

export function useBankSwitch() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [message, setMessage] = useState("");

  async function goToBank() {
    if (phase === "run") return;
    setMessage("");
    setPhase("run");
    const started = performance.now();
    try {
      const { data } = await api.post("/clients/vila-vault/handoff");
      if (performance.now() - started > LIMIT_MS) {
        setMessage("A troca passou de 2 segundos. Tente de novo.");
        setPhase("error");
        return;
      }
      const redirectUrl = String(data?.redirectUrl || "");
      if (!redirectUrl) {
        setMessage("O banco não devolveu o endereço da troca.");
        setPhase("error");
        return;
      }
      window.location.assign(redirectUrl);
    } catch (error) {
      const parsed = parseError(error);
      setMessage(parsed.friend || parsed.message || "Não foi possível abrir o banco.");
      setPhase("error");
    }
  }

  function close() {
    setPhase("idle");
    setMessage("");
  }

  return { phase, message, goToBank, close };
}

export function BankSwitchButton({ onClick }: { onClick: () => void }) {
  return (
    <PdvTip label="Ir para o banco" title="Conta do banco" text="Abre o dashboard da conta vinculada.">
      <button
        className="pdv-ico pdv-ico-bank"
        type="button"
        aria-label="Ir para o banco"
        onClick={onClick}
      >
        <Landmark size={22} strokeWidth={2.2} aria-hidden="true" />
      </button>
    </PdvTip>
  );
}

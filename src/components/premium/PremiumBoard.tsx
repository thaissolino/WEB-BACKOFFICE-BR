import { ReactNode } from "react";
import "../../pages/dashboard/premium.css";
import "./pdv-kit.css";

type BoardProps = {
  title: string;
  lede?: string;
  actions?: ReactNode;
  children: ReactNode;
};

export function PremiumBoard({ title, lede, actions, children }: BoardProps) {
  return (
    <div className="pdv-board">
      <div className="pdv-board-inner">
        <header className="pdv-board-head">
          <div>
            <h1 className="pdv-board-title">{title}</h1>
            {lede ? <p className="pdv-board-lede">{lede}</p> : null}
          </div>
          {actions ? <div className="pdv-board-actions">{actions}</div> : null}
        </header>
        {children}
      </div>
    </div>
  );
}

type ToastProps = {
  open: boolean;
  type?: "success" | "error" | "info";
  message: string;
  onClose: () => void;
};

export function PdvToast({ open, type = "success", message, onClose }: ToastProps) {
  if (!open || !message) return null;
  return (
    <p className={`pdv-toast ${type === "error" ? "pdv-toast-error" : ""}`} role="status">
      <span>{message}</span>
      <button type="button" onClick={onClose} aria-label="Fechar aviso">
        ×
      </button>
    </p>
  );
}

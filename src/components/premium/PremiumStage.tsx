import { ChangeEvent, ReactNode } from "react";
import "./br-stage.css";

type StageProps = {
  title: string;
  hint?: string;
  actions?: ReactNode;
  children: ReactNode;
  wide?: boolean;
};

export function PremiumStage({ title, hint, actions, children, wide }: StageProps) {
  return (
    <div className={wide ? "br-stage br-stage-wide" : "br-stage"}>
      <header className="br-head">
        <div>
          <h1>{title}</h1>
          {hint ? <p>{hint}</p> : null}
        </div>
        {actions ? <div className="br-head-actions">{actions}</div> : null}
      </header>
      <div className="br-stack">{children}</div>
    </div>
  );
}

export function BrSwitch({
  checked,
  onChange,
  label,
  hint,
  ariaLabel,
}: {
  checked: boolean;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  label: string;
  hint?: string;
  ariaLabel?: string;
}) {
  return (
    <label className="br-switch">
      <div>
        <strong>{label}</strong>
        {hint ? <p>{hint}</p> : null}
      </div>
      <span className="br-toggle">
        <input
          type="checkbox"
          role="switch"
          checked={checked}
          onChange={onChange}
          aria-label={ariaLabel || label}
        />
        <i aria-hidden="true" />
      </span>
    </label>
  );
}

export function BrToast({
  open,
  message,
  onClose,
}: {
  open: boolean;
  message: string;
  onClose: () => void;
}) {
  if (!open || !message) return null;
  return (
    <p className="br-toast" role="status">
      <span>{message}</span>
      <button type="button" onClick={onClose} aria-label="Fechar aviso">
        ×
      </button>
    </p>
  );
}

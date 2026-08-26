import { ReactNode } from "react";
import { useUiModeStore } from "../../store/uiModeStore";
import { ActionLoadingProvider } from "../gestao-invoices/context/ActionLoadingContext";
import { DisableButtonsWrapper } from "../gestao-invoices/components/DisableButtonsWrapper";
import "./gestao-pages.css";

type GestaoShellProps = {
  title: string;
  subtitle?: string;
  badge?: string;
  children: ReactNode;
};

/**
 * Shell das páginas de Gestão (Cadastro produtos/fornecedores/freteiros/lojistas).
 * Visual claro no padrão invoice; no modo global "alternative" aplica a paleta do PDV.
 * Provê ActionLoadingContext para reutilizar as abas do Gerenciar Invoices.
 */
export default function GestaoShell({ title, subtitle, badge, children }: GestaoShellProps) {
  const globalMode = useUiModeStore((state) => state.globalMode);
  const alt = globalMode === "alternative";

  return (
    <ActionLoadingProvider>
      <DisableButtonsWrapper>
        <div className={`gestao-page${alt ? " gestao-page--alt" : ""}`}>
          <div className="gestao-page__inner">
            <header className="gestao-page__header">
              <h1>{title}</h1>
              {subtitle ? <p>{subtitle}</p> : null}
              {badge ? <span className="gestao-page__badge">{badge}</span> : null}
            </header>
            {children}
          </div>
        </div>
      </DisableButtonsWrapper>
    </ActionLoadingProvider>
  );
}

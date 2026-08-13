import { ReactNode } from "react";
import "./auth-split.css";

type AuthSplitLayoutProps = {
  children: ReactNode;
  className?: string;
  skipHref: string;
  skipLabel?: string;
  mainId?: string;
};

export function AuthSplitLayout({
  children,
  className,
  skipHref,
  skipLabel = "Ir para o formulário",
  mainId = "auth-split-main",
}: AuthSplitLayoutProps) {
  return (
    <div className={["auth-split", className].filter(Boolean).join(" ")}>
      <a className="auth-split-skip" href={skipHref}>
        {skipLabel}
      </a>
      <div className="auth-split-showroom" aria-hidden="true">
        <img src="/vitrine-electronics.png" alt="" width={1600} height={1200} />
        <div className="auth-split-veil" />
      </div>
      <aside className="auth-split-copy">
        <p className="auth-split-kicker">ERP OMNICHANNEL • PDV</p>
        <p className="auth-split-hero-brand">GestorVix</p>
        <p className="auth-split-headline">
          <span className="auth-split-accent">para</span> lojas físicas, redes de lojas{" "}
          <span className="auth-split-accent">e</span> e-commerce
        </p>
        <p className="auth-split-support">
          Um sistema para operar o ponto de venda, a rede e o canal digital no mesmo lugar.
        </p>
      </aside>
      <div className="auth-split-stage">
        <main id={mainId} className="auth-split-panel">
          <div className="auth-split-sheet">{children}</div>
        </main>
      </div>
    </div>
  );
}

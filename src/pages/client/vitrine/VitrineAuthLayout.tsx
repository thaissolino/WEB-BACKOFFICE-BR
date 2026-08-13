import { ReactNode } from "react";
import { Link } from "react-router-dom";
import "./vitrine.css";

type VitrineAuthLayoutProps = {
  title: string;
  lede: string;
  children: ReactNode;
}

export function VitrineAuthLayout({ title, lede, children }: VitrineAuthLayoutProps) {
  return (
    <div className="vitrine-root">
      <a className="vitrine-skip" href="#vitrine-main">
        Ir para o conteúdo
      </a>
      <div className="vitrine-stage">
        <aside className="vitrine-showroom" aria-hidden="false">
          <img
            src="/vitrine-electronics.png"
            alt="Vitrine de eletrônicos com fones, smartphone e notebook sob luz âmbar"
            width={1600}
            height={1200}
          />
          <div className="vitrine-showroom-veil" aria-hidden="true" />
          <div className="vitrine-showroom-copy">
            <p className="vitrine-kicker">PDV · GestorVix</p>
            <p className="vitrine-brand">GestorVix</p>
          </div>
        </aside>
        <div className="vitrine-filament" aria-hidden="true" />
        <main id="vitrine-main" className="vitrine-counter">
          <div className="vitrine-sheet">
            <p className="vitrine-kicker" style={{ color: "var(--vitrine-filament-dim)" }}>
              Acesso do lojista
            </p>
            <h1 className="vitrine-title">{title}</h1>
            <p className="vitrine-lede">{lede}</p>
            {children}
            <p className="vitrine-foot">
              <Link className="vitrine-link vitrine-muted-link" to="/home">
                Voltar para a home
              </Link>
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}

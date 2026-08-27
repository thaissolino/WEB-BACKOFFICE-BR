import { useEffect } from "react";
import { Link } from "react-router-dom";
import { AuthSplitLayout } from "../auth-split/AuthSplitLayout";
import "./home-funnel.css";

export function GestorVixHome() {
  useEffect(() => {
    document.title = "GestorVix";
  }, []);

  return (
    <AuthSplitLayout
      className="home-funnel"
      skipHref="#home-funnel-cta"
      skipLabel="Ir para os acessos"
      mainId="home-funnel-cta"
    >
      <p className="home-funnel-kicker">ERP OMNICHANNEL • PDV</p>
      <h1 className="home-funnel-brand">GestorVix</h1>
      <p className="home-funnel-headline">
        <span className="home-funnel-accent">para</span> lojas físicas, redes de lojas{" "}
        <span className="home-funnel-accent">e</span> e-commerce
      </p>
      <p className="home-funnel-support">
        Um sistema para operar o ponto de venda, a rede e o canal digital no mesmo lugar.
      </p>

      <div className="home-funnel-cta">
        <Link className="home-funnel-primary" to="/signin/lojista">
          Portal do lojista
        </Link>
        <Link className="home-funnel-secondary" to="/signin/backoffice">
          Acesso administrativo
        </Link>
      </div>
    </AuthSplitLayout>
  );
}

import { Link } from "react-router-dom";
import "./styles.css";

export default function ClientHome() {
  return (
    <div className="client-shell">
      <div className="client-nav client-container">
        <span className="client-brand">PDV Black Rabbit</span>
        <Link className="client-btn client-btn-secondary" to="/signin/backoffice">
          Acesso Backoffice
        </Link>
      </div>

      <main className="client-container">
        <section className="client-card client-hero">
          <h1 className="client-title">Seu PDV leve, rápido e pronto para escalar</h1>
          <p className="client-subtitle">
            Fluxo mobile-first com alta disponibilidade e operação preparada para Redis +
            RabbitMQ.
          </p>
          <div className="client-cta-row">
            <Link className="client-btn client-btn-primary" to="/signin/client">
              Entrar
            </Link>
            <Link className="client-btn client-btn-secondary" to="/signup/client">
              Criar conta
            </Link>
            <Link className="client-btn client-btn-secondary" to="/forgot-password">
              Esqueci minha senha
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}

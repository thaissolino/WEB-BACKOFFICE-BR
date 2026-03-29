import { Navigate } from "react-router-dom";
import { useClientAuth } from "../../hooks/clientAuth";
import "./styles.css";

export default function ClientDashboard() {
  const { client, clientLogout, loadingClient } = useClientAuth();

  if (loadingClient) {
    return (
      <div className="client-shell">
        <main className="client-container">
          <section className="client-card client-hero">
            <h1 className="client-title">Carregando painel...</h1>
          </section>
        </main>
      </div>
    );
  }

  if (!client) {
    return <Navigate to="/signin/client" replace />;
  }

  return (
    <div className="client-shell">
      <main className="client-container">
        <section className="client-card client-hero">
          <div className="client-top-actions">
            <h1 className="client-title">Dashboard do Cliente</h1>
            <button className="client-btn client-btn-secondary" onClick={clientLogout} type="button">
              Sair
            </button>
          </div>
          <p className="client-subtitle">
            Bem-vindo, <strong>{client.name}</strong>. Este painel é o primeiro bloco do PDV.
          </p>

          <div className="client-grid">
            <article className="client-card kpi-card">
              <p className="kpi-label">Faturamento (hoje)</p>
              <p className="kpi-value">R$ 0,00</p>
            </article>
            <article className="client-card kpi-card">
              <p className="kpi-label">Pedidos (hoje)</p>
              <p className="kpi-value">0</p>
            </article>
            <article className="client-card kpi-card">
              <p className="kpi-label">Produtos vendidos</p>
              <p className="kpi-value">0</p>
            </article>
          </div>

          <div className="client-alert client-alert-success" style={{ marginTop: 16 }}>
            Ambiente pronto para próxima etapa: filas fiscais, emissão assíncrona e monitoramento.
          </div>
        </section>
      </main>
    </div>
  );
}

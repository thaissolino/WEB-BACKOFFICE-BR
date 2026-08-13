import { formatUserName, useDashboardData } from "./useDashboardData";
import "./premium.css";

export default function PremiumDashboard() {
  const {
    user,
    users,
    totalUsuarios,
    totalGrupos,
    totalChamadas,
    totalMensagens,
    loading,
    error,
  } = useDashboardData();

  return (
    <div className="pdv-board">
      <div className="pdv-board-inner">
        <header className="pdv-board-head">
          <div>
            <h1 className="pdv-board-title">{formatUserName(user?.name || "Backoffice")}</h1>
            <p className="pdv-board-lede">
              Números da loja e contas recém-criadas. Mesma operação do modo clássico, leitura de vitrine.
            </p>
          </div>
          <button className="pdv-board-download" type="button">
            Exportar resumo
          </button>
        </header>

        {error ? (
          <p className="pdv-error" role="alert">
            {error}
          </p>
        ) : null}

        <dl className="pdv-ledger" aria-label="Indicadores do backoffice">
          <div>
            <dt>Grupos</dt>
            <dd>{loading ? "—" : totalGrupos}</dd>
          </div>
          <div>
            <dt>Usuários</dt>
            <dd>{loading ? "—" : totalUsuarios}</dd>
          </div>
          <div>
            <dt>Chamadas</dt>
            <dd>{totalChamadas}</dd>
          </div>
          <div>
            <dt>Mensagens</dt>
            <dd>{totalMensagens}</dd>
          </div>
        </dl>

        <section className="pdv-board-section" aria-labelledby="novos-usuarios-title">
          <h2 id="novos-usuarios-title">Novos usuários</h2>
          {loading ? <p className="pdv-empty">Carregando contas...</p> : null}
          {!loading && users.length === 0 ? (
            <p className="pdv-empty">Nenhuma conta nova para listar.</p>
          ) : null}
          <ul className="pdv-board-list">
            {users.map((account) => (
              <li key={account.id} className="pdv-board-row">
                <div>
                  <div className="pdv-board-user">{account.userName}</div>
                  <div className="pdv-board-name">{account.name}</div>
                </div>
                <div className="pdv-board-meta">
                  <time dateTime={account.created_at}>
                    {new Date(account.created_at).toLocaleDateString("pt-BR")}
                  </time>
                  <span
                    className="pdv-status"
                    data-on={account.status === "active" ? "true" : "false"}
                  >
                    {account.status === "active" ? "Ativo" : "Inativo"}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

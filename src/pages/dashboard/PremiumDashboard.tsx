import { useMemo, useState } from "react";
import { MessageCircle, Phone, Search, UserRound, Users } from "lucide-react";
import { useDashboardData } from "./useDashboardData";
import "./premium.css";

export default function PremiumDashboard() {
  const {
    users,
    totalUsuarios,
    totalGrupos,
    totalChamadas,
    totalMensagens,
    loading,
    error,
  } = useDashboardData();
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const visible = useMemo(
    () => users.filter((account) => {
      if (!needle) return true;
      return `${account.userName} ${account.name}`.toLowerCase().includes(needle);
    }),
    [users, needle],
  );
  const cards = [
    { label: "Grupos", value: loading ? "—" : String(totalGrupos), icon: Users },
    { label: "Usuários", value: loading ? "—" : String(totalUsuarios), icon: UserRound },
    { label: "Chamadas", value: totalChamadas, icon: Phone },
    { label: "Mensagens", value: totalMensagens, icon: MessageCircle },
  ];

  return (
    <div className="pdv-board">
      <div className="pdv-board-inner">
        {error ? (
          <p className="pdv-error" role="alert">
            {error}
          </p>
        ) : null}

        <dl className="pdv-ledger" aria-label="Indicadores do backoffice">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label}>
                <span className="pdv-ledger-icon" aria-hidden="true">
                  <Icon size={22} strokeWidth={1.8} />
                </span>
                <div>
                  <dt>{card.label}</dt>
                  <dd>{card.value}</dd>
                </div>
              </div>
            );
          })}
        </dl>

        <section className="pdv-board-section" aria-labelledby="novos-usuarios-title">
          <div className="pdv-board-section-head">
            <h2 id="novos-usuarios-title">Novos usuários</h2>
            <label className="pdv-board-search">
              <Search size={16} aria-hidden="true" />
              <input
                value={query}
                placeholder="Buscar usuário..."
                aria-label="Buscar usuário"
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
          </div>
          {loading ? <p className="pdv-empty">Carregando contas...</p> : null}
          {!loading && users.length === 0 ? (
            <p className="pdv-empty">Nenhuma conta nova para listar.</p>
          ) : null}
          {!loading && users.length > 0 && visible.length === 0 ? (
            <p className="pdv-empty">Nenhum usuário com esse nome.</p>
          ) : null}
          {visible.length ? (
            <table className="pdv-board-table">
              <thead>
                <tr>
                  <th>Usuário</th>
                  <th>Nome completo</th>
                  <th>Data de criação</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((account) => (
                  <tr key={account.id}>
                    <td>
                      <span className="pdv-board-person">
                        <span className="pdv-board-avatar" aria-hidden="true">
                          <UserRound size={14} />
                        </span>
                        {account.userName}
                      </span>
                    </td>
                    <td>{account.name}</td>
                    <td>
                      <time dateTime={account.created_at}>
                        {new Date(account.created_at).toLocaleDateString("pt-BR")}
                      </time>
                    </td>
                    <td>
                      <span
                        className="pdv-status"
                        data-on={account.status === "active" ? "true" : "false"}
                      >
                        {account.status === "active" ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </section>
      </div>
    </div>
  );
}

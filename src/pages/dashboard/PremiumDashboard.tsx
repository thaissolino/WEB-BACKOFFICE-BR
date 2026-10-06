import { useMemo, useState } from "react";
import { MessageCircle, Phone, Search, Trash2, UserRound, Users } from "lucide-react";
import { api } from "../../services/api";
import { useDashboardData } from "./useDashboardData";
import "./premium.css";

export default function PremiumDashboard() {
  const {
    users,
    setUsers,
    setTotalUsuarios,
    totalUsuarios,
    totalGrupos,
    totalChamadas,
    totalMensagens,
    loading,
    error,
    user,
  } = useDashboardData();
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);
  const [note, setNote] = useState("");
  const needle = query.trim().toLowerCase();
  const visible = useMemo(
    () => users.filter((account) => {
      if (!needle) return true;
      return `${account.userName} ${account.name}`.toLowerCase().includes(needle);
    }),
    [users, needle],
  );
  function isSelf(account: { id: string; userName: string }) {
    return account.id === user?.id || account.userName === user?.email;
  }

  async function removeUsers(names: string[]) {
    const targets = names.filter((name) => {
      const account = users.find((item) => item.userName === name);
      return account && !isSelf(account);
    });
    if (!targets.length) {
      setNote("A conta logada não pode ser excluída.");
      return;
    }
    const label = targets.length === 1 ? targets[0] : `${targets.length} usuários`;
    if (!window.confirm(`Excluir ${label}?`)) return;
    const token = localStorage.getItem("@backoffice:token");
    if (!token) return;
    setDeleting(true);
    setNote("");
    const removed: string[] = [];
    for (const userName of targets) {
      try {
        await api.delete("/graphic/delete", { data: { userName }, headers: { Authorization: `Bearer ${token}` } });
        removed.push(userName);
      } catch {
        setNote(`Não foi possível excluir ${userName}.`);
      }
    }
    if (removed.length) {
      const next = users.filter((item) => !removed.includes(item.userName));
      setUsers(next);
      setTotalUsuarios(next.length);
      setPicked((current) => current.filter((name) => !removed.includes(name)));
      setNote(removed.length === 1 ? `${removed[0]} excluído.` : `${removed.length} usuários excluídos.`);
    }
    setDeleting(false);
  }

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
          {note ? <p className="pdv-empty" role="status">{note}</p> : null}
          {visible.length ? (
            <div className="pdv-board-tools">
              <button className="pdv-board-del" type="button" disabled={!picked.length || deleting} onClick={() => void removeUsers(picked)}>
                {deleting ? "Excluindo…" : picked.length ? `Excluir selecionados (${picked.length})` : "Excluir selecionados"}
              </button>
            </div>
          ) : null}
          {visible.length ? (
            <table className="pdv-board-table">
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      aria-label="Selecionar usuários"
                      checked={visible.some((account) => !isSelf(account)) && visible.filter((account) => !isSelf(account)).every((account) => picked.includes(account.userName))}
                      onChange={(event) => setPicked(event.target.checked ? visible.filter((account) => !isSelf(account)).map((account) => account.userName) : [])}
                    />
                  </th>
                  <th>Usuário</th>
                  <th>Nome completo</th>
                  <th>Data de criação</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((account) => (
                  <tr key={account.id}>
                    <td>
                      <input
                        type="checkbox"
                        aria-label={`Selecionar ${account.userName}`}
                        disabled={isSelf(account)}
                        checked={picked.includes(account.userName)}
                        onChange={() => setPicked((current) => current.includes(account.userName) ? current.filter((name) => name !== account.userName) : [...current, account.userName])}
                      />
                    </td>
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
                    <td>
                      <button className="pdv-board-del" type="button" disabled={deleting || isSelf(account)} onClick={() => void removeUsers([account.userName])}>
                        <Trash2 size={14} aria-hidden="true" />
                        Excluir
                      </button>
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

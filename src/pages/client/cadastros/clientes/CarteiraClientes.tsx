import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Settings } from "lucide-react";
import { api, parseError } from "../../../../services/api";
import CadastroShell from "../CadastroShell";
import { PORTFOLIO_USERS, type PortfolioRow } from "./types";

const EMPTY_NEW = {
  name: "",
  userName: "",
  active: true,
};

export default function CarteiraClientes() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<PortfolioRow[]>([]);
  const [drafts, setDrafts] = useState<Record<number, PortfolioRow>>({});
  const [createRow, setCreateRow] = useState(EMPTY_NEW);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  function load() {
    api
      .get("/clients/portfolios")
      .then(({ data }) => {
        const list = (data.portfolios as PortfolioRow[]) ?? [];
        setRows(list);
        setDrafts(Object.fromEntries(list.map((item) => [item.code, item])));
        setError("");
      })
      .catch((err) => {
        const parsed = parseError(err);
        setError(parsed.friend || parsed.message || "Não foi possível carregar as carteiras.");
      });
  }

  useEffect(() => {
    load();
  }, []);

  function patch(code: number, next: Partial<PortfolioRow>) {
    setDrafts((current) => ({ ...current, [code]: { ...current[code], ...next } }));
  }

  async function saveRow(row: PortfolioRow) {
    try {
      const { data } = await api.put(`/clients/portfolios/${row.code}`, {
        name: row.name,
        userName: row.userName,
        active: row.active,
      });
      const saved = data.portfolio as PortfolioRow;
      setRows((current) => current.map((item) => (item.code === saved.code ? saved : item)));
      setDrafts((current) => ({ ...current, [saved.code]: saved }));
      setToast("atualizado");
      setError("");
    } catch (err) {
      const parsed = parseError(err);
      setError(parsed.friend || parsed.message || "Não foi possível atualizar.");
    }
  }

  async function addRow() {
    try {
      await api.post("/clients/portfolios", createRow);
      setCreateRow(EMPTY_NEW);
      setToast("atualizado");
      load();
    } catch (err) {
      const parsed = parseError(err);
      setError(parsed.friend || parsed.message || "Não foi possível cadastrar.");
    }
  }

  return (
    <CadastroShell>
      <section className="pdv-cad-page" aria-labelledby="pdv-cad-cart-title">
        <div className="pdv-cad-sheet">
          <h1 id="pdv-cad-cart-title">CARTEIRA DE CLIENTES</h1>
          {error ? (
            <p className="pdv-cad-error" role="alert">
              {error}
            </p>
          ) : null}

          <div className="pdv-cad-table-wrap">
            <table className="pdv-cad-table pdv-cad-table-edit">
              <thead>
                <tr>
                  <th>Cód.</th>
                  <th>Nome</th>
                  <th>Usuário</th>
                  <th>Ativo</th>
                  <th>Gerenciar</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((item) => {
                  const row = drafts[item.code] ?? item;
                  return (
                    <tr key={row.code}>
                      <td>{row.code}</td>
                      <td>
                        <input
                          value={row.name}
                          onChange={(event) => patch(row.code, { name: event.target.value })}
                          aria-label="Nome"
                        />
                      </td>
                      <td>
                        <select
                          value={row.userName}
                          onChange={(event) => patch(row.code, { userName: event.target.value })}
                          aria-label="Usuário"
                        >
                          <option value="">Selecione...</option>
                          {PORTFOLIO_USERS.map((user) => (
                            <option key={user} value={user}>
                              {user}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <fieldset className="pdv-cad-radios">
                          <legend className="pdv-sr">Ativo</legend>
                          <label>
                            <input
                              type="radio"
                              name={`cart-ativo-${row.code}`}
                              checked={row.active}
                              onChange={() => patch(row.code, { active: true })}
                            />
                            Sim
                          </label>
                          <label>
                            <input
                              type="radio"
                              name={`cart-ativo-${row.code}`}
                              checked={!row.active}
                              onChange={() => patch(row.code, { active: false })}
                            />
                            Não
                          </label>
                        </fieldset>
                      </td>
                      <td>
                        <button
                          className="pdv-cad-icon-btn"
                          type="button"
                          aria-label={`Gerenciar ${row.name}`}
                          onClick={() => {
                            saveRow(row);
                            navigate(`/client/clientes/carteira/${row.code}`, {
                              state: { title: "Gerenciar carteira", name: row.name },
                            });
                          }}
                        >
                          <Settings size={16} aria-hidden="true" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                <tr>
                  <td>0</td>
                  <td>
                    <input
                      value={createRow.name}
                      onChange={(event) => setCreateRow({ ...createRow, name: event.target.value })}
                      aria-label="Nome"
                    />
                  </td>
                  <td>
                    <select
                      value={createRow.userName}
                      onChange={(event) => setCreateRow({ ...createRow, userName: event.target.value })}
                      aria-label="Usuário"
                    >
                      <option value="">Selecione...</option>
                      {PORTFOLIO_USERS.map((user) => (
                        <option key={user} value={user}>
                          {user}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <fieldset className="pdv-cad-radios">
                      <legend className="pdv-sr">Ativo</legend>
                      <label>
                        <input
                          type="radio"
                          name="cart-ativo-new"
                          checked={createRow.active}
                          onChange={() => setCreateRow({ ...createRow, active: true })}
                        />
                        Sim
                      </label>
                      <label>
                        <input
                          type="radio"
                          name="cart-ativo-new"
                          checked={!createRow.active}
                          onChange={() => setCreateRow({ ...createRow, active: false })}
                        />
                        Não
                      </label>
                    </fieldset>
                  </td>
                  <td>
                    <button className="pdv-cad-icon-btn pdv-cad-icon-add" type="button" aria-label="Adicionar" onClick={addRow}>
                      <Plus size={18} strokeWidth={2.6} aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="pdv-sr" aria-live="polite">
            {toast}
          </p>
        </div>
      </section>
    </CadastroShell>
  );
}

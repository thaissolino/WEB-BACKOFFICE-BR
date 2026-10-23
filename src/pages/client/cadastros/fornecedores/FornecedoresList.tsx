import { FormEvent, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Calendar, Plus, RefreshCw, Search, UserRound, X } from "lucide-react";
import { api, parseError } from "../../../../services/api";
import { avisarSalvo } from "../../avisoSalvo";
import { formatCnpj } from "../../../../utils/brMasks";
import CadastroShell from "../CadastroShell";
import type { PdvSupplier } from "./types";

function cityLabel(item: PdvSupplier) {
  if (item.city && item.uf) return `${item.city} - ${item.uf}`;
  return item.city || "";
}

export default function FornecedoresList({ inactive = false }: { inactive?: boolean }) {
  const navigate = useNavigate();
  const location = useLocation();
  const isInactive = inactive || location.pathname.endsWith("/inativos");
  const [rows, setRows] = useState<PdvSupplier[]>([]);
  const [draft, setDraft] = useState({ type: "Todos", name: "", document: "" });
  const [applied, setApplied] = useState(draft);
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [error, setError] = useState("");
  const [acting, setActing] = useState(false);

  function load() {
    api
      .get("/clients/suppliers", { params: { ativo: isInactive ? "0" : "1" } })
      .then(({ data }) => {
        setRows((data.suppliers as PdvSupplier[]) ?? []);
        setError("");
      })
      .catch((err) => {
        const parsed = parseError(err);
        setError(parsed.friend || parsed.message || "Não foi possível carregar os fornecedores.");
      });
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInactive]);

  const visible = useMemo(() => {
    const q = applied.name.trim().toLowerCase();
    const doc = applied.document.replace(/\D/g, "");
    return rows.filter((item) => {
      if (applied.type !== "Todos" && item.type !== applied.type) return false;
      if (q) {
        const blob = `${item.code} ${item.fantasia} ${item.razao}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      if (doc && !item.document.replace(/\D/g, "").includes(doc)) return false;
      return true;
    });
  }, [applied, rows]);

  const allSelected = visible.length > 0 && visible.every((item) => selected[item.code]);
  const picked = rows.filter((item) => selected[item.code]);

  function onFilter(event: FormEvent) {
    event.preventDefault();
    setApplied(draft);
  }

  function toggleAll(checked: boolean) {
    const next: Record<number, boolean> = { ...selected };
    visible.forEach((item) => {
      next[item.code] = checked;
    });
    setSelected(next);
  }

  async function runOnPicked(action: "inativar" | "reativar") {
    if (!picked.length || acting) return;
    const label = action === "reativar" ? "Reativar" : "Inativar";
    if (!window.confirm(`${label} ${picked.length} fornecedor(es)?`)) return;
    setActing(true);
    setError("");
    try {
      await Promise.all(
        picked.map((item) => api.put(`/clients/suppliers/${item.code}`, { active: action === "reativar" })),
      );
      const gone = new Set(picked.map((item) => item.code));
      setRows((atual) => atual.filter((item) => !gone.has(item.code)));
      setSelected({});
      avisarSalvo(action === "reativar" ? "Fornecedor reativado." : "Fornecedor inativado.");
    } catch (err) {
      const parsed = parseError(err);
      setError(parsed.friend || parsed.message || "Não foi possível concluir.");
    } finally {
      setActing(false);
    }
  }

  return (
    <CadastroShell>
      <section className="pdv-cad-page pdv-cli-page pdv-cli-list" aria-labelledby="pdv-cad-forn-title">
        <div className="pdv-cad-sheet">
          <h1 id="pdv-cad-forn-title">{isInactive ? "FORNECEDORES INATIVOS" : "FORNECEDORES"}</h1>
          <div className="pdv-cad-actions">
            <button
              className="pdv-cad-btn pdv-cad-btn-green"
              type="button"
              onClick={() => navigate("/client/fornecedores/cadastrar")}
            >
              <Plus size={16} strokeWidth={2.4} aria-hidden="true" />
              Cadastrar Fornecedor
            </button>
            {isInactive ? (
              <button className="pdv-cad-btn pdv-cad-btn-green" type="button" onClick={() => navigate("/client/fornecedores")}>
                <UserRound size={16} strokeWidth={2.2} aria-hidden="true" />
                Fornecedores Ativos
              </button>
            ) : (
              <button
                className="pdv-cad-btn pdv-cad-btn-red"
                type="button"
                onClick={() => navigate("/client/fornecedores/inativos")}
              >
                <X size={16} strokeWidth={2.4} aria-hidden="true" />
                Fornecedores Inativos
              </button>
            )}
            <button
              className="pdv-cad-btn"
              type="button"
              disabled={!picked.length || acting}
              onClick={() => void runOnPicked(isInactive ? "reativar" : "inativar")}
            >
              {isInactive ? "Reativar" : "Inativar"}
            </button>
          </div>

          <form className="pdv-cad-filters pdv-cad-filters-forn" onSubmit={onFilter}>
            <label>
              Tipo
              <select value={draft.type} onChange={(event) => setDraft({ ...draft, type: event.target.value })}>
                <option>Todos</option>
                <option>Geral</option>
              </select>
            </label>
            <label>
              Fantasia/Razão/Código
              <input
                value={draft.name}
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                autoComplete="off"
              />
            </label>
            <label>
              CNPJ
              <input
                value={draft.document}
                onChange={(event) => setDraft({ ...draft, document: formatCnpj(event.target.value) })}
                inputMode="numeric"
                autoComplete="off"
              />
            </label>
            <div className="pdv-cad-filters-go">
              <button className="pdv-cad-btn pdv-cad-btn-blue" type="submit">
                <Search size={16} strokeWidth={2.2} aria-hidden="true" />
                Filtrar
              </button>
            </div>
          </form>

          {error ? (
            <p className="pdv-cad-error" role="alert">
              {error}
            </p>
          ) : null}

          <div className="pdv-cad-table-wrap pdv-cli-scroll">
            <table className="pdv-cad-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Fantasia</th>
                  <th>Razão</th>
                  <th>CNPJ</th>
                  <th>Telefone</th>
                  <th>Cidade</th>
                  <th>Atividade</th>
                  <th>Atualizar</th>
                  <th>
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={(event) => toggleAll(event.target.checked)}
                      aria-label="Selecionar todos"
                    />
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.map((item) => (
                  <tr key={item.code}>
                    <td>{item.code}</td>
                    <td>{item.fantasia}</td>
                    <td>{item.razao}</td>
                    <td>{item.document}</td>
                    <td>{item.phone}</td>
                    <td>{cityLabel(item)}</td>
                    <td>
                      <button
                        className="pdv-cad-icon-btn"
                        type="button"
                        aria-label={`Atividade ${item.fantasia || item.razao}`}
                        onClick={() => navigate(`/client/atividades?fornecedor=${item.code}`)}
                      >
                        <Calendar size={16} strokeWidth={2.2} aria-hidden="true" />
                      </button>
                    </td>
                    <td>
                      <button
                        className="pdv-cad-icon-btn"
                        type="button"
                        aria-label={`Atualizar ${item.fantasia || item.razao}`}
                        onClick={() => navigate(`/client/fornecedores/${item.code}/atualizar`)}
                      >
                        <RefreshCw size={16} strokeWidth={2.2} aria-hidden="true" />
                      </button>
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        checked={Boolean(selected[item.code])}
                        onChange={(event) => setSelected({ ...selected, [item.code]: event.target.checked })}
                        aria-label={`Selecionar ${item.fantasia || item.razao}`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </CadastroShell>
  );
}

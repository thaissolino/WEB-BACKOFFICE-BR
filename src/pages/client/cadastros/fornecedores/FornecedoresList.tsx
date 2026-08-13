import { FormEvent, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Calendar,
  CreditCard,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Undo2,
  UserRound,
  X,
} from "lucide-react";
import { api, parseError } from "../../../../services/api";
import { formatCnpj } from "../../../../utils/brMasks";
import CadastroShell from "../CadastroShell";
import type { PdvSupplier } from "./types";

function cityLabel(item: PdvSupplier) {
  if (item.city && item.uf) return `${item.city} - ${item.uf}`;
  if (item.city) return item.city;
  return "-";
}

function phoneLabel(value: string) {
  return value.trim() || "()";
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
  const [toast, setToast] = useState("");

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

  function onFilter(event: FormEvent) {
    event.preventDefault();
    setApplied(draft);
  }

  function onClear() {
    const empty = { type: "Todos", name: "", document: "" };
    setDraft(empty);
    setApplied(empty);
  }

  return (
    <CadastroShell>
      <section className="pdv-cad-page" aria-labelledby="pdv-cad-forn-title">
        <div className="pdv-cad-sheet pdv-cad-sheet-wide">
          <h1 id="pdv-cad-forn-title">FORNECEDORES</h1>
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
                <UserRound size={16} aria-hidden="true" />
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
              Fantasia/Razao/Código
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
              <button className="pdv-cad-btn pdv-cad-btn-ghost" type="button" onClick={onClear}>
                <Undo2 size={16} aria-hidden="true" />
                Limpar
              </button>
              <button className="pdv-cad-btn pdv-cad-btn-blue" type="submit">
                <Search size={16} aria-hidden="true" />
                Filtrar
              </button>
            </div>
          </form>

          {error ? (
            <p className="pdv-cad-error" role="alert">
              {error}
            </p>
          ) : null}

          <div className="pdv-cad-table-wrap">
            <table className="pdv-cad-table">
              <thead>
                <tr>
                  <th>Compra</th>
                  <th>Tipo</th>
                  <th>Cód. - Fantasia</th>
                  <th>Telefone</th>
                  <th>Cidade</th>
                  <th>Tipo de Custo</th>
                  <th>Visualizar Compras</th>
                  <th>Caixa</th>
                  <th>Atividade</th>
                  <th>Atualizar</th>
                  <th>
                    Inativar{" "}
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={(event) => {
                        const next: Record<number, boolean> = { ...selected };
                        visible.forEach((item) => {
                          next[item.code] = event.target.checked;
                        });
                        setSelected(next);
                      }}
                      aria-label="Selecionar todos"
                    />
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.map((item) => (
                  <tr key={item.code}>
                    <td>
                      <button
                        className="pdv-cad-icon-btn"
                        type="button"
                        aria-label={`Compra ${item.fantasia}`}
                        onClick={() => navigate(`/client/fornecedores/${item.code}/compra`)}
                      >
                        <Plus size={16} strokeWidth={2.6} aria-hidden="true" />
                      </button>
                    </td>
                    <td>{item.type}</td>
                    <td>
                      {item.code} - {item.fantasia || item.razao}
                    </td>
                    <td>{phoneLabel(item.phone)}</td>
                    <td>{cityLabel(item)}</td>
                    <td>
                      <button
                        className="pdv-cad-icon-btn"
                        type="button"
                        aria-label={`Tipo de Custo ${item.fantasia}`}
                        onClick={() =>
                          navigate(`/client/fornecedores/${item.code}/tipo-custo`, {
                            state: { title: "Tipo de Custo", name: item.fantasia },
                          })
                        }
                      >
                        <Settings size={16} aria-hidden="true" />
                      </button>
                    </td>
                    <td>
                      <button
                        className="pdv-cad-icon-btn"
                        type="button"
                        aria-label={`Visualizar Compras ${item.fantasia}`}
                        onClick={() =>
                          navigate(`/client/fornecedores/${item.code}/compras`, {
                            state: { title: "Visualizar Compras", name: item.fantasia },
                          })
                        }
                      >
                        <Plus size={16} strokeWidth={2.6} aria-hidden="true" />
                      </button>
                    </td>
                    <td>
                      <button
                        className="pdv-cad-icon-btn"
                        type="button"
                        aria-label={`Caixa ${item.fantasia}`}
                        onClick={() =>
                          navigate(`/client/fornecedores/${item.code}/caixa`, {
                            state: { title: "Caixa", name: item.fantasia },
                          })
                        }
                      >
                        <CreditCard size={16} aria-hidden="true" />
                      </button>
                    </td>
                    <td>
                      <button
                        className="pdv-cad-icon-btn"
                        type="button"
                        aria-label={`Atividade ${item.fantasia}`}
                        onClick={() => navigate(`/client/atividades?fornecedor=${item.code}`)}
                      >
                        <Calendar size={16} aria-hidden="true" />
                      </button>
                    </td>
                    <td>
                      <button
                        className="pdv-cad-icon-btn"
                        type="button"
                        aria-label={`Atualizar ${item.fantasia}`}
                        onClick={() => setToast("atualizado")}
                      >
                        <RefreshCw size={16} aria-hidden="true" />
                      </button>
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        checked={Boolean(selected[item.code])}
                        onChange={(event) => setSelected({ ...selected, [item.code]: event.target.checked })}
                        aria-label={`Inativar ${item.fantasia}`}
                      />
                    </td>
                  </tr>
                ))}
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

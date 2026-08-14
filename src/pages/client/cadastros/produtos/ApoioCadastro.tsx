import { FormEvent, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Pencil, Plus } from "lucide-react";
import CadastroShell from "../CadastroShell";
import { AtivoToggle } from "./QuickCadWindows";
import { APOIO_CONFIGS, type ApoioConfig, type ApoioRow } from "./apoioConfigs";

const memory = new Map<string, ApoioRow[]>();

function loadRows(config: ApoioConfig) {
  const cached = memory.get(config.id);
  if (cached) return cached;
  try {
    const raw = sessionStorage.getItem(`pdv-apoio-${config.id}`);
    if (raw) {
      const parsed = JSON.parse(raw) as ApoioRow[];
      memory.set(config.id, parsed);
      return parsed;
    }
  } catch {
    /* demo local */
  }
  memory.set(config.id, config.seed);
  return config.seed;
}

function saveRows(config: ApoioConfig, rows: ApoioRow[]) {
  memory.set(config.id, rows);
  try {
    sessionStorage.setItem(`pdv-apoio-${config.id}`, JSON.stringify(rows));
  } catch {
    /* demo local */
  }
}

function cellOf(row: ApoioRow, key: string) {
  if (key === "code") return row.code;
  if (key === "ativo") return row.active ? "Sim" : "Não";
  return row.values[key] ?? "";
}

export function ApoioList({ kind, inactive = false }: { kind: string; inactive?: boolean }) {
  const config = APOIO_CONFIGS[kind]!;
  const navigate = useNavigate();
  const location = useLocation();
  const isInactive = inactive || location.pathname === config.inativosPath;
  const [rows, setRows] = useState(() => loadRows(config));
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [applied, setApplied] = useState<Record<string, string>>({});
  const [toast, setToast] = useState("");

  const visible = useMemo(() => {
    return rows.filter((item) => {
      if (item.active === isInactive) return false;
      if (applied.code && !item.code.includes(applied.code.replace(/\D/g, ""))) return false;
      const name = (applied[config.nameKey] || applied.nome || "").trim().toLowerCase();
      if (name && !(item.values[config.nameKey] || "").toLowerCase().includes(name)) return false;
      return true;
    });
  }, [applied, config.nameKey, isInactive, rows]);

  function onFilter(event: FormEvent) {
    event.preventDefault();
    setApplied(draft);
  }

  function toggleActive(id: string, next: boolean) {
    const updated = rows.map((item) => (item.id === id ? { ...item, active: next } : item));
    setRows(updated);
    saveRows(config, updated);
  }

  return (
    <CadastroShell>
      <section className="pdv-cad-page" aria-labelledby={`pdv-apoio-${config.id}`}>
        <div className="pdv-cad-sheet">
          <h1 id={`pdv-apoio-${config.id}`}>{config.title}</h1>
          <div className="pdv-cad-actions">
            {config.cadastrarLabel && config.id !== "unidade" ? (
              <button
                className="pdv-cad-btn pdv-cad-btn-green"
                type="button"
                onClick={() => navigate(config.formPath)}
              >
                <Plus size={16} strokeWidth={2.4} aria-hidden="true" />
                {config.cadastrarLabel}
              </button>
            ) : null}
            {config.inativosLabel ? (
              isInactive ? (
                <button
                  className="pdv-cad-btn pdv-cad-btn-green"
                  type="button"
                  onClick={() => navigate(config.listPath)}
                >
                  {config.ativosLabel}
                </button>
              ) : (
                <button
                  className="pdv-cad-btn pdv-cad-btn-red"
                  type="button"
                  onClick={() => navigate(config.inativosPath)}
                >
                  {config.inativosLabel}
                </button>
              )
            ) : null}
          </div>

          {config.filters?.length ? (
            <form className="pdv-cad-filters pdv-cad-filters-cat" onSubmit={onFilter}>
              {config.filters.map((filter) => (
                <label key={filter.key}>
                  {filter.label}
                  <input
                    value={draft[filter.key] ?? ""}
                    onChange={(event) => setDraft({ ...draft, [filter.key]: event.target.value })}
                    autoComplete="off"
                  />
                </label>
              ))}
              <div className="pdv-cad-filters-go">
                <button className="pdv-cad-btn" type="button" onClick={() => { setDraft({}); setApplied({}); }}>
                  Limpar
                </button>
                <button className="pdv-cad-btn pdv-cad-btn-blue" type="submit">
                  Filtrar
                </button>
              </div>
            </form>
          ) : null}

          <div className="pdv-cad-table-wrap">
            <table className="pdv-cad-table">
              <thead>
                <tr>
                  {config.columns.map((column) => (
                    <th key={column.key}>{column.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((item) => (
                  <tr key={item.id}>
                    {config.columns.map((column) => {
                      if (column.key === "atualizar") {
                        return (
                          <td key={column.key}>
                            <button
                              className="pdv-cad-icon-btn"
                              type="button"
                              aria-label={`${column.label} ${item.values[config.nameKey] || item.code}`}
                              title={column.label}
                              onClick={() => navigate(`${config.formPath}?id=${item.id}`)}
                            >
                              <Pencil size={16} aria-hidden="true" />
                            </button>
                          </td>
                        );
                      }
                      if (column.key === "ativo") {
                        return (
                          <td key={column.key}>
                            <AtivoToggle
                              value={item.active}
                              onChange={(next) => toggleActive(item.id, next)}
                            />
                          </td>
                        );
                      }
                      if (column.key === "hex") {
                        const hex = item.values.hex;
                        return (
                          <td key={column.key}>
                            {hex ? (
                              <span className="pdv-apoio-swatch" style={{ background: hex }} title={hex} />
                            ) : (
                              "—"
                            )}
                          </td>
                        );
                      }
                      return <td key={column.key}>{cellOf(item, column.key)}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {config.alterarLabel ? (
            <div className="pdv-cad-toolbar">
              <button
                className="pdv-cad-btn pdv-cad-btn-blue"
                type="button"
                onClick={() => setToast("Ordem atualizada (demo).")}
              >
                {config.alterarLabel}
              </button>
            </div>
          ) : null}
          <p className="pdv-sr" aria-live="polite">
            {toast}
          </p>
        </div>
      </section>
    </CadastroShell>
  );
}

export function ApoioForm({ kind }: { kind: string }) {
  const config = APOIO_CONFIGS[kind]!;
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const editId = params.get("id") || "";
  const rows = loadRows(config);
  const editing = rows.find((item) => item.id === editId);
  const [values, setValues] = useState<Record<string, string>>(() => {
    const next: Record<string, string> = {};
    config.fields.forEach((field) => {
      if (field.kind === "toggle") return;
      next[field.key] = editing?.values[field.key] ?? (field.kind === "color" ? "#000000" : "");
    });
    return next;
  });
  const [ativo, setAtivo] = useState(editing?.active ?? true);
  const [status, setStatus] = useState("");

  const title = editing ? config.formTitle.replace("CADASTRAR", "ATUALIZAR") : config.formTitle;

  function patch(key: string, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const required = config.fields.find((field) => field.required);
    if (required && !values[required.key]?.trim()) {
      setStatus(`Informe ${required.label.toLowerCase()}.`);
      return;
    }
    const current = loadRows(config);
    if (editing) {
      saveRows(
        config,
        current.map((item) =>
          item.id === editing.id
            ? { ...item, active: ativo, values: { ...item.values, ...values } }
            : item,
        ),
      );
      setStatus("Registro atualizado (demo).");
    } else {
      const nextCode = String(current.length);
      saveRows(config, [
        ...current,
        {
          id: `${config.id}-${Date.now()}`,
          code: nextCode.padStart(config.seed[0]?.code.length || 1, "0"),
          active: ativo,
          values,
        },
      ]);
      setStatus("Registro cadastrado (demo).");
    }
  }

  return (
    <CadastroShell>
      <section className="pdv-cad-page" aria-labelledby={`pdv-apoio-form-${config.id}`}>
        <div className="pdv-cad-sheet">
          <h1 id={`pdv-apoio-form-${config.id}`}>{title}</h1>
          <button
            className="pdv-cad-btn pdv-cad-btn-back pdv-voltar"
            type="button"
            onClick={() => navigate(config.listPath)}
          >
            Voltar
          </button>
          <form className="pdv-cad-form" onSubmit={onSubmit}>
            <div className="pdv-cad-form-bar">{editing ? title.replace("ATUALIZAR ", "") : config.cadastrarLabel}</div>
            {config.fields.map((field) => {
              if (field.kind === "toggle") {
                return (
                  <div className="pdv-cad-form-row" key={field.key}>
                    <span className="pdv-cad-form-label">{field.label}</span>
                    <AtivoToggle value={ativo} onChange={setAtivo} />
                  </div>
                );
              }
              if (field.kind === "textarea") {
                return (
                  <div className="pdv-cad-form-row pdv-cad-form-row-top" key={field.key}>
                    <span className="pdv-cad-form-label">{field.label}</span>
                    <textarea
                      rows={4}
                      value={values[field.key] ?? ""}
                      onChange={(event) => patch(field.key, event.target.value)}
                    />
                  </div>
                );
              }
              if (field.kind === "color") {
                return (
                  <div className="pdv-cad-form-row" key={field.key}>
                    <span className="pdv-cad-form-label">{field.label}</span>
                    <input
                      type="color"
                      value={values[field.key] || "#000000"}
                      onChange={(event) => patch(field.key, event.target.value)}
                      aria-label={field.label}
                    />
                  </div>
                );
              }
              return (
                <div className="pdv-cad-form-row" key={field.key}>
                  <span className="pdv-cad-form-label">{field.label}</span>
                  <input
                    value={values[field.key] ?? ""}
                    onChange={(event) => patch(field.key, event.target.value)}
                    autoComplete="off"
                    required={field.required}
                  />
                </div>
              );
            })}
            {status ? (
              <p className="pdv-prod-status" role="status">
                {status}
              </p>
            ) : null}
            <div className="pdv-cad-form-go">
              <button className="pdv-cad-btn pdv-cad-btn-green" type="submit">
                <Plus size={16} strokeWidth={2.6} aria-hidden="true" />
                {editing ? "Atualizar" : "Cadastrar"}
              </button>
            </div>
          </form>
        </div>
      </section>
    </CadastroShell>
  );
}

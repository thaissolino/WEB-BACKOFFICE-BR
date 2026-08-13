import { FormEvent, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import CadastroShell from "../CadastroShell";
import { DEMO_CATEGORY_ROWS, ICMS_OPTIONS } from "./demoData";

export default function ReajusteCategoria() {
  const navigate = useNavigate();
  const rows = useMemo(
    () => DEMO_CATEGORY_ROWS.filter((item) => item.active).sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    [],
  );
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [percent, setPercent] = useState("");
  const [icms, setIcms] = useState(ICMS_OPTIONS[0]);
  const [valor, setValor] = useState("");
  const [ncm, setNcm] = useState("");
  const [ncmx, setNcmx] = useState("");
  const [toast, setToast] = useState("");

  const allSelected = rows.length > 0 && rows.every((item) => selected[item.id]);

  function toggleAll(checked: boolean) {
    const next: Record<string, boolean> = {};
    rows.forEach((item) => {
      next[item.id] = checked;
    });
    setSelected(next);
  }

  function onApply(event: FormEvent) {
    event.preventDefault();
    const count = Object.values(selected).filter(Boolean).length;
    if (!count) {
      setToast("Selecione ao menos uma categoria.");
      return;
    }
    setToast(`Reajuste aplicado em ${count} categoria(s) (demo).`);
  }

  return (
    <CadastroShell>
      <section className="pdv-cad-page" aria-labelledby="pdv-reaj-title">
        <div className="pdv-cad-sheet">
          <h1 id="pdv-reaj-title">REAJUSTE POR CATEGORIA</h1>
          <div className="pdv-cad-table-wrap">
            <table className="pdv-cad-table">
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Nome</th>
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
                {rows.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <button
                        className="pdv-cad-icon-btn pdv-cad-icon-add"
                        type="button"
                        aria-label={`Produtos de ${item.name}`}
                        onClick={() => navigate(`/client/produtos/estoque/${item.id}`)}
                      >
                        <Plus size={16} strokeWidth={2.6} aria-hidden="true" />
                      </button>
                    </td>
                    <td>
                      <span className="pdv-cad-tree-name" style={{ paddingLeft: item.parentId ? 16 : 0 }}>
                        {item.name}
                      </span>
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        checked={Boolean(selected[item.id])}
                        onChange={(event) => setSelected({ ...selected, [item.id]: event.target.checked })}
                        aria-label={`Selecionar ${item.name}`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="pdv-cad-record">
            Registro 1 a {rows.length} total de {rows.length}
          </p>
          <div className="pdv-cad-pager">
            <button className="pdv-cad-btn pdv-cad-btn-ghost" type="button">
              Inicio
            </button>
            <button className="pdv-cad-btn pdv-cad-btn-ghost" type="button">
              Final
            </button>
          </div>

          <form className="pdv-cad-reaj-bar" onSubmit={onApply}>
            <label>
              %
              <input
                value={percent}
                onChange={(event) => setPercent(event.target.value)}
                inputMode="decimal"
                autoComplete="off"
              />
            </label>
            <button className="pdv-cad-btn pdv-cad-btn-green" type="submit">
              Aplicar
            </button>
            <label>
              ICMS
              <select value={icms} onChange={(event) => setIcms(event.target.value)}>
                {ICMS_OPTIONS.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </label>
            <label>
              Valor
              <input
                value={valor}
                onChange={(event) => setValor(event.target.value)}
                inputMode="decimal"
                autoComplete="off"
              />
            </label>
            <label className="pdv-cad-reaj-ncm">
              NCM
              <span className="pdv-cad-ncm">
                <input
                  value={ncm}
                  onChange={(event) => setNcm(event.target.value)}
                  autoComplete="off"
                  aria-label="NCM"
                />
                <input
                  className="pdv-cad-input-xs"
                  value={ncmx}
                  onChange={(event) => setNcmx(event.target.value)}
                  autoComplete="off"
                  aria-label="NCM complemento"
                />
              </span>
            </label>
            <button
              className="pdv-cad-btn pdv-cad-btn-back"
              type="button"
              onClick={() => navigate("/client/produtos/categorias")}
            >
              ← Voltar
            </button>
          </form>
          <p className="pdv-sr" aria-live="polite">
            {toast}
          </p>
        </div>
      </section>
    </CadastroShell>
  );
}

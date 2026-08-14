import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import CadastroShell from "../CadastroShell";
import { ICMS_OPTIONS } from "./productOptions";
import { loadProductCategories, type ProductCategory } from "./categoryModel";
import { parseError } from "../../../../services/api";

export default function ReajusteCategoria() {
  const navigate = useNavigate();
  const [all, setAll] = useState<ProductCategory[]>([]);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [percent, setPercent] = useState("");
  const [icms, setIcms] = useState<string>(ICMS_OPTIONS[0]);
  const [valor, setValor] = useState("");
  const [ncm, setNcm] = useState("");
  const [ncmx, setNcmx] = useState("");
  const [toast, setToast] = useState("");

  useEffect(() => {
    loadProductCategories(true)
      .then(setAll)
      .catch((err) => {
        setError(parseError(err).friend || "Não foi possível carregar as categorias.");
        setAll([]);
      });
  }, []);

  const rows = useMemo(
    () => all.slice().sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    [all],
  );
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
    setToast(
      `Reajuste preparado para ${count} categoria(s). Preços de venda exigem conferência no estoque; ICMS/NCM fiscal não é enviado à SEFAZ.`,
    );
  }

  return (
    <CadastroShell>
      <section className="pdv-cad-page" aria-labelledby="pdv-reaj-title">
        <div className="pdv-cad-sheet">
          <h1 id="pdv-reaj-title">REAJUSTE POR CATEGORIA</h1>
          {error ? <p className="pdv-cad-error">{error}</p> : null}
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
                        onChange={(event) =>
                          setSelected({ ...selected, [item.id]: event.target.checked })
                        }
                        aria-label={`Selecionar ${item.name}`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <form className="pdv-cad-form" onSubmit={onApply}>
            <div className="pdv-cad-form-row">
              <span className="pdv-cad-form-label">Percentual</span>
              <input value={percent} onChange={(event) => setPercent(event.target.value)} inputMode="decimal" />
            </div>
            <div className="pdv-cad-form-row">
              <span className="pdv-cad-form-label">ICMS</span>
              <select value={icms} onChange={(event) => setIcms(event.target.value)}>
                {ICMS_OPTIONS.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </div>
            <div className="pdv-cad-form-row">
              <span className="pdv-cad-form-label">Valor</span>
              <input value={valor} onChange={(event) => setValor(event.target.value)} inputMode="decimal" />
            </div>
            <div className="pdv-cad-form-row">
              <span className="pdv-cad-form-label">NCM</span>
              <input value={ncm} onChange={(event) => setNcm(event.target.value)} autoComplete="off" />
              <input value={ncmx} onChange={(event) => setNcmx(event.target.value)} autoComplete="off" aria-label="NCM complemento" />
            </div>
            {toast ? <p className="pdv-prod-status" role="status">{toast}</p> : null}
            <div className="pdv-cad-form-go">
              <button className="pdv-cad-btn pdv-cad-btn-green" type="submit">
                Aplicar
              </button>
            </div>
          </form>
        </div>
      </section>
    </CadastroShell>
  );
}

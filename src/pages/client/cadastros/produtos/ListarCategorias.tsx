import { FormEvent, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Eraser, Eye, FolderPlus, Pencil, Plus, Search, X } from "lucide-react";
import CadastroShell from "../CadastroShell";
import { listCatalog, updateCatalog } from "../catalog/catalogApi";
import { parseError } from "../../../../services/api";
import {
  categoryDepth,
  categoryFromCatalog,
  sortCategoryTree,
  type ProductCategory,
} from "./categoryModel";

export default function ListarCategorias({ inactive = false }: { inactive?: boolean }) {
  const navigate = useNavigate();
  const location = useLocation();
  const isInactive = inactive || location.pathname.endsWith("/inativas");
  const [draft, setDraft] = useState({ code: "", name: "" });
  const [applied, setApplied] = useState(draft);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");
  const [all, setAll] = useState<ProductCategory[]>([]);

  function load() {
    listCatalog("product_category")
      .then((items) => {
        setAll(items.map(categoryFromCatalog));
        setError("");
      })
      .catch((err) => {
        setError(parseError(err).friend || "Não foi possível carregar as categorias.");
        setAll([]);
      });
  }

  useEffect(() => {
    load();
  }, []);

  const rows = useMemo(() => {
    const base = all.filter((item) => item.active === !isInactive);
    const code = applied.code.replace(/\D/g, "");
    const name = applied.name.trim().toLowerCase();
    const filtered = base.filter((item) => {
      if (code && !String(item.code).includes(code)) return false;
      if (name && !item.name.toLowerCase().includes(name)) return false;
      return true;
    });
    return sortCategoryTree(filtered);
  }, [all, applied, isInactive]);

  const allSelected = rows.length > 0 && rows.every((item) => selected[item.id]);

  function onFilter(event: FormEvent) {
    event.preventDefault();
    setApplied(draft);
  }

  function toggleAll(checked: boolean) {
    const next: Record<string, boolean> = {};
    rows.forEach((item) => {
      next[item.id] = checked;
    });
    setSelected(next);
  }

  async function toggleSelectedActive() {
    const picked = rows.filter((item) => selected[item.id]);
    if (!picked.length) {
      setToast("Selecione ao menos uma categoria.");
      return;
    }
    try {
      await Promise.all(
        picked.map((item) => updateCatalog("product_category", item.code, { active: isInactive })),
      );
      setSelected({});
      setToast(isInactive ? "Categorias ativadas." : "Categorias inativadas.");
      load();
    } catch (err) {
      setError(parseError(err).friend || "Não foi possível atualizar.");
    }
  }

  return (
    <CadastroShell>
      <section className="pdv-cad-page" aria-labelledby="pdv-cat-title">
        <div className="pdv-cad-sheet">
          <h1 id="pdv-cat-title">CATEGORIAS</h1>
          {error ? <p className="pdv-cad-error">{error}</p> : null}
          <div className="pdv-cad-actions">
            <button
              className="pdv-cad-btn pdv-cad-btn-green"
              type="button"
              onClick={() => navigate("/client/produtos/categorias/cadastrar")}
            >
              <Plus size={16} strokeWidth={2.4} aria-hidden="true" />
              Cadastrar Categoria
            </button>
            <button
              className="pdv-cad-btn pdv-cad-btn-blue"
              type="button"
              onClick={() => navigate("/client/produtos/categorias/reajuste")}
            >
              Reajuste
            </button>
            {isInactive ? (
              <button
                className="pdv-cad-btn pdv-cad-btn-green"
                type="button"
                onClick={() => navigate("/client/produtos/categorias")}
              >
                Categorias Ativas
              </button>
            ) : (
              <button
                className="pdv-cad-btn pdv-cad-btn-red"
                type="button"
                onClick={() => navigate("/client/produtos/categorias/inativas")}
              >
                Categorias Inativas
              </button>
            )}
          </div>

          <form className="pdv-cad-filters pdv-cad-filters-cat" onSubmit={onFilter}>
            <label>
              Cod. Categoria
              <input
                value={draft.code}
                onChange={(event) => setDraft({ ...draft, code: event.target.value })}
                inputMode="numeric"
                autoComplete="off"
              />
            </label>
            <label>
              Nome
              <input
                value={draft.name}
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                autoComplete="off"
              />
            </label>
            <div className="pdv-cad-filters-go">
              <button
                className="pdv-cad-btn pdv-cad-btn-ghost"
                type="button"
                onClick={() => {
                  const empty = { code: "", name: "" };
                  setDraft(empty);
                  setApplied(empty);
                }}
              >
                <Eraser size={15} aria-hidden="true" />
                Limpar
              </button>
              <button className="pdv-cad-btn pdv-cad-btn-blue" type="submit">
                <Search size={15} strokeWidth={2.2} aria-hidden="true" />
                Filtrar
              </button>
            </div>
          </form>

          <div className="pdv-cad-table-wrap">
            <table className="pdv-cad-table">
              <thead>
                <tr>
                  <th>Cod. Categoria</th>
                  <th>Categoria</th>
                  <th>Grade</th>
                  <th>Comissão %</th>
                  <th>Desconto %</th>
                  <th>Lucro %</th>
                  <th>
                    Todos
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
                {rows.map((item) => {
                  const depth = categoryDepth(item, all);
                  return (
                    <tr key={item.id}>
                      <td>{item.code}</td>
                      <td>
                        <span className="pdv-cad-tree-name" style={{ paddingLeft: depth * 16 }}>
                          {item.name}
                        </span>
                      </td>
                      <td>{item.grade}</td>
                      <td>{item.commission}</td>
                      <td>{item.discount}</td>
                      <td>{item.profit}</td>
                      <td>
                        <div className="pdv-cad-row-actions">
                          <button
                            className="pdv-cad-icon-btn"
                            type="button"
                            aria-label={`Visualizar Produtos ${item.name}`}
                            title="Visualizar Produtos"
                            onClick={() => navigate("/client/produtos")}
                          >
                            <Eye size={16} aria-hidden="true" />
                          </button>
                          <button
                            className="pdv-cad-icon-btn"
                            type="button"
                            aria-label={`Atualizar Categoria ${item.name}`}
                            title="Atualizar Categoria"
                            onClick={() =>
                              navigate(`/client/produtos/categorias/cadastrar?id=${item.code}`)
                            }
                          >
                            <Pencil size={16} aria-hidden="true" />
                          </button>
                          <button
                            className="pdv-cad-icon-btn pdv-cad-icon-add"
                            type="button"
                            aria-label={`Adicionar SubCategoria em ${item.name}`}
                            title="+ Adicionar SubCategoria"
                            onClick={() =>
                              navigate(`/client/produtos/categorias/cadastrar?pai=${item.code}`)
                            }
                          >
                            <FolderPlus size={16} aria-hidden="true" />
                          </button>
                          <input
                            type="checkbox"
                            checked={Boolean(selected[item.id])}
                            onChange={(event) =>
                              setSelected({ ...selected, [item.id]: event.target.checked })
                            }
                            aria-label={`Selecionar ${item.name}`}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="pdv-cad-toolbar">
            <button className="pdv-cad-btn pdv-cad-btn-red" type="button" onClick={() => void toggleSelectedActive()}>
              <X size={16} strokeWidth={2.4} aria-hidden="true" />
              {isInactive ? "Ativar" : "Inativar"}
            </button>
          </div>
          <p className="pdv-sr" aria-live="polite">
            {toast}
          </p>
        </div>
      </section>
    </CadastroShell>
  );
}

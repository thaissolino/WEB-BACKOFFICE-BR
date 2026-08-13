import { FormEvent, Fragment, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronRight, Plus, RefreshCw, Search, X } from "lucide-react";
import CadastroShell from "../CadastroShell";
import { DEMO_CATEGORY_ROWS, DEMO_STOCK_PRODUCTS } from "./demoData";

export default function AlterarEstoque() {
  const { categoryId } = useParams();
  if (categoryId) return <EstoqueProdutos categoryId={categoryId} />;
  return <EstoqueCategorias />;
}

function EstoqueCategorias() {
  const navigate = useNavigate();
  const rows = DEMO_CATEGORY_ROWS.filter((item) => item.active && !item.parentId);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState("");
  const allSelected = rows.length > 0 && rows.every((item) => selected[item.id]);

  function toggleAll(checked: boolean) {
    const next: Record<string, boolean> = {};
    rows.forEach((item) => {
      next[item.id] = checked;
    });
    setSelected(next);
  }

  return (
    <CadastroShell>
      <section className="pdv-cad-page" aria-labelledby="pdv-est-title">
        <div className="pdv-cad-sheet">
          <h1 id="pdv-est-title">ALTERAR ESTOQUE</h1>
          <div className="pdv-cad-table-wrap">
            <table className="pdv-cad-table">
              <thead>
                <tr>
                  <th>Produtos</th>
                  <th>Nome</th>
                  <th>Atualizar</th>
                  <th>
                    Inativar
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
                        aria-label={`Abrir produtos de ${item.name}`}
                        onClick={() => navigate(`/client/produtos/estoque/${item.id}`)}
                      >
                        <ChevronRight size={16} strokeWidth={2.6} aria-hidden="true" />
                      </button>
                    </td>
                    <td>{item.name}</td>
                    <td>
                      <button
                        className="pdv-cad-icon-btn"
                        type="button"
                        aria-label={`Atualizar ${item.name}`}
                        onClick={() => setToast(`Categoria ${item.name} atualizada.`)}
                      >
                        <RefreshCw size={16} strokeWidth={2.2} aria-hidden="true" />
                      </button>
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        checked={Boolean(selected[item.id])}
                        onChange={(event) => setSelected({ ...selected, [item.id]: event.target.checked })}
                        aria-label={`Inativar ${item.name}`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="pdv-cad-toolbar">
            <button
              className="pdv-cad-btn pdv-cad-btn-red"
              type="button"
              onClick={() => setToast("Categorias selecionadas inativadas (demo).")}
            >
              <X size={16} strokeWidth={2.4} aria-hidden="true" />
              Inativar
            </button>
          </div>
          <p className="pdv-cad-record">
            Registro 1 de {rows.length} total de {rows.length}
          </p>
          <p className="pdv-sr" aria-live="polite">
            {toast}
          </p>
        </div>
      </section>
    </CadastroShell>
  );
}

function EstoqueProdutos({ categoryId }: { categoryId: string }) {
  const navigate = useNavigate();
  const category = DEMO_CATEGORY_ROWS.find((item) => item.id === categoryId);
  const [draft, setDraft] = useState({ code: "", grade: "", name: "" });
  const [applied, setApplied] = useState(draft);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [stock, setStock] = useState<Record<string, string>>({});
  const [price, setPrice] = useState<Record<string, string>>({});
  const [toast, setToast] = useState("");

  const rows = useMemo(() => {
    const qCode = applied.code.trim();
    const qGrade = applied.grade.trim().toLowerCase();
    const qName = applied.name.trim().toLowerCase();
    const ids = new Set([
      categoryId,
      ...DEMO_CATEGORY_ROWS.filter((row) => row.parentId === categoryId).map((row) => row.id),
    ]);
    return DEMO_STOCK_PRODUCTS.filter((item) => {
      if (!ids.has(item.categoryId)) return false;
      if (qCode && !item.code.includes(qCode)) return false;
      if (qGrade && !item.gradeCode.toLowerCase().includes(qGrade)) return false;
      if (qName && !item.name.toLowerCase().includes(qName)) return false;
      return true;
    });
  }, [applied, categoryId]);

  function onSearch(event: FormEvent) {
    event.preventDefault();
    setApplied(draft);
  }

  const total = rows.reduce((sum, item) => {
    const value = Number((stock[item.id] ?? item.stock).replace(",", "."));
    return sum + (Number.isFinite(value) ? value : 0);
  }, 0);

  return (
    <CadastroShell>
      <section className="pdv-cad-page" aria-labelledby="pdv-est-prod-title">
        <div className="pdv-cad-sheet">
          <h1 id="pdv-est-prod-title">ALTERAR ESTOQUE</h1>
          <div className="pdv-cad-toolbar">
            <button
              className="pdv-cad-btn pdv-cad-btn-back"
              type="button"
              onClick={() => navigate("/client/produtos/estoque")}
            >
              ← Voltar
            </button>
            <button
              className="pdv-cad-btn pdv-cad-btn-green"
              type="button"
              onClick={() => navigate("/client/produtos/cadastrar")}
            >
              <Plus size={16} strokeWidth={2.4} aria-hidden="true" />
              Cadastrar
            </button>
          </div>
          <p className="pdv-cad-kicker">{category?.name ?? "Categoria"}</p>

          <form className="pdv-cad-filters pdv-cad-filters-stock" onSubmit={onSearch}>
            <label>
              Cod Produto
              <input
                value={draft.code}
                onChange={(event) => setDraft({ ...draft, code: event.target.value })}
                autoComplete="off"
              />
            </label>
            <label>
              Cod Grade
              <input
                value={draft.grade}
                onChange={(event) => setDraft({ ...draft, grade: event.target.value })}
                autoComplete="off"
              />
            </label>
            <label>
              Nome Produto:
              <input
                value={draft.name}
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                autoComplete="off"
              />
            </label>
            <div className="pdv-cad-filters-go">
              <button className="pdv-cad-btn pdv-cad-btn-blue" type="submit">
                <Search size={15} strokeWidth={2.2} aria-hidden="true" />
                Buscar
              </button>
            </div>
          </form>

          <div className="pdv-cad-table-wrap">
            <table className="pdv-cad-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Estoque</th>
                  <th>Ultima Compra</th>
                  <th>Venda</th>
                  <th>Alterar Estoque</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((item) => {
                  const expanded = Boolean(open[item.id]);
                  return (
                    <Fragment key={item.id}>
                      <tr>
                        <td>
                          {item.grades?.length ? (
                            <button
                              className="pdv-cad-icon-btn pdv-cad-icon-add"
                              type="button"
                              aria-expanded={expanded}
                              aria-label={`${expanded ? "Recolher" : "Expandir"} grade de ${item.name}`}
                              onClick={() => setOpen({ ...open, [item.id]: !expanded })}
                            >
                              <ChevronRight
                                size={16}
                                strokeWidth={2.6}
                                aria-hidden="true"
                                style={{ transform: expanded ? "rotate(90deg)" : undefined }}
                              />
                            </button>
                          ) : null}{" "}
                          {item.code} - {item.name}
                        </td>
                        <td>{stock[item.id] ?? item.stock}</td>
                        <td>{item.lastPurchase}</td>
                        <td>{item.sale}</td>
                        <td>
                          <input
                            className="pdv-cad-stock-num"
                            value={stock[item.id] ?? item.stock}
                            onChange={(event) => setStock({ ...stock, [item.id]: event.target.value })}
                            onBlur={() => setToast("Estoque atualizado (demo).")}
                            inputMode="decimal"
                            aria-label={`Alterar estoque de ${item.name}`}
                          />
                        </td>
                      </tr>
                      {expanded && item.grades
                        ? item.grades.map((grade) => (
                            <tr key={grade.id} className="pdv-cad-grade-row">
                              <td>{grade.label}</td>
                              <td>{stock[grade.id] ?? grade.stock}</td>
                              <td />
                              <td>
                                R${" "}
                                <input
                                  className="pdv-cad-stock-num"
                                  value={price[grade.id] ?? grade.price}
                                  onChange={(event) => setPrice({ ...price, [grade.id]: event.target.value })}
                                  onBlur={() => setToast("Preço atualizado (demo).")}
                                  inputMode="decimal"
                                  aria-label={`Preço de ${grade.label}`}
                                />
                              </td>
                              <td>
                                <input
                                  className="pdv-cad-stock-num"
                                  value={stock[grade.id] ?? grade.stock}
                                  onChange={(event) => setStock({ ...stock, [grade.id]: event.target.value })}
                                  onBlur={() => setToast("Estoque atualizado (demo).")}
                                  inputMode="decimal"
                                  aria-label={`Alterar estoque de ${grade.label}`}
                                />
                              </td>
                            </tr>
                          ))
                        : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="pdv-cad-record">
            <strong>Total:</strong> {String(total).replace(".", ",")}
          </p>
          <p className="pdv-sr" aria-live="polite">
            {toast}
          </p>
        </div>
      </section>
    </CadastroShell>
  );
}

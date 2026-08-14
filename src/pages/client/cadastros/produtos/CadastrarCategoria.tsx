import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Folder } from "lucide-react";
import CadastroShell from "../CadastroShell";
import { createCatalog, getCatalog, updateCatalog } from "../catalog/catalogApi";
import { parseError } from "../../../../services/api";
import { categoryFromCatalog, slugifyCategory, type ProductCategory } from "./categoryModel";
import { CATEGORY_TYPE_OPTIONS, GRADE_OPTIONS } from "./productOptions";

const EMPTY = {
  name: "",
  description: "",
  commission: "0,00",
  profit: "0,00",
  maxDiscount: "0,00",
  defaultDiscount: false,
  defaultDiscountValue: "0,00",
  ncmSuggest: false,
  ncm: "",
  ncmx: "",
  grade: "Sem Grade",
  type: "Produto c/ Controle de Estoque",
};

export default function CadastrarCategoria() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const editId = Number(params.get("id") || 0);
  const parentCode = Number(params.get("pai") || 0);
  const [editing, setEditing] = useState<ProductCategory | null>(null);
  const [parent, setParent] = useState<ProductCategory | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editId) {
      setEditing(null);
      return;
    }
    getCatalog("product_category", editId)
      .then((item) => {
        const row = categoryFromCatalog(item);
        setEditing(row);
        const [ncm, ncmx] = row.ncm.includes(".")
          ? [row.ncm.slice(0, 4), row.ncm.slice(5)]
          : [row.ncm, ""];
        setForm({
          name: row.name,
          description: row.description,
          commission: row.commission,
          profit: row.profit,
          maxDiscount: row.discount,
          defaultDiscount: row.defaultDiscount,
          defaultDiscountValue: row.defaultDiscountValue || "0,00",
          ncmSuggest: row.ncmSuggest,
          ncm,
          ncmx,
          grade: row.grade,
          type: row.type,
        });
      })
      .catch(() => setStatus("Não foi possível carregar a categoria."));
  }, [editId]);

  useEffect(() => {
    if (!parentCode) {
      setParent(null);
      return;
    }
    getCatalog("product_category", parentCode)
      .then((item) => setParent(categoryFromCatalog(item)))
      .catch(() => setParent(null));
  }, [parentCode]);

  const title = editing ? "ATUALIZAR CATEGORIA" : "CADASTRAR CATEGORIA";

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!form.name.trim()) {
      setStatus("Informe a categoria.");
      return;
    }
    const ncm = [form.ncm, form.ncmx].filter(Boolean).join(".");
    const payload = {
      slug: editing?.id || slugifyCategory(form.name),
      parentSlug: parent?.id || editing?.parentId || "",
      grade: form.grade,
      commission: form.commission,
      discount: form.maxDiscount,
      profit: form.profit,
      type: form.type,
      description: form.description,
      ncmSuggest: form.ncmSuggest,
      ncm,
      defaultDiscount: form.defaultDiscount,
      defaultDiscountValue: form.defaultDiscountValue,
    };
    setSaving(true);
    try {
      if (editing) {
        await updateCatalog("product_category", editing.code, {
          name: form.name.trim(),
          payload,
          active: editing.active,
        });
      } else {
        await createCatalog("product_category", {
          name: form.name.trim(),
          payload,
        });
      }
      navigate("/client/produtos/categorias");
    } catch (err) {
      setStatus(parseError(err).friend || "Não foi possível salvar a categoria.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <CadastroShell>
      <section className="pdv-cad-page" aria-labelledby="pdv-cat-form-title">
        <div className="pdv-cad-sheet">
          <h1 id="pdv-cat-form-title">{title}</h1>
          <button
            className="pdv-cad-btn pdv-cad-btn-back pdv-voltar"
            type="button"
            onClick={() => navigate("/client/produtos/categorias")}
          >
            Voltar
          </button>

          <form className="pdv-cad-form" onSubmit={onSubmit}>
            <div className="pdv-cad-form-bar">
              <Folder size={16} aria-hidden="true" />
              {editing ? "Atualizar Categoria" : "Cadastrar Categoria"}
            </div>

            {parent ? (
              <p className="pdv-cad-kicker">Subcategoria de: {parent.name}</p>
            ) : null}

            <div className="pdv-cad-form-row">
              <span className="pdv-cad-form-label">Categoria</span>
              <input
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                autoComplete="off"
                required
              />
            </div>

            <div className="pdv-cad-form-row pdv-cad-form-row-top">
              <span className="pdv-cad-form-label">Descrição Interna</span>
              <textarea
                rows={3}
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
              />
            </div>

            <div className="pdv-cad-form-row">
              <span className="pdv-cad-form-label">Porcentagem de Comissão</span>
              <span className="pdv-cad-pct">
                <input
                  className="pdv-cad-input-sm"
                  value={form.commission}
                  onChange={(event) => setForm({ ...form, commission: event.target.value })}
                  inputMode="decimal"
                />
                %
              </span>
            </div>

            <div className="pdv-cad-form-row">
              <span className="pdv-cad-form-label">Lucro</span>
              <span className="pdv-cad-pct">
                <input
                  className="pdv-cad-input-sm"
                  value={form.profit}
                  onChange={(event) => setForm({ ...form, profit: event.target.value })}
                  inputMode="decimal"
                />
                %
              </span>
            </div>

            <div className="pdv-cad-form-row">
              <span className="pdv-cad-form-label">Desconto máximo</span>
              <span className="pdv-cad-pct">
                <input
                  className="pdv-cad-input-sm"
                  value={form.maxDiscount}
                  onChange={(event) => setForm({ ...form, maxDiscount: event.target.value })}
                  inputMode="decimal"
                />
                %
              </span>
            </div>

            <div className="pdv-cad-form-row">
              <span className="pdv-cad-form-label">Desconto padrão</span>
              <div className="pdv-cad-plus-field-stack">
                <fieldset className="pdv-cad-radios">
                  <legend className="pdv-sr">Desconto padrão</legend>
                  <label>
                    <input
                      type="radio"
                      name="desconto-padrao"
                      checked={form.defaultDiscount}
                      onChange={() => setForm({ ...form, defaultDiscount: true })}
                    />
                    Sim
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="desconto-padrao"
                      checked={!form.defaultDiscount}
                      onChange={() => setForm({ ...form, defaultDiscount: false })}
                    />
                    Não
                  </label>
                </fieldset>
                {form.defaultDiscount ? (
                  <span className="pdv-cad-pct">
                    <input
                      className="pdv-cad-input-sm"
                      value={form.defaultDiscountValue}
                      onChange={(event) => setForm({ ...form, defaultDiscountValue: event.target.value })}
                      inputMode="decimal"
                      aria-label="Valor do desconto padrão"
                    />
                    %
                  </span>
                ) : null}
              </div>
            </div>

            <div className="pdv-cad-form-row">
              <span className="pdv-cad-form-label">Sugerir NCM Padrão</span>
              <div className="pdv-cad-plus-field-stack">
                <fieldset className="pdv-cad-radios">
                  <legend className="pdv-sr">Sugerir NCM Padrão</legend>
                  <label>
                    <input
                      type="radio"
                      name="ncm-padrao"
                      checked={form.ncmSuggest}
                      onChange={() => setForm({ ...form, ncmSuggest: true })}
                    />
                    Sim
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="ncm-padrao"
                      checked={!form.ncmSuggest}
                      onChange={() => setForm({ ...form, ncmSuggest: false })}
                    />
                    Não
                  </label>
                </fieldset>
                {form.ncmSuggest ? (
                  <span className="pdv-cad-ncm">
                    <input
                      value={form.ncm}
                      onChange={(event) => setForm({ ...form, ncm: event.target.value })}
                      aria-label="NCM"
                      autoComplete="off"
                    />
                    <input
                      className="pdv-cad-input-xs"
                      value={form.ncmx}
                      onChange={(event) => setForm({ ...form, ncmx: event.target.value })}
                      aria-label="NCM complemento"
                      autoComplete="off"
                    />
                  </span>
                ) : null}
              </div>
            </div>

            <div className="pdv-cad-form-row">
              <span className="pdv-cad-form-label">Grade</span>
              <select
                value={form.grade}
                onChange={(event) => setForm({ ...form, grade: event.target.value })}
              >
                {GRADE_OPTIONS.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </div>

            <div className="pdv-cad-form-row">
              <span className="pdv-cad-form-label">Tipo</span>
              <select
                value={form.type}
                onChange={(event) => setForm({ ...form, type: event.target.value })}
              >
                {CATEGORY_TYPE_OPTIONS.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </div>

            {status ? (
              <p className="pdv-prod-status" role="status">
                {status}
              </p>
            ) : null}

            <div className="pdv-cad-form-go">
              <button className="pdv-cad-btn pdv-cad-btn-green" type="submit" disabled={saving}>
                {saving ? "Salvando…" : editing ? "Atualizar" : "Cadastrar"}
              </button>
            </div>
          </form>
        </div>
      </section>
    </CadastroShell>
  );
}

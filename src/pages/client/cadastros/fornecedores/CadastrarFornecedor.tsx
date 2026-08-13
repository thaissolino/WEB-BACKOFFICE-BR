import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Info, Plus, UserRound } from "lucide-react";
import { api, parseError } from "../../../../services/api";
import { formatCep, formatCnpj, formatCpf, formatPhoneBr, PHONE_BR_MAX_LENGTH } from "../../../../utils/brMasks";
import CadastroShell from "../CadastroShell";
import type { PersonType, SupplierKind } from "./types";

const EMPTY = {
  personType: "juridica" as PersonType,
  document: "",
  razao: "",
  fantasia: "",
  inscricaoEstadual: "",
  cep: "",
  address: "",
  number: "",
  neighborhood: "",
  city: "",
  uf: "",
  phone: "",
  mobile: "",
  contact: "",
  profitCalc: "Por Produto",
  email: "",
  supplierKind: "produto" as SupplierKind,
  internal: false,
  notes: "",
};

export default function CadastrarFornecedor() {
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const docLabel = form.personType === "fisica" ? "CPF" : form.personType === "estrangeiro" ? "Doc. Estrangeiro" : "CNPJ";

  function onPersonType(next: PersonType) {
    setForm({ ...form, personType: next, document: "" });
  }

  function onDocument(value: string) {
    if (form.personType === "fisica") setForm({ ...form, document: formatCpf(value) });
    else if (form.personType === "juridica") setForm({ ...form, document: formatCnpj(value) });
    else setForm({ ...form, document: value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 20) });
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api.post("/clients/suppliers", form);
      navigate("/client/fornecedores");
    } catch (err) {
      const parsed = parseError(err);
      setError(parsed.friend || parsed.message || "Não foi possível cadastrar o fornecedor.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <CadastroShell>
      <section className="pdv-cad-page" aria-labelledby="pdv-cad-forn-form-title">
        <div className="pdv-cad-sheet">
          <h1 id="pdv-cad-forn-form-title">CADASTRAR FORNECEDOR</h1>
          <button className="pdv-cad-btn pdv-cad-btn-back" type="button" onClick={() => navigate("/client/fornecedores")}>
            ← Voltar
          </button>

          <form className="pdv-cad-form" onSubmit={onSubmit}>
            <div className="pdv-cad-form-bar">
              <UserRound size={16} aria-hidden="true" />
              Cadastrar Fornecedor
            </div>

            <div className="pdv-cad-form-row">
              <span className="pdv-cad-form-label">Tipo de Pessoa</span>
              <fieldset className="pdv-cad-radios">
                <legend className="pdv-sr">Tipo de Pessoa</legend>
                <label>
                  <input type="radio" name="pessoa" checked={form.personType === "fisica"} onChange={() => onPersonType("fisica")} />
                  Física
                </label>
                <label>
                  <input
                    type="radio"
                    name="pessoa"
                    checked={form.personType === "juridica"}
                    onChange={() => onPersonType("juridica")}
                  />
                  Jurídica
                </label>
                <label>
                  <input
                    type="radio"
                    name="pessoa"
                    checked={form.personType === "estrangeiro"}
                    onChange={() => onPersonType("estrangeiro")}
                  />
                  Estrangeiro
                </label>
              </fieldset>
            </div>

            <label className="pdv-cad-form-row">
              <span className="pdv-cad-form-label">{docLabel}</span>
              <input value={form.document} onChange={(event) => onDocument(event.target.value)} autoComplete="off" />
            </label>
            <label className="pdv-cad-form-row">
              <span className="pdv-cad-form-label">Razão</span>
              <input value={form.razao} onChange={(event) => setForm({ ...form, razao: event.target.value })} autoComplete="off" />
            </label>
            <label className="pdv-cad-form-row">
              <span className="pdv-cad-form-label">Fantasia</span>
              <input
                value={form.fantasia}
                onChange={(event) => setForm({ ...form, fantasia: event.target.value })}
                autoComplete="off"
              />
            </label>
            <label className="pdv-cad-form-row">
              <span className="pdv-cad-form-label">Inscrição Estadual</span>
              <input
                value={form.inscricaoEstadual}
                onChange={(event) => setForm({ ...form, inscricaoEstadual: event.target.value })}
                autoComplete="off"
              />
            </label>
            <label className="pdv-cad-form-row">
              <span className="pdv-cad-form-label">CEP</span>
              <input
                className="pdv-cad-input-sm"
                value={form.cep}
                onChange={(event) => setForm({ ...form, cep: formatCep(event.target.value) })}
                inputMode="numeric"
                autoComplete="off"
              />
            </label>
            <label className="pdv-cad-form-row">
              <span className="pdv-cad-form-label">Endereço</span>
              <input
                value={form.address}
                onChange={(event) => setForm({ ...form, address: event.target.value })}
                autoComplete="off"
              />
            </label>
            <label className="pdv-cad-form-row">
              <span className="pdv-cad-form-label">Número/Complemento</span>
              <input value={form.number} onChange={(event) => setForm({ ...form, number: event.target.value })} autoComplete="off" />
            </label>
            <label className="pdv-cad-form-row">
              <span className="pdv-cad-form-label">Bairro</span>
              <input
                value={form.neighborhood}
                onChange={(event) => setForm({ ...form, neighborhood: event.target.value })}
                autoComplete="off"
              />
            </label>
            <label className="pdv-cad-form-row">
              <span className="pdv-cad-form-label">Cidade</span>
              <input value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} autoComplete="off" />
            </label>
            <label className="pdv-cad-form-row">
              <span className="pdv-cad-form-label">UF</span>
              <input
                className="pdv-cad-input-xs"
                value={form.uf}
                onChange={(event) => setForm({ ...form, uf: event.target.value.toUpperCase().slice(0, 2) })}
                autoComplete="off"
              />
            </label>
            <label className="pdv-cad-form-row">
              <span className="pdv-cad-form-label">Telefone</span>
              <input
                className="pdv-cad-input-sm"
                value={form.phone}
                onChange={(event) => setForm({ ...form, phone: formatPhoneBr(event.target.value) })}
                placeholder="()"
                maxLength={PHONE_BR_MAX_LENGTH}
                inputMode="tel"
                autoComplete="off"
              />
            </label>
            <label className="pdv-cad-form-row">
              <span className="pdv-cad-form-label">Celular</span>
              <input
                className="pdv-cad-input-sm"
                value={form.mobile}
                onChange={(event) => setForm({ ...form, mobile: formatPhoneBr(event.target.value) })}
                placeholder="()"
                maxLength={PHONE_BR_MAX_LENGTH}
                inputMode="tel"
                autoComplete="off"
              />
            </label>
            <label className="pdv-cad-form-row">
              <span className="pdv-cad-form-label">Contato</span>
              <input
                value={form.contact}
                onChange={(event) => setForm({ ...form, contact: event.target.value })}
                autoComplete="off"
              />
            </label>
            <div className="pdv-cad-form-row pdv-cad-form-row-top">
              <span className="pdv-cad-form-label">
                Cálculo do lucro para gerar Preço de Venda sugerido será por
              </span>
              <div>
                <select value={form.profitCalc} onChange={(event) => setForm({ ...form, profitCalc: event.target.value })}>
                  <option>Por Produto</option>
                  <option>Markup</option>
                </select>
                <p className="pdv-cad-hint">(por valor e markup configura a faixa no Fornecedor atualizar)</p>
              </div>
            </div>
            <label className="pdv-cad-form-row">
              <span className="pdv-cad-form-label">E-mail</span>
              <input
                type="email"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                autoComplete="off"
              />
            </label>
            <div className="pdv-cad-form-row">
              <span className="pdv-cad-form-label">Tipo de Fornecedor</span>
              <fieldset className="pdv-cad-radios">
                <legend className="pdv-sr">Tipo de Fornecedor</legend>
                <label>
                  <input
                    type="radio"
                    name="tipo-forn"
                    checked={form.supplierKind === "produto"}
                    onChange={() => setForm({ ...form, supplierKind: "produto" })}
                  />
                  Produto
                </label>
                <label>
                  <input
                    type="radio"
                    name="tipo-forn"
                    checked={form.supplierKind === "despesas"}
                    onChange={() => setForm({ ...form, supplierKind: "despesas" })}
                  />
                  Despesas
                </label>
              </fieldset>
            </div>
            <div className="pdv-cad-form-row">
              <span className="pdv-cad-form-label">
                Fornecedor Interno <Info size={14} aria-hidden="true" />
              </span>
              <button
                className="pdv-cad-toggle"
                type="button"
                aria-pressed={form.internal}
                onClick={() => setForm({ ...form, internal: !form.internal })}
              >
                {form.internal ? "Sim" : "Não"}
              </button>
            </div>
            <label className="pdv-cad-form-row pdv-cad-form-row-top">
              <span className="pdv-cad-form-label">Obs</span>
              <textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} rows={5} />
            </label>

            {error ? (
              <p className="pdv-cad-error" role="alert">
                {error}
              </p>
            ) : null}

            <div className="pdv-cad-form-go">
              <button className="pdv-cad-btn pdv-cad-btn-green" type="submit" disabled={saving}>
                <Plus size={16} strokeWidth={2.4} aria-hidden="true" />
                Cadastrar Fornecedor
              </button>
            </div>
          </form>
        </div>
      </section>
    </CadastroShell>
  );
}

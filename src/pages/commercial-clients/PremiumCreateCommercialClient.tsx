import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { BrToast, PremiumStage } from "../../components/premium/PremiumStage";
import { api, parseError } from "../../services/api";
import { emptyCommercialClientForm } from "./types";

export default function PremiumCreateCommercialClient() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ open: false, message: "" });
  const [form, setForm] = useState(emptyCommercialClientForm);

  function setField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!form.name.trim()) {
      setToast({ open: true, message: "Informe o nome do cliente comercial." });
      return;
    }
    setSaving(true);
    try {
      const { data } = await api.post("/backoffice/commercial-clients", {
        name: form.name.trim(),
        document: form.document.trim() || null,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        notes: form.notes.trim() || null,
        active: form.active,
      });
      navigate(`/clientes-comerciais/${data.commercialClient.id}`);
    } catch (err) {
      const parsed = parseError(err);
      setToast({ open: true, message: parsed.friend || parsed.message || "Não foi possível cadastrar." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <PremiumStage
      title="Novo cliente comercial"
      hint="Dono B2B das lojas. Um cliente pode ter várias vitrines. Não é o cliente final do PDV."
      actions={
        <button className="br-btn br-btn-ghost" type="button" onClick={() => navigate("/clientes-comerciais")}>
          Ver clientes
        </button>
      }
    >
      <form className="br-panel" onSubmit={handleSubmit}>
        <h2>Dados do cliente</h2>
        <div className="br-grid two">
          <label className="br-field">
            <span>Nome *</span>
            <input required value={form.name} onChange={(e) => setField("name", e.target.value)} />
          </label>
          <label className="br-field">
            <span>Documento (CPF/CNPJ)</span>
            <input value={form.document} onChange={(e) => setField("document", e.target.value)} />
          </label>
          <label className="br-field">
            <span>E-mail</span>
            <input type="email" value={form.email} onChange={(e) => setField("email", e.target.value)} />
          </label>
          <label className="br-field">
            <span>Telefone</span>
            <input value={form.phone} onChange={(e) => setField("phone", e.target.value)} />
          </label>
          <label className="br-field">
            <span>Status</span>
            <select value={form.active ? "ACTIVE" : "INACTIVE"} onChange={(e) => setField("active", e.target.value === "ACTIVE")}>
              <option value="ACTIVE">Ativo</option>
              <option value="INACTIVE">Inativo</option>
            </select>
          </label>
        </div>
        <div className="br-grid" style={{ marginTop: 12 }}>
          <label className="br-field">
            <span>Observações</span>
            <input value={form.notes} onChange={(e) => setField("notes", e.target.value)} />
          </label>
        </div>
        <div className="br-actions" style={{ marginTop: 14 }}>
          <button className="br-btn br-btn-brass" type="submit" disabled={saving}>
            {saving ? "Gravando..." : "Criar cliente comercial"}
          </button>
        </div>
      </form>
      <BrToast open={toast.open} message={toast.message} onClose={() => setToast({ open: false, message: "" })} />
    </PremiumStage>
  );
}

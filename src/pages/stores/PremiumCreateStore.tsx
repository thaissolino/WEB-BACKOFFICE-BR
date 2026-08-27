import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { BrToast, PremiumStage } from "../../components/premium/PremiumStage";
import { api, parseError } from "../../services/api";
import type { StoreStatus } from "./types";

type LojistaOption = {
  id: string;
  name: string;
  email: string;
};

function formatCpfCnpj(value: string) {
  const d = (value || "").replace(/\D/g, "").slice(0, 14);
  if (d.length <= 11) {
    return d
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }
  return d
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

function formatPhone(value: string) {
  const d = (value || "").replace(/\D/g, "").slice(0, 11);
  if (d.length <= 10) {
    return d.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d{1,4})$/, "$1-$2");
  }
  return d.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d{1,4})$/, "$1-$2");
}

export default function PremiumCreateStore() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [lojistas, setLojistas] = useState<LojistaOption[]>([]);
  const [toast, setToast] = useState({ open: false, message: "" });
  const [form, setForm] = useState({
    name: "",
    slug: "",
    document: "",
    phone: "",
    email: "",
    status: "ACTIVE" as StoreStatus,
    address: "",
    city: "",
    manager: "",
    clientId: "",
  });

  function setField(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  useEffect(() => {
    api
      .get("/backoffice/lojistas")
      .then(({ data }) => setLojistas(data.lojistas || []))
      .catch(() => setLojistas([]));
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!form.name.trim()) {
      setToast({ open: true, message: "Informe o nome da loja." });
      return;
    }
    setSaving(true);
    try {
      const { data } = await api.post("/backoffice/stores", {
        name: form.name.trim(),
        slug: form.slug.trim() || undefined,
        document: form.document.replace(/\D/g, "") || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        status: form.status,
        address: form.address.trim() || null,
        city: form.city.trim() || null,
        manager: form.manager.trim() || null,
        clientId: form.clientId || null,
      });
      navigate(`/lojas/${data.store.id}`);
    } catch (err) {
      const parsed = parseError(err);
      setToast({ open: true, message: parsed.friend || parsed.message || "Não foi possível cadastrar." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <PremiumStage
      title="Cadastrar loja"
      hint="Nome loja, CNPJ/CPF, telefone, e-mail e vínculo opcional com lojista."
      actions={
        <button className="br-btn br-btn-ghost" type="button" onClick={() => navigate("/lojas")}>
          Ver lojas
        </button>
      }
    >
      <form className="br-panel" onSubmit={handleSubmit}>
        <h2>Dados da loja</h2>
        <div className="br-grid two">
          <label className="br-field" style={{ gridColumn: "1 / -1" }}>
            <span>Nome loja *</span>
            <input required value={form.name} onChange={(e) => setField("name", e.target.value)} />
          </label>
          <label className="br-field">
            <span>CNPJ / CPF</span>
            <input
              value={form.document}
              onChange={(e) => setField("document", formatCpfCnpj(e.target.value))}
              inputMode="numeric"
            />
          </label>
          <label className="br-field">
            <span>Telefone</span>
            <input
              value={form.phone}
              onChange={(e) => setField("phone", formatPhone(e.target.value))}
              inputMode="tel"
            />
          </label>
          <label className="br-field" style={{ gridColumn: "1 / -1" }}>
            <span>E-mail</span>
            <input type="email" value={form.email} onChange={(e) => setField("email", e.target.value)} />
          </label>
          <label className="br-field" style={{ gridColumn: "1 / -1" }}>
            <span>Vincular lojista (opcional)</span>
            <select value={form.clientId} onChange={(e) => setField("clientId", e.target.value)}>
              <option value="">Nenhum</option>
              {lojistas.map((lojista) => (
                <option key={lojista.id} value={lojista.id}>
                  {lojista.name}
                  {lojista.email ? ` — ${lojista.email}` : ""}
                </option>
              ))}
            </select>
            <small>Lojista = conta de login do PDV.</small>
          </label>
          <label className="br-field">
            <span>Slug</span>
            <input placeholder="opcional" value={form.slug} onChange={(e) => setField("slug", e.target.value)} />
          </label>
          <label className="br-field">
            <span>Status</span>
            <select value={form.status} onChange={(e) => setField("status", e.target.value)}>
              <option value="ACTIVE">Ativa</option>
              <option value="INACTIVE">Inativa</option>
            </select>
          </label>
          <label className="br-field">
            <span>Cidade</span>
            <input value={form.city} onChange={(e) => setField("city", e.target.value)} />
          </label>
          <label className="br-field">
            <span>Responsável</span>
            <input value={form.manager} onChange={(e) => setField("manager", e.target.value)} />
          </label>
        </div>
        <div className="br-grid" style={{ marginTop: 12 }}>
          <label className="br-field">
            <span>Endereço</span>
            <input value={form.address} onChange={(e) => setField("address", e.target.value)} />
          </label>
        </div>
        <div className="br-actions" style={{ marginTop: 14 }}>
          <button className="br-btn br-btn-brass" type="submit" disabled={saving}>
            {saving ? "Gravando..." : "Cadastrar loja"}
          </button>
        </div>
      </form>
      <BrToast open={toast.open} message={toast.message} onClose={() => setToast({ open: false, message: "" })} />
    </PremiumStage>
  );
}

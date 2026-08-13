import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { BrToast, PremiumStage } from "../../components/premium/PremiumStage";
import { api, parseError } from "../../services/api";
import type { StoreStatus } from "./types";
import type { CommercialClient } from "../commercial-clients/types";

export default function PremiumCreateStore() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [saving, setSaving] = useState(false);
  const [clients, setClients] = useState<CommercialClient[]>([]);
  const [toast, setToast] = useState({ open: false, message: "" });
  const [form, setForm] = useState({
    name: "",
    slug: "",
    document: "",
    status: "ACTIVE" as StoreStatus,
    address: "",
    city: "",
    manager: "",
    commercialClientId: params.get("clienteComercialId") || "",
  });

  function setField(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  useEffect(() => {
    api
      .get("/backoffice/commercial-clients")
      .then(({ data }) => setClients(data.commercialClients || []))
      .catch(() => setClients([]));
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
        document: form.document.trim() || null,
        status: form.status,
        address: form.address.trim() || null,
        city: form.city.trim() || null,
        manager: form.manager.trim() || null,
        commercialClientId: form.commercialClientId || null,
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
      title="Nova loja"
      hint="Nome é o único campo obrigatório. Slug vazio é gerado a partir do nome."
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
            <span>Cliente comercial</span>
            <select value={form.commercialClientId} onChange={(e) => setField("commercialClientId", e.target.value)}>
              <option value="">Nenhum</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
            <small>Um cliente comercial pode ter várias lojas.</small>
          </label>
          <label className="br-field">
            <span>Nome *</span>
            <input required value={form.name} onChange={(e) => setField("name", e.target.value)} />
          </label>
          <label className="br-field">
            <span>Slug</span>
            <input placeholder="opcional" value={form.slug} onChange={(e) => setField("slug", e.target.value)} />
          </label>
          <label className="br-field">
            <span>Documento</span>
            <input value={form.document} onChange={(e) => setField("document", e.target.value)} />
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
            {saving ? "Gravando..." : "Criar loja"}
          </button>
        </div>
      </form>
      <BrToast open={toast.open} message={toast.message} onClose={() => setToast({ open: false, message: "" })} />
    </PremiumStage>
  );
}

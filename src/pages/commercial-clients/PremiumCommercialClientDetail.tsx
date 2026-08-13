import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { BrToast, PremiumStage } from "../../components/premium/PremiumStage";
import { api, parseError } from "../../services/api";
import { emptyCommercialClientForm, type CommercialClient, type CommercialClientStore } from "./types";

export default function PremiumCommercialClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState<CommercialClient | null>(null);
  const [stores, setStores] = useState<CommercialClientStore[]>([]);
  const [form, setForm] = useState(emptyCommercialClientForm);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ open: false, message: "" });

  function setField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function load() {
    if (!id) return;
    try {
      const { data } = await api.get(`/backoffice/commercial-clients/${id}`);
      const next: CommercialClient = data.commercialClient;
      setClient(next);
      setStores(data.stores || []);
      setForm({
        name: next.name,
        document: next.document || "",
        email: next.email || "",
        phone: next.phone || "",
        notes: next.notes || "",
        active: next.active,
      });
    } catch (err) {
      const parsed = parseError(err);
      setToast({ open: true, message: parsed.friend || parsed.message || "Não foi possível carregar o cliente." });
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!id) return;
    setSaving(true);
    try {
      await api.put(`/backoffice/commercial-clients/${id}`, {
        name: form.name.trim(),
        document: form.document.trim() || null,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        notes: form.notes.trim() || null,
        active: form.active,
      });
      await load();
    } catch (err) {
      const parsed = parseError(err);
      setToast({ open: true, message: parsed.friend || parsed.message || "Não foi possível salvar." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <PremiumStage
      title={client?.name || "Cliente comercial"}
      hint={client ? `${client.storesCount} ${client.storesCount === 1 ? "loja" : "lojas"} · um cliente pode ter várias vitrines` : "Detalhe do dono B2B"}
      actions={
        <>
          <button className="br-btn br-btn-ghost" type="button" onClick={() => navigate("/clientes-comerciais")}>
            Clientes
          </button>
          <button
            className="br-btn br-btn-brass"
            type="button"
            onClick={() => navigate(id ? `/lojas/cadastrar?clienteComercialId=${id}` : "/lojas/cadastrar")}
          >
            Nova loja
          </button>
        </>
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
            <span>Documento</span>
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
            {saving ? "Gravando..." : "Salvar"}
          </button>
        </div>
      </form>

      <section className="br-panel">
        <h2>Lojas deste cliente</h2>
        {stores.length === 0 ? <p className="br-empty">Nenhuma loja vinculada. Cadastre uma vitrine para este dono.</p> : null}
        {stores.length > 0 ? (
          <div className="br-list">
            {stores.map((store) => (
              <div className="br-row" key={store.id}>
                <button className="br-row-main" type="button" onClick={() => navigate(`/lojas/${store.id}`)}>
                  <strong>{store.name}</strong>
                  <small>
                    <span className="br-pip" data-on={store.status === "ACTIVE" ? "true" : "false"}>
                      {store.status === "ACTIVE" ? "Ativa" : "Inativa"}
                    </span>
                    {" · "}
                    {store.slug} · {store.city || "sem cidade"}
                  </small>
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </section>
      <BrToast open={toast.open} message={toast.message} onClose={() => setToast({ open: false, message: "" })} />
    </PremiumStage>
  );
}

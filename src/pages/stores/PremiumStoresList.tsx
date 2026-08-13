import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BrToast, PremiumStage } from "../../components/premium/PremiumStage";
import { api, parseError } from "../../services/api";
import type { Store, StoreStatus } from "./types";
import type { CommercialClient } from "../commercial-clients/types";

export default function PremiumStoresList() {
  const navigate = useNavigate();
  const [stores, setStores] = useState<Store[]>([]);
  const [clients, setClients] = useState<CommercialClient[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Store | null>(null);
  const [toast, setToast] = useState({ open: false, message: "" });

  async function load(term = search) {
    setLoading(true);
    try {
      const { data } = await api.get("/backoffice/stores", { params: term ? { search: term } : undefined });
      setStores(data.stores || []);
    } catch (err) {
      const parsed = parseError(err);
      setToast({ open: true, message: parsed.friend || parsed.message || "Falha ao listar lojas." });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    api
      .get("/backoffice/commercial-clients")
      .then(({ data }) => setClients(data.commercialClients || []))
      .catch(() => setClients([]));
  }, []);

  const filtered = useMemo(() => stores, [stores]);
  const activeCount = filtered.filter((store) => store.status === "ACTIVE").length;

  async function toggleStatus(store: Store) {
    const next: StoreStatus = store.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      await api.put(`/backoffice/stores/${store.id}`, { status: next });
      load();
    } catch (err) {
      const parsed = parseError(err);
      setToast({ open: true, message: parsed.friend || parsed.message || "Não foi possível alterar o status." });
    }
  }

  async function saveEdit() {
    if (!editing) return;
    try {
      await api.put(`/backoffice/stores/${editing.id}`, {
        name: editing.name,
        slug: editing.slug,
        document: editing.document,
        status: editing.status,
        address: editing.address,
        city: editing.city,
        manager: editing.manager,
        commercialClientId: editing.commercialClientId || null,
      });
      setEditing(null);
      load();
    } catch (err) {
      const parsed = parseError(err);
      setToast({ open: true, message: parsed.friend || parsed.message || "Não foi possível salvar." });
    }
  }

  return (
    <PremiumStage
      title="Lojas"
      hint={`${filtered.length} vitrines · ${activeCount} ativas`}
      actions={
        <button className="br-btn br-btn-brass" type="button" onClick={() => navigate("/lojas/cadastrar")}>
          Nova loja
        </button>
      }
    >
      <section className="br-panel">
        <div className="br-toolbar">
          <label className="br-field">
            <span>Buscar</span>
            <input
              value={search}
              placeholder="Nome, slug ou cidade"
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") load(search);
              }}
            />
          </label>
          <button className="br-btn" type="button" onClick={() => load(search)}>
            Filtrar
          </button>
        </div>
      </section>

      <section className="br-panel">
        {loading ? <p className="br-empty">Carregando lojas…</p> : null}
        {!loading && filtered.length === 0 ? <p className="br-empty">Nenhuma loja nesta busca.</p> : null}
        {!loading && filtered.length > 0 ? (
          <div className="br-list">
            {filtered.map((store) => (
              <div className="br-row" key={store.id}>
                <button className="br-row-main" type="button" onClick={() => navigate(`/lojas/${store.id}`)}>
                  <strong>{store.name}</strong>
                  <small>
                    <span className="br-pip" data-on={store.status === "ACTIVE" ? "true" : "false"}>
                      {store.status === "ACTIVE" ? "Ativa" : "Inativa"}
                    </span>
                    {" · "}
                    {store.slug} · {store.city || "sem cidade"} · {store.manager || "sem responsável"}
                    {store.commercialClientName ? ` · ${store.commercialClientName}` : ""}
                  </small>
                </button>
                <div className="br-row-actions">
                  <button className="br-btn br-btn-ghost" type="button" onClick={() => setEditing({ ...store })}>
                    Editar
                  </button>
                  <button className="br-btn br-btn-ghost" type="button" onClick={() => toggleStatus(store)}>
                    {store.status === "ACTIVE" ? "Desativar" : "Ativar"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      {editing ? (
        <div className="br-dialog" role="dialog" aria-labelledby="edit-loja" aria-modal="true">
          <div className="br-dialog-card">
            <h2 id="edit-loja">Editar loja</h2>
            <div className="br-grid two">
              <label className="br-field">
                <span>Nome</span>
                <input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              </label>
              <label className="br-field">
                <span>Slug</span>
                <input value={editing.slug} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} />
              </label>
              <label className="br-field">
                <span>Documento</span>
                <input value={editing.document || ""} onChange={(e) => setEditing({ ...editing, document: e.target.value })} />
              </label>
              <label className="br-field">
                <span>Cidade</span>
                <input value={editing.city || ""} onChange={(e) => setEditing({ ...editing, city: e.target.value })} />
              </label>
            </div>
            <div className="br-grid" style={{ marginTop: 12 }}>
              <label className="br-field">
                <span>Endereço</span>
                <input value={editing.address || ""} onChange={(e) => setEditing({ ...editing, address: e.target.value })} />
              </label>
            </div>
            <div className="br-grid two" style={{ marginTop: 12 }}>
              <label className="br-field">
                <span>Responsável</span>
                <input value={editing.manager || ""} onChange={(e) => setEditing({ ...editing, manager: e.target.value })} />
              </label>
              <label className="br-field">
                <span>Cliente comercial</span>
                <select
                  value={editing.commercialClientId || ""}
                  onChange={(e) => setEditing({ ...editing, commercialClientId: e.target.value || null })}
                >
                  <option value="">Nenhum</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="br-field">
                <span>Status</span>
                <select value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value as StoreStatus })}>
                  <option value="ACTIVE">Ativa</option>
                  <option value="INACTIVE">Inativa</option>
                </select>
              </label>
            </div>
            <div className="br-actions" style={{ marginTop: 14 }}>
              <button className="br-btn" type="button" onClick={() => setEditing(null)}>
                Cancelar
              </button>
              <button className="br-btn br-btn-brass" type="button" onClick={saveEdit}>
                Salvar
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <BrToast open={toast.open} message={toast.message} onClose={() => setToast({ open: false, message: "" })} />
    </PremiumStage>
  );
}

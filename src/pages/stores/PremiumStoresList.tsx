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
  const [deleting, setDeleting] = useState<Store | null>(null);
  const [testStores, setTestStores] = useState<Store[] | null>(null);
  const [busy, setBusy] = useState(false);
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

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    try {
      await api.delete(`/backoffice/stores/${deleting.id}`);
      setToast({ open: true, message: `Loja "${deleting.name}" excluída.` });
      setDeleting(null);
      load();
    } catch (err) {
      const parsed = parseError(err);
      setToast({ open: true, message: parsed.friend || parsed.message || "Não foi possível excluir a loja." });
    } finally {
      setBusy(false);
    }
  }

  async function openTestStoresDialog() {
    try {
      const { data } = await api.get("/backoffice/stores/test-data");
      setTestStores(data.stores || []);
    } catch (err) {
      const parsed = parseError(err);
      setToast({ open: true, message: parsed.friend || parsed.message || "Não foi possível listar as lojas de teste." });
    }
  }

  async function confirmDeleteTestStores() {
    setBusy(true);
    try {
      const { data } = await api.delete("/backoffice/stores/test-data");
      setToast({ open: true, message: `${data.deletedCount} loja(s) de teste excluída(s).` });
      setTestStores(null);
      load();
    } catch (err) {
      const parsed = parseError(err);
      setToast({ open: true, message: parsed.friend || parsed.message || "Não foi possível excluir as lojas de teste." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <PremiumStage
      title="Lojas"
      hint={`${filtered.length} vitrines · ${activeCount} ativas`}
      actions={
        <>
          <button className="br-btn br-btn-ghost" type="button" onClick={openTestStoresDialog}>
            Excluir lojas de teste
          </button>
          <button className="br-btn br-btn-brass" type="button" onClick={() => navigate("/lojas/cadastrar")}>
            Nova loja
          </button>
        </>
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
                  <button className="br-btn br-btn-ghost" type="button" onClick={() => setDeleting(store)}>
                    Excluir
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
      {deleting ? (
        <div className="br-dialog" role="dialog" aria-labelledby="delete-loja" aria-modal="true">
          <div className="br-dialog-card">
            <h2 id="delete-loja">Excluir loja</h2>
            <p>
              Excluir definitivamente a loja <strong>{deleting.name}</strong>? Produtos,
              movimentações de estoque e logs também serão removidos. Esta ação não pode ser desfeita.
            </p>
            <div className="br-actions" style={{ marginTop: 14 }}>
              <button className="br-btn" type="button" onClick={() => setDeleting(null)} disabled={busy}>
                Cancelar
              </button>
              <button className="br-btn br-btn-brass" type="button" onClick={confirmDelete} disabled={busy}>
                Excluir definitivamente
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {testStores !== null ? (
        <div className="br-dialog" role="dialog" aria-labelledby="delete-test-lojas" aria-modal="true">
          <div className="br-dialog-card">
            <h2 id="delete-test-lojas">Excluir lojas de teste</h2>
            {testStores.length === 0 ? (
              <p>Nenhuma loja de teste encontrada.</p>
            ) : (
              <>
                <p>
                  As lojas abaixo foram identificadas como <strong>lojas de teste</strong> (nome com
                  &quot;teste&quot;/&quot;test&quot; ou criadas pelos seeds de demonstração) e serão
                  excluídas definitivamente, junto com produtos e movimentações:
                </p>
                <ul>
                  {testStores.map((store) => (
                    <li key={store.id}>
                      {store.name} ({store.slug})
                    </li>
                  ))}
                </ul>
                <p>Esta ação não pode ser desfeita.</p>
              </>
            )}
            <div className="br-actions" style={{ marginTop: 14 }}>
              <button className="br-btn" type="button" onClick={() => setTestStores(null)} disabled={busy}>
                Cancelar
              </button>
              {testStores.length > 0 ? (
                <button className="br-btn br-btn-brass" type="button" onClick={confirmDeleteTestStores} disabled={busy}>
                  Excluir {testStores.length} loja(s) de teste
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <BrToast open={toast.open} message={toast.message} onClose={() => setToast({ open: false, message: "" })} />
    </PremiumStage>
  );
}

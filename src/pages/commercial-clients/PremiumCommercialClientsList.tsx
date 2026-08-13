import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BrToast, PremiumStage } from "../../components/premium/PremiumStage";
import { api, parseError } from "../../services/api";
import type { CommercialClient } from "./types";

export default function PremiumCommercialClientsList() {
  const navigate = useNavigate();
  const [clients, setClients] = useState<CommercialClient[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<CommercialClient | null>(null);
  const [toast, setToast] = useState({ open: false, message: "" });

  async function load(term = search) {
    setLoading(true);
    try {
      const { data } = await api.get("/backoffice/commercial-clients", { params: term ? { search: term } : undefined });
      setClients(data.commercialClients || []);
    } catch (err) {
      const parsed = parseError(err);
      setToast({ open: true, message: parsed.friend || parsed.message || "Falha ao listar clientes comerciais." });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => clients, [clients]);
  const activeCount = filtered.filter((client) => client.active).length;

  async function toggleActive(client: CommercialClient) {
    try {
      await api.put(`/backoffice/commercial-clients/${client.id}`, { active: !client.active });
      load();
    } catch (err) {
      const parsed = parseError(err);
      setToast({ open: true, message: parsed.friend || parsed.message || "Não foi possível alterar o status." });
    }
  }

  async function saveEdit() {
    if (!editing) return;
    try {
      await api.put(`/backoffice/commercial-clients/${editing.id}`, {
        name: editing.name,
        document: editing.document,
        email: editing.email,
        phone: editing.phone,
        notes: editing.notes,
        active: editing.active,
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
      title="Clientes comerciais"
      hint={`${filtered.length} donos · ${activeCount} ativos · um cliente pode ter várias lojas`}
      actions={
        <button className="br-btn br-btn-brass" type="button" onClick={() => navigate("/clientes-comerciais/cadastrar")}>
          Novo cliente
        </button>
      }
    >
      <section className="br-panel">
        <div className="br-toolbar">
          <label className="br-field">
            <span>Buscar</span>
            <input
              value={search}
              placeholder="Nome, documento ou contato"
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
        {loading ? <p className="br-empty">Carregando clientes…</p> : null}
        {!loading && filtered.length === 0 ? <p className="br-empty">Nenhum cliente comercial nesta busca.</p> : null}
        {!loading && filtered.length > 0 ? (
          <div className="br-list">
            {filtered.map((client) => (
              <div className="br-row" key={client.id}>
                <button className="br-row-main" type="button" onClick={() => navigate(`/clientes-comerciais/${client.id}`)}>
                  <strong>{client.name}</strong>
                  <small>
                    <span className="br-pip" data-on={client.active ? "true" : "false"}>
                      {client.active ? "Ativo" : "Inativo"}
                    </span>
                    {" · "}
                    {client.document || "sem documento"} · {client.storesCount} {client.storesCount === 1 ? "loja" : "lojas"}
                  </small>
                </button>
                <div className="br-row-actions">
                  <button className="br-btn br-btn-ghost" type="button" onClick={() => setEditing({ ...client })}>
                    Editar
                  </button>
                  <button className="br-btn br-btn-ghost" type="button" onClick={() => toggleActive(client)}>
                    {client.active ? "Desativar" : "Ativar"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      {editing ? (
        <div className="br-dialog" role="dialog" aria-labelledby="edit-cliente-comercial" aria-modal="true">
          <div className="br-dialog-card">
            <h2 id="edit-cliente-comercial">Editar cliente comercial</h2>
            <div className="br-grid two">
              <label className="br-field">
                <span>Nome</span>
                <input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              </label>
              <label className="br-field">
                <span>Documento</span>
                <input value={editing.document || ""} onChange={(e) => setEditing({ ...editing, document: e.target.value })} />
              </label>
              <label className="br-field">
                <span>E-mail</span>
                <input value={editing.email || ""} onChange={(e) => setEditing({ ...editing, email: e.target.value })} />
              </label>
              <label className="br-field">
                <span>Telefone</span>
                <input value={editing.phone || ""} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} />
              </label>
            </div>
            <div className="br-grid two" style={{ marginTop: 12 }}>
              <label className="br-field">
                <span>Observações</span>
                <input value={editing.notes || ""} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} />
              </label>
              <label className="br-field">
                <span>Status</span>
                <select
                  value={editing.active ? "ACTIVE" : "INACTIVE"}
                  onChange={(e) => setEditing({ ...editing, active: e.target.value === "ACTIVE" })}
                >
                  <option value="ACTIVE">Ativo</option>
                  <option value="INACTIVE">Inativo</option>
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

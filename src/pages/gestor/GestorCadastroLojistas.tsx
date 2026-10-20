import { FormEvent, useEffect, useState } from "react";
import { Loader2, Mail, Plus, Store as StoreIcon, Trash2, UserRound, X } from "lucide-react";
import { api, parseError } from "../../services/api";
import GestaoShell from "./GestaoShell";

type LojistaStore = {
  id: string;
  name: string;
  storeCode: string | null;
  status: string;
};

type Lojista = {
  id: string;
  name: string;
  email: string;
  document: string;
  phone: string;
  username: string;
  mustChangePassword: boolean;
  priceTableId: string | null;
  priceTableName: string;
  createdAt: string | null;
  stores: LojistaStore[];
};

type PriceTable = { id: string; name: string; isDefault: boolean };

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

/**
 * Cadastro de lojistas (Gestão).
 * Cria a CONTA do lojista (login do PDV): Nome, CPF/CNPJ, E-mail, Telefone.
 * A senha é gerada automaticamente, enviada por e-mail e trocada no primeiro acesso.
 * Fluxo: 1 lojista → várias lojas (vincule lojas existentes aqui ou depois).
 */
export default function GestorCadastroLojistas() {
  const [lojistas, setLojistas] = useState<Lojista[]>([]);
  const [availableStores, setAvailableStores] = useState<LojistaStore[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [tables, setTables] = useState<PriceTable[]>([]);
  const [form, setForm] = useState({ name: "", document: "", email: "", phone: "", priceTableId: "" });
  const [selectedStoreIds, setSelectedStoreIds] = useState<string[]>([]);
  const [created, setCreated] = useState<{
    lojista: Lojista | null;
    generatedPassword: string;
    emailSent: boolean;
    resent?: boolean;
  } | null>(null);
  const [resendingId, setResendingId] = useState("");
  const [linking, setLinking] = useState<{ lojista: Lojista; storeIds: string[] } | null>(null);
  const [deleting, setDeleting] = useState<Lojista | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [tableChange, setTableChange] = useState<{ lojista: Lojista; priceTableId: string } | null>(null);
  const [savingTable, setSavingTable] = useState(false);

  async function load() {
    setIsLoading(true);
    try {
      const [{ data }, tablesRes] = await Promise.all([
        api.get("/backoffice/lojistas"),
        api.get("/backoffice/price-tables"),
      ]);
      const loaded = (tablesRes.data.tables || []) as PriceTable[];
      setTables(loaded);
      setForm((current) => ({
        ...current,
        priceTableId: current.priceTableId || loaded.find((item) => item.isDefault)?.id || loaded[0]?.id || "",
      }));
      setLojistas(data.lojistas || []);
      setAvailableStores(data.availableStores || []);
      setError("");
    } catch (err) {
      const parsed = parseError(err);
      setError(parsed.friend || parsed.message || "Não foi possível carregar os lojistas.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function toggleStore(id: string) {
    setSelectedStoreIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      const { data } = await api.post("/backoffice/lojistas", {
        name: form.name.trim(),
        document: form.document.replace(/\D/g, ""),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        storeIds: selectedStoreIds.length > 0 ? selectedStoreIds : undefined,
        priceTableId: form.priceTableId || undefined,
      });
      setCreated({
        lojista: data.lojista,
        generatedPassword: data.generatedPassword,
        emailSent: Boolean(data.emailSent),
      });
      setForm({ name: "", document: "", email: "", phone: "", priceTableId: tables.find((item) => item.isDefault)?.id || "" });
      await load();
    } catch (err) {
      const parsed = parseError(err);
      setError(parsed.friend || parsed.message || "Não foi possível cadastrar o lojista.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function askTableChange(lojista: Lojista, priceTableId: string) {
    const currentId = lojista.priceTableId || tables.find((item) => item.isDefault)?.id || "";
    if (!priceTableId || priceTableId === currentId) return;
    setTableChange({ lojista, priceTableId });
  }

  async function confirmTableChange() {
    if (!tableChange) return;
    const { lojista, priceTableId } = tableChange;
    setSavingTable(true);
    setError("");
    try {
      await api.put(`/backoffice/lojistas/${lojista.id}/price-table`, { priceTableId });
      const table = tables.find((item) => item.id === priceTableId);
      setLojistas((current) =>
        current.map((item) =>
          item.id === lojista.id
            ? {
                ...item,
                priceTableId: table?.isDefault ? null : priceTableId,
                priceTableName: table?.name || "Padrão",
              }
            : item,
        ),
      );
      setTableChange(null);
    } catch (err) {
      const parsed = parseError(err);
      setError(parsed.friend || parsed.message || "Não foi possível trocar a tabela.");
    } finally {
      setSavingTable(false);
    }
  }

  async function handleResend(lojista: Lojista) {
    setError("");
    setResendingId(lojista.id);
    try {
      const { data } = await api.post(`/backoffice/lojistas/${lojista.id}/reenviar-senha`);
      setCreated({
        lojista,
        generatedPassword: data.generatedPassword,
        emailSent: Boolean(data.emailSent),
        resent: true,
      });
      await load();
    } catch (err) {
      const parsed = parseError(err);
      setError(parsed.friend || parsed.message || "Não foi possível reenviar a senha.");
    } finally {
      setResendingId("");
    }
  }

  async function handleDeleteLojista() {
    if (!deleting) return;
    setIsDeleting(true);
    try {
      const { data } = await api.delete(`/backoffice/lojistas/${deleting.id}`);
      setLojistas(data.lojistas || []);
      setAvailableStores(data.availableStores || []);
      setDeleting(null);
      setError("");
    } catch (err) {
      const parsed = parseError(err);
      setError(parsed.friend || parsed.message || "Não foi possível excluir o lojista.");
      setDeleting(null);
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleLinkStores() {
    if (!linking || linking.storeIds.length === 0) return;
    setIsSubmitting(true);
    try {
      await api.put(`/backoffice/lojistas/${linking.lojista.id}/stores`, {
        storeIds: linking.storeIds,
      });
      setLinking(null);
      await load();
    } catch (err) {
      const parsed = parseError(err);
      setError(parsed.friend || parsed.message || "Não foi possível vincular as lojas.");
    } finally {
      setIsSubmitting(false);
    }
  }


  return (
    <GestaoShell
      title="Cadastrar lojista"
      subtitle="Conta de acesso do lojista ao PDV. Senha gerada automaticamente, enviada por e-mail e trocada no primeiro acesso."
      badge="Fluxo: 1 lojista → várias lojas"
    >
      <div className="pdv-lojistas-page">
        {error ? (
          <div className="pdv-loj-alert" role="alert">
            {error}
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-2">
          <form className="pdv-loj-card" onSubmit={handleSubmit}>
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
              <UserRound size={18} aria-hidden />
              Novo lojista
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="pdv-loj-field sm:col-span-2">
                Nome *
                <input
                  className="mt-1 w-full px-3"
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  required
                  minLength={2}
                />
              </label>
              <label className="pdv-loj-field">
                CPF/CNPJ *
                <input
                  className="mt-1 w-full px-3"
                  value={form.document}
                  onChange={(event) => setForm({ ...form, document: formatCpfCnpj(event.target.value) })}
                  inputMode="numeric"
                  required
                />
              </label>
              <label className="pdv-loj-field">
                Telefone
                <input
                  className="mt-1 w-full px-3"
                  value={form.phone}
                  onChange={(event) => setForm({ ...form, phone: formatPhone(event.target.value) })}
                  inputMode="tel"
                />
              </label>
              <label className="pdv-loj-field sm:col-span-2">
                Tabela de preço
                <select
                  className="mt-1 w-full px-3"
                  value={form.priceTableId}
                  onChange={(event) => setForm({ ...form, priceTableId: event.target.value })}
                >
                  {tables.map((table) => (
                    <option key={table.id} value={table.id}>{table.name}</option>
                  ))}
                </select>
              </label>
              <label className="pdv-loj-field sm:col-span-2">
                E-mail *
                <input
                  className="mt-1 w-full px-3"
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm({ ...form, email: event.target.value })}
                  required
                />
              </label>
            </div>

            <div className="mt-4">
              <p className="text-sm font-semibold">Lojas para vincular agora (opcional)</p>
              <p className="pdv-loj-hint">
                Só aparecem lojas ainda sem lojista. Dá para vincular mais lojas depois.
              </p>
              {availableStores.length === 0 ? (
                <p className="pdv-loj-hint">Nenhuma loja disponível para vínculo.</p>
              ) : (
                <div className="pdv-loj-scroll">
                  {availableStores.map((store) => (
                    <label key={store.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selectedStoreIds.includes(store.id)}
                        onChange={() => toggleStore(store.id)}
                      />
                      {store.storeCode ? `${store.storeCode} — ` : ""}
                      {store.name}
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="pdv-loj-note">
              A senha é gerada automaticamente e enviada para o e-mail informado, junto com o
              link do painel. No primeiro acesso o lojista precisa trocar a senha.
            </div>

            <button className="pdv-loj-btn pdv-loj-btn-ink mt-4" type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <Plus size={16} aria-hidden />}
              Cadastrar lojista
            </button>
          </form>

          <section className="pdv-loj-card">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
              <StoreIcon size={18} aria-hidden />
              Lojistas e suas lojas
            </h2>
            {isLoading ? (
              <p className="flex items-center gap-2">
                <Loader2 size={16} className="animate-spin" aria-hidden /> Carregando...
              </p>
            ) : lojistas.length === 0 ? (
              <p>Nenhum lojista cadastrado ainda.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {lojistas.map((lojista) => (
                  <li key={lojista.id} className="pdv-loj-row">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold">{lojista.name}</p>
                        <p className="text-sm">
                          {lojista.email}
                          {lojista.phone ? ` · ${lojista.phone}` : ""}
                        </p>
                        <p className="pdv-loj-hint">
                          Doc.: {formatCpfCnpj(lojista.document)}
                          {lojista.mustChangePassword ? " · aguardando 1º acesso" : ""}
                        </p>
                        <label className="pdv-loj-field mt-2">
                          Tabela de preço
                          <select
                            className="mt-1 w-full max-w-xs px-3"
                            value={lojista.priceTableId || tables.find((item) => item.isDefault)?.id || ""}
                            onChange={(event) => askTableChange(lojista, event.target.value)}
                          >
                            {tables.map((table) => (
                              <option key={table.id} value={table.id}>{table.name}</option>
                            ))}
                          </select>
                        </label>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        <button
                          className="pdv-loj-btn"
                          type="button"
                          onClick={() => setLinking({ lojista, storeIds: [] })}
                          disabled={availableStores.length === 0}
                          title={availableStores.length === 0 ? "Nenhuma loja disponível" : "Vincular lojas"}
                        >
                          + Vincular loja
                        </button>
                        <button
                          className="pdv-loj-btn"
                          type="button"
                          onClick={() => handleResend(lojista)}
                          disabled={resendingId === lojista.id}
                          title="Gerar outra senha provisória e enviar por e-mail"
                        >
                          {resendingId === lojista.id ? <Loader2 size={12} className="animate-spin" aria-hidden /> : <Mail size={12} aria-hidden />}
                          Reenviar senha
                        </button>
                        <button
                          className="pdv-loj-btn pdv-loj-btn-danger"
                          type="button"
                          onClick={() => setDeleting(lojista)}
                          title="Excluir lojista"
                        >
                          <Trash2 size={12} aria-hidden />
                          Excluir
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {lojista.stores.length === 0 ? (
                        <span className="pdv-loj-hint">Sem lojas vinculadas.</span>
                      ) : (
                        lojista.stores.map((store) => (
                          <span key={store.id} className="pdv-loj-chip">
                            {store.storeCode ? `${store.storeCode} — ` : ""}
                            {store.name}
                          </span>
                        ))
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {created ? (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            role="dialog"
            aria-labelledby="lojista-created-title"
          >
            <div className="pdv-loj-modal">
              <h2 id="lojista-created-title" className="mb-2 text-lg font-bold">
                {created.resent ? "Senha reenviada" : "Lojista cadastrado"}
              </h2>
              <p className="text-sm">
                {created.emailSent
                  ? "A senha provisória foi enviada por e-mail. Guarde uma cópia se precisar:"
                  : "Não foi possível enviar o e-mail automaticamente. Repasse a senha provisória ao lojista:"}
              </p>
              <p className="pdv-loj-secret">{created.generatedPassword}</p>
              <p className="pdv-loj-hint">No próximo acesso ao PDV será exigida a troca da senha.</p>
              <div className="mt-4 flex justify-end">
                <button className="pdv-loj-btn pdv-loj-btn-ink" type="button" onClick={() => setCreated(null)}>
                  Entendi
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {tableChange ? (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            role="dialog"
            aria-labelledby="lojista-table-title"
          >
            <div className="pdv-loj-modal">
              <h2 id="lojista-table-title" className="mb-2 text-lg font-bold">
                Trocar tabela de preço
              </h2>
              <p className="text-sm">
                Trocar a tabela de <strong>{tableChange.lojista.name}</strong> de{" "}
                <strong>{tableChange.lojista.priceTableName || "Padrão"}</strong> para{" "}
                <strong>{tables.find((item) => item.id === tableChange.priceTableId)?.name || "a nova tabela"}</strong>?
                O preço de venda desse lojista só muda depois de confirmar.
              </p>
              <div className="mt-4 flex justify-end gap-2">
                <button className="pdv-loj-btn" type="button" onClick={() => setTableChange(null)} disabled={savingTable}>
                  Cancelar
                </button>
                <button className="pdv-loj-btn pdv-loj-btn-ink" type="button" onClick={confirmTableChange} disabled={savingTable}>
                  {savingTable ? <Loader2 size={16} className="animate-spin" aria-hidden /> : null}
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {deleting ? (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            role="dialog"
            aria-labelledby="lojista-delete-title"
          >
            <div className="pdv-loj-modal">
              <h2 id="lojista-delete-title" className="mb-2 text-lg font-bold">
                Excluir lojista
              </h2>
              <p className="text-sm">
                Excluir <strong>{deleting.name}</strong> ({deleting.email})? A conta de login do
                PDV será removida definitivamente.
              </p>
              {deleting.stores.length > 0 ? (
                <p className="pdv-loj-note mt-2">
                  As {deleting.stores.length} loja(s) vinculada(s) não serão apagadas — ficarão sem
                  lojista e disponíveis para novo vínculo.
                </p>
              ) : null}
              <div className="mt-4 flex justify-end gap-2">
                <button className="pdv-loj-btn" type="button" onClick={() => setDeleting(null)} disabled={isDeleting}>
                  Cancelar
                </button>
                <button
                  className="pdv-loj-btn pdv-loj-btn-danger"
                  type="button"
                  onClick={handleDeleteLojista}
                  disabled={isDeleting}
                >
                  {isDeleting ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <Trash2 size={16} aria-hidden />}
                  Excluir lojista
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {linking ? (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            role="dialog"
            aria-labelledby="lojista-link-title"
          >
            <div className="pdv-loj-modal">
              <div className="mb-2 flex items-center justify-between">
                <h2 id="lojista-link-title" className="text-lg font-bold">
                  Vincular lojas — {linking.lojista.name}
                </h2>
                <button className="pdv-loj-btn pdv-loj-btn-icon" type="button" aria-label="Fechar" onClick={() => setLinking(null)}>
                  <X size={16} aria-hidden />
                </button>
              </div>
              <div className="pdv-loj-scroll">
                {availableStores.map((store) => (
                  <label key={store.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={linking.storeIds.includes(store.id)}
                      onChange={() =>
                        setLinking((current) =>
                          current
                            ? {
                                ...current,
                                storeIds: current.storeIds.includes(store.id)
                                  ? current.storeIds.filter((id) => id !== store.id)
                                  : [...current.storeIds, store.id],
                              }
                            : current,
                        )
                      }
                    />
                    {store.storeCode ? `${store.storeCode} — ` : ""}
                    {store.name}
                  </label>
                ))}
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button className="pdv-loj-btn" type="button" onClick={() => setLinking(null)}>
                  Cancelar
                </button>
                <button
                  className="pdv-loj-btn pdv-loj-btn-ink"
                  type="button"
                  onClick={handleLinkStores}
                  disabled={isSubmitting || linking.storeIds.length === 0}
                >
                  Vincular
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </GestaoShell>
  );
}
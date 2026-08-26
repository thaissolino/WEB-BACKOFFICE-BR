import { FormEvent, useEffect, useState } from "react";
import { Loader2, Mail, Plus, Store as StoreIcon, UserRound, X } from "lucide-react";
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
  createdAt: string | null;
  stores: LojistaStore[];
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
  const [form, setForm] = useState({ name: "", document: "", email: "", phone: "" });
  const [selectedStoreIds, setSelectedStoreIds] = useState<string[]>([]);
  const [created, setCreated] = useState<{
    lojista: Lojista | null;
    generatedPassword: string;
    emailSent: boolean;
  } | null>(null);
  const [linking, setLinking] = useState<{ lojista: Lojista; storeIds: string[] } | null>(null);

  async function load() {
    setIsLoading(true);
    try {
      const { data } = await api.get("/backoffice/lojistas");
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
      });
      setCreated({
        lojista: data.lojista,
        generatedPassword: data.generatedPassword,
        emailSent: Boolean(data.emailSent),
      });
      setForm({ name: "", document: "", email: "", phone: "" });
      setSelectedStoreIds([]);
      await load();
    } catch (err) {
      const parsed = parseError(err);
      setError(parsed.friend || parsed.message || "Não foi possível cadastrar o lojista.");
    } finally {
      setIsSubmitting(false);
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
      title="Cadastro lojistas"
      subtitle="Conta de acesso do lojista ao PDV. Senha gerada automaticamente, enviada por e-mail e trocada no primeiro acesso."
      badge="Fluxo: 1 lojista → várias lojas"
    >
      {error ? (
        <div className="mb-4 rounded border border-red-300 bg-red-50 px-4 py-3 text-red-700" role="alert">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Formulário */}
        <form className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm" onSubmit={handleSubmit}>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-800">
            <UserRound size={20} className="text-blue-600" aria-hidden />
            Novo lojista
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-gray-700 sm:col-span-2">
              Nome *
              <input
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                required
                minLength={2}
              />
            </label>
            <label className="block text-sm font-medium text-gray-700">
              CPF/CNPJ *
              <input
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
                value={form.document}
                onChange={(event) => setForm({ ...form, document: formatCpfCnpj(event.target.value) })}
                inputMode="numeric"
                required
              />
            </label>
            <label className="block text-sm font-medium text-gray-700">
              Telefone
              <input
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
                value={form.phone}
                onChange={(event) => setForm({ ...form, phone: formatPhone(event.target.value) })}
                inputMode="tel"
              />
            </label>
            <label className="block text-sm font-medium text-gray-700 sm:col-span-2">
              E-mail *
              <input
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
                type="email"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                required
              />
            </label>
          </div>

          <div className="mt-4">
            <p className="text-sm font-medium text-gray-700">
              Lojas para vincular agora (opcional)
            </p>
            <p className="mb-2 text-xs text-gray-500">
              Só aparecem lojas ainda sem lojista. Dá para vincular mais lojas depois.
            </p>
            {availableStores.length === 0 ? (
              <p className="text-sm text-gray-500">Nenhuma loja disponível para vínculo.</p>
            ) : (
              <div className="flex max-h-40 flex-col gap-1 overflow-auto rounded border border-gray-200 p-2">
                {availableStores.map((store) => (
                  <label key={store.id} className="flex items-center gap-2 text-sm text-gray-700">
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

          <div className="mt-4 rounded border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-800">
            <Mail size={14} className="mr-1 inline" aria-hidden />
            A senha é gerada automaticamente e enviada para o e-mail informado. No primeiro
            acesso ao PDV o lojista precisa trocar a senha.
          </div>

          <button
            className="mt-4 flex items-center gap-2 rounded bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <Plus size={16} aria-hidden />}
            Cadastrar lojista
          </button>
        </form>

        {/* Lista */}
        <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-800">
            <StoreIcon size={20} className="text-blue-600" aria-hidden />
            Lojistas e suas lojas
          </h2>
          {isLoading ? (
            <p className="flex items-center gap-2 text-gray-500">
              <Loader2 size={16} className="animate-spin" aria-hidden /> Carregando...
            </p>
          ) : lojistas.length === 0 ? (
            <p className="text-gray-500">Nenhum lojista cadastrado ainda.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {lojistas.map((lojista) => (
                <li key={lojista.id} className="rounded border border-gray-200 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-gray-800">{lojista.name}</p>
                      <p className="text-sm text-gray-600">
                        {lojista.email}
                        {lojista.phone ? ` · ${lojista.phone}` : ""}
                      </p>
                      <p className="text-xs text-gray-500">
                        Doc.: {formatCpfCnpj(lojista.document)}
                        {lojista.mustChangePassword ? " · aguardando 1º acesso" : ""}
                      </p>
                    </div>
                    <button
                      className="rounded border border-gray-300 px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                      type="button"
                      onClick={() => setLinking({ lojista, storeIds: [] })}
                      disabled={availableStores.length === 0}
                      title={availableStores.length === 0 ? "Nenhuma loja disponível" : "Vincular lojas"}
                    >
                      + Vincular loja
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {lojista.stores.length === 0 ? (
                      <span className="text-xs text-gray-500">Sem lojas vinculadas.</span>
                    ) : (
                      lojista.stores.map((store) => (
                        <span
                          key={store.id}
                          className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs text-gray-700"
                        >
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

      {/* Modal: senha gerada */}
      {created ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-labelledby="lojista-created-title"
        >
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 id="lojista-created-title" className="mb-2 text-lg font-bold text-gray-800">
              Lojista cadastrado
            </h2>
            <p className="text-sm text-gray-600">
              {created.emailSent
                ? "A senha provisória foi enviada por e-mail. Guarde uma cópia se precisar:"
                : "Não foi possível enviar o e-mail automaticamente. Repasse a senha provisória ao lojista:"}
            </p>
            <p className="my-3 rounded border border-gray-200 bg-gray-50 px-4 py-3 text-center font-mono text-xl font-bold text-gray-900">
              {created.generatedPassword}
            </p>
            <p className="text-xs text-gray-500">
              No primeiro acesso ao PDV será exigida a troca da senha.
            </p>
            <div className="mt-4 flex justify-end">
              <button
                className="rounded bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
                type="button"
                onClick={() => setCreated(null)}
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Modal: vincular lojas */}
      {linking ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-labelledby="lojista-link-title"
        >
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-2 flex items-center justify-between">
              <h2 id="lojista-link-title" className="text-lg font-bold text-gray-800">
                Vincular lojas — {linking.lojista.name}
              </h2>
              <button type="button" aria-label="Fechar" onClick={() => setLinking(null)}>
                <X size={18} aria-hidden />
              </button>
            </div>
            <div className="flex max-h-56 flex-col gap-1 overflow-auto rounded border border-gray-200 p-2">
              {availableStores.map((store) => (
                <label key={store.id} className="flex items-center gap-2 text-sm text-gray-700">
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
              <button
                className="rounded border border-gray-300 px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50"
                type="button"
                onClick={() => setLinking(null)}
              >
                Cancelar
              </button>
              <button
                className="rounded bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
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
    </GestaoShell>
  );
}

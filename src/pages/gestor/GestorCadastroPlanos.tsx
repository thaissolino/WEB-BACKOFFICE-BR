import { FormEvent, useEffect, useState } from "react";
import { Loader2, Plus, Trash2, X } from "lucide-react";
import { api, parseError } from "../../services/api";
import GestaoShell from "./GestaoShell";

type Plano = {
  id: string;
  name: string;
  description: string | null;
  priceMonthly: number;
  billingCycle: "MONTHLY" | "YEARLY";
  maxStores: number | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

function formatMoney(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * Cadastro de planos para lojistas (mensalidade / pacote do PDV).
 */
export default function GestorCadastroPlanos() {
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<Plano | null>(null);
  const [deleting, setDeleting] = useState<Plano | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    priceMonthly: "",
    billingCycle: "MONTHLY" as "MONTHLY" | "YEARLY",
    maxStores: "",
    active: true,
  });

  async function load() {
    setIsLoading(true);
    try {
      const { data } = await api.get("/backoffice/planos");
      setPlanos(data.planos || []);
      setError("");
    } catch (err) {
      const parsed = parseError(err);
      setError(parsed.friend || parsed.message || "Não foi possível carregar os planos.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function resetForm() {
    setForm({
      name: "",
      description: "",
      priceMonthly: "",
      billingCycle: "MONTHLY",
      maxStores: "",
      active: true,
    });
    setEditing(null);
  }

  function startEdit(plano: Plano) {
    setEditing(plano);
    setForm({
      name: plano.name,
      description: plano.description || "",
      priceMonthly: String(plano.priceMonthly ?? ""),
      billingCycle: plano.billingCycle || "MONTHLY",
      maxStores: plano.maxStores === null || plano.maxStores === undefined ? "" : String(plano.maxStores),
      active: plano.active,
    });
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      priceMonthly: Number(String(form.priceMonthly).replace(",", ".")) || 0,
      billingCycle: form.billingCycle,
      maxStores: form.maxStores.trim() === "" ? null : Number(form.maxStores),
      active: form.active,
    };
    try {
      if (editing) {
        await api.put(`/backoffice/planos/${editing.id}`, payload);
      } else {
        await api.post("/backoffice/planos", payload);
      }
      resetForm();
      await load();
    } catch (err) {
      const parsed = parseError(err);
      setError(parsed.friend || parsed.message || "Não foi possível salvar o plano.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    setIsSubmitting(true);
    try {
      await api.delete(`/backoffice/planos/${deleting.id}`);
      setDeleting(null);
      if (editing?.id === deleting.id) resetForm();
      await load();
    } catch (err) {
      const parsed = parseError(err);
      setError(parsed.friend || parsed.message || "Não foi possível excluir o plano.");
      setDeleting(null);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <GestaoShell
      title="Cadastro planos"
      subtitle="Planos oferecidos aos lojistas (mensalidade / pacote do PDV)."
      badge="Plano → lojista"
    >
      {error ? (
        <div className="mb-4 rounded border border-red-300 bg-red-50 px-4 py-3 text-red-700" role="alert">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <form className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm" onSubmit={handleSubmit}>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-800">
            <Plus size={20} className="text-blue-600" aria-hidden />
            {editing ? "Editar plano" : "Novo plano"}
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
                placeholder="Ex.: Básico, Pro, Enterprise"
              />
            </label>
            <label className="block text-sm font-medium text-gray-700 sm:col-span-2">
              Descrição
              <textarea
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
                rows={3}
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
              />
            </label>
            <label className="block text-sm font-medium text-gray-700">
              Valor mensal (R$)
              <input
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
                value={form.priceMonthly}
                onChange={(event) => setForm({ ...form, priceMonthly: event.target.value })}
                inputMode="decimal"
                placeholder="0,00"
              />
            </label>
            <label className="block text-sm font-medium text-gray-700">
              Ciclo
              <select
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
                value={form.billingCycle}
                onChange={(event) =>
                  setForm({ ...form, billingCycle: event.target.value as "MONTHLY" | "YEARLY" })
                }
              >
                <option value="MONTHLY">Mensal</option>
                <option value="YEARLY">Anual</option>
              </select>
            </label>
            <label className="block text-sm font-medium text-gray-700">
              Máx. lojas (opcional)
              <input
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
                value={form.maxStores}
                onChange={(event) => setForm({ ...form, maxStores: event.target.value })}
                inputMode="numeric"
                placeholder="Sem limite"
              />
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 self-end pb-2">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(event) => setForm({ ...form, active: event.target.checked })}
              />
              Plano ativo
            </label>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : null}
              {editing ? "Salvar alterações" : "Cadastrar plano"}
            </button>
            {editing ? (
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex items-center gap-2 rounded border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                <X size={16} />
                Cancelar
              </button>
            ) : null}
          </div>
        </form>

        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-gray-800">Planos cadastrados</h2>
          {isLoading ? (
            <p className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 size={16} className="animate-spin" /> Carregando...
            </p>
          ) : planos.length === 0 ? (
            <p className="text-sm text-gray-500">Nenhum plano cadastrado ainda.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {planos.map((plano) => (
                <li key={plano.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                  <div>
                    <p className="font-semibold text-gray-800">
                      {plano.name}
                      {!plano.active ? (
                        <span className="ml-2 text-xs font-medium text-gray-500">(inativo)</span>
                      ) : null}
                    </p>
                    <p className="text-sm text-gray-600">
                      {formatMoney(plano.priceMonthly)} ·{" "}
                      {plano.billingCycle === "YEARLY" ? "Anual" : "Mensal"}
                      {plano.maxStores != null ? ` · até ${plano.maxStores} loja(s)` : ""}
                    </p>
                    {plano.description ? (
                      <p className="mt-1 text-xs text-gray-500">{plano.description}</p>
                    ) : null}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="rounded border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                      onClick={() => startEdit(plano)}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded border border-red-200 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-50"
                      onClick={() => setDeleting(plano)}
                    >
                      <Trash2 size={12} />
                      Excluir
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {deleting ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
            <h3 className="text-lg font-bold text-gray-800">Excluir plano?</h3>
            <p className="mt-2 text-sm text-gray-600">
              O plano <strong>{deleting.name}</strong> será removido.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded border border-gray-300 px-4 py-2 text-sm font-semibold"
                onClick={() => setDeleting(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                className="rounded bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                onClick={handleDelete}
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </GestaoShell>
  );
}

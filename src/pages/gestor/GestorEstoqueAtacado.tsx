import { FormEvent, useEffect, useState } from "react";
import { Loader2, Package, Search } from "lucide-react";
import { api, parseError } from "../../services/api";
import GestaoShell from "./GestaoShell";

type AtacadoItem = {
  productId: string;
  name: string;
  code: string;
  quantity: number;
  active: boolean;
};

type Summary = {
  products: number;
  units: number;
};

/**
 * Estoque atacado único: soma de tudo que foi confirmado no recebimento
 * (Relatórios / invoices), incluindo o histórico já confirmado.
 */
export default function GestorEstoqueAtacado() {
  const [items, setItems] = useState<AtacadoItem[]>([]);
  const [summary, setSummary] = useState<Summary>({ products: 0, units: 0 });
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function load(term = search) {
    setIsLoading(true);
    try {
      const { data } = await api.get("/backoffice/estoque-atacado", {
        params: term.trim() ? { search: term.trim() } : undefined,
      });
      setItems(data.items || []);
      setSummary(data.summary || { products: 0, units: 0 });
      setError("");
    } catch (err) {
      const parsed = parseError(err);
      setError(parsed.friend || parsed.message || "Não foi possível carregar o estoque atacado.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSearch(event: FormEvent) {
    event.preventDefault();
    load(search);
  }

  return (
    <GestaoShell
      title="Estoque atacado"
      subtitle="Estoque único do Atacadão: tudo que foi confirmado como recebido nos Relatórios das invoices."
      badge="Entrada automática no recebimento"
    >
      {error ? (
        <div className="mb-4 rounded border border-red-300 bg-red-50 px-4 py-3 text-red-700" role="alert">
          {error}
        </div>
      ) : null}

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Produtos com estoque</p>
          <p className="mt-1 text-2xl font-bold text-blue-900">{summary.products}</p>
        </div>
        <div className="rounded-lg border border-green-100 bg-green-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-green-700">Unidades confirmadas</p>
          <p className="mt-1 text-2xl font-bold text-green-900">
            {summary.units.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      <form onSubmit={handleSearch} className="mb-4 flex flex-wrap gap-2">
        <label className="relative min-w-[220px] flex-1">
          <span className="sr-only">Buscar produto</span>
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="w-full rounded border border-gray-300 py-2 pl-9 pr-3"
            placeholder="Buscar por nome ou código"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <button
          type="submit"
          className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Buscar
        </button>
        <button
          type="button"
          onClick={() => {
            setSearch("");
            load("");
          }}
          className="rounded border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          Limpar
        </button>
      </form>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        {isLoading ? (
          <p className="flex items-center gap-2 p-6 text-sm text-gray-500">
            <Loader2 size={16} className="animate-spin" /> Carregando estoque...
          </p>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Package size={32} className="mx-auto mb-2 opacity-50" />
            <p className="font-medium">Nenhum produto no estoque atacado ainda.</p>
            <p className="mt-1 text-sm">
              Confirme recebimentos em Relatórios (Gerenciar Invoices) para alimentar este estoque.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-600">
                <tr>
                  <th className="px-4 py-3 font-semibold">Código</th>
                  <th className="px-4 py-3 font-semibold">Produto</th>
                  <th className="px-4 py-3 font-semibold text-right">Quantidade</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item) => (
                  <tr key={item.productId} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-gray-700">{item.code}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{item.name}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">
                      {item.quantity.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3">
                      {item.active ? (
                        <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-700">
                          Ativo
                        </span>
                      ) : (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">
                          Inativo
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </GestaoShell>
  );
}

import { useEffect, useMemo, useState } from "react";
import { api } from "../../services/api";

type CatalogProduct = {
  id: string;
  name: string;
  code: string;
  active: boolean;
  photoFileId: string | null;
};

function ProductThumb({ productId, photoFileId }: { productId: string; photoFileId: string | null }) {
  const [src, setSrc] = useState("");

  useEffect(() => {
    if (!photoFileId) {
      setSrc("");
      return;
    }
    let url = "";
    let cancelled = false;
    api
      .get(`/clients/products/${productId}/photo`, { responseType: "blob" })
      .then(({ data }) => {
        if (cancelled || !(data instanceof Blob) || data.size < 16) return;
        url = URL.createObjectURL(data);
        setSrc(url);
      })
      .catch(() => {
        if (!cancelled) setSrc("");
      });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [productId, photoFileId]);

  if (!src) {
    return (
      <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 text-[11px] text-gray-400">
        Sem foto
      </div>
    );
  }

  return <img src={src} alt="" className="h-16 w-16 rounded-lg border border-gray-200 object-cover" />;
}

export default function CatalogoProdutos() {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [busyId, setBusyId] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/clients/products", {
        params: { ativo: showInactive ? "0" : "1" },
      });
      setProducts((data.products as CatalogProduct[]) ?? []);
    } catch {
      setProducts([]);
      setError("Não foi possível carregar o catálogo.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [showInactive]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? products.filter((item) => `${item.name} ${item.code}`.toLowerCase().includes(q))
      : products;
    return [...list].sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }));
  }, [products, search]);

  async function onPickFile(product: CatalogProduct, file: File | undefined) {
    if (!file) return;
    setBusyId(product.id);
    setError("");
    try {
      const body = new FormData();
      body.append("file", file);
      const { data } = await api.post(`/clients/products/${product.id}/photo`, body);
      const nextId = data?.product?.photoFileId as string | undefined;
      setProducts((current) =>
        current.map((item) =>
          item.id === product.id ? { ...item, photoFileId: nextId || item.photoFileId } : item,
        ),
      );
    } catch {
      setError("Não foi possível salvar a imagem.");
    } finally {
      setBusyId("");
    }
  }

  async function onDeletePhoto(product: CatalogProduct) {
    setBusyId(product.id);
    setError("");
    try {
      await api.delete(`/clients/products/${product.id}/photo`);
      setProducts((current) =>
        current.map((item) => (item.id === product.id ? { ...item, photoFileId: null } : item)),
      );
    } catch {
      setError("Não foi possível apagar a imagem.");
    } finally {
      setBusyId("");
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por nome ou código"
          className="w-full max-w-md rounded-xl border border-gray-200 px-3 py-2 text-sm"
        />
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(event) => setShowInactive(event.target.checked)}
          />
          Ver desativados
        </label>
        <span className="text-sm text-gray-500">{visible.length} produto(s)</span>
      </div>

      {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}
      {loading ? <p className="text-sm text-gray-500">Carregando catálogo…</p> : null}

      {!loading && visible.length === 0 ? (
        <p className="text-sm text-gray-500">Nenhum produto nesta lista.</p>
      ) : null}

      {!loading && visible.length > 0 ? (
        <div className="overflow-x-auto rounded-2xl border border-gray-100">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Foto</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Nome</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Código</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Imagem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {visible.map((product) => (
                <tr key={product.id}>
                  <td className="px-4 py-3">
                    <ProductThumb productId={product.id} photoFileId={product.photoFileId} />
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{product.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{product.code}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <label className="cursor-pointer rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700">
                        {product.photoFileId ? "Alterar" : "Adicionar"}
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/gif"
                          className="hidden"
                          disabled={busyId === product.id}
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            event.target.value = "";
                            onPickFile(product, file);
                          }}
                        />
                      </label>
                      {product.photoFileId ? (
                        <button
                          type="button"
                          onClick={() => onDeletePhoto(product)}
                          disabled={busyId === product.id}
                          className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
                        >
                          Apagar
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

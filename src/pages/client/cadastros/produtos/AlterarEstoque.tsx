import { ChangeEvent, FormEvent, Fragment, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronRight, ImagePlus, Plus, RefreshCw, Search, X } from "lucide-react";
import { api, parseError } from "../../../../services/api";
import CadastroShell from "../CadastroShell";
import { formatMoneyBr, parseMoneyBr, type PdvProduct, type PdvProductCategory } from "./types";

export default function AlterarEstoque() {
  const { categoryId } = useParams();
  if (categoryId) return <EstoqueProdutos categoryId={categoryId} />;
  return <EstoqueCategorias />;
}

function EstoqueCategorias() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<PdvProductCategory[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const allSelected = rows.length > 0 && rows.every((item) => selected[item.id]);

  function load() {
    setLoading(true);
    api
      .get("/clients/products/categories")
      .then(({ data }) => {
        setRows((data.categories as PdvProductCategory[]) ?? []);
        setError("");
      })
      .catch((err) => {
        const parsed = parseError(err);
        setError(parsed.friend || parsed.message || "Não foi possível carregar as categorias.");
        setRows([]);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  function toggleAll(checked: boolean) {
    const next: Record<string, boolean> = {};
    rows.forEach((item) => {
      next[item.id] = checked;
    });
    setSelected(next);
  }

  return (
    <CadastroShell>
      <section className="pdv-cad-page" aria-labelledby="pdv-est-title">
        <div className="pdv-cad-sheet">
          <h1 id="pdv-est-title">ALTERAR ESTOQUE</h1>
          {error ? <p className="pdv-cad-error">{error}</p> : null}
          {loading ? <p className="pdv-cad-kicker">Carregando…</p> : null}
          {!loading && rows.length === 0 ? (
            <p className="pdv-cad-kicker">Nenhum produto para alterar estoque.</p>
          ) : null}
          <div className="pdv-cad-table-wrap">
            <table className="pdv-cad-table">
              <thead>
                <tr>
                  <th>Produtos</th>
                  <th>Nome</th>
                  <th>Atualizar</th>
                  <th>
                    Inativar
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={(event) => toggleAll(event.target.checked)}
                      aria-label="Selecionar todos"
                    />
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <button
                        className="pdv-cad-icon-btn pdv-cad-icon-add"
                        type="button"
                        aria-label={`Abrir produtos de ${item.name}`}
                        onClick={() => navigate(`/client/produtos/estoque/${encodeURIComponent(item.id)}`)}
                      >
                        <ChevronRight size={16} strokeWidth={2.6} aria-hidden="true" />
                      </button>
                    </td>
                    <td>
                      {item.name} ({item.productCount})
                    </td>
                    <td>
                      <button
                        className="pdv-cad-icon-btn"
                        type="button"
                        aria-label={`Atualizar ${item.name}`}
                        onClick={() => {
                          load();
                          setToast(`Categoria ${item.name} atualizada.`);
                        }}
                      >
                        <RefreshCw size={16} strokeWidth={2.2} aria-hidden="true" />
                      </button>
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        checked={Boolean(selected[item.id])}
                        onChange={(event) => setSelected({ ...selected, [item.id]: event.target.checked })}
                        aria-label={`Inativar ${item.name}`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="pdv-cad-toolbar">
            <button
              className="pdv-cad-btn pdv-cad-btn-red"
              type="button"
              onClick={() => setToast("Inativação em lote de categoria ainda não persiste (use o produto).")}
            >
              <X size={16} strokeWidth={2.4} aria-hidden="true" />
              Inativar
            </button>
          </div>
          <p className="pdv-cad-record">
            Registro 1 de {rows.length} total de {rows.length}
          </p>
          <p className="pdv-sr" aria-live="polite">
            {toast}
          </p>
        </div>
      </section>
    </CadastroShell>
  );
}

function EstoqueProdutos({ categoryId }: { categoryId: string }) {
  const navigate = useNavigate();
  const [categoryName, setCategoryName] = useState(categoryId);
  const [draft, setDraft] = useState({ code: "", grade: "", name: "" });
  const [applied, setApplied] = useState(draft);
  const [rows, setRows] = useState<PdvProduct[]>([]);
  const [stock, setStock] = useState<Record<string, string>>({});
  const [photoProductId, setPhotoProductId] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoRemoteSrc, setPhotoRemoteSrc] = useState("");
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    Promise.all([
      api.get("/clients/products", {
        params: { ativo: "1", categoryId },
      }),
      api.get("/clients/products/categories"),
    ])
      .then(([productsRes, catsRes]) => {
        const products = (productsRes.data.products as PdvProduct[]) ?? [];
        setRows(products);
        const nextStock: Record<string, string> = {};
        products.forEach((item) => {
          nextStock[item.id] = String(item.stockQuantity).replace(".", ",");
        });
        setStock(nextStock);
        const cat = ((catsRes.data.categories as PdvProductCategory[]) ?? []).find(
          (item) => item.id === categoryId,
        );
        setCategoryName(cat?.name ?? categoryId);
        setError("");
      })
      .catch((err) => {
        const parsed = parseError(err);
        setError(parsed.friend || parsed.message || "Não foi possível carregar o estoque.");
        setRows([]);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId]);

  useEffect(() => {
    if (!photoFile) {
      setPhotoPreview("");
      return;
    }
    const url = URL.createObjectURL(photoFile);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photoFile]);

  useEffect(() => {
    let revoked = false;
    let objectUrl = "";
    setPhotoRemoteSrc("");
    if (!photoProductId || photoFile) return;
    const product = rows.find((item) => item.id === photoProductId);
    if (!product?.photoFileId) return;

    api
      .get(`/clients/products/${photoProductId}/photo`, { responseType: "blob" })
      .then((response) => {
        if (revoked) return;
        objectUrl = URL.createObjectURL(response.data);
        setPhotoRemoteSrc(objectUrl);
      })
      .catch(() => {
        if (!revoked) setPhotoRemoteSrc("");
      });

    return () => {
      revoked = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [photoProductId, photoFile, rows]);

  const visible = useMemo(() => {
    const qCode = applied.code.trim();
    const qName = applied.name.trim().toLowerCase();
    return rows.filter((item) => {
      if (qCode && !item.code.includes(qCode)) return false;
      if (qName && !item.name.toLowerCase().includes(qName)) return false;
      return true;
    });
  }, [applied, rows]);

  function onSearch(event: FormEvent) {
    event.preventDefault();
    setApplied(draft);
  }

  async function saveStock(productId: string, value: string) {
    const qty = parseMoneyBr(value);
    try {
      const { data } = await api.patch(`/clients/products/${productId}/stock`, {
        stockQuantity: qty,
      });
      const product = data.product as PdvProduct;
      setRows((current) => current.map((item) => (item.id === productId ? product : item)));
      setStock((current) => ({
        ...current,
        [productId]: String(product.stockQuantity).replace(".", ","),
      }));
      setToast("Estoque atualizado.");
    } catch (err) {
      const parsed = parseError(err);
      setToast(parsed.friend || parsed.message || "Falha ao atualizar estoque.");
    }
  }

  function onPickPhoto(event: ChangeEvent<HTMLInputElement>) {
    setPhotoFile(event.target.files?.[0] ?? null);
  }

  async function uploadPhoto() {
    if (!photoProductId) {
      setToast("Selecione um produto para vincular a foto.");
      return;
    }
    if (!photoFile) {
      setToast("Selecione uma imagem PNG, JPG, WEBP, GIF ou SVG.");
      return;
    }
    setPhotoBusy(true);
    const hadPhoto = Boolean(photoProduct?.photoFileId);
    try {
      const body = new FormData();
      body.append("file", photoFile);
      const { data } = await api.post(`/clients/products/${photoProductId}/photo`, body);
      const product = data.product as PdvProduct;
      setRows((current) => current.map((item) => (item.id === product.id ? product : item)));
      setToast(
        hadPhoto
          ? "Foto substituída. Arquivo anterior removido do bucket."
          : "Foto enviada ao bucket Geninfra.",
      );
      setPhotoFile(null);
    } catch (err) {
      const parsed = parseError(err);
      setToast(parsed.friend || parsed.message || "Não foi possível enviar a foto.");
    } finally {
      setPhotoBusy(false);
    }
  }

  const total = visible.reduce((sum, item) => {
    const value = parseMoneyBr(stock[item.id] ?? String(item.stockQuantity));
    return sum + value;
  }, 0);

  const photoProduct = rows.find((item) => item.id === photoProductId) ?? null;

  return (
    <CadastroShell>
      <section className="pdv-cad-page" aria-labelledby="pdv-est-prod-title">
        <div className="pdv-cad-sheet">
          <h1 id="pdv-est-prod-title">ALTERAR ESTOQUE</h1>
          <div className="pdv-cad-toolbar">
            <button
              className="pdv-cad-btn pdv-cad-btn-back pdv-voltar"
              type="button"
              onClick={() => navigate("/client/produtos/estoque")}
            >
              Voltar
            </button>
            <button
              className="pdv-cad-btn pdv-cad-btn-green"
              type="button"
              onClick={() => navigate("/client/produtos/cadastrar")}
            >
              <Plus size={16} strokeWidth={2.4} aria-hidden="true" />
              Cadastrar
            </button>
          </div>
          <p className="pdv-cad-kicker">{categoryName}</p>
          {error ? <p className="pdv-cad-error">{error}</p> : null}
          {loading ? <p className="pdv-cad-kicker">Carregando produtos…</p> : null}

          <form className="pdv-cad-filters pdv-cad-filters-stock" onSubmit={onSearch}>
            <label>
              Cod Produto
              <input
                value={draft.code}
                onChange={(event) => setDraft({ ...draft, code: event.target.value })}
                autoComplete="off"
              />
            </label>
            <label>
              Cod Grade
              <input
                value={draft.grade}
                onChange={(event) => setDraft({ ...draft, grade: event.target.value })}
                autoComplete="off"
              />
            </label>
            <label>
              Nome Produto:
              <input
                value={draft.name}
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                autoComplete="off"
              />
            </label>
            <div className="pdv-cad-filters-go">
              <button className="pdv-cad-btn pdv-cad-btn-blue" type="submit">
                <Search size={15} strokeWidth={2.2} aria-hidden="true" />
                Buscar
              </button>
            </div>
          </form>

          <div className="pdv-prod-photo-panel" aria-labelledby="pdv-prod-photo-title">
            <h2 id="pdv-prod-photo-title">
              <ImagePlus size={16} aria-hidden="true" /> Foto do produto (Geninfra)
            </h2>
            <p className="pdv-cad-kicker">
              Vincule ou troque a foto no bucket. A foto anterior do mesmo produto é apagada no Geninfra. Credenciais ficam só no backend (`GENINFRA_*`).
            </p>
            <div className="pdv-prod-photo-grid">
              <label>
                Produto
                <select
                  value={photoProductId ?? ""}
                  onChange={(event) => {
                    setPhotoProductId(event.target.value || null);
                    setPhotoFile(null);
                  }}
                >
                  <option value="">Selecione</option>
                  {rows.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.code} — {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Arquivo
                <input type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" onChange={onPickPhoto} />
              </label>
              <button
                className="pdv-cad-btn pdv-cad-btn-blue"
                type="button"
                disabled={photoBusy}
                onClick={() => void uploadPhoto()}
              >
                {photoBusy ? "Enviando…" : "Salvar foto no bucket"}
              </button>
            </div>
            <div className="pdv-prod-photo-preview">
              {photoPreview ? <img src={photoPreview} alt="Pré-visualização da foto" /> : null}
              {!photoPreview && photoRemoteSrc ? (
                <img src={photoRemoteSrc} alt={`Foto de ${photoProduct?.name ?? "produto"}`} />
              ) : null}
              {!photoPreview && !photoRemoteSrc ? (
                <p className="pdv-cad-kicker">Nenhuma foto selecionada.</p>
              ) : null}
            </div>
          </div>

          <div className="pdv-cad-table-wrap">
            <table className="pdv-cad-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Estoque</th>
                  <th>Ultima Compra</th>
                  <th>Venda</th>
                  <th>Alterar Estoque</th>
                  <th>Foto</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((item) => (
                  <Fragment key={item.id}>
                    <tr>
                      <td>
                        {item.code} - {item.name}
                      </td>
                      <td>{stock[item.id] ?? String(item.stockQuantity)}</td>
                      <td>—</td>
                      <td>{formatMoneyBr(item.salePrice || item.priceweightAverage)}</td>
                      <td>
                        <input
                          className="pdv-cad-stock-num"
                          value={stock[item.id] ?? String(item.stockQuantity)}
                          onChange={(event) => setStock({ ...stock, [item.id]: event.target.value })}
                          onBlur={(event) => void saveStock(item.id, event.target.value)}
                          inputMode="decimal"
                          aria-label={`Alterar estoque de ${item.name}`}
                        />
                      </td>
                      <td>
                        <button
                          className="pdv-cad-icon-btn"
                          type="button"
                          aria-label={`Vincular foto de ${item.name}`}
                          onClick={() => {
                            setPhotoProductId(item.id);
                            setPhotoFile(null);
                          }}
                        >
                          <ImagePlus size={16} strokeWidth={2.2} aria-hidden="true" />
                        </button>
                        {item.photoFileId ? "✓" : ""}
                      </td>
                    </tr>
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
          <p className="pdv-cad-record">
            <strong>Total:</strong> {String(total).replace(".", ",")}
          </p>
          <p className="pdv-sr" aria-live="polite">
            {toast}
          </p>
        </div>
      </section>
    </CadastroShell>
  );
}

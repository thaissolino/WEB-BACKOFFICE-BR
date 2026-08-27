import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Snackbar,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import Header from "../../components/Header";
import { tokens } from "../../theme";
import { api, parseError } from "../../services/api";
import {
  formatDateTime,
  formatMoney,
  movementLabel,
  type CatalogProduct,
  type MovementType,
  type StockMovement,
  type Store,
  type StoreMetrics,
  type StoreProduct,
} from "./types";

const emptyProduct = { name: "", sku: "", quantity: "0", price: "" };

export default function StoreDetailClassic({ storeId: storeIdProp }: { storeId?: string } = {}) {
  const { id: idParam } = useParams();
  const id = storeIdProp || idParam;
  const navigate = useNavigate();
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const isMobile = useMediaQuery("(max-width:768px)");
  const [store, setStore] = useState<Store | null>(null);
  const [metrics, setMetrics] = useState<StoreMetrics | null>(null);
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [productForm, setProductForm] = useState(emptyProduct);
  const [catalog, setCatalog] = useState<CatalogProduct[]>([]);
  const [catalogPick, setCatalogPick] = useState<CatalogProduct | null>(null);
  const [stockDialog, setStockDialog] = useState<{ product: StoreProduct; type: MovementType; quantity: string; note: string } | null>(null);
  const [toast, setToast] = useState({ open: false, type: "success" as "success" | "error", message: "" });

  function fail(err: unknown, fallback: string) {
    const parsed = parseError(err);
    setToast({ open: true, type: "error", message: parsed.friend || parsed.message || fallback });
  }

  async function loadStore() {
    if (!id) return;
    try {
      const { data } = await api.get(`/backoffice/stores/${id}`);
      setStore(data.store);
      setMetrics(data.metrics);
      setProducts(data.products || []);
    } catch (err) {
      fail(err, "Não foi possível carregar a loja.");
    }
  }

  async function loadMovements() {
    if (!id) return;
    try {
      const { data } = await api.get("/backoffice/stock/movements", {
        params: { storeId: id, from: from || undefined, to: to || undefined },
      });
      setMovements(data.movements || []);
    } catch (err) {
      fail(err, "Não foi possível carregar o histórico.");
    }
  }

  useEffect(() => {
    loadStore();
    loadMovements();
  }, [id]);

  // Catálogo oficial das invoices, para vincular o item de estoque (opcional).
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/invoice/product", { params: { limit: 5000, page: 1 } });
        const items: CatalogProduct[] = Array.isArray(data) ? data : data.products || [];
        setCatalog(items.filter((item) => item.active !== false));
      } catch {
        // Sem catálogo disponível: o formulário continua funcionando sem vínculo.
        setCatalog([]);
      }
    })();
  }, []);

  async function createProduct(event: FormEvent) {
    event.preventDefault();
    if (!id) return;
    try {
      await api.post(`/backoffice/stores/${id}/products`, {
        name: productForm.name.trim(),
        sku: productForm.sku.trim(),
        quantity: Number(productForm.quantity || 0),
        price: productForm.price === "" ? null : Number(productForm.price),
        catalogProductId: catalogPick?.id ?? null,
      });
      setProductForm(emptyProduct);
      setCatalogPick(null);
      setToast({ open: true, type: "success", message: "Produto cadastrado." });
      await loadStore();
      await loadMovements();
    } catch (err) {
      fail(err, "Não foi possível cadastrar o produto.");
    }
  }

  async function removeProduct(productId: string) {
    if (!id) return;
    try {
      await api.delete(`/backoffice/stores/${id}/products/${productId}`);
      setToast({ open: true, type: "success", message: "Produto removido." });
      await loadStore();
      await loadMovements();
    } catch (err) {
      fail(err, "Não foi possível remover o produto.");
    }
  }

  async function applyStock() {
    if (!id || !stockDialog) return;
    try {
      await api.post(`/backoffice/stores/${id}/products/${stockDialog.product.id}/stock`, {
        type: stockDialog.type,
        quantity: Number(stockDialog.quantity),
        note: stockDialog.note || undefined,
      });
      setStockDialog(null);
      setToast({ open: true, type: "success", message: "Estoque atualizado." });
      await loadStore();
      await loadMovements();
    } catch (err) {
      fail(err, "Não foi possível ajustar o estoque.");
    }
  }

  const cardSx = {
    p: 2,
    minWidth: isMobile ? "100%" : 160,
    flex: 1,
    backgroundColor: colors.primary[400],
    border: `1px solid ${colors.grey[700]}`,
  };

  return (
    <Box m="20px">
      <Header
        title={store?.name || "Loja"}
        subtitle={store ? `${store.slug} · ${store.city || "sem cidade"} · ${store.commercialClientName || "sem cliente comercial"} · ${store.status === "ACTIVE" ? "Ativa" : "Inativa"}` : "Detalhe da vitrine"}
      />
      <Box display="flex" gap={1} mb={2}>
        <Button variant="outlined" color="inherit" onClick={() => navigate("/lojas")}>
          Voltar
        </Button>
        <Button variant="outlined" color="inherit" onClick={() => navigate(`/lojas/${id}`)}>
          Configurações da Loja
        </Button>
        <Button variant="outlined" color="inherit" onClick={() => navigate("/estoque")}>
          Estoque geral
        </Button>
      </Box>

      <Box display="flex" gap={1.5} flexWrap="wrap" mb={3}>
        <Box sx={cardSx}>
          <Typography variant="caption" color={colors.grey[300]}>Produtos</Typography>
          <Typography variant="h4">{metrics?.products ?? 0}</Typography>
        </Box>
        <Box sx={cardSx}>
          <Typography variant="caption" color={colors.grey[300]}>Unidades em estoque</Typography>
          <Typography variant="h4">{metrics?.units ?? 0}</Typography>
        </Box>
        <Box sx={cardSx}>
          <Typography variant="caption" color={colors.grey[300]}>SKUs com estoque</Typography>
          <Typography variant="h4">{metrics?.skus ?? 0}</Typography>
        </Box>
        <Box sx={cardSx}>
          <Typography variant="caption" color={colors.grey[300]}>Última movimentação</Typography>
          <Typography variant="h5">{formatDateTime(metrics?.lastMovementAt)}</Typography>
        </Box>
      </Box>

      <Typography variant="h5" mb={1}>Produtos desta loja</Typography>
      <Box
        component="form"
        onSubmit={createProduct}
        display="grid"
        gap={1}
        gridTemplateColumns={isMobile ? "1fr" : "2fr 2fr 1fr 1fr 1fr auto"}
        mb={2}
        alignItems="center"
      >
        <Autocomplete
          size="small"
          options={catalog}
          value={catalogPick}
          onChange={(_, value) => {
            setCatalogPick(value);
            if (value) {
              // Pré-preenche nome e SKU a partir do catálogo (editáveis).
              setProductForm((c) => ({
                ...c,
                name: c.name.trim() ? c.name : value.name,
                sku: c.sku.trim() ? c.sku : value.code,
              }));
            }
          }}
          getOptionLabel={(option) => `${option.code} — ${option.name}`}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          renderInput={(params) => (
            <TextField {...params} variant="filled" label="Catálogo oficial (opcional)" />
          )}
          noOptionsText="Nenhum produto no catálogo"
        />
        <TextField size="small" variant="filled" label="Nome" value={productForm.name} onChange={(e) => setProductForm((c) => ({ ...c, name: e.target.value }))} required />
        <TextField size="small" variant="filled" label="SKU" value={productForm.sku} onChange={(e) => setProductForm((c) => ({ ...c, sku: e.target.value }))} required />
        <TextField size="small" variant="filled" type="number" label="Qtd inicial" value={productForm.quantity} onChange={(e) => setProductForm((c) => ({ ...c, quantity: e.target.value }))} />
        <TextField size="small" variant="filled" type="number" label="Preço" value={productForm.price} onChange={(e) => setProductForm((c) => ({ ...c, price: e.target.value }))} />
        <Button type="submit" color="secondary" variant="contained">
          Adicionar
        </Button>
      </Box>

      {isMobile ? (
        <Box display="grid" gap={1.5} mb={3}>
          {products.map((product) => (
            <Box key={product.id} p={2} sx={{ backgroundColor: colors.primary[400], border: `1px solid ${colors.grey[700]}` }}>
              <Typography fontWeight={700}>{product.name}</Typography>
              <Typography variant="body2">{product.sku} · {product.quantity} un · {formatMoney(product.price)}</Typography>
              {product.catalogName ? (
                <Typography variant="caption" color={colors.greenAccent[400]}>
                  Catálogo: {product.catalogCode ? `${product.catalogCode} — ` : ""}{product.catalogName}
                </Typography>
              ) : null}
              <Box display="flex" gap={1} mt={1} flexWrap="wrap">
                <Button size="small" variant="outlined" onClick={() => setStockDialog({ product, type: "IN", quantity: "1", note: "" })}>Estoque</Button>
                <Button size="small" color="error" variant="outlined" onClick={() => removeProduct(product.id)}>Excluir</Button>
              </Box>
            </Box>
          ))}
        </Box>
      ) : (
        <Box sx={{ overflowX: "auto", mb: 3 }}>
          <Box component="table" width="100%" sx={{ borderCollapse: "collapse", "& th, & td": { p: 1, borderBottom: `1px solid ${colors.grey[700]}`, textAlign: "left" } }}>
            <thead>
              <tr>
                <th>Produto</th>
                <th>SKU</th>
                <th>Catálogo oficial</th>
                <th>Qtd</th>
                <th>Preço</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id}>
                  <td>{product.name}</td>
                  <td>{product.sku}</td>
                  <td>
                    {product.catalogName
                      ? `${product.catalogCode ? `${product.catalogCode} — ` : ""}${product.catalogName}`
                      : "—"}
                  </td>
                  <td>{product.quantity}</td>
                  <td>{formatMoney(product.price)}</td>
                  <td>
                    <Button size="small" variant="outlined" onClick={() => setStockDialog({ product, type: "IN", quantity: "1", note: "" })}>Movimentar</Button>
                    <Button size="small" color="error" variant="outlined" sx={{ ml: 0.5 }} onClick={() => removeProduct(product.id)}>Excluir</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Box>
        </Box>
      )}

      <Typography variant="h5" mb={1}>Histórico desta loja</Typography>
      <Box display="flex" gap={1} flexWrap="wrap" mb={2} alignItems="center">
        <TextField size="small" type="date" label="De" InputLabelProps={{ shrink: true }} value={from} onChange={(e) => setFrom(e.target.value)} />
        <TextField size="small" type="date" label="Até" InputLabelProps={{ shrink: true }} value={to} onChange={(e) => setTo(e.target.value)} />
        <Button color="secondary" variant="contained" onClick={loadMovements}>Filtrar</Button>
      </Box>
      <Box sx={{ overflowX: "auto" }}>
        <Box component="table" width="100%" sx={{ borderCollapse: "collapse", "& th, & td": { p: 1, borderBottom: `1px solid ${colors.grey[700]}`, textAlign: "left", fontSize: isMobile ? 12 : 14 } }}>
          <thead>
            <tr>
              <th>Data</th>
              <th>Produto</th>
              <th>Tipo</th>
              <th>Qtd</th>
              <th>Saldo</th>
            </tr>
          </thead>
          <tbody>
            {movements.map((item) => (
              <tr key={item.id}>
                <td>{formatDateTime(item.createdAt)}</td>
                <td>{item.productName} ({item.sku})</td>
                <td>{movementLabel(item.type)}</td>
                <td>{item.quantity}</td>
                <td>{item.balanceAfter}</td>
              </tr>
            ))}
          </tbody>
        </Box>
      </Box>

      <Dialog open={Boolean(stockDialog)} onClose={() => setStockDialog(null)} fullWidth maxWidth="xs">
        <DialogTitle>Movimentar estoque</DialogTitle>
        <DialogContent sx={{ display: "grid", gap: 2, pt: 1 }}>
          <Typography>{stockDialog?.product.name} · atual: {stockDialog?.product.quantity}</Typography>
          <FormControl variant="filled">
            <InputLabel>Tipo</InputLabel>
            <Select
              value={stockDialog?.type || "IN"}
              label="Tipo"
              onChange={(e) => setStockDialog((c) => c && { ...c, type: e.target.value as MovementType })}
            >
              <MenuItem value="IN">Entrada</MenuItem>
              <MenuItem value="OUT">Saída</MenuItem>
              <MenuItem value="ADJUST">Ajuste (define o saldo)</MenuItem>
            </Select>
          </FormControl>
          <TextField
            variant="filled"
            type="number"
            label="Quantidade"
            value={stockDialog?.quantity || ""}
            onChange={(e) => setStockDialog((c) => c && { ...c, quantity: e.target.value })}
          />
          <TextField
            variant="filled"
            label="Observação"
            value={stockDialog?.note || ""}
            onChange={(e) => setStockDialog((c) => c && { ...c, note: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStockDialog(null)}>Cancelar</Button>
          <Button color="secondary" variant="contained" onClick={applyStock}>Aplicar</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={toast.open} autoHideDuration={4000} onClose={() => setToast((t) => ({ ...t, open: false }))}>
        <Alert severity={toast.type}>{toast.message}</Alert>
      </Snackbar>
    </Box>
  );
}


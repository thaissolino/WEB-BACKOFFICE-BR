import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
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
  movementLabel,
  type StockMovement,
  type StockRankItem,
  type Store,
} from "./types";

export default function StockOverviewClassic() {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const isMobile = useMediaQuery("(max-width:768px)");
  const navigate = useNavigate();
  const [ranking, setRanking] = useState<StockRankItem[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [storeId, setStoreId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [toast, setToast] = useState({ open: false, type: "success" as "success" | "error", message: "" });

  function fail(err: unknown, fallback: string) {
    const parsed = parseError(err);
    setToast({ open: true, type: "error", message: parsed.friend || parsed.message || fallback });
  }

  async function loadRanking() {
    try {
      const { data } = await api.get("/backoffice/stock/top", { params: { limit: 30 } });
      setRanking(data.items || []);
    } catch (err) {
      fail(err, "Não foi possível carregar o ranking.");
    }
  }

  async function loadMovements() {
    try {
      const { data } = await api.get("/backoffice/stock/movements", {
        params: {
          storeId: storeId || undefined,
          from: from || undefined,
          to: to || undefined,
        },
      });
      setMovements(data.movements || []);
    } catch (err) {
      fail(err, "Não foi possível carregar o histórico.");
    }
  }

  useEffect(() => {
    api.get("/backoffice/stores").then(({ data }) => setStores(data.stores || [])).catch(() => undefined);
    loadRanking();
    loadMovements();
  }, []);

  return (
    <Box m="20px">
      <Header title="Estoque" subtitle="Visão geral das lojas, ranking e histórico por período" />

      <Typography variant="h5" mb={1}>Produtos mais estocados</Typography>
      <Typography variant="body2" color={colors.grey[300]} mb={2}>
        Soma de quantidade por nome/SKU em todas as lojas.
      </Typography>
      {isMobile ? (
        <Box display="grid" gap={1.5} mb={4}>
          {ranking.map((item, index) => (
            <Box key={`${item.sku}-${item.name}`} p={2} sx={{ backgroundColor: colors.primary[400], border: `1px solid ${colors.grey[700]}` }}>
              <Typography fontWeight={700}>#{index + 1} {item.name}</Typography>
              <Typography variant="body2">{item.sku} · {item.quantity} un · {item.stores} loja(s)</Typography>
            </Box>
          ))}
        </Box>
      ) : (
        <Box sx={{ overflowX: "auto", mb: 4 }}>
          <Box component="table" width="100%" sx={{ borderCollapse: "collapse", "& th, & td": { p: 1, borderBottom: `1px solid ${colors.grey[700]}`, textAlign: "left" } }}>
            <thead>
              <tr>
                <th>#</th>
                <th>Produto</th>
                <th>SKU</th>
                <th>Quantidade</th>
                <th>Lojas</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((item, index) => (
                <tr key={`${item.sku}-${item.name}`}>
                  <td>{index + 1}</td>
                  <td>{item.name}</td>
                  <td>{item.sku}</td>
                  <td>{item.quantity}</td>
                  <td>{item.stores}</td>
                </tr>
              ))}
            </tbody>
          </Box>
        </Box>
      )}
      {ranking.length === 0 ? (
        <Typography color={colors.grey[300]} mb={4}>Nenhum produto em estoque ainda.</Typography>
      ) : null}

      <Typography variant="h5" mb={1}>Histórico de movimentações</Typography>
      <Box display="flex" gap={1} flexWrap="wrap" mb={2} alignItems="center">
        <FormControl size="small" variant="filled" sx={{ minWidth: isMobile ? "100%" : 220 }}>
          <InputLabel>Loja</InputLabel>
          <Select value={storeId} label="Loja" onChange={(e) => setStoreId(e.target.value)}>
            <MenuItem value="">Todas</MenuItem>
            {stores.map((store) => (
              <MenuItem key={store.id} value={store.id}>{store.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField size="small" type="date" label="De" InputLabelProps={{ shrink: true }} value={from} onChange={(e) => setFrom(e.target.value)} />
        <TextField size="small" type="date" label="Até" InputLabelProps={{ shrink: true }} value={to} onChange={(e) => setTo(e.target.value)} />
        <Button color="secondary" variant="contained" onClick={loadMovements}>Filtrar</Button>
        <Button variant="outlined" color="inherit" onClick={() => navigate("/lojas")}>Gerenciar lojas</Button>
      </Box>

      <Box sx={{ overflowX: "auto" }}>
        <Box component="table" width="100%" sx={{ borderCollapse: "collapse", "& th, & td": { p: 1, borderBottom: `1px solid ${colors.grey[700]}`, textAlign: "left", fontSize: isMobile ? 12 : 14 } }}>
          <thead>
            <tr>
              <th>Data</th>
              <th>Loja</th>
              <th>Produto</th>
              <th>Tipo</th>
              <th>Qtd</th>
              <th>Saldo depois</th>
            </tr>
          </thead>
          <tbody>
            {movements.map((item) => (
              <tr key={item.id}>
                <td>{formatDateTime(item.createdAt)}</td>
                <td>
                  <Button size="small" onClick={() => navigate(`/lojas/${item.storeId}`)}>{item.storeName}</Button>
                </td>
                <td>{item.productName} ({item.sku})</td>
                <td>{movementLabel(item.type)}</td>
                <td>{item.quantity}</td>
                <td>{item.balanceAfter}</td>
              </tr>
            ))}
          </tbody>
        </Box>
      </Box>
      {movements.length === 0 ? (
        <Typography mt={2} color={colors.grey[300]}>Nenhuma movimentação no período.</Typography>
      ) : null}

      <Snackbar open={toast.open} autoHideDuration={4000} onClose={() => setToast((t) => ({ ...t, open: false }))}>
        <Alert severity={toast.type}>{toast.message}</Alert>
      </Snackbar>
    </Box>
  );
}


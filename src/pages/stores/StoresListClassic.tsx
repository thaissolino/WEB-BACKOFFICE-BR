import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Chip,
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
import type { Store, StoreStatus } from "./types";
import type { CommercialClient } from "../commercial-clients/types";

export default function StoresListClassic() {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const isMobile = useMediaQuery("(max-width:768px)");
  const navigate = useNavigate();
  const [stores, setStores] = useState<Store[]>([]);
  const [clients, setClients] = useState<CommercialClient[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Store | null>(null);
  const [deleting, setDeleting] = useState<Store | null>(null);
  const [testStores, setTestStores] = useState<Store[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState({ open: false, type: "success" as "success" | "error", message: "" });

  async function load(term = search) {
    setLoading(true);
    try {
      const { data } = await api.get("/backoffice/stores", { params: term ? { search: term } : undefined });
      setStores(data.stores || []);
    } catch (err) {
      const parsed = parseError(err);
      setToast({ open: true, type: "error", message: parsed.friend || parsed.message || "Falha ao listar lojas." });
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

  async function toggleStatus(store: Store) {
    const next: StoreStatus = store.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      await api.put(`/backoffice/stores/${store.id}`, { status: next });
      setToast({ open: true, type: "success", message: next === "ACTIVE" ? "Loja ativada." : "Loja desativada." });
      load();
    } catch (err) {
      const parsed = parseError(err);
      setToast({ open: true, type: "error", message: parsed.friend || parsed.message || "Não foi possível alterar o status." });
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
      setToast({ open: true, type: "success", message: "Loja atualizada." });
      setEditing(null);
      load();
    } catch (err) {
      const parsed = parseError(err);
      setToast({ open: true, type: "error", message: parsed.friend || parsed.message || "Não foi possível salvar." });
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    try {
      await api.delete(`/backoffice/stores/${deleting.id}`);
      setToast({ open: true, type: "success", message: `Loja "${deleting.name}" excluída.` });
      setDeleting(null);
      load();
    } catch (err) {
      const parsed = parseError(err);
      setToast({ open: true, type: "error", message: parsed.friend || parsed.message || "Não foi possível excluir a loja." });
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
      setToast({ open: true, type: "error", message: parsed.friend || parsed.message || "Não foi possível listar as lojas de teste." });
    }
  }

  async function confirmDeleteTestStores() {
    setBusy(true);
    try {
      const { data } = await api.delete("/backoffice/stores/test-data");
      setToast({ open: true, type: "success", message: `${data.deletedCount} loja(s) de teste excluída(s).` });
      setTestStores(null);
      load();
    } catch (err) {
      const parsed = parseError(err);
      setToast({ open: true, type: "error", message: parsed.friend || parsed.message || "Não foi possível excluir as lojas de teste." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Box m="20px">
      <Header title="Gerenciar lojas" subtitle="Listagem, edição e status das vitrines" />
      <Box display="flex" gap={1} flexWrap="wrap" mb={2}>
        <TextField
          size="small"
          variant="filled"
          label="Buscar"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") load(search);
          }}
          sx={{ minWidth: isMobile ? "100%" : 260 }}
        />
        <Button color="secondary" variant="contained" onClick={() => load(search)}>
          Buscar
        </Button>
        <Button variant="outlined" color="inherit" onClick={() => navigate("/lojas/cadastrar")}>
          Nova loja
        </Button>
        <Button variant="outlined" color="error" onClick={openTestStoresDialog}>
          Excluir lojas de teste
        </Button>
      </Box>

      {loading ? <Typography color={colors.grey[300]}>Carregando...</Typography> : null}

      {isMobile ? (
        <Box display="grid" gap={1.5}>
          {filtered.map((store) => (
            <Box key={store.id} p={2} sx={{ backgroundColor: colors.primary[400], border: `1px solid ${colors.grey[700]}` }}>
              <Typography fontWeight={700}>{store.name}</Typography>
              <Typography variant="body2" color={colors.grey[300]}>
                {store.slug} · {store.city || "sem cidade"}
                {store.commercialClientName ? ` · ${store.commercialClientName}` : ""}
              </Typography>
              <Chip
                size="small"
                label={store.status === "ACTIVE" ? "Ativa" : "Inativa"}
                color={store.status === "ACTIVE" ? "success" : "default"}
                sx={{ mt: 1 }}
              />
              <Box display="flex" gap={1} mt={1.5} flexWrap="wrap">
                <Button size="small" variant="outlined" onClick={() => navigate(`/lojas/${store.id}`)}>
                  Abrir
                </Button>
                <Button size="small" variant="outlined" color="warning" onClick={() => setEditing(store)}>
                  Editar
                </Button>
                <Button size="small" variant="outlined" color={store.status === "ACTIVE" ? "secondary" : "success"} onClick={() => toggleStatus(store)}>
                  {store.status === "ACTIVE" ? "Desativar" : "Ativar"}
                </Button>
                <Button size="small" variant="outlined" color="error" onClick={() => setDeleting(store)}>
                  Excluir
                </Button>
              </Box>
            </Box>
          ))}
        </Box>
      ) : (
        <Box sx={{ overflowX: "auto" }}>
          <Box
            component="table"
            width="100%"
            sx={{
              borderCollapse: "collapse",
              "& th, & td": { textAlign: "left", p: 1.2, borderBottom: `1px solid ${colors.grey[700]}` },
              "& th": { color: colors.grey[300], fontWeight: 600 },
            }}
          >
            <thead>
              <tr>
                <th>Nome</th>
                <th>Cliente comercial</th>
                <th>Slug</th>
                <th>Cidade</th>
                <th>Responsável</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((store) => (
                <tr key={store.id}>
                  <td>{store.name}</td>
                  <td>{store.commercialClientName || "—"}</td>
                  <td>{store.slug}</td>
                  <td>{store.city || "—"}</td>
                  <td>{store.manager || "—"}</td>
                  <td>{store.status === "ACTIVE" ? "Ativa" : "Inativa"}</td>
                  <td>
                    <Box display="inline-flex" gap={0.5}>
                      <Button size="small" variant="outlined" onClick={() => navigate(`/lojas/${store.id}`)}>
                        Abrir
                      </Button>
                      <Button size="small" variant="outlined" color="warning" onClick={() => setEditing({ ...store })}>
                        Editar
                      </Button>
                      <Button size="small" variant="outlined" color={store.status === "ACTIVE" ? "secondary" : "success"} onClick={() => toggleStatus(store)}>
                        {store.status === "ACTIVE" ? "Desativar" : "Ativar"}
                      </Button>
                      <Button size="small" variant="outlined" color="error" onClick={() => setDeleting(store)}>
                        Excluir
                      </Button>
                    </Box>
                  </td>
                </tr>
              ))}
            </tbody>
          </Box>
        </Box>
      )}

      {!loading && filtered.length === 0 ? (
        <Typography mt={2} color={colors.grey[300]}>
          Nenhuma loja encontrada.
        </Typography>
      ) : null}

      <Dialog open={Boolean(editing)} onClose={() => setEditing(null)} fullWidth maxWidth="sm">
        <DialogTitle>Editar loja</DialogTitle>
        <DialogContent sx={{ display: "grid", gap: 2, pt: 1 }}>
          <TextField
            label="Nome"
            variant="filled"
            value={editing?.name || ""}
            onChange={(event) => setEditing((current) => current && { ...current, name: event.target.value })}
          />
          <TextField
            label="Slug"
            variant="filled"
            value={editing?.slug || ""}
            onChange={(event) => setEditing((current) => current && { ...current, slug: event.target.value })}
          />
          <TextField
            label="Documento"
            variant="filled"
            value={editing?.document || ""}
            onChange={(event) => setEditing((current) => current && { ...current, document: event.target.value })}
          />
          <TextField
            label="Cidade"
            variant="filled"
            value={editing?.city || ""}
            onChange={(event) => setEditing((current) => current && { ...current, city: event.target.value })}
          />
          <TextField
            label="Endereço"
            variant="filled"
            value={editing?.address || ""}
            onChange={(event) => setEditing((current) => current && { ...current, address: event.target.value })}
          />
          <TextField
            label="Responsável"
            variant="filled"
            value={editing?.manager || ""}
            onChange={(event) => setEditing((current) => current && { ...current, manager: event.target.value })}
          />
          <FormControl variant="filled">
            <InputLabel>Cliente comercial</InputLabel>
            <Select
              value={editing?.commercialClientId || ""}
              label="Cliente comercial"
              onChange={(event) =>
                setEditing((current) => current && { ...current, commercialClientId: event.target.value || null })
              }
            >
              <MenuItem value="">Nenhum</MenuItem>
              {clients.map((client) => (
                <MenuItem key={client.id} value={client.id}>
                  {client.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl variant="filled">
            <InputLabel>Status</InputLabel>
            <Select
              value={editing?.status || "ACTIVE"}
              label="Status"
              onChange={(event) =>
                setEditing((current) => current && { ...current, status: event.target.value as StoreStatus })
              }
            >
              <MenuItem value="ACTIVE">Ativa</MenuItem>
              <MenuItem value="INACTIVE">Inativa</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditing(null)}>Cancelar</Button>
          <Button color="secondary" variant="contained" onClick={saveEdit}>
            Salvar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(deleting)} onClose={() => !busy && setDeleting(null)} fullWidth maxWidth="xs">
        <DialogTitle>Excluir loja</DialogTitle>
        <DialogContent>
          <Typography>
            Excluir definitivamente a loja <strong>{deleting?.name}</strong>?
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={1}>
            Produtos, movimentações de estoque e logs desta loja também serão removidos. Esta ação
            não pode ser desfeita.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleting(null)} disabled={busy}>Cancelar</Button>
          <Button color="error" variant="contained" onClick={confirmDelete} disabled={busy}>
            Excluir definitivamente
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={testStores !== null} onClose={() => !busy && setTestStores(null)} fullWidth maxWidth="sm">
        <DialogTitle>Excluir lojas de teste</DialogTitle>
        <DialogContent>
          {testStores && testStores.length === 0 ? (
            <Typography>Nenhuma loja de teste encontrada.</Typography>
          ) : (
            <>
              <Typography>
                As lojas abaixo foram identificadas como <strong>lojas de teste</strong> (nome com
                &quot;teste&quot;/&quot;test&quot; ou criadas pelos seeds de demonstração). Serão excluídas
                definitivamente, junto com produtos e movimentações:
              </Typography>
              <Box component="ul" mt={1} pl={3}>
                {(testStores || []).map((store) => (
                  <li key={store.id}>
                    <Typography variant="body2">
                      {store.name} ({store.slug})
                    </Typography>
                  </li>
                ))}
              </Box>
              <Typography variant="body2" color="error" mt={1}>
                Esta ação não pode ser desfeita.
              </Typography>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTestStores(null)} disabled={busy}>Cancelar</Button>
          {testStores && testStores.length > 0 ? (
            <Button color="error" variant="contained" onClick={confirmDeleteTestStores} disabled={busy}>
              Excluir {testStores.length} loja(s) de teste
            </Button>
          ) : null}
        </DialogActions>
      </Dialog>

      <Snackbar open={toast.open} autoHideDuration={4000} onClose={() => setToast((t) => ({ ...t, open: false }))}>
        <Alert severity={toast.type}>{toast.message}</Alert>
      </Snackbar>
    </Box>
  );
}


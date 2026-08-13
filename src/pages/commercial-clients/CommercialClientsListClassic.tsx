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
import type { CommercialClient } from "./types";

export default function CommercialClientsListClassic() {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const isMobile = useMediaQuery("(max-width:768px)");
  const navigate = useNavigate();
  const [clients, setClients] = useState<CommercialClient[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<CommercialClient | null>(null);
  const [toast, setToast] = useState({ open: false, type: "success" as "success" | "error", message: "" });

  async function load(term = search) {
    setLoading(true);
    try {
      const { data } = await api.get("/backoffice/commercial-clients", { params: term ? { search: term } : undefined });
      setClients(data.commercialClients || []);
    } catch (err) {
      const parsed = parseError(err);
      setToast({ open: true, type: "error", message: parsed.friend || parsed.message || "Falha ao listar clientes comerciais." });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => clients, [clients]);

  async function toggleActive(client: CommercialClient) {
    try {
      await api.put(`/backoffice/commercial-clients/${client.id}`, { active: !client.active });
      setToast({ open: true, type: "success", message: client.active ? "Cliente desativado." : "Cliente ativado." });
      load();
    } catch (err) {
      const parsed = parseError(err);
      setToast({ open: true, type: "error", message: parsed.friend || parsed.message || "Não foi possível alterar o status." });
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
      setToast({ open: true, type: "success", message: "Cliente comercial atualizado." });
      setEditing(null);
      load();
    } catch (err) {
      const parsed = parseError(err);
      setToast({ open: true, type: "error", message: parsed.friend || parsed.message || "Não foi possível salvar." });
    }
  }

  return (
    <Box m="20px">
      <Header title="Gerenciar clientes comerciais" subtitle="Donos B2B das lojas — um cliente pode ter várias vitrines" />
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
        <Button variant="outlined" color="inherit" onClick={() => navigate("/clientes-comerciais/cadastrar")}>
          Novo cliente
        </Button>
      </Box>

      {loading ? <Typography color={colors.grey[300]}>Carregando...</Typography> : null}

      {isMobile ? (
        <Box display="grid" gap={1.5}>
          {filtered.map((client) => (
            <Box key={client.id} p={2} sx={{ backgroundColor: colors.primary[400], border: `1px solid ${colors.grey[700]}` }}>
              <Typography fontWeight={700}>{client.name}</Typography>
              <Typography variant="body2" color={colors.grey[300]}>
                {client.document || "sem documento"} · {client.storesCount} {client.storesCount === 1 ? "loja" : "lojas"}
              </Typography>
              <Chip
                size="small"
                label={client.active ? "Ativo" : "Inativo"}
                color={client.active ? "success" : "default"}
                sx={{ mt: 1 }}
              />
              <Box display="flex" gap={1} mt={1.5} flexWrap="wrap">
                <Button size="small" variant="outlined" onClick={() => navigate(`/clientes-comerciais/${client.id}`)}>
                  Abrir
                </Button>
                <Button size="small" variant="outlined" color="warning" onClick={() => setEditing({ ...client })}>
                  Editar
                </Button>
                <Button size="small" variant="outlined" color={client.active ? "secondary" : "success"} onClick={() => toggleActive(client)}>
                  {client.active ? "Desativar" : "Ativar"}
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
                <th>Documento</th>
                <th>Contato</th>
                <th>Lojas</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((client) => (
                <tr key={client.id}>
                  <td>{client.name}</td>
                  <td>{client.document || "—"}</td>
                  <td>{client.email || client.phone || "—"}</td>
                  <td>{client.storesCount}</td>
                  <td>{client.active ? "Ativo" : "Inativo"}</td>
                  <td>
                    <Box display="inline-flex" gap={0.5}>
                      <Button size="small" variant="outlined" onClick={() => navigate(`/clientes-comerciais/${client.id}`)}>
                        Abrir
                      </Button>
                      <Button size="small" variant="outlined" color="warning" onClick={() => setEditing({ ...client })}>
                        Editar
                      </Button>
                      <Button size="small" variant="outlined" color={client.active ? "secondary" : "success"} onClick={() => toggleActive(client)}>
                        {client.active ? "Desativar" : "Ativar"}
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
          Nenhum cliente comercial encontrado.
        </Typography>
      ) : null}

      <Dialog open={Boolean(editing)} onClose={() => setEditing(null)} fullWidth maxWidth="sm">
        <DialogTitle>Editar cliente comercial</DialogTitle>
        <DialogContent sx={{ display: "grid", gap: 2, pt: 1 }}>
          <TextField
            label="Nome"
            variant="filled"
            value={editing?.name || ""}
            onChange={(event) => setEditing((current) => current && { ...current, name: event.target.value })}
          />
          <TextField
            label="Documento"
            variant="filled"
            value={editing?.document || ""}
            onChange={(event) => setEditing((current) => current && { ...current, document: event.target.value })}
          />
          <TextField
            label="E-mail"
            variant="filled"
            value={editing?.email || ""}
            onChange={(event) => setEditing((current) => current && { ...current, email: event.target.value })}
          />
          <TextField
            label="Telefone"
            variant="filled"
            value={editing?.phone || ""}
            onChange={(event) => setEditing((current) => current && { ...current, phone: event.target.value })}
          />
          <TextField
            label="Observações"
            variant="filled"
            value={editing?.notes || ""}
            onChange={(event) => setEditing((current) => current && { ...current, notes: event.target.value })}
          />
          <FormControl variant="filled">
            <InputLabel>Status</InputLabel>
            <Select
              value={editing?.active ? "ACTIVE" : "INACTIVE"}
              label="Status"
              onChange={(event) =>
                setEditing((current) => current && { ...current, active: event.target.value === "ACTIVE" })
              }
            >
              <MenuItem value="ACTIVE">Ativo</MenuItem>
              <MenuItem value="INACTIVE">Inativo</MenuItem>
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

      <Snackbar open={toast.open} autoHideDuration={4000} onClose={() => setToast((t) => ({ ...t, open: false }))}>
        <Alert severity={toast.type}>{toast.message}</Alert>
      </Snackbar>
    </Box>
  );
}

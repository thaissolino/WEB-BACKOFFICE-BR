import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
import { emptyCommercialClientForm, type CommercialClient, type CommercialClientStore } from "./types";

export default function CommercialClientDetailClassic() {
  const { id } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const isMobile = useMediaQuery("(max-width:768px)");
  const [client, setClient] = useState<CommercialClient | null>(null);
  const [stores, setStores] = useState<CommercialClientStore[]>([]);
  const [form, setForm] = useState(emptyCommercialClientForm);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ open: false, type: "success" as "success" | "error", message: "" });

  function setField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function load() {
    if (!id) return;
    try {
      const { data } = await api.get(`/backoffice/commercial-clients/${id}`);
      const next: CommercialClient = data.commercialClient;
      setClient(next);
      setStores(data.stores || []);
      setForm({
        name: next.name,
        document: next.document || "",
        email: next.email || "",
        phone: next.phone || "",
        notes: next.notes || "",
        active: next.active,
      });
    } catch (err) {
      const parsed = parseError(err);
      setToast({ open: true, type: "error", message: parsed.friend || parsed.message || "Não foi possível carregar o cliente." });
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!id) return;
    setSaving(true);
    try {
      await api.put(`/backoffice/commercial-clients/${id}`, {
        name: form.name.trim(),
        document: form.document.trim() || null,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        notes: form.notes.trim() || null,
        active: form.active,
      });
      setToast({ open: true, type: "success", message: "Cliente comercial atualizado." });
      await load();
    } catch (err) {
      const parsed = parseError(err);
      setToast({ open: true, type: "error", message: parsed.friend || parsed.message || "Não foi possível salvar." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Box m="20px">
      <Header
        title={client?.name || "Cliente comercial"}
        subtitle={client ? `${client.storesCount} ${client.storesCount === 1 ? "loja" : "lojas"} · ${client.active ? "Ativo" : "Inativo"}` : "Detalhe do dono B2B"}
      />
      <Box display="flex" gap={1} mb={2} flexWrap="wrap">
        <Button variant="outlined" color="inherit" onClick={() => navigate("/clientes-comerciais")}>
          Voltar
        </Button>
        <Button
          variant="outlined"
          color="inherit"
          onClick={() => navigate(id ? `/lojas/cadastrar?clienteComercialId=${id}` : "/lojas/cadastrar")}
        >
          Cadastrar loja
        </Button>
      </Box>

      <Box
        component="form"
        onSubmit={handleSubmit}
        display="grid"
        gap="20px"
        gridTemplateColumns={isMobile ? "1fr" : "1fr 1fr"}
        maxWidth={720}
        mb={4}
      >
        <TextField fullWidth variant="filled" label="Nome" value={form.name} onChange={(e) => setField("name", e.target.value)} required sx={{ gridColumn: isMobile ? undefined : "1 / -1" }} />
        <TextField fullWidth variant="filled" label="Documento (CPF/CNPJ)" value={form.document} onChange={(e) => setField("document", e.target.value)} />
        <TextField fullWidth variant="filled" label="E-mail" type="email" value={form.email} onChange={(e) => setField("email", e.target.value)} />
        <TextField fullWidth variant="filled" label="Telefone" value={form.phone} onChange={(e) => setField("phone", e.target.value)} />
        <FormControl variant="filled" fullWidth>
          <InputLabel>Status</InputLabel>
          <Select value={form.active ? "ACTIVE" : "INACTIVE"} label="Status" onChange={(e) => setField("active", e.target.value === "ACTIVE")}>
            <MenuItem value="ACTIVE">Ativo</MenuItem>
            <MenuItem value="INACTIVE">Inativo</MenuItem>
          </Select>
        </FormControl>
        <TextField
          fullWidth
          variant="filled"
          label="Observações"
          value={form.notes}
          onChange={(e) => setField("notes", e.target.value)}
          multiline
          minRows={2}
          sx={{ gridColumn: isMobile ? undefined : "1 / -1" }}
        />
        <Box sx={{ gridColumn: isMobile ? undefined : "1 / -1" }}>
          <Button type="submit" color="secondary" variant="contained" disabled={saving}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </Box>
      </Box>

      <Typography variant="h5" mb={1}>
        Lojas deste cliente
      </Typography>
      {stores.length === 0 ? (
        <Typography color={colors.grey[300]}>Nenhuma loja vinculada ainda.</Typography>
      ) : isMobile ? (
        <Box display="grid" gap={1.5}>
          {stores.map((store) => (
            <Box key={store.id} p={2} sx={{ backgroundColor: colors.primary[400], border: `1px solid ${colors.grey[700]}` }}>
              <Typography fontWeight={700}>{store.name}</Typography>
              <Typography variant="body2" color={colors.grey[300]}>
                {store.slug} · {store.city || "sem cidade"}
              </Typography>
              <Button size="small" variant="outlined" sx={{ mt: 1 }} onClick={() => navigate(`/lojas/${store.id}`)}>
                Abrir loja
              </Button>
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
                <th>Slug</th>
                <th>Cidade</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {stores.map((store) => (
                <tr key={store.id}>
                  <td>{store.name}</td>
                  <td>{store.slug}</td>
                  <td>{store.city || "—"}</td>
                  <td>{store.status === "ACTIVE" ? "Ativa" : "Inativa"}</td>
                  <td>
                    <Button size="small" variant="outlined" onClick={() => navigate(`/lojas/${store.id}`)}>
                      Abrir
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Box>
        </Box>
      )}

      <Snackbar open={toast.open} autoHideDuration={4000} onClose={() => setToast((t) => ({ ...t, open: false }))}>
        <Alert severity={toast.type}>{toast.message}</Alert>
      </Snackbar>
    </Box>
  );
}

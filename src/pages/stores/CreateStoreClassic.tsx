import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  Snackbar,
  TextField,
  useMediaQuery,
} from "@mui/material";
import Header from "../../components/Header";
import { api, parseError } from "../../services/api";
import type { StoreStatus } from "./types";
import type { CommercialClient } from "../commercial-clients/types";

export default function CreateStoreClassic() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const isMobile = useMediaQuery("(max-width:768px)");
  const [saving, setSaving] = useState(false);
  const [clients, setClients] = useState<CommercialClient[]>([]);
  const [toast, setToast] = useState({ open: false, type: "success" as "success" | "error", message: "" });
  const [form, setForm] = useState({
    name: "",
    slug: "",
    document: "",
    status: "ACTIVE" as StoreStatus,
    address: "",
    city: "",
    manager: "",
    commercialClientId: params.get("clienteComercialId") || "",
  });

  function setField(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  useEffect(() => {
    api
      .get("/backoffice/commercial-clients")
      .then(({ data }) => setClients(data.commercialClients || []))
      .catch(() => setClients([]));
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!form.name.trim()) {
      setToast({ open: true, type: "error", message: "Informe o nome da loja." });
      return;
    }
    setSaving(true);
    try {
      const { data } = await api.post("/backoffice/stores", {
        name: form.name.trim(),
        slug: form.slug.trim() || undefined,
        document: form.document.trim() || null,
        status: form.status,
        address: form.address.trim() || null,
        city: form.city.trim() || null,
        manager: form.manager.trim() || null,
        commercialClientId: form.commercialClientId || null,
      });
      setToast({ open: true, type: "success", message: "Loja cadastrada." });
      navigate(`/lojas/${data.store.id}`);
    } catch (err) {
      const parsed = parseError(err);
      setToast({ open: true, type: "error", message: parsed.friend || parsed.message || "Não foi possível cadastrar." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Box m="20px">
      <Header title="Cadastrar loja" subtitle="Cadastro manual da vitrine / PDV" />
      <Box
        component="form"
        onSubmit={handleSubmit}
        display="grid"
        gap="20px"
        gridTemplateColumns={isMobile ? "1fr" : "1fr 1fr"}
        maxWidth={720}
      >
        <FormControl variant="filled" fullWidth sx={{ gridColumn: isMobile ? undefined : "1 / -1" }}>
          <InputLabel>Cliente comercial</InputLabel>
          <Select
            value={form.commercialClientId}
            label="Cliente comercial"
            onChange={(event) => setField("commercialClientId", event.target.value)}
          >
            <MenuItem value="">Nenhum</MenuItem>
            {clients.map((client) => (
              <MenuItem key={client.id} value={client.id}>
                {client.name}
              </MenuItem>
            ))}
          </Select>
          <FormHelperText>Um cliente comercial pode ter várias lojas.</FormHelperText>
        </FormControl>
        <TextField
          fullWidth
          variant="filled"
          label="Nome"
          value={form.name}
          onChange={(event) => setField("name", event.target.value)}
          required
        />
        <TextField
          fullWidth
          variant="filled"
          label="Identificador (slug)"
          placeholder="gerado a partir do nome"
          value={form.slug}
          onChange={(event) => setField("slug", event.target.value)}
        />
        <TextField
          fullWidth
          variant="filled"
          label="Documento (opcional)"
          value={form.document}
          onChange={(event) => setField("document", event.target.value)}
        />
        <FormControl variant="filled" fullWidth>
          <InputLabel>Status</InputLabel>
          <Select
            value={form.status}
            label="Status"
            onChange={(event) => setField("status", event.target.value)}
          >
            <MenuItem value="ACTIVE">Ativa</MenuItem>
            <MenuItem value="INACTIVE">Inativa</MenuItem>
          </Select>
        </FormControl>
        <TextField
          fullWidth
          variant="filled"
          label="Cidade"
          value={form.city}
          onChange={(event) => setField("city", event.target.value)}
        />
        <TextField
          fullWidth
          variant="filled"
          label="Responsável"
          value={form.manager}
          onChange={(event) => setField("manager", event.target.value)}
        />
        <TextField
          fullWidth
          variant="filled"
          label="Endereço"
          value={form.address}
          onChange={(event) => setField("address", event.target.value)}
          sx={{ gridColumn: isMobile ? undefined : "1 / -1" }}
        />
        <Box display="flex" gap={1} sx={{ gridColumn: isMobile ? undefined : "1 / -1" }}>
          <Button type="submit" color="secondary" variant="contained" disabled={saving}>
            {saving ? "Salvando..." : "Cadastrar loja"}
          </Button>
          <Button variant="outlined" color="inherit" onClick={() => navigate("/lojas")}>
            Ver lojas
          </Button>
        </Box>
      </Box>
      <Snackbar open={toast.open} autoHideDuration={4000} onClose={() => setToast((t) => ({ ...t, open: false }))}>
        <Alert severity={toast.type}>{toast.message}</Alert>
      </Snackbar>
    </Box>
  );
}


import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
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

type LojistaOption = {
  id: string;
  name: string;
  email: string;
  document: string;
};

function formatCpfCnpj(value: string) {
  const d = (value || "").replace(/\D/g, "").slice(0, 14);
  if (d.length <= 11) {
    return d
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }
  return d
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

function formatPhone(value: string) {
  const d = (value || "").replace(/\D/g, "").slice(0, 11);
  if (d.length <= 10) {
    return d.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d{1,4})$/, "$1-$2");
  }
  return d.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d{1,4})$/, "$1-$2");
}

export default function CreateStoreClassic() {
  const navigate = useNavigate();
  const isMobile = useMediaQuery("(max-width:768px)");
  const [saving, setSaving] = useState(false);
  const [lojistas, setLojistas] = useState<LojistaOption[]>([]);
  const [toast, setToast] = useState({ open: false, type: "success" as "success" | "error", message: "" });
  const [form, setForm] = useState({
    name: "",
    slug: "",
    document: "",
    phone: "",
    email: "",
    status: "ACTIVE" as StoreStatus,
    address: "",
    city: "",
    manager: "",
    clientId: "",
  });

  function setField(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  useEffect(() => {
    api
      .get("/backoffice/lojistas")
      .then(({ data }) => setLojistas(data.lojistas || []))
      .catch(() => setLojistas([]));
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
        document: form.document.replace(/\D/g, "") || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        status: form.status,
        address: form.address.trim() || null,
        city: form.city.trim() || null,
        manager: form.manager.trim() || null,
        clientId: form.clientId || null,
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
      <Header title="Cadastrar loja" subtitle="Cadastro da loja do lojista (PDV)" />
      <Box
        component="form"
        onSubmit={handleSubmit}
        display="grid"
        gap="20px"
        gridTemplateColumns={isMobile ? "1fr" : "1fr 1fr"}
        maxWidth={720}
      >
        <TextField
          fullWidth
          variant="filled"
          label="Nome loja"
          value={form.name}
          onChange={(event) => setField("name", event.target.value)}
          required
          sx={{ gridColumn: isMobile ? undefined : "1 / -1" }}
        />
        <TextField
          fullWidth
          variant="filled"
          label="CNPJ / CPF"
          value={form.document}
          onChange={(event) => setField("document", formatCpfCnpj(event.target.value))}
          inputProps={{ inputMode: "numeric" }}
        />
        <TextField
          fullWidth
          variant="filled"
          label="Telefone"
          value={form.phone}
          onChange={(event) => setField("phone", formatPhone(event.target.value))}
          inputProps={{ inputMode: "tel" }}
        />
        <TextField
          fullWidth
          variant="filled"
          label="E-mail"
          type="email"
          value={form.email}
          onChange={(event) => setField("email", event.target.value)}
          sx={{ gridColumn: isMobile ? undefined : "1 / -1" }}
        />
        <FormControl variant="filled" fullWidth sx={{ gridColumn: isMobile ? undefined : "1 / -1" }}>
          <InputLabel>Vincular lojista (opcional)</InputLabel>
          <Select
            value={form.clientId}
            label="Vincular lojista (opcional)"
            onChange={(event) => setField("clientId", event.target.value)}
          >
            <MenuItem value="">Nenhum</MenuItem>
            {lojistas.map((lojista) => (
              <MenuItem key={lojista.id} value={lojista.id}>
                {lojista.name}
                {lojista.email ? ` — ${lojista.email}` : ""}
              </MenuItem>
            ))}
          </Select>
          <FormHelperText>Lojista = conta de login do PDV. Não é obrigatório no cadastro.</FormHelperText>
        </FormControl>
        <TextField
          fullWidth
          variant="filled"
          label="Identificador (slug)"
          placeholder="gerado a partir do nome"
          value={form.slug}
          onChange={(event) => setField("slug", event.target.value)}
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

import { useState, type FormEvent } from "react";
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
} from "@mui/material";
import Header from "../../components/Header";
import { api, parseError } from "../../services/api";
import { emptyCommercialClientForm } from "./types";

export default function CreateCommercialClientClassic() {
  const navigate = useNavigate();
  const isMobile = useMediaQuery("(max-width:768px)");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ open: false, type: "success" as "success" | "error", message: "" });
  const [form, setForm] = useState(emptyCommercialClientForm);

  function setField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!form.name.trim()) {
      setToast({ open: true, type: "error", message: "Informe o nome do cliente comercial." });
      return;
    }
    setSaving(true);
    try {
      const { data } = await api.post("/backoffice/commercial-clients", {
        name: form.name.trim(),
        document: form.document.trim() || null,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        notes: form.notes.trim() || null,
        active: form.active,
      });
      setToast({ open: true, type: "success", message: "Cliente comercial cadastrado." });
      navigate(`/clientes-comerciais/${data.commercialClient.id}`);
    } catch (err) {
      const parsed = parseError(err);
      setToast({ open: true, type: "error", message: parsed.friend || parsed.message || "Não foi possível cadastrar." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Box m="20px">
      <Header title="Cadastrar cliente comercial" subtitle="Dono B2B das lojas — um cliente pode ter várias vitrines" />
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
          label="Nome"
          value={form.name}
          onChange={(event) => setField("name", event.target.value)}
          required
          sx={{ gridColumn: isMobile ? undefined : "1 / -1" }}
        />
        <TextField
          fullWidth
          variant="filled"
          label="Documento (CPF/CNPJ)"
          value={form.document}
          onChange={(event) => setField("document", event.target.value)}
        />
        <TextField
          fullWidth
          variant="filled"
          label="E-mail"
          type="email"
          value={form.email}
          onChange={(event) => setField("email", event.target.value)}
        />
        <TextField
          fullWidth
          variant="filled"
          label="Telefone"
          value={form.phone}
          onChange={(event) => setField("phone", event.target.value)}
        />
        <FormControl variant="filled" fullWidth>
          <InputLabel>Status</InputLabel>
          <Select
            value={form.active ? "ACTIVE" : "INACTIVE"}
            label="Status"
            onChange={(event) => setField("active", event.target.value === "ACTIVE")}
          >
            <MenuItem value="ACTIVE">Ativo</MenuItem>
            <MenuItem value="INACTIVE">Inativo</MenuItem>
          </Select>
        </FormControl>
        <TextField
          fullWidth
          variant="filled"
          label="Observações"
          value={form.notes}
          onChange={(event) => setField("notes", event.target.value)}
          multiline
          minRows={2}
          sx={{ gridColumn: isMobile ? undefined : "1 / -1" }}
        />
        <Typography variant="body2" color="text.secondary" sx={{ gridColumn: isMobile ? undefined : "1 / -1" }}>
          Este cadastro não é o cliente do PDV. Depois você vincula uma ou mais lojas a este dono.
        </Typography>
        <Box display="flex" gap={1} sx={{ gridColumn: isMobile ? undefined : "1 / -1" }}>
          <Button type="submit" color="secondary" variant="contained" disabled={saving}>
            {saving ? "Salvando..." : "Cadastrar cliente comercial"}
          </Button>
          <Button variant="outlined" color="inherit" onClick={() => navigate("/clientes-comerciais")}>
            Ver clientes
          </Button>
        </Box>
      </Box>
      <Snackbar open={toast.open} autoHideDuration={4000} onClose={() => setToast((t) => ({ ...t, open: false }))}>
        <Alert severity={toast.type}>{toast.message}</Alert>
      </Snackbar>
    </Box>
  );
}

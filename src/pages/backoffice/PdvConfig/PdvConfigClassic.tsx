import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControlLabel,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useTheme,
} from "@mui/material";
import Header from "../../../components/Header";
import { tokens } from "../../../theme";
import { SIGNUP_FIELD_META, type PdvLoginIdentifier } from "../../client/vitrine/signupConfig";
import { PHONE_BR_MAX_LENGTH, normalizeUrlInput } from "../../../utils/brMasks";
import PdvVisibilityEditor from "./PdvVisibilityEditor";
import { usePdvConfigForm } from "./usePdvConfigForm";

export default function PdvConfigClassic() {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const {
    fields,
    setFields,
    loginIdentifier,
    setLoginIdentifier,
    support,
    setSupportField,
    setContact,
    uiConfig,
    setUiConfig,
    loading,
    saving,
    error,
    success,
    dirty,
    canSave,
    save,
  } = usePdvConfigForm();

  const fieldSx = {
    "& .MuiInputBase-root": { color: colors.grey[100], backgroundColor: colors.primary[500] },
    "& .MuiInputLabel-root": { color: colors.grey[300] },
    "& .MuiOutlinedInput-notchedOutline": { borderColor: colors.grey[700] },
  };

  const panelSx = {
    p: { xs: 2, sm: 2.5 },
    minWidth: 0,
    backgroundColor: colors.primary[400],
    border: `1px solid ${colors.grey[700]}`,
  };

  const saveButtonSx = {
    minHeight: 44,
    backgroundColor: colors.greenAccent[600],
    color: colors.primary[900],
    fontWeight: 700,
    "&:hover": { backgroundColor: colors.greenAccent[500] },
    "&.Mui-disabled": {
      backgroundColor: colors.grey[700],
      color: colors.grey[400],
    },
  };

  function renderSaveBar() {
    return (
      <>
        <Button
          variant="contained"
          onClick={() => void save()}
          disabled={!canSave}
          title={dirty ? "Publicar as alterações no banco" : "Nenhuma alteração para salvar"}
          sx={saveButtonSx}
        >
          {saving ? "Salvando..." : "Salvar / Atualizar"}
        </Button>
        <Typography variant="body2" sx={{ color: colors.grey[300] }}>
          {dirty ? "Há alterações não publicadas." : "Nada para atualizar."}
        </Typography>
      </>
    );
  }

  return (
    <Box m="20px" pb={4}>
      <Header
        title="Config. PDV"
        subtitle="Login do lojista, canais de atendimento e o que aparece no PDV."
      />

      {!loading ? (
        <Box
          className="pdv-vis-savebar"
          sx={{
            maxWidth: 1600,
            mb: 2,
            backgroundColor: colors.primary[400],
            border: `1px solid ${colors.grey[700]}`,
          }}
        >
          {renderSaveBar()}
        </Box>
      ) : null}

      <Box sx={{ width: "100%", maxWidth: 1600 }}>
        {loading ? (
          <Box display="flex" alignItems="center" gap={2} py={4}>
            <CircularProgress size={22} />
            <Typography color={colors.grey[300]}>Carregando configuração...</Typography>
          </Box>
        ) : null}

        {error ? (
          <Alert severity="error" sx={{ mb: 2 }} role="alert">
            {error}
          </Alert>
        ) : null}
        {success ? (
          <Alert severity="success" sx={{ mb: 2 }} role="status">
            {success}
          </Alert>
        ) : null}

        {!loading ? (
          <>
            <Box
              display="grid"
              gap={2.5}
              mb={2.5}
              sx={{ gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1fr) minmax(0, 1.15fr)" } }}
            >
              <Box sx={panelSx}>
                <Typography variant="body1" sx={{ color: colors.grey[200], mb: 2 }}>
                  Senha é sempre obrigatória. O lojista entra com um único identificador: e-mail ou
                  documento. Os dois nunca aparecem juntos no login nem no cadastro.
                </Typography>

                <Typography
                  variant="caption"
                  sx={{ color: colors.grey[400], letterSpacing: "0.08em", display: "block", mb: 1 }}
                >
                  LOGIN DO LOJISTA COM
                </Typography>
                <ToggleButtonGroup
                  exclusive
                  fullWidth
                  value={loginIdentifier}
                  onChange={(_event, value: PdvLoginIdentifier | null) => {
                    if (value) setLoginIdentifier(value);
                  }}
                  sx={{ mb: 1 }}
                >
                  <ToggleButton value="EMAIL" aria-label="Login com e-mail" sx={{ minHeight: 44 }}>
                    E-mail
                  </ToggleButton>
                  <ToggleButton value="DOCUMENT" aria-label="Login com CPF ou CNPJ" sx={{ minHeight: 44 }}>
                    Documento (CPF/CNPJ)
                  </ToggleButton>
                </ToggleButtonGroup>
                <Typography variant="body2" sx={{ color: colors.grey[300], mb: 3 }}>
                  {loginIdentifier === "EMAIL"
                    ? "Cadastro e login pedem e-mail. O documento fica interno."
                    : "Cadastro e login pedem CPF/CNPJ. O e-mail fica interno e o lojista não o vê."}
                </Typography>

                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 2,
                    py: 1.5,
                    borderBottom: `1px solid ${colors.grey[700]}`,
                  }}
                >
                  <Box>
                    <Typography fontWeight={700} color={colors.grey[100]}>
                      Senha
                    </Typography>
                    <Typography variant="body2" color={colors.grey[300]}>
                      Sempre obrigatória no cadastro e no login. Não pode ser desligada.
                    </Typography>
                  </Box>
                  <FormControlLabel
                    control={<Switch checked disabled inputProps={{ "aria-label": "Senha sempre obrigatória" }} />}
                    label="Obrigatória"
                    labelPlacement="start"
                    sx={{ color: colors.grey[200], m: 0, minHeight: 44 }}
                  />
                </Box>

                {fields
                  ? SIGNUP_FIELD_META.map((item) => (
                      <Box
                        key={item.key}
                        sx={{
                          display: "flex",
                          alignItems: "flex-start",
                          justifyContent: "space-between",
                          gap: 2,
                          py: 1.5,
                          borderBottom: `1px solid ${colors.grey[700]}`,
                        }}
                      >
                        <Box>
                          <Typography fontWeight={700} color={colors.grey[100]}>
                            {item.label}
                          </Typography>
                          <Typography variant="body2" color={colors.grey[300]}>
                            {item.description}
                          </Typography>
                        </Box>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={fields[item.key]}
                              onChange={(event) =>
                                setFields((current) =>
                                  current ? { ...current, [item.key]: event.target.checked } : current,
                                )
                              }
                              inputProps={{ "aria-label": `Exibir ${item.label} no cadastro` }}
                            />
                          }
                          label={fields[item.key] ? "Visível" : "Oculto"}
                          labelPlacement="start"
                          sx={{ color: colors.grey[200], m: 0, minHeight: 44 }}
                        />
                      </Box>
                    ))
                  : null}
              </Box>

              <Box sx={panelSx}>
                <Typography
                  variant="caption"
                  sx={{ color: colors.grey[400], letterSpacing: "0.08em", display: "block", mb: 1 }}
                >
                  CANAIS DE ATENDIMENTO
                </Typography>
                <Typography variant="body2" sx={{ color: colors.grey[300], mb: 2 }}>
                  Conteúdo do modal do headset no PDV. Telefones abrem WhatsApp. Use {"{PORTAL}"} e{" "}
                  {"{AQUI}"} no texto do portal para os links.
                </Typography>
                <TextField
                  fullWidth
                  label="Título"
                  value={support.title}
                  onChange={(event) => setSupportField("title", event.target.value)}
                  sx={{ ...fieldSx, mb: 2 }}
                />
                {support.contacts.map((contact, index) => (
                  <Box key={`contact-${index}`} display="grid" gap={1.5} mb={2} sx={{ gridTemplateColumns: { sm: "1fr 1fr" } }}>
                    <TextField
                      fullWidth
                      label={`Telefone ${index + 1} — rótulo`}
                      value={contact.label}
                      onChange={(event) => setContact(index, "label", event.target.value)}
                      sx={fieldSx}
                    />
                    <TextField
                      fullWidth
                      type="tel"
                      label={`Telefone ${index + 1} — número`}
                      value={contact.phone}
                      onChange={(event) => setContact(index, "phone", event.target.value)}
                      placeholder="(99) 99999-9999"
                      autoComplete="tel"
                      inputProps={{
                        inputMode: "tel",
                        maxLength: PHONE_BR_MAX_LENGTH,
                      }}
                      sx={fieldSx}
                    />
                  </Box>
                ))}
                <Box display="grid" gap={2} sx={{ gridTemplateColumns: { lg: "1fr 1fr" } }}>
                  <TextField
                    fullWidth
                    multiline
                    minRows={2}
                    label="Horário em dias úteis"
                    value={support.weekdayHours}
                    onChange={(event) => setSupportField("weekdayHours", event.target.value)}
                    sx={fieldSx}
                  />
                  <TextField
                    fullWidth
                    multiline
                    minRows={2}
                    label="Horário de plantão (fim de semana e feriados)"
                    value={support.weekendHours}
                    onChange={(event) => setSupportField("weekendHours", event.target.value)}
                    sx={fieldSx}
                  />
                  <TextField
                    fullWidth
                    label="URL do PORTAL"
                    value={support.portalUrl}
                    onChange={(event) => setSupportField("portalUrl", event.target.value.replace(/\s/g, ""))}
                    onBlur={(event) => setSupportField("portalUrl", normalizeUrlInput(event.target.value))}
                    placeholder="https://"
                    sx={fieldSx}
                  />
                  <TextField
                    fullWidth
                    label="URL do ticket (AQUI)"
                    value={support.ticketUrl}
                    onChange={(event) => setSupportField("ticketUrl", event.target.value.replace(/\s/g, ""))}
                    onBlur={(event) => setSupportField("ticketUrl", normalizeUrlInput(event.target.value))}
                    placeholder="https://"
                    sx={fieldSx}
                  />
                </Box>
                <TextField
                  fullWidth
                  multiline
                  minRows={3}
                  label="Texto do portal"
                  helperText="Marque os links com {PORTAL} e {AQUI}."
                  value={support.portalText}
                  onChange={(event) => setSupportField("portalText", event.target.value)}
                  sx={{ ...fieldSx, mt: 2, mb: 2 }}
                />
                <TextField
                  fullWidth
                  label="URL do YouTube"
                  value={support.youtubeUrl}
                  onChange={(event) => setSupportField("youtubeUrl", event.target.value.replace(/\s/g, ""))}
                  onBlur={(event) => setSupportField("youtubeUrl", normalizeUrlInput(event.target.value))}
                  placeholder="https://"
                  sx={{ ...fieldSx, mb: 2 }}
                />
                <TextField
                  fullWidth
                  multiline
                  minRows={3}
                  label="Texto do YouTube"
                  value={support.youtubeText}
                  onChange={(event) => setSupportField("youtubeText", event.target.value)}
                  sx={fieldSx}
                />
              </Box>
            </Box>

            <Box sx={{ ...panelSx, mb: 2 }}>
              <Typography
                variant="caption"
                sx={{ color: colors.grey[400], letterSpacing: "0.08em", display: "block", mb: 1 }}
              >
                VISIBILIDADE NO PDV
              </Typography>
              <PdvVisibilityEditor value={uiConfig} onChange={setUiConfig} toolbar={renderSaveBar} />
            </Box>
          </>
        ) : null}
      </Box>
    </Box>
  );
}

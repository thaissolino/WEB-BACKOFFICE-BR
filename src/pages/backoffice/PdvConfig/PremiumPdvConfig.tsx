import { BrSwitch, BrToast, PremiumStage } from "../../../components/premium/PremiumStage";
import { SIGNUP_FIELD_META } from "../../client/vitrine/signupConfig";
import { PHONE_BR_MAX_LENGTH, normalizeUrlInput } from "../../../utils/brMasks";
import PdvVisibilityEditor from "./PdvVisibilityEditor";
import { usePdvConfigForm } from "./usePdvConfigForm";

export default function PremiumPdvConfig() {
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
    setError,
    setSuccess,
    dirty,
    canSave,
    save,
  } = usePdvConfigForm();

  const toast = error
    ? { open: true, message: error }
    : success
      ? { open: true, message: success }
      : { open: false, message: "" };

  function renderSaveButton() {
    return (
      <button
        className="br-btn br-btn-brass"
        type="button"
        onClick={() => void save()}
        disabled={!canSave}
        title={dirty ? "Publicar as alterações no banco" : "Nenhuma alteração para salvar"}
      >
        {saving ? "Salvando..." : "Salvar / Atualizar"}
      </button>
    );
  }

  function renderSaveBar() {
    return (
      <>
        {renderSaveButton()}
        <p>{dirty ? "Há alterações não publicadas." : "Nada para atualizar."}</p>
      </>
    );
  }

  return (
    <PremiumStage
      wide
      title="Configuração do PDV"
      hint="Um identificador. Senha sempre ligada. Marque o que o lojista vê no PDV. O botão só liga depois de mudar algo."
      actions={renderSaveButton()}
    >
      {loading ? (
        <section className="br-panel">
          <p className="br-empty">Carregando configuração…</p>
        </section>
      ) : (
        <>
          <div className="br-grid two">
            <section className="br-panel">
              <h2>Identificador de login</h2>
              <div className="br-seg" role="tablist" aria-label="Identificador de login">
                <button
                  type="button"
                  role="tab"
                  aria-pressed={loginIdentifier === "EMAIL"}
                  onClick={() => setLoginIdentifier("EMAIL")}
                >
                  E-mail
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-pressed={loginIdentifier === "DOCUMENT"}
                  onClick={() => setLoginIdentifier("DOCUMENT")}
                >
                  Documento
                </button>
              </div>
              <p className="br-seg-hint">
                {loginIdentifier === "EMAIL"
                  ? "Cadastro e login pedem e-mail. Documento fica interno."
                  : "Cadastro e login pedem CPF/CNPJ. E-mail fica interno."}
              </p>
              <div className="br-switch" style={{ marginTop: 8 }}>
                <div>
                  <strong>Senha</strong>
                  <p>Obrigatória no cadastro e no login. Não desliga.</p>
                </div>
                <span className="br-pip" data-on="true">
                  Ligada
                </span>
              </div>
              <h2 style={{ marginTop: 18 }}>Campos do cadastro</h2>
              {fields
                ? SIGNUP_FIELD_META.map((item) => (
                    <BrSwitch
                      key={item.key}
                      label={item.label}
                      hint={item.description}
                      checked={fields[item.key]}
                      ariaLabel={`Exibir ${item.label} no cadastro`}
                      onChange={(event) =>
                        setFields((current) => (current ? { ...current, [item.key]: event.target.checked } : current))
                      }
                    />
                  ))
                : null}
            </section>
            <section className="br-panel">
              <h2>Canais de atendimento</h2>
              <p className="br-seg-hint">
                Texto do modal do headset no PDV. Telefones abrem WhatsApp. Use {"{PORTAL}"} e {"{AQUI}"}
                no texto do portal para os links.
              </p>
              <label className="br-field" style={{ marginTop: 12 }}>
                <span>Título</span>
                <input value={support.title} onChange={(event) => setSupportField("title", event.target.value)} />
              </label>
              <div className="br-grid two" style={{ marginTop: 12 }}>
                {support.contacts.map((contact, index) => (
                  <label className="br-field" key={`contact-${index}`}>
                    <span>{`Telefone ${index + 1} — rótulo`}</span>
                    <input
                      value={contact.label}
                      onChange={(event) => setContact(index, "label", event.target.value)}
                      aria-label={`Rótulo do telefone ${index + 1}`}
                    />
                    <input
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      maxLength={PHONE_BR_MAX_LENGTH}
                      placeholder="(99) 99999-9999"
                      value={contact.phone}
                      onChange={(event) => setContact(index, "phone", event.target.value)}
                      aria-label={`Número do telefone ${index + 1}`}
                      style={{ marginTop: 6 }}
                    />
                  </label>
                ))}
              </div>
              <div className="br-grid two" style={{ marginTop: 12 }}>
                <label className="br-field">
                  <span>Horário em dias úteis</span>
                  <textarea
                    value={support.weekdayHours}
                    onChange={(event) => setSupportField("weekdayHours", event.target.value)}
                  />
                </label>
                <label className="br-field">
                  <span>Horário de plantão (fim de semana e feriados)</span>
                  <textarea
                    value={support.weekendHours}
                    onChange={(event) => setSupportField("weekendHours", event.target.value)}
                  />
                </label>
                <label className="br-field">
                  <span>URL do PORTAL</span>
                  <input
                    value={support.portalUrl}
                    onChange={(event) => setSupportField("portalUrl", event.target.value.replace(/\s/g, ""))}
                    onBlur={(event) => setSupportField("portalUrl", normalizeUrlInput(event.target.value))}
                    placeholder="https://"
                  />
                </label>
                <label className="br-field">
                  <span>URL do ticket (AQUI)</span>
                  <input
                    value={support.ticketUrl}
                    onChange={(event) => setSupportField("ticketUrl", event.target.value.replace(/\s/g, ""))}
                    onBlur={(event) => setSupportField("ticketUrl", normalizeUrlInput(event.target.value))}
                    placeholder="https://"
                  />
                </label>
              </div>
              <label className="br-field" style={{ marginTop: 12 }}>
                <span>Texto do portal</span>
                <textarea
                  value={support.portalText}
                  onChange={(event) => setSupportField("portalText", event.target.value)}
                />
                <small>Marque os links com {"{PORTAL}"} e {"{AQUI}"}.</small>
              </label>
              <label className="br-field" style={{ marginTop: 12 }}>
                <span>URL do YouTube</span>
                <input
                  value={support.youtubeUrl}
                  onChange={(event) => setSupportField("youtubeUrl", event.target.value.replace(/\s/g, ""))}
                  onBlur={(event) => setSupportField("youtubeUrl", normalizeUrlInput(event.target.value))}
                  placeholder="https://"
                />
              </label>
              <label className="br-field" style={{ marginTop: 12 }}>
                <span>Texto do YouTube</span>
                <textarea
                  value={support.youtubeText}
                  onChange={(event) => setSupportField("youtubeText", event.target.value)}
                />
              </label>
            </section>
          </div>
          <section className="br-panel">
            <h2>Visibilidade no PDV</h2>
            <PdvVisibilityEditor value={uiConfig} onChange={setUiConfig} toolbar={renderSaveBar} />
          </section>
        </>
      )}
      <BrToast
        open={toast.open}
        message={toast.message}
        onClose={() => {
          setError("");
          setSuccess("");
        }}
      />
    </PremiumStage>
  );
}

import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useClientAuth } from "../../hooks/clientAuth";
import { VitrineAuthLayout } from "./vitrine/VitrineAuthLayout";
import { VitrineField } from "./vitrine/VitrineField";
import { digitsOnly } from "./vitrine/signupConfig";
import { usePdvSignupConfig } from "./vitrine/usePdvSignupConfig";

export default function ClientLogin() {
  const navigate = useNavigate();
  const { clientSignIn } = useClientAuth();
  const config = usePdvSignupConfig();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ identifier?: string; password?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const byDocument = config?.loginIdentifier === "DOCUMENT";
  const identifierLabel = byDocument ? "CPF/CNPJ" : "E-mail";
  const identifierHint = byDocument
    ? "Use o documento cadastrado na loja."
    : "Use o e-mail da conta do lojista.";

  function validate() {
    const next: { identifier?: string; password?: string } = {};
    if (byDocument) {
      if (digitsOnly(identifier).length < 11) {
        next.identifier = "Informe um CPF (11 dígitos) ou CNPJ (14 dígitos).";
      }
    } else if (identifier.trim().length < 3) {
      next.identifier = "Informe o e-mail.";
    }
    if (password.length < 6) {
      next.password = "A senha precisa ter pelo menos 6 caracteres.";
    }
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    if (!config || !validate()) return;

    setIsSubmitting(true);
    try {
      const value = byDocument ? digitsOnly(identifier) : identifier.trim();
      await clientSignIn({ identifier: value, password });
      navigate("/client/dashboard");
    } catch (_error) {
      setErrorMessage(
        byDocument
          ? "Documento ou senha não conferem. Confira e tente de novo."
          : "E-mail ou senha não conferem. Confira e tente de novo.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <VitrineAuthLayout
      title="Entre no GestorVix."
      lede={
        byDocument
          ? "Acesso do lojista ao PDV. Entre com CPF/CNPJ e senha."
          : "Acesso do lojista ao PDV. Entre com e-mail e senha."
      }
    >
      {!config ? (
        <div className="vitrine-skeleton" aria-busy="true" aria-live="polite">
          <span />
          <span />
        </div>
      ) : (
        <form className="vitrine-form" onSubmit={handleSubmit} noValidate>
          {errorMessage ? (
            <p className="vitrine-alert" role="alert">
              {errorMessage}
            </p>
          ) : null}

          <VitrineField
            id="client-identifier"
            label={identifierLabel}
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            onBlur={validate}
            autoComplete={byDocument ? "off" : "username"}
            inputMode={byDocument ? "numeric" : "email"}
            type={byDocument ? "text" : "email"}
            required
            requiredMark
            hint={byDocument ? identifierHint : undefined}
            error={fieldErrors.identifier}
          />

          <div className="vitrine-field">
            <label className="vitrine-label" htmlFor="client-password">
              Senha<span className="vitrine-required" aria-hidden="true">*</span>
            </label>
            <div className="vitrine-password-wrap">
              <input
                id="client-password"
                className="vitrine-control"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                onBlur={validate}
                autoComplete="current-password"
                required
                aria-required="true"
                aria-invalid={Boolean(fieldErrors.password)}
                aria-describedby={fieldErrors.password ? "client-password-error" : undefined}
              />
              <button
                className="vitrine-password-toggle"
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                aria-pressed={showPassword}
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              >
                {showPassword ? "Ocultar" : "Mostrar"}
              </button>
            </div>
            {fieldErrors.password ? (
              <p className="vitrine-error-text" id="client-password-error" role="alert">
                {fieldErrors.password}
              </p>
            ) : null}
          </div>

          <button className="vitrine-btn" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Entrando..." : "Entrar no PDV"}
          </button>
        </form>
      )}

      <div className="vitrine-foot">
        <Link className="vitrine-link" to="/signup/client">
          Criar conta de lojista
        </Link>
        {!byDocument ? (
          <Link className="vitrine-link vitrine-muted-link" to="/forgot-password">
            Esqueci minha senha
          </Link>
        ) : null}
      </div>
    </VitrineAuthLayout>
  );
}

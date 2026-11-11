import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../../services/api";
import { AuthSplitLayout } from "../../auth-split/AuthSplitLayout";
import "./admin-signin.css";

export function BackofficeForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    document.title = "GestorVix · Recuperar acesso administrativo";
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Informe um e-mail válido.");
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post("/auth/backoffice/forgot-password", { email: email.trim() });
      setMessage("Se o e-mail existir na base, você recebe as instruções de recuperação.");
    } catch (_err) {
      setMessage("Se o e-mail existir na base, você recebe as instruções de recuperação.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthSplitLayout className="adm-signin" skipHref="#adm-forgot-form">
      <p className="adm-signin-kicker">ACESSO ADMINISTRATIVO</p>
      <h1 className="adm-signin-brand">Recuperar acesso.</h1>
      <p className="adm-signin-lede">Informe o e-mail da conta. Não revelamos se o endereço está cadastrado.</p>

      <form id="adm-forgot-form" className="adm-signin-form" onSubmit={handleSubmit} noValidate>
        {message ? (
          <p className="adm-signin-alert" data-tone="success" role="status">
            {message}
          </p>
        ) : null}

        <div className="adm-signin-field">
          <label className="adm-signin-label" htmlFor="adm-forgot-email">
            E-mail<span className="adm-signin-required" aria-hidden="true">*</span>
          </label>
          <input
            id="adm-forgot-email"
            className="adm-signin-control"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
            aria-required="true"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "adm-forgot-email-error" : undefined}
          />
          {error ? (
            <p className="adm-signin-error-text" id="adm-forgot-email-error" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <button className="adm-signin-btn" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Enviando…" : "Enviar recuperação"}
        </button>
      </form>

      <div className="adm-signin-foot">
        <Link className="adm-signin-link" to="/signin/backoffice">
          Voltar para o login
        </Link>
      </div>
    </AuthSplitLayout>
  );
}

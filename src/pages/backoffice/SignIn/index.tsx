import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthBackoffice } from "../../../hooks/authBackoffice";
import { AuthSplitLayout } from "../../auth-split/AuthSplitLayout";
import "./admin-signin.css";

export function SignIn() {
  const navigate = useNavigate();
  const { onSignIn } = useAuthBackoffice();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = "GestorVix · Acesso administrativo";
  }, []);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const onMessage = (event: MessageEvent) => {
      if (event.data?.type !== "RELOAD_PAGE") return;

      const hasReloaded = sessionStorage.getItem("sw-reload-done") === "1";
      if (hasReloaded) return;

      sessionStorage.setItem("sw-reload-done", "1");

      const toast = document.createElement("div");
      toast.className = "adm-signin-toast";
      toast.setAttribute("role", "status");
      toast.innerHTML = `Nova versão disponível. Atualizando…<div class="adm-signin-toast-bar"></div>`;
      document.body.appendChild(toast);

      setTimeout(() => {
        window.location.reload();
      }, 1200);
    };

    navigator.serviceWorker.addEventListener("message", onMessage);

    return () => {
      navigator.serviceWorker.removeEventListener("message", onMessage);
    };
  }, []);

  function fieldErrorFor(name: "email" | "password", nextEmail = email, nextPassword = password) {
    if (name === "email") {
      if (!nextEmail.trim()) return "Informe o e-mail.";
      if (!nextEmail.includes("@")) return "Informe um e-mail válido.";
      return undefined;
    }
    if (!nextPassword.trim()) return "Informe a senha.";
    if (nextPassword.trim().length < 6) return "A senha precisa ter pelo menos 6 caracteres.";
    return undefined;
  }

  function validate(fields: Array<"email" | "password"> = ["email", "password"]) {
    const next = { ...fieldErrors };
    for (const name of fields) {
      next[name] = fieldErrorFor(name);
    }
    setFieldErrors(next);
    return !next.email && !next.password;
  }

  async function handleForm(e: FormEvent) {
    e.preventDefault();

    if (!validate()) {
      setErrorMessage("");
      return;
    }

    const emailLower = email.trim().toLowerCase();

    try {
      setLoading(true);
      setErrorMessage("");
      await onSignIn({ email: emailLower, password });
      setTimeout(() => navigate("/backoffice"), 0);
    } catch (err: any) {
      setErrorMessage(err?.message || "Não foi possível entrar. Confira o e-mail e a senha.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthSplitLayout className="adm-signin" skipHref="#adm-signin-form">
      <p className="adm-signin-kicker">ACESSO ADMINISTRATIVO</p>
      <h1 className="adm-signin-brand">GestorVix</h1>
      <p className="adm-signin-lede">Entre para gerir lojas, PDV e canais.</p>

      <form
        id="adm-signin-form"
        className="adm-signin-form"
        onSubmit={handleForm}
        noValidate
      >
        {errorMessage ? (
          <p className="adm-signin-alert" role="alert">
            {errorMessage}
          </p>
        ) : null}

        <div className="adm-signin-field">
          <label className="adm-signin-label" htmlFor="adm-email">
            E-mail<span className="adm-signin-required" aria-hidden="true">*</span>
          </label>
          <input
            id="adm-email"
            className="adm-signin-control"
            name="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            onBlur={() => validate(["email"])}
            autoComplete="username"
            required
            aria-required="true"
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={fieldErrors.email ? "adm-email-error" : undefined}
          />
          {fieldErrors.email ? (
            <p className="adm-signin-error-text" id="adm-email-error" role="alert">
              {fieldErrors.email}
            </p>
          ) : null}
        </div>

        <div className="adm-signin-field">
          <label className="adm-signin-label" htmlFor="adm-password">
            Senha<span className="adm-signin-required" aria-hidden="true">*</span>
          </label>
          <div className="adm-signin-password">
            <input
              id="adm-password"
              className="adm-signin-control"
              name="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              onBlur={() => validate(["password"])}
              autoComplete="current-password"
              required
              aria-required="true"
              aria-invalid={Boolean(fieldErrors.password)}
              aria-describedby={fieldErrors.password ? "adm-password-error" : undefined}
            />
            <button
              className="adm-signin-toggle"
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              aria-pressed={showPassword}
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
            >
              {showPassword ? "Ocultar" : "Mostrar"}
            </button>
          </div>
          {fieldErrors.password ? (
            <p className="adm-signin-error-text" id="adm-password-error" role="alert">
              {fieldErrors.password}
            </p>
          ) : null}
        </div>

        <button className="adm-signin-btn" type="submit" disabled={loading}>
          {loading ? "Entrando…" : "Entrar"}
        </button>
      </form>

      <div className="adm-signin-foot">
        <Link className="adm-signin-link" to="/signin/lojista">
          Acesso do lojista
        </Link>
      </div>
    </AuthSplitLayout>
  );
}

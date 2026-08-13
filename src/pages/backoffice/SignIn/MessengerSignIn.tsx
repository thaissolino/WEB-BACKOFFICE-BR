import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthBackoffice } from "../../../hooks/authBackoffice";
import petStoreLogo from "../../../assets/icons/pet-store-logo.png";
import "./messenger-signin.css";

export function MessengerSignIn() {
  const navigate = useNavigate();
  const { onSignIn } = useAuthBackoffice();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = "Pet Store · Portal Administrativo";
  }, []);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const onMessage = (event: MessageEvent) => {
      if (event.data?.type !== "RELOAD_PAGE") return;

      const hasReloaded = sessionStorage.getItem("sw-reload-done") === "1";
      if (hasReloaded) return;

      sessionStorage.setItem("sw-reload-done", "1");

      const toast = document.createElement("div");
      toast.className = "messenger-signin-toast";
      toast.setAttribute("role", "status");
      toast.innerHTML = `<div class="messenger-signin-toast-inner">Nova versão disponível! Atualizando...<div class="messenger-signin-toast-bar"></div></div>`;
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

  async function handleForm(e: FormEvent) {
    e.preventDefault();

    if (!(email.trim().length > 0 && password.trim().length > 0)) {
      setErrorMessage("Preencha todos os campos!");
      return;
    }

    const emailLower = email.trim().toLowerCase();

    try {
      setLoading(true);
      setErrorMessage("");
      await onSignIn({ email: emailLower, password });
      setTimeout(() => navigate("/backoffice"), 0);
    } catch (err: any) {
      setErrorMessage(err?.message || "Erro ao realizar login. Verifique suas credenciais.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700&family=Exo+2:wght@400;600&display=swap"
        rel="stylesheet"
      />

      <div className="messenger-signin">
        <div className="messenger-signin-card">
          <div className="messenger-signin-brand">
            <img src={petStoreLogo} alt="Pet Store Logo" className="messenger-signin-logo" />
            <h2 className="messenger-signin-hello">
              Bem-vindo ao <br /> <span className="messenger-signin-pet">Pet Store</span>
            </h2>
            <p className="messenger-signin-tagline">Mensagens criptografadas ponta a ponta.</p>
            <h2 className="messenger-signin-portal">Portal Administrativo</h2>
          </div>

          {errorMessage ? (
            <div className="messenger-signin-alert" role="alert">
              {errorMessage}
            </div>
          ) : null}

          <form className="messenger-signin-form" onSubmit={handleForm}>
            <div className="messenger-signin-fields">
              <label htmlFor="messenger-email" className="sr-only">
                Email
              </label>
              <input
                id="messenger-email"
                className="messenger-signin-control"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Email"
                autoComplete="username"
              />
              <div className="messenger-signin-password">
                <label htmlFor="messenger-password" className="sr-only">
                  Senha
                </label>
                <input
                  id="messenger-password"
                  className="messenger-signin-control"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Senha"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="messenger-signin-toggle"
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  <i className={`fas ${showPassword ? "fa-eye-slash" : "fa-eye"}`}></i>
                </button>
              </div>
            </div>

            <button className="messenger-signin-btn" type="submit" disabled={loading}>
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>
        </div>
        <footer className="messenger-signin-foot">&copy; 2025 Pet Store. Todos os direitos reservados.</footer>
      </div>
    </>
  );
}

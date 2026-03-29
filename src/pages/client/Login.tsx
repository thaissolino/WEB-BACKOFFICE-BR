import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useClientAuth } from "../../hooks/clientAuth";
import "./styles.css";

export default function ClientLogin() {
  const navigate = useNavigate();
  const { clientSignIn } = useClientAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      await clientSignIn({ identifier, password });
      navigate("/client/dashboard");
    } catch (_error) {
      setErrorMessage("Credenciais inválidas. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="client-shell">
      <main className="client-container">
        <section className="client-card client-hero">
          <h1 className="client-title">Login do Cliente</h1>
          <p className="client-subtitle">Entre com e-mail ou username para acessar o painel.</p>

          <form className="client-form" onSubmit={handleSubmit}>
            <label className="client-label">
              E-mail ou username
              <input
                className="client-input"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                placeholder="seu@email.com"
                required
              />
            </label>

            <label className="client-label">
              Senha
              <input
                className="client-input"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="******"
                required
              />
            </label>

            <button className="client-btn client-btn-primary" disabled={isSubmitting} type="submit">
              {isSubmitting ? "Entrando..." : "Entrar"}
            </button>
          </form>

          {errorMessage ? <div className="client-alert client-alert-error">{errorMessage}</div> : null}

          <div className="client-cta-row" style={{ marginTop: 16 }}>
            <Link className="client-btn client-btn-secondary" to="/signup/client">
              Criar conta
            </Link>
            <Link className="client-btn client-btn-secondary" to="/forgot-password">
              Esqueci minha senha
            </Link>
            <Link className="client-btn client-btn-link" to="/">
              Voltar para home
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}

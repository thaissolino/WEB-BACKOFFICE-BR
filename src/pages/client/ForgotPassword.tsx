import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { useClientAuth } from "../../hooks/clientAuth";
import "./styles.css";

export default function ClientForgotPassword() {
  const { clientForgotPassword } = useClientAuth();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsSubmitting(true);

    try {
      await clientForgotPassword(email);
      setMessage("Solicitação enviada. Verifique seu e-mail.");
    } catch (_error) {
      setMessage("Solicitação enviada. Verifique seu e-mail.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="client-shell">
      <main className="client-container">
        <section className="client-card client-hero">
          <h1 className="client-title">Esqueci minha senha</h1>
          <p className="client-subtitle">
            Informe seu e-mail para iniciar o fluxo de recuperação.
          </p>

          <form className="client-form" onSubmit={handleSubmit}>
            <label className="client-label">
              E-mail
              <input
                className="client-input"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>

            <button className="client-btn client-btn-primary" disabled={isSubmitting} type="submit">
              {isSubmitting ? "Enviando..." : "Enviar recuperação"}
            </button>
          </form>

          {message ? <div className="client-alert client-alert-success">{message}</div> : null}

          <div className="client-cta-row" style={{ marginTop: 16 }}>
            <Link className="client-btn client-btn-secondary" to="/signin/client">
              Voltar para login
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

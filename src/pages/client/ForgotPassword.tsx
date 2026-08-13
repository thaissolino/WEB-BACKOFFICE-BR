import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { useClientAuth } from "../../hooks/clientAuth";
import { VitrineAuthLayout } from "./vitrine/VitrineAuthLayout";
import { VitrineField } from "./vitrine/VitrineField";

export default function ClientForgotPassword() {
  const { clientForgotPassword } = useClientAuth();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      await clientForgotPassword(email.trim());
      setMessage("Se o e-mail existir na base, você recebe as instruções de recuperação.");
    } catch (_err) {
      setMessage("Se o e-mail existir na base, você recebe as instruções de recuperação.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <VitrineAuthLayout
      title="Recuperar acesso."
      lede="Informe o e-mail da conta. Não revelamos se o endereço está cadastrado."
    >
      <form className="vitrine-form" onSubmit={handleSubmit} noValidate>
        {message ? (
          <p className="vitrine-alert" data-tone="success" role="status">
            {message}
          </p>
        ) : null}

        <VitrineField
          id="forgot-email"
          label="E-mail"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          required
          requiredMark
          error={error}
        />

        <button className="vitrine-btn" disabled={isSubmitting} type="submit">
          {isSubmitting ? "Enviando..." : "Enviar recuperação"}
        </button>
      </form>

      <div className="vitrine-foot">
        <Link className="vitrine-link" to="/signin/client">
          Voltar para o login
        </Link>
      </div>
    </VitrineAuthLayout>
  );
}

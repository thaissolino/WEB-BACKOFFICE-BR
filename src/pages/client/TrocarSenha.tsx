import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, parseError } from "../../services/api";
import { useClientAuth } from "../../hooks/clientAuth";
import { VitrineAuthLayout } from "./vitrine/VitrineAuthLayout";

/**
 * Troca de senha do lojista no PDV.
 * Usada no primeiro acesso (senha provisória gerada pela Central) e
 * disponível para troca voluntária.
 */
export default function TrocarSenhaCliente() {
  const navigate = useNavigate();
  const { client } = useClientAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const firstAccess = Boolean(client?.mustChangePassword);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    if (newPassword.length < 6) {
      setErrorMessage("A nova senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage("A confirmação não confere com a nova senha.");
      return;
    }
    setIsSubmitting(true);
    try {
      await api.post("/clients/change-password", { currentPassword, newPassword });
      navigate("/client/dashboard");
    } catch (err) {
      const parsed = parseError(err);
      setErrorMessage(parsed.friend || parsed.message || "Não foi possível trocar a senha.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <VitrineAuthLayout
      title={firstAccess ? "Primeiro acesso: troque sua senha." : "Trocar senha."}
      lede={
        firstAccess
          ? "Por segurança, defina uma senha nova antes de usar o PDV. Use a senha provisória recebida por e-mail como senha atual."
          : "Defina uma nova senha para a sua conta de lojista."
      }
    >
      <form className="vitrine-form" onSubmit={handleSubmit} noValidate>
        {errorMessage ? (
          <p className="vitrine-alert" role="alert">
            {errorMessage}
          </p>
        ) : null}

        <div className="vitrine-field">
          <label className="vitrine-label" htmlFor="current-password">
            Senha atual<span className="vitrine-required" aria-hidden="true">*</span>
          </label>
          <input
            id="current-password"
            className="vitrine-control"
            type="password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
        </div>

        <div className="vitrine-field">
          <label className="vitrine-label" htmlFor="new-password">
            Nova senha<span className="vitrine-required" aria-hidden="true">*</span>
          </label>
          <input
            id="new-password"
            className="vitrine-control"
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            autoComplete="new-password"
            required
          />
        </div>

        <div className="vitrine-field">
          <label className="vitrine-label" htmlFor="confirm-password">
            Confirmar nova senha<span className="vitrine-required" aria-hidden="true">*</span>
          </label>
          <input
            id="confirm-password"
            className="vitrine-control"
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            autoComplete="new-password"
            required
          />
        </div>

        <button className="vitrine-btn" disabled={isSubmitting} type="submit">
          {isSubmitting ? "Salvando..." : "Salvar nova senha"}
        </button>
      </form>
    </VitrineAuthLayout>
  );
}

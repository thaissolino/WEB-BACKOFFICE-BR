import { FormEvent, useState } from "react";
import { useAuthBackoffice } from "../../hooks/authBackoffice";
import { BrToast, PremiumStage } from "../../components/premium/PremiumStage";
import { api } from "../../services/api";

export default function PremiumProfile() {
  const { user } = useAuthBackoffice();
  const [formData, setFormData] = useState({
    userId: user?.id || "",
    name: user?.name || "",
    email: user?.email || "",
    password: "",
    confirmPassword: "",
    accessPassword: "",
    status: user?.status || "ACTIVE",
  });
  const [toast, setToast] = useState({ open: false, message: "" });
  const [loading, setLoading] = useState(false);
  const passwordsMatch = Boolean(formData.password && formData.password === formData.confirmPassword);

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      await api.patch(`/users_operators/${user?.id}`, {
        id: user?.id,
        name: formData.name,
        email: formData.email,
        status: formData.status,
        lastAccess: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...(formData.password ? { password: formData.password } : {}),
        ...(formData.accessPassword ? { accessPassword: formData.accessPassword } : {}),
      });
      localStorage.setItem("@backoffice:user", JSON.stringify({ ...user, name: formData.name, email: formData.email }));
      setToast({ open: true, message: "Perfil atualizado com sucesso!" });
    } catch {
      setToast({ open: true, message: "Erro ao atualizar perfil. Tente novamente." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <PremiumStage
      title="Perfil"
      hint="Seus dados no backoffice. Senha em branco mantém a atual."
      actions={
        <button className="br-btn br-btn-brass" type="submit" form="perfil-form" disabled={loading}>
          {loading ? "Salvando..." : "Guardar perfil"}
        </button>
      }
    >
      <form id="perfil-form" className="br-panel" onSubmit={handleSave}>
        <h2>Dados da conta</h2>
        <div className="br-grid two">
          <label className="br-field">
            <span>Nome</span>
            <input
              name="name"
              autoComplete="name"
              required
              value={formData.name}
              onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
            />
          </label>
          <label className="br-field">
            <span>Email</span>
            <input
              type="email"
              name="email"
              autoComplete="email"
              required
              value={formData.email}
              onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
            />
          </label>
          <label className="br-field">
            <span>Nova senha</span>
            <input
              type="password"
              autoComplete="new-password"
              value={formData.password}
              onChange={(e) => setFormData((p) => ({ ...p, password: e.target.value }))}
            />
          </label>
          <label className="br-field">
            <span>Confirmar senha</span>
            <input
              type="password"
              autoComplete="new-password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData((p) => ({ ...p, confirmPassword: e.target.value }))}
            />
            {formData.password && formData.confirmPassword ? (
              <small data-bad={passwordsMatch ? "false" : "true"}>
                {passwordsMatch ? "As senhas coincidem" : "As senhas não coincidem"}
              </small>
            ) : null}
          </label>
        </div>
        <div className="br-grid" style={{ marginTop: 12 }}>
          <label className="br-field">
            <span>Senha de acesso</span>
            <input
              type="password"
              value={formData.accessPassword}
              onChange={(e) => setFormData((p) => ({ ...p, accessPassword: e.target.value }))}
            />
          </label>
        </div>
      </form>
      <BrToast open={toast.open} message={toast.message} onClose={() => setToast({ open: false, message: "" })} />
    </PremiumStage>
  );
}

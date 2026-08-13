import { FormEvent, useState } from "react";
import { BrToast, PremiumStage } from "../../components/premium/PremiumStage";
import { api } from "../../services/api";

type FormValues = {
  name: string;
  userName: string;
  hardPassword: string;
  password: string;
  confirmPassword: string;
};

const initialValues: FormValues = {
  name: "",
  hardPassword: "",
  userName: "",
  password: "",
  confirmPassword: "",
};

export default function PremiumFormUser() {
  const [values, setValues] = useState<FormValues>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof FormValues, string>>>({});
  const [loading, setLoading] = useState(false);
  const [lastUser, setLastUser] = useState<FormValues | null>(null);
  const [toast, setToast] = useState({ open: false, message: "" });

  const generateRandomPassword = () => Math.random().toString(36).slice(-8);
  const generateRandomNickname = () => `@${Math.random().toString(36).slice(2, 8)}`;

  function setField(key: keyof FormValues, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function validate(next: FormValues) {
    const nextErrors: Partial<Record<keyof FormValues, string>> = {};
    if (!next.name) nextErrors.name = "Nome é obrigatório";
    if (!next.userName) nextErrors.userName = "Nome de usuário é obrigatório";
    else if (!/^[a-zA-Z0-9_@.\-]+$/.test(next.userName)) {
      nextErrors.userName = "Apenas letras, números, _, @, . e - sem espaços";
    }
    if (!next.hardPassword) nextErrors.hardPassword = "obrigatório";
    if (!next.password) nextErrors.password = "A senha é obrigatória";
    if (!next.confirmPassword) nextErrors.confirmPassword = "Confirmar senha é obrigatório";
    else if (next.confirmPassword !== next.password) nextErrors.confirmPassword = "As senhas devem coincidir";
    return nextErrors;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const nextErrors = validate(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setLoading(true);
    try {
      await api.post("/graphic/create", {
        name: values.name,
        userName: values.userName.trim().toLowerCase(),
        hardPassword: values.hardPassword,
        password_hash: values.password,
      });
      setLastUser(values);
      setValues(initialValues);
      setToast({ open: true, message: "Usuário criado com sucesso!" });
    } catch {
      setToast({ open: true, message: "Erro ao criar usuário!" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <PremiumStage title="Nova conta" hint="Abre uma conta gráfica. Gere senha e apelido se não quiser inventar.">
      <form className="br-panel" onSubmit={handleSubmit}>
        <h2>Identidade</h2>
        {lastUser ? (
          <div className="br-banner">
            <strong>Última conta criada</strong>
            <span>
              {lastUser.name} · {lastUser.userName} · senha {lastUser.password}
            </span>
          </div>
        ) : null}
        <div className="br-grid two">
          <label className="br-field">
            <span>Nome *</span>
            <input value={values.name} onChange={(e) => setField("name", e.target.value)} />
            {errors.name ? <small data-bad="true">{errors.name}</small> : null}
          </label>
          <label className="br-field">
            <span>Apelido *</span>
            <input value={values.userName} onChange={(e) => setField("userName", e.target.value.replace(/\s/g, ""))} />
            {errors.userName ? <small data-bad="true">{errors.userName}</small> : null}
          </label>
          <label className="br-field">
            <span>Senha de exclusão *</span>
            <input value={values.hardPassword} onChange={(e) => setField("hardPassword", e.target.value)} />
            {errors.hardPassword ? <small data-bad="true">{errors.hardPassword}</small> : null}
          </label>
          <label className="br-field">
            <span>Senha *</span>
            <input value={values.password} onChange={(e) => setField("password", e.target.value)} />
            {errors.password ? <small data-bad="true">{errors.password}</small> : null}
          </label>
          <label className="br-field">
            <span>Confirmar senha *</span>
            <input value={values.confirmPassword} onChange={(e) => setField("confirmPassword", e.target.value)} />
            {errors.confirmPassword ? <small data-bad="true">{errors.confirmPassword}</small> : null}
          </label>
        </div>
        <div className="br-actions" style={{ marginTop: 14 }}>
          <button
            className="br-btn"
            type="button"
            onClick={() => {
              const randomPassword = generateRandomPassword();
              setValues((current) => ({ ...current, password: randomPassword, confirmPassword: randomPassword }));
            }}
          >
            Gerar senha
          </button>
          <button className="br-btn" type="button" onClick={() => setField("hardPassword", generateRandomPassword())}>
            Gerar exclusão
          </button>
          <button className="br-btn" type="button" onClick={() => setField("userName", generateRandomNickname())}>
            Gerar apelido
          </button>
          <button className="br-btn br-btn-brass" type="submit" disabled={loading}>
            {loading ? "Criando..." : "Criar conta"}
          </button>
        </div>
      </form>
      <BrToast open={toast.open} message={toast.message} onClose={() => setToast({ open: false, message: "" })} />
    </PremiumStage>
  );
}

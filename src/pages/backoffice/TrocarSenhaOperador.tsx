import { FormEvent, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { api, parseError } from "../../services/api";
import "../form-operators/operators.css";

export default function TrocarSenhaOperador({ voluntaria = false }: { voluntaria?: boolean }) {
  const [senha, setSenha] = useState("");
  const [confirma, setConfirma] = useState("");
  const [mostrar, setMostrar] = useState(false);
  const [erro, setErro] = useState("");
  const [pronta, setPronta] = useState(false);
  const [salvando, setSalvando] = useState(false);

  async function salvar(event: FormEvent) {
    event.preventDefault();
    setErro("");
    if (senha.trim().length < 6) {
      setErro("A nova senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    if (senha !== confirma) {
      setErro("A confirmação não confere com a nova senha.");
      return;
    }
    setSalvando(true);
    try {
      await api.post("/auth/backoffice/change-password", { newPassword: senha });
      const salvo = localStorage.getItem("@backoffice:user");
      if (salvo) {
        const user = JSON.parse(salvo);
        user.mustChangePassword = false;
        localStorage.setItem("@backoffice:user", JSON.stringify(user));
      }
      if (voluntaria) {
        setPronta(true);
        setSalvando(false);
        return;
      }
      window.location.href = "/backoffice";
    } catch (err) {
      const parsed = parseError(err);
      setErro(parsed.friend || parsed.message || "Não foi possível trocar a senha.");
      setSalvando(false);
    }
  }

  return (
    <div className="op-page">
      <form className="op-troca" onSubmit={salvar}>
        <h1>{voluntaria ? "Alterar senha" : "Primeiro acesso"}</h1>
        <p>{voluntaria ? "Escolha a senha que você vai usar para entrar." : "Troque a senha provisória antes de entrar no painel."}</p>
        {pronta ? <p className="op-senha-ok" role="status">Senha alterada.</p> : null}
        {erro ? <p className="op-troca-erro" role="alert">{erro}</p> : null}
        <label className="op-field">
          <span>Nova senha</span>
          <span className="op-secret">
            <input type={mostrar ? "text" : "password"} value={senha} autoComplete="new-password" onChange={(event) => setSenha(event.target.value)} />
            <button className="op-eye" type="button" aria-label={mostrar ? "Ocultar senha" : "Mostrar senha"} onClick={() => setMostrar((atual) => !atual)}>
              {mostrar ? <Eye size={16} /> : <EyeOff size={16} />}
            </button>
          </span>
        </label>
        <label className="op-field">
          <span>Confirmar senha</span>
          <span className="op-secret">
            <input type={mostrar ? "text" : "password"} value={confirma} autoComplete="new-password" onChange={(event) => setConfirma(event.target.value)} />
          </span>
        </label>
        <button className="op-btn op-btn-ink" type="submit" disabled={salvando || pronta}>{salvando ? "Salvando…" : "Salvar senha"}</button>
      </form>
    </div>
  );
}

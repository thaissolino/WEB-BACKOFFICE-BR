import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useClientAuth } from "../../hooks/clientAuth";
import "./styles.css";

type ClientSex = "MASCULINO" | "FEMININO" | "OUTRO";

export default function ClientRegister() {
  const navigate = useNavigate();
  const { clientRegister } = useClientAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [document, setDocument] = useState("");
  const [age, setAge] = useState("");
  const [sex, setSex] = useState<ClientSex>("OUTRO");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      await clientRegister({
        name,
        email,
        password,
        username,
        document,
        age: Number(age),
        sex,
      });
      navigate("/signin/client");
    } catch (_error) {
      setErrorMessage("Não foi possível criar a conta. Verifique os dados e tente de novo.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="client-shell">
      <main className="client-container">
        <section className="client-card client-hero">
          <h1 className="client-title">Cadastro do Cliente</h1>
          <p className="client-subtitle">Preencha os dados iniciais para acessar o PDV.</p>

          <form className="client-form" onSubmit={handleSubmit}>
            <label className="client-label">
              Nome
              <input
                className="client-input"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </label>

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

            <label className="client-label">
              Username
              <input
                className="client-input"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                required
              />
            </label>

            <label className="client-label">
              Documento
              <input
                className="client-input"
                value={document}
                onChange={(event) => setDocument(event.target.value)}
                required
              />
            </label>

            <label className="client-label">
              Idade
              <input
                className="client-input"
                type="number"
                min={0}
                value={age}
                onChange={(event) => setAge(event.target.value)}
                required
              />
            </label>

            <label className="client-label">
              Sexo
              <select
                className="client-select"
                value={sex}
                onChange={(event) => setSex(event.target.value as ClientSex)}
              >
                <option value="MASCULINO">Masculino</option>
                <option value="FEMININO">Feminino</option>
                <option value="OUTRO">Outro</option>
              </select>
            </label>

            <label className="client-label">
              Senha
              <input
                className="client-input"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>

            <button className="client-btn client-btn-primary" disabled={isSubmitting} type="submit">
              {isSubmitting ? "Criando conta..." : "Criar conta"}
            </button>
          </form>

          {errorMessage ? <div className="client-alert client-alert-error">{errorMessage}</div> : null}

          <div className="client-cta-row" style={{ marginTop: 16 }}>
            <Link className="client-btn client-btn-secondary" to="/signin/client">
              Já tenho conta
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

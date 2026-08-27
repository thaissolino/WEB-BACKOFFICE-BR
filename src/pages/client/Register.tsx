import { FormEvent, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useClientAuth } from "../../hooks/clientAuth";
import { VitrineAuthLayout } from "./vitrine/VitrineAuthLayout";
import { VitrineField } from "./vitrine/VitrineField";
import { digitsOnly, type PdvSignupFields } from "./vitrine/signupConfig";
import { usePdvSignupConfig } from "./vitrine/usePdvSignupConfig";

type ClientSex = "MASCULINO" | "FEMININO" | "OUTRO";
type FieldErrors = Partial<Record<"name" | "email" | "password" | "username" | "document" | "age" | "sex", string>>;

export default function ClientRegister() {
  const navigate = useNavigate();
  const { clientRegister } = useClientAuth();
  const config = usePdvSignupConfig();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState("");
  const [document, setDocument] = useState("");
  const [age, setAge] = useState("");
  const [sex, setSex] = useState<ClientSex | "">("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const fields: PdvSignupFields = config?.fields ?? {
    name: true,
    username: true,
    age: false,
    sex: false,
  };
  const byDocument = config?.loginIdentifier === "DOCUMENT";

  const visibleCount = useMemo(() => {
    return 2 + Object.values(fields).filter(Boolean).length;
  }, [fields]);

  function validateVisible() {
    const next: FieldErrors = {};
    if (byDocument) {
      const digits = digitsOnly(document);
      if (digits.length !== 11 && digits.length !== 14) {
        next.document = "Informe um CPF (11 dígitos) ou CNPJ (14 dígitos).";
      }
    } else if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      next.email = "Informe um e-mail válido.";
    }
    if (password.length < 6) {
      next.password = "A senha precisa ter pelo menos 6 caracteres.";
    }
    if (fields.name && name.trim().length < 2) {
      next.name = "Informe o nome com pelo menos 2 caracteres.";
    }
    if (fields.username && username.trim().length < 3) {
      next.username = "O usuário precisa ter pelo menos 3 caracteres.";
    }
    if (fields.age) {
      const parsed = Number(age);
      if (!age.trim() || Number.isNaN(parsed) || parsed < 0) {
        next.age = "Informe a idade.";
      }
    }
    if (fields.sex && !sex) {
      next.sex = "Selecione uma opção.";
    }
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    if (!config || !validateVisible()) return;

    setIsSubmitting(true);
    try {
      await clientRegister({
        name: fields.name ? name.trim() : undefined,
        email: byDocument ? undefined : email.trim(),
        password,
        username: fields.username ? username.trim() : undefined,
        document: byDocument ? digitsOnly(document) : undefined,
        age: fields.age ? Number(age) : undefined,
        sex: fields.sex ? (sex as ClientSex) : undefined,
      });
      navigate("/signin/lojista");
    } catch (_error) {
      setErrorMessage(
        byDocument
          ? "Não foi possível criar a conta. Esse documento ou usuário pode já existir."
          : "Não foi possível criar a conta. Esse e-mail ou usuário pode já existir.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <VitrineAuthLayout
      title="Abra sua conta."
      lede={
        byDocument
          ? "Cadastro com CPF/CNPJ e senha. Só pedimos o que a loja habilitou."
          : "Cadastro com e-mail e senha. Só pedimos o que a loja habilitou."
      }
    >
      {!config ? (
        <div className="vitrine-skeleton" aria-busy="true" aria-live="polite">
          <span />
          <span />
          <span />
        </div>
      ) : (
        <form className="vitrine-form" onSubmit={handleSubmit} noValidate>
          {errorMessage ? (
            <p className="vitrine-alert" role="alert">
              {errorMessage}
            </p>
          ) : null}

          {fields.name ? (
            <VitrineField
              id="signup-name"
              label="Nome"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="name"
              required
              requiredMark
              error={fieldErrors.name}
            />
          ) : null}

          {byDocument ? (
            <VitrineField
              id="signup-document"
              label="CPF/CNPJ"
              value={document}
              onChange={(event) => setDocument(event.target.value)}
              autoComplete="off"
              inputMode="numeric"
              required
              requiredMark
              hint="Este será o login da conta. O e-mail fica interno."
              error={fieldErrors.document}
            />
          ) : (
            <VitrineField
              id="signup-email"
              label="E-mail"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
              requiredMark
              hint={!fields.username ? "Se o usuário estiver oculto, geramos um a partir deste e-mail." : undefined}
              error={fieldErrors.email}
            />
          )}

          {fields.username ? (
            <VitrineField
              id="signup-username"
              label="Usuário"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              required
              requiredMark
              error={fieldErrors.username}
            />
          ) : null}

          {fields.age ? (
            <VitrineField
              id="signup-age"
              label="Idade"
              type="number"
              min={0}
              inputMode="numeric"
              value={age}
              onChange={(event) => setAge(event.target.value)}
              required
              requiredMark
              error={fieldErrors.age}
            />
          ) : null}

          {fields.sex ? (
            <VitrineField
              as="select"
              id="signup-sex"
              label="Sexo"
              value={sex}
              onChange={(event) => setSex(event.target.value as ClientSex | "")}
              required
              requiredMark
              error={fieldErrors.sex}
            >
              <option value="">Selecione</option>
              <option value="MASCULINO">Masculino</option>
              <option value="FEMININO">Feminino</option>
              <option value="OUTRO">Outro</option>
            </VitrineField>
          ) : null}

          <div className="vitrine-field">
            <label className="vitrine-label" htmlFor="signup-password">
              Senha <span className="vitrine-required" aria-hidden="true">*</span>
            </label>
            <div className="vitrine-password-wrap">
              <input
                id="signup-password"
                className="vitrine-control"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
                required
                aria-required="true"
                aria-invalid={Boolean(fieldErrors.password)}
                aria-describedby={fieldErrors.password ? "signup-password-error" : "signup-password-hint"}
              />
              <button
                className="vitrine-password-toggle"
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                aria-pressed={showPassword}
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              >
                {showPassword ? "Ocultar" : "Mostrar"}
              </button>
            </div>
            <p className="vitrine-hint" id="signup-password-hint">
              Mínimo de 6 caracteres. {visibleCount} campos nesta loja.
            </p>
            {fieldErrors.password ? (
              <p className="vitrine-error-text" id="signup-password-error" role="alert">
                {fieldErrors.password}
              </p>
            ) : null}
          </div>

          <button className="vitrine-btn" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Criando conta..." : "Abrir minha conta"}
          </button>
        </form>
      )}

      <div className="vitrine-foot">
        <Link className="vitrine-link" to="/signin/lojista">
          Já tenho conta
        </Link>
      </div>
    </VitrineAuthLayout>
  );
}

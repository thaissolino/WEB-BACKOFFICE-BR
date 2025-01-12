import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthBackoffice } from "../../../hooks/authBackoffice";
import blackRabbitLogo from "../../../assets/icons/black-rabbit-logo.jpg"; // Atualize com o caminho do logo apropriado

export function SignIn() {
  const navigate = useNavigate();
  const { onSignIn } = useAuthBackoffice();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleForm(e: FormEvent) {
    e.preventDefault();
  
    if (!(email.trim().length > 0 && password.trim().length > 0)) {
      alert("Preencha todos os campos!");
      return; // Impede o envio se os campos estiverem vazios
    }
  
    try {
      await onSignIn({ email, password });
      localStorage.setItem("@backofficev2:token", "fakeToken");
      navigate("/backoffice");
    } catch (err) {
      setErrorMessage("Erro ao realizar login. Verifique suas credenciais.");
      console.error(err);
    }
  }
  

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700&family=Exo+2:wght@400;600&display=swap"
        rel="stylesheet"
      />

      <div className="flex min-h-screen items-center justify-center bg-gradient-to-r from-gray-800 via-gray-900 to-black px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8 bg-white rounded-lg shadow-xl p-8">
          <div className="text-center">
            <img src={blackRabbitLogo} alt="Black Rabbit Logo" className="mx-auto h-16 w-auto" />
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900" style={{ fontFamily: "Orbitron, sans-serif" }}>
              Bem-vindo ao <br/> <span className="text-indigo-500">Black Rabbit</span>
            </h2>
            <p
              className="mt-2 text-sm text-gray-600"
              style={{
                fontFamily: "Exo 2, sans-serif",
                fontWeight: 400,
                letterSpacing: "0.05em",
              }}
            >
              Mensagens criptografadas ponta a ponta.
            </p>
            <h2 className="mt-6 text-2xl font-bold text-gray-700" style={{ fontFamily: "Orbitron, sans-serif" }}>
              Portal Administrativo
            </h2>
          </div>

          {errorMessage && <div className="text-red-500 text-sm font-medium text-center">{errorMessage}</div>}

          <form className="mt-8 space-y-6" onSubmit={handleForm}>
            <div className="-space-y-px rounded-md shadow-sm">
              <div>
                <label htmlFor="email" className="sr-only">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="Email"
                  className="relative block w-full appearance-none rounded-t-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="password" className="sr-only">
                  Senha
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Senha"
                  className="relative block w-full appearance-none rounded-b-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                className="group relative flex w-full justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                Entrar
              </button>
            </div>
          </form>
        </div>
        <footer className="fixed bottom-0 w-full text-center py-2 bg-gray-800 text-white">
          &copy; 2025 Black Rabbit. Todos os direitos reservados.
        </footer>
      </div>
    </>
  );
}

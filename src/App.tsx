import { Hooks } from "./hooks";
// import { useEffect } from "react";
import { Router } from "./routes/authenticatedRoutes";

import { useEffect, useState } from "react";
import "./styles/index.css";

function App() {

// // Verifica se é um recarregamento de página
// window.addEventListener("load", () => {
//   // Verifica se é a primeira vez que a página está carregando após o fechamento/recarga
//   const isReloading = sessionStorage.getItem("isReloading");

//   if (!isReloading) {
//     // Se não for um recarregamento, limpa o localStorage
//     localStorage.removeItem("@stricv2:token");
//     localStorage.removeItem("@stricv2:account");
//     localStorage.removeItem("@stricv2:user");
//     localStorage.removeItem("@backoffice:user");
//     localStorage.removeItem("@backoffice:token");
//   }

//   // Após o carregamento da página, marca que ocorreu um recarregamento
//   sessionStorage.setItem("isReloading", "true");
// });

// // Marca o recarregamento da página antes de sair ou recarregar
// window.addEventListener("beforeunload", () => {
//   // Marcar o recarregamento para a próxima vez
//   sessionStorage.setItem("isReloading", "true");
// });

  //  const [effectExecuted, setEffectExecuted] = useState(false);
  // useEffect(() => {
  //   const handleUnload = () => {
  //     localStorage.removeItem("@stricv2:token");
  //     localStorage.removeItem("@stricv2:account");
  //     localStorage.removeItem("@stricv2:user");
  //     localStorage.removeItem("@backoffice:user");
  //     localStorage.removeItem("@backoffice:token");
  //   };

  //    window.addEventListener("unload", handleUnload);

  //    return () => {
  //     window.removeEventListener("unload", handleUnload);
  //  };
  // }, []);

  // app.js ou index.js

  // useEffect(() => {
    // Limpar o localStorage ao carregar a página
    // localStorage.removeItem("@stricv2:token");
   // localStorage.removeItem("@stricv2:account");
   // localStorage.removeItem("@stricv2:user");
  //  localStorage.removeItem("@backoffice:user");
   // localStorage.removeItem("@backoffice:token");

    // Verificar se o token não está mais presente
    // const token = localStorage.getItem("@stricv2:token");
    // if (!token) {
      // Não há necessidade de redirecionamento, apenas limpar o localStorage
      // O usuário permanecerá na página atual
    // }
  // }, [setEffectExecuted]); // Agora o efeito é executado uma vez ao carregar a página

  return (
    <>
      <Hooks>
        <Router />
      </Hooks>
    </>
  );
}

export default App;

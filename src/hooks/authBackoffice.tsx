import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useRef,
} from "react";
import { api } from "../services/api";
import IdleTimeoutModal from "./handleSignoutInactivy";

export type User = {
  id: string;
  refId: string;
  name: string;
  email: string;
  document: string;
  role: "MASTER" | "ADMIN" | "OPERATOR" | string;
  type: "LEGAL" | "NATURAL" | string;
  status: "ACTIVE" | "INACTIVE" | string;
  api_key: string;
  accessPassword: string;
  access_token: string | null;
  permissions: {
    [key: string]: {
      enabled: boolean;
      [subPermission: string]: any;
    };
  };
  created_at: string;
  updated_at: string;
};

interface AuthBackofficeContextProps {
  isAuthenticated: boolean;
  onSignIn: (params: { email: string; password: string }) => Promise<void>;
  /** Se true, limpa storage e redireciona para /session-expired/backoffice */
  onLogout: (redirectToSessionExpired?: boolean) => void;
  user: User | undefined;
}

interface AuthBackofficeProviderProps {
  children: React.ReactNode;
}

const AuthBackofficeContext = createContext({} as AuthBackofficeContextProps);

const INACTIVITY_LIMIT = 300000; // 5 minutos

const AuthBackofficeProvider = ({ children }: AuthBackofficeProviderProps) => {
  // Hidrata a sessão do localStorage no primeiro render: com token + user
  // salvos, o usuário permanece logado após um refresh (F5). O initialize()
  // valida o token no backend em seguida e só desloga se ele estiver
  // expirado/inválido (401 / SESSION_EXPIRED).
  const [isAuthenticated, setIsAuthenticate] = useState(() => {
    try {
      return (
        !!localStorage.getItem("@backoffice:token") &&
        !!localStorage.getItem("@backoffice:user")
      );
    } catch {
      return false;
    }
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const lastActivityTimeRef = useRef<number>(Date.now());

  const [user, setUser] = useState<User | undefined>(() => {
    try {
      const userString = localStorage.getItem("@backoffice:user");
      const token = localStorage.getItem("@backoffice:token");

      if (userString && token) {
        const userData = JSON.parse(userString);
        return userData as User;
      }
      return undefined;
    } catch (error) {
      console.error("Erro ao carregar usuário do storage:", error);
      return undefined;
    }
  });

  const onSignIn = async (params: { email: string; password: string }) => {
    try {
      const response = await api.post("/auth/backoffice", params);
      const token = response.data.token;
      const userData = response.data.user;

      setUser(userData);
      localStorage.setItem("@backoffice:token", token);
      localStorage.setItem("@backoffice:user", JSON.stringify(userData));

      const savedToken = localStorage.getItem("@backoffice:token");
      const savedUser = localStorage.getItem("@backoffice:user");
      if (!savedToken || !savedUser) {
        throw new Error("Falha ao persistir os dados tente novamente.");
      }

      // Definir token no client HTTP antes de navegar ou de qualquer request (evita 401 na primeira carga do backoffice)
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;

      setIsAuthenticate(true);
      return response.data;
    } catch (err: any) {
      console.error("[BACKOFFICE_LOGIN] Falha no login:", {
        status: err?.response?.status,
        code: err?.response?.data?.code,
        message: err?.response?.data?.message,
        friend: err?.response?.data?.friend,
      });
      localStorage.removeItem("@backoffice:token");
      delete api.defaults.headers.common["Authorization"];

      const status = err?.response?.status;
      const code = String(err?.response?.data?.code || "").toLowerCase();
      const backendMessage = String(err?.response?.data?.message || "");
      const backendFriend = String(err?.response?.data?.friend || "");
      const fullMessage = `${backendMessage} ${backendFriend}`.toLowerCase();

      if (status === 400 && fullMessage.includes("at least 6")) {
        throw new Error("A senha deve ter no mínimo 6 caracteres.");
      }

      if (code.includes("auth.invalid_credentials")) {
        throw new Error("Credenciais inválidas.");
      }

      if (status === 401 || status === 403) {
        throw new Error("Credenciais inválidas ou acesso não autorizado.");
      }

      if (status === 500) {
        throw new Error("Servidor indisponível no momento. Tente novamente em instantes.");
      }

      throw new Error(backendFriend || backendMessage || "Não foi possível realizar login.");
    }
  };

  const closeModal = useCallback(() => {
    lastActivityTimeRef.current = Date.now();
    setIsModalOpen(false);
  }, []);

  const onLogout = useCallback((redirectToSessionExpired = false) => {
    try {
      localStorage.removeItem("@backoffice:token");
      localStorage.removeItem("@backoffice:account");
      localStorage.removeItem("@backoffice:user");
      localStorage.removeItem("@stricv2:token");
      localStorage.removeItem("@stricv2:account");
      localStorage.removeItem("@stricv2:user");
      sessionStorage.clear();
      delete api.defaults.headers.common["Authorization"];
      setIsAuthenticate(false);
      if (redirectToSessionExpired) {
        const path = window.location.pathname || "";
        if (path.startsWith("/session-expired")) return;
        window.location.href = "/session-expired/backoffice";
      }
    } catch (error) {
      console.error("Erro durante logout:", error);
      localStorage.clear();
      sessionStorage.clear();
      delete api.defaults.headers.common["Authorization"];
      setIsAuthenticate(false);
      if (redirectToSessionExpired) {
        window.location.href = "/session-expired/backoffice";
      }
    }
  }, []);

  let isFetchingAccount = false;

  // Valida a sessão salva no localStorage contra o backend, em QUALQUER rota
  // (antes só validava em paths /backoffice*, o que deslogava o usuário em
  // refresh nas demais telas). Regra: no refresh o usuário só sai do sistema
  // se o token estiver expirado/inválido (401 / SESSION_EXPIRED).
  const initialize = useCallback(async () => {
    const token = localStorage.getItem("@backoffice:token");
    const userString = localStorage.getItem("@backoffice:user");

    if (!token || !userString) {
      // Sem token/user: só desloga e deixa o app redirecionar para login (não manda para session-expired)
      onLogout(false);
      return;
    }

    try {
      const { data } = await api.get("/auth/me/backoffice", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data?.user?.access_token) {
        localStorage.setItem("@backoffice:token", data.user.access_token);
        api.defaults.headers.common["Authorization"] = `Bearer ${data.user.access_token}`;
        if (data.user) {
          setUser(data.user);
          localStorage.setItem("@backoffice:user", JSON.stringify(data.user));
        }
        setIsAuthenticate(true);
      } else {
        // Resposta OK sem novo token: mantém a sessão com o token atual
        setIsAuthenticate(true);
      }
    } catch (err: any) {
      const status = err.response?.status;
      const code = err.response?.data?.code;
      // Token inválido ou sessão expirada ao validar: só desloga e redireciona para login (não para session-expired)
      if (status === 401 || code === "SESSION_EXPIRED") {
        onLogout(false);
      }
      // Erro de rede/servidor (backend fora do ar, timeout etc.): NÃO desloga.
      // O usuário permanece com a sessão local até uma validação definitiva.
    }
  }, [onLogout]);

  useEffect(() => {
    const interceptor = api.interceptors.request.use(
      async function (config: any) {
        const token = localStorage.getItem("@backoffice:token");
        if (token && !config.headers.Authorization) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        if (!token && !isFetchingAccount && !config.url?.includes("/auth/")) {
          isFetchingAccount = true;
          await initialize();
          isFetchingAccount = false;
          const newToken = localStorage.getItem("@backoffice:token");
          if (newToken && !config.headers.Authorization) {
            config.headers.Authorization = `Bearer ${newToken}`;
          }
        }
        return config;
      },
      function (error: any) {
        return Promise.reject(error);
      }
    );
    return () => api.interceptors.request.eject(interceptor);
  }, [initialize]);

  useEffect(() => {
    initialize();
  }, [initialize]);

  // Inatividade: 5 min, modal, redirecionamento para session-expired
  useEffect(() => {
    const currentPath = window.location.pathname || "";
    const isBackofficeRoute = currentPath.startsWith("/backoffice");
    const isPublicRoute =
      currentPath.startsWith("/signin") ||
      currentPath.startsWith("/session-expired") ||
      currentPath.startsWith("/forgot") ||
      currentPath.startsWith("/new-password") ||
      currentPath.startsWith("/privacy") ||
      currentPath.startsWith("/recoveryPassword") ||
      currentPath.startsWith("/create-account") ||
      currentPath.startsWith("/home");

    const CAN_ACTIVATE =
      isAuthenticated &&
      isBackofficeRoute &&
      !isPublicRoute;

    if (!CAN_ACTIVATE) {
      setIsModalOpen(false);
      return;
    }

    lastActivityTimeRef.current = Date.now();

    const handleUserActivity = () => {
      lastActivityTimeRef.current = Date.now();
    };

    const checkForInactivity = () => {
      const timeElapsed = Date.now() - lastActivityTimeRef.current;
      const pathCheck = window.location.pathname || "";
      const stillBackoffice = pathCheck.startsWith("/backoffice");
      const stillPublic =
        pathCheck.startsWith("/signin") ||
        pathCheck.startsWith("/session-expired") ||
        pathCheck.startsWith("/forgot") ||
        pathCheck.startsWith("/new-password") ||
        pathCheck.startsWith("/privacy") ||
        pathCheck.startsWith("/recoveryPassword") ||
        pathCheck.startsWith("/create-account") ||
        pathCheck.startsWith("/home");

      if (!stillBackoffice || stillPublic || !isAuthenticated) {
        setIsModalOpen(false);
        return;
      }
      if (timeElapsed >= INACTIVITY_LIMIT) {
        setIsModalOpen(true);
      }
    };

    window.addEventListener("mousemove", handleUserActivity, { passive: true });
    window.addEventListener("click", handleUserActivity, { passive: true });
    window.addEventListener("keydown", handleUserActivity, { passive: true });
    window.addEventListener("scroll", handleUserActivity, { passive: true });
    const inactivityInterval = setInterval(checkForInactivity, 1000);

    return () => {
      window.removeEventListener("mousemove", handleUserActivity);
      window.removeEventListener("click", handleUserActivity);
      window.removeEventListener("keydown", handleUserActivity);
      window.removeEventListener("scroll", handleUserActivity);
      clearInterval(inactivityInterval);
    };
  }, [isAuthenticated]);

  return (
    <AuthBackofficeContext.Provider
      value={{
        isAuthenticated,
        onLogout,
        onSignIn,
        user,
      }}
    >
      {children}
      {isModalOpen && (
        <IdleTimeoutModal
          isOpen={isModalOpen}
          onClose={closeModal}
          onSignOut={() => onLogout(true)}
        />
      )}
    </AuthBackofficeContext.Provider>
  );
};

const useAuthBackoffice = () => {
  const context = useContext(AuthBackofficeContext);
  if (!context) {
    throw new Error("useAuthBackoffice must be used within AuthBackofficeProvider");
  }
  return context;
};

export { AuthBackofficeProvider, useAuthBackoffice };

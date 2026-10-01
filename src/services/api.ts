import axios, { AxiosError, HeadersDefaults } from 'axios';

export interface CommonHeaderProperties extends HeadersDefaults {
  Authorization: string;
  account: string;
  client: string;
}

export type ErrorType = {
  code: string;
  friend: string;
}

interface ResponseError {
  code: string;
  message: string;
  friend: string;
};


export function parseError(err: any): ResponseError {
  const error = err as AxiosError;

  if (error.response?.data) {
    const dataError = error.response.data as any;
    if (dataError?.message === 'Validation failed') {
      const message = dataError?.validation?.body?.message ||
      dataError?.validation?.params?.message ||
      dataError?.validation?.query?.message;

      return {
        code: 'validation',
        friend: message || "Erro na validação dos campos",
        message: ""
      }
    }

    if (dataError?.message) {
      return {
        code: dataError.code || "",
        message: dataError.message || "",
        friend: dataError.friend || "",
      }
    }

    const errorData = error.response?.data as ResponseError;
    return errorData;
  }

  return {
    code: "",
    message: "",
    friend: ""
  }
}

export const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:3333"
});

function isClientRequest(url: string) {
  return url.includes("/clients/");
}

function onLojistaScreen() {
  const path = window.location.pathname || "";
  return (
    path.startsWith("/client") ||
    path.startsWith("/lojista") ||
    path.startsWith("/vitrine/lojista")
  );
}

/** Na tela do lojista o token é sempre o dele, mesmo com o operador logado no mesmo navegador. */
function tokenForRequest(url: string) {
  if (onLojistaScreen() || isClientRequest(url)) return localStorage.getItem("@client:token");
  return localStorage.getItem("@backoffice:token");
}

// Sempre escolhe o token pelo endereço. O header padrão único misturava operador e lojista.
api.interceptors.request.use(
  (config) => {
    delete api.defaults.headers.common["Authorization"];
    const url = String(config.url || "");
    const token = tokenForRequest(url);
    const headers = config.headers as { set?: (k: string, v: string, rewrite?: boolean) => void; delete?: (k: string) => void; Authorization?: string };
    if (token && typeof headers?.set === "function") {
      headers.set("Authorization", `Bearer ${token}`, true);
    } else if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else if (typeof headers?.delete === "function") {
      headers.delete("Authorization");
    } else if (config.headers) {
      delete config.headers.Authorization;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor de resposta: 401 ou SESSION_EXPIRED
// Session-expired só para quem tinha sessão e ela expirou; sem token (anônimo) → não redirecionar para session-expired
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const code = (error.response?.data as any)?.code;
    const is401 = status === 401 || code === "SESSION_EXPIRED";

    const requestUrl = (error.config?.url || "").toLowerCase();
    const hadAuthHeader = !!(error.config?.headers?.Authorization ?? error.config?.headers?.authorization);
    const isClientCall = isClientRequest(requestUrl);
    const isLoginRequest =
      (requestUrl.includes("/auth/backoffice") && error.config?.method?.toLowerCase() === "post") ||
      requestUrl.includes("/clients/login");
    const isAuthMeRequest = requestUrl.includes("/auth/me/backoffice");
    const currentPath = window.location.pathname || "";
    const isOnSignInPage =
      currentPath.startsWith("/signin/backoffice") ||
      currentPath === "/signin";
    const isOnSessionExpiredPage = currentPath.startsWith("/session-expired");
    const isOnClientPage =
      currentPath.startsWith("/client") ||
      currentPath.startsWith("/signin/lojista") ||
      currentPath.startsWith("/lojista") ||
      currentPath.startsWith("/vitrine/lojista");

    // 401 do lojista não apaga o operador, e o contrário também não.
    if (is401 && hadAuthHeader && !isLoginRequest && isClientCall) {
      localStorage.removeItem("@client:token");
      localStorage.removeItem("@client:user");
      if (isOnClientPage && !currentPath.startsWith("/signin")) {
        window.location.href = "/signin/lojista";
      }
    } else if (
      is401 &&
      hadAuthHeader &&
      !isLoginRequest &&
      !isAuthMeRequest &&
      !isClientCall &&
      !isOnSignInPage &&
      !isOnSessionExpiredPage &&
      !isOnClientPage
    ) {
      localStorage.removeItem("@backoffice:token");
      localStorage.removeItem("@backoffice:user");
      localStorage.removeItem("@backoffice:account");
      delete api.defaults.headers.common["Authorization"];
      window.location.href = "/session-expired/backoffice";
    }
    return Promise.reject(error);
  }
);


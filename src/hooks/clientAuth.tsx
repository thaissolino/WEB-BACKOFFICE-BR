import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { api } from "../services/api";

export type ClientUser = {
  id: string;
  name: string;
  email: string;
  username: string;
  document: string;
  age: number;
  sex: string;
  createdAt: string;
  updatedAt: string;
};

type RegisterClientParams = {
  name: string;
  email: string;
  password: string;
  username: string;
  document: string;
  age: number;
  sex: "MASCULINO" | "FEMININO" | "OUTRO";
};

type ClientAuthContextData = {
  isClientAuthenticated: boolean;
  client: ClientUser | null;
  loadingClient: boolean;
  clientSignIn: (params: { identifier: string; password: string }) => Promise<void>;
  clientRegister: (params: RegisterClientParams) => Promise<void>;
  clientForgotPassword: (email: string) => Promise<void>;
  clientLogout: () => void;
};

const CLIENT_TOKEN_KEY = "@client:token";
const CLIENT_USER_KEY = "@client:user";

const ClientAuthContext = createContext({} as ClientAuthContextData);

export function ClientAuthProvider({ children }: { children: React.ReactNode }) {
  const [client, setClient] = useState<ClientUser | null>(null);
  const [loadingClient, setLoadingClient] = useState(true);

  const clientLogout = useCallback(() => {
    localStorage.removeItem(CLIENT_TOKEN_KEY);
    localStorage.removeItem(CLIENT_USER_KEY);
    setClient(null);
  }, []);

  const clientSignIn = useCallback(
    async ({ identifier, password }: { identifier: string; password: string }) => {
      const { data } = await api.post("/clients/login", { identifier, password });
      localStorage.setItem(CLIENT_TOKEN_KEY, data.token);
      localStorage.setItem(CLIENT_USER_KEY, JSON.stringify(data.client));
      setClient(data.client);
    },
    []
  );

  const clientRegister = useCallback(async (params: RegisterClientParams) => {
    await api.post("/clients/register", params);
  }, []);

  const clientForgotPassword = useCallback(async (email: string) => {
    await api.post("/clients/forgot-password", { email });
  }, []);

  const loadClient = useCallback(async () => {
    const token = localStorage.getItem(CLIENT_TOKEN_KEY);
    const cachedClient = localStorage.getItem(CLIENT_USER_KEY);

    if (!token || !cachedClient) {
      setClient(null);
      setLoadingClient(false);
      return;
    }

    try {
      const { data } = await api.get("/clients/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      localStorage.setItem(CLIENT_USER_KEY, JSON.stringify(data.client));
      setClient(data.client);
    } catch (_error) {
      clientLogout();
    } finally {
      setLoadingClient(false);
    }
  }, [clientLogout]);

  useEffect(() => {
    loadClient();
  }, [loadClient]);

  const value = useMemo(
    () => ({
      isClientAuthenticated: !!client,
      client,
      loadingClient,
      clientSignIn,
      clientRegister,
      clientForgotPassword,
      clientLogout,
    }),
    [client, loadingClient, clientSignIn, clientRegister, clientForgotPassword, clientLogout]
  );

  return <ClientAuthContext.Provider value={value}>{children}</ClientAuthContext.Provider>;
}

export function useClientAuth() {
  const context = useContext(ClientAuthContext);

  if (!context) {
    throw new Error("useClientAuth must be used inside ClientAuthProvider");
  }

  return context;
}

import { create } from "zustand";
import { api } from "../services/api";
import { parseError } from "../utils/parseError";

export type PermissionType = {
  CRIAR_USUARIO: {
    enabled: boolean;
  };
  GERENCIAR_GRUPOS: {
    enabled: boolean;
  };
  GERENCIAR_USUARIOS: {
    enabled: boolean;
  };
  GERENCIAR_OPERADORES: {
    enabled: boolean;
  };
  GERENCIAR_PLANILHAS: {
    enabled: boolean;
  };
  GERENCIAR_INVOICES: {
    enabled: boolean;
    PRODUTOS: boolean;
    FORNECEDORES: boolean;
    FRETEIROS: boolean;
    OUTROS: boolean;
    MEDIA_DOLAR: boolean;
    RELATORIOS: boolean;
    CAIXAS: string[];
    CAIXAS_BR: string[];
  };
  GERENCIAR_TOKENS: {
    enabled: boolean;
    FORNECEDORES: string[];
    RECOLHEDORES: string[];
    OPERAÇÕES: boolean;
    LUCROS: boolean;
    LUCROS_RECOLHEDORES: boolean;
  };
  GERENCIAR_BOLETOS: {
    enabled: boolean;
  };
  GERENCIAR_OPERACOES: {
    enabled: boolean;
  };
};


interface PermissionStore {
  permissions: PermissionType | null;
  isLoading: boolean;
  error: string | null;

  getPermissions: () => Promise<void>;
  updatePermissions: (id: string, data: Permissions) => Promise<void>;
  refreshPermissions: (id: string) => Promise<void>;
}

export const usePermissionStore = create<PermissionStore>((set) => ({
  permissions: null,
  isLoading: false,
  error: null,
  

  getPermissions: async () => {
    set({ isLoading: true, error: null });
    try {
      const datauser = JSON.parse(localStorage.getItem("@backoffice:user") || "{}") || {};
      const response = await api.get(`/get_permission_by_id/${datauser.id}`);
      set({ permissions: response.data, isLoading: false });
    } catch (err) {
      set({ error: parseError(err), isLoading: false });
    }
  },

  updatePermissions: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      await api.patch(`/update_permission/${id}`, data);
      set({ isLoading: false });
    } catch (err) {
      set({ error: parseError(err), isLoading: false });
    }
  },

  refreshPermissions: async (id) => {
    await usePermissionStore.getState().getPermissions();
  },
}));

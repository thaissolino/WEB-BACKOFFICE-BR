import { create } from "zustand";
import { api } from "../services/api";
import { parseError } from "../utils/parseError";

interface PermissionStore {
  permissions: Permissions | null;
  isLoading: boolean;
  error: string | null;

  getPermissions: (id: string) => Promise<void>;
  updatePermissions: (id: string, data: Permissions) => Promise<void>;
  refreshPermissions: (id: string) => Promise<void>;
}

export const usePermissionStore = create<PermissionStore>((set) => ({
  permissions: null,
  isLoading: false,
  error: null,

  getPermissions: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get(`/get_permission_by_id/${id}`);
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
    await usePermissionStore.getState().getPermissions(id);
  },
}));

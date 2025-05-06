import { create } from "zustand";
import { api } from "../services/api";

interface BalanceState {
  balanceGeneral: number | null;
  balanceSupplier: number | null;
  balanceCarrier: number | null;
  balancePartner: number | null;

  getBalanceGeneral: () => Promise<void>;
  getBalanceSupplier: () => Promise<void>;
  getBalanceCarrier: () => Promise<void>;
  getBalancePartner: () => Promise<void>;
}

export const useBalanceStore = create<BalanceState>((set) => ({
  balanceGeneral: null,
  balanceCarrier: null,
  balancePartner: null,
  balanceSupplier: null,

  getBalanceGeneral: async () => {
    try {
      const response = await api.get<{ total: number }>("/balance/general");
      set({ balanceGeneral: response.data.total });
    } catch (err) {
      console.error("Error fetching general balance:", err);
      set({ balanceGeneral: null });
    }
  },

  getBalanceCarrier: async () => {
    try {
      const response = await api.get<{ total: number }>("/balance/carriers");
      set({ balanceCarrier: response.data.total });
    } catch (err) {
      console.error("Error fetching carrier balance:", err);
      set({ balanceCarrier: null });
    }
  },

  getBalancePartner: async () => {
    try {
      const response = await api.get<{ total: number }>("/balance/partners");
      set({ balancePartner: response.data.total });
    } catch (err) {
      console.error("Error fetching partner balance:", err);
      set({ balancePartner: null });
    }
  },

  getBalanceSupplier: async () => {
    try {
      const response = await api.get<{ total: number }>("/balance/suppliers");
      set({ balanceSupplier: response.data.total });
    } catch (err) {
      console.error("Error fetching supplier balance:", err);
      set({ balanceSupplier: null });
    }
  },
}));

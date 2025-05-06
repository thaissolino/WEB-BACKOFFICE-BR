import { create } from "zustand";
import { api } from "../services/api";

interface BalanceState {
  balanceGeneral: number | null;
  balanceSupplier: number | null;
  balanceCarrier: number | null;
  balancePartner: number | null;
  isLoading: boolean;
  error: string | null;

  getBalances: () => Promise<void>;
  calculateGeneralBalance: () => number | null;
}

export const useBalanceStore = create<BalanceState>((set, get) => ({
  balanceGeneral: null,
  balanceCarrier: null,
  balancePartner: null,
  balanceSupplier: null,
  isLoading: false,
  error: null,

  // Método unificado para buscar todos os saldos
  getBalances: async () => {
    set({ isLoading: true, error: null });

    try {
      // Busca paralela para melhor performance
      const [suppliers, carriers, partners] = await Promise.all([
        api.get<{ total: number }>("/balance/suppliers"),
        api.get<{ total: number }>("/balance/carriers"),
        api.get<{ total: number }>("/balance/partners"),
      ]);

      set({
        balanceSupplier: suppliers.data.total,
        balanceCarrier: carriers.data.total,
        balancePartner: partners.data.total,
        isLoading: false,
      });

      // Calcula o saldo geral automaticamente
      get().calculateGeneralBalance();
    } catch (err) {
      console.error("Error fetching balances:", err);
      set({
        error: "Failed to load balance data",
        isLoading: false,
      });
    }
  },

  // Calcula o saldo geral baseado nos saldos específicos
  calculateGeneralBalance: () => {
    const { balanceSupplier, balanceCarrier, balancePartner } = get();

    if (balanceSupplier === null || balanceCarrier === null || balancePartner === null) {
      return null;
    }

    const generalBalance = balanceSupplier + balanceCarrier + balancePartner;
    set({ balanceGeneral: generalBalance });
    return generalBalance;
  },
}));

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Toggle TEMPORÁRIO de layout do painel lojista (/client).
 * - "premium": layout atual do PDV/client.
 * - "classic": layout inspirado no design do módulo gestao-invoices,
 *   mantendo a paleta de cores do premium.
 * Remover este store quando um dos layouts for escolhido em definitivo.
 */
export type PdvLayoutMode = "premium" | "classic";

type PdvLayoutModeState = {
  mode: PdvLayoutMode;
  setMode: (mode: PdvLayoutMode) => void;
};

export const usePdvLayoutMode = create<PdvLayoutModeState>()(
  persist(
    (set) => ({
      mode: "premium",
      setMode: (mode) => set({ mode }),
    }),
    { name: "@client:pdv-layout-mode" },
  ),
);

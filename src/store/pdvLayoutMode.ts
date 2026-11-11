import { create } from "zustand";

/**
 * O painel lojista fica só no layout Premium.
 * O valor antigo no navegador é descartado para não voltar ao Clássico.
 */
export type PdvLayoutMode = "premium" | "classic";

const STORAGE_KEY = "@client:pdv-layout-mode";
if (typeof localStorage !== "undefined") localStorage.removeItem(STORAGE_KEY);

type PdvLayoutModeState = {
  mode: PdvLayoutMode;
};

export const usePdvLayoutMode = create<PdvLayoutModeState>()(() => ({
  mode: "premium",
}));

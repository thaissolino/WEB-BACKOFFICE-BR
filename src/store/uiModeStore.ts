import { create } from "zustand";
import {
  DEFAULT_PAGE_FLAGS,
  DEFAULT_UI_MODE,
  GlobalUiMode,
  PAGE_MODE_KEYS,
  PageModeFlags,
  PageModeKey,
  UI_MODE_SCHEMA_VERSION,
  UiModeSnapshot,
  enableReadyPages,
  isPremiumEnabled,
  storageKeyForUser,
} from "./uiMode";

type UiModeStore = UiModeSnapshot & {
  userId?: string;
  hydrate: (userId?: string) => void;
  setGlobalMode: (mode: GlobalUiMode) => void;
  setPageEnabled: (key: PageModeKey, enabled: boolean) => void;
  isPremiumPage: (key: PageModeKey) => boolean;
};

function readSnapshot(userId?: string): UiModeSnapshot {
  try {
    const raw = localStorage.getItem(storageKeyForUser(userId));
    if (!raw) return { ...DEFAULT_UI_MODE, pages: { ...DEFAULT_PAGE_FLAGS } };
    const parsed = JSON.parse(raw) as Partial<UiModeSnapshot> & { version?: number };
    let pages: PageModeFlags = { ...DEFAULT_PAGE_FLAGS, ...(parsed.pages || {}) };
    if ((parsed.version || 0) < UI_MODE_SCHEMA_VERSION) {
      pages = enableReadyPages(pages);
    }
    return {
      globalMode: parsed.globalMode === "premium" ? "premium" : "classic",
      pages,
    };
  } catch {
    return { ...DEFAULT_UI_MODE, pages: { ...DEFAULT_PAGE_FLAGS } };
  }
}

function writeSnapshot(userId: string | undefined, snapshot: UiModeSnapshot) {
  try {
    localStorage.setItem(
      storageKeyForUser(userId),
      JSON.stringify({ ...snapshot, version: UI_MODE_SCHEMA_VERSION }),
    );
  } catch {
    // ignore quota / private mode
  }
}

export const useUiModeStore = create<UiModeStore>((set, get) => ({
  ...DEFAULT_UI_MODE,
  userId: undefined,
  hydrate: (userId) => {
    const snapshot = readSnapshot(userId);
    set({ ...snapshot, userId });
  },
  setGlobalMode: (globalMode) => {
    const pages =
      globalMode === "premium" ? enableReadyPages(get().pages) : get().pages;
    const next = { globalMode, pages };
    writeSnapshot(get().userId, next);
    set(next);
  },
  setPageEnabled: (key, enabled) => {
    const pages: PageModeFlags = { ...get().pages, [key]: enabled };
    const next = { globalMode: get().globalMode, pages };
    writeSnapshot(get().userId, next);
    set(next);
  },
  isPremiumPage: (key) => isPremiumEnabled(get(), key),
}));

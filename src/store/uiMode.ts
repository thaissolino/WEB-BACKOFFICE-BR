export const PAGE_MODE_KEYS = [
  { key: "dashboard", path: "/backoffice", label: "Dashboard", premiumReady: true },
  { key: "gestorCadastroLojistas", path: "/cadastro-lojistas", label: "Cadastro lojistas", premiumReady: true },
  { key: "gestorCadastroProdutos", path: "/cadastro-produtos", label: "Cadastro produtos", premiumReady: true },
  { key: "gestorGerenciarLojistas", path: "/gerenciar-lojistas", label: "Gerenciar lojistas", premiumReady: true },
  { key: "team", path: "/team", label: "Gerenciar Grupos", premiumReady: true },
  { key: "users", path: "/users", label: "Gerenciar Usuários", premiumReady: true },
  { key: "operators", path: "/operators-management", label: "Gerenciar Operadores", premiumReady: true },
  { key: "invoices", path: "/invoices-management", label: "Gerenciar Invoices", premiumReady: false },
  { key: "tokens", path: "/tokens-management", label: "Gerenciar Tokens", premiumReady: false },
  { key: "createUser", path: "/create-form-user", label: "Criar Usuário", premiumReady: true },
  { key: "pdvConfig", path: "/pdv-config", label: "Config. PDV", premiumReady: true },
  { key: "profile", path: "/meu-perfil-master", label: "Meu Perfil", premiumReady: true },
  { key: "stores", path: "/lojas", label: "Gerenciar lojas", premiumReady: true },
  { key: "storeCreate", path: "/lojas/cadastrar", label: "Cadastrar loja", premiumReady: true },
  { key: "commercialClients", path: "/clientes-comerciais", label: "Gerenciar clientes comerciais", premiumReady: true },
  { key: "commercialClientCreate", path: "/clientes-comerciais/cadastrar", label: "Cadastrar cliente comercial", premiumReady: true },
  { key: "stock", path: "/estoque", label: "Estoque", premiumReady: true },
] as const;

export type PageModeKey = (typeof PAGE_MODE_KEYS)[number]["key"];
export type GlobalUiMode = "classic" | "premium";

export type PageModeFlags = Record<PageModeKey, boolean>;

export type UiModeSnapshot = {
  globalMode: GlobalUiMode;
  pages: PageModeFlags;
};

export const DEFAULT_PAGE_FLAGS: PageModeFlags = {
  dashboard: true,
  gestorCadastroLojistas: true,
  gestorCadastroProdutos: true,
  gestorGerenciarLojistas: true,
  team: true,
  users: true,
  operators: true,
  invoices: false,
  tokens: false,
  createUser: true,
  pdvConfig: true,
  profile: true,
  stores: true,
  storeCreate: true,
  commercialClients: true,
  commercialClientCreate: true,
  stock: true,
};

export const UI_MODE_SCHEMA_VERSION = 4;

export const DEFAULT_UI_MODE: UiModeSnapshot = {
  globalMode: "classic",
  pages: { ...DEFAULT_PAGE_FLAGS },
};

export function storageKeyForUser(userId?: string) {
  return `@backoffice:ui-mode:${userId || "anon"}`;
}

export function isPremiumEnabled(snapshot: UiModeSnapshot, page: PageModeKey) {
  if (snapshot.globalMode !== "premium") return false;
  const meta = PAGE_MODE_KEYS.find((item) => item.key === page);
  if (meta?.premiumReady) return snapshot.pages[page] !== false;
  return snapshot.pages[page] === true;
}

export function enableReadyPages(pages: PageModeFlags): PageModeFlags {
  const next = { ...pages };
  for (const item of PAGE_MODE_KEYS) {
    if (item.premiumReady) next[item.key] = true;
  }
  return next;
}

export function pageKeyFromPath(pathname: string): PageModeKey | null {
  if (pathname.startsWith("/lojas/") && pathname !== "/lojas/cadastrar") return "stores";
  if (pathname.startsWith("/clientes-comerciais/") && pathname !== "/clientes-comerciais/cadastrar") {
    return "commercialClients";
  }
  const match = PAGE_MODE_KEYS.find((item) => item.path === pathname);
  return match?.key ?? null;
}

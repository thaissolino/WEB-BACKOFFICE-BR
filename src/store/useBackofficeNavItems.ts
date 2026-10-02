import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuthBackoffice } from "../hooks/authBackoffice";
import { usePermissionStore } from "./permissionsStore";

export type BackofficeNavChild = {
  id: string;
  label: string;
  to: string;
};

export type BackofficeNavItem = {
  id: string;
  label: string;
  to: string;
  group?: string;
  /** Abre um bloco novo no menu, separado do módulo anterior. */
  moduleStart?: boolean;
  /** Itens do produto antigo (Black/Mensageria): agrupados num bloco colapsado, sem apagar nada. */
  legacy?: boolean;
  children?: BackofficeNavChild[];
};

const LOJISTAS_CHILD: BackofficeNavChild = {
  id: "cadastro-lojistas",
  label: "Lojistas",
  to: "/cadastro-lojistas",
};

const CADASTRO_CHILDREN: BackofficeNavChild[] = [
  { id: "cadastro-produtos", label: "Produtos", to: "/gestao/cadastro?aba=products" },
  { id: "cadastro-fornecedores", label: "Fornecedores", to: "/gestao/cadastro?aba=suppliers" },
  { id: "cadastro-freteiros", label: "Freteiros", to: "/gestao/cadastro?aba=carriers" },
  { id: "cadastro-outros", label: "Outros", to: "/gestao/cadastro?aba=others" },
];

const COMPRAS_CHILDREN: BackofficeNavChild[] = [
  { id: "compras-invoices", label: "Invoices", to: "/gestao/compras?aba=invoices" },
  { id: "compras-dolar", label: "Média dólar", to: "/gestao/compras?aba=media-dolar" },
  { id: "compras-relatorios", label: "Relatórios", to: "/gestao/compras?aba=relatorios" },
  { id: "compras-listas", label: "Lista de compras", to: "/gestao/compras?aba=shopping-lists" },
  { id: "compras-imei", label: "Buscar IMEI", to: "/gestao/compras?aba=imei-search" },
];

const CAIXAS_CHILDREN: BackofficeNavChild[] = [
  { id: "caixas", label: "Caixas", to: "/gestao/caixas?aba=caixas" },
  { id: "caixas-br", label: "Caixas BR", to: "/gestao/caixas?aba=caixas-brl" },
];

export const LEGACY_GROUP_LABEL = "Black / Mensageria (legado)";

export function useBackofficeNavItems() {
  const { user, onLogout } = useAuthBackoffice();
  const { getPermissions, permissions } = usePermissionStore();
  const location = useLocation();

  useEffect(() => {
    getPermissions();
  }, [location.pathname]);

  const canShowTab = (key: string): boolean => {
    if (user?.role === "MASTER") return true;
    switch (key) {
      case "CRIAR_USUARIO":
      case "GERENCIAR_GRUPOS":
      case "GERENCIAR_USUARIOS":
      case "GERENCIAR_OPERADORES":
      case "GERENCIAR_INVOICES":
      case "GERENCIAR_TOKENS":
        return permissions?.[key]?.enabled === true;
      default:
        return false;
    }
  };

  const isGestor = user?.role === "MASTER" || user?.role === "ADMIN";
  const operadoresChild: BackofficeNavChild | null = canShowTab("GERENCIAR_OPERADORES")
    ? { id: "cadastro-operadores", label: "Operadores", to: "/operators-management" }
    : null;

  const items: BackofficeNavItem[] = [
    { id: "home", label: "HOME", to: "/backoffice" },
  ];

  if (isGestor) {
    items.push(
      { id: "gestao-cadastro", label: "Cadastro", to: "/gestao/cadastro", group: "Gestão", children: [LOJISTAS_CHILD, ...CADASTRO_CHILDREN, ...(operadoresChild ? [operadoresChild] : [])] },
      { id: "gestao-compras", label: "Compras", to: "/gestao/compras", group: "Gestão", children: COMPRAS_CHILDREN },
      { id: "gestao-caixas", label: "Gestão de caixas", to: "/gestao/caixas", group: "Gestão", children: CAIXAS_CHILDREN },
    );
  }

  if (!isGestor && canShowTab("GERENCIAR_INVOICES")) {
    items.push({ id: "gestao-cadastro", label: "Cadastro", to: "/gestao/cadastro", children: [...CADASTRO_CHILDREN, ...(operadoresChild ? [operadoresChild] : [])] });
    items.push({ id: "gestao-compras", label: "Compras", to: "/gestao/compras", children: COMPRAS_CHILDREN });
    items.push({ id: "gestao-caixas", label: "Gestão de caixas", to: "/gestao/caixas", children: CAIXAS_CHILDREN });
  }

  const loja: BackofficeNavItem[] = [];
  if (isGestor) {
    loja.push({ id: "gerenciar-lojistas", label: "Gerenciar lojistas", to: "/gerenciar-lojistas" });
  }
  if (isGestor || canShowTab("GERENCIAR_INVOICES")) {
    loja.push({ id: "vendas-concluidas", label: "Vendas concluídas", to: "/vendas-concluidas" });
    loja.push({ id: "etiquetas-entrada", label: "Etiquetas da entrada", to: "/etiquetas-entrada" });
  }
  if (loja[0]) loja[0].moduleStart = true;
  items.push(...loja);

  if (operadoresChild && !items.some((item) => item.id === "gestao-cadastro")) {
    items.push({ id: "gestao-cadastro", label: "Cadastro", to: "/gestao/cadastro", children: [operadoresChild] });
  }

  // Itens do produto antigo (Black/Mensageria): continuam acessíveis,
  // mas agrupados num bloco único e menos destacado. Nada foi apagado.
  if (canShowTab("CRIAR_USUARIO")) {
    items.push({ id: "create-user", label: "Criar Usuário", to: "/create-form-user", group: LEGACY_GROUP_LABEL, legacy: true });
  }
  if (canShowTab("GERENCIAR_GRUPOS")) {
    items.push({ id: "groups", label: "Gerenciar Grupos", to: "/team", group: LEGACY_GROUP_LABEL, legacy: true });
  }
  if (canShowTab("GERENCIAR_USUARIOS")) {
    items.push({ id: "users", label: "Gerenciar Usuários", to: "/users", group: LEGACY_GROUP_LABEL, legacy: true });
  }
  if (canShowTab("GERENCIAR_TOKENS")) {
    items.push({ id: "tokens", label: "Gerenciar Tokens", to: "/tokens-management", group: LEGACY_GROUP_LABEL, legacy: true });
  }

  const displayName = user?.name
    ? `${user.name.split(" ")[0]} ${user.name.split(" ").slice(-1)[0]}`.trim()
    : "Operação";
  const roleLabel =
    user?.role === "OPERATOR" ? "Operador" : user?.role === "MASTER" ? "Administrador" : user?.role || "";

  return {
    items,
    user,
    displayName,
    roleLabel,
    onLogout,
    canBackup: user?.role === "MASTER",
    isActive: (to: string) => {
      const [path, search = ""] = to.split("?");
      if (path === "/gerenciar-lojistas" && location.pathname.startsWith("/gerenciar-lojistas")) return true;
      if (location.pathname !== path) return false;
      const wanted = new URLSearchParams(search);
      if (![...wanted.keys()].length) return !location.search;
      const current = new URLSearchParams(location.search);
      const aba = current.get("aba");
      if (!aba && wanted.get("aba") === "products" && path === "/gestao/cadastro") return true;
      if (!aba && wanted.get("aba") === "invoices" && path === "/gestao/compras") return true;
      if (!aba && wanted.get("aba") === "caixas" && path === "/gestao/caixas") return true;
      for (const [key, value] of wanted) {
        if (current.get(key) !== value) return false;
      }
      return true;
    },
  };
}

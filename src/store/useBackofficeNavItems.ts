import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuthBackoffice } from "../hooks/authBackoffice";
import { usePermissionStore } from "./permissionsStore";

export type BackofficeNavItem = {
  id: string;
  label: string;
  to: string;
  group?: string;
  /** Itens do produto antigo (Black/Mensageria): agrupados num bloco colapsado, sem apagar nada. */
  legacy?: boolean;
};

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

  const items: BackofficeNavItem[] = [
    { id: "home", label: "HOME", to: "/backoffice" },
  ];

  if (isGestor) {
    items.push(
      { id: "cadastro-lojistas", label: "Cadastro lojistas", to: "/cadastro-lojistas", group: "Gestão" },
      { id: "cadastro-produtos", label: "Cadastro produtos", to: "/cadastro-produtos", group: "Gestão" },
      { id: "cadastro-fornecedores", label: "Cadastro fornecedores", to: "/cadastro-fornecedores", group: "Gestão" },
      { id: "cadastro-freteiros", label: "Cadastro freteiros", to: "/cadastro-freteiros", group: "Gestão" },
      { id: "gerenciar-lojistas", label: "Gerenciar lojistas", to: "/gerenciar-lojistas", group: "Gestão" },
    );
  }

  if (canShowTab("GERENCIAR_INVOICES")) {
    items.push({ id: "invoices", label: "Gerenciar Invoices", to: "/invoices-management" });
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
  if (canShowTab("GERENCIAR_OPERADORES")) {
    items.push({ id: "operators", label: "Gerenciar Operadores", to: "/operators-management", group: LEGACY_GROUP_LABEL, legacy: true });
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
      if (location.pathname === to) return true;
      if (to === "/gerenciar-lojistas" && location.pathname.startsWith("/gerenciar-lojistas/")) {
        return true;
      }
      return false;
    },
  };
}

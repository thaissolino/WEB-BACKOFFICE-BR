import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuthBackoffice } from "../hooks/authBackoffice";
import { usePermissionStore } from "./permissionsStore";

export type BackofficeNavItem = {
  id: string;
  label: string;
  to: string;
  group?: string;
};

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
      { id: "gerenciar-lojistas", label: "Gerenciar lojistas", to: "/gerenciar-lojistas", group: "Gestão" },
    );
  }

  if (canShowTab("CRIAR_USUARIO")) {
    items.push({ id: "create-user", label: "Criar Usuário", to: "/create-form-user", group: "Novo cadastro" });
  }
  if (canShowTab("GERENCIAR_GRUPOS")) {
    items.push({ id: "groups", label: "Gerenciar Grupos", to: "/team", group: "Usuário/Grupo" });
  }
  if (canShowTab("GERENCIAR_USUARIOS")) {
    items.push({ id: "users", label: "Gerenciar Usuários", to: "/users", group: "Usuário/Grupo" });
  }
  if (canShowTab("GERENCIAR_OPERADORES")) {
    items.push({ id: "operators", label: "Gerenciar Operadores", to: "/operators-management", group: "Usuário/Grupo" });
  }
  if (canShowTab("GERENCIAR_INVOICES")) {
    items.push({ id: "invoices", label: "Gerenciar Invoices", to: "/invoices-management" });
  }
  if (canShowTab("GERENCIAR_TOKENS")) {
    items.push({ id: "tokens", label: "Gerenciar Tokens", to: "/tokens-management" });
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

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

  const items: BackofficeNavItem[] = [
    { id: "home", label: "Menu Principal", to: "/backoffice" },
  ];

  if (user?.role === "OPERATOR") {
    items.push({ id: "profile", label: "Meu Perfil", to: "/meu-perfil-operator" });
  }
  if (user?.role === "MASTER") {
    items.push({ id: "profile", label: "Meu Perfil", to: "/meu-perfil-master" });
  }
  if (user?.role === "MASTER" || user?.role === "ADMIN") {
    items.push({ id: "pdv", label: "Config. PDV", to: "/pdv-config", group: "PDV" });
    items.push({ id: "commercial-client-create", label: "Cadastrar cliente comercial", to: "/clientes-comerciais/cadastrar", group: "Lojas" });
    items.push({ id: "commercial-clients", label: "Gerenciar clientes comerciais", to: "/clientes-comerciais", group: "Lojas" });
    items.push({ id: "store-create", label: "Cadastrar loja", to: "/lojas/cadastrar", group: "Lojas" });
    items.push({ id: "stores", label: "Gerenciar lojas", to: "/lojas", group: "Lojas" });
    items.push({ id: "stock", label: "Estoque", to: "/estoque", group: "Lojas" });
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
      if (to === "/lojas" && location.pathname.startsWith("/lojas/") && location.pathname !== "/lojas/cadastrar") {
        return true;
      }
      if (
        to === "/clientes-comerciais" &&
        location.pathname.startsWith("/clientes-comerciais/") &&
        location.pathname !== "/clientes-comerciais/cadastrar"
      ) {
        return true;
      }
      return false;
    },
  };
}

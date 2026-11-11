import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuthBackoffice } from "../hooks/authBackoffice";
import { usePermissionStore } from "./permissionsStore";
import { CHAVE_DO_MENU, podeCaixa, podeGestao, podeVendas } from "./acessoGestao";

export type BackofficeNavChild = {
  id: string;
  label: string;
  to?: string;
  children?: BackofficeNavChild[];
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

const PRODUTOS_CHILD: BackofficeNavChild = {
  id: "cadastro-produtos",
  label: "Produtos",
  to: "/gestao/cadastro?aba=products",
  children: [
    { id: "cadastro-produtos-listar", label: "Listar", to: "/gestao/cadastro?aba=products" },
    { id: "cadastro-produtos-lote", label: "Gerenciar Lote", to: "/gestao/cadastro/produtos/lotes" },
    {
      id: "cadastro-produtos-categoria",
      label: "Categoria",
      children: [
        { id: "cadastro-categoria-listar", label: "Listar", to: "/gestao/cadastro/categorias" },
        { id: "cadastro-categoria-cadastrar", label: "Cadastrar", to: "/gestao/cadastro/categorias/cadastrar" },
        { id: "cadastro-categoria-inativas", label: "Inativas", to: "/gestao/cadastro/categorias/inativas" },
      ],
    },
  ],
};

const FORNECEDORES_CHILD: BackofficeNavChild = {
  id: "cadastro-fornecedores",
  label: "Fornecedores",
  to: "/gestao/cadastro?aba=suppliers",
};

const FRETEIROS_CHILD: BackofficeNavChild = {
  id: "cadastro-freteiros",
  label: "Freteiros",
  to: "/gestao/cadastro?aba=carriers",
};

const OUTROS_CHILD: BackofficeNavChild = {
  id: "cadastro-outros",
  label: "Outros",
  to: "/gestao/cadastro?aba=others",
};

const TABELA_PRECO_CHILD: BackofficeNavChild = {
  id: "cadastro-tabela-preco",
  label: "Tabela de preços",
  to: "/gestao/cadastro/tabelas-preco",
};

function cadastroChildren(includeLojistas: boolean, operadores: BackofficeNavChild | null): BackofficeNavChild[] {
  return [
    ...(includeLojistas ? [LOJISTAS_CHILD] : []),
    FORNECEDORES_CHILD,
    PRODUTOS_CHILD,
    ...(operadores ? [operadores] : []),
    FRETEIROS_CHILD,
    OUTROS_CHILD,
    TABELA_PRECO_CHILD,
  ];
}

const COMPRAS_CHILDREN: BackofficeNavChild[] = [
  { id: "compras-invoices", label: "Invoices", to: "/gestao/compras?aba=invoices" },
  { id: "compras-dolar", label: "Média dólar", to: "/gestao/compras?aba=media-dolar" },
  { id: "compras-relatorios", label: "Relatórios", to: "/gestao/compras?aba=relatorios" },
  { id: "compras-precos", label: "Melhores preços", to: "/gestao/compras?aba=melhores-precos" },
  { id: "compras-listas", label: "Listas de compras", to: "/gestao/compras?aba=shopping-lists" },
  { id: "compras-perdidos", label: "Perdidos", to: "/gestao/compras?aba=lost-products" },
  { id: "compras-imei", label: "Buscar IMEI", to: "/gestao/compras?aba=imei-search" },
];

const CAIXAS_CHILDREN: BackofficeNavChild[] = [
  { id: "caixas", label: "Caixas", to: "/gestao/caixas?aba=caixas" },
  { id: "caixas-br", label: "Caixas BR", to: "/gestao/caixas?aba=caixas-brl" },
];

const MOVIMENTACOES_ITEM: BackofficeNavItem = {
  id: "gestao-movimentacoes",
  label: "Movimentações",
  to: "/gestao/movimentacoes/vendas/concluidas",
  children: [
    { id: "mov-vendas-concluidas", label: "Vendas concluídas", to: "/gestao/movimentacoes/vendas/concluidas" },
    {
      id: "mov-financeiro",
      label: "Financeiro",
      children: [
        { id: "mov-fin-plano", label: "Plano de contas", to: "/gestao/cadastro/financeiro/plano-conta" },
        {
          id: "mov-fin-despesas",
          label: "Despesas / Receitas",
          children: [
            { id: "mov-fin-despesas-listar", label: "Listar despesas / receitas", to: "/gestao/movimentacoes/financeiro/despesas" },
            { id: "mov-fin-despesas-cadastrar-despesa", label: "Cadastrar despesas", to: "/gestao/movimentacoes/financeiro/despesas/cadastrar" },
            { id: "mov-fin-despesas-cadastrar-receita", label: "Cadastrar receitas", to: "/gestao/movimentacoes/financeiro/receitas/cadastrar" },
          ],
        },
      ],
    },
  ],
};

const RELATORIOS_ITEM: BackofficeNavItem = {
  id: "gestao-relatorios",
  label: "Relatórios",
  to: "/gestao/relatorios/dre",
  group: "Gestão",
  children: [
    { id: "relatorio-dre", label: "DRE GERENCIAL", to: "/gestao/relatorios/dre" },
    { id: "relatorio-itens-vendas", label: "ITENS DAS VENDAS", to: "/gestao/relatorios/itens-vendas" },
    { id: "relatorio-auditoria-estoque", label: "AUDITORIA ESTOQUE", to: "/gestao/relatorios/auditoria/estoque" },
    { id: "relatorio-estoque", label: "ESTOQUE", to: "/gestao/relatorios/estoque" },
    { id: "relatorio-imei", label: "BUSCAR IMEI", to: "/gestao/relatorios/imei" },
  ],
};

export const LEGACY_GROUP_LABEL = "Black / Mensageria (legado)";

export function useBackofficeNavItems() {
  const { user, onLogout } = useAuthBackoffice();
  const { getPermissions, permissions } = usePermissionStore();
  const activePermissions = permissions || user?.permissions;
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
      case "VENDAS_CONCLUIDAS":
        return activePermissions?.[key]?.enabled === true;
      default:
        return false;
    }
  };

  const isGestor = user?.role === "MASTER" || user?.role === "ADMIN";
  const operadoresChild: BackofficeNavChild | null =
    isGestor || canShowTab("GERENCIAR_OPERADORES")
      ? { id: "cadastro-operadores", label: "Operadores", to: "/operators-management" }
      : null;

  const printOnly =
    !isGestor &&
    canShowTab("VENDAS_CONCLUIDAS") &&
    !canShowTab("GERENCIAR_INVOICES") &&
    !canShowTab("GERENCIAR_OPERADORES") &&
    !canShowTab("CRIAR_USUARIO") &&
    !canShowTab("GERENCIAR_GRUPOS") &&
    !canShowTab("GERENCIAR_USUARIOS") &&
    !canShowTab("GERENCIAR_TOKENS");

  const items: BackofficeNavItem[] = printOnly
    ? [{ id: "vendas-concluidas", label: "Vendas concluídas", to: "/vendas-concluidas" }]
    : [{ id: "home", label: "HOME", to: "/backoffice" }];

  if (isGestor && !printOnly) {
    items.push(
      { id: "gestao-cadastro", label: "Cadastro", to: "/gestao/cadastro", group: "Gestão", children: cadastroChildren(true, operadoresChild) },
      { id: "gestao-compras", label: "Compras", to: "/gestao/compras", group: "Gestão", children: COMPRAS_CHILDREN },
      { ...MOVIMENTACOES_ITEM, group: "Gestão" },
      { id: "gestao-caixas", label: "Gestão de caixas", to: "/gestao/caixas", group: "Gestão", children: CAIXAS_CHILDREN },
      RELATORIOS_ITEM,
    );
  }

  const invoices = activePermissions?.GERENCIAR_INVOICES;
  const filhoLiberado = (child: BackofficeNavChild): BackofficeNavChild | null => {
    if (child.id === "cadastro-produtos") return podeGestao(invoices, "PRODUTOS") ? child : null;
    if (child.id === "cadastro-operadores") return operadoresChild;
    if (child.id === "mov-vendas-concluidas") return podeVendas(activePermissions) ? child : null;
    if (child.id === "caixas") return podeCaixa(invoices, "CAIXAS_PERMITIDOS") ? child : null;
    if (child.id === "caixas-br") return podeCaixa(invoices, "CAIXAS_BR_PERMITIDOS") ? child : null;
    const chave = CHAVE_DO_MENU[child.id];
    if (chave) return podeGestao(invoices, chave) ? child : null;
    if (child.children) {
      const filhos = child.children.map(filhoLiberado).filter((item): item is BackofficeNavChild => Boolean(item));
      return filhos.length ? { ...child, children: filhos } : null;
    }
    return null;
  };
  const modulo = (item: BackofficeNavItem) => {
    const filhos = (item.children || []).map(filhoLiberado).filter((child): child is BackofficeNavChild => Boolean(child));
    return filhos.length ? { ...item, children: filhos } : null;
  };

  if (!printOnly && !isGestor) {
    const cadastro = modulo({ id: "gestao-cadastro", label: "Cadastro", to: "/gestao/cadastro", children: cadastroChildren(true, operadoresChild) });
    const compras = modulo({ id: "gestao-compras", label: "Compras", to: "/gestao/compras", children: COMPRAS_CHILDREN });
    const movimentacoes = modulo(MOVIMENTACOES_ITEM);
    const caixas = modulo({ id: "gestao-caixas", label: "Gestão de caixas", to: "/gestao/caixas", children: CAIXAS_CHILDREN });
    const relatorios = modulo(RELATORIOS_ITEM);
    [cadastro, compras, movimentacoes, caixas, relatorios].forEach((item) => {
      if (item) items.push(item);
    });
  }

  const loja: BackofficeNavItem[] = [];
  if (isGestor) {
    loja.push({ id: "gerenciar-lojistas", label: "Gerenciar lojistas", to: "/gerenciar-lojistas" });
  }
  if (!printOnly && (isGestor || podeVendas(activePermissions))) {
    loja.push({ id: "vendas-concluidas", label: "Vendas concluídas", to: "/vendas-concluidas" });
  }
  if (!printOnly && (isGestor || podeGestao(activePermissions?.GERENCIAR_INVOICES, "ETIQUETAS"))) {
    loja.push({ id: "etiquetas-entrada", label: "Etiquetas da entrada", to: "/etiquetas-entrada" });
  }
  if (loja[0]) loja[0].moduleStart = true;
  items.push(...loja);

  if (!printOnly && operadoresChild && !items.some((item) => item.children?.some((child) => child.id === "cadastro-operadores"))) {
    const cadastro = items.find((item) => item.id === "gestao-cadastro");
    if (cadastro?.children) cadastro.children.push(operadoresChild);
    else items.push({ id: "gestao-cadastro", label: "Cadastro", to: "/gestao/cadastro", children: [operadoresChild] });
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

  const podeAlterarSenha = isGestor || activePermissions?.ALTERAR_SENHA?.enabled === true;

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
    podeAlterarSenha,
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

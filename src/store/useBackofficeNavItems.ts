import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuthBackoffice } from "../hooks/authBackoffice";
import { usePermissionStore } from "./permissionsStore";

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

const FINANCEIRO_CHILD: BackofficeNavChild = {
  id: "cadastro-financeiro",
  label: "Financeiro",
    children: [
      {
        id: "financeiro-forma",
        label: "Forma de Pagamento",
        children: [
          { id: "fin-forma-listar", label: "Listar", to: "/gestao/cadastro/financeiro/formas-pagamento" },
          { id: "fin-forma-cadastrar", label: "Cadastrar", to: "/gestao/cadastro/financeiro/formas-pagamento/cadastrar" },
          { id: "fin-forma-inativos", label: "Inativos", to: "/gestao/cadastro/financeiro/formas-pagamento/inativos" },
        ],
      },
      {
        id: "financeiro-plano",
        label: "Plano de Conta",
        children: [
          { id: "fin-plano-listar", label: "Listar", to: "/gestao/cadastro/financeiro/plano-conta" },
          { id: "fin-plano-cadastrar", label: "Cadastrar", to: "/gestao/cadastro/financeiro/plano-conta/cadastrar" },
          { id: "fin-plano-inativos", label: "Inativos", to: "/gestao/cadastro/financeiro/plano-conta/inativos" },
        ],
      },
      { id: "financeiro-caixa", label: "Caixa", to: "/gestao/cadastro/financeiro/caixa" },
    ],
};

function cadastroChildren(includeLojistas: boolean, operadores: BackofficeNavChild | null): BackofficeNavChild[] {
  return [
    ...(includeLojistas ? [LOJISTAS_CHILD] : []),
    FORNECEDORES_CHILD,
    PRODUTOS_CHILD,
    ...(operadores ? [operadores] : []),
    FINANCEIRO_CHILD,
    FRETEIROS_CHILD,
    OUTROS_CHILD,
  ];
}

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

const MOVIMENTACOES_ITEM: BackofficeNavItem = {
  id: "gestao-movimentacoes",
  label: "Movimentações",
  to: "/gestao/movimentacoes/vendas/abertas",
  children: [
    {
      id: "mov-vendas",
      label: "Vendas",
      children: [
        { id: "mov-vendas-pdv", label: "PDV", to: "/client/pdv" },
        { id: "mov-vendas-pre", label: "Pré Vendas", to: "/gestao/movimentacoes/vendas/pre" },
        { id: "mov-vendas-entregas", label: "Painel de Entregas", to: "/gestao/movimentacoes/vendas/entregas" },
        { id: "mov-vendas-abertas", label: "Abertas", to: "/gestao/movimentacoes/vendas/abertas" },
        { id: "mov-vendas-concluidas", label: "Concluídas", to: "/gestao/movimentacoes/vendas/concluidas" },
      ],
    },
    {
      id: "mov-financeiro",
      label: "Financeiro",
      children: [
        { id: "mov-fin-plano", label: "Plano de Conta", to: "/gestao/cadastro/financeiro/plano-conta" },
        { id: "mov-fin-receber", label: "Contas a Receber", to: "/gestao/movimentacoes/financeiro/receber" },
        { id: "mov-fin-pagar", label: "Contas a Pagar", to: "/gestao/movimentacoes/financeiro/pagar" },
        { id: "mov-fin-fluxo", label: "Fluxo de Caixa", to: "/gestao/movimentacoes/financeiro/fluxo" },
        { id: "mov-fin-previsao", label: "Previsão de Fluxo de Caixa", to: "/gestao/movimentacoes/financeiro/previsao" },
        {
          id: "mov-fin-despesas",
          label: "Despesas / Receitas",
          children: [
            { id: "mov-fin-despesas-cadastrar-despesa", label: "Cadastrar Despesa", to: "/gestao/movimentacoes/financeiro/despesas/cadastrar" },
            { id: "mov-fin-despesas-cadastrar-receita", label: "Cadastrar Receita", to: "/gestao/movimentacoes/financeiro/receitas/cadastrar" },
            { id: "mov-fin-despesas-listar", label: "Listar Receitas / Despesas", to: "/gestao/movimentacoes/financeiro/despesas" },
          ],
        },
        { id: "mov-fin-caixa-clientes", label: "Relatório Caixa de Clientes", to: "/gestao/movimentacoes/financeiro/caixa-clientes" },
        {
          id: "mov-fin-boletos",
          label: "Boletos",
          children: [
            { id: "mov-fin-boletos-recorrentes", label: "Boletos Recorrentes", to: "/gestao/movimentacoes/financeiro/boletos/recorrentes" },
            { id: "mov-fin-boletos-contas", label: "Contas Bancárias", to: "/gestao/movimentacoes/financeiro/boletos/contas" },
            { id: "mov-fin-boletos-gerenciar", label: "Gerenciar Boletos", to: "/gestao/movimentacoes/financeiro/boletos/gerenciar" },
            { id: "mov-fin-boletos-arquivos", label: "Gerenciar Arquivos", to: "/gestao/movimentacoes/financeiro/boletos/arquivos" },
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

  if (!printOnly && !isGestor && canShowTab("GERENCIAR_INVOICES")) {
    items.push({ id: "gestao-cadastro", label: "Cadastro", to: "/gestao/cadastro", children: cadastroChildren(false, operadoresChild) });
    items.push({ id: "gestao-compras", label: "Compras", to: "/gestao/compras", children: COMPRAS_CHILDREN });
    items.push(MOVIMENTACOES_ITEM);
    items.push({ id: "gestao-caixas", label: "Gestão de caixas", to: "/gestao/caixas", children: CAIXAS_CHILDREN });
    items.push(RELATORIOS_ITEM);
  }

  const loja: BackofficeNavItem[] = [];
  if (isGestor) {
    loja.push({ id: "gerenciar-lojistas", label: "Gerenciar lojistas", to: "/gerenciar-lojistas" });
  }
  if (!printOnly && (isGestor || canShowTab("GERENCIAR_INVOICES") || canShowTab("VENDAS_CONCLUIDAS"))) {
    loja.push({ id: "vendas-concluidas", label: "Vendas concluídas", to: "/vendas-concluidas" });
  }
  if (!printOnly && (isGestor || canShowTab("GERENCIAR_INVOICES"))) {
    loja.push({ id: "etiquetas-entrada", label: "Etiquetas da entrada", to: "/etiquetas-entrada" });
  }
  if (loja[0]) loja[0].moduleStart = true;
  items.push(...loja);

  if (!printOnly && operadoresChild && !items.some((item) => item.id === "gestao-cadastro")) {
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

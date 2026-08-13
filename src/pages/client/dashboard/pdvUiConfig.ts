import { PDV_MENUS, type PdvMenuItem, type PdvMenuRoot } from "./menuData";

export type PdvMenuToggle = {
  on: boolean;
  children?: Record<string, PdvMenuToggle>;
};

export type PdvNavId = "cadastros" | "movimentacoes" | "relatorios";

export type PdvUiConfig = {
  nav: Record<PdvNavId, boolean>;
  menus: Record<string, PdvMenuToggle>;
  dashboard: Record<string, boolean>;
  configModal: Record<string, boolean>;
};

export type PdvDashboardWidget = {
  id: string;
  label: string;
};

export type PdvConfigModalItem = {
  id: string;
  label: string;
};

export type PdvConfigModalSection = {
  id: string;
  title: string;
  items: PdvConfigModalItem[];
};

function slugPart(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const PDV_DASHBOARD_ACCORDIONS: PdvDashboardWidget[] = [
  { id: "news", label: "Novidades do Sistema" },
  { id: "plan", label: "Meu Plano" },
  { id: "birthdays", label: "Aniversariante do Dia" },
  { id: "stock-min", label: "Estoque mínimo" },
  { id: "top-buyers", label: "Clientes que mais compraram nos últimos 30 dias" },
  { id: "consigned-overdue", label: "Consignado Vencidos" },
  { id: "consigned-all", label: "Todos os Consignado(s)" },
  { id: "credit", label: "Crediários em Aberto" },
  { id: "receivables", label: "$ Total de Contas a Receber" },
  { id: "payables", label: "$ Total de Contas a Pagar" },
  { id: "billing", label: "Faturamento" },
  { id: "map", label: "Localização de Todos os Clientes" },
  { id: "activities", label: "Atividades" },
  { id: "social", label: "MÍDIAS SOCIAIS" },
];

export const PDV_DASHBOARD_CHROME: PdvDashboardWidget[] = [
  { id: "welcome", label: "Seja bem vindo" },
  { id: "certificate-alert", label: "ATENÇÃO!" },
  { id: "close-demo", label: "Fechar demonstrativo" },
  { id: "period", label: "Período" },
];

export const PDV_DASHBOARD_WIDGETS: PdvDashboardWidget[] = [
  ...PDV_DASHBOARD_CHROME.slice(0, 2),
  ...PDV_DASHBOARD_ACCORDIONS,
  ...PDV_DASHBOARD_CHROME.slice(2),
];

const CONFIG_MODAL_SOURCE: { title: string; items: string[] }[][] = [
  [
    {
      title: "PARÂMETROS GERAIS",
      items: [
        "Cadastro do Cliente",
        "Tipo de Atividade",
        "Caixa",
        "Comissão e Meta",
        "Gerenciar Acesso do Contador",
        "Acréscimo no Preço de Venda",
        "Mensagem Tipo Venda",
        "Arquivos Fiscais Contador",
        "Impressão/Carta/E-mail",
        "Número para Letra",
        "Local Venda",
        "Status",
        "Pacotes SIGEP",
        "Gerenciar colunas no Robô de Impressão LV",
        "Recorrência com Yapay",
      ],
    },
  ],
  [
    {
      title: "PARÂMETROS DA LOJA",
      items: [
        "Configurações da Loja",
        "Integrações",
        "Grupos de Loja",
        "Estoque Compartilhado",
        "Meu Plano, Mensalidades e Contrato",
      ],
    },
    {
      title: "IMPORTAÇÃO",
      items: [
        "Cliente",
        "Fornecedor",
        "Produto",
        "Grade x Categoria",
        "Crediário",
        "Contas a Pagar",
        "Atualizar Estoque",
        "Atualizar Estoque Fornecedor",
        "Atualizar Produto",
      ],
    },
  ],
  [
    {
      title: "FORMA DE PAGAMENTO",
      items: ["Listar", "Cadastrar", "Inativos"],
    },
    {
      title: "INTEGRAÇÃO",
      items: ["Sigep Correios", "Loja Virtual", "Boleto Cloud", "Boleto Yapay", "Sob Demanda"],
    },
    {
      title: "NF-E E NFC-E",
      items: ["Parâmetros Avançados", "Parâmetros Simplificados", "Transportadora"],
    },
  ],
];

export const PDV_CONFIG_MODAL_COLUMNS: PdvConfigModalSection[][] = CONFIG_MODAL_SOURCE.map((column) =>
  column.map((section) => {
    const sectionId = slugPart(section.title);
    return {
      id: sectionId,
      title: section.title,
      items: section.items.map((label) => ({
        id: `${sectionId}__${slugPart(label)}`,
        label,
      })),
    };
  }),
);

export const EMPTY_PDV_UI_CONFIG: PdvUiConfig = {
  nav: {
    cadastros: true,
    movimentacoes: true,
    relatorios: true,
  },
  menus: {},
  dashboard: {},
  configModal: {},
};

function menuItemsToToggles(items: PdvMenuItem[]): Record<string, PdvMenuToggle> {
  const next: Record<string, PdvMenuToggle> = {};
  for (const item of items) {
    next[item.id] = {
      on: true,
      ...(item.children?.length ? { children: menuItemsToToggles(item.children) } : {}),
    };
  }
  return next;
}

export function defaultMenusFromData(menus: PdvMenuRoot[] = PDV_MENUS): Record<string, PdvMenuToggle> {
  const next: Record<string, PdvMenuToggle> = {};
  for (const root of menus) {
    Object.assign(next, menuItemsToToggles(root.items));
  }
  return next;
}

function defaultFlagMap(items: { id: string }[]) {
  return Object.fromEntries(items.map((item) => [item.id, true]));
}

export function buildDefaultPdvUiConfig(): PdvUiConfig {
  return {
    nav: { cadastros: true, movimentacoes: true, relatorios: true },
    menus: defaultMenusFromData(),
    dashboard: defaultFlagMap(PDV_DASHBOARD_WIDGETS),
    configModal: defaultFlagMap(PDV_CONFIG_MODAL_COLUMNS.flatMap((column) => column.flatMap((section) => section.items))),
  };
}

function mergeMenuToggles(
  defaults: Record<string, PdvMenuToggle>,
  incoming: Record<string, PdvMenuToggle> | undefined,
): Record<string, PdvMenuToggle> {
  const keys = new Set([...Object.keys(defaults), ...Object.keys(incoming ?? {})]);
  const next: Record<string, PdvMenuToggle> = {};
  for (const key of keys) {
    const left = defaults[key] ?? { on: true };
    const right = incoming?.[key];
    next[key] = {
      on: right?.on !== false,
      children:
        left.children || right?.children
          ? mergeMenuToggles(left.children ?? {}, right?.children)
          : undefined,
    };
    if (!next[key].children || Object.keys(next[key].children).length === 0) {
      delete next[key].children;
    }
  }
  return next;
}

function asBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function asFlagMap(value: unknown, defaults: Record<string, boolean>) {
  const incoming =
    value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  const next = { ...defaults };
  for (const [key, flag] of Object.entries(incoming)) {
    if (typeof flag === "boolean") next[key] = flag;
  }
  return next;
}

function asMenuMap(value: unknown): Record<string, PdvMenuToggle> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const next: Record<string, PdvMenuToggle> = {};
  for (const [key, node] of Object.entries(value as Record<string, unknown>)) {
    const row = node && typeof node === "object" ? (node as Record<string, unknown>) : {};
    next[key] = {
      on: row.on !== false,
      children: row.children ? asMenuMap(row.children) : undefined,
    };
    if (!next[key].children || Object.keys(next[key].children).length === 0) {
      delete next[key].children;
    }
  }
  return next;
}

export function normalizePdvUiConfig(raw: unknown): PdvUiConfig {
  const defaults = buildDefaultPdvUiConfig();
  const row = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const navRaw = row.nav && typeof row.nav === "object" ? (row.nav as Record<string, unknown>) : {};

  return {
    nav: {
      cadastros: asBoolean(navRaw.cadastros, defaults.nav.cadastros),
      movimentacoes: asBoolean(navRaw.movimentacoes, defaults.nav.movimentacoes),
      relatorios: asBoolean(navRaw.relatorios, defaults.nav.relatorios),
    },
    menus: mergeMenuToggles(defaults.menus, asMenuMap(row.menus)),
    dashboard: asFlagMap(row.dashboard, defaults.dashboard),
    configModal: asFlagMap(row.configModal, defaults.configModal),
  };
}

function readMenuNode(menus: Record<string, PdvMenuToggle>, path: string[]): PdvMenuToggle | undefined {
  let nodes: Record<string, PdvMenuToggle> | undefined = menus;
  let node: PdvMenuToggle | undefined;
  for (const id of path) {
    node = nodes?.[id];
    if (!node) return undefined;
    nodes = node.children;
  }
  return node;
}

export function isNavVisible(config: PdvUiConfig, navId: PdvNavId) {
  return config.nav[navId] !== false;
}

export function isMenuChecked(config: PdvUiConfig, path: string[]) {
  const node = readMenuNode(config.menus, path);
  return node?.on !== false;
}

export function isMenuVisible(config: PdvUiConfig, navId: PdvNavId, path: string[]) {
  if (!isNavVisible(config, navId)) return false;
  let nodes: Record<string, PdvMenuToggle> | undefined = config.menus;
  for (const id of path) {
    const node = nodes?.[id];
    if (node?.on === false) return false;
    nodes = node?.children;
  }
  return true;
}

export function isDashboardVisible(config: PdvUiConfig, widgetId: string) {
  return config.dashboard[widgetId] !== false;
}

export function isConfigModalItemVisible(config: PdvUiConfig, itemId: string) {
  return config.configModal[itemId] !== false;
}

export function setMenuChecked(config: PdvUiConfig, path: string[], on: boolean): PdvUiConfig {
  function setNode(menus: Record<string, PdvMenuToggle>, rest: string[]): Record<string, PdvMenuToggle> {
    const [head, ...tail] = rest;
    const current = menus[head] ?? { on: true };
    if (tail.length === 0) {
      return { ...menus, [head]: { ...current, on } };
    }
    return {
      ...menus,
      [head]: {
        ...current,
        children: setNode(current.children ?? {}, tail),
      },
    };
  }

  return { ...config, menus: setNode(config.menus, path) };
}

export function filterMenuItems(
  items: PdvMenuItem[],
  config: PdvUiConfig,
  navId: PdvNavId,
  parentPath: string[] = [],
): PdvMenuItem[] {
  return items.flatMap((item) => {
    const path = [...parentPath, item.id];
    if (!isMenuVisible(config, navId, path)) return [];
    const children = item.children
      ? filterMenuItems(item.children, config, navId, path)
      : undefined;
    return [
      {
        ...item,
        children,
        hasSubmenu: item.children?.length
          ? Boolean(children && children.length > 0)
          : item.hasSubmenu,
      },
    ];
  });
}

export function accordionWidgetId(title: string) {
  return PDV_DASHBOARD_ACCORDIONS.find((item) => item.label === title)?.id;
}

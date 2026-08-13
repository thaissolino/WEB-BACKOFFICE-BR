export type CategoryNode = {
  id: string;
  label: string;
  children?: CategoryNode[];
};

export type FlatOption = {
  id: string;
  label: string;
  depth: number;
};

export const DEMO_CATEGORIES: CategoryNode[] = [
  {
    id: "papelaria",
    label: "Papelaria",
    children: [
      { id: "papelaria-cadernos", label: "Cadernos" },
      { id: "papelaria-canetas", label: "Canetas" },
      { id: "papelaria-arquivos", label: "Arquivos" },
    ],
  },
  {
    id: "escritorio",
    label: "Escritório",
    children: [
      { id: "escritorio-mesas", label: "Mesas" },
      { id: "escritorio-cadeiras", label: "Cadeiras" },
    ],
  },
  {
    id: "casa",
    label: "Casa e Lar",
    children: [
      { id: "casa-cozinha", label: "Cozinha" },
      { id: "casa-banho", label: "Banho" },
      { id: "casa-decoracao", label: "Decoração" },
    ],
  },
  {
    id: "vestuario",
    label: "Vestuário Demo",
    children: [
      { id: "vestuario-camisetas", label: "Camisetas" },
      { id: "vestuario-calcados", label: "Calçados" },
    ],
  },
  {
    id: "mercearia",
    label: "Mercearia",
    children: [
      { id: "mercearia-graos", label: "Grãos" },
      { id: "mercearia-bebidas", label: "Bebidas" },
    ],
  },
  {
    id: "servicos",
    label: "Serviços Internos",
    children: [
      { id: "servicos-manutencao", label: "Manutenção" },
      { id: "servicos-entrega", label: "Entrega" },
    ],
  },
];

export const DEMO_BRANDS = [
  "SEM MARCA",
  "Aurora Norte",
  "Brisa Campo",
  "Cedro Casa",
  "Duna Oficina",
  "Estação Leste",
  "Farol Atelier",
];

export const DEMO_COLLECTIONS = ["SEM COLEÇÃO", "Linha Aurora", "Coleção Inverno Demo", "Série Oficina"];

export const DEMO_GENDERS = ["SEM GÊNERO", "Feminino", "Masculino", "Infantil", "Unissex"];

export const DEMO_UNITS = ["UN - UNIDADE", "KG - QUILOGRAMA", "CX - CAIXA", "PC - PEÇA", "MT - METRO"];

export const DEMO_SUPPLIERS = ["Nenhum selecionado", "Fornecedor Demo Alfa", "Fornecedor Demo Beta", "Atacado Demo Sul"];

export const DEMO_ORIGINS = ["BRASIL", "IMPORTADO", "NACIONAL"];

export function flattenCategories(nodes: CategoryNode[], depth = 0): FlatOption[] {
  return nodes.flatMap((node) => [
    { id: node.id, label: node.label, depth },
    ...(node.children ? flattenCategories(node.children, depth + 1) : []),
  ]);
}

export const FLAT_CATEGORIES = flattenCategories(DEMO_CATEGORIES);

export const GRADE_OPTIONS = [
  "Sem Grade",
  "Grade com Tamanho/Cor",
  "Grade com Cor/Tamanho",
  "Grade com Tamanho",
  "Grade com Cor",
] as const;

export const CATEGORY_TYPE_OPTIONS = [
  "Produto c/ Controle de Estoque",
  "Produto s/ Controle de Estoque",
  "Controle de Série",
  "Serviço",
] as const;

export const ICMS_OPTIONS = [
  "Isento (I1)",
  "Não tributado (N1)",
  "Substituição tributária (F1)",
  "Tributado",
] as const;

export type DemoCategoryRow = {
  id: string;
  code: number;
  name: string;
  parentId?: string;
  grade: string;
  commission: string;
  discount: string;
  profit: string;
  type: string;
  description: string;
  ncmSuggest: boolean;
  ncm: string;
  defaultDiscount: boolean;
  defaultDiscountValue: string;
  active: boolean;
};

export const DEMO_CATEGORY_ROWS: DemoCategoryRow[] = [
  {
    id: "papelaria",
    code: 201,
    name: "Papelaria",
    grade: "Sem Grade",
    commission: "0,00",
    discount: "5,00",
    profit: "30,00",
    type: "Produto c/ Controle de Estoque",
    description: "Itens de papelaria para loja demo",
    ncmSuggest: false,
    ncm: "",
    defaultDiscount: false,
    defaultDiscountValue: "",
    active: true,
  },
  {
    id: "papelaria-cadernos",
    code: 202,
    name: "Cadernos",
    parentId: "papelaria",
    grade: "Sem Grade",
    commission: "0,00",
    discount: "5,00",
    profit: "32,00",
    type: "Produto c/ Controle de Estoque",
    description: "",
    ncmSuggest: false,
    ncm: "",
    defaultDiscount: false,
    defaultDiscountValue: "",
    active: true,
  },
  {
    id: "papelaria-canetas",
    code: 203,
    name: "Canetas",
    parentId: "papelaria",
    grade: "Grade com Cor",
    commission: "0,00",
    discount: "0,00",
    profit: "40,00",
    type: "Produto c/ Controle de Estoque",
    description: "",
    ncmSuggest: false,
    ncm: "",
    defaultDiscount: false,
    defaultDiscountValue: "",
    active: true,
  },
  {
    id: "papelaria-arquivos",
    code: 204,
    name: "Arquivos",
    parentId: "papelaria",
    grade: "Sem Grade",
    commission: "0,00",
    discount: "0,00",
    profit: "28,00",
    type: "Produto c/ Controle de Estoque",
    description: "",
    ncmSuggest: false,
    ncm: "",
    defaultDiscount: false,
    defaultDiscountValue: "",
    active: true,
  },
  {
    id: "escritorio",
    code: 210,
    name: "Escritório",
    grade: "Sem Grade",
    commission: "1,00",
    discount: "8,00",
    profit: "25,00",
    type: "Produto c/ Controle de Estoque",
    description: "Móveis e itens de escritório demo",
    ncmSuggest: false,
    ncm: "",
    defaultDiscount: true,
    defaultDiscountValue: "3,00",
    active: true,
  },
  {
    id: "escritorio-mesas",
    code: 211,
    name: "Mesas",
    parentId: "escritorio",
    grade: "Sem Grade",
    commission: "1,00",
    discount: "8,00",
    profit: "22,00",
    type: "Produto c/ Controle de Estoque",
    description: "",
    ncmSuggest: false,
    ncm: "",
    defaultDiscount: false,
    defaultDiscountValue: "",
    active: true,
  },
  {
    id: "escritorio-cadeiras",
    code: 212,
    name: "Cadeiras",
    parentId: "escritorio",
    grade: "Grade com Cor",
    commission: "1,00",
    discount: "8,00",
    profit: "24,00",
    type: "Produto c/ Controle de Estoque",
    description: "",
    ncmSuggest: false,
    ncm: "",
    defaultDiscount: false,
    defaultDiscountValue: "",
    active: true,
  },
  {
    id: "casa",
    code: 220,
    name: "Casa e Lar",
    grade: "Sem Grade",
    commission: "0,00",
    discount: "10,00",
    profit: "35,00",
    type: "Produto c/ Controle de Estoque",
    description: "",
    ncmSuggest: true,
    ncm: "9403.60.00",
    defaultDiscount: false,
    defaultDiscountValue: "",
    active: true,
  },
  {
    id: "casa-cozinha",
    code: 221,
    name: "Cozinha",
    parentId: "casa",
    grade: "Sem Grade",
    commission: "0,00",
    discount: "10,00",
    profit: "38,00",
    type: "Produto c/ Controle de Estoque",
    description: "",
    ncmSuggest: false,
    ncm: "",
    defaultDiscount: false,
    defaultDiscountValue: "",
    active: true,
  },
  {
    id: "casa-banho",
    code: 222,
    name: "Banho",
    parentId: "casa",
    grade: "Grade com Cor",
    commission: "0,00",
    discount: "10,00",
    profit: "40,00",
    type: "Produto c/ Controle de Estoque",
    description: "",
    ncmSuggest: false,
    ncm: "",
    defaultDiscount: false,
    defaultDiscountValue: "",
    active: true,
  },
  {
    id: "casa-decoracao",
    code: 223,
    name: "Decoração",
    parentId: "casa",
    grade: "Sem Grade",
    commission: "0,00",
    discount: "12,00",
    profit: "45,00",
    type: "Produto c/ Controle de Estoque",
    description: "",
    ncmSuggest: false,
    ncm: "",
    defaultDiscount: false,
    defaultDiscountValue: "",
    active: true,
  },
  {
    id: "vestuario",
    code: 230,
    name: "Vestuário Demo",
    grade: "Grade com Tamanho/Cor",
    commission: "2,00",
    discount: "15,00",
    profit: "50,00",
    type: "Produto c/ Controle de Estoque",
    description: "Linha têxtil de demonstração",
    ncmSuggest: true,
    ncm: "6109.10.00",
    defaultDiscount: true,
    defaultDiscountValue: "5,00",
    active: true,
  },
  {
    id: "vestuario-camisetas",
    code: 231,
    name: "Camisetas",
    parentId: "vestuario",
    grade: "Grade com Tamanho/Cor",
    commission: "2,00",
    discount: "15,00",
    profit: "52,00",
    type: "Produto c/ Controle de Estoque",
    description: "",
    ncmSuggest: false,
    ncm: "",
    defaultDiscount: false,
    defaultDiscountValue: "",
    active: true,
  },
  {
    id: "vestuario-calcados",
    code: 232,
    name: "Calçados",
    parentId: "vestuario",
    grade: "Grade com Tamanho",
    commission: "2,00",
    discount: "10,00",
    profit: "48,00",
    type: "Produto c/ Controle de Estoque",
    description: "",
    ncmSuggest: false,
    ncm: "",
    defaultDiscount: false,
    defaultDiscountValue: "",
    active: true,
  },
  {
    id: "mercearia",
    code: 240,
    name: "Mercearia",
    grade: "Sem Grade",
    commission: "0,00",
    discount: "0,00",
    profit: "18,00",
    type: "Produto s/ Controle de Estoque",
    description: "",
    ncmSuggest: false,
    ncm: "",
    defaultDiscount: false,
    defaultDiscountValue: "",
    active: true,
  },
  {
    id: "mercearia-graos",
    code: 241,
    name: "Grãos",
    parentId: "mercearia",
    grade: "Sem Grade",
    commission: "0,00",
    discount: "0,00",
    profit: "15,00",
    type: "Produto s/ Controle de Estoque",
    description: "",
    ncmSuggest: false,
    ncm: "",
    defaultDiscount: false,
    defaultDiscountValue: "",
    active: true,
  },
  {
    id: "mercearia-bebidas",
    code: 242,
    name: "Bebidas",
    parentId: "mercearia",
    grade: "Sem Grade",
    commission: "0,00",
    discount: "0,00",
    profit: "20,00",
    type: "Produto s/ Controle de Estoque",
    description: "",
    ncmSuggest: false,
    ncm: "",
    defaultDiscount: false,
    defaultDiscountValue: "",
    active: true,
  },
  {
    id: "servicos",
    code: 250,
    name: "Serviços Internos",
    grade: "Sem Grade",
    commission: "0,00",
    discount: "0,00",
    profit: "0,00",
    type: "Serviço",
    description: "Serviços internos da loja demo",
    ncmSuggest: false,
    ncm: "",
    defaultDiscount: false,
    defaultDiscountValue: "",
    active: true,
  },
  {
    id: "servicos-manutencao",
    code: 251,
    name: "Manutenção",
    parentId: "servicos",
    grade: "Sem Grade",
    commission: "0,00",
    discount: "0,00",
    profit: "0,00",
    type: "Serviço",
    description: "",
    ncmSuggest: false,
    ncm: "",
    defaultDiscount: false,
    defaultDiscountValue: "",
    active: true,
  },
  {
    id: "servicos-entrega",
    code: 252,
    name: "Entrega",
    parentId: "servicos",
    grade: "Sem Grade",
    commission: "0,00",
    discount: "0,00",
    profit: "0,00",
    type: "Serviço",
    description: "",
    ncmSuggest: false,
    ncm: "",
    defaultDiscount: false,
    defaultDiscountValue: "",
    active: true,
  },
  {
    id: "linha-encerrada",
    code: 901,
    name: "Linha Encerrada Demo",
    grade: "Sem Grade",
    commission: "0,00",
    discount: "0,00",
    profit: "0,00",
    type: "Produto s/ Controle de Estoque",
    description: "Categoria inativa de demonstração",
    ncmSuggest: false,
    ncm: "",
    defaultDiscount: false,
    defaultDiscountValue: "",
    active: false,
  },
  {
    id: "promocao-antiga",
    code: 902,
    name: "Promoção Antiga Demo",
    grade: "Sem Grade",
    commission: "0,00",
    discount: "50,00",
    profit: "10,00",
    type: "Produto c/ Controle de Estoque",
    description: "",
    ncmSuggest: false,
    ncm: "",
    defaultDiscount: false,
    defaultDiscountValue: "",
    active: false,
  },
];

export type DemoStockGrade = {
  id: string;
  label: string;
  stock: string;
  price: string;
};

export type DemoStockProduct = {
  id: string;
  categoryId: string;
  code: string;
  gradeCode: string;
  name: string;
  stock: string;
  lastPurchase: string;
  sale: string;
  grades?: DemoStockGrade[];
};

export const DEMO_STOCK_PRODUCTS: DemoStockProduct[] = [
  {
    id: "stk-1",
    categoryId: "papelaria-cadernos",
    code: "1001",
    gradeCode: "",
    name: "Caderno universitário 96 folhas Demo",
    stock: "24",
    lastPurchase: "R$ 6,80",
    sale: "R$ 12,90",
  },
  {
    id: "stk-2",
    categoryId: "papelaria-cadernos",
    code: "1002",
    gradeCode: "",
    name: "Agenda 2026 capa dura Demo",
    stock: "8",
    lastPurchase: "R$ 11,40",
    sale: "R$ 22,00",
  },
  {
    id: "stk-3",
    categoryId: "papelaria-canetas",
    code: "1010",
    gradeCode: "",
    name: "Caneta esferográfica Demo",
    stock: "22",
    lastPurchase: "R$ 1,10",
    sale: "R$ 2,50",
    grades: [
      { id: "stk-3-azul", label: "Azul", stock: "8", price: "2,50" },
      { id: "stk-3-preta", label: "Preta", stock: "14", price: "2,50" },
    ],
  },
  {
    id: "stk-4",
    categoryId: "papelaria-arquivos",
    code: "1020",
    gradeCode: "",
    name: "Pasta sanfonada A4 Demo",
    stock: "5",
    lastPurchase: "R$ 9,90",
    sale: "R$ 18,50",
  },
  {
    id: "stk-5",
    categoryId: "casa-cozinha",
    code: "1101",
    gradeCode: "",
    name: "Jogo de copos 6 peças Demo",
    stock: "3",
    lastPurchase: "R$ 24,00",
    sale: "R$ 39,90",
  },
  {
    id: "stk-6",
    categoryId: "vestuario-camisetas",
    code: "1201",
    gradeCode: "G01",
    name: "Camiseta algodão Demo",
    stock: "16",
    lastPurchase: "R$ 18,00",
    sale: "R$ 39,90",
    grades: [
      { id: "stk-6-p", label: "P / Branca", stock: "4", price: "39,90" },
      { id: "stk-6-m", label: "M / Branca", stock: "7", price: "39,90" },
      { id: "stk-6-g", label: "G / Preta", stock: "5", price: "39,90" },
    ],
  },
  {
    id: "stk-7",
    categoryId: "servicos-entrega",
    code: "1301",
    gradeCode: "",
    name: "Taxa de entrega urbana Demo",
    stock: "0",
    lastPurchase: "R$ 0,00",
    sale: "R$ 12,00",
  },
];

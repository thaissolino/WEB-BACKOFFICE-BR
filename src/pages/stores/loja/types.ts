export type LojaTabId = "dados" | "configuracoes" | "fiscal" | "integracoes" | "logs"

export type CnpjSwap = {
  dataAlteracao: string
  cnpjAntigo: string
  descricao: string
}

export type StoreDados = {
  geral: {
    razao: string
    fantasia: string
    cnpj: string
    ie: string
    im: string
    telefone: string
    fax: string
    celular: string
    inauguracao: string
    cep: string
    endereco: string
    numero: string
    bairro: string
    uf: string
    cidade: string
    emailContato: string
    emailCobranca: string
    nomeMatriz: string
  }
  responsavel: {
    nome: string
    telefone: string
  }
  proprietario: {
    nome: string
    cpf: string
    rg: string
    nascimento: string
    email: string
    telefone: string
    celular: string
  }
  trocasCnpj: CnpjSwap[]
}

export type StoreConfiguracoes = Record<string, Record<string, unknown>>

export type FiscalCertificate = {
  cod: string
  modelo: string
  cadastro: string
  vencimento: string
}

export type StoreFiscal = {
  regimeTributario: string
  aliqCredito: string
  regraNfePf: string
  regraNfePj: string
  regraNfce: string
  regraSatCfe: string
  icmsEcfTipo: string
  icmsEcfAliq: string
  modalidadeFrete: string
  transportadora: string
  informacaoAdicional: string
  metaFaturamento: string
  exibirFatura: boolean
  habilitaFrete: boolean
  habilitaUltimaNumeracao: boolean
  habilitaBrindeNf: boolean
  tributacaoIcmsPf: "padrao" | "alternativo"
  codPadraoNfe: string
  ordemProdutosNota: string
  certificado: {
    codigoInterno: string
    nome: string
    email: string
    tokenProducao: string
    tokenHomologacao: string
    logoNfe: string
    logoNfce: string
    certificados: FiscalCertificate[]
  }
}

export type Wm10UsageRow = {
  mes: string
  qtd: string
  valor: string
}

export type StoreIntegracoes = {
  status: {
    nfe: string
    plp: string
    conferencia: string
    impressaoPedido: string
    conferenciaEnvio: string
  }
  smartbis: {
    token: string
    senha: string
    ativo: boolean
  }
  wm10Api: {
    url: string
    cnpj: string
    token: string
    usage: Wm10UsageRow[]
  }
  wm10Webhook: {
    ativo: boolean
    venda: boolean
    cliente: boolean
    produto: boolean
    url: string
  }
  googleMapsApiKey: string
}

export type StoreChangeLogRow = {
  id: string
  storeId: string
  field: string
  fromValue: string | null
  toValue: string | null
  userName: string | null
  session: string | null
  type: string
  createdAt: string
}

export type StoreLojaRecord = {
  id: string
  name: string
  slug: string
  document: string | null
  status: string
  address: string | null
  city: string | null
  manager: string | null
  storeCode: string | null
  commercialClientId: string | null
  commercialClientName: string | null
  dados: Partial<StoreDados> | Record<string, unknown>
  configuracoes: StoreConfiguracoes | Record<string, unknown>
  fiscal: Partial<StoreFiscal> | Record<string, unknown>
  integracoes: Partial<StoreIntegracoes> | Record<string, unknown>
}

export type StoreOption = {
  id: string
  name: string
  storeCode?: string | null
}

export const LOJA_TABS: { id: LojaTabId; label: string }[] = [
  { id: "dados", label: "Dados" },
  { id: "configuracoes", label: "Configurações" },
  { id: "fiscal", label: "$ Fiscal" },
  { id: "integracoes", label: "Integrações" },
  { id: "logs", label: "Logs de alterações" },
]

export const CONFIG_SECTIONS = [
  { id: "sistema", label: "Sistema" },
  { id: "cadastrosUniversais", label: "Cadastros Universais" },
  { id: "clientes", label: "Clientes" },
  { id: "vendasPdv", label: "Vendas / PDV" },
  { id: "financeiroComissao", label: "Financeiro / Comissão" },
  { id: "compra", label: "Compra" },
  { id: "estoque", label: "Estoque" },
  { id: "produto", label: "Produto" },
  { id: "grupos", label: "Grupos", info: true },
  { id: "tabelaPreco", label: "Tabela de Preço" },
  { id: "balanca", label: "Balança" },
] as const

export const UF_OPTIONS = [
  "ACRE",
  "ALAGOAS",
  "AMAPÁ",
  "AMAZONAS",
  "BAHIA",
  "CEARÁ",
  "DISTRITO FEDERAL",
  "ESPÍRITO SANTO",
  "GOIÁS",
  "MARANHÃO",
  "MATO GROSSO",
  "MATO GROSSO DO SUL",
  "MINAS GERAIS",
  "PARÁ",
  "PARAÍBA",
  "PARANÁ",
  "PERNAMBUCO",
  "PIAUÍ",
  "RIO DE JANEIRO",
  "RIO GRANDE DO NORTE",
  "RIO GRANDE DO SUL",
  "RONDÔNIA",
  "RORAIMA",
  "SANTA CATARINA",
  "SÃO PAULO",
  "SERGIPE",
  "TOCANTINS",
]

export const STATUS_OPTIONS = ["SEM STATUS", "A ENVIAR"]

export function storeLabel(store: { storeCode?: string | null; name: string; dados?: unknown }) {
  const dados = store.dados as { geral?: { fantasia?: string } } | undefined
  const fantasia = dados?.geral?.fantasia?.trim()
  const name = fantasia || store.name
  return store.storeCode ? `${store.storeCode} - ${name}` : name
}

export function parseLojaTab(value: string | null | undefined): LojaTabId {
  if (value === "configuracoes" || value === "fiscal" || value === "integracoes" || value === "logs") {
    return value
  }
  return "dados"
}

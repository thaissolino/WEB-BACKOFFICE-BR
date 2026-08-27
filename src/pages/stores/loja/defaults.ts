import { CONFIG_SECTIONS, type StoreConfiguracoes, type StoreDados, type StoreFiscal, type StoreIntegracoes } from "./types"

export const WM10_API_URL = "https://app.wm10.com.br/vitrineshop/sistema/api/"
export const WM10_WEBHOOK_PLACEHOLDER = "https://app.wm10.com.br/webhook"

export const EMPTY_DADOS: StoreDados = {
  geral: {
    razao: "",
    fantasia: "",
    cnpj: "",
    ie: "",
    im: "",
    telefone: "",
    fax: "",
    celular: "",
    inauguracao: "",
    cep: "",
    endereco: "",
    numero: "",
    bairro: "",
    uf: "",
    cidade: "",
    emailContato: "",
    emailCobranca: "",
    nomeMatriz: "",
  },
  responsavel: { nome: "", telefone: "" },
  proprietario: {
    nome: "",
    cpf: "",
    rg: "",
    nascimento: "",
    email: "",
    telefone: "",
    celular: "",
  },
  trocasCnpj: [],
}

export function emptyConfiguracoes(): StoreConfiguracoes {
  const next: StoreConfiguracoes = {}
  for (const section of CONFIG_SECTIONS) {
    next[section.id] = {}
  }
  return next
}

export const EMPTY_FISCAL: StoreFiscal = {
  regimeTributario: "Simples Nacional",
  aliqCredito: "0,00",
  regraNfePf: "",
  regraNfePj: "",
  regraNfce: "",
  regraSatCfe: "",
  icmsEcfTipo: "Tributado",
  icmsEcfAliq: "0,00",
  modalidadeFrete: "Sem Ocorrência de Transporte",
  transportadora: "",
  informacaoAdicional: "Nenhum",
  metaFaturamento: "0,00",
  exibirFatura: true,
  habilitaFrete: true,
  habilitaUltimaNumeracao: false,
  habilitaBrindeNf: false,
  tributacaoIcmsPf: "padrao",
  codPadraoNfe: "Código do Produto",
  ordemProdutosNota: "Nome do produto A-Z",
  certificado: {
    codigoInterno: "",
    nome: "",
    email: "",
    tokenProducao: "",
    tokenHomologacao: "",
    logoNfe: "",
    logoNfce: "",
    certificados: [],
  },
}

export const EMPTY_INTEGRACOES: StoreIntegracoes = {
  status: {
    nfe: "SEM STATUS",
    plp: "SEM STATUS",
    conferencia: "A ENVIAR",
    impressaoPedido: "SEM STATUS",
    conferenciaEnvio: "SEM STATUS",
  },
  smartbis: { token: "", senha: "", ativo: false },
  wm10Api: {
    url: WM10_API_URL,
    cnpj: "",
    token: "",
    usage: [],
  },
  wm10Webhook: {
    ativo: false,
    venda: false,
    cliente: false,
    produto: false,
    url: "",
  },
  googleMapsApiKey: "",
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

export function deepMerge<T>(base: T, extra: unknown): T {
  if (Array.isArray(base)) {
    return (Array.isArray(extra) ? extra : base) as T
  }
  if (!isPlainObject(base)) {
    return (extra === undefined || extra === null ? base : extra) as T
  }
  const source = isPlainObject(extra) ? extra : {}
  const next: Record<string, unknown> = { ...base }
  for (const key of Object.keys(base as Record<string, unknown>)) {
    next[key] = deepMerge((base as Record<string, unknown>)[key], source[key])
  }
  for (const key of Object.keys(source)) {
    if (!(key in next)) next[key] = source[key]
  }
  return next as T
}

function looksEmpty(value: unknown) {
  if (!value || typeof value !== "object") return true
  return Object.keys(value as object).length === 0
}

export function hydrateDados(raw: unknown, storeName: string, document?: string | null): StoreDados {
  const merged = deepMerge(EMPTY_DADOS, raw)
  if (!merged.geral.razao) merged.geral.razao = storeName
  if (!merged.geral.fantasia) merged.geral.fantasia = storeName
  if (!merged.geral.cnpj && document) merged.geral.cnpj = document
  return merged
}

export function hydrateConfiguracoes(raw: unknown): StoreConfiguracoes {
  return deepMerge(emptyConfiguracoes(), looksEmpty(raw) ? {} : raw)
}

export function hydrateFiscal(raw: unknown, _storeName: string): StoreFiscal {
  return deepMerge(EMPTY_FISCAL, looksEmpty(raw) ? {} : raw)
}

export function hydrateIntegracoes(raw: unknown, _storeName: string, document?: string | null): StoreIntegracoes {
  const merged = deepMerge(EMPTY_INTEGRACOES, looksEmpty(raw) ? {} : raw)
  if (!merged.wm10Api.url) merged.wm10Api.url = WM10_API_URL
  if (!merged.wm10Api.cnpj && document) {
    merged.wm10Api.cnpj = document.replace(/\D/g, "")
  }
  return merged
}

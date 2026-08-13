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

export const CONECTA_DADOS: StoreDados = {
  geral: {
    razao: "CONECTA STORE LTDA",
    fantasia: "CONECTA STORE",
    cnpj: "62980449/0001-10",
    ie: "084660562",
    im: "",
    telefone: "(27) 99892-0562",
    fax: "",
    celular: "(27) 99892-0562",
    inauguracao: "",
    cep: "29.165-130",
    endereco: "Avenida Central",
    numero: "1119",
    bairro: "Parque Residencial Laranjeiras",
    uf: "ESPÍRITO SANTO",
    cidade: "Serra",
    emailContato: "CONECTASTORE26@GMAIL.COM",
    emailCobranca: "CONECTASTORE26@GMAIL.COM",
    nomeMatriz: "MATRIZ",
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
  trocasCnpj: [
    { dataAlteracao: "26/09/2022", cnpjAntigo: "00000000000000", descricao: "Trocou de CNPJ" },
    { dataAlteracao: "07/10/2022", cnpjAntigo: "110.303.957-13", descricao: "Trocou de CNPJ" },
    { dataAlteracao: "01/11/2025", cnpjAntigo: "47781418000147", descricao: "Trocou de CNPJ" },
    { dataAlteracao: "01/09/2022", cnpjAntigo: "", descricao: "Trocou de CNPJ" },
  ],
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

export const CONECTA_FISCAL: StoreFiscal = {
  ...EMPTY_FISCAL,
  certificado: {
    codigoInterno: "6311",
    nome: "CONECTA STORE LTDA: 62980449000110",
    email: "",
    tokenProducao: "1/EB7954897B214765E0531E5FA00AD9DD",
    tokenHomologacao: "",
    logoNfe: "",
    logoNfce: "",
    certificados: [
      { cod: "3963", modelo: "NF-e | NFC-e", cadastro: "03/11/2023 09:36:43", vencimento: "02/10/2026" },
      { cod: "3497", modelo: "NF-e | NFC-e | NFS-e", cadastro: "03/09/2024 15:16:05", vencimento: "03/09/2025" },
      { cod: "3494", modelo: "NF-e | NFC-e | NFS-e", cadastro: "28/08/2024 12:37:10", vencimento: "28/08/2025" },
      { cod: "3448", modelo: "NF-e | NFC-e", cadastro: "08/09/2023 15:56:08", vencimento: "24/08/2024" },
      { cod: "4126", modelo: "NF-e", cadastro: "10/10/2022 13:32:35", vencimento: "01/09/2023" },
    ],
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

export const CONECTA_INTEGRACOES: StoreIntegracoes = {
  ...EMPTY_INTEGRACOES,
  wm10Api: {
    url: WM10_API_URL,
    cnpj: "62980449000110",
    token: "FXNpcWd5BQKTQ1VSQ1U",
    usage: [
      { mes: "abril/2025", qtd: "73", valor: "R$ 0,73" },
      { mes: "março/2025", qtd: "103", valor: "R$ 1,03" },
      { mes: "fevereiro/2025", qtd: "70", valor: "R$ 0,70" },
      { mes: "janeiro/2025", qtd: "53", valor: "R$ 0,53" },
      { mes: "dezembro/2024", qtd: "48", valor: "R$ 0,48" },
      { mes: "novembro/2024", qtd: "48", valor: "R$ 0,48" },
    ],
  },
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
  const seed = /conecta store/i.test(storeName) ? CONECTA_DADOS : EMPTY_DADOS
  const merged = deepMerge(seed, raw)
  if (!merged.geral.razao) merged.geral.razao = storeName
  if (!merged.geral.fantasia) merged.geral.fantasia = storeName
  if (!merged.geral.cnpj && document) merged.geral.cnpj = document
  return merged
}

export function hydrateConfiguracoes(raw: unknown): StoreConfiguracoes {
  return deepMerge(emptyConfiguracoes(), looksEmpty(raw) ? {} : raw)
}

export function hydrateFiscal(raw: unknown, storeName: string): StoreFiscal {
  const seed = /conecta store/i.test(storeName) ? CONECTA_FISCAL : EMPTY_FISCAL
  return deepMerge(seed, looksEmpty(raw) ? {} : raw)
}

export function hydrateIntegracoes(raw: unknown, storeName: string, document?: string | null): StoreIntegracoes {
  const seed = /conecta store/i.test(storeName) ? CONECTA_INTEGRACOES : EMPTY_INTEGRACOES
  const merged = deepMerge(seed, looksEmpty(raw) ? {} : raw)
  if (!merged.wm10Api.url) merged.wm10Api.url = WM10_API_URL
  if (!merged.wm10Api.cnpj && document) {
    merged.wm10Api.cnpj = document.replace(/\D/g, "")
  }
  return merged
}

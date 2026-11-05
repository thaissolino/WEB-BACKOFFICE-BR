type PermissaoInvoice = Record<string, unknown> | null | undefined

const ABERTOS_NO_ACESSO_ANTIGO = new Set([
  "MELHORES_PRECOS",
  "LISTAS_COMPRAS",
  "PERDIDOS",
  "BUSCAR_IMEI",
  "TABELA_PRECO",
  "PLANO_CONTAS",
  "DESPESAS",
  "RELATORIO_DRE",
  "RELATORIO_ITENS",
  "RELATORIO_AUDITORIA",
  "ETIQUETAS",
])

export function acessoGestaoNovo(perms: PermissaoInvoice) {
  return typeof perms?.MELHORES_PRECOS === "boolean"
}

export function podeGestao(perms: PermissaoInvoice, chave: string) {
  if (!perms) return false
  const valor = perms[chave]
  if (valor === true) return true
  if (valor === false) return false
  if (acessoGestaoNovo(perms)) return false
  return perms.enabled === true && ABERTOS_NO_ACESSO_ANTIGO.has(chave)
}

export function podeVendas(perms: { VENDAS_CONCLUIDAS?: { enabled?: boolean }; GERENCIAR_INVOICES?: PermissaoInvoice } | null | undefined) {
  if (perms?.VENDAS_CONCLUIDAS?.enabled) return true
  const invoices = perms?.GERENCIAR_INVOICES
  if (acessoGestaoNovo(invoices)) return false
  return invoices?.enabled === true
}

export function podeCaixa(perms: PermissaoInvoice, chave: "CAIXAS_PERMITIDOS" | "CAIXAS_BR_PERMITIDOS") {
  const lista = perms?.[chave]
  return Array.isArray(lista) && lista.length > 0
}

export const CHAVE_DO_MENU: Record<string, string> = {
  "cadastro-lojistas": "LOJISTAS",
  "cadastro-fornecedores": "FORNECEDORES",
  "cadastro-produtos": "PRODUTOS",
  "cadastro-freteiros": "FRETEIROS",
  "cadastro-outros": "OUTROS",
  "cadastro-tabela-preco": "TABELA_PRECO",
  "compras-invoices": "INVOICES",
  "compras-dolar": "MEDIA_DOLAR",
  "compras-relatorios": "RELATORIOS",
  "compras-precos": "MELHORES_PRECOS",
  "compras-listas": "LISTAS_COMPRAS",
  "compras-perdidos": "PERDIDOS",
  "compras-imei": "BUSCAR_IMEI",
  "compras-etiquetas": "ETIQUETAS",
  "mov-fin-plano": "PLANO_CONTAS",
  "mov-fin-despesas": "DESPESAS",
  "relatorio-dre": "RELATORIO_DRE",
  "relatorio-itens-vendas": "RELATORIO_ITENS",
  "relatorio-auditoria-estoque": "RELATORIO_AUDITORIA",
}

export const ABA_GESTAO: Record<string, string> = {
  "melhores-precos": "MELHORES_PRECOS",
  "shopping-lists": "LISTAS_COMPRAS",
  "lost-products": "PERDIDOS",
  "imei-search": "BUSCAR_IMEI",
}

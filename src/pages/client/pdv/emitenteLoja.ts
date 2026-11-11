export type EmitenteLoja = {
  name: string
  document: string
  phone: string
  address: string
  city: string
}

function texto(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

function cidadeLinha(cidade: string, uf: string) {
  if (!uf) return cidade
  if (!cidade) return uf
  if (cidade.localeCompare(uf, "pt-BR", { sensitivity: "base" }) === 0) return cidade
  return `${cidade} - ${uf}`
}

export function emitenteDaLoja(store: {
  name?: string | null
  document?: string | null
  phone?: string | null
  address?: string | null
  city?: string | null
  dados?: unknown
}): EmitenteLoja {
  const dados = (store.dados || {}) as { geral?: Record<string, unknown> }
  const geral = dados.geral || {}
  const razao = texto(geral.razao)
  const fantasia = texto(geral.fantasia)
  const endereco = [texto(geral.endereco), texto(geral.numero)].filter(Boolean).join(", ")
  const address = [endereco, texto(geral.bairro)].filter(Boolean).join(" - ") || texto(store.address)
  return {
    name: razao || fantasia || texto(store.name),
    document: texto(geral.cnpj) || texto(store.document),
    phone: texto(geral.telefone) || texto(geral.celular) || texto(store.phone),
    address,
    city: cidadeLinha(texto(geral.cidade), texto(geral.uf)) || texto(store.city),
  }
}

import { api } from "../../services/api"

const KEY = "br-operadores"
let memoria: Array<Record<string, unknown>> | null = null
let voo: Promise<Array<Record<string, unknown>>> | null = null

function semSegredo(rows: unknown) {
  if (!Array.isArray(rows)) return []
  return rows.map((item) => {
    if (!item || typeof item !== "object") return {}
    const resto = { ...(item as Record<string, unknown>) }
    delete resto.password
    delete resto.accessPassword
    return resto
  })
}

export function lerOperadores() {
  if (memoria) return memoria
  try {
    const salvo = sessionStorage.getItem(KEY)
    if (!salvo) return []
    const dados = semSegredo(JSON.parse(salvo))
    memoria = dados
    return dados
  } catch {
    sessionStorage.removeItem(KEY)
    return []
  }
}

export function guardarOperadores(rows: unknown) {
  memoria = semSegredo(rows)
  try {
    sessionStorage.setItem(KEY, JSON.stringify(memoria))
  } catch {
    /* a lista da tela continua mesmo sem o cache */
  }
}

export function buscarOperadores() {
  if (voo) return voo
  voo = api.get("/users_operators").then(({ data }) => {
    guardarOperadores(data)
    voo = null
    return memoria || []
  }).catch((err) => {
    voo = null
    throw err
  })
  return voo
}

export function aquecerOperadores() {
  lerOperadores()
  return buscarOperadores().catch(() => memoria || [])
}

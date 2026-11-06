import { api } from "../../../services/api"

export type FaixaTransferencia = "abertas" | "concluidas" | "estornadas"

type Pedido = { orders?: unknown[] }

const TRANSFER_KEY = "br-transferencias-recebidas"
const transferCache: Record<FaixaTransferencia, unknown[]> = {
  abertas: [],
  concluidas: [],
  estornadas: [],
}
const transferPronto: Record<FaixaTransferencia, boolean> = {
  abertas: false,
  concluidas: false,
  estornadas: false,
}
let transferAquecido: Promise<void> | null = null

export function lerTransferencias() {
  try {
    const salvo = sessionStorage.getItem(TRANSFER_KEY)
    if (!salvo) return
    const dados = JSON.parse(salvo) as Partial<Record<FaixaTransferencia, unknown[]>>
    for (const faixa of ["abertas", "concluidas", "estornadas"] as const) {
      if (!Array.isArray(dados[faixa])) continue
      transferCache[faixa] = dados[faixa]
      transferPronto[faixa] = true
    }
  } catch {
    sessionStorage.removeItem(TRANSFER_KEY)
  }
}

function gravarTransferencias() {
  try {
    sessionStorage.setItem(TRANSFER_KEY, JSON.stringify(transferCache))
  } catch {
    /* a lista da tela continua mesmo sem o cache */
  }
}

function guardarTransferencias(faixa: FaixaTransferencia, orders: unknown[]) {
  transferCache[faixa] = orders
  transferPronto[faixa] = true
  gravarTransferencias()
}

function pedidosDe(data: Pedido | undefined) {
  return Array.isArray(data?.orders) ? data.orders : []
}

export function gruposTransferencias() {
  return {
    abertas: transferCache.abertas,
    concluidas: transferCache.concluidas,
    estornadas: transferCache.estornadas,
  }
}

export function transferenciaPronta(faixa: FaixaTransferencia) {
  return transferPronto[faixa]
}

export function buscarTransferencias() {
  return Promise.all([
    api.get("/clients/transferencias", { params: { kind: "abertas" } }),
    api.get("/clients/transferencias", { params: { kind: "recebidas" } }),
    api.get("/clients/transferencias", { params: { kind: "estornadas" } }),
  ]).then(([abertas, concluidas, estornadas]) => {
    guardarTransferencias("abertas", pedidosDe(abertas.data))
    guardarTransferencias("concluidas", pedidosDe(concluidas.data))
    guardarTransferencias("estornadas", pedidosDe(estornadas.data))
  })
}

export function aquecerTransferencias() {
  lerTransferencias()
  if (transferAquecido) return transferAquecido
  transferAquecido = buscarTransferencias().catch(() => {
    transferAquecido = null
  })
  return transferAquecido
}

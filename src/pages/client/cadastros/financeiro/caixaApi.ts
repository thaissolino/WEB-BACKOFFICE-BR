import { api } from "../../../../services/api"

export type LojaCaixa = {
  code: number
  name: string
  active: boolean
  payload: Record<string, unknown>
  createdAt: string
}

export async function listLojaCaixas(ativo?: boolean) {
  const { data } = await api.get("/clients/caixas", {
    params: ativo === undefined ? undefined : { ativo: ativo ? "1" : "0" },
  })
  return (data.items as LojaCaixa[]) ?? []
}

export async function createLojaCaixa(name: string) {
  const { data } = await api.post("/clients/caixas", { name })
  return data.item as LojaCaixa
}

export async function updateLojaCaixa(
  code: number,
  body: { name?: string; active?: boolean; payload?: Record<string, unknown> },
) {
  const { data } = await api.put(`/clients/caixas/${code}`, body)
  return data.item as LojaCaixa
}

export async function deleteLojaCaixas(codes: number[]) {
  await api.post("/clients/caixas/delete", { codes })
}

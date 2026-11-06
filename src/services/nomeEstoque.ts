import { useEffect, useState } from "react"
import { api } from "./api"

export const NOME_ESTOQUE_PADRAO = "ESTOQUE GERAL"

let memoria = NOME_ESTOQUE_PADRAO
const ouvintes = new Set<(nome: string) => void>()

export function publicarNomeEstoque(nome: string) {
  memoria = nome.trim() || NOME_ESTOQUE_PADRAO
  ouvintes.forEach((ouvir) => ouvir(memoria))
  return memoria
}

export function useNomeEstoque(origem: "backoffice" | "loja") {
  const caminho = origem === "backoffice" ? "/backoffice/nome-estoque" : "/clients/nome-estoque"
  const [nome, setNome] = useState(memoria)

  useEffect(() => {
    let ativo = true
    setNome(memoria)
    api.get(caminho)
      .then(({ data }) => {
        const lido = String(data?.nome || "").trim() || NOME_ESTOQUE_PADRAO
        publicarNomeEstoque(lido)
        if (ativo) setNome(lido)
      })
      .catch(() => undefined)
    const ouvir = (valor: string) => {
      if (ativo) setNome(valor)
    }
    ouvintes.add(ouvir)
    return () => {
      ativo = false
      ouvintes.delete(ouvir)
    }
  }, [caminho])

  return nome
}

export async function salvarNomeEstoque(nome: string) {
  const { data } = await api.put("/backoffice/nome-estoque", { nome: nome.trim() })
  return publicarNomeEstoque(String(data?.nome || nome))
}

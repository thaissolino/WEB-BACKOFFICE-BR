import { useEffect, useState } from "react"
import { useClientAuth } from "../../../../hooks/clientAuth"
import { listCatalog } from "../catalog/catalogApi"
import { EVENTO_ALTERAR_PRECO, EVENTO_ATUALIZAR_ESTOQUE, EVENTO_ATUALIZAR_PESO, EVENTO_ESTOQUE_LISTA, EVENTO_ESTORNAR_COMPRA, EVENTO_ESTORNAR_VENDA, EVENTO_VER_CUSTO, EVENTO_VER_VENDA, eventoPermitido } from "./groupEvents"

export function useVerCusto() {
  const { client } = useClientAuth()
  const [pode, setPode] = useState(false)

  useEffect(() => {
    if (!client) return
    let ativo = true
    const email = client.email.trim().toLowerCase()
    const username = client.username.trim().toLowerCase()
    Promise.all([listCatalog("user", true), listCatalog("group", true)])
      .then(([users, groups]) => {
        if (!ativo) return
        const user = users.find((item) => {
          const mail = String(item.payload.email || "").trim().toLowerCase()
          const login = String(item.payload.usuario || "").trim().toLowerCase()
          return (email && mail === email) || (username && login === username)
        })
        if (!user) {
          setPode(true)
          return
        }
        const group = groups.find((item) => item.name === String(user.payload.grupo || ""))
        setPode(eventoPermitido(group?.payload.eventos, EVENTO_VER_CUSTO))
      })
      .catch(() => {
        if (ativo) setPode(false)
      })
    return () => {
      ativo = false
    }
  }, [client])

  return pode
}

export function usePermissoesProduto() {
  const { client } = useClientAuth()
  const [flags, setFlags] = useState({ verVenda: false, editarVenda: false, editarEstoque: false, editarPeso: false })

  useEffect(() => {
    if (!client) return
    let ativo = true
    const email = client.email.trim().toLowerCase()
    const username = client.username.trim().toLowerCase()
    Promise.all([listCatalog("user", true), listCatalog("group", true)])
      .then(([users, groups]) => {
        if (!ativo) return
        const user = users.find((item) => {
          const mail = String(item.payload.email || "").trim().toLowerCase()
          const login = String(item.payload.usuario || "").trim().toLowerCase()
          return (email && mail === email) || (username && login === username)
        })
        if (!user) {
          setFlags({ verVenda: true, editarVenda: true, editarEstoque: true, editarPeso: true })
          return
        }
        const group = groups.find((item) => item.name === String(user.payload.grupo || ""))
        const eventos = group?.payload.eventos
        setFlags({
          verVenda: eventoPermitido(eventos, EVENTO_VER_VENDA),
          editarVenda: eventoPermitido(eventos, EVENTO_ALTERAR_PRECO),
          editarEstoque: eventoPermitido(eventos, EVENTO_ATUALIZAR_ESTOQUE) || eventoPermitido(eventos, EVENTO_ESTOQUE_LISTA),
          editarPeso: eventoPermitido(eventos, EVENTO_ATUALIZAR_PESO),
        })
      })
      .catch(() => {
        if (ativo) setFlags({ verVenda: false, editarVenda: false, editarEstoque: false, editarPeso: false })
      })
    return () => {
      ativo = false
    }
  }, [client])

  return flags
}

export function usePodeEstornarVenda() {
  const { client } = useClientAuth()
  const [pode, setPode] = useState<boolean | null>(null)

  useEffect(() => {
    if (!client) return
    let ativo = true
    const email = client.email.trim().toLowerCase()
    const username = client.username.trim().toLowerCase()
    Promise.all([listCatalog("user", true), listCatalog("group", true)])
      .then(([users, groups]) => {
        if (!ativo) return
        const user = users.find((item) => {
          const mail = String(item.payload.email || "").trim().toLowerCase()
          const login = String(item.payload.usuario || "").trim().toLowerCase()
          return (email && mail === email) || (username && login === username)
        })
        if (!user) {
          setPode(true)
          return
        }
        const group = groups.find((item) => item.name === String(user.payload.grupo || ""))
        setPode(eventoPermitido(group?.payload.eventos, EVENTO_ESTORNAR_VENDA))
      })
      .catch(() => {
        if (ativo) setPode(false)
      })
    return () => {
      ativo = false
    }
  }, [client])

  return pode
}

export function usePodeEstornarCompra() {
  const { client } = useClientAuth()
  const [pode, setPode] = useState<boolean | null>(null)

  useEffect(() => {
    if (!client) return
    let ativo = true
    const email = client.email.trim().toLowerCase()
    const username = client.username.trim().toLowerCase()
    Promise.all([listCatalog("user", true), listCatalog("group", true)])
      .then(([users, groups]) => {
        if (!ativo) return
        const user = users.find((item) => {
          const mail = String(item.payload.email || "").trim().toLowerCase()
          const login = String(item.payload.usuario || "").trim().toLowerCase()
          return (email && mail === email) || (username && login === username)
        })
        if (!user) {
          setPode(true)
          return
        }
        const group = groups.find((item) => item.name === String(user.payload.grupo || ""))
        setPode(eventoPermitido(group?.payload.eventos, EVENTO_ESTORNAR_COMPRA))
      })
      .catch(() => {
        if (ativo) setPode(false)
      })
    return () => {
      ativo = false
    }
  }, [client])

  return pode
}

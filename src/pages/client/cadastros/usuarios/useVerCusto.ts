import { useEffect, useState } from "react"
import { useClientAuth } from "../../../../hooks/clientAuth"
import { listCatalog } from "../catalog/catalogApi"
import { EVENTO_VER_CUSTO, eventoPermitido } from "./groupEvents"

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

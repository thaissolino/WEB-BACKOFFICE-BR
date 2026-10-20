import { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import CadastroShell from "../CadastroShell"
import { getCatalog, updateCatalog } from "../catalog/catalogApi"
import { parseError } from "../../../../services/api"
import { GROUP_EVENT_AREAS, GROUP_EVENTS, regraDoEvento } from "./groupEvents"

export default function GroupEventosPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const code = Number(params.get("id") || 0)
  const [groupName, setGroupName] = useState("")
  const [rules, setRules] = useState<Record<string, string>>({})
  const [filtro, setFiltro] = useState("")
  const [status, setStatus] = useState("")
  const regras = useRef<Record<string, string>>({})
  const grupo = useRef<{ name: string; active: boolean; payload: Record<string, unknown> } | null>(null)

  useEffect(() => {
    if (!code) return
    getCatalog("group", code)
      .then((item) => {
        setGroupName(item.name)
        grupo.current = { name: item.name, active: item.active, payload: item.payload }
        const next: Record<string, string> = {}
        for (const event of GROUP_EVENTS) next[event.key] = regraDoEvento(item.payload.eventos, event)
        regras.current = next
        setRules(next)
      })
      .catch(() => setStatus("Não foi possível carregar o grupo."))
  }, [code])

  const termo = filtro.trim().toLocaleLowerCase("pt-BR")
  const visiveis = useMemo(
    () => GROUP_EVENTS.filter((event) => !termo || `${event.code} ${event.label} ${event.area}`.toLocaleLowerCase("pt-BR").includes(termo)),
    [termo],
  )

  async function gravar(next: Record<string, string>) {
    const atual = grupo.current
    if (!code || !atual) return
    try {
      await updateCatalog("group", code, {
        name: atual.name,
        active: atual.active,
        payload: { ...atual.payload, eventos: next },
      })
      atual.payload = { ...atual.payload, eventos: next }
      setStatus("")
    } catch (err) {
      setStatus(parseError(err).friend || "Não foi possível gravar.")
    }
  }

  function aplicar(next: Record<string, string>) {
    regras.current = next
    setRules(next)
    void gravar(next)
  }

  function marcar(key: string, ligado: boolean) {
    aplicar({ ...regras.current, [key]: ligado ? "permitir" : "bloquear" })
  }

  function marcarArea(area: string, ligado: boolean) {
    const next = { ...regras.current }
    for (const event of GROUP_EVENTS) {
      if (event.area === area) next[event.key] = ligado ? "permitir" : "bloquear"
    }
    aplicar(next)
  }

  if (!code) {
    return (
      <CadastroShell>
        <section className="pdv-cad-page">
          <p className="pdv-prod-status">Grupo inválido.</p>
        </section>
      </CadastroShell>
    )
  }

  return (
    <CadastroShell>
      <section className="pdv-cad-page pdv-group-events-page" aria-labelledby="grp-ev-page-title">
        <div className="wm-ev">
          <header className="wm-ev-head">
            <h1 id="grp-ev-page-title">EVENTOS DO GRUPO [{(groupName || "…").toLocaleUpperCase("pt-BR")}]</h1>
            <div className="wm-ev-tools">
              <button className="wm-ev-back" type="button" onClick={() => navigate("/client/usuarios/grupos")}>
                <span aria-hidden="true">←</span> Voltar
              </button>
              <label className="wm-ev-search">
                Pesquisar:
                <input value={filtro} onChange={(event) => setFiltro(event.target.value)} autoComplete="off" />
              </label>
            </div>
          </header>
          <div className="wm-ev-grid">
            {GROUP_EVENT_AREAS.map((area) => {
              const itens = visiveis.filter((event) => event.area === area)
              if (!itens.length) return null
              const todos = GROUP_EVENTS.filter((event) => event.area === area).every((event) => rules[event.key] === "permitir")
              const algum = GROUP_EVENTS.filter((event) => event.area === area).some((event) => rules[event.key] === "permitir")
              return (
                <div key={area} className="wm-ev-bloco">
                  <label className="wm-ev-sec">
                    <input
                      type="checkbox"
                      checked={todos}
                      ref={(el) => {
                        if (el) el.indeterminate = algum && !todos
                      }}
                      onChange={(event) => marcarArea(area, event.target.checked)}
                    />
                    {area}
                  </label>
                  <div className="wm-ev-itens">
                    {itens.map((event) => {
                      const ligado = rules[event.key] === "permitir"
                      return (
                        <label key={event.key} className={ligado ? "wm-ev-item on" : "wm-ev-item"}>
                          <input type="checkbox" checked={ligado} onChange={(input) => marcar(event.key, input.target.checked)} />
                          <span>{event.code ? `${event.code} - ${event.label}` : event.label}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
          {visiveis.length === 0 ? <p className="wm-ev-empty">Nenhum evento com esse nome.</p> : null}
          {status ? <p className="wm-ev-status" role="status">{status}</p> : null}
        </div>
      </section>
    </CadastroShell>
  )
}

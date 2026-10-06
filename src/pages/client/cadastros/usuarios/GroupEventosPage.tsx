import { useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import CadastroShell from "../CadastroShell"
import { getCatalog, updateCatalog } from "../catalog/catalogApi"
import { parseError } from "../../../../services/api"

const GROUP_EVENTS = [
  { key: "pdv.finalizar", label: "Finalizar venda no PDV" },
  { key: "pdv.espera", label: "Enviar venda para vendas em aberto" },
  { key: "pdv.estoque", label: "Ver estoque no PDV" },
  { key: "produto.cadastrar", label: "Cadastrar produto" },
  { key: "produto.duplicar", label: "Duplicar produto" },
  { key: "financeiro.ver", label: "Ver financeiro" },
  { key: "despesa.lancar", label: "Lançar despesa e receita" },
  { key: "caixa.parametros", label: "Alterar parâmetros do caixa" },
  { key: "caixa.trocar", label: "Trocar de caixa no PDV" },
]

export default function GroupEventosPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const code = Number(params.get("id") || 0)
  const [groupName, setGroupName] = useState("")
  const [rules, setRules] = useState<Record<string, string>>({})
  const [status, setStatus] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!code) return
    getCatalog("group", code)
      .then((item) => {
        setGroupName(item.name)
        const current = item.payload.eventos
        const next: Record<string, string> = {}
        for (const event of GROUP_EVENTS) {
          const value = current && typeof current === "object" ? String((current as Record<string, unknown>)[event.key] || "") : ""
          next[event.key] = value === "bloquear" ? "bloquear" : "permitir"
        }
        setRules(next)
      })
      .catch(() => setStatus("Não foi possível carregar o grupo."))
  }, [code])

  async function save() {
    if (!code || saving) return
    setSaving(true)
    setStatus("")
    try {
      const item = await getCatalog("group", code)
      await updateCatalog("group", code, {
        name: item.name,
        active: item.active,
        payload: { ...item.payload, eventos: rules },
      })
      setStatus("Eventos gravados.")
    } catch (err) {
      setStatus(parseError(err).friend || "Não foi possível gravar.")
    } finally {
      setSaving(false)
    }
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
        <div className="pdv-cad-sheet pdv-cad-sheet-wide">
          <div className="pdv-cad-actions">
            <button className="pdv-cad-btn pdv-cad-btn-back pdv-voltar" type="button" onClick={() => navigate("/client/usuarios/grupos")}>
              Voltar
            </button>
            <button className="pdv-cad-btn pdv-cad-btn-green" type="button" disabled={saving} onClick={() => void save()}>
              {saving ? "Salvando…" : "Salvar eventos"}
            </button>
          </div>
          <h1 id="grp-ev-page-title">Eventos · {groupName || "…"}</h1>
          <p className="pdv-cad-kicker">Permita ou bloqueie funções do sistema para quem está neste grupo.</p>
          <ol className="pdv-group-events-list">
            {GROUP_EVENTS.map((event, index) => (
              <li key={event.key}>
                <span className="pdv-group-events-num">{index + 1}</span>
                <div className="pdv-group-events-body">
                  <strong>{event.label}</strong>
                  <div className="pdv-group-events-radios">
                    <label>
                      <input
                        type="radio"
                        name={event.key}
                        checked={rules[event.key] !== "bloquear"}
                        onChange={() => setRules({ ...rules, [event.key]: "permitir" })}
                      />
                      Permitir
                    </label>
                    <label>
                      <input
                        type="radio"
                        name={event.key}
                        checked={rules[event.key] === "bloquear"}
                        onChange={() => setRules({ ...rules, [event.key]: "bloquear" })}
                      />
                      Bloquear
                    </label>
                  </div>
                </div>
              </li>
            ))}
          </ol>
          {status ? <p className="pdv-prod-status" role="status">{status}</p> : null}
        </div>
      </section>
    </CadastroShell>
  )
}

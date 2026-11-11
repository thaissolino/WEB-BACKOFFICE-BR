import { FormEvent, useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { Plus } from "lucide-react"
import CadastroShell from "../CadastroShell"
import { FormRow, RadioSimNao } from "../catalog/FormBits"
import { createCatalog, getCatalog, updateCatalog } from "../catalog/catalogApi"
import { parseError } from "../../../../services/api"
import { avisarSalvo } from "../../avisoSalvo"

export default function GrupoForm() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const editId = Number(params.get("id") || 0)
  const [nome, setNome] = useState("")
  const [ativo, setAtivo] = useState(true)
  const [painelEntregas, setPainelEntregas] = useState(false)
  const [status, setStatus] = useState("")

  useEffect(() => {
    if (!editId) return
    getCatalog("group", editId).then((item) => {
      setNome(item.name.toLocaleUpperCase("pt-BR"))
      setAtivo(item.active)
      setPainelEntregas(Boolean(item.payload.painelEntregas))
    }).catch(() => setStatus("Não foi possível carregar o grupo."))
  }, [editId])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!nome.trim()) {
      setStatus("Informe o nome do grupo.")
      return
    }
    try {
      const payload = { painelEntregas }
      const name = nome.trim().toLocaleUpperCase("pt-BR")
      if (editId) await updateCatalog("group", editId, { name, active: ativo, payload })
      else await createCatalog("group", { name, active: ativo, payload })
      avisarSalvo("Grupo salvo.")
      navigate("/client/usuarios/grupos")
    } catch (err) {
      const parsed = parseError(err)
      setStatus(parsed.friend || parsed.message || "Não foi possível salvar.")
    }
  }

  return (
    <CadastroShell>
      <section className="pdv-cad-page pdv-cli-page" aria-labelledby="pdv-grupo-form">
        <div className="pdv-cad-sheet">
          <div className="pdv-cad-head">
            <h1 id="pdv-grupo-form">{editId ? "ATUALIZAR GRUPO" : "CADASTRAR GRUPO"}</h1>
            <button className="pdv-cad-btn pdv-cad-btn-back pdv-voltar" type="button" onClick={() => navigate("/client/usuarios/grupos")}>
              Voltar
            </button>
          </div>
          <form className="pdv-cad-form" onSubmit={onSubmit}>
            <div className="pdv-cad-form-bar">{editId ? "Atualizar grupo" : "Cadastrar grupo"}</div>
            <FormRow label="Nome do Grupo" required>
              <input value={nome} onChange={(event) => setNome(event.target.value.toLocaleUpperCase("pt-BR"))} autoComplete="off" />
            </FormRow>
            <FormRow label="Ativo">
              <RadioSimNao name="ativo" value={ativo} onChange={setAtivo} />
            </FormRow>
            <FormRow label="Habilita Painel de Entregas">
              <RadioSimNao name="painel" value={painelEntregas} onChange={setPainelEntregas} />
            </FormRow>
            {status ? <p className="pdv-prod-status" role="status">{status}</p> : null}
            <div className="pdv-cad-form-go">
              <button className="pdv-cad-btn pdv-cad-btn-green" type="submit">
                <Plus size={16} strokeWidth={2.6} aria-hidden="true" />
                {editId ? "Salvar" : "Cadastrar"}
              </button>
            </div>
          </form>
        </div>
      </section>
    </CadastroShell>
  )
}

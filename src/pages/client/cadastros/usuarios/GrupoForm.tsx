import { FormEvent, useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { Plus } from "lucide-react"
import CadastroShell from "../CadastroShell"
import { FormRow, RadioSimNao } from "../catalog/FormBits"
import { createCatalog, getCatalog, updateCatalog } from "../catalog/catalogApi"
import { parseError } from "../../../../services/api"

export default function GrupoForm() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const editId = Number(params.get("id") || 0)
  const [nome, setNome] = useState("")
  const [nivel, setNivel] = useState("")
  const [ativo, setAtivo] = useState(true)
  const [painelEntregas, setPainelEntregas] = useState(false)
  const [status, setStatus] = useState("")

  useEffect(() => {
    if (!editId) return
    getCatalog("group", editId).then((item) => {
      setNome(item.name)
      setNivel(String(item.payload.nivel ?? ""))
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
      const payload = { nivel, painelEntregas }
      if (editId) await updateCatalog("group", editId, { name: nome, active: ativo, payload })
      else await createCatalog("group", { name: nome, active: ativo, payload })
      navigate("/client/usuarios/grupos")
    } catch (err) {
      const parsed = parseError(err)
      setStatus(parsed.friend || parsed.message || "Não foi possível salvar.")
    }
  }

  return (
    <CadastroShell>
      <section className="pdv-cad-page" aria-labelledby="pdv-grupo-form">
        <div className="pdv-cad-sheet">
          <h1 id="pdv-grupo-form">{editId ? "ATUALIZAR GRUPO" : "CADASTRAR GRUPO"}</h1>
          <button className="pdv-cad-btn pdv-cad-btn-back pdv-voltar" type="button" onClick={() => navigate("/client/usuarios/grupos")}>
            Voltar
          </button>
          <form className="pdv-cad-form" onSubmit={onSubmit}>
            <FormRow label="Nome do Grupo">
              <input value={nome} onChange={(event) => setNome(event.target.value)} autoComplete="off" />
            </FormRow>
            <FormRow label="Nivel">
              <input value={nivel} onChange={(event) => setNivel(event.target.value)} autoComplete="off" />
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
                Cadastrar
              </button>
            </div>
          </form>
        </div>
      </section>
    </CadastroShell>
  )
}

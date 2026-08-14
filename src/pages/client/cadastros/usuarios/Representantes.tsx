import { FormEvent, useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { Plus } from "lucide-react"
import CadastroShell from "../CadastroShell"
import { FormRow } from "../catalog/FormBits"
import { createCatalog, getCatalog, listCatalog, updateCatalog } from "../catalog/catalogApi"
import { parseError } from "../../../../services/api"
import { formatPhoneBr } from "../../../../utils/brMasks"

export function RepresentanteForm() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const editId = Number(params.get("id") || 0)
  const [nome, setNome] = useState("")
  const [telefone, setTelefone] = useState("")
  const [observacao, setObservacao] = useState("")
  const [status, setStatus] = useState("")

  useEffect(() => {
    if (!editId) return
    getCatalog("representative", editId).then((item) => {
      setNome(item.name)
      setTelefone(String(item.payload.telefone ?? ""))
      setObservacao(String(item.payload.observacao ?? ""))
    }).catch(() => setStatus("Não foi possível carregar."))
  }, [editId])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!nome.trim()) {
      setStatus("Informe o nome.")
      return
    }
    try {
      const payload = { telefone, observacao }
      if (editId) await updateCatalog("representative", editId, { name: nome, payload })
      else await createCatalog("representative", { name: nome, payload })
      navigate("/client/usuarios/representantes")
    } catch (err) {
      const parsed = parseError(err)
      setStatus(parsed.friend || parsed.message || "Não foi possível salvar.")
    }
  }

  return (
    <CadastroShell>
      <section className="pdv-cad-page" aria-labelledby="pdv-rep-form">
        <div className="pdv-cad-sheet">
          <h1 id="pdv-rep-form">{editId ? "ATUALIZAR REPRESENTANTE" : "CADASTRAR REPRESENTANTE"}</h1>
          <button className="pdv-cad-btn pdv-cad-btn-back pdv-voltar" type="button" onClick={() => navigate("/client/usuarios/representantes")}>
            Voltar
          </button>
          <form className="pdv-cad-form" onSubmit={onSubmit}>
            <FormRow label="Nome">
              <input value={nome} onChange={(event) => setNome(event.target.value)} autoComplete="off" />
            </FormRow>
            <FormRow label="Telefone">
              <input value={telefone} onChange={(event) => setTelefone(formatPhoneBr(event.target.value))} autoComplete="off" />
            </FormRow>
            <FormRow label="Observação">
              <textarea rows={4} value={observacao} onChange={(event) => setObservacao(event.target.value)} />
            </FormRow>
            {status ? <p className="pdv-prod-status" role="status">{status}</p> : null}
            <div className="pdv-cad-form-go">
              <button className="pdv-cad-btn pdv-cad-btn-green" type="submit">
                <Plus size={16} strokeWidth={2.6} aria-hidden="true" />
                Cadastrar Representante
              </button>
            </div>
          </form>
        </div>
      </section>
    </CadastroShell>
  )
}

export function IdentificadorForm() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const editId = Number(params.get("id") || 0)
  const [nome, setNome] = useState("")
  const [telefone, setTelefone] = useState("")
  const [email, setEmail] = useState("")
  const [representante, setRepresentante] = useState("Outros")
  const [reps, setReps] = useState<string[]>(["Outros"])
  const [status, setStatus] = useState("")

  useEffect(() => {
    listCatalog("representative", true)
      .then((rows) => setReps(["Outros", ...rows.map((item) => item.name)]))
      .catch(() => setReps(["Outros"]))
  }, [])

  useEffect(() => {
    if (!editId) return
    getCatalog("identifier", editId).then((item) => {
      setNome(item.name)
      setTelefone(String(item.payload.telefone ?? ""))
      setEmail(String(item.payload.email ?? ""))
      setRepresentante(String(item.payload.representante ?? "Outros"))
    }).catch(() => setStatus("Não foi possível carregar."))
  }, [editId])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!nome.trim()) {
      setStatus("Informe o nome.")
      return
    }
    try {
      const payload = { telefone, email, representante }
      if (editId) await updateCatalog("identifier", editId, { name: nome, payload })
      else await createCatalog("identifier", { name: nome, payload })
      navigate("/client/usuarios/representantes/identificadores")
    } catch (err) {
      const parsed = parseError(err)
      setStatus(parsed.friend || parsed.message || "Não foi possível salvar.")
    }
  }

  return (
    <CadastroShell>
      <section className="pdv-cad-page" aria-labelledby="pdv-id-form">
        <div className="pdv-cad-sheet">
          <h1 id="pdv-id-form">{editId ? "ATUALIZAR IDENTIFICADOR" : "CADASTRAR IDENTIFICADOR"}</h1>
          <button className="pdv-cad-btn pdv-cad-btn-back pdv-voltar" type="button" onClick={() => navigate("/client/usuarios/representantes/identificadores")}>
            Voltar
          </button>
          <form className="pdv-cad-form" onSubmit={onSubmit}>
            <FormRow label="Nome">
              <input value={nome} onChange={(event) => setNome(event.target.value)} autoComplete="off" />
            </FormRow>
            <FormRow label="Telefone">
              <input value={telefone} onChange={(event) => setTelefone(formatPhoneBr(event.target.value))} autoComplete="off" />
            </FormRow>
            <FormRow label="E-mail">
              <input value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="off" />
            </FormRow>
            <FormRow label="Representante">
              <select value={representante} onChange={(event) => setRepresentante(event.target.value)}>
                {reps.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </FormRow>
            {status ? <p className="pdv-prod-status" role="status">{status}</p> : null}
            <div className="pdv-cad-form-go">
              <button className="pdv-cad-btn pdv-cad-btn-green" type="submit">
                <Plus size={16} strokeWidth={2.6} aria-hidden="true" />
                Cadastrar Identificador
              </button>
            </div>
          </form>
        </div>
      </section>
    </CadastroShell>
  )
}

export function VincularIdentificador() {
  const navigate = useNavigate()
  const [ids, setIds] = useState<{ code: number; name: string }[]>([])
  const [reps, setReps] = useState<{ code: number; name: string }[]>([])
  const [selected, setSelected] = useState<number[]>([])
  const [destino, setDestino] = useState("")
  const [status, setStatus] = useState("")

  useEffect(() => {
    listCatalog("identifier", true).then((rows) => setIds(rows.map((item) => ({ code: item.code, name: item.name })))).catch(() => setIds([]))
    listCatalog("representative", true).then((rows) => setReps(rows.map((item) => ({ code: item.code, name: item.name })))).catch(() => setReps([]))
  }, [])

  async function onMove() {
    if (!destino || selected.length === 0) {
      setStatus("Selecione identificadores e o representante.")
      return
    }
    try {
      for (const code of selected) {
        const item = await getCatalog("identifier", code)
        await updateCatalog("identifier", code, {
          name: item.name,
          payload: { ...item.payload, representante: destino },
        })
      }
      setStatus("Vínculo atualizado.")
      setSelected([])
    } catch (err) {
      const parsed = parseError(err)
      setStatus(parsed.friend || parsed.message || "Não foi possível vincular.")
    }
  }

  return (
    <CadastroShell>
      <section className="pdv-cad-page" aria-labelledby="pdv-vinc-title">
        <div className="pdv-cad-sheet">
          <h1 id="pdv-vinc-title">VINCULAR IDENTIFICADOR A REPRESENTANTE</h1>
          <button className="pdv-cad-btn pdv-cad-btn-back pdv-voltar" type="button" onClick={() => navigate("/client/usuarios/representantes/identificadores")}>
            Voltar
          </button>
          <div className="pdv-cad-split">
            <label>
              Identificadores
              <select multiple value={selected.map(String)} onChange={(event) => setSelected(Array.from(event.target.selectedOptions).map((opt) => Number(opt.value)))} size={10}>
                {ids.map((item) => (
                  <option key={item.code} value={item.code}>{item.name}</option>
                ))}
              </select>
            </label>
            <label>
              Representante
              <select value={destino} onChange={(event) => setDestino(event.target.value)}>
                <option value="">{"Selecione>>"}</option>
                {reps.map((item) => (
                  <option key={item.code}>{item.name}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="pdv-cad-actions">
            <button className="pdv-cad-btn" type="button" onClick={() => setSelected([])}>Limpar seleção</button>
            <button className="pdv-cad-btn pdv-cad-btn-blue" type="button" onClick={onMove}>Mover</button>
          </div>
          {status ? <p className="pdv-prod-status" role="status">{status}</p> : null}
        </div>
      </section>
    </CadastroShell>
  )
}

import { FormEvent, useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { api, parseError } from "../../../../services/api"
import { avisarSalvo } from "../../avisoSalvo"
import CadastroShell from "../CadastroShell"
import { EMPTY_FORNECEDOR, FornecedorFields, fornecedorFromApi, type FornecedorPayload } from "./FornecedorForm"
import type { PdvSupplier } from "./types"

export default function CadastrarFornecedor() {
  const navigate = useNavigate()
  const { code = "" } = useParams()
  const editing = Boolean(code)
  const [form, setForm] = useState<FornecedorPayload>(EMPTY_FORNECEDOR)
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(editing)

  useEffect(() => {
    if (!code) return
    api
      .get(`/clients/suppliers/${code}`)
      .then(({ data }) => {
        setForm(fornecedorFromApi(data.supplier as PdvSupplier))
        setError("")
      })
      .catch((err) => setError(parseError(err).friend || "Não foi possível abrir o fornecedor."))
      .finally(() => setLoading(false))
  }, [code])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError("")
    try {
      if (editing) await api.put(`/clients/suppliers/${code}`, form)
      else await api.post("/clients/suppliers", form)
      avisarSalvo("Fornecedor salvo.")
      navigate("/client/fornecedores")
    } catch (err) {
      setError(parseError(err).friend || "Não foi possível salvar o fornecedor.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <CadastroShell>
      <section className="pdv-cad-page pdv-cli-page" aria-labelledby="pdv-cad-forn-form-title">
        <div className="pdv-cad-sheet cli-edit">
          <div className="cli-edit-head">
            <h1 id="pdv-cad-forn-form-title">{editing ? "ATUALIZAR FORNECEDOR" : "CADASTRAR FORNECEDOR"}</h1>
            <button className="pdv-cad-btn pdv-cad-btn-back pdv-voltar" type="button" onClick={() => navigate("/client/fornecedores")}>
              Voltar
            </button>
          </div>
          {loading ? <p>Carregando o fornecedor...</p> : null}
          {error ? <p className="pdv-cad-error" role="alert">{error}</p> : null}
          {!loading ? (
            <FornecedorFields
              layout="page"
              form={form}
              onChange={setForm}
              saving={saving}
              submitLabel={editing ? "Salvar" : "Cadastrar Fornecedor"}
              onSubmit={onSubmit}
            />
          ) : null}
        </div>
      </section>
    </CadastroShell>
  )
}

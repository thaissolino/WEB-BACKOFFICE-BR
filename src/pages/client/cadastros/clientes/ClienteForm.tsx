import { FormEvent, useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import CadastroShell from "../CadastroShell"
import { api, parseError } from "../../../../services/api"
import { UFS, type StoreCustomer } from "./types"

const EMPTY = {
  name: "",
  responsible: "",
  portfolio: "",
  phone: "",
  classification: "",
  city: "",
  state: "",
  cep: "",
  document: "",
  financialCode: "",
}

export default function ClienteForm() {
  const navigate = useNavigate()
  const { code = "" } = useParams()
  const [form, setForm] = useState(EMPTY)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState("")

  useEffect(() => {
    if (!code) return
    api
      .get(`/clients/customers/${code}`)
      .then(({ data }) => {
        const customer = data.customer as StoreCustomer
        setForm({
          name: customer.name || "",
          responsible: customer.responsible || "",
          portfolio: customer.portfolio || "",
          phone: customer.phone || "",
          classification: customer.classification || "",
          city: customer.city || "",
          state: customer.state || "",
          cep: customer.cep || "",
          document: customer.document || "",
          financialCode: customer.financialCode || "",
        })
        setStatus("")
      })
      .catch((err) => setStatus(parseError(err).friend || "Não foi possível abrir o cliente."))
      .finally(() => setLoading(false))
  }, [code])

  function setField(key: keyof typeof EMPTY, value: string) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!form.name.trim()) {
      setStatus("Informe o nome.")
      return
    }
    setSaving(true)
    setStatus("")
    try {
      await api.put(`/clients/customers/${code}`, form)
      navigate("/client/clientes")
    } catch (err) {
      setStatus(parseError(err).friend || "Não foi possível salvar o cliente.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <CadastroShell>
      <section className="pdv-cad-page" aria-labelledby="cli-form-title">
        <div className="pdv-cad-sheet">
          <h1 id="cli-form-title">ATUALIZAR CLIENTE</h1>
          <button className="pdv-cad-btn pdv-cad-btn-back pdv-voltar" type="button" onClick={() => navigate("/client/clientes")}>
            Voltar
          </button>
          {loading ? <p>Carregando o cliente...</p> : null}
          {status ? <p className="pdv-cad-error" role="status">{status}</p> : null}
          {!loading ? (
            <form className="pdv-cad-form" onSubmit={onSubmit}>
              <div className="pdv-cad-form-row">
                <span className="pdv-cad-form-label">Código</span>
                <input value={code} readOnly />
              </div>
              <div className="pdv-cad-form-row">
                <span className="pdv-cad-form-label">Nome</span>
                <input value={form.name} onChange={(event) => setField("name", event.target.value)} required />
              </div>
              <div className="pdv-cad-form-row">
                <span className="pdv-cad-form-label">Responsável</span>
                <input value={form.responsible} onChange={(event) => setField("responsible", event.target.value)} />
              </div>
              <div className="pdv-cad-form-row">
                <span className="pdv-cad-form-label">Documento</span>
                <input value={form.document} onChange={(event) => setField("document", event.target.value)} />
              </div>
              <div className="pdv-cad-form-row">
                <span className="pdv-cad-form-label">Telefone</span>
                <input value={form.phone} onChange={(event) => setField("phone", event.target.value)} />
              </div>
              <div className="pdv-cad-form-row">
                <span className="pdv-cad-form-label">Carteira</span>
                <input value={form.portfolio} onChange={(event) => setField("portfolio", event.target.value)} />
              </div>
              <div className="pdv-cad-form-row">
                <span className="pdv-cad-form-label">Classificação</span>
                <input value={form.classification} onChange={(event) => setField("classification", event.target.value)} />
              </div>
              <div className="pdv-cad-form-row">
                <span className="pdv-cad-form-label">CEP</span>
                <input value={form.cep} onChange={(event) => setField("cep", event.target.value)} />
              </div>
              <div className="pdv-cad-form-row">
                <span className="pdv-cad-form-label">Cidade</span>
                <input value={form.city} onChange={(event) => setField("city", event.target.value)} />
              </div>
              <div className="pdv-cad-form-row">
                <span className="pdv-cad-form-label">UF</span>
                <select value={form.state} onChange={(event) => setField("state", event.target.value)}>
                  <option value="">Selecione...</option>
                  {UFS.map((uf) => (
                    <option key={uf} value={uf}>{uf}</option>
                  ))}
                </select>
              </div>
              <div className="pdv-cad-form-row">
                <span className="pdv-cad-form-label">Código financeiro</span>
                <input value={form.financialCode} onChange={(event) => setField("financialCode", event.target.value)} />
              </div>
              <div className="pdv-cad-form-go">
                <button className="pdv-cad-btn pdv-cad-btn-green" type="submit" disabled={saving}>
                  {saving ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </form>
          ) : null}
        </div>
      </section>
    </CadastroShell>
  )
}

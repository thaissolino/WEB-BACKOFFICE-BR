import { FormEvent, useEffect, useRef, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import CadastroShell from "../CadastroShell"
import { api, parseError } from "../../../../services/api"
import { formatCep, formatCpfCnpj, formatPhoneBr, PHONE_BR_MAX_LENGTH } from "../../../../utils/brMasks"
import { avisarSalvo } from "../../avisoSalvo"
import { UFS } from "./types"

const EMPTY = {
  name: "",
  responsible: "",
  portfolio: "",
  phone: "",
  email: "",
  classification: "",
  city: "",
  state: "",
  cep: "",
  address: "",
  number: "",
  neighborhood: "",
  complement: "",
  document: "",
  financialCode: "",
}

type ViaCep = {
  erro?: boolean
  logradouro?: string
  bairro?: string
  localidade?: string
  uf?: string
  complemento?: string
}

export default function ClienteForm({ criar = false }: { criar?: boolean }) {
  const navigate = useNavigate()
  const { code = "" } = useParams()
  const [form, setForm] = useState(EMPTY)
  const [loading, setLoading] = useState(!criar)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState("")
  const [cepMsg, setCepMsg] = useState("")
  const cepBusca = useRef("")

  useEffect(() => {
    if (criar || !code) {
      setLoading(false)
      return
    }
    api
      .get(`/clients/customers/${code}`)
      .then(({ data }) => {
        const customer = data.customer as Partial<typeof EMPTY>
        setForm({
          name: customer.name || "",
          responsible: customer.responsible || "",
          portfolio: customer.portfolio || "",
          phone: customer.phone || "",
          email: customer.email || "",
          classification: customer.classification || "",
          city: customer.city || "",
          state: customer.state || "",
          cep: customer.cep || "",
          address: customer.address || "",
          number: customer.number || "",
          neighborhood: customer.neighborhood || "",
          complement: customer.complement || "",
          document: customer.document || "",
          financialCode: customer.financialCode || "",
        })
        cepBusca.current = (customer.cep || "").replace(/\D/g, "")
        setStatus("")
      })
      .catch((err) => setStatus(parseError(err).friend || "Não foi possível abrir o cliente."))
      .finally(() => setLoading(false))
  }, [code, criar])

  function setField(key: keyof typeof EMPTY, value: string) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function onCep(value: string) {
    const cep = formatCep(value)
    setField("cep", cep)
    const digits = cep.replace(/\D/g, "")
    if (digits.length !== 8 || digits === cepBusca.current) return
    cepBusca.current = digits
    setCepMsg("Buscando endereço...")
    try {
      const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
      const data = (await response.json()) as ViaCep
      if (!response.ok || data.erro) {
        setCepMsg("CEP não encontrado.")
        return
      }
      setForm((current) => ({
        ...current,
        cep,
        address: data.logradouro || current.address,
        neighborhood: data.bairro || current.neighborhood,
        city: data.localidade || current.city,
        state: (data.uf || current.state).toUpperCase(),
        complement: current.complement || data.complemento || "",
      }))
      setCepMsg(data.logradouro ? "Endereço preenchido pelo CEP. Informe o número." : "CEP encontrado. Complete o logradouro e o número.")
    } catch {
      cepBusca.current = ""
      setCepMsg("Não foi possível consultar o CEP.")
    }
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
      const payload = {
        ...form,
        name: form.name.trim(),
        responsible: form.name.trim(),
        portfolio: form.portfolio || "",
        phone: form.phone || "",
        classification: form.classification || "",
        city: form.city || "",
        state: form.state || "",
        cep: form.cep || "",
        document: form.document || "",
        financialCode: form.financialCode || "0",
      }
      if (criar) {
        const { data } = await api.post("/clients/customers", payload)
        const novo = String((data.customer as { code?: string | number })?.code || "")
        avisarSalvo("Cliente cadastrado.")
        navigate("/client/clientes", { state: { returnedCustomerCode: novo } })
      } else {
        await api.put(`/clients/customers/${code}`, payload)
        avisarSalvo("Cliente salvo.")
        navigate("/client/clientes", { state: { returnedCustomerCode: String(code) } })
      }
    } catch (err) {
      setStatus(parseError(err).friend || "Não foi possível salvar o cliente.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <CadastroShell>
      <section className="pdv-cad-page pdv-cli-page" aria-labelledby="cli-form-title">
        <div className="pdv-cad-sheet cli-edit">
          <div className="cli-edit-head">
            <button className="pdv-cad-btn pdv-cad-btn-back pdv-voltar" type="button" onClick={() => navigate("/client/clientes", { state: { returnedCustomerCode: String(code) } })}>
              Voltar
            </button>
            <h1 id="cli-form-title">{criar ? "CADASTRAR CLIENTE" : "ATUALIZAR CLIENTE"}</h1>
          </div>
          {loading ? <p>Carregando o cliente...</p> : null}
          {status ? <p className="pdv-cad-error" role="status">{status}</p> : null}
          {!loading ? (
            <form id="cli-cadastro" className="cli-edit-scroll" onSubmit={onSubmit}>
              <fieldset>
                <legend>Dados</legend>
                <div className="cli-edit-grid">
                  {criar ? null : (
                    <label>
                      Código
                      <input value={code} readOnly />
                    </label>
                  )}
                  <label className="cli-edit-span">
                    Nome
                    <input value={form.name} onChange={(event) => setField("name", event.target.value.toLocaleUpperCase("pt-BR"))} required autoFocus={criar} />
                  </label>
                  <label>
                    CPF / CNPJ
                    <input value={form.document} onChange={(event) => setField("document", formatCpfCnpj(event.target.value))} inputMode="numeric" />
                  </label>
                  <label>
                    Telefone
                    <input value={form.phone} onChange={(event) => setField("phone", formatPhoneBr(event.target.value))} inputMode="tel" maxLength={PHONE_BR_MAX_LENGTH} />
                  </label>
                  <label className="cli-edit-span">
                    E-mail
                    <input value={form.email} onChange={(event) => setField("email", event.target.value)} type="email" autoComplete="email" placeholder="cliente@email.com" />
                  </label>
                </div>
              </fieldset>

              <fieldset>
                <legend>Endereço</legend>
                <div className="cli-edit-grid">
                  <label>
                    CEP
                    <input value={form.cep} onChange={(event) => void onCep(event.target.value)} inputMode="numeric" autoComplete="postal-code" placeholder="00000-000" />
                    <span className="cli-cep-note">{cepMsg || "Digite o CEP para preencher o endereço."}</span>
                  </label>
                  <label className="cli-edit-span">
                    Logradouro
                    <input value={form.address} onChange={(event) => setField("address", event.target.value)} autoComplete="address-line1" />
                  </label>
                  <label>
                    Número
                    <input value={form.number} onChange={(event) => setField("number", event.target.value)} autoComplete="off" />
                  </label>
                  <label>
                    Complemento
                    <input value={form.complement} onChange={(event) => setField("complement", event.target.value)} autoComplete="address-line2" />
                  </label>
                  <label>
                    Bairro
                    <input value={form.neighborhood} onChange={(event) => setField("neighborhood", event.target.value)} />
                  </label>
                  <label>
                    Cidade
                    <input value={form.city} onChange={(event) => setField("city", event.target.value)} />
                  </label>
                  <label>
                    UF
                    <select value={form.state} onChange={(event) => setField("state", event.target.value)}>
                      <option value="">Selecione...</option>
                      {UFS.map((uf) => (
                        <option key={uf} value={uf}>{uf}</option>
                      ))}
                    </select>
                  </label>
                </div>
              </fieldset>

              <div className="cli-edit-save">
                <button className="pdv-cad-btn pdv-cad-btn-green" type="submit" disabled={saving}>
                  {saving ? "Salvando..." : criar ? "Cadastrar" : "Salvar"}
                </button>
              </div>
            </form>
          ) : null}
        </div>
      </section>
    </CadastroShell>
  )
}

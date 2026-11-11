import { FormEvent, useRef, useState } from "react"
import { Info } from "lucide-react"
import { formatCep, formatCnpj, formatCpf, formatPhoneBr, PHONE_BR_MAX_LENGTH } from "../../../../utils/brMasks"
import { UFS } from "../clientes/types"
import type { PersonType, PdvSupplier, SupplierKind } from "./types"

export type FornecedorPayload = {
  personType: PersonType
  document: string
  razao: string
  fantasia: string
  inscricaoEstadual: string
  cep: string
  address: string
  number: string
  neighborhood: string
  city: string
  uf: string
  phone: string
  mobile: string
  contact: string
  profitCalc: string
  email: string
  supplierKind: SupplierKind
  internal: boolean
  notes: string
}

type ViaCep = {
  erro?: boolean
  logradouro?: string
  bairro?: string
  localidade?: string
  uf?: string
}

export const EMPTY_FORNECEDOR: FornecedorPayload = {
  personType: "juridica",
  document: "",
  razao: "",
  fantasia: "",
  inscricaoEstadual: "",
  cep: "",
  address: "",
  number: "",
  neighborhood: "",
  city: "",
  uf: "",
  phone: "",
  mobile: "",
  contact: "",
  profitCalc: "Por Produto",
  email: "",
  supplierKind: "produto",
  internal: false,
  notes: "",
}

export function fornecedorFromApi(item: PdvSupplier): FornecedorPayload {
  return {
    personType: item.personType,
    document: item.document || "",
    razao: item.razao || "",
    fantasia: item.fantasia || "",
    inscricaoEstadual: item.inscricaoEstadual || "",
    cep: item.cep || "",
    address: item.address || "",
    number: item.number || "",
    neighborhood: item.neighborhood || "",
    city: item.city || "",
    uf: item.uf || "",
    phone: item.phone || "",
    mobile: item.mobile || "",
    contact: item.contact || "",
    profitCalc: item.profitCalc || "Por Produto",
    email: item.email || "",
    supplierKind: item.supplierKind,
    internal: item.internal,
    notes: item.notes || "",
  }
}

export function nomeDoFornecedor(item: { razao?: string; fantasia?: string; document?: string; code?: number | string }) {
  return (item.razao || item.fantasia || item.document || (item.code != null ? `Fornecedor ${item.code}` : "")).trim()
}

export function FornecedorFields({
  form,
  onChange,
  saving,
  submitLabel,
  onSubmit,
  layout = "rows",
}: {
  form: FornecedorPayload
  onChange: (next: FornecedorPayload) => void
  saving?: boolean
  submitLabel: string
  onSubmit: (event: FormEvent) => void
  layout?: "rows" | "page"
}) {
  const [cepMsg, setCepMsg] = useState("")
  const cepBusca = useRef(form.cep.replace(/\D/g, ""))
  const docLabel = form.personType === "fisica" ? "CPF" : form.personType === "estrangeiro" ? "Doc. Estrangeiro" : "CNPJ"

  function setField<K extends keyof FornecedorPayload>(key: K, value: FornecedorPayload[K]) {
    onChange({ ...form, [key]: value })
  }

  function onPersonType(next: PersonType) {
    onChange({ ...form, personType: next, document: "" })
  }

  function onDocument(value: string) {
    if (form.personType === "fisica") setField("document", formatCpf(value))
    else if (form.personType === "juridica") setField("document", formatCnpj(value))
    else setField("document", value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 20))
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
      onChange({
        ...form,
        cep,
        address: data.logradouro || form.address,
        neighborhood: data.bairro || form.neighborhood,
        city: data.localidade || form.city,
        uf: (data.uf || form.uf).toUpperCase(),
      })
      setCepMsg(data.logradouro ? "Endereço preenchido pelo CEP." : "CEP encontrado.")
    } catch {
      cepBusca.current = ""
      setCepMsg("Não foi possível consultar o CEP.")
    }
  }

  if (layout === "page") {
    return (
      <form className="cli-edit-scroll" onSubmit={onSubmit}>
        <fieldset>
          <legend>Dados</legend>
          <div className="cli-edit-grid">
            <div className="cli-edit-span">
              <span className="cli-edit-label">Tipo de pessoa</span>
              <fieldset className="cli-edit-radios">
                <legend className="pdv-sr">Tipo de Pessoa</legend>
                <label className={form.personType === "fisica" ? "is-on" : undefined}>
                  <input type="radio" name="pessoa" checked={form.personType === "fisica"} onChange={() => onPersonType("fisica")} />
                  Física
                </label>
                <label className={form.personType === "juridica" ? "is-on" : undefined}>
                  <input type="radio" name="pessoa" checked={form.personType === "juridica"} onChange={() => onPersonType("juridica")} />
                  Jurídica
                </label>
                <label className={form.personType === "estrangeiro" ? "is-on" : undefined}>
                  <input type="radio" name="pessoa" checked={form.personType === "estrangeiro"} onChange={() => onPersonType("estrangeiro")} />
                  Estrangeiro
                </label>
              </fieldset>
            </div>
            <label>
              {docLabel}
              <input value={form.document} onChange={(event) => onDocument(event.target.value)} autoComplete="off" />
            </label>
            <label>
              Razão
              <input value={form.razao} onChange={(event) => setField("razao", event.target.value)} autoComplete="organization" />
            </label>
            <label>
              Fantasia
              <input value={form.fantasia} onChange={(event) => setField("fantasia", event.target.value)} autoComplete="off" />
            </label>
            <label>
              Inscrição estadual
              <input value={form.inscricaoEstadual} onChange={(event) => setField("inscricaoEstadual", event.target.value)} autoComplete="off" />
            </label>
            <div>
              <span className="cli-edit-label">Tipo de fornecedor</span>
              <fieldset className="cli-edit-radios">
                <legend className="pdv-sr">Tipo de Fornecedor</legend>
                <label className={form.supplierKind === "produto" ? "is-on" : undefined}>
                  <input type="radio" name="tipo-forn" checked={form.supplierKind === "produto"} onChange={() => setField("supplierKind", "produto")} />
                  Produto
                </label>
                <label className={form.supplierKind === "despesas" ? "is-on" : undefined}>
                  <input type="radio" name="tipo-forn" checked={form.supplierKind === "despesas"} onChange={() => setField("supplierKind", "despesas")} />
                  Despesas
                </label>
              </fieldset>
            </div>
            <div>
              <span className="cli-edit-label">Fornecedor interno <Info size={14} aria-hidden="true" /></span>
              <button className="pdv-cad-toggle" type="button" aria-pressed={form.internal} onClick={() => setField("internal", !form.internal)}>
                {form.internal ? "Sim" : "Não"}
              </button>
            </div>
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
              Número / complemento
              <input value={form.number} onChange={(event) => setField("number", event.target.value)} autoComplete="off" />
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
              <select value={form.uf} onChange={(event) => setField("uf", event.target.value)}>
                <option value="">Selecione...</option>
                {UFS.map((uf) => (
                  <option key={uf} value={uf}>{uf}</option>
                ))}
              </select>
            </label>
          </div>
        </fieldset>

        <fieldset>
          <legend>Contato</legend>
          <div className="cli-edit-grid">
            <label>
              Telefone
              <input value={form.phone} onChange={(event) => setField("phone", formatPhoneBr(event.target.value))} maxLength={PHONE_BR_MAX_LENGTH} inputMode="tel" autoComplete="off" />
            </label>
            <label>
              Celular
              <input value={form.mobile} onChange={(event) => setField("mobile", formatPhoneBr(event.target.value))} maxLength={PHONE_BR_MAX_LENGTH} inputMode="tel" autoComplete="off" />
            </label>
            <label>
              Contato
              <input value={form.contact} onChange={(event) => setField("contact", event.target.value)} autoComplete="off" />
            </label>
            <label>
              E-mail
              <input value={form.email} onChange={(event) => setField("email", event.target.value)} type="email" autoComplete="off" placeholder="fornecedor@email.com" />
            </label>
          </div>
        </fieldset>

        <fieldset>
          <legend>Comercial</legend>
          <div className="cli-edit-grid">
            <label className="cli-edit-span">
              Cálculo do lucro para preço de venda sugerido
              <select value={form.profitCalc} onChange={(event) => setField("profitCalc", event.target.value)}>
                <option>Por Produto</option>
                <option>Markup</option>
              </select>
            </label>
            <label className="cli-edit-span">
              Obs
              <textarea value={form.notes} onChange={(event) => setField("notes", event.target.value)} rows={4} />
            </label>
          </div>
        </fieldset>

        <div className="cli-edit-save">
          <button className="pdv-cad-btn pdv-cad-btn-green" type="submit" disabled={saving}>
            {saving ? "Salvando..." : submitLabel}
          </button>
        </div>
      </form>
    )
  }

  return (
    <form className="pdv-cad-form pdv-forn-form" onSubmit={onSubmit}>
      <div className="pdv-cad-form-row">
        <span className="pdv-cad-form-label">Tipo de Pessoa</span>
        <fieldset className="pdv-cad-radios">
          <legend className="pdv-sr">Tipo de Pessoa</legend>
          <label>
            <input type="radio" name="pessoa" checked={form.personType === "fisica"} onChange={() => onPersonType("fisica")} />
            Física
          </label>
          <label>
            <input type="radio" name="pessoa" checked={form.personType === "juridica"} onChange={() => onPersonType("juridica")} />
            Jurídica
          </label>
          <label>
            <input type="radio" name="pessoa" checked={form.personType === "estrangeiro"} onChange={() => onPersonType("estrangeiro")} />
            Estrangeiro
          </label>
        </fieldset>
      </div>
      <label className="pdv-cad-form-row">
        <span className="pdv-cad-form-label">{docLabel}</span>
        <input value={form.document} onChange={(event) => onDocument(event.target.value)} autoComplete="off" />
      </label>
      <label className="pdv-cad-form-row">
        <span className="pdv-cad-form-label">Razão</span>
        <input value={form.razao} onChange={(event) => setField("razao", event.target.value)} autoComplete="off" />
      </label>
      <label className="pdv-cad-form-row">
        <span className="pdv-cad-form-label">Fantasia</span>
        <input value={form.fantasia} onChange={(event) => setField("fantasia", event.target.value)} autoComplete="off" />
      </label>
      <label className="pdv-cad-form-row">
        <span className="pdv-cad-form-label">Inscrição Estadual</span>
        <input value={form.inscricaoEstadual} onChange={(event) => setField("inscricaoEstadual", event.target.value)} autoComplete="off" />
      </label>
      <label className="pdv-cad-form-row">
        <span className="pdv-cad-form-label">CEP</span>
        <input value={form.cep} onChange={(event) => void onCep(event.target.value)} inputMode="numeric" autoComplete="postal-code" />
      </label>
      {cepMsg ? <p className="pdv-cad-hint">{cepMsg}</p> : null}
      <label className="pdv-cad-form-row">
        <span className="pdv-cad-form-label">Endereço</span>
        <input value={form.address} onChange={(event) => setField("address", event.target.value)} autoComplete="off" />
      </label>
      <label className="pdv-cad-form-row">
        <span className="pdv-cad-form-label">Número/Complemento</span>
        <input value={form.number} onChange={(event) => setField("number", event.target.value)} autoComplete="off" />
      </label>
      <label className="pdv-cad-form-row">
        <span className="pdv-cad-form-label">Bairro</span>
        <input value={form.neighborhood} onChange={(event) => setField("neighborhood", event.target.value)} autoComplete="off" />
      </label>
      <label className="pdv-cad-form-row">
        <span className="pdv-cad-form-label">Cidade</span>
        <input value={form.city} onChange={(event) => setField("city", event.target.value)} autoComplete="off" />
      </label>
      <label className="pdv-cad-form-row">
        <span className="pdv-cad-form-label">UF</span>
        <select value={form.uf} onChange={(event) => setField("uf", event.target.value)}>
          <option value=""></option>
          {UFS.map((uf) => (
            <option key={uf} value={uf}>{uf}</option>
          ))}
        </select>
      </label>
      <label className="pdv-cad-form-row">
        <span className="pdv-cad-form-label">Telefone</span>
        <input value={form.phone} onChange={(event) => setField("phone", formatPhoneBr(event.target.value))} maxLength={PHONE_BR_MAX_LENGTH} inputMode="tel" autoComplete="off" />
      </label>
      <label className="pdv-cad-form-row">
        <span className="pdv-cad-form-label">Celular</span>
        <input value={form.mobile} onChange={(event) => setField("mobile", formatPhoneBr(event.target.value))} maxLength={PHONE_BR_MAX_LENGTH} inputMode="tel" autoComplete="off" />
      </label>
      <label className="pdv-cad-form-row">
        <span className="pdv-cad-form-label">Contato</span>
        <input value={form.contact} onChange={(event) => setField("contact", event.target.value)} autoComplete="off" />
      </label>
      <div className="pdv-cad-form-row pdv-cad-form-row-top">
        <span className="pdv-cad-form-label">Cálculo do lucro para gerar Preço de Venda sugerido será por</span>
        <div>
          <select value={form.profitCalc} onChange={(event) => setField("profitCalc", event.target.value)}>
            <option>Por Produto</option>
            <option>Markup</option>
          </select>
        </div>
      </div>
      <label className="pdv-cad-form-row">
        <span className="pdv-cad-form-label">E-mail</span>
        <input value={form.email} onChange={(event) => setField("email", event.target.value)} autoComplete="off" />
      </label>
      <div className="pdv-cad-form-row">
        <span className="pdv-cad-form-label">Tipo de Fornecedor</span>
        <fieldset className="pdv-cad-radios">
          <legend className="pdv-sr">Tipo de Fornecedor</legend>
          <label>
            <input type="radio" name="tipo-forn" checked={form.supplierKind === "produto"} onChange={() => setField("supplierKind", "produto")} />
            Produto
          </label>
          <label>
            <input type="radio" name="tipo-forn" checked={form.supplierKind === "despesas"} onChange={() => setField("supplierKind", "despesas")} />
            Despesas
          </label>
        </fieldset>
      </div>
      <div className="pdv-cad-form-row">
        <span className="pdv-cad-form-label">
          Fornecedor Interno <Info size={14} aria-hidden="true" />
        </span>
        <button className="pdv-cad-toggle" type="button" aria-pressed={form.internal} onClick={() => setField("internal", !form.internal)}>
          {form.internal ? "Sim" : "Não"}
        </button>
      </div>
      <label className="pdv-cad-form-row pdv-cad-form-row-top">
        <span className="pdv-cad-form-label">Obs</span>
        <textarea value={form.notes} onChange={(event) => setField("notes", event.target.value)} rows={4} />
      </label>
      <div className="pdv-cad-form-go">
        <button className="pdv-cad-btn pdv-cad-btn-green" type="submit" disabled={saving}>
          {saving ? "Salvando..." : submitLabel}
        </button>
      </div>
    </form>
  )
}

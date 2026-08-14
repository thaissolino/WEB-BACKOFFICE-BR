import { FormEvent, useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { Plus } from "lucide-react"
import CadastroShell from "../CadastroShell"
import { FormRow, RadioSimNao } from "../catalog/FormBits"
import { createCatalog, getCatalog, listCatalog, updateCatalog } from "../catalog/catalogApi"
import { parseError } from "../../../../services/api"
import { formatPhoneBr } from "../../../../utils/brMasks"
import { usePdvSession } from "../../dashboard/PdvShell"

const EMPTY = {
  nome: "",
  usuario: "",
  senha: "",
  apelido: "",
  email: "",
  celular: "",
  telefone: "",
  loja: "",
  grupo: "",
  cep: "",
  endereco: "",
  complemento: "",
  bairro: "",
  cidade: "",
  uf: "SP",
  rg: "",
  cpf: "",
  operadorCaixa: [] as string[],
  vendedorCaixa: [] as string[],
  filiais: [] as string[],
  notificaEmail: false,
  inativarSemLogar: false,
}

export default function UsuarioForm() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const editId = Number(params.get("id") || 0)
  const { stores, storeName } = usePdvSession()
  const [form, setForm] = useState({ ...EMPTY, loja: storeName })
  const [groups, setGroups] = useState<{ code: number; name: string }[]>([])
  const [caixas, setCaixas] = useState<{ code: number; name: string }[]>([])
  const [status, setStatus] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    listCatalog("group", true).then((rows) => setGroups(rows.map((item) => ({ code: item.code, name: item.name })))).catch(() => setGroups([]))
    listCatalog("cash_register", true).then((rows) => setCaixas(rows.map((item) => ({ code: item.code, name: item.name })))).catch(() => setCaixas([]))
  }, [])

  useEffect(() => {
    if (!editId) return
    getCatalog("user", editId)
      .then((item) => {
        setForm({
          ...EMPTY,
          nome: item.name,
          usuario: String(item.payload.usuario ?? ""),
          senha: "",
          apelido: String(item.payload.apelido ?? ""),
          email: String(item.payload.email ?? ""),
          celular: String(item.payload.celular ?? ""),
          telefone: String(item.payload.telefone ?? ""),
          loja: String(item.payload.loja ?? storeName),
          grupo: String(item.payload.grupo ?? ""),
          cep: String(item.payload.cep ?? ""),
          endereco: String(item.payload.endereco ?? ""),
          complemento: String(item.payload.complemento ?? ""),
          bairro: String(item.payload.bairro ?? ""),
          cidade: String(item.payload.cidade ?? ""),
          uf: String(item.payload.uf ?? "SP"),
          rg: String(item.payload.rg ?? ""),
          cpf: String(item.payload.cpf ?? ""),
          operadorCaixa: Array.isArray(item.payload.operadorCaixa) ? (item.payload.operadorCaixa as string[]) : [],
          vendedorCaixa: Array.isArray(item.payload.vendedorCaixa) ? (item.payload.vendedorCaixa as string[]) : [],
          filiais: Array.isArray(item.payload.filiais) ? (item.payload.filiais as string[]) : [],
          notificaEmail: Boolean(item.payload.notificaEmail),
          inativarSemLogar: Boolean(item.payload.inativarSemLogar),
        })
      })
      .catch(() => setStatus("Não foi possível carregar o usuário."))
  }, [editId, storeName])

  function toggleList(key: "operadorCaixa" | "vendedorCaixa" | "filiais", value: string) {
    setForm((current) => {
      const has = current[key].includes(value)
      return { ...current, [key]: has ? current[key].filter((item) => item !== value) : [...current[key], value] }
    })
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!form.nome.trim() || !form.usuario.trim() || (!editId && !form.senha.trim()) || !form.apelido.trim() || !form.email.trim() || !form.celular.trim() || !form.loja || !form.grupo) {
      setStatus("Preencha os campos obrigatórios.")
      return
    }
    setSaving(true)
    setStatus("")
    const payload = { ...form }
    try {
      if (editId) await updateCatalog("user", editId, { name: form.nome, payload, active: true })
      else await createCatalog("user", { name: form.nome, payload, active: true })
      navigate("/client/usuarios")
    } catch (err) {
      const parsed = parseError(err)
      setStatus(parsed.friend || parsed.message || "Não foi possível salvar.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <CadastroShell>
      <section className="pdv-cad-page" aria-labelledby="pdv-user-form">
        <div className="pdv-cad-sheet">
          <h1 id="pdv-user-form">{editId ? "ATUALIZAR USUÁRIO" : "CADASTRAR USUÁRIO"}</h1>
          <button className="pdv-cad-btn pdv-cad-btn-back pdv-voltar" type="button" onClick={() => navigate("/client/usuarios")}>
            Voltar
          </button>
          <form className="pdv-cad-form" onSubmit={onSubmit}>
            <div className="pdv-cad-form-bar">Cadastrar Usuário</div>
            <FormRow label="Nome Completo" required>
              <input value={form.nome} onChange={(event) => setForm({ ...form, nome: event.target.value })} autoComplete="off" />
            </FormRow>
            <FormRow label="Usuário para logar no sistema" required>
              <input value={form.usuario} onChange={(event) => setForm({ ...form, usuario: event.target.value })} autoComplete="off" />
            </FormRow>
            <FormRow label="Senha" required>
              <input type="password" value={form.senha} onChange={(event) => setForm({ ...form, senha: event.target.value })} autoComplete="new-password" />
            </FormRow>
            <FormRow label="Apelido" required>
              <input value={form.apelido} onChange={(event) => setForm({ ...form, apelido: event.target.value })} autoComplete="off" />
            </FormRow>
            <FormRow label="E-mail" required>
              <input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} autoComplete="off" />
            </FormRow>
            <FormRow label="Celular" required>
              <input value={form.celular} onChange={(event) => setForm({ ...form, celular: formatPhoneBr(event.target.value) })} autoComplete="off" />
            </FormRow>
            <FormRow label="Telefone">
              <input value={form.telefone} onChange={(event) => setForm({ ...form, telefone: formatPhoneBr(event.target.value) })} autoComplete="off" />
            </FormRow>
            <FormRow label="Loja" required>
              <fieldset className="pdv-cad-radios pdv-cad-radios-stack">
                <legend className="pdv-sr">Loja</legend>
                {stores.map((store) => (
                  <label key={store.id}>
                    <input type="radio" name="loja" checked={form.loja === store.name} onChange={() => setForm({ ...form, loja: store.name })} />
                    {store.name}
                  </label>
                ))}
              </fieldset>
            </FormRow>
            <FormRow label="Grupo de acesso" required>
              <select value={form.grupo} onChange={(event) => setForm({ ...form, grupo: event.target.value })}>
                <option value="">{"Selecione>>"}</option>
                {groups.map((group) => (
                  <option key={group.code} value={group.name}>{group.name}</option>
                ))}
              </select>
            </FormRow>
            <FormRow label="FILIAIS">
              <div className="pdv-cad-check-grid">
                {stores.map((store) => (
                  <label key={store.id}>
                    <input type="checkbox" checked={form.filiais.includes(store.name)} onChange={() => toggleList("filiais", store.name)} />
                    {store.name}
                  </label>
                ))}
              </div>
            </FormRow>
            <FormRow label="CEP">
              <input value={form.cep} onChange={(event) => setForm({ ...form, cep: event.target.value })} autoComplete="off" />
            </FormRow>
            <FormRow label="Endereço">
              <input value={form.endereco} onChange={(event) => setForm({ ...form, endereco: event.target.value })} autoComplete="off" />
            </FormRow>
            <FormRow label="Número / Complemento">
              <input value={form.complemento} onChange={(event) => setForm({ ...form, complemento: event.target.value })} autoComplete="off" />
            </FormRow>
            <FormRow label="Bairro">
              <input value={form.bairro} onChange={(event) => setForm({ ...form, bairro: event.target.value })} autoComplete="off" />
            </FormRow>
            <FormRow label="Cidade">
              <input value={form.cidade} onChange={(event) => setForm({ ...form, cidade: event.target.value })} autoComplete="off" />
            </FormRow>
            <FormRow label="UF">
              <input value={form.uf} onChange={(event) => setForm({ ...form, uf: event.target.value })} autoComplete="off" />
            </FormRow>
            <FormRow label="RG">
              <input value={form.rg} onChange={(event) => setForm({ ...form, rg: event.target.value })} autoComplete="off" />
            </FormRow>
            <FormRow label="CPF">
              <input value={form.cpf} onChange={(event) => setForm({ ...form, cpf: event.target.value })} autoComplete="off" />
            </FormRow>
            <FormRow label="Operador de caixa">
              <select multiple value={form.operadorCaixa} onChange={(event) => setForm({ ...form, operadorCaixa: Array.from(event.target.selectedOptions).map((opt) => opt.value) })}>
                <option value="">{"Nenhum >>"}</option>
                {caixas.map((caixa) => (
                  <option key={caixa.code} value={caixa.name}>{caixa.name}</option>
                ))}
              </select>
            </FormRow>
            <FormRow label="Vendedor no caixa">
              <select multiple value={form.vendedorCaixa} onChange={(event) => setForm({ ...form, vendedorCaixa: Array.from(event.target.selectedOptions).map((opt) => opt.value) })}>
                <option value="">{"Nenhum >>"}</option>
                {caixas.map((caixa) => (
                  <option key={caixa.code} value={caixa.name}>{caixa.name}</option>
                ))}
              </select>
            </FormRow>
            <FormRow label="Recebe notificação por e-mail">
              <RadioSimNao name="notificaEmail" value={form.notificaEmail} onChange={(next) => setForm({ ...form, notificaEmail: next })} />
            </FormRow>
            <FormRow label="Inativar por tempo sem logar">
              <RadioSimNao name="inativarSemLogar" value={form.inativarSemLogar} onChange={(next) => setForm({ ...form, inativarSemLogar: next })} />
            </FormRow>
            {status ? <p className="pdv-prod-status" role="status">{status}</p> : null}
            <div className="pdv-cad-form-go">
              <button className="pdv-cad-btn pdv-cad-btn-green" type="submit" disabled={saving}>
                <Plus size={16} strokeWidth={2.6} aria-hidden="true" />
                {editId ? "Atualizar" : "Cadastrar"}
              </button>
            </div>
          </form>
        </div>
      </section>
    </CadastroShell>
  )
}

import { FormEvent, useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { Pencil, Plus, Settings, X } from "lucide-react"
import CadastroShell from "../CadastroShell"
import { FormRow } from "../catalog/FormBits"
import { getCatalog, createCatalog, listCatalog, updateCatalog } from "../catalog/catalogApi"
import { createLojaCaixa, deleteLojaCaixas, listLojaCaixas, updateLojaCaixa, type LojaCaixa } from "./caixaApi"
import { parseError } from "../../../../services/api"
import { AtivoToggle } from "../produtos/QuickCadWindows"

const TRANSF = ["Manual", "Automática", "Abertura de Caixa"]
const PRINTERS = ["Nenhuma", "Bematech", "Daruma"]

export default function CaixaPage() {
  const [rows, setRows] = useState<LojaCaixa[]>([])
  const [picked, setPicked] = useState<number[]>([])
  const [nome, setNome] = useState("")
  const [creating, setCreating] = useState(false)
  const [askDelete, setAskDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState("")
  const [gear, setGear] = useState<LojaCaixa | null>(null)
  const [payOptions, setPayOptions] = useState<string[]>([])
  const [userOptions, setUserOptions] = useState<string[]>([])
  const [gearPay, setGearPay] = useState<string[]>([])
  const [gearUsers, setGearUsers] = useState<string[]>([])
  const [gearModo, setGearModo] = useState<"finaliza" | "espera">("finaliza")
  const [gearPermitirTrocar, setGearPermitirTrocar] = useState(true)
  const [gearSenha, setGearSenha] = useState("")
  const [gearSaving, setGearSaving] = useState(false)

  function load() {
    listLojaCaixas()
      .then(setRows)
      .catch((err) => setError(parseError(err).friend || "Não foi possível carregar."))
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    if (!askDelete && !gear) return
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !deleting && !gearSaving) {
        setAskDelete(false)
        setGear(null)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [askDelete, deleting, gear, gearSaving])

  function namesOf(value: unknown) {
    return Array.isArray(value) ? value.map((item) => String(item)).filter(Boolean) : []
  }

  async function openGear(item: LojaCaixa) {
    setGear(item)
    setGearPay(namesOf(item.payload.formasPagamento))
    setGearUsers(namesOf(item.payload.vendedores))
    setGearModo(item.payload.modo === "espera" ? "espera" : "finaliza")
    setGearPermitirTrocar(item.payload.permitirTrocarCaixa !== false)
    setGearSenha(String(item.payload.senhaAcesso || ""))
    try {
      const [pays, users] = await Promise.all([
        listCatalog("payment", true),
        listCatalog("user", true),
      ])
      setPayOptions(pays.map((row) => row.name))
      setUserOptions(users.map((row) => row.name))
    } catch (err) {
      setError(parseError(err).friend || "Não foi possível carregar formas e vendedores.")
    }
  }

  function toggleName(list: string[], name: string, setList: (next: string[]) => void) {
    setList(list.includes(name) ? list.filter((item) => item !== name) : [...list, name])
  }

  async function saveGear() {
    if (!gear || gearSaving) return
    setGearSaving(true)
    setError("")
    try {
      await patch(gear, {
        formasPagamento: gearPay,
        vendedores: gearUsers,
        modo: gearModo,
        permitirTrocarCaixa: gearPermitirTrocar,
        senhaAcesso: gearSenha.trim(),
      })
      setGear(null)
    } catch (err) {
      setError(parseError(err).friend || "Não foi possível salvar os parâmetros.")
    } finally {
      setGearSaving(false)
    }
  }

  function toggle(code: number) {
    setPicked((current) => (current.includes(code) ? current.filter((item) => item !== code) : [...current, code]))
  }

  async function inactivateSelected() {
    const chosen = rows.filter((item) => picked.includes(item.code))
    if (!chosen.length) return
    try {
      await Promise.all(chosen.map((item) => updateLojaCaixa(item.code, { name: item.name, payload: item.payload, active: false })))
      setPicked([])
      load()
    } catch (err) {
      setError(parseError(err).friend || "Não foi possível inativar.")
    }
  }

  async function confirmDelete() {
    if (!picked.length || deleting) return
    setDeleting(true)
    setError("")
    try {
      await deleteLojaCaixas(picked)
      setPicked([])
      setAskDelete(false)
      load()
    } catch (err) {
      setError(parseError(err).friend || "Não foi possível excluir.")
      setAskDelete(false)
    } finally {
      setDeleting(false)
    }
  }

  async function patch(item: LojaCaixa, payload: Record<string, unknown>, active = item.active) {
    await updateLojaCaixa(item.code, { name: item.name, payload: { ...item.payload, ...payload }, active })
    load()
  }

  async function onCreate(event: FormEvent) {
    event.preventDefault()
    const name = nome.trim()
    if (!name || creating) return
    setCreating(true)
    setError("")
    try {
      await createLojaCaixa(name)
      setNome("")
      load()
    } catch (err) {
      setError(parseError(err).friend || "Não foi possível criar o caixa.")
    } finally {
      setCreating(false)
    }
  }

  return (
    <CadastroShell>
      <section className="pdv-cad-page" aria-labelledby="pdv-caixa-cad">
        <div className="pdv-cad-sheet pdv-cad-sheet-wide">
          <h1 id="pdv-caixa-cad">CAIXAS DA LOJA</h1>
          {error ? <p className="pdv-prod-status" role="alert">{error}</p> : null}
          <form className="pdv-cad-caixa-new" onSubmit={onCreate}>
            <input
              value={nome}
              onChange={(event) => setNome(event.target.value)}
              placeholder="Nome do caixa"
              aria-label="Nome do caixa"
              autoComplete="off"
            />
            <button className="pdv-cad-btn pdv-cad-btn-green" type="submit" disabled={creating || !nome.trim()}>
              <Plus size={16} strokeWidth={2.6} aria-hidden="true" />
              {creating ? "Criando..." : "Novo caixa"}
            </button>
            <button className="pdv-cad-btn" type="button" disabled={!picked.length} onClick={inactivateSelected}>
              Inativar selecionados
            </button>
            <button className="pdv-cad-btn" type="button" disabled={!picked.length} onClick={() => setAskDelete(true)}>
              Excluir selecionados
            </button>
          </form>
          <div className="pdv-cad-table-wrap">
            <table className="pdv-cad-table">
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      aria-label="Selecionar todos"
                      checked={rows.length > 0 && picked.length === rows.length}
                      onChange={(event) => setPicked(event.target.checked ? rows.map((item) => item.code) : [])}
                    />
                  </th>
                  <th>Parâmetros</th>
                  <th>Liberar PDV</th>
                  <th>Cod</th>
                  <th>Nome</th>
                  <th>Baixa deCheque</th>
                  <th>GerarDespesa</th>
                  <th>Transferênciade Saldo</th>
                  <th>Conferênciana Venda</th>
                  <th>Mostrarna Venda</th>
                  <th>Impressora</th>
                  <th>Ativo</th>
                  <th>Atualizar</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={13}>Nenhum caixa nesta loja. Crie o primeiro acima.</td>
                  </tr>
                ) : null}
                {rows.map((item) => (
                  <tr key={item.code}>
                    <td>
                      <input
                        type="checkbox"
                        aria-label={`Selecionar ${item.name}`}
                        checked={picked.includes(item.code)}
                        onChange={() => toggle(item.code)}
                      />
                    </td>
                    <td>
                      <button className="pdv-cad-icon-btn" type="button" aria-label={`Parâmetros de ${item.name}`} onClick={() => openGear(item)}>
                        <Settings size={16} aria-hidden="true" />
                      </button>
                    </td>
                    <td><AtivoToggle value={Boolean(item.payload.liberarPdv ?? true)} onChange={(next) => patch(item, { liberarPdv: next })} /></td>
                    <td>{item.code}</td>
                    <td>{item.name}</td>
                    <td><AtivoToggle value={Boolean(item.payload.baixaCheque)} onChange={(next) => patch(item, { baixaCheque: next })} /></td>
                    <td><AtivoToggle value={Boolean(item.payload.gerarDespesa)} onChange={(next) => patch(item, { gerarDespesa: next })} /></td>
                    <td>
                      <select
                        value={String(item.payload.transferenciaSaldo || "Manual")}
                        onChange={(event) => patch(item, { transferenciaSaldo: event.target.value })}
                      >
                        {TRANSF.map((opt) => <option key={opt}>{opt}</option>)}
                      </select>
                    </td>
                    <td><AtivoToggle value={Boolean(item.payload.conferenciaVenda)} onChange={(next) => patch(item, { conferenciaVenda: next })} /></td>
                    <td><AtivoToggle value={Boolean(item.payload.mostrarVenda ?? true)} onChange={(next) => patch(item, { mostrarVenda: next })} /></td>
                    <td>
                      <select
                        value={String(item.payload.impressora || "Nenhuma")}
                        onChange={(event) => patch(item, { impressora: event.target.value })}
                      >
                        {PRINTERS.map((opt) => <option key={opt}>{opt}</option>)}
                      </select>
                    </td>
                    <td><AtivoToggle value={item.active} onChange={(next) => patch(item, {}, next)} /></td>
                    <td>
                      <button className="pdv-cad-icon-btn" type="button" aria-label={`Atualizar ${item.name}`} onClick={() => patch(item, {})}>
                        <Pencil size={16} aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
      {gear ? (
        <div className="pdv-caixa-confirm" onClick={() => { if (!gearSaving) setGear(null) }}>
          <div
            className="pdv-caixa-confirm-card pdv-gear-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pdv-caixa-gear-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button className="pdv-cad-icon-btn pdv-gear-close" type="button" aria-label="Fechar" onClick={() => setGear(null)}>
              <X size={16} />
            </button>
            <h2 id="pdv-caixa-gear-title">Parâmetros · {gear.name}</h2>
            <div className="pdv-gear-grid">
              <div>
                <strong>Formas de pagamento</strong>
                <p>Marque uma ou várias. Sem marca, o PDV libera todas.</p>
                <div className="pdv-gear-list">
                  {[...new Set([...payOptions, ...gearPay])].length === 0 ? <span>Nenhuma forma cadastrada.</span> : null}
                  {[...new Set([...payOptions, ...gearPay])].map((name) => (
                    <label key={name}>
                      <input
                        type="checkbox"
                        checked={gearPay.includes(name)}
                        onChange={() => toggleName(gearPay, name, setGearPay)}
                      />
                      {name}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <strong>Vendedores neste caixa</strong>
                <p>Marque um ou vários. Sem marca, o PDV não exige vendedor.</p>
                <div className="pdv-gear-list">
                  {[...new Set([...userOptions, ...gearUsers])].length === 0 ? <span>Nenhum usuário cadastrado.</span> : null}
                  {[...new Set([...userOptions, ...gearUsers])].map((name) => (
                    <label key={name}>
                      <input
                        type="checkbox"
                        checked={gearUsers.includes(name)}
                        onChange={() => toggleName(gearUsers, name, setGearUsers)}
                      />
                      {name}
                    </label>
                  ))}
                </div>
              </div>
              <fieldset>
                <legend>Baixa da venda</legend>
                <label>
                  <input type="radio" name="modo-caixa" checked={gearModo === "finaliza"} onChange={() => setGearModo("finaliza")} />
                  Este caixa finaliza a venda
                </label>
                <label>
                  <input type="radio" name="modo-caixa" checked={gearModo === "espera"} onChange={() => setGearModo("espera")} />
                  Este caixa só envia para vendas em aberto
                </label>
              </fieldset>
              <fieldset>
                <legend>Acesso</legend>
                <label>
                  <input type="checkbox" checked={gearPermitirTrocar} onChange={(event) => setGearPermitirTrocar(event.target.checked)} />
                  Permitir trocar de caixa no PDV
                </label>
                <label>
                  Senha para abrir o caixa (opcional)
                  <input value={gearSenha} onChange={(event) => setGearSenha(event.target.value)} autoComplete="new-password" placeholder="Deixe vazio para não exigir" />
                </label>
              </fieldset>
            </div>
            <div className="pdv-caixa-confirm-actions">
              <button className="pdv-cad-btn" type="button" disabled={gearSaving} onClick={() => setGear(null)}>Cancelar</button>
              <button className="pdv-cad-btn pdv-cad-btn-green" type="button" disabled={gearSaving} onClick={saveGear}>
                {gearSaving ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {askDelete ? (
        <div className="pdv-caixa-confirm" onClick={() => { if (!deleting) setAskDelete(false) }}>
          <div
            className="pdv-caixa-confirm-card"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="pdv-caixa-confirm-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="pdv-caixa-confirm-title">
              {picked.length === 1 ? "Excluir este caixa?" : `Excluir ${picked.length} caixas?`}
            </h2>
            <p>Essa exclusão vale só para esta loja.</p>
            <ul>
              {rows.filter((item) => picked.includes(item.code)).map((item) => (
                <li key={item.code}>
                  <span>{item.name}</span>
                  <b>{item.code}</b>
                </li>
              ))}
            </ul>
            <div className="pdv-caixa-confirm-actions">
              <button className="pdv-cad-btn" type="button" disabled={deleting} onClick={() => setAskDelete(false)}>
                Cancelar
              </button>
              <button className="pdv-cad-btn pdv-cad-btn-red" type="button" disabled={deleting} onClick={confirmDelete}>
                {deleting ? "Excluindo..." : "Excluir"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </CadastroShell>
  )
}

export function PlanoContaForm() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const editId = Number(params.get("id") || 0)
  const [nome, setNome] = useState("")
  const [ordem, setOrdem] = useState("")
  const [descricao, setDescricao] = useState("")
  const [status, setStatus] = useState("")

  useEffect(() => {
    if (!editId) return
    getCatalog("account_plan", editId).then((item) => {
      setNome(item.name)
      setOrdem(String(item.payload.ordem ?? ""))
      setDescricao(String(item.payload.descricao ?? ""))
    }).catch(() => setStatus("Não foi possível carregar."))
  }, [editId])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!nome.trim()) {
      setStatus("Informe o centro de custo.")
      return
    }
    try {
      const payload = { ordem, descricao }
      if (editId) await updateCatalog("account_plan", editId, { name: nome, payload })
      else await createCatalog("account_plan", { name: nome, payload })
      navigate("/client/financeiro/plano-conta")
    } catch (err) {
      const parsed = parseError(err)
      setStatus(parsed.friend || parsed.message || "Não foi possível salvar.")
    }
  }

  return (
    <CadastroShell>
      <section className="pdv-cad-page" aria-labelledby="pdv-plano-form">
        <div className="pdv-cad-sheet">
          <h1 id="pdv-plano-form">CADASTRAR CENTRO DE CUSTO</h1>
          <button className="pdv-cad-btn pdv-cad-btn-back pdv-voltar" type="button" onClick={() => navigate("/client/financeiro/plano-conta")}>
            Voltar
          </button>
          <form className="pdv-cad-form" onSubmit={onSubmit}>
            <div className="pdv-cad-form-bar">Cadastrar Centro de Custo</div>
            <FormRow label="Centro de Custo">
              <input value={nome} onChange={(event) => setNome(event.target.value)} autoComplete="off" />
            </FormRow>
            <FormRow label="Ordem">
              <input value={ordem} onChange={(event) => setOrdem(event.target.value)} autoComplete="off" />
            </FormRow>
            <FormRow label="Descrição Interna">
              <textarea rows={4} value={descricao} onChange={(event) => setDescricao(event.target.value)} />
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

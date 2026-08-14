import { FormEvent, useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { Pencil, Plus } from "lucide-react"
import CadastroShell from "../CadastroShell"
import { FormRow } from "../catalog/FormBits"
import { createCatalog, getCatalog, listCatalog, updateCatalog, type CatalogItem } from "../catalog/catalogApi"
import { parseError } from "../../../../services/api"
import { AtivoToggle } from "../produtos/QuickCadWindows"

const TRANSF = ["Manual", "Automática", "Abertura de Caixa"]
const PRINTERS = ["Nenhuma", "Bematech", "Daruma"]

export default function CaixaPage() {
  const [rows, setRows] = useState<CatalogItem[]>([])
  const [error, setError] = useState("")

  function load() {
    listCatalog("cash_register")
      .then(setRows)
      .catch((err) => setError(parseError(err).friend || "Não foi possível carregar."))
  }

  useEffect(() => { load() }, [])

  async function patch(item: CatalogItem, payload: Record<string, unknown>, active = item.active) {
    await updateCatalog("cash_register", item.code, { name: item.name, payload: { ...item.payload, ...payload }, active })
    load()
  }

  return (
    <CadastroShell>
      <section className="pdv-cad-page" aria-labelledby="pdv-caixa-cad">
        <div className="pdv-cad-sheet pdv-cad-sheet-wide">
          <h1 id="pdv-caixa-cad">CAIXAS DA LOJA</h1>
          {error ? <p className="pdv-prod-status" role="alert">{error}</p> : null}
          <div className="pdv-cad-table-wrap">
            <table className="pdv-cad-table">
              <thead>
                <tr>
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
                {rows.map((item) => (
                  <tr key={item.code}>
                    <td>—</td>
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

import { FormEvent, useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { Plus } from "lucide-react"
import CadastroShell from "../CadastroShell"
import { FormRow, RadioSimNao } from "../catalog/FormBits"
import { createCatalog, getCatalog, updateCatalog } from "../catalog/catalogApi"
import { parseError } from "../../../../services/api"

const NFCE = [
  "Selecione >>",
  "Dinheiro",
  "Cheque",
  "Cartão de Crédito",
  "Cartão de Débito",
  "Crédito Loja",
  "Vale Alimentação",
  "Vale Refeição",
  "Vale Presente",
  "Vale Combustível",
  "Boleto Bancário",
  "Sem Pagamento",
  "Outros",
]

const PIX = ["Celular", "CPF", "CNPJ", "E-mail", "Chave aleatória"]

type PayForm = {
  nome: string
  cartao: boolean
  debitoCredito: string
  crediario: boolean
  tipoChavePix: string
  chavePix: string
  boleto: boolean
  infoCheque: boolean
  verificaLimite: boolean
  ordem: string
  ativoGeral: boolean
  tipoTroca: boolean
  financeiroNegativo: string
  saldoFechamento: string
  mensagem: string
  compraPago: boolean
  compraPrazo: string
  compraDebita: boolean
  compraCredita: boolean
  compraPadrao: boolean
  compraAtivo: boolean
  vendaPago: boolean
  vendaPrazo: string
  vendaDesconto: boolean
  vendaDescontoPct: string
  vendaDebita: boolean
  vendaCredita: boolean
  tefImpressao: boolean
  tefFinalizar: boolean
  vendaAtivo: boolean
  centavosParcelas: boolean
  formaPagamento: string
  nfce: string
  cobrarVencida: boolean
  diasCobranca: string
  taxaDinheiro: string
  taxaPct: string
  jurosPct: string
  jurosTipo: string
  taxaAdm: string
}

const EMPTY: PayForm = {
  nome: "",
  cartao: false,
  debitoCredito: "Crédito",
  crediario: false,
  tipoChavePix: "Celular",
  chavePix: "",
  boleto: false,
  infoCheque: false,
  verificaLimite: false,
  ordem: "",
  ativoGeral: true,
  tipoTroca: false,
  financeiroNegativo: "Permitir",
  saldoFechamento: "Permitir",
  mensagem: "",
  compraPago: true,
  compraPrazo: "",
  compraDebita: false,
  compraCredita: false,
  compraPadrao: false,
  compraAtivo: true,
  vendaPago: true,
  vendaPrazo: "",
  vendaDesconto: false,
  vendaDescontoPct: "",
  vendaDebita: false,
  vendaCredita: false,
  tefImpressao: false,
  tefFinalizar: false,
  vendaAtivo: true,
  centavosParcelas: false,
  formaPagamento: "Pagamento à vista",
  nfce: "Selecione >>",
  cobrarVencida: false,
  diasCobranca: "",
  taxaDinheiro: "",
  taxaPct: "",
  jurosPct: "",
  jurosTipo: "Juros Simples",
  taxaAdm: "",
}

export default function FormaPagamentoForm() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const editId = Number(params.get("id") || 0)
  const [form, setForm] = useState<PayForm>(EMPTY)
  const [status, setStatus] = useState("")

  useEffect(() => {
    if (!editId) return
    getCatalog("payment", editId).then((item) => {
      setForm({ ...EMPTY, ...item.payload, nome: item.name } as PayForm)
    }).catch(() => setStatus("Não foi possível carregar."))
  }, [editId])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!form.nome.trim()) {
      setStatus("Informe o nome.")
      return
    }
    try {
      const { nome, ...payload } = form
      if (editId) await updateCatalog("payment", editId, { name: nome, payload, active: form.ativoGeral })
      else await createCatalog("payment", { name: nome, payload, active: form.ativoGeral })
      navigate("/client/financeiro/formas-pagamento")
    } catch (err) {
      const parsed = parseError(err)
      setStatus(parsed.friend || parsed.message || "Não foi possível salvar.")
    }
  }

  function patch<K extends keyof PayForm>(key: K, value: PayForm[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  return (
    <CadastroShell>
      <section className="pdv-cad-page" aria-labelledby="pdv-pay-form">
        <div className="pdv-cad-sheet">
          <h1 id="pdv-pay-form">CADASTRAR FORMA DE PAGAMENTO</h1>
          <button className="pdv-cad-btn pdv-cad-btn-back pdv-voltar" type="button" onClick={() => navigate("/client/financeiro/formas-pagamento")}>
            Voltar
          </button>
          <form className="pdv-cad-form" onSubmit={onSubmit}>
            <div className="pdv-cad-form-bar">Geral</div>
            <FormRow label="Nome">
              <input value={form.nome} onChange={(event) => patch("nome", event.target.value)} autoComplete="off" />
            </FormRow>
            <FormRow label="Tipo: Cartão">
              <RadioSimNao name="cartao" value={form.cartao} onChange={(next) => patch("cartao", next)} />
            </FormRow>
            {form.cartao ? (
              <FormRow label="Débito / Crédito">
                <fieldset className="pdv-cad-radios">
                  <label><input type="radio" checked={form.debitoCredito === "Débito"} onChange={() => patch("debitoCredito", "Débito")} /> Débito</label>
                  <label><input type="radio" checked={form.debitoCredito === "Crédito"} onChange={() => patch("debitoCredito", "Crédito")} /> Crédito</label>
                </fieldset>
              </FormRow>
            ) : null}
            <FormRow label="Crediário">
              <RadioSimNao name="crediario" value={form.crediario} onChange={(next) => patch("crediario", next)} />
            </FormRow>
            <FormRow label="Chave Pix">
              <div className="pdv-cad-inline">
                <select value={form.tipoChavePix} onChange={(event) => patch("tipoChavePix", event.target.value)}>
                  {PIX.map((item) => <option key={item}>{item}</option>)}
                </select>
                <input value={form.chavePix} onChange={(event) => patch("chavePix", event.target.value)} autoComplete="off" />
              </div>
            </FormRow>
            <FormRow label="Boleto">
              <RadioSimNao name="boleto" value={form.boleto} onChange={(next) => patch("boleto", next)} />
            </FormRow>
            <FormRow label="Informação Bancária do cheque">
              <RadioSimNao name="infoCheque" value={form.infoCheque} onChange={(next) => patch("infoCheque", next)} />
            </FormRow>
            <FormRow label="Verifica Limite Cliente">
              <RadioSimNao name="verificaLimite" value={form.verificaLimite} onChange={(next) => patch("verificaLimite", next)} />
            </FormRow>
            <FormRow label="Ordem">
              <input value={form.ordem} onChange={(event) => patch("ordem", event.target.value)} autoComplete="off" />
            </FormRow>
            <FormRow label="Ativo Geral">
              <RadioSimNao name="ativoGeral" value={form.ativoGeral} onChange={(next) => patch("ativoGeral", next)} />
            </FormRow>
            <FormRow label="Tipo troca">
              <RadioSimNao name="tipoTroca" value={form.tipoTroca} onChange={(next) => patch("tipoTroca", next)} />
            </FormRow>
            <FormRow label="Financeiro Negativo">
              <fieldset className="pdv-cad-radios">
                <label><input type="radio" checked={form.financeiroNegativo === "Permitir"} onChange={() => patch("financeiroNegativo", "Permitir")} /> Permitir</label>
                <label><input type="radio" checked={form.financeiroNegativo === "Não Permitir"} onChange={() => patch("financeiroNegativo", "Não Permitir")} /> Não Permitir</label>
              </fieldset>
            </FormRow>
            <FormRow label="Saldo no Fechamento">
              <fieldset className="pdv-cad-radios">
                <label><input type="radio" checked={form.saldoFechamento === "Permitir"} onChange={() => patch("saldoFechamento", "Permitir")} /> Permitir</label>
                <label><input type="radio" checked={form.saldoFechamento === "Não Permitir"} onChange={() => patch("saldoFechamento", "Não Permitir")} /> Não Permitir</label>
              </fieldset>
            </FormRow>
            <FormRow label="Mensagem de instrução">
              <textarea rows={3} value={form.mensagem} onChange={(event) => patch("mensagem", event.target.value)} />
            </FormRow>

            <div className="pdv-cad-form-bar">Parâmetros de Compras</div>
            <FormRow label="Pago"><RadioSimNao name="compraPago" value={form.compraPago} onChange={(next) => patch("compraPago", next)} /></FormRow>
            <FormRow label="Prazo"><input value={form.compraPrazo} onChange={(event) => patch("compraPrazo", event.target.value)} autoComplete="off" /></FormRow>
            <FormRow label="Debita no Caixa"><RadioSimNao name="compraDebita" value={form.compraDebita} onChange={(next) => patch("compraDebita", next)} /></FormRow>
            <FormRow label="Credita no Caixa"><RadioSimNao name="compraCredita" value={form.compraCredita} onChange={(next) => patch("compraCredita", next)} /></FormRow>
            <FormRow label="Padrão"><RadioSimNao name="compraPadrao" value={form.compraPadrao} onChange={(next) => patch("compraPadrao", next)} /></FormRow>
            <FormRow label="Ativo"><RadioSimNao name="compraAtivo" value={form.compraAtivo} onChange={(next) => patch("compraAtivo", next)} /></FormRow>

            <div className="pdv-cad-form-bar">Parâmetros de Vendas</div>
            <FormRow label="Pago"><RadioSimNao name="vendaPago" value={form.vendaPago} onChange={(next) => patch("vendaPago", next)} /></FormRow>
            <FormRow label="Prazo"><input value={form.vendaPrazo} onChange={(event) => patch("vendaPrazo", event.target.value)} autoComplete="off" /></FormRow>
            <FormRow label="Desconto">
              <div className="pdv-cad-inline">
                <RadioSimNao name="vendaDesconto" value={form.vendaDesconto} onChange={(next) => patch("vendaDesconto", next)} />
                <input value={form.vendaDescontoPct} onChange={(event) => patch("vendaDescontoPct", event.target.value)} aria-label="%" />
                <span>%</span>
              </div>
            </FormRow>
            <FormRow label="Debita no Caixa"><RadioSimNao name="vendaDebita" value={form.vendaDebita} onChange={(next) => patch("vendaDebita", next)} /></FormRow>
            <FormRow label="Credita no Caixa"><RadioSimNao name="vendaCredita" value={form.vendaCredita} onChange={(next) => patch("vendaCredita", next)} /></FormRow>
            <FormRow label="TEF">
              <div className="pdv-cad-check-grid">
                <label><input type="checkbox" checked={form.tefImpressao} onChange={(event) => patch("tefImpressao", event.target.checked)} /> Impressão automática</label>
                <label><input type="checkbox" checked={form.tefFinalizar} onChange={(event) => patch("tefFinalizar", event.target.checked)} /> Finalizar venda automaticamente</label>
              </div>
            </FormRow>
            <FormRow label="Ativo"><RadioSimNao name="vendaAtivo" value={form.vendaAtivo} onChange={(next) => patch("vendaAtivo", next)} /></FormRow>
            <FormRow label="Utiliza centavos nas parcelas"><RadioSimNao name="centavos" value={form.centavosParcelas} onChange={(next) => patch("centavosParcelas", next)} /></FormRow>
            <FormRow label="Forma de Pagamento">
              <fieldset className="pdv-cad-radios pdv-cad-radios-stack">
                {["Pagamento à vista", "Pagamento a prazo", "Outros"].map((item) => (
                  <label key={item}><input type="radio" checked={form.formaPagamento === item} onChange={() => patch("formaPagamento", item)} /> {item}</label>
                ))}
              </fieldset>
            </FormRow>
            <FormRow label="NFCe/NFe">
              <select value={form.nfce} onChange={(event) => patch("nfce", event.target.value)}>
                {NFCE.map((item) => <option key={item}>{item}</option>)}
              </select>
            </FormRow>
            <FormRow label="Quando a Parcela esta vencida Cobrar?">
              <RadioSimNao name="cobrarVencida" value={form.cobrarVencida} onChange={(next) => patch("cobrarVencida", next)} />
            </FormRow>
            <FormRow label="Dias para cobrança de juros ou Taxas após o vencimento">
              <input value={form.diasCobranca} onChange={(event) => patch("diasCobranca", event.target.value)} autoComplete="off" />
            </FormRow>
            <FormRow label="Taxa em Dinheiro">
              <input value={form.taxaDinheiro} onChange={(event) => patch("taxaDinheiro", event.target.value)} autoComplete="off" />
            </FormRow>
            <FormRow label="Taxa em Porcentagem">
              <input value={form.taxaPct} onChange={(event) => patch("taxaPct", event.target.value)} autoComplete="off" />
            </FormRow>
            <FormRow label="Juros">
              <div className="pdv-cad-inline">
                <input value={form.jurosPct} onChange={(event) => patch("jurosPct", event.target.value)} autoComplete="off" />
                <span>% ao Mês</span>
                <label><input type="radio" checked={form.jurosTipo === "Juros Simples"} onChange={() => patch("jurosTipo", "Juros Simples")} /> Juros Simples</label>
                <label><input type="radio" checked={form.jurosTipo === "Juros Composto"} onChange={() => patch("jurosTipo", "Juros Composto")} /> Juros Composto</label>
              </div>
            </FormRow>
            <FormRow label="Taxa Administrativa">
              <input value={form.taxaAdm} onChange={(event) => patch("taxaAdm", event.target.value)} autoComplete="off" />
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

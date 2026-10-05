import { FormEvent, useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { Plus } from "lucide-react"
import CadastroShell from "../CadastroShell"
import { FormRow, RadioSimNao } from "../catalog/FormBits"
import { createCatalog, getCatalog, updateCatalog } from "../catalog/catalogApi"
import { parseError } from "../../../../services/api"

type PayForm = {
  nome: string
  cartao: boolean
  parcelas: string
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
  parcelas: "",
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
            <FormRow label="É cartão">
              <RadioSimNao name="cartao" value={form.cartao} onChange={(next) => patch("cartao", next)} />
            </FormRow>
            {form.cartao ? (
              <FormRow label="Parcelas">
                <input
                  value={form.parcelas}
                  onChange={(event) => patch("parcelas", event.target.value.replace(/\D/g, "").slice(0, 2))}
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="Quantidade máxima"
                />
              </FormRow>
            ) : null}
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

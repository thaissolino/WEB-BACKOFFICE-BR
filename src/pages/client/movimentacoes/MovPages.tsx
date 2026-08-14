import FilterPage from "../pdv/FilterPage"
import CadastroShell from "../cadastros/CadastroShell"
import { useNavigate } from "react-router-dom"
import { FormEvent, useState } from "react"
import { FormRow } from "../cadastros/catalog/FormBits"
import { createCatalog, listCatalog } from "../cadastros/catalog/catalogApi"
import { parseError } from "../../../services/api"
import { Plus } from "lucide-react"
import { useEffect } from "react"

const VENDA_COLS = [
  "Visualizar",
  "Cod. Vendas",
  "Loja",
  "Caixa",
  "Identificação",
  "Cliente",
  "Usuário",
  "Data Abertura",
  "Data Conclusão",
  "Total",
  "Frete",
  "Status",
  "Gerenciar",
]

const VENDA_FIELDS = [
  { key: "cod", label: "Cod. Vendas" },
  { key: "doc", label: "CNPJ / CPF" },
  { key: "nome", label: "Nome do Cliente" },
  { key: "abertura", label: "Data início da abertura", kind: "date" as const },
]

const VENDA_ACTIONS = [
  { label: "Nova", tone: "green" as const, href: "/client/pdv" },
  { label: "Abertas", tone: "blue" as const, href: "/client/movimentacoes/vendas/abertas" },
  { label: "Concluídas", href: "/client/movimentacoes/vendas/concluidas" },
]

export function VendasAbertas() {
  return <FilterPage title="VENDAS ABERTAS" actions={VENDA_ACTIONS} fields={VENDA_FIELDS} columns={VENDA_COLS} />
}
export function VendasConcluidas() {
  return <FilterPage title="VENDAS CONCLUÍDAS" actions={VENDA_ACTIONS} fields={VENDA_FIELDS} columns={VENDA_COLS} />
}
export function PreVendas() {
  return <FilterPage title="PRÉ VENDAS" actions={VENDA_ACTIONS} fields={VENDA_FIELDS} columns={VENDA_COLS} />
}

export function PainelEntregas() {
  return (
    <CadastroShell>
      <section className="pdv-cad-page" aria-labelledby="pdv-entregas">
        <div className="pdv-cad-sheet">
          <h1 id="pdv-entregas">PAINEL DE ENTREGAS</h1>
          <div className="pdv-loc-kanban">
            <p className="pdv-cad-kicker">Nenhuma entrega em andamento.</p>
          </div>
        </div>
      </section>
    </CadastroShell>
  )
}

export function RelatorioCaixa() {
  return (
    <FilterPage
      title="RELATÓRIO DE CAIXA"
      fields={[
        { key: "inicio", label: "Data Caixa inicio", kind: "date" },
        { key: "fim", label: "Data Caixa fim", kind: "date" },
        { key: "caixa", label: "Caixa", kind: "select", options: ["Todos"] },
      ]}
      columns={["Caixa", "Data", "Saldo Inicial", "Entradas", "Saídas", "Saldo"]}
    />
  )
}
export function RelatorioContaCorrente() {
  return (
    <FilterPage
      title="RELATÓRIO DE CONTA CORRENTE"
      fields={[
        { key: "inicio", label: "Data inicio", kind: "date" },
        { key: "fim", label: "Data fim", kind: "date" },
      ]}
      columns={["Data", "Histórico", "Débito", "Crédito", "Saldo"]}
    />
  )
}
export function RelatorioCaixaDetalhado() {
  return (
    <FilterPage
      title="RELATÓRIO DE CAIXA DETALHADO"
      fields={[
        { key: "inicio", label: "Data Caixa inicio", kind: "date" },
        { key: "fim", label: "Data Caixa fim", kind: "date" },
      ]}
      columns={["Data", "Caixa", "Forma de Pagamento", "Valor"]}
    />
  )
}
export function ConciliacaoBancaria() {
  return (
    <FilterPage
      title="CONCILIAÇÃO BANCÁRIA"
      fields={[
        { key: "inicio", label: "Data inicio", kind: "date" },
        { key: "fim", label: "Data fim", kind: "date" },
        { key: "conta", label: "Conta", kind: "select", options: ["Todas"] },
      ]}
      columns={["Data", "Documento", "Histórico", "Valor", "Conciliado"]}
    />
  )
}

export function ContasReceber() {
  return (
    <FilterPage
      title="CONTAS A RECEBER"
      fields={[
        { key: "cliente", label: "Cliente" },
        { key: "venc", label: "Vencimento", kind: "date" },
        { key: "pago", label: "Pago", kind: "select", options: ["Todos", "Sim", "Não"] },
        { key: "forma", label: "Forma de Pagamento", kind: "select", options: ["Todos", "Cartão", "Cheque", "Crediário"] },
      ]}
      columns={["Cliente", "Documento", "Vencimento", "Valor", "Pago"]}
    />
  )
}
export function ContasPagar() {
  return (
    <FilterPage
      title="CONTAS A PAGAR"
      fields={[
        { key: "fornecedor", label: "Fornecedor" },
        { key: "venc", label: "Vencimento", kind: "date" },
        { key: "pago", label: "Pago", kind: "select", options: ["Todos", "Sim", "Não"] },
      ]}
      columns={["Fornecedor", "Documento", "Vencimento", "Valor", "Pago"]}
    />
  )
}
export function FluxoCaixa() {
  return (
    <FilterPage
      title="FLUXO DE CAIXA"
      fields={[
        { key: "inicio", label: "Data inicio", kind: "date" },
        { key: "fim", label: "Data fim", kind: "date" },
      ]}
      columns={["Data", "Entradas", "Saídas", "Saldo"]}
    />
  )
}
export function PrevisaoFluxo() {
  return (
    <FilterPage
      title="PREVISÃO DE FLUXO DE CAIXA"
      fields={[
        { key: "inicio", label: "Data inicio", kind: "date" },
        { key: "fim", label: "Data fim", kind: "date" },
      ]}
      columns={["Data", "Receber", "Pagar", "Saldo previsto"]}
    />
  )
}

export function CadastrarDespesa({ receita = false }: { receita?: boolean }) {
  const navigate = useNavigate()
  const [fornecedores, setFornecedores] = useState<string[]>(["Todos"])
  const [planos, setPlanos] = useState<string[]>([])
  const [caixas, setCaixas] = useState<string[]>([])
  const [formas, setFormas] = useState<string[]>([])
  const [status, setStatus] = useState("")
  const [form, setForm] = useState({
    fornecedor: "Todos",
    plano: "",
    dataNota: "",
    numero: "",
    competencia: "",
    total: "",
    obs: "",
    caixa: "",
    forma: "",
  })

  useEffect(() => {
    listCatalog("account_plan", true).then((rows) => setPlanos(rows.map((item) => item.name))).catch(() => setPlanos([]))
    listCatalog("cash_register", true).then((rows) => setCaixas(rows.map((item) => item.name))).catch(() => setCaixas([]))
    listCatalog("payment", true).then((rows) => setFormas(rows.map((item) => item.name))).catch(() => setFormas([]))
  }, [])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    try {
      await createCatalog("expense", {
        name: receita ? "Receita" : "Despesa",
        payload: { ...form, tipo: receita ? "receita" : "despesa" },
      })
      navigate("/client/movimentacoes/financeiro/despesas")
    } catch (err) {
      setStatus(parseError(err).friend || "Não foi possível salvar.")
    }
  }

  return (
    <CadastroShell>
      <section className="pdv-cad-page" aria-labelledby="pdv-desp-form">
        <div className="pdv-cad-sheet">
          <h1 id="pdv-desp-form">{receita ? "CADASTRAR RECEITA" : "CADASTRAR DESPESA"}</h1>
          <form className="pdv-cad-form" onSubmit={onSubmit}>
            <FormRow label="Fornecedor">
              <select value={form.fornecedor} onChange={(event) => setForm({ ...form, fornecedor: event.target.value })}>
                {fornecedores.map((item) => <option key={item}>{item}</option>)}
              </select>
            </FormRow>
            <FormRow label="Plano de conta">
              <select value={form.plano} onChange={(event) => setForm({ ...form, plano: event.target.value })}>
                <option value="">Sem</option>
                {planos.map((item) => <option key={item}>{item}</option>)}
              </select>
            </FormRow>
            <FormRow label="Data Nota"><input value={form.dataNota} onChange={(event) => setForm({ ...form, dataNota: event.target.value })} autoComplete="off" /></FormRow>
            <FormRow label="Número da Nota / Série"><input value={form.numero} onChange={(event) => setForm({ ...form, numero: event.target.value })} autoComplete="off" /></FormRow>
            <FormRow label="Competência"><input value={form.competencia} onChange={(event) => setForm({ ...form, competencia: event.target.value })} placeholder="MM/AAAA" autoComplete="off" /></FormRow>
            <FormRow label="Total"><input value={form.total} onChange={(event) => setForm({ ...form, total: event.target.value })} autoComplete="off" /></FormRow>
            <FormRow label="Observação"><textarea rows={3} value={form.obs} onChange={(event) => setForm({ ...form, obs: event.target.value })} /></FormRow>
            <FormRow label="Caixa">
              <select value={form.caixa} onChange={(event) => setForm({ ...form, caixa: event.target.value })}>
                <option value="" />
                {caixas.map((item) => <option key={item}>{item}</option>)}
              </select>
            </FormRow>
            <FormRow label="Forma de Pagamento">
              <select value={form.forma} onChange={(event) => setForm({ ...form, forma: event.target.value })}>
                <option value="" />
                {formas.map((item) => <option key={item}>{item}</option>)}
              </select>
            </FormRow>
            {status ? <p className="pdv-prod-status" role="status">{status}</p> : null}
            <div className="pdv-cad-form-go">
              <button className="pdv-cad-btn pdv-cad-btn-green" type="submit">
                <Plus size={16} strokeWidth={2.6} aria-hidden="true" />
                Finalizar
              </button>
            </div>
          </form>
        </div>
      </section>
    </CadastroShell>
  )
}

export function ListarDespesas() {
  return (
    <FilterPage
      title="RECEITA / DESPESAS REGISTRADA"
      actions={[
        { label: "Cadastrar Despesa", tone: "green", href: "/client/movimentacoes/financeiro/despesas/cadastrar" },
        { label: "Cadastrar Receita", tone: "blue", href: "/client/movimentacoes/financeiro/receitas/cadastrar" },
      ]}
      fields={[
        { key: "cod", label: "Cod. Receita / Despesa" },
        { key: "fornecedor", label: "Fornecedor", kind: "select", options: ["<< Selecione >>"] },
      ]}
      columns={["Código", "Fornecedor", "Obs", "Estado", "Data Lançamento", "Total", "Estornar"]}
      submitLabel="Filtrar"
    />
  )
}

export function TransferenciaLojas() {
  return (
    <FilterPage
      title="ESCOLHA DA LOJA PARA TRANSFERÊNCIA"
      fields={[]}
      columns={["Transf.", "Loja Destino", "Razão", "Cidade", "Telefone"]}
      hint="Nenhuma loja destino além da loja atual."
    />
  )
}
export function TransferenciasList({ title }: { title: string }) {
  return (
    <FilterPage
      title={title}
      fields={[
        { key: "cod", label: "Código" },
        { key: "loja", label: "Loja" },
      ]}
      columns={["Código", "Loja Destino", "Data", "Estado", "Total"]}
    />
  )
}
export function ContagemEstoque() {
  return (
    <FilterPage
      title="CONTAGENS DO ESTOQUE DA LOJA"
      actions={[
        { label: "Nova Contagem de Estoque Total", tone: "green" },
        { label: "Nova Contagem de Estoque Parcial", tone: "blue" },
        { label: "ADICIONAR Estoque" },
        { label: "RETIRAR Estoque" },
        { label: "Relatório Contagem de Estoque", href: "/client/relatorios/estoque/contagem" },
      ]}
      fields={[]}
      columns={["Código", "Data", "Tipo", "Usuário", "Estado"]}
    />
  )
}
export function NfeList() {
  return (
    <FilterPage
      title="NF-E / NFC-E"
      fields={[
        { key: "numero", label: "Número" },
        { key: "inicio", label: "Data inicio", kind: "date" },
        { key: "fim", label: "Data fim", kind: "date" },
      ]}
      columns={["Número", "Série", "Cliente", "Data", "Valor", "Status"]}
      hint="Emissão SEFAZ não está conectada. A lista permanece vazia."
    />
  )
}
export function NfseList() {
  return (
    <FilterPage
      title="NFS-E(SERVIÇOS)"
      fields={[
        { key: "numero", label: "Número" },
        { key: "inicio", label: "Data inicio", kind: "date" },
      ]}
      columns={["Número", "Tomador", "Data", "Valor", "Status"]}
      hint="NFS-e de terceiro. Sem emissão simulada."
    />
  )
}
export function ManifestacaoDest() {
  return (
    <FilterPage
      title="MANIFESTAÇÃO DO DESTINATÁRIO"
      fields={[{ key: "chave", label: "Chave" }]}
      columns={["Chave", "Emitente", "Data", "Status"]}
      hint="Consulta SEFAZ não está conectada."
    />
  )
}
export function ArquivosContador() {
  return (
    <FilterPage
      title="ARQUIVOS FISCAIS CONTADOR"
      fields={[{ key: "mes", label: "Mês" }]}
      columns={["Arquivo", "Período", "Status"]}
    />
  )
}
export function GerenciadorArquivos() {
  return (
    <FilterPage
      title="GERENCIADOR ARQUIVOS FISCAIS"
      fields={[{ key: "tipo", label: "Tipo", kind: "select", options: ["Todos"] }]}
      columns={["Arquivo", "Tipo", "Data"]}
    />
  )
}
export function BoletosPage({ title }: { title: string }) {
  return (
    <FilterPage
      title={title}
      fields={[{ key: "busca", label: "Busca" }]}
      columns={["Documento", "Cliente", "Vencimento", "Valor", "Status"]}
      hint="Boleto Cloud / Yapay não está conectado."
    />
  )
}
export function RelatorioCaixaClientes() {
  return (
    <FilterPage
      title="RELATÓRIO CAIXA DE CLIENTES"
      fields={[
        { key: "cliente", label: "Cliente" },
        { key: "inicio", label: "Data inicio", kind: "date" },
      ]}
      columns={["Cliente", "Data", "Valor"]}
    />
  )
}

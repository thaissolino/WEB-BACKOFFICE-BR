import { FormEvent, ReactNode, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Plus } from "lucide-react"
import CadastroShell from "../CadastroShell"
import { FormRow, RadioSimNao } from "../catalog/FormBits"
import { createCatalog } from "../catalog/catalogApi"
import { parseError, api } from "../../../../services/api"
import CatalogList from "../catalog/CatalogList"

function Page({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <CadastroShell>
      <section className="pdv-cad-page" aria-labelledby="pdv-extra-title">
        <div className="pdv-cad-sheet pdv-cad-sheet-wide">
          <h1 id="pdv-extra-title">{title}</h1>
          {children}
        </div>
      </section>
    </CadastroShell>
  )
}

export function NcmList({ outdated = false }: { outdated?: boolean }) {
  const navigate = useNavigate()
  const [draft, setDraft] = useState({ tipo: "NCM", codigo: "", descricao: "" })
  const [applied, setApplied] = useState(draft)

  function onFilter(event: FormEvent) {
    event.preventDefault()
    setApplied(draft)
  }

  return (
    <Page title={outdated ? "NCM DESATUALIZADOS" : "NCM / NBS"}>
      <div className="pdv-cad-actions">
        {outdated ? (
          <button className="pdv-cad-btn pdv-cad-btn-blue" type="button" onClick={() => navigate("/client/produtos/ncm")}>NCM</button>
        ) : (
          <button className="pdv-cad-btn pdv-cad-btn-red" type="button" onClick={() => navigate("/client/produtos/ncm/desatualizados")}>
            NCM Desatualizados
          </button>
        )}
        <button className="pdv-cad-btn pdv-cad-btn-blue" type="button" onClick={() => navigate("/client/documentos-fiscais/parametros")}>
          Parâmetros DF
        </button>
        {outdated ? null : (
          <button className="pdv-cad-btn pdv-cad-btn-blue" type="button">NCM</button>
        )}
      </div>
      <form className="pdv-cad-filters pdv-cad-filters-cat" onSubmit={onFilter}>
        <label>
          Tipo
          <select value={draft.tipo} onChange={(event) => setDraft({ ...draft, tipo: event.target.value })}>
            <option>NCM</option>
            <option>NBS</option>
          </select>
        </label>
        <label>
          NCM / NBS
          <input value={draft.codigo} onChange={(event) => setDraft({ ...draft, codigo: event.target.value })} autoComplete="off" />
        </label>
        <label>
          Descrição
          <input value={draft.descricao} onChange={(event) => setDraft({ ...draft, descricao: event.target.value })} autoComplete="off" />
        </label>
        <div className="pdv-cad-filters-go">
          <button className="pdv-cad-btn" type="button" onClick={() => { setDraft({ tipo: "NCM", codigo: "", descricao: "" }); setApplied({ tipo: "NCM", codigo: "", descricao: "" }) }}>Limpar</button>
          <button className="pdv-cad-btn pdv-cad-btn-blue" type="submit">Filtrar</button>
        </div>
      </form>
      <p className="pdv-cad-kicker">
        {applied.codigo || applied.descricao ? `Filtro: ${applied.tipo} ${applied.codigo} ${applied.descricao}`.trim() : "Nenhum NCM listado para o filtro atual."}
      </p>
    </Page>
  )
}

export function PromocaoList({ mode = "listar" }: { mode?: "listar" | "cadastrar" | "aplicar" | "produtos" | "finalizadas" }) {
  const navigate = useNavigate()
  if (mode === "cadastrar") return <PromocaoForm />
  if (mode === "aplicar") return <PromocaoAplicar />
  if (mode === "produtos") return <PromocaoProdutos />

  return (
    <CatalogList
      inactive={mode === "finalizadas"}
      config={{
        kind: "promotion",
        title: mode === "finalizadas" ? "PROMOÇÕES FINALIZADAS" : "PROMOÇÕES",
        cadastrarLabel: "Cadastrar Promoção",
        cadastrarPath: "/client/produtos/promocoes/cadastrar",
        listPath: "/client/produtos/promocoes",
        inativosPath: "/client/produtos/promocoes/finalizadas",
        extraActions: (
          <>
            <button className="pdv-cad-btn pdv-cad-btn-blue" type="button" onClick={() => navigate("/client/produtos/promocoes/aplicar")}>Aplicar Promoção</button>
            {mode === "finalizadas" ? (
              <button className="pdv-cad-btn pdv-cad-btn-green" type="button" onClick={() => navigate("/client/produtos/promocoes")}>Promoções</button>
            ) : (
              <button className="pdv-cad-btn pdv-cad-btn-red" type="button" onClick={() => navigate("/client/produtos/promocoes/finalizadas")}>Promoções Finalizadas</button>
            )}
          </>
        ),
        columns: [
          { key: "code", label: "Código", from: "code" },
          { key: "nome", label: "Nome", from: "name" },
          { key: "inicio", label: "Data/Hora Inicial", payloadKey: "inicio" },
          { key: "fim", label: "Data/Hora Final", payloadKey: "fim" },
          { key: "valor", label: "Valor Promoção", payloadKey: "valor" },
          { key: "tipo", label: "Tipo", payloadKey: "tipo" },
          { key: "atualizar", label: "Atualizar", from: "action" },
        ],
      }}
    />
  )
}

function PromocaoForm() {
  const navigate = useNavigate()
  const [nome, setNome] = useState("")
  const [inicio, setInicio] = useState("")
  const [horaI, setHoraI] = useState("00")
  const [minI, setMinI] = useState("00")
  const [fim, setFim] = useState("")
  const [horaF, setHoraF] = useState("23")
  const [minF, setMinF] = useState("55")
  const [valor, setValor] = useState("")
  const [tipo, setTipo] = useState("Porcentagem(%)")
  const [ativo, setAtivo] = useState(true)
  const [status, setStatus] = useState("")
  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"))
  const mins = ["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"]

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!nome.trim()) {
      setStatus("Informe o nome.")
      return
    }
    try {
      await createCatalog("promotion", {
        name: nome,
        active: ativo,
        payload: { inicio: `${inicio} ${horaI}:${minI}`, fim: `${fim} ${horaF}:${minF}`, valor, tipo },
      })
      navigate("/client/produtos/promocoes")
    } catch (err) {
      setStatus(parseError(err).friend || "Não foi possível cadastrar.")
    }
  }

  return (
    <Page title="CADASTRAR PROMOÇÃO">
      <button className="pdv-cad-btn pdv-cad-btn-back pdv-voltar" type="button" onClick={() => navigate("/client/produtos/promocoes")}>Voltar</button>
      <form className="pdv-cad-form" onSubmit={onSubmit}>
        <FormRow label="Nome"><input value={nome} onChange={(event) => setNome(event.target.value)} autoComplete="off" /></FormRow>
        <FormRow label="Data/Hora Inicial">
          <div className="pdv-cad-inline">
            <input value={inicio} onChange={(event) => setInicio(event.target.value)} placeholder="__/__/____" autoComplete="off" />
            <select value={horaI} onChange={(event) => setHoraI(event.target.value)}>{hours.map((h) => <option key={h}>{h}</option>)}</select>
            :
            <select value={minI} onChange={(event) => setMinI(event.target.value)}>{mins.map((m) => <option key={m}>{m}</option>)}</select>
          </div>
        </FormRow>
        <FormRow label="Data/Hora Final">
          <div className="pdv-cad-inline">
            <input value={fim} onChange={(event) => setFim(event.target.value)} placeholder="__/__/____" autoComplete="off" />
            <select value={horaF} onChange={(event) => setHoraF(event.target.value)}>{hours.map((h) => <option key={h}>{h}</option>)}</select>
            :
            <select value={minF} onChange={(event) => setMinF(event.target.value)}>{mins.map((m) => <option key={m}>{m}</option>)}</select>
          </div>
        </FormRow>
        <FormRow label="Valor Promoção">
          <div className="pdv-cad-inline">
            <input value={valor} onChange={(event) => setValor(event.target.value)} autoComplete="off" />
            <label><input type="radio" checked={tipo === "Porcentagem(%)"} onChange={() => setTipo("Porcentagem(%)")} /> Porcentagem(%)</label>
            <label><input type="radio" checked={tipo === "Dinheiro(R$)"} onChange={() => setTipo("Dinheiro(R$)")} /> Dinheiro(R$)</label>
          </div>
        </FormRow>
        <FormRow label="Ativo"><RadioSimNao name="promoAtivo" value={ativo} onChange={setAtivo} /></FormRow>
        {status ? <p className="pdv-prod-status" role="status">{status}</p> : null}
        <div className="pdv-cad-form-go">
          <button className="pdv-cad-btn pdv-cad-btn-green" type="submit"><Plus size={16} strokeWidth={2.6} aria-hidden="true" /> Cadastrar</button>
        </div>
      </form>
    </Page>
  )
}

function PromocaoAplicar() {
  const navigate = useNavigate()
  const [nome, setNome] = useState("")
  const [rows, setRows] = useState<{ id: string; name: string; code: string }[]>([])

  function onSearch(event: FormEvent) {
    event.preventDefault()
    api.get("/clients/products", { params: { q: nome } })
      .then(({ data }) => setRows(((data.products || data.items || []) as Array<{ id: string; name: string; code: string }>).slice(0, 50)))
      .catch(() => setRows([]))
  }

  return (
    <Page title="PESQUISAR PRODUTOS PARA APLICAR A PROMOÇÃO">
      <div className="pdv-cad-actions">
        <button className="pdv-cad-btn pdv-cad-btn-green" type="button" onClick={() => navigate("/client/produtos/promocoes/cadastrar")}>Cadastrar Promoção</button>
      </div>
      <form className="pdv-cad-filters" onSubmit={onSearch}>
        <label>Código da Grade<input autoComplete="off" /></label>
        <label>Código do Produto<input autoComplete="off" /></label>
        <label>Código da Referência<input autoComplete="off" /></label>
        <label>Código de Barra<input autoComplete="off" /></label>
        <label>
          Nome do Produto
          <input value={nome} onChange={(event) => setNome(event.target.value)} autoComplete="off" />
        </label>
        <label>
          Pesquisa
          <select defaultValue="Inicia com"><option>Inicia com</option><option>Exatamente</option><option>Qualquer</option><option>Final</option></select>
        </label>
        <label>Modelo<input autoComplete="off" /></label>
        <label>Produto Ativo<select defaultValue="Todos"><option>Todos</option><option>Sim</option><option>Não</option></select></label>
        <label>Categoria<select defaultValue="Selecione"><option>Selecione</option></select></label>
        <label>Tamanho<select defaultValue="Todos"><option>Todos</option></select></label>
        <label>Cor<select defaultValue="Todas"><option>Todas</option></select></label>
        <label>Marca<select defaultValue="Todas"><option>Todas</option></select></label>
        <label>Gênero<select defaultValue="Todos"><option>Todos</option></select></label>
        <label>Coleção<select defaultValue="Todas"><option>Todas</option></select></label>
        <label>Localização<input autoComplete="off" /></label>
        <div className="pdv-cad-filters-go">
          <button className="pdv-cad-btn" type="button" onClick={() => { setNome(""); setRows([]) }}>Limpar</button>
          <button className="pdv-cad-btn pdv-cad-btn-blue" type="submit">Pesquisa</button>
        </div>
      </form>
      <div className="pdv-cad-table-wrap">
        <table className="pdv-cad-table">
          <thead><tr><th>Cod. Produto</th><th>Cod. Integração Loja</th><th>Situação</th></tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}><td>{row.code}</td><td>{row.name}</td><td>—</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </Page>
  )
}

function PromocaoProdutos() {
  const navigate = useNavigate()
  return (
    <Page title="PESQUISAR PRODUTOS COM PROMOÇÃO">
      <div className="pdv-cad-actions">
        <button className="pdv-cad-btn pdv-cad-btn-green" type="button" onClick={() => navigate("/client/produtos/promocoes/cadastrar")}>Cadastrar Promoção</button>
        <button className="pdv-cad-btn pdv-cad-btn-blue" type="button">Visualizar Promoções</button>
        <button className="pdv-cad-btn pdv-cad-btn-back pdv-voltar" type="button" onClick={() => navigate("/client/produtos/promocoes")}>Voltar</button>
      </div>
      <form className="pdv-cad-filters" onSubmit={(event) => event.preventDefault()}>
        <label>Promoção Ativa<select defaultValue="Sim"><option>Sim</option><option>Não</option></select></label>
        <label>Promoção<select defaultValue="Selecione..."><option>Selecione...</option></select></label>
        <label>Estado<select defaultValue="Selecione..."><option>Selecione...</option><option>Em andamento</option><option>Finalizada</option><option>Não Iniciado</option></select></label>
        <label>Desconto<input defaultValue="0" autoComplete="off" /></label>
        <label>Data<input placeholder="__/__/___ até __/__/___" autoComplete="off" /></label>
        <label>Cod Grade<input autoComplete="off" /></label>
        <label>Cód. Produto<input autoComplete="off" /></label>
        <label>Categoria<select defaultValue="Todas"><option>Todas</option></select></label>
        <label>Marca<select defaultValue="Todas"><option>Todas</option></select></label>
        <label>Coleção<select defaultValue="Todas"><option>Todas</option></select></label>
        <label>Cor<select defaultValue="Todas"><option>Todas</option></select></label>
        <label>Tamanho<select defaultValue="Todos"><option>Todos</option></select></label>
        <div className="pdv-cad-filters-go">
          <button className="pdv-cad-btn pdv-cad-btn-blue" type="submit">Visualizar Promoções</button>
        </div>
      </form>
    </Page>
  )
}

export function TabelaPrecoList({ inactive = false }: { inactive?: boolean }) {
  const navigate = useNavigate()
  return (
    <CatalogList
      inactive={inactive}
      config={{
        kind: "price_table",
        title: inactive ? "TABELA DE PREÇO INATIVAS" : "TABELA DE PREÇO ATIVAS",
        cadastrarLabel: "Cadastrar Tabela de Preço",
        cadastrarPath: "/client/produtos/tabela-preco/cadastrar",
        listPath: "/client/produtos/tabela-preco",
        inativosPath: "/client/produtos/tabela-preco/inativas",
        inativosLabel: "Tabelas de Preços Inativas",
        ativosLabel: "Tabelas de Preços Ativas",
        extraActions: (
          <button className="pdv-cad-btn pdv-cad-btn-blue" type="button" onClick={() => navigate("/client/produtos/tabela-preco/lote")}>
            Gerenciar Tabela de Preço em Lote
          </button>
        ),
        columns: [
          { key: "viz", label: "Visualizar Preço" },
          { key: "vizInt", label: "Visualizar Preço Integração" },
          { key: "nome", label: "Tabela de Preço", from: "name" },
          { key: "padrao", label: "Padrão", payloadKey: "padrao" },
          { key: "atualizar", label: "Atualizar", from: "action" },
        ],
      }}
    />
  )
}

export function TabelaPrecoForm() {
  const navigate = useNavigate()
  const [nome, setNome] = useState("")
  const [padrao, setPadrao] = useState(false)
  const [status, setStatus] = useState("")

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!nome.trim()) {
      setStatus("Informe a tabela de preço.")
      return
    }
    try {
      await createCatalog("price_table", { name: nome, payload: { padrao } })
      navigate("/client/produtos/tabela-preco")
    } catch (err) {
      setStatus(parseError(err).friend || "Não foi possível cadastrar.")
    }
  }

  return (
    <Page title="CADASTRAR TABELA DE PREÇO">
      <button className="pdv-cad-btn pdv-cad-btn-back pdv-voltar" type="button" onClick={() => navigate("/client/produtos/tabela-preco")}>Voltar</button>
      <form className="pdv-cad-form" onSubmit={onSubmit}>
        <FormRow label="Tabela de Preço"><input value={nome} onChange={(event) => setNome(event.target.value)} autoComplete="off" /></FormRow>
        <FormRow label="Padrão"><RadioSimNao name="padrao" value={padrao} onChange={setPadrao} /></FormRow>
        {status ? <p className="pdv-prod-status" role="status">{status}</p> : null}
        <div className="pdv-cad-form-go">
          <button className="pdv-cad-btn pdv-cad-btn-green" type="submit"><Plus size={16} strokeWidth={2.6} aria-hidden="true" /> Cadastrar</button>
        </div>
      </form>
    </Page>
  )
}

export function LocalizacaoPage({ variant = "kanban" }: { variant?: "kanban" | "produto" | "setor" }) {
  const navigate = useNavigate()
  if (variant === "setor") {
    return (
      <CatalogList
        config={{
          kind: "sector",
          title: "GERENCIAR SETOR",
          cadastrarLabel: "Cadastrar Setor",
          cadastrarPath: "/client/produtos/localizacao/setores/cadastrar",
          listPath: "/client/produtos/localizacao/setores",
          extraActions: (
            <>
              <button className="pdv-cad-btn pdv-cad-btn-blue" type="button" onClick={() => navigate("/client/produtos/localizacao")}>Gerenciar Localização</button>
              <button className="pdv-cad-btn pdv-cad-btn-blue" type="button" onClick={() => navigate("/client/produtos/localizacao/produtos")}>Localização de Produtos</button>
            </>
          ),
          filters: [
            { key: "code", label: "Cod. Setor", from: "code" },
            { key: "nome", label: "Nome do Setor", from: "name" },
          ],
          columns: [
            { key: "code", label: "Código", from: "code" },
            { key: "nome", label: "Nome do Setor", from: "name" },
            { key: "atualizar", label: "Atualizar", from: "action" },
          ],
        }}
      />
    )
  }
  if (variant === "produto") {
    return (
      <Page title="GERENCIAR PRODUTO NA LOCALIZAÇÃO">
        <div className="pdv-cad-actions">
          <button className="pdv-cad-btn pdv-cad-btn-blue" type="button" onClick={() => navigate("/client/produtos/localizacao")}>Gerenciar Localização</button>
          <button className="pdv-cad-btn pdv-cad-btn-blue" type="button" onClick={() => navigate("/client/produtos/localizacao/setores")}>Gerenciar Setor</button>
        </div>
        <form className="pdv-cad-filters" onSubmit={(event) => event.preventDefault()}>
          <label>Localização<select defaultValue="Selecione..."><option>Selecione...</option></select></label>
          <label>Estado da localização<select defaultValue="Todos"><option>Todos</option><option>Vazio</option><option>Erro</option><option>Ocupado</option></select></label>
          <label>Estoque<select defaultValue="Todos"><option>Todos</option><option>=</option><option>&gt;</option><option>&gt;=</option><option>&lt;</option><option>&lt;=</option><option>&lt;&gt;</option></select></label>
          <label>ID produto<input autoComplete="off" /></label>
          <label>Cod. Produto<input autoComplete="off" /></label>
          <label>Cod. Grade<input autoComplete="off" /></label>
          <label>Referência<input autoComplete="off" /></label>
          <label>Nome do Produto<input autoComplete="off" /></label>
          <div className="pdv-cad-filters-go">
            <button className="pdv-cad-btn" type="button">Limpar</button>
            <button className="pdv-cad-btn pdv-cad-btn-blue" type="submit">Filtrar</button>
          </div>
        </form>
      </Page>
    )
  }
  return (
    <Page title="GERENCIAR LOCALIZAÇÃO">
      <div className="pdv-cad-actions">
        <button className="pdv-cad-btn pdv-cad-btn-blue" type="button" onClick={() => navigate("/client/produtos/localizacao/produtos")}>Localização de Produtos</button>
        <button className="pdv-cad-btn pdv-cad-btn-blue" type="button" onClick={() => navigate("/client/produtos/localizacao/setores")}>Gerenciar Setor</button>
      </div>
      <div className="pdv-loc-kanban">
        <p className="pdv-cad-kicker">Arraste produtos entre setores após cadastrar a localização.</p>
      </div>
    </Page>
  )
}

export function SetorForm() {
  const navigate = useNavigate()
  const [nome, setNome] = useState("")
  const [status, setStatus] = useState("")
  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!nome.trim()) { setStatus("Informe o nome do setor."); return }
    try {
      await createCatalog("sector", { name: nome, payload: {} })
      navigate("/client/produtos/localizacao/setores")
    } catch (err) {
      setStatus(parseError(err).friend || "Não foi possível cadastrar.")
    }
  }
  return (
    <Page title="CADASTRAR SETOR">
      <button className="pdv-cad-btn pdv-cad-btn-back pdv-voltar" type="button" onClick={() => navigate("/client/produtos/localizacao/setores")}>Voltar</button>
      <form className="pdv-cad-form" onSubmit={onSubmit}>
        <FormRow label="Nome do Setor"><input value={nome} onChange={(event) => setNome(event.target.value)} autoComplete="off" /></FormRow>
        {status ? <p className="pdv-prod-status" role="status">{status}</p> : null}
        <div className="pdv-cad-form-go">
          <button className="pdv-cad-btn pdv-cad-btn-green" type="submit"><Plus size={16} strokeWidth={2.6} aria-hidden="true" /> Cadastrar</button>
        </div>
      </form>
    </Page>
  )
}

export function LotePage() {
  const [draft, setDraft] = useState({ busca: "Cód do Produto, Produto", nome: "", categoria: "Todas", ativo: "Todos" })
  const [rows, setRows] = useState<{ id: string; name: string; code: string }[]>([])

  function onSearch(event: FormEvent) {
    event.preventDefault()
    api.get("/clients/products", { params: { q: draft.nome } })
      .then(({ data }) => setRows(((data.products || data.items || []) as Array<{ id: string; name: string; code: string }>).slice(0, 50)))
      .catch(() => setRows([]))
  }

  return (
    <Page title="PESQUISAR PRODUTO PARA APLICAR">
      <form className="pdv-cad-filters" onSubmit={onSearch}>
        <label>Código da Grade<input autoComplete="off" /></label>
        <label>Código do Produto<input autoComplete="off" /></label>
        <label>Código da Referência<input autoComplete="off" /></label>
        <label>Código de Barra<input autoComplete="off" /></label>
        <label>
          Nome do Produto
          <input value={draft.nome} onChange={(event) => setDraft({ ...draft, nome: event.target.value })} autoComplete="off" />
        </label>
        <label>Pesquisa<select defaultValue="Inicia com"><option>Inicia com</option><option>Exatamente</option><option>Qualquer</option><option>Final</option></select></label>
        <label>Modelo<input autoComplete="off" /></label>
        <label>
          Produto Ativo
          <select value={draft.ativo} onChange={(event) => setDraft({ ...draft, ativo: event.target.value })}>
            <option>Todos</option><option>Sim</option><option>Não</option>
          </select>
        </label>
        <label>
          Categoria
          <select value={draft.categoria} onChange={(event) => setDraft({ ...draft, categoria: event.target.value })}>
            <option>Todas</option>
            <option>Nenhum selecionado</option>
          </select>
        </label>
        <label>Tamanho<select defaultValue="Todos"><option>Todos</option></select></label>
        <label>Cor<select defaultValue="Todas"><option>Todas</option></select></label>
        <label>Marca<select defaultValue="Todas"><option>Todas</option></select></label>
        <label>Gênero<select defaultValue="Todos"><option>Todos</option></select></label>
        <label>Coleção<select defaultValue="Todas"><option>Todas</option></select></label>
        <label>Localização<input autoComplete="off" /></label>
        <div className="pdv-cad-filters-go">
          <button className="pdv-cad-btn pdv-cad-btn-blue" type="submit">Pesquisa</button>
        </div>
      </form>
      <div className="pdv-cad-table-wrap">
        <table className="pdv-cad-table">
          <thead><tr><th>Cod. Produto</th><th>Cod. Loja</th><th>Situação</th></tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}><td>{row.code}</td><td>{row.name}</td><td>—</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </Page>
  )
}

export function TrayDownloadPage() {
  const [status, setStatus] = useState("")
  return (
    <Page title="TRAY DOWNLOAD EM LOTE">
      <form className="pdv-cad-filters" onSubmit={(event) => { event.preventDefault(); setStatus("Tray não está conectada nesta instalação.") }}>
        <label>Data Inicio da criação do produto LV<input placeholder="__/__/____" autoComplete="off" /></label>
        <label>Data Fim da criação do produto LV<input placeholder="__/__/____" autoComplete="off" /></label>
        <div className="pdv-cad-filters-go">
          <button className="pdv-cad-btn" type="button" onClick={() => setStatus("")}>Limpar</button>
          <button className="pdv-cad-btn pdv-cad-btn-blue" type="submit">Executar Download</button>
        </div>
      </form>
      {status ? <p className="pdv-prod-status" role="status">{status}</p> : null}
    </Page>
  )
}

export function EditorEtiquetasPage() {
  const [unit, setUnit] = useState("mm")
  const [papel, setPapel] = useState("Térmica")
  return (
    <Page title="EDITOR DE ETIQUETAS">
      <div className="pdv-cad-actions">
        <button className="pdv-cad-btn pdv-cad-btn-green" type="button">Nova</button>
        <button className="pdv-cad-btn pdv-cad-btn-blue" type="button">Templates</button>
        <button className="pdv-cad-btn" type="button">Carregar</button>
        <button className="pdv-cad-btn pdv-cad-btn-blue" type="button">Salvar</button>
        <button className="pdv-cad-btn" type="button">Imprimir</button>
        <button className={unit === "cm" ? "pdv-cad-btn pdv-cad-btn-blue" : "pdv-cad-btn"} type="button" onClick={() => setUnit("cm")}>cm</button>
        <button className={unit === "mm" ? "pdv-cad-btn pdv-cad-btn-blue" : "pdv-cad-btn"} type="button" onClick={() => setUnit("mm")}>mm</button>
        <button className={papel === "Térmica" ? "pdv-cad-btn pdv-cad-btn-blue" : "pdv-cad-btn"} type="button" onClick={() => setPapel("Térmica")}>Térmica</button>
        <button className={papel === "A4" ? "pdv-cad-btn pdv-cad-btn-blue" : "pdv-cad-btn"} type="button" onClick={() => setPapel("A4")}>A4</button>
        <button className="pdv-cad-btn" type="button">B</button>
        <button className="pdv-cad-btn" type="button">I</button>
        <button className="pdv-cad-btn" type="button">Nova imagem</button>
      </div>
      <div className="pdv-etiqueta-canvas" data-papel={papel}>
        <p>Área da etiqueta ({unit})</p>
      </div>
    </Page>
  )
}

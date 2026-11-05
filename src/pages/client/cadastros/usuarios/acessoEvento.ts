import { listCatalog } from "../catalog/catalogApi"
import { GROUP_EVENTS, eventoPermitido, type GroupEvent } from "./groupEvents"

/** Caminho da tela que já existe, do mais específico para o geral. */
const ROTAS: Array<[prefix: string, key: string]> = [
  ["/client/relatorios/auditoria/geral-log", "wm10.89"],
  ["/client/relatorios/auditoria/preco-compra", "wm10.374"],
  ["/client/relatorios/auditoria/estoque", "wm10.80"],
  ["/client/relatorios/clientes/sem-movimentacao", "wm10.200"],
  ["/client/relatorios/clientes/movimentacao", "wm10.412"],
  ["/client/relatorios/clientes/marketing", "wm10.178"],
  ["/client/relatorios/clientes/caixa", "wm10.344"],
  ["/client/relatorios/compras/detalhada", "wm10.92"],
  ["/client/relatorios/documentos-fiscais/nfse", "wm10.299"],
  ["/client/relatorios/documentos-fiscais", "wm10.241"],
  ["/client/relatorios/estoque/por-grade", "wm10.129"],
  ["/client/relatorios/estoque/detalhado", "wm10.128"],
  ["/client/relatorios/estoque/por-status", "wm10.354"],
  ["/client/relatorios/estoque/minimo-maximo", "wm10.243"],
  ["/client/relatorios/estoque/contagem", "wm10.285"],
  ["/client/relatorios/estoque/fiscal", "wm10.342"],
  ["/client/relatorios/estoque", "wm10.71"],
  ["/client/relatorios/etiquetas/sigep/etiqueta", "wm10.268"],
  ["/client/relatorios/etiquetas/sigep/postagem", "wm10.269"],
  ["/client/relatorios/etiquetas/envio", "wm10.260"],
  ["/client/relatorios/etiquetas/produtos", "wm10.91"],
  ["/client/relatorios/financeiro/conferencia-cartao", "wm10.123"],
  ["/client/relatorios/financeiro/recebimento", "wm10.289"],
  ["/client/relatorios/financeiro/cobranca", "wm10.114"],
  ["/client/relatorios/financeiro/cheque", "wm10.124"],
  ["/client/relatorios/financeiro/caixa", "wm10.41"],
  ["/client/relatorios/produto/tabela-preco", "wm10.321"],
  ["/client/relatorios/venda/forma-pagamento", "wm10.187"],
  ["/client/relatorios/venda/custos-vendas", "wm10.105"],
  ["/client/relatorios/venda/cliente-mes", "wm10.388"],
  ["/client/relatorios/venda/cliente-loja", "wm10.112"],
  ["/client/relatorios/venda/vendedores-mes", "wm10.125"],
  ["/client/relatorios/venda/descontos", "wm10.210"],
  ["/client/relatorios/venda/resumida", "wm10.95"],
  ["/client/relatorios/venda/comissao", "wm10.83"],
  ["/client/relatorios/venda/meta", "wm10.206"],
  ["/client/relatorios/venda/itens", "wm10.40"],
  ["/client/relatorios/venda-gerencial/giro-grade", "wm10.343"],
  ["/client/relatorios/venda-gerencial/produto-mais-vendido", "wm10.163"],
  ["/client/relatorios/venda-gerencial/lucratividade", "wm10.185"],
  ["/client/relatorios/venda-gerencial/faturamento", "wm10.162"],
  ["/client/relatorios/venda-gerencial/giro", "wm10.175"],
  ["/client/relatorios/despesa", "wm10.184"],
  ["/client/relatorios/dre", "wm10.108"],
  ["/client/movimentacoes/vendas/entregas", "wm10.376"],
  ["/client/movimentacoes/vendas/pdv", "wm10.9"],
  ["/client/movimentacoes/vendas/imei", "wm10.16"],
  ["/client/movimentacoes/vendas", "wm10.13"],
  ["/client/movimentacoes/compras/nova", "wm10.45"],
  ["/client/movimentacoes/compras/xml", "wm10.165"],
  ["/client/movimentacoes/compras/imei", "wm10.52"],
  ["/client/movimentacoes/compras", "wm10.49"],
  ["/client/movimentacoes/caixa/conta-corrente", "wm10.311"],
  ["/client/movimentacoes/caixa/conciliacao", "wm10.302"],
  ["/client/movimentacoes/caixa/relatorio", "wm10.41"],
  ["/client/movimentacoes/caixa/detalhado", "wm10.41"],
  ["/client/movimentacoes/financeiro/despesas/cadastrar", "wm10.167"],
  ["/client/movimentacoes/financeiro/receitas/cadastrar", "wm10.167"],
  ["/client/movimentacoes/financeiro/despesas", "wm10.166"],
  ["/client/movimentacoes/financeiro/receber", "wm10.36"],
  ["/client/movimentacoes/financeiro/pagar", "wm10.38"],
  ["/client/movimentacoes/financeiro/fluxo", "wm10.127"],
  ["/client/movimentacoes/financeiro/plano-conta", "wm10.208"],
  ["/client/movimentacoes/transferencias", "wm10.72"],
  ["/client/movimentacoes/contagem", "wm10.211"],
  ["/client/movimentacoes/documentos-fiscais/nfe", "wm10.350"],
  ["/client/movimentacoes/documentos-fiscais/nfse", "wm10.299"],
  ["/client/movimentacoes/documentos-fiscais/manifestacao", "wm10.297"],
  ["/client/movimentacoes/documentos-fiscais/param-nfe", "wm10.207"],
  ["/client/movimentacoes/documentos-fiscais/param-nfse", "wm10.299"],
  ["/client/movimentacoes/documentos-fiscais/arquivos-contador", "wm10.224"],
  ["/client/clientes/cadastrar", "wm10.5"],
  ["/client/clientes", "wm10.4"],
  ["/client/fornecedores/cadastrar", "wm10.43"],
  ["/client/fornecedores", "wm10.42"],
  ["/client/produtos/categorias/cadastrar", "wm10.34"],
  ["/client/produtos/categorias", "wm10.33"],
  ["/client/produtos/promocoes/aplicar", "wm10.131"],
  ["/client/produtos/promocoes", "wm10.130"],
  ["/client/produtos/localizacao/produtos", "wm10.414"],
  ["/client/produtos/localizacao/setores", "wm10.415"],
  ["/client/produtos/localizacao", "wm10.413"],
  ["/client/produtos/variacoes", "wm10.96"],
  ["/client/produtos/marcas", "wm10.96"],
  ["/client/produtos/colecoes", "wm10.96"],
  ["/client/produtos/generos", "wm10.96"],
  ["/client/produtos/unidades", "wm10.203"],
  ["/client/produtos/tabela-preco", "wm10.235"],
  ["/client/produtos/etiquetas", "wm10.417"],
  ["/client/produtos/tray", "wm10.335"],
  ["/client/produtos/estoque", "wm10.404"],
  ["/client/produtos", "wm10.62"],
  ["/client/usuarios/grupos/eventos", "wm10.57"],
  ["/client/usuarios/grupos/cadastrar", "wm10.55"],
  ["/client/usuarios/grupos", "wm10.54"],
  ["/client/usuarios/representantes", "wm10.419"],
  ["/client/usuarios/comissoes", "wm10.182"],
  ["/client/usuarios/cadastrar", "wm10.1"],
  ["/client/usuarios", "wm10.2"],
  ["/client/financeiro/plano-conta", "wm10.208"],
  ["/client/documentos-fiscais/parametros", "wm10.207"],
  ["/client/configuracao/tipo-atividade", "wm10.325"],
  ["/client/configuracao/impressao", "wm10.237"],
  ["/client/configuracao/pacotes-sigep", "wm10.267"],
  ["/client/configuracao/transportadora", "wm10.121"],
  ["/client/grupos-de-loja/cadastrar", "wm10.236"],
  ["/client/grupos-de-loja", "wm10.254"],
  ["/client/pdv", "wm10.9"],
  ["/client/caixa", "wm10.119"],
  ["/client/trocar-senha", "wm10.102"],
]

type Sessao = {
  pronto: boolean
  catalogo: boolean
  eventos: unknown
}

let sessao: Sessao = { pronto: false, catalogo: false, eventos: null }
const ouvintes = new Set<() => void>()

function avisar() {
  ouvintes.forEach((ouvir) => ouvir())
}

export function observarEventos(ouvir: () => void) {
  ouvintes.add(ouvir)
  return () => ouvintes.delete(ouvir)
}

export function publicarSessao(proxima: Sessao) {
  sessao = proxima
  avisar()
}

export function avisoDoEvento(event: GroupEvent) {
  return event.code ? `Ligue o evento ${event.code} — ${event.label}.` : `Ligue o evento — ${event.label}.`
}

function caminhoDe(href: string) {
  const path = href.split("?")[0].split("#")[0]
  if (path.length > 1 && path.endsWith("/")) return path.slice(0, -1)
  return path
}

export function eventoDaRota(href: string) {
  const path = caminhoDe(href)
  const achou = ROTAS.filter(([prefix]) => path === prefix || path.startsWith(`${prefix}/`)).sort(
    (a, b) => b[0].length - a[0].length,
  )[0]
  if (!achou) return null
  return GROUP_EVENTS.find((event) => event.key === achou[1]) || null
}

export function aguardandoEvento(href: string) {
  return Boolean(eventoDaRota(href)) && !sessao.pronto
}

export function bloqueioDaRota(href: string) {
  if (!sessao.pronto || !sessao.catalogo) return ""
  const event = eventoDaRota(href)
  if (!event) return ""
  if (eventoPermitido(sessao.eventos, event.key)) return ""
  return avisoDoEvento(event)
}

export async function carregarEventos(email: string, username: string): Promise<Sessao> {
  const [users, groups] = await Promise.all([listCatalog("user", true), listCatalog("group", true)])
  const mail = email.trim().toLowerCase()
  const login = username.trim().toLowerCase()
  const user = users.find((item) => {
    const itemMail = String(item.payload.email || "").trim().toLowerCase()
    const itemLogin = String(item.payload.usuario || "").trim().toLowerCase()
    return (mail && itemMail === mail) || (login && itemLogin === login)
  })
  if (!user) return { pronto: true, catalogo: false, eventos: null }
  const group = groups.find((item) => item.name === String(user.payload.grupo || ""))
  return { pronto: true, catalogo: true, eventos: group?.payload.eventos ?? null }
}

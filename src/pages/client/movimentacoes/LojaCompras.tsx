import { FormEvent, useEffect, useMemo, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { CheckCircle2, Clock, Plus, RotateCcw, Search, UserRound } from "lucide-react"
import { api, parseError } from "../../../services/api"
import { CadastroFrame } from "../cadastros/CadastroShell"
import { AVISO_ESTORNAR_COMPRA } from "../cadastros/usuarios/groupEvents"
import { usePodeEstornarCompra } from "../cadastros/usuarios/useVerCusto"
import PdvOverlayModal from "../dashboard/PdvOverlayModal"
import { EMPTY_FORNECEDOR, FornecedorFields, nomeDoFornecedor, type FornecedorPayload } from "../cadastros/fornecedores/FornecedorForm"
import type { PdvSupplier } from "../cadastros/fornecedores/types"

export { NovaCompra } from "./LojaCompraPdv"

type CompraLinha = {
  productId?: string
  code?: string
  name?: string
  qty?: number
  price?: number
  discount?: number
  surcharge?: number
  saleSuggest?: number
  saleCurrent?: number
  stock?: number
}
type CompraMeta = {
  invoiceDate?: string
  invoiceNumber?: string
  notes?: string
  userName?: string
  caixa?: string
  profitCalc?: string
  accessory?: boolean
  accessoryValue?: number
  anexo?: string
}
type Compra = {
  id: string
  code: string
  supplier?: string
  status: "aberta" | "concluida" | "estornada"
  lines: CompraLinha[]
  meta?: CompraMeta
  total: number
  createdAt: string
  estornadaAt?: string | null
}
type Fornecedor = { code: number; razao: string; fantasia: string; document?: string }
type Faixa = "abertas" | "concluidas" | "estornadas"

type NotaXml = {
  numero: string
  emitente: string
  data: string
  linhas: Array<{ code: string; name: string; qty: string; price: string }>
}

function reais(value?: number) {
  return (Number(value) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

function quando(value?: string | null) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })
}

function tag(root: Document | Element, name: string) {
  return root.getElementsByTagNameNS("*", name)[0]?.textContent?.trim() || ""
}

function nomeFornecedor(item: Fornecedor) {
  return nomeDoFornecedor(item)
}

function semAcento(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
}

function casaFornecedor(item: Fornecedor, bruto: string) {
  const q = semAcento(bruto.trim().toLocaleLowerCase("pt-BR"))
  if (!q) return false
  const nome = semAcento(`${item.code} ${nomeFornecedor(item)} ${item.razao || ""} ${item.fantasia || ""}`.toLocaleLowerCase("pt-BR"))
  const partes = q.split(/\s+/).filter(Boolean)
  if (partes.every((parte) => nome.includes(parte))) return true
  const doc = (item.document || "").replace(/\D/g, "")
  const qDoc = bruto.replace(/\D/g, "")
  return qDoc.length >= 3 && doc.includes(qDoc)
}

function statusTexto(status: Compra["status"]) {
  if (status === "estornada") return "Estornada"
  if (status === "aberta") return "Em aberto"
  return "Concluída"
}

function rotuloPedido(code?: string) {
  return code || "—"
}

function fornecedorTela(nome?: string) {
  return (nome || "").trim().toLocaleUpperCase("pt-BR")
}

function faixaDaRota(pathname: string): Faixa {
  if (pathname.endsWith("/estornadas")) return "estornadas"
  if (pathname.endsWith("/concluidas")) return "concluidas"
  return "abertas"
}

let comprasCache: Compra[] | null = null
let comprasPedido: Promise<Compra[]> | null = null

function pedirCompras() {
  const pedido = api
    .get("/clients/compras")
    .then(({ data }) => {
      const rows = (data?.compras || []) as Compra[]
      comprasCache = rows
      return rows
    })
  comprasPedido = pedido
  pedido.finally(() => {
    if (comprasPedido === pedido) comprasPedido = null
  })
  return pedido
}

export function aquecerCompras() {
  if (comprasCache || comprasPedido) return
  if (!localStorage.getItem("@client:token")) return
  void pedirCompras().catch(() => undefined)
}

export function NovasCompras() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const faixa = faixaDaRota(pathname)
  const [compras, setCompras] = useState<Compra[]>(() => comprasCache ?? [])
  const [aviso, setAviso] = useState(() => (comprasCache ? "" : "Carregando..."))
  const [modal, setModal] = useState(false)
  const podeEstornar = usePodeEstornarCompra()
  const podeMarcar = faixa === "concluidas" && podeEstornar === true

  function aplicar(rows: Compra[]) {
    setCompras(rows)
    setAviso("")
  }

  function carregar() {
    const pedido = comprasPedido || pedirCompras()
    pedido
      .then(aplicar)
      .catch(() => {
        if (comprasCache) return
        setCompras([])
        setAviso("Não foi possível carregar as compras.")
      })
  }

  useEffect(() => {
    carregar()
  }, [])

  const grupos = useMemo(() => ({
    abertas: compras.filter((compra) => compra.status === "aberta"),
    concluidas: compras.filter((compra) => compra.status === "concluida"),
    estornadas: compras.filter((compra) => compra.status === "estornada"),
  }), [compras])
  const visiveis = grupos[faixa]

  async function estornar(compra: Compra) {
    if (podeEstornar !== true) {
      setAviso(AVISO_ESTORNAR_COMPRA)
      return
    }
    if (!window.confirm(`Estornar a compra ${rotuloPedido(compra.code)}?`)) return
    try {
      await api.post(`/clients/compras/${compra.id}/estornar`)
      carregar()
    } catch (err) {
      setAviso(parseError(err).friend || "Não foi possível estornar.")
    }
  }

  return (
    <CadastroFrame>
      <section className="pdv-cad-page pdv-cli-page" aria-labelledby="pdv-compras-title">
        <div className="pdv-cad-sheet pdv-cad-sheet-wide">
          <h1 id="pdv-compras-title">NOVAS COMPRAS</h1>
          <div className="pdv-compra-cards">
            <button type="button" className="pdv-compra-card pdv-compra-card-nova" onClick={() => setModal(true)}>
              <Plus size={22} strokeWidth={2.4} aria-hidden="true" />
              <span>Novas compras</span>
            </button>
            <button
              type="button"
              className={`pdv-compra-card pdv-compra-card-abertas${faixa === "abertas" ? " is-on" : ""}`}
              onClick={() => navigate("/client/movimentacoes/compras/abertas")}
            >
              <Clock size={22} strokeWidth={2.4} aria-hidden="true" />
              <span>Abertas</span>
              <strong>{aviso ? "" : grupos.abertas.length}</strong>
            </button>
            <button
              type="button"
              className={`pdv-compra-card pdv-compra-card-concluidas${faixa === "concluidas" ? " is-on" : ""}`}
              onClick={() => navigate("/client/movimentacoes/compras/concluidas")}
            >
              <CheckCircle2 size={22} strokeWidth={2.4} aria-hidden="true" />
              <span>Concluídas</span>
              <strong>{aviso ? "" : grupos.concluidas.length}</strong>
            </button>
            <button
              type="button"
              className={`pdv-compra-card pdv-compra-card-estornadas${faixa === "estornadas" ? " is-on" : ""}`}
              onClick={() => navigate("/client/movimentacoes/compras/estornadas")}
            >
              <RotateCcw size={22} strokeWidth={2.4} aria-hidden="true" />
              <span>Estornadas</span>
              <strong>{aviso ? "" : grupos.estornadas.length}</strong>
            </button>
          </div>
          {aviso ? <p className="pdv-compra-aviso">{aviso}</p> : null}
          {faixa === "concluidas" && podeEstornar === false ? (
            <p className="pdv-compra-aviso">{AVISO_ESTORNAR_COMPRA}</p>
          ) : null}
          {!aviso && visiveis.length === 0 ? <p className="pdv-compra-aviso">Nenhuma compra nesta lista.</p> : null}
          {visiveis.length > 0 ? (
            <div className="pdv-cad-table-wrap">
              <table className="pdv-cad-table">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Fornecedor</th>
                    <th>Feito em</th>
                    <th>Valor</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {visiveis.map((compra) => (
                      <tr
                        key={compra.id}
                        className="pdv-compra-linha"
                        tabIndex={0}
                        onClick={() => navigate(`/client/movimentacoes/compras/nova?id=${compra.id}`)}
                        onKeyDown={(event) => {
                          if (event.key !== "Enter" && event.key !== " ") return
                          event.preventDefault()
                          navigate(`/client/movimentacoes/compras/nova?id=${compra.id}`)
                        }}
                      >
                        <td>
                          <span className="pdv-compra-pedido">{rotuloPedido(compra.code)}</span>
                        </td>
                        <td>{fornecedorTela(compra.supplier)}</td>
                        <td>{quando(compra.createdAt)}</td>
                        <td>{reais(compra.total)}</td>
                        <td>{statusTexto(compra.status)}</td>
                        <td>
                          {podeMarcar && compra.status === "concluida" ? (
                            <button
                              type="button"
                              className="pdv-cad-btn"
                              onClick={(event) => {
                                event.stopPropagation()
                                void estornar(compra)
                              }}
                            >
                              Estornar
                            </button>
                          ) : null}
                        </td>
                      </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      </section>
      <FornecedorModal
        open={modal}
        onClose={() => setModal(false)}
        onEscolhido={(id) => {
          setModal(false)
          navigate(`/client/movimentacoes/compras/nova?id=${id}`)
        }}
      />
    </CadastroFrame>
  )
}

function FornecedorModal({
  open,
  onClose,
  onEscolhido,
}: {
  open: boolean
  onClose: () => void
  onEscolhido: (id: string) => void
}) {
  const [lista, setLista] = useState<Fornecedor[]>([])
  const [filtro, setFiltro] = useState("")
  const [aviso, setAviso] = useState("")
  const [cadastro, setCadastro] = useState(false)
  const [novo, setNovo] = useState<FornecedorPayload>(EMPTY_FORNECEDOR)
  const [busy, setBusy] = useState(false)
  const [carregando, setCarregando] = useState(false)

  useEffect(() => {
    if (!open) return
    setFiltro("")
    setCadastro(false)
    setNovo(EMPTY_FORNECEDOR)
    setAviso("")
    setBusy(false)
    setCarregando(true)
    api
      .get("/clients/suppliers", { params: { ativo: "1" } })
      .then(({ data }) => setLista((data?.suppliers || []) as Fornecedor[]))
      .catch(() => setAviso("Não foi possível carregar os fornecedores."))
      .finally(() => setCarregando(false))
  }, [open])

  const visiveis = useMemo(() => {
    if (!filtro.trim()) return []
    return lista
      .filter((item) => casaFornecedor(item, filtro))
      .sort((a, b) => nomeFornecedor(a).localeCompare(nomeFornecedor(b), "pt-BR"))
  }, [filtro, lista])

  async function abrir(supplier: string) {
    setBusy(true)
    setAviso("")
    try {
      const { data } = await api.post("/clients/compras/aberta", { supplier })
      const id = String(data?.compra?.id || "")
      if (!id) throw new Error("sem id")
      onEscolhido(id)
    } catch (err) {
      setAviso(parseError(err).friend || "Não foi possível abrir a compra.")
      setBusy(false)
    }
  }

  async function cadastrar(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setAviso("")
    try {
      const { data } = await api.post("/clients/suppliers", novo)
      const salvo = data?.supplier as PdvSupplier | undefined
      await abrir(nomeDoFornecedor(salvo || novo))
    } catch (err) {
      setAviso(parseError(err).friend || "Não foi possível cadastrar o fornecedor.")
      setBusy(false)
    }
  }

  return (
    <PdvOverlayModal open={open} title={cadastro ? "Cadastrar fornecedor" : "Nova Compra"} size={cadastro ? "wide" : "form"} icon={<UserRound size={18} />} lock onClose={onClose}>
      <div className="pdv-forn-modal">
        {cadastro ? (
          <>
            <button className="pdv-cad-btn" type="button" disabled={busy} onClick={() => setCadastro(false)}>Voltar à busca</button>
            <FornecedorFields form={novo} onChange={setNovo} saving={busy} submitLabel="Cadastrar e abrir" onSubmit={cadastrar} />
          </>
        ) : (
          <>
            <p className="pdv-forn-kicker">Fornecedor</p>
            <form
              className="pdv-forn-search"
              onSubmit={(event) => event.preventDefault()}
            >
              <Search size={16} aria-hidden="true" />
              <input
                value={filtro}
                onChange={(event) => setFiltro(event.target.value)}
                placeholder="Nome, CNPJ ou código"
                autoComplete="off"
                aria-label="Buscar fornecedor"
              />
              <button className="pdv-cad-btn pdv-cad-btn-green" type="submit">Buscar</button>
            </form>
            {!filtro.trim() ? (
              <p className="pdv-forn-empty">
                {aviso || (carregando ? "Carregando fornecedores..." : "Pesquise por nome, CNPJ ou código para listar o fornecedor.")}
              </p>
            ) : carregando ? (
              <p className="pdv-forn-empty">Buscando...</p>
            ) : visiveis.length === 0 ? (
              <p className="pdv-forn-empty">{aviso || "Nenhum fornecedor com essa busca."}</p>
            ) : (
              <ul className="pdv-forn-lista" aria-label="Fornecedores">
                {visiveis.map((item) => (
                  <li key={item.code}>
                    <button type="button" disabled={busy} onClick={() => void abrir(nomeFornecedor(item))}>
                      <strong>{nomeFornecedor(item)}</strong>
                      <span>{item.document || `Cód. ${item.code}`}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <button className="pdv-cad-btn pdv-forn-cad" type="button" onClick={() => setCadastro(true)}>
              <Plus size={16} strokeWidth={2.4} aria-hidden="true" />
              Cadastrar fornecedor
            </button>
          </>
        )}
        {aviso && (cadastro || visiveis.length > 0) ? <p className="pdv-forn-aviso">{aviso}</p> : null}
      </div>
    </PdvOverlayModal>
  )
}

export function BuscarImeiCompra() {
  const [termo, setTermo] = useState("")
  const [aviso, setAviso] = useState("")
  const [pedido, setPedido] = useState<{
    number?: string
    date?: string
    observacao?: string
    origem?: "compra" | "troca"
    cliente?: string
    venda?: string
    lines?: Array<CompraLinha & { imei?: string }>
  } | null>(null)

  async function buscar(event: FormEvent) {
    event.preventDefault()
    setPedido(null)
    setAviso("")
    if (termo.trim().length < 8) {
      setAviso("Digite pelo menos 8 caracteres do IMEI.")
      return
    }
    try {
      const { data } = await api.get("/clients/pre-vendas/imei", { params: { imei: termo.trim() } })
      if (!data?.order) {
        setAviso("Nenhuma compra ou troca desta loja com esse IMEI.")
        return
      }
      setPedido(data.order)
    } catch {
      setAviso("Nenhuma compra ou troca desta loja com esse IMEI.")
    }
  }

  const troca = pedido?.origem === "troca"

  return (
    <CadastroFrame>
      <section className="pdv-cad-page pdv-cli-page" aria-labelledby="pdv-imei-title">
        <div className="pdv-cad-sheet pdv-cad-sheet-wide">
          <h1 id="pdv-imei-title">BUSCAR IMEI</h1>
          <form className="pdv-cad-filters" onSubmit={buscar}>
            <label>
              IMEI
              <input value={termo} onChange={(event) => setTermo(event.target.value)} autoComplete="off" />
            </label>
            <div className="pdv-cad-filters-go">
              <button className="pdv-cad-btn pdv-cad-btn-blue" type="submit">Buscar</button>
            </div>
          </form>
          {aviso ? <p className="pdv-compra-aviso">{aviso}</p> : null}
          {pedido ? (
            <>
              <p className="pdv-compra-aviso">
                {troca
                  ? `Troca · Venda ${pedido.venda || pedido.number || ""}`
                  : pedido.number ? `Pedido ${pedido.number}` : "Pedido"}
                {pedido.date ? ` · ${new Date(pedido.date).toLocaleDateString("pt-BR")}` : ""}
                {troca && pedido.cliente ? ` · Cliente ${pedido.cliente}` : ""}
                {pedido.observacao ? ` · ${pedido.observacao}` : ""}
              </p>
              <div className="pdv-cad-table-wrap">
                <table className="pdv-cad-table">
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Produto</th>
                      <th>IMEI</th>
                      <th>Qtd</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(pedido.lines || []).map((linha, index) => (
                      <tr key={`${linha.code}-${index}`}>
                        <td>{linha.code || ""}</td>
                        <td>{linha.name || ""}</td>
                        <td>{linha.imei || ""}</td>
                        <td>{linha.qty ?? ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
        </div>
      </section>
    </CadastroFrame>
  )
}

export function ImportarXmlCompra() {
  const [nota, setNota] = useState<NotaXml | null>(null)
  const [aviso, setAviso] = useState("A nota lida aparece aqui. Ela ainda não entra no estoque.")

  function lerArquivo(arquivo: File) {
    setNota(null)
    const leitor = new FileReader()
    leitor.onload = () => {
      const xml = new DOMParser().parseFromString(String(leitor.result || ""), "application/xml")
      if (xml.querySelector("parsererror")) {
        setAviso("Esse arquivo não é um XML de nota.")
        return
      }
      const detalhes = [...xml.getElementsByTagNameNS("*", "det")]
      if (detalhes.length === 0) {
        setAviso("Não achei produtos nesse XML.")
        return
      }
      const ide = xml.getElementsByTagNameNS("*", "ide")[0]
      const emit = xml.getElementsByTagNameNS("*", "emit")[0]
      setNota({
        numero: ide ? tag(ide, "nNF") : "",
        emitente: emit ? tag(emit, "xNome") : "",
        data: ide ? tag(ide, "dhEmi").slice(0, 10) : "",
        linhas: detalhes.map((detalhe) => {
          const prod = detalhe.getElementsByTagNameNS("*", "prod")[0]
          return {
            code: prod ? tag(prod, "cProd") : "",
            name: prod ? tag(prod, "xProd") : "",
            qty: prod ? tag(prod, "qCom") : "",
            price: prod ? tag(prod, "vUnCom") : "",
          }
        }),
      })
      setAviso("Leitura desta tela. A nota ainda não entra no estoque.")
    }
    leitor.readAsText(arquivo)
  }

  return (
    <CadastroFrame>
      <section className="pdv-cad-page pdv-cli-page" aria-labelledby="pdv-xml-title">
        <div className="pdv-cad-sheet pdv-cad-sheet-wide">
          <h1 id="pdv-xml-title">IMPORTAR XML</h1>
          <form className="pdv-cad-filters" onSubmit={(event) => event.preventDefault()}>
            <label>
              Arquivo XML
              <input
                type="file"
                accept=".xml,text/xml,application/xml"
                onChange={(event) => {
                  const arquivo = event.target.files?.[0]
                  if (arquivo) lerArquivo(arquivo)
                }}
              />
            </label>
          </form>
          {aviso ? <p className="pdv-compra-aviso">{aviso}</p> : null}
          {nota ? (
            <>
              <p className="pdv-compra-aviso">
                {[nota.emitente, nota.numero ? `Nota ${nota.numero}` : "", nota.data].filter(Boolean).join(" · ")}
              </p>
              <div className="pdv-cad-table-wrap">
                <table className="pdv-cad-table">
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Produto</th>
                      <th>Qtd</th>
                      <th>Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {nota.linhas.map((linha, index) => (
                      <tr key={`${linha.code}-${index}`}>
                        <td>{linha.code}</td>
                        <td>{linha.name}</td>
                        <td>{linha.qty}</td>
                        <td>{linha.price}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
        </div>
      </section>
    </CadastroFrame>
  )
}

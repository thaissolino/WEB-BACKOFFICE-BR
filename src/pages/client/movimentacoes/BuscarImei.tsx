import { FormEvent, useState } from "react"
import { Search } from "lucide-react"
import { api, parseError } from "../../../services/api"
import { CadastroFrame } from "../cadastros/CadastroShell"
import { formatMoneyRs } from "../cadastros/produtos/types"
import { SaleDetailPanel, type LojaPdvSale } from "./LojaVendasPainel"

type Escopo = "tudo" | "venda"

type ImeiEvento = {
  imei?: string
  kind?: string
  productName?: string
  productCode?: string
  saleId?: string
  saleCode?: string
  counterpart?: string
  from?: string
  to?: string
  price?: number
  at?: string
  status?: string
}

type VendaEncontrada = {
  saleId: string
  saleCode: string
  customer: string
  at?: string
  lines: ImeiEvento[]
  sale?: LojaPdvSale
}

function kindLabel(kind: string) {
  if (kind === "entrada_nota") return "Entrou (nota)"
  if (kind === "entrada_compra") return "Entrou (compra)"
  if (kind === "entrada_troca") return "Entrou (troca)"
  if (kind === "troca_aberta") return "Troca em aberto"
  if (kind === "saida_venda") return "Saiu (venda)"
  if (kind === "venda_aberta") return "Venda em aberto"
  if (kind === "estorno_venda") return "Estorno de venda"
  if (kind === "estorno_troca") return "Estorno de troca"
  if (kind === "estorno_compra") return "Estorno de compra"
  return kind || "—"
}

function when(value?: string) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return `${date.toLocaleDateString("pt-BR")} ${date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
}

function foiVendido(evento: ImeiEvento) {
  return evento.kind === "saida_venda" || evento.kind === "estorno_venda"
}

function agruparVendas(eventos: ImeiEvento[]): VendaEncontrada[] {
  const mapa = new Map<string, VendaEncontrada>()
  for (const evento of eventos.filter(foiVendido)) {
    const chave = evento.saleId || evento.saleCode || evento.imei || "venda"
    const atual = mapa.get(chave)
    if (!atual) {
      mapa.set(chave, {
        saleId: evento.saleId || "",
        saleCode: evento.saleCode || "",
        customer: evento.counterpart || evento.to || "",
        at: evento.at,
        lines: [evento],
      })
      continue
    }
    atual.lines.push(evento)
  }
  return [...mapa.values()]
}

function CampoBusca({
  termo,
  onTermo,
  onBuscar,
}: {
  termo: string
  onTermo: (valor: string) => void
  onBuscar: (event: FormEvent) => void
}) {
  return (
    <form className="pdv-cad-filters" onSubmit={onBuscar}>
      <label>
        IMEI
        <input value={termo} onChange={(event) => onTermo(event.target.value)} autoComplete="off" />
      </label>
      <div className="pdv-cad-filters-go">
        <button className="pdv-cad-btn pdv-cad-btn-blue" type="submit">Buscar</button>
      </div>
    </form>
  )
}

export function BuscarImeiVenda() {
  const [termo, setTermo] = useState("")
  const [aviso, setAviso] = useState("")
  const [vendas, setVendas] = useState<VendaEncontrada[]>([])
  const [detail, setDetail] = useState<LojaPdvSale | null>(null)

  async function buscar(event: FormEvent) {
    event.preventDefault()
    setVendas([])
    setDetail(null)
    setAviso("")
    const imei = termo.trim()
    if (imei.length < 8) {
      setAviso("Digite pelo menos 8 caracteres do IMEI.")
      return
    }
    try {
      const { data } = await api.get("/clients/imei-rota", { params: { imei, escopo: "venda" } })
      const achadas = agruparVendas((data.events || []) as ImeiEvento[])
      if (!achadas.length) {
        setAviso("Nenhuma venda desta loja com esse IMEI.")
        return
      }
      const comVenda = await Promise.all(achadas.map(async (item) => {
        if (!item.saleId) return item
        try {
          const resposta = await api.get(`/clients/pdv-vendas/${item.saleId}`)
          const sale = resposta.data?.sale as LojaPdvSale | undefined
          if (!sale) return item
          return {
            ...item,
            sale,
            saleCode: sale.code || item.saleCode,
            customer: sale.customerName || item.customer,
            at: sale.finalizedAt || sale.createdAt || item.at,
          }
        } catch {
          return item
        }
      }))
      setVendas(comVenda)
    } catch (error) {
      setAviso(parseError(error).friend || "Não foi possível buscar esse IMEI.")
    }
  }

  function abrir(venda: VendaEncontrada) {
    if (venda.sale) setDetail(venda.sale)
  }

  return (
    <CadastroFrame>
      <section className="pdv-cad-page pdv-cli-page" aria-labelledby="pdv-imei-title">
        <div className="pdv-cad-sheet pdv-cad-sheet-wide">
          <h1 id="pdv-imei-title">BUSCAR IMEI</h1>
          <CampoBusca termo={termo} onTermo={setTermo} onBuscar={buscar} />
          {aviso ? <p className="pdv-compra-aviso">{aviso}</p> : null}
          {vendas.length ? (
            <div className="pdv-cad-table-wrap">
              <table className="pdv-cad-table">
                <thead>
                  <tr>
                    <th>Visualizar</th>
                    <th>Cod. Vendas</th>
                    <th>Cliente</th>
                    <th>IMEI</th>
                    <th>Produto</th>
                    <th>Data</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {vendas.map((venda) => (
                    <tr key={venda.saleId || venda.saleCode}>
                      <td className="pdv-cad-row-action">
                        {venda.sale ? (
                          <button
                            className="venda-lupa"
                            type="button"
                            aria-label={`Abrir venda ${venda.saleCode}`}
                            onClick={() => abrir(venda)}
                          >
                            <Search size={15} />
                          </button>
                        ) : null}
                      </td>
                      <td>{venda.saleCode || ""}</td>
                      <td>{venda.customer || venda.sale?.customerName || ""}</td>
                      <td>{venda.lines.map((linha) => linha.imei).filter(Boolean).join(", ")}</td>
                      <td>{venda.lines.map((linha) => linha.productName).filter(Boolean).join(", ")}</td>
                      <td>{when(venda.at)}</td>
                      <td>{venda.sale ? formatMoneyRs(venda.sale.total) : venda.lines[0]?.price ? formatMoneyRs(venda.lines[0].price) : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      </section>
      {detail ? <SaleDetailPanel sale={detail} onClose={() => setDetail(null)} /> : null}
    </CadastroFrame>
  )
}

export function BuscarImei({ escopo }: { escopo: Escopo }) {
  const [termo, setTermo] = useState("")
  const [aviso, setAviso] = useState("")
  const [eventos, setEventos] = useState<ImeiEvento[]>([])

  async function buscar(event: FormEvent) {
    event.preventDefault()
    setEventos([])
    setAviso("")
    const imei = termo.trim()
    if (imei.length < 4) {
      setAviso("Digite pelo menos 4 caracteres do IMEI.")
      return
    }
    try {
      const { data } = await api.get("/clients/imei-rota", { params: { imei, escopo } })
      const lista = (data.events || []) as ImeiEvento[]
      if (!lista.length) {
        setAviso("Nada encontrado para esse IMEI.")
        return
      }
      setEventos(lista)
    } catch (error) {
      setAviso(parseError(error).friend || "Não foi possível buscar esse IMEI.")
    }
  }

  return (
    <CadastroFrame>
      <section className="pdv-cad-page pdv-cli-page" aria-labelledby="pdv-imei-title">
        <div className="pdv-cad-sheet pdv-cad-sheet-wide">
          <h1 id="pdv-imei-title">BUSCAR IMEI</h1>
          <p className="pdv-compra-aviso">
            Só o que aconteceu nesta loja. Transferência ainda aberta, outra loja ou nota do backoffice não entram.
          </p>
          <CampoBusca termo={termo} onTermo={setTermo} onBuscar={buscar} />
          {aviso ? <p className="pdv-compra-aviso">{aviso}</p> : null}
          {eventos.length ? (
            <div className="pdv-cad-table-wrap">
              <table className="pdv-cad-table">
                <thead>
                  <tr>
                    <th>Quando</th>
                    <th>IMEI</th>
                    <th>O que aconteceu</th>
                    <th>De</th>
                    <th>Para</th>
                    <th>Produto</th>
                    <th>Doc.</th>
                    <th>Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {eventos.map((evento, index) => (
                    <tr key={`${evento.kind}-${evento.imei}-${evento.saleCode}-${index}`}>
                      <td>{when(evento.at)}</td>
                      <td>{evento.imei || ""}</td>
                      <td>{kindLabel(evento.kind || "")}</td>
                      <td>{evento.from || ""}</td>
                      <td>{evento.to || ""}</td>
                      <td>
                        {evento.productCode ? `${evento.productCode} · ` : ""}
                        {evento.productName || ""}
                      </td>
                      <td>{evento.saleCode || ""}</td>
                      <td>{evento.price ? formatMoneyRs(evento.price) : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      </section>
    </CadastroFrame>
  )
}

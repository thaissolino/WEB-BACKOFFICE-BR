import { FormEvent, useEffect, useMemo, useRef, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { CheckCircle2, Clock, Copy, Mail, Printer, RotateCcw, Search, Settings, Share2, Trash2, X } from "lucide-react"
import { useClientAuth } from "../../../hooks/clientAuth"
import { STORE_STORAGE_KEY } from "../dashboard/mockData"
import FilterPage, { type FilterPageProps } from "../pdv/FilterPage"
import { api, parseError } from "../../../services/api"
import { formatMoneyRs, produtoRotulo } from "../cadastros/produtos/types"
import { carregarTextosRecibo, destinatarioPorNome, ReciboNota, type ReciboDestinatario, type TextoImpressao } from "../pdv/ReciboNota"
import { emitenteDaLoja } from "../pdv/emitenteLoja"
import { ALL_SALE_FILTERS, EMPTY_SALE_FILTERS, filterLojaSales, filtroVendaAtivo, mesAtualSaleFilters, type SaleFilters } from "./lojaSalesFilters"
import { listCatalog } from "../cadastros/catalog/catalogApi"
import { categoryFromCatalog } from "../cadastros/produtos/categoryModel"
import { DatePreset } from "../cadastros/catalog/FormBits"
import PdvOverlayModal from "../dashboard/PdvOverlayModal"
import { AVISO_ESTORNAR_VENDA } from "../cadastros/usuarios/groupEvents"
import { usePodeEstornarVenda } from "../cadastros/usuarios/useVerCusto"

export type LojaPdvLine = {
  productId: string
  code: string
  name: string
  qty: number
  price: number
  discount: number
  serials?: string[]
  category?: string
}

export type LojaPdvPayment = {
  method: string
  amount: number
  parcelas?: number
  troca?: { code?: string; name?: string; imei?: string }
}

export type LojaPdvSale = {
  id: string
  code: string
  caixaCode: number
  caixaName: string
  status: "espera" | "finalizada" | "estornada"
  customerName: string
  sellerName: string
  notes?: string
  lojaNome?: string
  lines: LojaPdvLine[]
  payments: LojaPdvPayment[]
  total: number
  received: number
  changeAmount: number
  stockPosted: boolean
  createdAt: string
  finalizedAt: string | null
}

export async function listLojaSales(status?: "espera" | "finalizada" | "estornada") {
  const { data } = await api.get("/clients/pdv-vendas", {
    params: { ...(status ? { status } : {}), _t: Date.now() },
  })
  return (data.sales || []) as LojaPdvSale[]
}

async function listVendasGestao(status?: "espera" | "finalizada" | "estornada") {
  const { data } = await api.get("/backoffice/lojistas")
  const lojistas = (data.lojistas || []) as Array<{ id: string; name: string; stores?: Array<{ name?: string }> }>
  const listas = await Promise.all(lojistas.map(async (loja) => {
    try {
      const resposta = await api.get(`/backoffice/lojistas/${loja.id}/vendas`, {
        params: { status: status || "todas", _t: Date.now() },
      })
      const nome = loja.stores?.find((item) => item.name)?.name || loja.name
      return ((resposta.data.sales || []) as LojaPdvSale[]).map((sale) => ({ ...sale, lojaNome: nome }))
    } catch {
      return [] as LojaPdvSale[]
    }
  }))
  return listas.flat().sort((a, b) => {
    const da = new Date(a.finalizedAt || a.createdAt).getTime()
    const db = new Date(b.finalizedAt || b.createdAt).getTime()
    return db - da
  })
}

function when(value?: string | null) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  const dia = date.toLocaleDateString("pt-BR")
  const hora = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  return `${dia} ${hora}`
}

function payText(sale: LojaPdvSale) {
  if (!sale.payments.length) return "—"
  return sale.payments.map((pay) => {
    const label = pay.parcelas && pay.parcelas > 1 ? `${pay.method} ${pay.parcelas}x` : pay.method
    return `${label} ${formatMoneyRs(pay.amount)}`
  }).join(" · ")
}

export function SaleDetailPanel({ sale, onClose }: { sale: LojaPdvSale; emitente?: Emitente; onClose: () => void }) {
  const [cliente, setCliente] = useState<ReciboDestinatario>({ nome: sale.customerName || "Consumidor final" })

  useEffect(() => {
    let vivo = true
    destinatarioPorNome(sale.customerName || "").then((achou) => {
      if (vivo) setCliente(achou)
    })
    return () => {
      vivo = false
    }
  }, [sale.id, sale.customerName])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  const qtd = sale.lines.reduce((soma, line) => soma + line.qty, 0)
  const bruto = sale.lines.reduce((soma, line) => soma + line.qty * line.price, 0)
  const desconto = sale.lines.reduce((soma, line) => soma + Math.max(0, line.discount) * line.qty, 0)
  const cidade = [cliente.cidade, cliente.uf].filter(Boolean).join(" - ")

  return (
    <div className="pdv-caixa-confirm venda-popup-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) event.preventDefault() }}>
      <div
        className="pdv-caixa-confirm-card venda-popup"
        role="dialog"
        aria-modal="true"
        aria-labelledby="loja-venda-detail-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="venda-popup-head">
          <button className="venda-popup-ico" type="button" aria-label="Imprimir" onClick={() => window.print()}>
            <Printer size={16} />
          </button>
          <h2 id="loja-venda-detail-title">VENDA Nº {sale.code}</h2>
          <p>ABERTURA: {when(sale.createdAt)}</p>
          <p>ATUALIZOU: {when(sale.finalizedAt || sale.createdAt)}</p>
          <button className="venda-popup-ico" type="button" aria-label="Fechar" onClick={onClose}>
            <X size={16} />
          </button>
        </header>

        <section className="venda-popup-cliente">
          <p className="largo"><span>Nome</span><b>{cliente.nome || sale.customerName || ""}</b></p>
          <p><span>CPF</span><b>{cliente.documento || ""}</b></p>
          <p><span>RG</span><b></b></p>
          <p className="largo"><span>Endereço</span><b>{cliente.endereco || ""}</b></p>
          <p><span>CEP</span><b>{cliente.cep || ""}</b></p>
          <p className="venda-popup-vazio" aria-hidden="true" />
          <p className="largo"><span>Cidade</span><b>{cidade}</b></p>
          <p><span>Fone</span><b>{cliente.telefone || ""}</b></p>
          <p><span>E-mail</span><b>{cliente.email || ""}</b></p>
        </section>

        <div className="venda-popup-grade">
          <table className="venda-popup-itens">
            <thead>
              <tr>
                <th>Cód.</th>
                <th>Produto</th>
                <th>Vend.</th>
                <th className="num">Valor orig.</th>
                <th className="num">Valor unit.</th>
                <th className="num">Qtd</th>
                <th className="num">Valor</th>
                <th className="num">Desc.</th>
                <th className="num">Total</th>
              </tr>
            </thead>
            <tbody>
              {sale.lines.map((line, index) => {
                const unitario = Math.max(0, line.price - Math.max(0, line.discount))
                const brutoLinha = line.qty * line.price
                const descLinha = Math.max(0, line.discount) * line.qty
                const total = line.qty * unitario
                return (
                  <tr key={`${line.productId}-${index}`}>
                    <td className="cod">{line.code || ""}</td>
                    <td className="prod">{line.name}</td>
                    <td>{sale.sellerName || ""}</td>
                    <td className="num">{formatMoneyRs(line.price)}</td>
                    <td className="num">{formatMoneyRs(unitario)}</td>
                    <td className="num">{line.qty}</td>
                    <td className="num">{formatMoneyRs(brutoLinha)}</td>
                    <td className="num">{line.discount < 0 ? `+ ${formatMoneyRs(-line.discount)}` : formatMoneyRs(descLinha)}</td>
                    <td className="num">{formatMoneyRs(total)}</td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={5}>Total</td>
                <td className="num">{qtd}</td>
                <td className="num">{formatMoneyRs(bruto)}</td>
                <td className="num">{formatMoneyRs(desconto)}</td>
                <td className="num">{formatMoneyRs(sale.total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <section className="venda-popup-totais">
          <h3>TOTAIS</h3>
          <div>
            <p><span>Total sem desconto</span><strong>{formatMoneyRs(bruto)}</strong></p>
            <p><span>Total descontos</span><strong>{formatMoneyRs(desconto)}</strong></p>
            <p><span>Total outras despesas</span><strong>{formatMoneyRs(0)}</strong></p>
            <p><span>Total frete</span><strong>{formatMoneyRs(0)}</strong></p>
            <p><span>Total seguro</span><strong>{formatMoneyRs(0)}</strong></p>
            <p><span>Total itens</span><strong>{qtd}</strong></p>
            <p><span>Total desconto tabela de preço</span><strong>{formatMoneyRs(0)}</strong></p>
            <p className="venda-popup-grande"><span>Total da Venda</span><strong>{formatMoneyRs(sale.total)}</strong></p>
          </div>
          {sale.payments.length ? <p className="venda-popup-pag"><span>Pagamento</span><strong>{payText(sale)}</strong>{sale.changeAmount > 0 ? <span>Troco {formatMoneyRs(sale.changeAmount)}</span> : null}</p> : null}
        </section>
        {sale.notes?.trim() ? <p className="venda-popup-obs"><b>Observação.</b> {sale.notes}</p> : null}
      </div>
    </div>
  )
}

type Emitente = {
  name: string
  document: string
  phone: string
  address: string
  city: string
}

type GearAnchor = {
  top: number
  bottom: number
  right: number
  up: boolean
}

const EMITENTE_VAZIO: Emitente = { name: "", document: "", phone: "", address: "", city: "" }

export function gearAnchor(button: HTMLButtonElement | null): GearAnchor {
  const rect = button?.getBoundingClientRect()
  if (!rect) return { top: 80, bottom: 80, right: 16, up: false }
  const menuHeight = 228
  const up = rect.bottom + 8 + menuHeight > window.innerHeight && rect.top > menuHeight
  return {
    top: rect.bottom + 6,
    bottom: window.innerHeight - rect.top + 6,
    right: Math.max(8, window.innerWidth - rect.right),
    up,
  }
}

function textoDaVenda(sale: LojaPdvSale) {
  const itens = sale.lines.map((line) => {
    const total = line.qty * Math.max(0, line.price - line.discount)
    return `${line.qty}x ${produtoRotulo(line.code, line.name)}  ${formatMoneyRs(total)}`
  }).join("\n")
  const pags = sale.payments.map((pay) => {
    const label = pay.parcelas && pay.parcelas > 1 ? `${pay.method} ${pay.parcelas}x` : pay.method
    const troca = pay.troca ? `  ${pay.troca.code ? `Cód. ${pay.troca.code} ` : ""}${pay.troca.name || ""}${pay.troca.imei ? `  IMEI ${pay.troca.imei}` : ""}` : ""
    return `${label}  ${formatMoneyRs(pay.amount)}${troca}`
  }).join("\n")
  return [
    `Venda ${sale.code}`,
    `Cliente: ${sale.customerName}`,
    `Data: ${when(sale.finalizedAt || sale.createdAt)}`,
    sale.sellerName ? `Vendedor: ${sale.sellerName}` : null,
    "",
    "Itens",
    itens || "—",
    "",
    "Pagamento",
    pags || "—",
    "",
    `Total: ${formatMoneyRs(sale.total)}`,
    sale.notes?.trim() ? `Obs.: ${sale.notes.trim()}` : null,
  ].filter((line): line is string => line != null).join("\n")
}

function FolhaVenda({ sale, emitente, cupom, lines, destinatario, textos }: { sale: LojaPdvSale; emitente: Emitente; cupom: boolean; lines: LojaPdvLine[]; destinatario: ReciboDestinatario; textos: TextoImpressao[] }) {
  const data = when(sale.finalizedAt || sale.createdAt)
  const loja = emitente.name || "Loja"
  if (cupom) {
    return (
      <article className="nf-cupom-body">
        <strong>{loja}</strong>
        <p>Cupom {sale.code}</p>
        <p>{data}{sale.sellerName ? ` · ${sale.sellerName}` : ""}</p>
        <p>Cliente: {sale.customerName || "Consumidor final"}</p>
        <ul>
          {lines.map((line, index) => (
            <li key={`${line.productId}-${index}`}>
              <span>{line.qty}x {produtoRotulo(line.code, line.name)}</span>
              <span>{formatMoneyRs(line.qty * Math.max(0, line.price - line.discount))}</span>
            </li>
          ))}
        </ul>
        {sale.payments.map((pay, index) => (
          <p key={`${pay.method}-${index}`}>
            {pay.parcelas && pay.parcelas > 1 ? `${pay.method} ${pay.parcelas}x` : pay.method}
            {" "}
            {formatMoneyRs(pay.amount)}
            {pay.troca ? ` · ${[pay.troca.name, pay.troca.imei ? `IMEI ${pay.troca.imei}` : ""].filter(Boolean).join(" · ")}` : ""}
          </p>
        ))}
        <strong>Total {formatMoneyRs(sale.total)}</strong>
        {sale.changeAmount > 0 ? <p>Troco {formatMoneyRs(sale.changeAmount)}</p> : null}
        <em>Obrigado pela preferência.</em>
      </article>
    )
  }
  return (
    <ReciboNota
      codigo={sale.code}
      data={data}
      emitente={emitente}
      destinatario={destinatario}
      vendedor={sale.sellerName}
      notas={sale.notes || ""}
      lines={lines}
      payments={sale.payments}
      total={sale.total}
      received={sale.received}
      changeAmount={sale.changeAmount}
      textos={textos}
    />
  )
}

export function SaleActionsMenu({
  sale,
  anchor,
  emitente,
  emitentePronto,
  onClose,
  onNotice,
  onChanged,
}: {
  sale: LojaPdvSale
  anchor: GearAnchor
  emitente: Emitente
  emitentePronto: boolean
  onClose: () => void
  onNotice: (text: string) => void
  onChanged?: () => void
}) {
  const box = useRef<HTMLDivElement>(null)
  const gestao = useLocation().pathname.startsWith("/gestao")
  const podeEstornar = usePodeEstornarVenda()
  const [busy, setBusy] = useState(false)
  const [slip, setSlip] = useState<null | "a4" | "cupom">(null)
  const [destinatario, setDestinatario] = useState<ReciboDestinatario>({ nome: sale.customerName })
  const [textosNota, setTextosNota] = useState<TextoImpressao[]>([])
  const [linhasNota, setLinhasNota] = useState(sale.lines)
  const [emitenteNota, setEmitenteNota] = useState(emitente)
  const fecharRef = useRef(onClose)
  fecharRef.current = onClose

  async function abrirImpressao(kind: "a4" | "cupom") {
    const [linhas, loja] = await Promise.all([
      Promise.all(sale.lines.map(async (line) => {
        if (line.category?.trim()) return line
        try {
          const { data } = await api.get(`/clients/products/${line.productId}`)
          const category = String((data.product as { category?: string } | undefined)?.category || "")
          return category ? { ...line, category } : line
        } catch {
          return line
        }
      })),
      buscarEmitente("").catch(() => ({ emitente: emitentePronto ? emitente : EMITENTE_VAZIO, nome: emitente.name })),
    ])
    setLinhasNota(linhas)
    setEmitenteNota(loja.emitente.name ? loja.emitente : emitente)
    setDestinatario(await destinatarioPorNome(sale.customerName))
    setTextosNota(await carregarTextosRecibo().catch(() => []))
    setSlip(kind)
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  useEffect(() => {
    if (!slip) return
    const node = document.querySelector(".nf-print")
    if (!node) return
    const frame = document.createElement("iframe")
    frame.setAttribute("aria-hidden", "true")
    frame.style.cssText = "position:fixed;width:0;height:0;border:0;right:0;bottom:0"
    document.body.appendChild(frame)
    const doc = frame.contentDocument
    const win = frame.contentWindow
    if (!doc || !win) {
      frame.remove()
      return
    }
    const css = [...document.querySelectorAll("link[rel='stylesheet'], style")].map((el) => el.outerHTML).join("")
    const page = slip === "cupom"
      ? "@page { size: 80mm auto; margin: 0; } .nf-print { width: 72mm; }"
      : "@page { size: A4; margin: 0; } .nf-print { padding: 8mm; box-sizing: border-box; }"
    doc.open()
    doc.write(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><title></title>${css}<style>${page} html,body{margin:0;background:#fff;} .nf-print,.nf-print *{visibility:visible !important;} .nf-print{display:block !important;position:absolute;top:0;left:0;width:100%;height:auto;overflow:visible;color:#000;background:#fff;}</style></head><body>${node.outerHTML}</body></html>`)
    doc.close()
    const done = () => {
      frame.remove()
      setSlip(null)
      fecharRef.current()
    }
    win.addEventListener("afterprint", done)
    const timer = window.setTimeout(() => win.print(), 180)
    return () => {
      window.clearTimeout(timer)
      win.removeEventListener("afterprint", done)
      frame.remove()
    }
  }, [slip])

  async function duplicar() {
    setBusy(true)
    try {
      const { data } = await api.post("/clients/pdv-vendas", {
        caixaCode: sale.caixaCode,
        caixaName: sale.caixaName,
        status: "espera",
        customerName: sale.customerName,
        sellerName: sale.sellerName,
        notes: [sale.notes?.trim(), `Cópia da venda ${sale.code}`].filter(Boolean).join("\n"),
        lines: sale.lines.map((line) => ({
          productId: line.productId,
          code: line.code,
          name: line.name,
          qty: line.qty,
          price: line.price,
          discount: line.discount,
          serials: line.serials || [],
          category: line.category || "",
        })),
        payments: [],
      })
      const code = (data.sale as LojaPdvSale | undefined)?.code
      onNotice(code ? `Venda ${code} criada em aberto, cópia da ${sale.code}.` : "Venda copiada para vendas em aberto.")
      onClose()
    } catch (err) {
      onNotice(parseError(err).friend || "Não foi possível duplicar a venda.")
    } finally {
      setBusy(false)
    }
  }

  async function compartilhar() {
    const texto = textoDaVenda(sale)
    try {
      if (navigator.share) {
        await navigator.share({ title: `Venda ${sale.code}`, text: texto })
      } else {
        await navigator.clipboard.writeText(texto)
        onNotice("Resumo da venda copiado.")
      }
      onClose()
    } catch (err) {
      if ((err as Error).name === "AbortError") return
      try {
        await navigator.clipboard.writeText(texto)
        onNotice("Resumo da venda copiado.")
        onClose()
      } catch {
        onNotice("Não foi possível compartilhar a venda.")
      }
    }
  }

  async function estornar() {
    if (podeEstornar !== true) return
    if (!window.confirm(`Estornar a venda ${sale.code}? O estoque volta para a loja.`)) return
    setBusy(true)
    try {
      await api.delete(`/clients/pdv-vendas/${sale.id}`)
      onNotice(`Venda ${sale.code} estornada. O estoque voltou para a loja.`)
      onChanged?.()
      onClose()
    } catch (err) {
      onNotice(parseError(err).friend || AVISO_ESTORNAR_VENDA)
    } finally {
      setBusy(false)
    }
  }

  function email() {
    const subject = encodeURIComponent(`Venda ${sale.code}`)
    const body = encodeURIComponent(textoDaVenda(sale))
    window.location.href = `mailto:?subject=${subject}&body=${body}`
    onClose()
  }

  return (
    <>
      <button className="venda-gear-backdrop" type="button" aria-label="Fechar menu" onClick={onClose} />
      <div
        ref={box}
        className="venda-gear-menu"
        role="menu"
        aria-label={`Ações da venda ${sale.code}`}
        style={anchor.up ? { bottom: anchor.bottom, right: anchor.right } : { top: anchor.top, right: anchor.right }}
      >
        <button className="venda-gear-item" type="button" role="menuitem" onClick={() => void abrirImpressao("cupom")}>
          <Printer size={15} /> Imprimir(Cupom)
        </button>
        <button className="venda-gear-item" type="button" role="menuitem" onClick={() => void abrirImpressao("a4")}>
          <Printer size={15} /> Imprimir(A4)
        </button>
        <button className="venda-gear-item" type="button" role="menuitem" disabled={busy} onClick={() => void duplicar()}>
          <Copy size={15} /> Duplicar Venda
        </button>
        {!gestao && sale.status === "finalizada" ? (
          <span className="venda-gear-tip">
            <button className="venda-gear-item" type="button" role="menuitem" disabled={busy} onClick={() => void estornar()}>
              <RotateCcw size={15} /> Estornar
            </button>
            {podeEstornar === false ? <span className="venda-gear-tip-box" role="tooltip">{AVISO_ESTORNAR_VENDA}</span> : null}
          </span>
        ) : null}
        <button className="venda-gear-item" type="button" role="menuitem" onClick={() => void compartilhar()}>
          <Share2 size={15} /> Compartilhar
        </button>
        <button className="venda-gear-item" type="button" role="menuitem" onClick={email}>
          <Mail size={15} /> Enviar e-mail
        </button>
      </div>
      {slip ? (
        <div className={`cx-print nf-print${slip === "cupom" ? " nf-cupom" : ""}`} aria-hidden="true">
          <FolhaVenda sale={sale} emitente={emitenteNota.name ? emitenteNota : emitente} cupom={slip === "cupom"} lines={linhasNota} destinatario={destinatario} textos={textosNota} />
        </div>
      ) : null}
    </>
  )
}

function SaleFilterBar({
  draft,
  onDraft,
  onApply,
  onClear,
  comVendedor = false,
}: {
  draft: SaleFilters
  onDraft: (next: SaleFilters) => void
  onApply: (next: SaleFilters) => void
  onClear: () => void
  comVendedor?: boolean
}) {
  function escolherPeriodo(inicio: string, fim: string) {
    onDraft({ ...draft, inicio, fim })
  }

  function aplicar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const next = {
      ...draft,
      inicio: String(data.get("inicio") || ""),
      fim: String(data.get("fim") || ""),
      cod: String(data.get("cod") || ""),
      nome: String(data.get("nome") || ""),
      vendedor: comVendedor ? String(data.get("vendedor") || "") : draft.vendedor || "",
    }
    onDraft(next)
    onApply(next)
  }

  return (
    <form className="pdv-cad-filters pdv-cad-filters-vendas" onSubmit={aplicar}>
      <label>
        Data início
        <span className="pdv-date-field">
          <input name="inicio" type="date" value={draft.inicio} onChange={(event) => onDraft({ ...draft, inicio: event.target.value })} />
          <DatePreset onPick={escolherPeriodo} />
        </span>
      </label>
      <label>
        Data fim
        <span className="pdv-date-field">
          <input name="fim" type="date" value={draft.fim} onChange={(event) => onDraft({ ...draft, fim: event.target.value })} />
          <DatePreset onPick={escolherPeriodo} />
        </span>
      </label>
      <label>
        Cod. venda
        <input name="cod" value={draft.cod} onChange={(event) => onDraft({ ...draft, cod: event.target.value })} autoComplete="off" />
      </label>
      <label>
        Cliente
        <input name="nome" value={draft.nome} onChange={(event) => onDraft({ ...draft, nome: event.target.value })} autoComplete="off" />
      </label>
      {comVendedor ? (
        <label>
          Usuário
          <input name="vendedor" value={draft.vendedor || ""} onChange={(event) => onDraft({ ...draft, vendedor: event.target.value })} autoComplete="off" />
        </label>
      ) : null}
      <div className="pdv-cad-filters-go">
        <button className="pdv-cad-btn" type="button" onClick={onClear}>Limpar</button>
        <button className="pdv-cad-btn pdv-cad-btn-blue" type="submit">Buscar</button>
      </div>
    </form>
  )
}

function idLojaSalvo() {
  if (typeof sessionStorage === "undefined") return ""
  return sessionStorage.getItem(STORE_STORAGE_KEY) || ""
}

async function buscarEmitente(fallbackName: string) {
  let id = idLojaSalvo()
  let nome = fallbackName
  if (!id) {
    const { data } = await api.get("/clients/stores")
    const rows = (data.stores || []) as Array<{ id: string; name: string }>
    const atual = rows.find((item) => item.name === fallbackName) || rows[0]
    id = atual?.id || ""
    nome = atual?.name || nome
  }
  if (!id) return { emitente: EMITENTE_VAZIO, nome: nome || "Loja" }
  const loja = await api.get(`/clients/stores/${id}/loja`)
  const emitente = emitenteDaLoja(loja.data.store)
  return { emitente, nome: emitente.name || nome || "Loja" }
}

function useEmitenteLoja(fallbackName: string) {
  const [lojaNome, setLojaNome] = useState("")
  const [emitente, setEmitente] = useState<Emitente>(EMITENTE_VAZIO)
  const [emitentePronto, setEmitentePronto] = useState(false)

  useEffect(() => {
    let vivo = true
    function carregar() {
      buscarEmitente(fallbackName)
        .then((achado) => {
          if (!vivo) return
          setLojaNome(achado.nome)
          setEmitente(achado.emitente)
          setEmitentePronto(true)
        })
        .catch(() => {
          if (!vivo) return
          setLojaNome(fallbackName || "Loja")
          setEmitentePronto(true)
        })
    }
    carregar()
    const timer = window.setTimeout(carregar, 400)
    return () => {
      vivo = false
      window.clearTimeout(timer)
    }
  }, [fallbackName])

  return { lojaNome, emitente, emitentePronto }
}

function rotuloStatus(status: LojaPdvSale["status"]) {
  if (status === "espera") return "Em aberto"
  if (status === "estornada") return "Estornada"
  return "Concluída"
}

type VendaTotais = { abertas: number; concluidas: number; estornadas: number }

type VendaPainelCache = {
  totais: VendaTotais
  listas: Partial<Record<LojaPdvSale["status"] | "todas", LojaPdvSale[]>>
}

const vendaPainelCaches = new Map<string, VendaPainelCache>()

function contarVendas(rows: LojaPdvSale[]): VendaTotais {
  return {
    abertas: rows.filter((sale) => sale.status === "espera").length,
    concluidas: rows.filter((sale) => sale.status === "finalizada").length,
    estornadas: rows.filter((sale) => sale.status === "estornada").length,
  }
}

function vendaPainelCache(chave: string) {
  let atual = vendaPainelCaches.get(chave)
  if (!atual) {
    atual = { totais: { abertas: 0, concluidas: 0, estornadas: 0 }, listas: {} }
    vendaPainelCaches.set(chave, atual)
  }
  return atual
}

function guardarVendas(cache: VendaPainelCache, rows: LojaPdvSale[]) {
  cache.listas.todas = rows
  cache.listas.espera = rows.filter((sale) => sale.status === "espera")
  cache.listas.finalizada = rows.filter((sale) => sale.status === "finalizada")
  cache.listas.estornada = rows.filter((sale) => sale.status === "estornada")
  cache.totais = contarVendas(rows)
}

export function VendasMovimento({ status }: { status: "espera" | "finalizada" | "estornada" | "todas" }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const gestao = pathname.startsWith("/gestao")
  const podeEstornar = usePodeEstornarVenda()
  const { client } = useClientAuth()
  const { lojaNome, emitente, emitentePronto } = useEmitenteLoja(client?.name || "")
  const cacheChave = gestao ? "gestao" : (sessionStorage.getItem(STORE_STORAGE_KEY) || "loja")
  const cache = vendaPainelCache(cacheChave)
  const [sales, setSales] = useState<LojaPdvSale[]>(() => cache.listas[status] || [])
  const [detail, setDetail] = useState<LojaPdvSale | null>(null)
  const [actions, setActions] = useState<{ sale: LojaPdvSale; anchor: GearAnchor } | null>(null)
  const [aviso, setAviso] = useState("")
  const [hint, setHint] = useState("")
  const filtrosIniciais = status === "finalizada" ? mesAtualSaleFilters() : ALL_SALE_FILTERS
  const [draft, setDraft] = useState<SaleFilters>(filtrosIniciais)
  const [filters, setFilters] = useState<SaleFilters>(filtrosIniciais)
  const [marcadas, setMarcadas] = useState<string[]>([])
  const [pedirExcluir, setPedirExcluir] = useState(false)
  const [excluindo, setExcluindo] = useState(false)
  const [erroExcluir, setErroExcluir] = useState("")
  const todas = status === "todas"
  const concluida = status !== "espera"
  const titulo = todas ? "VENDAS" : status === "espera" ? "VENDAS ABERTAS" : status === "estornada" ? "VENDAS ESTORNADAS" : "VENDAS CONCLUÍDAS"
  const vazio = todas ? "Nenhuma venda." : status === "espera" ? "Nenhuma venda em aberto." : status === "estornada" ? "Nenhuma venda estornada." : "Nenhuma venda concluída."
  const statusLabel = status === "espera" ? "Em aberto" : status === "estornada" ? "Estornada" : "Concluída"
  const [totais, setTotais] = useState<VendaTotais>(() => cache.totais)
  const abertas = sales.filter((sale) => sale.status === "espera").length
  const concluidas = sales.filter((sale) => sale.status === "finalizada").length
  const estornadas = sales.filter((sale) => sale.status === "estornada").length
  const numeros = todas ? { abertas, concluidas, estornadas } : totais
  const faixaCard = status === "espera" ? "abertas" : status === "finalizada" ? "concluidas" : status === "estornada" ? "estornadas" : ""
  const raizVendas = gestao ? "/gestao/movimentacoes/vendas" : "/client/movimentacoes/vendas"

  function recarregar() {
    const pedido = gestao ? listVendasGestao(todas ? undefined : status) : listLojaSales(todas ? undefined : status)
    const contagem = todas ? null : (gestao ? listVendasGestao() : listLojaSales())
    pedido
      .then((rows) => {
        if (todas) guardarVendas(cache, rows)
        else cache.listas[status] = rows
        setSales(rows)
        setHint(rows.length ? "" : vazio)
      })
      .catch((err) => setHint(parseError(err).friend || "Não foi possível carregar as vendas."))
    contagem?.then((rows) => {
      guardarVendas(cache, rows)
      setTotais(cache.totais)
    }).catch(() => undefined)
  }

  useEffect(() => {
    recarregar()
  }, [status, gestao])

  const visible = useMemo(() => filterLojaSales(sales, filters), [sales, filters])
  const podeMarcar = !gestao && status === "finalizada" && podeEstornar === true
  const idsVisiveis = visible.map((sale) => sale.id)
  const todasMarcadas = idsVisiveis.length > 0 && idsVisiveis.every((id) => marcadas.includes(id))
  const filtroAtivo = filtroVendaAtivo(filters)

  function alternarMarca(id: string) {
    setMarcadas((atual) => atual.includes(id) ? atual.filter((item) => item !== id) : [...atual, id])
  }

  function alternarTodas() {
    setMarcadas((atual) => todasMarcadas
      ? atual.filter((id) => !idsVisiveis.includes(id))
      : [...new Set([...atual, ...idsVisiveis])])
  }

  async function excluirMarcadas() {
    if (excluindo || !marcadas.length) return
    setExcluindo(true)
    setErroExcluir("")
    const ok: string[] = []
    let falha = ""
    for (const id of marcadas) {
      try {
        await api.delete(`/clients/pdv-vendas/${id}`)
        ok.push(id)
      } catch (err) {
        falha = parseError(err).friend || "Não foi possível excluir."
        break
      }
    }
    if (ok.length) {
      setSales((atual) => atual.filter((sale) => !ok.includes(sale.id)))
      setMarcadas((atual) => atual.filter((id) => !ok.includes(id)))
      setDetail((atual) => (atual && ok.includes(atual.id) ? null : atual))
      setTotais((atual) => {
        const next = {
          ...atual,
          concluidas: Math.max(0, atual.concluidas - ok.length),
          estornadas: atual.estornadas + ok.length,
        }
        cache.totais = next
        if (cache.listas.finalizada) cache.listas.finalizada = cache.listas.finalizada.filter((sale) => !ok.includes(sale.id))
        return next
      })
    }
    if (falha) setErroExcluir(falha)
    else {
      setPedirExcluir(false)
      setAviso(ok.length === 1 ? "Venda estornada. O estoque voltou para a loja." : `${ok.length} vendas estornadas. O estoque voltou para a loja.`)
    }
    setExcluindo(false)
  }

  useEffect(() => {
    if (!aviso) return
    const timer = window.setTimeout(() => setAviso(""), 5000)
    return () => window.clearTimeout(timer)
  }, [aviso])

  return (
    <div className="pdv-venda-round">
      <FilterPage
        title={titulo}
        pageClass="pdv-cli-page"
        fields={[]}
        actions={podeMarcar && marcadas.length ? [{
          label: `Excluir marcados (${marcadas.length})`,
          tone: "red",
          onClick: () => {
            setErroExcluir("")
            setPedirExcluir(true)
          },
        }] : undefined}
        lead={(
          <div className="pdv-compra-cards pdv-compra-cards-3">
            <button type="button" className={`pdv-compra-card pdv-compra-card-abertas${faixaCard === "abertas" ? " is-on" : ""}`} onClick={() => navigate(`${raizVendas}/abertas`)}>
              <Clock size={22} strokeWidth={2.4} aria-hidden="true" />
              <span>Abertas</span>
              <strong>{numeros.abertas}</strong>
            </button>
            <button type="button" className={`pdv-compra-card pdv-compra-card-concluidas${faixaCard === "concluidas" ? " is-on" : ""}`} onClick={() => navigate(`${raizVendas}/concluidas`)}>
              <CheckCircle2 size={22} strokeWidth={2.4} aria-hidden="true" />
              <span>Concluídas</span>
              <strong>{numeros.concluidas}</strong>
            </button>
            <button type="button" className={`pdv-compra-card pdv-compra-card-estornadas${faixaCard === "estornadas" ? " is-on" : ""}`} onClick={() => navigate(`${raizVendas}/estornadas`)}>
              <RotateCcw size={22} strokeWidth={2.4} aria-hidden="true" />
              <span>Estornadas</span>
              <strong>{numeros.estornadas}</strong>
            </button>
          </div>
        )}
        extra={(
          <>
            {aviso ? <p className="venda-gear-aviso">{aviso}</p> : null}
            <SaleFilterBar
            draft={draft}
            onDraft={setDraft}
            onApply={(next) => { setFilters(next); recarregar() }}
            onClear={() => {
              const limpo = status === "finalizada" ? mesAtualSaleFilters() : ALL_SALE_FILTERS
              setDraft(limpo)
              setFilters(limpo)
              recarregar()
            }}
          />
          </>
        )}
        columns={concluida
          ? ["Cod. Vendas", "Loja", "Caixa", "Identificação", "Cliente", "Usuário", "Data Abertura", "Data Conclusão", "Total", "Frete", "Status"]
          : ["Código", "Caixa", "Cliente", "Vendedor", "Abertura", "Conclusão", "Total", "Pagamento", "Status"]}
        rows={visible.map((sale) => concluida ? [
          sale.code,
          sale.lojaNome || lojaNome || "—",
          sale.caixaName || "—",
          sale.sellerName || sale.caixaName || "—",
          sale.customerName,
          sale.sellerName || "—",
          when(sale.createdAt),
          when(sale.finalizedAt),
          formatMoneyRs(sale.total),
          "—",
          todas ? rotuloStatus(sale.status) : statusLabel,
        ] : [
          sale.code,
          sale.caixaName || "—",
          sale.customerName,
          sale.sellerName || "—",
          when(sale.createdAt),
          when(sale.finalizedAt),
          formatMoneyRs(sale.total),
          payText(sale),
          "Em aberto",
        ])}
        hint={visible.length
          ? (filtroAtivo ? `${visible.length} ${visible.length === 1 ? "venda neste filtro." : "vendas neste filtro."}` : hint || undefined)
          : filtroAtivo ? "Nenhuma venda para o filtro atual." : hint || vazio}
        markAll={podeMarcar ? (
          <input type="checkbox" aria-label="Marcar todas" checked={todasMarcadas} onChange={alternarTodas} />
        ) : undefined}
        rowMark={podeMarcar ? (index) => {
          const sale = visible[index]
          if (!sale) return null
          return (
            <input
              type="checkbox"
              aria-label={`Marcar venda ${sale.code}`}
              checked={marcadas.includes(sale.id)}
              onClick={(event) => event.stopPropagation()}
              onChange={() => alternarMarca(sale.id)}
            />
          )
        } : undefined}
        rowLead={concluida ? (index) => (
          <button
            className="venda-lupa"
            type="button"
            aria-label={`Abrir venda ${visible[index]?.code || ""}`}
            onClick={() => setDetail(visible[index])}
          >
            <Search size={15} />
          </button>
        ) : undefined}
        rowLeadLabel={concluida ? "Visualizar" : undefined}
        onRowClick={concluida ? undefined : (index) => setDetail(visible[index])}
        closedLabel={concluida ? "Gerenciar" : undefined}
        closedAction={(index) => (
          <button
            className="pdv-cad-icon-btn"
            type="button"
            aria-label={`Ações da venda ${visible[index]?.code || ""}`}
            onClick={(event) => {
              event.stopPropagation()
              const sale = visible[index]
              if (!sale) return
              const anchor = gearAnchor(event.currentTarget)
              setActions((current) => (current?.sale.id === sale.id ? null : { sale, anchor }))
            }}
          >
            <Settings size={16} aria-hidden="true" />
          </button>
        )}
      />
      <PdvOverlayModal
        open={pedirExcluir}
        title="Excluir vendas"
        size="form"
        icon={<Trash2 size={18} strokeWidth={2.2} />}
        onClose={() => {
          if (excluindo) return
          setPedirExcluir(false)
          setErroExcluir("")
        }}
        footer={
          <>
            {erroExcluir ? <p className="pdv-logo-msg" role="alert">{erroExcluir}</p> : null}
            <div className="pdv-modal-actions">
              <button className="pdv-cad-btn" type="button" disabled={excluindo} onClick={() => { setPedirExcluir(false); setErroExcluir("") }}>
                Cancelar
              </button>
              <button className="pdv-cad-btn pdv-cad-btn-red" type="button" disabled={excluindo} onClick={() => void excluirMarcadas()}>
                {excluindo ? "Excluindo..." : "Excluir"}
              </button>
            </div>
          </>
        }
      >
        <p>
          {marcadas.length === 1
            ? "Excluir a venda marcada? O estoque dos produtos volta para a loja."
            : `Excluir ${marcadas.length} vendas marcadas? O estoque dos produtos volta para a loja.`}
        </p>
      </PdvOverlayModal>
      {detail ? <SaleDetailPanel sale={detail} emitente={emitente} onClose={() => setDetail(null)} /> : null}
      {actions ? (
        <SaleActionsMenu
          sale={actions.sale}
          anchor={actions.anchor}
          emitente={emitente}
          emitentePronto={emitentePronto}
          onClose={() => setActions(null)}
          onNotice={setAviso}
          onChanged={recarregar}
        />
      ) : null}
    </div>
  )
}

function percentualComissao(value: string) {
  const clean = value.trim().replace("%", "").replace(/\s/g, "")
  if (!clean) return 0
  const number = Number(clean.includes(",") ? clean.replace(/\./g, "").replace(",", ".") : clean)
  return Number.isFinite(number) ? number : 0
}

function comissaoDaVenda(sale: LojaPdvSale, taxas: Map<string, number>) {
  return sale.lines.reduce((sum, line) => {
    const base = line.qty * Math.max(0, line.price - line.discount)
    const taxa = taxas.get((line.category || "").trim().toLowerCase()) || 0
    return sum + (base * taxa) / 100
  }, 0)
}

function reportView(path: string, sales: LojaPdvSale[], taxas: Map<string, number> = new Map()) {
  if (path.endsWith("forma-pagamento")) {
    const map = new Map<string, { count: number; total: number }>()
    sales.forEach((sale) => {
      sale.payments.forEach((pay) => {
        const row = map.get(pay.method) || { count: 0, total: 0 }
        row.count += 1
        row.total += pay.amount
        map.set(pay.method, row)
      })
    })
    return {
      columns: ["Forma", "Quantidade", "Total"],
      rows: [...map.entries()].map(([method, row]) => [method, String(row.count), formatMoneyRs(row.total)]),
      linked: false,
    }
  }
  if (path.endsWith("/itens")) {
    return {
      columns: ["Venda", "Produto", "Qtd", "Total"],
      rows: sales.flatMap((sale) => sale.lines.map((line) => [
        sale.code,
        produtoRotulo(line.code, line.name),
        String(line.qty),
        formatMoneyRs(line.qty * Math.max(0, line.price - line.discount)),
      ])),
      linked: true,
    }
  }
  if (path.endsWith("produto-mais-vendido") || path.endsWith("/giro") || path.endsWith("giro-grade")) {
    const map = new Map<string, { qty: number; total: number }>()
    sales.forEach((sale) => {
      sale.lines.forEach((line) => {
        const rotulo = produtoRotulo(line.code, line.name)
        const row = map.get(rotulo) || { qty: 0, total: 0 }
        row.qty += line.qty
        row.total += line.qty * Math.max(0, line.price - line.discount)
        map.set(rotulo, row)
      })
    })
    return {
      columns: ["Produto", "Quantidade", "Total"],
      rows: [...map.entries()]
        .sort((a, b) => b[1].qty - a[1].qty)
        .map(([name, row]) => [name, String(row.qty), formatMoneyRs(row.total)]),
      linked: false,
    }
  }
  if (path.endsWith("comissao")) {
    return {
      columns: ["Usuário", "Venda", "Total", "Comissão"],
      rows: sales.map((sale) => [
        sale.sellerName || "Sem vendedor",
        sale.code,
        formatMoneyRs(sale.total),
        formatMoneyRs(comissaoDaVenda(sale, taxas)),
      ]),
      linked: true,
    }
  }
  if (path.endsWith("vendedores-mes")) {
    const map = new Map<string, number>()
    sales.forEach((sale) => {
      const key = sale.sellerName || "Sem vendedor"
      map.set(key, (map.get(key) || 0) + sale.total)
    })
    return {
      columns: ["Vendedor", "Total"],
      rows: [...map.entries()].map(([name, total]) => [name, formatMoneyRs(total)]),
      linked: false,
    }
  }
  if (path.endsWith("cliente-mes") || path.endsWith("cliente-loja")) {
    const map = new Map<string, number>()
    sales.forEach((sale) => map.set(sale.customerName, (map.get(sale.customerName) || 0) + sale.total))
    return {
      columns: ["Cliente", "Total"],
      rows: [...map.entries()].map(([name, total]) => [name, formatMoneyRs(total)]),
      linked: false,
    }
  }
  if (path.includes("faturamento")) {
    const total = sales.reduce((sum, sale) => sum + sale.total, 0)
    return {
      columns: ["Período", "Total"],
      rows: [["Vendas da loja", formatMoneyRs(total)]],
      linked: false,
    }
  }
  if (path.endsWith("descontos")) {
    return {
      columns: ["Venda", "Produto", "Desconto"],
      rows: sales.flatMap((sale) => sale.lines
        .filter((line) => line.discount > 0)
        .map((line) => [sale.code, produtoRotulo(line.code, line.name), formatMoneyRs(line.discount)])),
      linked: true,
    }
  }
  return {
    columns: ["Venda", "Cliente", "Caixa", "Vendedor", "Total", "Pagamento"],
    rows: sales.map((sale) => [
      sale.code,
      sale.customerName,
      sale.caixaName || "—",
      sale.sellerName || "—",
      formatMoneyRs(sale.total),
      payText(sale),
    ]),
    linked: true,
  }
}

export function VendasRelatorio({ def }: { def: FilterPageProps & { path: string } }) {
  const gestao = useLocation().pathname.startsWith("/gestao")
  const comissao = def.path.endsWith("comissao")
  const { emitente, emitentePronto } = useEmitenteLoja("")
  const [sales, setSales] = useState<LojaPdvSale[]>([])
  const [pronto, setPronto] = useState(false)
  const [detail, setDetail] = useState<LojaPdvSale | null>(null)
  const [actions, setActions] = useState<{ sale: LojaPdvSale; anchor: GearAnchor } | null>(null)
  const [aviso, setAviso] = useState("")
  const [erro, setErro] = useState("")
  const [taxas, setTaxas] = useState<Map<string, number>>(() => new Map())
  const filtrosIniciais = () => (comissao ? mesAtualSaleFilters() : EMPTY_SALE_FILTERS)
  const [draft, setDraft] = useState<SaleFilters>(filtrosIniciais)
  const [filters, setFilters] = useState<SaleFilters>(filtrosIniciais)

  function carregar() {
    const pedido = gestao ? listVendasGestao("finalizada") : listLojaSales("finalizada")
    pedido
      .then((list) => {
        setSales(list)
        setErro("")
        setPronto(true)
      })
      .catch((err) => {
        setErro(parseError(err).friend || "Não foi possível carregar o relatório.")
        setPronto(true)
      })
  }

  useEffect(() => {
    carregar()
  }, [def.path, gestao])

  useEffect(() => {
    if (!comissao) return
    let vivo = true
    listCatalog("product_category")
      .then((items) => {
        if (!vivo) return
        const map = new Map<string, number>()
        for (const item of items) {
          const categoria = categoryFromCatalog(item)
          const nome = categoria.name.trim().toLowerCase()
          if (nome) map.set(nome, percentualComissao(categoria.commission))
        }
        setTaxas(map)
      })
      .catch(() => undefined)
    return () => {
      vivo = false
    }
  }, [comissao])

  const filtered = useMemo(() => filterLojaSales(sales, filters), [sales, filters])
  const view = useMemo(() => reportView(def.path, filtered, taxas), [def.path, filtered, taxas])
  const saleByCode = useMemo(() => new Map(filtered.map((sale) => [sale.code, sale])), [filtered])

  function vendaDaLinha(index: number) {
    const colunas = view.columns.map((coluna) => coluna.normalize("NFD").replace(/\p{M}/gu, "").trim().toLowerCase())
    const coluna = colunas.indexOf("venda")
    const code = view.rows[index]?.[coluna >= 0 ? coluna : 0]
    return code ? saleByCode.get(code) : undefined
  }

  useEffect(() => {
    if (!aviso) return
    const timer = window.setTimeout(() => setAviso(""), 5000)
    return () => window.clearTimeout(timer)
  }, [aviso])

  return (
    <>
      <FilterPage
        {...def}
        pageClass={comissao ? "pdv-cli-page" : ""}
        fields={[]}
        extra={(
          <>
            {aviso ? <p className="venda-gear-aviso">{aviso}</p> : null}
            <SaleFilterBar
            draft={draft}
            onDraft={setDraft}
            comVendedor={comissao}
            onApply={(next) => { setFilters(next); carregar() }}
            onClear={() => {
              const limpo = comissao ? mesAtualSaleFilters() : EMPTY_SALE_FILTERS
              setDraft(limpo)
              setFilters(limpo)
              carregar()
            }}
          />
          </>
        )}
        columns={view.columns}
        rows={view.rows}
        hint={view.rows.length ? undefined : erro || (pronto ? (comissao ? "Nenhuma comissão para o filtro atual." : "Nenhuma venda para o filtro atual.") : " ")}
        saleLink={view.linked ? (index) => {
          const sale = vendaDaLinha(index)
          if (sale) setDetail(sale)
        } : undefined}
        closedAction={view.linked ? (index) => {
          const sale = vendaDaLinha(index)
          if (!sale) return null
          return (
            <button
              className="pdv-cad-icon-btn"
              type="button"
              aria-label={`Ações da venda ${sale.code}`}
              onClick={(event) => {
                event.stopPropagation()
                const anchor = gearAnchor(event.currentTarget)
                setActions((current) => (current?.sale.id === sale.id ? null : { sale, anchor }))
              }}
            >
              <Settings size={16} aria-hidden="true" />
            </button>
          )
        } : undefined}
      />
      {detail ? <SaleDetailPanel sale={detail} emitente={emitente} onClose={() => setDetail(null)} /> : null}
      {actions ? (
        <SaleActionsMenu
          sale={actions.sale}
          anchor={actions.anchor}
          emitente={emitente}
          emitentePronto={emitentePronto}
          onClose={() => setActions(null)}
          onNotice={setAviso}
          onChanged={carregar}
        />
      ) : null}
    </>
  )
}

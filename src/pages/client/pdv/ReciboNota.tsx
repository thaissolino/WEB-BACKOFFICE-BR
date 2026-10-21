import { api } from "../../../services/api"
import { formatMoneyRs } from "../cadastros/produtos/types"

export type ReciboEmitente = {
  name: string
  document: string
  phone: string
  address: string
  city: string
}

export type ReciboDestinatario = {
  nome: string
  telefone?: string
  documento?: string
  email?: string
  endereco?: string
  cep?: string
  cidade?: string
  uf?: string
}

export type ReciboLinha = {
  code?: string
  name: string
  qty: number
  price: number
  discount: number
  serials?: string[]
  category?: string
}

export type ReciboPagamento = {
  method: string
  amount: number
  parcelas?: number
  detalhe?: string
  troca?: { code?: string; name?: string; imei?: string }
}

function docMascara(raw: string) {
  const digitos = raw.replace(/\D/g, "")
  if (digitos.length === 11) return digitos.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
  if (digitos.length === 14) return digitos.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5")
  return raw.trim()
}

function texto(value?: string) {
  const limpo = (value || "").trim()
  return limpo && limpo !== "—" ? limpo : ""
}

export async function destinatarioPorNome(nome: string): Promise<ReciboDestinatario> {
  const base: ReciboDestinatario = { nome: nome || "Consumidor final" }
  const termo = nome.trim()
  if (!termo || termo.toLocaleUpperCase("pt-BR") === "CONSUMIDOR FINAL") return base
  try {
    const { data } = await api.get("/clients/customers", { params: { search: termo } })
    const lista = (data.customers || []) as Array<Record<string, string>>
    const alvo = termo.toLocaleUpperCase("pt-BR")
    const achou = lista.find((item) => (item.name || "").trim().toLocaleUpperCase("pt-BR") === alvo)
    if (!achou) return base
    const rua = [achou.address, achou.number].map((parte) => texto(parte)).filter(Boolean).join(", ")
    const extra = [achou.neighborhood, achou.complement].map((parte) => texto(parte)).filter(Boolean).join(" · ")
    return {
      nome: texto(achou.name) || base.nome,
      documento: texto(achou.document),
      telefone: texto(achou.phone),
      email: texto(achou.email),
      endereco: [rua, extra].filter(Boolean).join(" — "),
      cep: texto(achou.cep),
      cidade: texto(achou.city),
      uf: texto(achou.state),
    }
  } catch {
    return base
  }
}

function detalheTroca(pay: ReciboPagamento) {
  if (!pay.troca) return ""
  return {
    code: texto(pay.troca.code),
    name: texto(pay.troca.name),
    imei: texto(pay.troca.imei),
  }
}

function rotuloDocumento(raw: string) {
  const digitos = raw.replace(/\D/g, "").length
  if (digitos === 11) return "CPF"
  if (digitos === 14) return "CNPJ"
  return "CPF/CNPJ"
}

function Campo({ label, value, largo }: { label: string; value?: string; largo?: boolean }) {
  return (
    <div className={largo ? "nf-campo nf-campo-largo" : "nf-campo"}>
      <span>{label}</span>
      <strong>{texto(value) || "\u00a0"}</strong>
    </div>
  )
}

function semAcento(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
}

function casa(texto: string, padrao: RegExp) {
  return padrao.test(semAcento(texto))
}

export function condicaoDoItem(category?: string, name?: string): "seminovo" | "novo" | "" {
  const categoria = category || ""
  if (casa(categoria, /\bseminovos?\b|\busados?\b|\brecondicionad/)) return "seminovo"
  if (casa(categoria, /\bnovos?\b|\blacrados?\b/)) return "novo"
  const produto = name || ""
  if (casa(produto, /\bseminovos?\b|\busados?\b|\brecondicionad/)) return "seminovo"
  if (casa(produto, /\bnovos?\b|\blacrados?\b/)) return "novo"
  return ""
}

const EXCLUSOES = "não sejam observadas as recomendações de uso e conservação do manual do fabricante; o defeito decorra de negligência, imperícia ou mau uso do comprador; o produto seja examinado, alterado ou reparado por terceiro sem autorização da vendedora; haja remoção ou alteração do número de série ou de componente interno; o lacre ou selo seja violado, quando houver; seja utilizada peça ou componente não original nem homologado; o sistema operacional original seja alterado; haja dano físico ou químico interno ou externo decorrente de queda, choque, líquido, oxidação, variação de tensão elétrica, calor excessivo, pressão sobre a tela ou agente da natureza; o defeito seja causado por equipamento a ele conectado; haja desgaste natural pelo tempo de uso; ou haja dano estético, inclusive arranhão, amassado ou rachadura."

function ordinal(n: number) {
  return `${n}ª`
}

function termoSeminovo(loja: string) {
  return [
    {
      titulo: "Do objeto",
      itens: [
        `Cláusula ${ordinal(1)}: O comprador adquire o produto seminovo descrito neste recibo, no estado em que se encontra, depois de conferidas as características aparentes e o funcionamento apresentado no ato da venda, pelo valor e pela forma de pagamento ajustados entre as partes. Essa ciência do estado aparente não afasta a garantia legal por vício oculto.`,
        `Cláusula ${ordinal(2)}: Por se tratar de aparelho seminovo, as informações e características relevantes foram prestadas pela ${loja} no ato da compra e podem ser complementadas pelo manual do fabricante.`,
        `Cláusula ${ordinal(3)}: A ${loja} não assegura que o aparelho jamais tenha sido aberto para reparo ou substituição de peça. O comprador declara ciência dessa condição.`,
      ],
    },
    {
      titulo: "Das obrigações do comprador",
      itens: [
        `Cláusula ${ordinal(4)}: Por se tratar de aparelho seminovo, a ${loja} orienta o comprador a evitar a exposição a líquidos e poeira, pois a resistência informada pelo fabricante não é permanente e pode diminuir com o uso.`,
        `Cláusula ${ordinal(5)}: O comprador compromete-se a utilizar o aparelho com proteção adequada e com acessórios originais ou homologados, e a instalar aplicativos pelos meios oficiais do fabricante.`,
      ],
    },
    {
      titulo: "Das obrigações da vendedora",
      itens: [
        `Cláusula ${ordinal(6)}: Se o produto apresentar falha ou vício de fabricação dentro do prazo de garantia, o comprador deverá procurar imediatamente a ${loja}. Reparo, avaliação ou abertura por terceiro não autorizado implica perda da garantia contratual.`,
        `Cláusula ${ordinal(7)}: A ${loja} terá o prazo de 30 (trinta) dias para sanar o vício, contado do recebimento do produto, nos termos do art. 18 do Código de Defesa do Consumidor.`,
        `Cláusula ${ordinal(8)}: Não sendo possível o reparo nesse prazo, e optando o comprador pela substituição, ela observará o estoque de seminovos do mesmo modelo e da mesma capacidade de armazenamento, sem obrigação de mesma cor ou da mesma saúde de bateria. A ${loja} entregará produto em condições de uso.`,
        `Cláusula ${ordinal(9)}: Se o reparo exigir formatação, cabe ao comprador manter cópia de segurança dos seus dados. A ${loja} não responde por contatos, imagens, vídeos ou demais dados que o comprador não tenha preservado.`,
      ],
    },
    {
      titulo: "Da garantia do produto",
      itens: [
        `Cláusula ${ordinal(10)}: A garantia legal do produto seminovo é de 90 (noventa) dias, contados da entrega ou da retirada em loja, nos termos do art. 26 do Código de Defesa do Consumidor, e será prestada pela ${loja} ou por quem ela indicar.`,
        `Cláusula ${ordinal(11)}: Não estão cobertos pela garantia os seguintes casos: ${EXCLUSOES}`,
        `Cláusula ${ordinal(12)}: Constatada alguma dessas hipóteses de exclusão, a ${loja} comunicará o comprador de que o reparo não será coberto de forma gratuita.`,
        `Cláusula ${ordinal(13)}: Depois dessa comunicação, o aparelho ficará à disposição para retirada na loja, mediante agendamento.`,
      ],
    },
  ]
}

function termoNovo(loja: string) {
  return [
    {
      titulo: "Do objeto",
      itens: [
        `Cláusula ${ordinal(1)}: O comprador adquire o produto novo descrito neste recibo, lacrado e em condições de uso, pelo valor e pela forma de pagamento ajustados entre as partes. A conferência das características informadas não afasta a garantia legal por vício.`,
        `Cláusula ${ordinal(2)}: Por se tratar de aparelho lacrado, o manual é o disponibilizado pelo fabricante, em meio impresso ou em seu canal oficial.`,
      ],
    },
    {
      titulo: "Das obrigações do comprador",
      itens: [
        `Cláusula ${ordinal(3)}: A ${loja} orienta o comprador a evitar a exposição a líquidos e poeira, pois a resistência informada pelo fabricante não é permanente e pode diminuir com o uso.`,
        `Cláusula ${ordinal(4)}: O comprador compromete-se a utilizar o aparelho com proteção adequada e com acessórios originais ou homologados, e a instalar aplicativos pelos meios oficiais do fabricante.`,
      ],
    },
    {
      titulo: "Das obrigações da vendedora",
      itens: [
        `Cláusula ${ordinal(5)}: Se o produto apresentar falha ou vício de fabricação dentro do prazo de garantia, o comprador deverá acionar o fabricante, sem submetê-lo a avaliação ou reparo de terceiro não autorizado, sob pena de perda da garantia do fabricante. A ${loja} permanece responsável nos limites do Código de Defesa do Consumidor.`,
        `Cláusula ${ordinal(6)}: A ${loja} prestará ao comprador as orientações necessárias para o exercício da garantia junto ao fabricante.`,
        `Cláusula ${ordinal(7)}: Se o reparo exigir formatação, cabe ao comprador manter cópia de segurança dos seus dados. A ${loja} não responde por contatos, imagens, vídeos ou demais dados que o comprador não tenha preservado.`,
      ],
    },
    {
      titulo: "Da garantia do produto",
      itens: [
        `Cláusula ${ordinal(8)}: A garantia contratual do fabricante é de 12 (doze) meses, contados da entrega ou da retirada em loja, e será exercida pelos procedimentos do fabricante, sem prejuízo da garantia legal.`,
        `Cláusula ${ordinal(9)}: Não estão cobertos pela garantia os seguintes casos: ${EXCLUSOES}`,
        `Cláusula ${ordinal(10)}: Constatada alguma dessas hipóteses de exclusão pela ${loja} ou pelo fabricante, o comprador será comunicado de que o reparo não será coberto de forma gratuita.`,
        `Cláusula ${ordinal(11)}: Depois dessa comunicação, o aparelho ficará à disposição para retirada na loja, mediante agendamento.`,
      ],
    },
  ]
}

function termosDaNota(loja: string, lines: ReciboLinha[]) {
  const condicoes = lines.map((line) => condicaoDoItem(line.category, line.name))
  const temSeminovo = condicoes.includes("seminovo")
  const temNovo = condicoes.includes("novo")
  const seminovo = temSeminovo || !temNovo
  const novo = temNovo
  const ambos = seminovo && novo
  const blocos: Array<{ titulo: string; itens: string[]; chave: string }> = []
  if (seminovo) {
    for (const bloco of termoSeminovo(loja)) {
      blocos.push({ ...bloco, titulo: ambos ? `${bloco.titulo} — seminovos` : bloco.titulo, chave: `s-${bloco.titulo}` })
    }
  }
  if (novo) {
    for (const bloco of termoNovo(loja)) {
      blocos.push({ ...bloco, titulo: ambos ? `${bloco.titulo} — novos` : bloco.titulo, chave: `n-${bloco.titulo}` })
    }
  }
  const garantia = ambos
    ? `Cláusula 4ª: A garantia é exercida pelo comprador qualificado neste recibo, mediante a apresentação deste termo. No produto seminovo, o acionamento é feito perante a ${loja}. No produto novo, a garantia do fabricante observa os procedimentos do fabricante, com o auxílio da ${loja}.`
    : seminovo
      ? `Cláusula 4ª: A garantia deste termo é exercida exclusivamente pelo comprador nele qualificado, perante a ${loja}, mediante a apresentação deste recibo.`
      : `Cláusula 4ª: A garantia deste termo é exercida pelo comprador nele qualificado, mediante a apresentação deste recibo, observando-se os procedimentos do fabricante, com o auxílio da ${loja}.`
  blocos.push({
    chave: "gerais",
    titulo: "Disposições gerais",
    itens: [
      `Cláusula 1ª: Ao assinar este instrumento, o comprador autoriza a ${loja} a utilizar sua imagem, em fotografia ou vídeo, nas redes da loja, para divulgação comercial, de forma gratuita. A autorização pode ser revogada para usos futuros, por pedido dirigido à ${loja}, sem atingir material já publicado de boa-fé.`,
      `Cláusula 2ª: A cessão de uso da imagem não gera pagamento ao comprador e ocorre de forma voluntária, limitada à finalidade indicada na cláusula anterior.`,
      `Cláusula 3ª: A empresa participante desta negociação é a ${loja}, identificada pelo documento constante deste recibo.`,
      garantia,
    ],
  })
  return blocos
}

export function ReciboNota({
  codigo,
  data,
  emitente,
  destinatario,
  vendedor,
  notas,
  lines,
  payments,
  total,
  received,
  changeAmount,
}: {
  codigo: string
  data: string
  emitente: ReciboEmitente
  destinatario: ReciboDestinatario
  vendedor: string
  notas: string
  lines: ReciboLinha[]
  payments: ReciboPagamento[]
  total: number
  received: number
  changeAmount: number
}) {
  const loja = emitente.name || "Loja"
  const documentoLoja = texto(emitente.document)
  const rotuloLoja = rotuloDocumento(documentoLoja)
  const pago = payments.reduce((sum, pay) => sum + pay.amount, 0)
  const desconto = lines.reduce((sum, line) => sum + Math.max(0, line.discount) * line.qty, 0)
  const documento = texto(destinatario.documento)
  return (
    <article className="nf-sheet">
      <div className="nf-canhoto">
        <p>
          RECIBO DE {loja.toUpperCase()}
          {documentoLoja ? ` — ${rotuloLoja} ${docMascara(documentoLoja)}` : ""}
          {" — OS PRODUTOS E/OU SERVIÇOS CONSTANTES NO PEDIDO"}
        </p>
        <div className="nf-canhoto-cols">
          <div>
            <span>Data de recebimento</span>
            <strong>{data}</strong>
          </div>
          <div>
            <span>Identificação e assinatura do recebedor</span>
          </div>
        </div>
      </div>

      <header className="nf-emit">
        <div>
          <strong>{loja}</strong>
          {texto(emitente.address) ? <p>{emitente.address}</p> : null}
          {texto(emitente.city) ? <p>{emitente.city}</p> : null}
          <p>
            {rotuloLoja}: {documentoLoja ? docMascara(documentoLoja) : "—"}
          </p>
          <p>Telefone: {texto(emitente.phone) || "—"}</p>
        </div>
        <div className="nf-emit-id">
          <p>{data}</p>
          <p>VENDEDOR: {texto(vendedor) || "—"}</p>
          <span>Recibo da venda</span>
          <strong>{codigo || "—"}</strong>
        </div>
      </header>

      <section className="nf-box">
        <h3>Destinatário / Remetente</h3>
        <div className="nf-grid nf-grid-4">
          <Campo label="Nome / Razão social" value={destinatario.nome || "Consumidor final"} largo />
          <Campo label="Telefone" value={destinatario.telefone} />
          <Campo label="CPF" value={documento ? docMascara(documento) : ""} />
          <Campo label="E-mail" value={destinatario.email} />
        </div>
        <div className="nf-grid nf-grid-4">
          <Campo label="Endereço" value={destinatario.endereco} largo />
          <Campo label="CEP" value={destinatario.cep} />
          <Campo label="Cidade" value={destinatario.cidade} />
          <Campo label="Estado" value={destinatario.uf} />
        </div>
      </section>

      <section className="nf-box">
        <h3>Dados do produto</h3>
        <table>
          <thead>
            <tr>
              <th>Cód.</th>
              <th>Produto</th>
              <th className="nf-num">Qtd</th>
              <th className="nf-num">Valor unitário</th>
              <th className="nf-num">Desconto</th>
              <th className="nf-num">Valor total</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, index) => {
              const unit = Math.max(0, line.price)
              const ajuste = Number(line.discount) || 0
              const off = ajuste > 0 ? ajuste : 0
              const seriais = (line.serials || []).map((item) => item.trim()).filter(Boolean)
              return (
                <tr key={`${line.name}-${index}`}>
                  <td>{line.code || "—"}</td>
                  <td>
                    {line.name}
                    {seriais.length ? <div>IMEI/Serial: {seriais.join(" · ")}</div> : null}
                  </td>
                  <td className="nf-num">{line.qty}</td>
                  <td className="nf-num">{formatMoneyRs(unit)}</td>
                  <td className="nf-num">{ajuste < 0 ? `+ ${formatMoneyRs(-ajuste)}` : off > 0 ? formatMoneyRs(off) : ""}</td>
                  <td className="nf-num">{formatMoneyRs(line.qty * Math.max(0, unit - ajuste))}</td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4}>Total</td>
              <td className="nf-num">{desconto > 0 ? formatMoneyRs(desconto) : ""}</td>
              <td className="nf-num">{formatMoneyRs(total)}</td>
            </tr>
          </tfoot>
        </table>
      </section>

      <section className="nf-box">
        <h3>Pagamento</h3>
        <table>
          <thead>
            <tr>
              <th>Forma de pagamento</th>
              <th>Detalhes</th>
              <th className="nf-num">Valor pago</th>
              <th className="nf-num">Parcelas</th>
            </tr>
          </thead>
          <tbody>
            {payments.length === 0 ? (
              <tr>
                <td colSpan={4}>Sem pagamento informado</td>
              </tr>
            ) : payments.map((pay, index) => {
              const troca = detalheTroca(pay)
              return (
                <tr key={`${pay.method}-${index}`}>
                  <td>{pay.method}</td>
                  <td>
                    {troca ? (
                      <>
                        {troca.code ? <div>Cód. {troca.code}</div> : null}
                        <div>{troca.name || "Aparelho da troca"}</div>
                        {troca.imei ? <div>IMEI: {troca.imei}</div> : null}
                      </>
                    ) : (texto(pay.detalhe) || "")}
                  </td>
                  <td className="nf-num">{formatMoneyRs(pay.amount)}</td>
                  <td className="nf-num">{pay.parcelas && pay.parcelas > 1 ? pay.parcelas : 1}</td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2}>Total</td>
              <td className="nf-num">{formatMoneyRs(payments.length ? pago : received)}</td>
              <td />
            </tr>
            {changeAmount > 0 ? (
              <tr>
                <td colSpan={2}>Troco</td>
                <td className="nf-num">{formatMoneyRs(changeAmount)}</td>
                <td />
              </tr>
            ) : null}
          </tfoot>
        </table>
      </section>

      <section className="nf-box">
        <h3>Observação</h3>
        <p className="nf-note">{texto(notas) || "\u00a0"}</p>
      </section>

      <section className="nf-box nf-clausulas">
        <h3>Dados adicionais</h3>
        {termosDaNota(loja, lines).map((bloco) => (
          <div key={bloco.chave}>
            <h4>{bloco.titulo}</h4>
            {bloco.itens.map((item) => <p key={item.slice(0, 40)}>{item}</p>)}
          </div>
        ))}
      </section>

      <footer className="nf-sign">
        <div className="nf-sign-lines">
          <span />
          <span />
          <span />
        </div>
        <div className="nf-sign-names">
          <strong>{destinatario.nome || "Recebedor"}</strong>
          <em>Obrigado pela preferência.</em>
          <strong>{loja}</strong>
        </div>
      </footer>
    </article>
  )
}

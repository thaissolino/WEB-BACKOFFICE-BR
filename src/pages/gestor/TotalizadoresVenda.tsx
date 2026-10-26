export type ResumoVenda = {
  venda: number
  custo: number
  lucro: number
  itens: number
}

function money(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

function numero(value: number, casas = 2) {
  return value.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas })
}

export function PainelTotalizadores({ resumo, mostrarCusto }: { resumo: ResumoVenda; mostrarCusto: boolean }) {
  const pct = resumo.custo ? (resumo.lucro / resumo.custo) * 100 : 0
  const markup = resumo.custo ? resumo.venda / resumo.custo : 0
  const ticket = resumo.itens ? resumo.venda / resumo.itens : 0
  return (
    <section className="iv-totalizadores" aria-label="Totalizadores">
      <h2>Totalizadores</h2>
      <p><span>Total Venda:</span><strong>{money(resumo.venda)}</strong></p>
      {mostrarCusto ? <p><span>Total Custo:</span><strong>{money(resumo.custo)}</strong></p> : null}
      {mostrarCusto ? (
        <p>
          <span>Lucro:</span>
          <strong className={resumo.lucro < 0 ? "dre-neg" : "dre-pos"}>{money(resumo.lucro)}</strong>
        </p>
      ) : null}
      {mostrarCusto ? <p className="iv-total-pct"><span /><strong>{numero(pct)} %</strong></p> : null}
      {mostrarCusto ? <p><span>Markup Médio:</span><strong>{numero(markup)}</strong></p> : null}
      <p><span>Total Itens:</span><strong>{resumo.itens.toLocaleString("pt-BR")}</strong></p>
      <p><span>Ticket Médio:</span><strong>{money(ticket)}</strong></p>
    </section>
  )
}

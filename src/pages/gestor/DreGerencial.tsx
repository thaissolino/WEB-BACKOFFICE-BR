import { Fragment, useMemo, useState } from "react";
import { Minus, Plus } from "lucide-react";
import GestaoShell from "./GestaoShell";
import "./gestao-pages.css";

type Conta = {
  nome: string;
  planejado: number;
  realizado: number;
};

type Grupo = {
  nome: string;
  contas: Conta[];
};

const GRUPOS: Grupo[] = [
  { nome: "CUSTO COM PESSOAL", contas: [] },
  {
    nome: "DESPESAS COMERCIAIS",
    contas: [
      { nome: "COMISSÕES MARKETPLACE", planejado: 0, realizado: 0 },
      { nome: "DESCONTOS CLIENTES", planejado: 0, realizado: 0 },
      { nome: "DESPESAS VIAGENS (HOTÉIS, ALIMENTAÇÃO)", planejado: 0, realizado: 0 },
    ],
  },
  { nome: "DESPESAS OPERACIONAIS", contas: [] },
  { nome: "DESPESAS BANCÁRIAS", contas: [] },
  { nome: "AJUSTES DE LUCROS", contas: [] },
  { nome: "INVESTIMENTOS", contas: [] },
  { nome: "RETIRADA DOS SÓCIOS", contas: [] },
];

const LUCRO_BRUTO = 0;

function money(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function percent(value: number) {
  return `${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %`;
}

function tone(value: number) {
  if (value < 0) return "dre-neg";
  if (value > 0) return "dre-pos";
  return "";
}

function soma(contas: Conta[]) {
  return contas.reduce(
    (total, conta) => ({
      planejado: total.planejado + conta.planejado,
      realizado: total.realizado + conta.realizado,
    }),
    { planejado: 0, realizado: 0 },
  );
}

function DreLinha({
  nome,
  planejado,
  realizado,
  strong,
  nested,
  group,
  open,
  onToggle,
}: {
  nome: string;
  planejado: number;
  realizado: number;
  strong?: boolean;
  nested?: boolean;
  group?: boolean;
  open?: boolean;
  onToggle?: () => void;
}) {
  const saldo = realizado - planejado;
  const pctFaturamento = LUCRO_BRUTO ? (realizado / LUCRO_BRUTO) * 100 : 0;
  const pctRealizado = planejado ? (realizado / planejado) * 100 : 0;
  return (
    <tr className={group ? "dre-group" : nested ? "dre-conta" : strong ? "dre-strong" : undefined}>
      <th scope="row">
        {onToggle ? (
          <button type="button" className="dre-toggle" onClick={onToggle} aria-expanded={open}>
            {open ? <Minus size={14} /> : <Plus size={14} />}
            <span>{nome}</span>
          </button>
        ) : (
          nome
        )}
      </th>
      <td className={tone(planejado)}>{money(planejado)}</td>
      <td className={tone(realizado)}>{money(realizado)}</td>
      <td className={tone(saldo)}>{money(saldo)}</td>
      <td className={tone(pctFaturamento)}>{percent(pctFaturamento)}</td>
      <td className={tone(pctRealizado)}>{percent(pctRealizado)}</td>
    </tr>
  );
}

export default function DreGerencial() {
  const [abertos, setAbertos] = useState<Record<string, boolean>>({});
  const despesas = useMemo(
    () => GRUPOS.reduce((total, grupo) => total + soma(grupo.contas).realizado, 0),
    [],
  );
  const lucroLiquido = LUCRO_BRUTO + despesas;
  const pctLiquido = LUCRO_BRUTO ? (lucroLiquido / LUCRO_BRUTO) * 100 : 0;

  function alternar(nome: string) {
    setAbertos((atual) => ({ ...atual, [nome]: !atual[nome] }));
  }

  return (
    <GestaoShell title="DRE GERENCIAL" subtitle="Demonstração do resultado, no mesmo quadro do WM10.">
      <section className="dre">
        <div className="dre-resumo">
          <p>
            <span>LUCRO BRUTO (A) - (B)</span>
            <strong className={tone(LUCRO_BRUTO)}>{money(LUCRO_BRUTO)}</strong>
          </p>
          <p>
            <span>DESPESAS</span>
            <strong className={tone(despesas)}>{money(despesas)}</strong>
          </p>
          <p>
            <span>LUCRO LÍQUIDO</span>
            <strong className={tone(lucroLiquido)}>
              ({percent(pctLiquido)}) {money(lucroLiquido)}
            </strong>
          </p>
        </div>
        <div className="dre-sheet">
          <table>
            <thead>
              <tr>
                <th>Despesa</th>
                <th>Planejado</th>
                <th>Realizado</th>
                <th>Saldo</th>
                <th>% Faturamento</th>
                <th>% Realizado</th>
              </tr>
            </thead>
            <tbody>
              {GRUPOS.map((grupo) => {
                const total = soma(grupo.contas);
                const aberto = !!abertos[grupo.nome];
                return (
                  <Fragment key={grupo.nome}>
                    <DreLinha
                      nome={grupo.nome}
                      planejado={total.planejado}
                      realizado={total.realizado}
                      group
                      open={aberto}
                      onToggle={() => alternar(grupo.nome)}
                    />
                    {aberto
                      ? grupo.contas.map((conta) => (
                          <DreLinha
                            key={`${grupo.nome}-${conta.nome}`}
                            nome={conta.nome}
                            planejado={conta.planejado}
                            realizado={conta.realizado}
                            nested
                          />
                        ))
                      : null}
                    {aberto ? (
                      <DreLinha nome="Subtotal:" planejado={total.planejado} realizado={total.realizado} strong />
                    ) : null}
                  </Fragment>
                );
              })}
              <DreLinha nome="TOTAL DESPESAS (C)" planejado={0} realizado={despesas} strong />
              <DreLinha nome="TOTAL" planejado={LUCRO_BRUTO} realizado={lucroLiquido} strong />
            </tbody>
          </table>
        </div>
      </section>
    </GestaoShell>
  );
}

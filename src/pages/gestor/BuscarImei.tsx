import { ClipboardEvent, FormEvent, KeyboardEvent, MouseEvent, useState } from "react";
import { api, parseError } from "../../services/api";
import GestaoShell from "./GestaoShell";
import "./gestao-pages.css";

type Passo = {
  passo: "Entrada" | "Saída" | "Estorno";
  quando: string;
  documento: string;
  quem: string;
  produto: string;
  codigo: string;
  valor: number;
  situacao: string;
};

type Rastro = {
  imei: string;
  passos: Passo[];
  noEstoque: boolean;
};

function quando(value: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

function money(value: number) {
  return (Number(value) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function BuscarImei() {
  const [imei, setImei] = useState("");
  const [rastro, setRastro] = useState<Rastro | null>(null);
  const [hint, setHint] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function buscar(event: FormEvent) {
    event.preventDefault();
    const termo = imei.trim();
    if (termo.replace(/[^a-z0-9]/gi, "").length < 8) {
      setRastro(null);
      setHint("Informe pelo menos 8 caracteres do IMEI.");
      return;
    }
    setCarregando(true);
    setHint("");
    try {
      const { data } = await api.get<Rastro>("/backoffice/relatorios/imei", { params: { imei: termo } });
      const ordem = [...(data.passos || [])].sort((a, b) => b.quando.localeCompare(a.quando));
      setRastro({ ...data, passos: ordem });
      setHint(data.passos.length ? "" : "Nenhum IMEI encontrado.");
    } catch (err) {
      setRastro(null);
      setHint(parseError(err).friend || parseError(err).message || "Não foi possível buscar o IMEI.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <GestaoShell title="BUSCAR IMEI" subtitle="Movimentação deste IMEI no estoque.">
      <form className="iv-filtros" onSubmit={buscar}>
        <label>
          IMEI
          <input
            value={imei}
            onChange={(event) => setImei(event.target.value)}
            onDoubleClick={(event: MouseEvent<HTMLInputElement>) => {
              event.currentTarget.select();
              setImei("");
            }}
            onPaste={(event: ClipboardEvent<HTMLInputElement>) => {
              const texto = event.clipboardData.getData("text");
              if (!texto) return;
              event.preventDefault();
              const el = event.currentTarget;
              const inicio = el.selectionStart ?? imei.length;
              const fim = el.selectionEnd ?? imei.length;
              setImei(`${imei.slice(0, inicio)}${texto}${imei.slice(fim)}`);
            }}
            onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
              if (!(event.ctrlKey || event.metaKey)) return;
              const tecla = event.key.toLowerCase();
              if (tecla === "a") {
                event.preventDefault();
                event.currentTarget.select();
              }
            }}
            placeholder="Cole o IMEI"
            autoComplete="off"
            spellCheck={false}
          />
        </label>
        <div className="iv-acoes">
          <button
            type="button"
            className="iv-limpar"
            onClick={() => {
              setImei("");
              setRastro(null);
              setHint("");
            }}
          >
            Limpar
          </button>
          <button type="submit" disabled={carregando}>{carregando ? "Buscando..." : "Buscar"}</button>
        </div>
      </form>

      {rastro?.noEstoque ? <p className="pdv-cad-kicker">Entrou no estoque e ainda não teve saída.</p> : null}
      {rastro && rastro.passos.length && !rastro.passos.some((passo) => passo.passo === "Entrada") ? (
        <p className="pdv-cad-kicker">Esse IMEI não tem entrada no estoque.</p>
      ) : null}
      {hint ? <p className="pdv-cad-kicker">{hint}</p> : null}

      {rastro && rastro.passos.length ? (
        <div className="dre-sheet iv-sheet imei-sheet">
          <table>
            <thead>
              <tr>
                <th>Passo</th>
                <th>Data</th>
                <th>Documento</th>
                <th>Quem</th>
                <th className="iv-num">Produto</th>
                <th className="iv-num">Código</th>
                <th className="iv-num">Valor</th>
                <th>Situação</th>
              </tr>
            </thead>
            <tbody>
              {rastro.passos.map((passo, index) => (
                <tr key={`${passo.passo}-${passo.documento}-${index}`}>
                  <td>{passo.passo}</td>
                  <td>{quando(passo.quando)}</td>
                  <td>{passo.documento}</td>
                  <td className={passo.quem ? undefined : "iv-traco"}>{passo.quem || "—"}</td>
                  <td className={passo.produto ? "imei-nome" : "iv-traco"}>{passo.produto || "—"}</td>
                  <td className="iv-num">{passo.codigo || "—"}</td>
                  <td className="iv-num">{money(passo.valor)}</td>
                  <td className={passo.situacao ? undefined : "iv-traco"}>{passo.situacao || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </GestaoShell>
  );
}

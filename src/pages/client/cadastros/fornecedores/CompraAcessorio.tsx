import { FormEvent, useEffect, useId, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Check,
  FileText,
  Info,
  Paperclip,
  Phone,
  Plus,
  Printer,
  RefreshCw,
  Search,
} from "lucide-react";
import { api, parseError } from "../../../../services/api";
import CadastroShell from "../CadastroShell";
import type { PdvSupplier } from "./types";

const CHOOSE = "Escolha >>";
const FILTERS = ["Categoria", "Tamanho", "Cor", "Marca", "Coleção", "Gênero"] as const;

function todayBr() {
  const now = new Date();
  const d = String(now.getDate()).padStart(2, "0");
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${d}/${m}/${now.getFullYear()}`;
}

function phoneOrEmpty(value?: string) {
  return value?.trim() || "()";
}

function supplierAddress(item: PdvSupplier | null) {
  if (!item) return "Rua das Palmeiras, 410 Centro, Vitória - ES";
  const street = [item.address, item.number].filter(Boolean).join(", ");
  const place = [item.neighborhood, item.city && item.uf ? `${item.city} - ${item.uf}` : item.city || item.uf]
    .filter(Boolean)
    .join(", ");
  const line = [street, place].filter(Boolean).join(" ");
  return line || "Rua das Palmeiras, 410 Centro, Vitória - ES";
}

export default function CompraAcessorio() {
  const { id } = useParams();
  const navigate = useNavigate();
  const searchId = useId();
  const [supplier, setSupplier] = useState<PdvSupplier | null>(null);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"pesquisa" | "grade">("pesquisa");
  const [query, setQuery] = useState("");
  const [profitCalc, setProfitCalc] = useState("Por Produto");
  const [addExpenses, setAddExpenses] = useState(false);
  const [chequesOpen, setChequesOpen] = useState(false);
  const [invoiceDate, setInvoiceDate] = useState(todayBr());
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [userName, setUserName] = useState("MARINA ALVES");
  const [caixa, setCaixa] = useState("INDEFINIDO");
  const [obs, setObs] = useState("");
  const purchaseCode = 44810 + (Number(id) % 70 || 17);

  useEffect(() => {
    if (!id) return;
    api
      .get(`/clients/suppliers/${id}`)
      .then(({ data }) => {
        setSupplier(data.supplier as PdvSupplier);
        setError("");
      })
      .catch((err) => {
        const parsed = parseError(err);
        setError(parsed.friend || parsed.message || "Fornecedor não encontrado.");
      });
  }, [id]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "F2") {
        event.preventDefault();
        document.getElementById(searchId)?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [searchId]);

  function onSearch(event: FormEvent) {
    event.preventDefault();
  }

  return (
    <CadastroShell>
      <section className="pdv-cad-page" aria-labelledby="pdv-cad-compra-title">
        <div className="pdv-cad-sheet pdv-cad-sheet-wide">
          <h1 id="pdv-cad-compra-title" className="pdv-sr">
            Compra acessório
          </h1>

          <div className="pdv-cad-toolbar">
            <button className="pdv-cad-btn pdv-cad-btn-ghost" type="button">
              <Plus size={14} aria-hidden="true" /> Cadastrar Categoria
            </button>
            <button className="pdv-cad-btn pdv-cad-btn-ghost" type="button">
              <Plus size={14} aria-hidden="true" /> Cadastrar Produto
            </button>
            <button className="pdv-cad-btn pdv-cad-btn-ghost" type="button">
              <Check size={14} aria-hidden="true" /> Vincular XML
            </button>
            <button className="pdv-cad-btn pdv-cad-btn-ghost" type="button">
              <Paperclip size={14} aria-hidden="true" /> Anexar Compras
            </button>
            <button className="pdv-cad-btn pdv-cad-btn-ghost" type="button">
              <Printer size={14} aria-hidden="true" /> Imprimir Etiqueta
            </button>
          </div>

          {error ? (
            <p className="pdv-cad-error" role="alert">
              {error}
            </p>
          ) : null}

          <form className="pdv-cad-box" onSubmit={onSearch}>
            <div className="pdv-cad-box-head">
              <h2>Buscar por produto</h2>
              <button className="pdv-cad-btn pdv-cad-btn-back" type="button" onClick={() => navigate("/client/fornecedores")}>
                ← Voltar Menu
              </button>
            </div>
            <div className="pdv-cad-compra-filters">
              {FILTERS.map((label) => (
                <label key={label}>
                  {label}
                  <select defaultValue={CHOOSE}>
                    <option>{CHOOSE}</option>
                  </select>
                </label>
              ))}
              <label>
                Produto Ativo
                <select defaultValue="Todos">
                  <option>Todos</option>
                </select>
              </label>
            </div>
            <div className="pdv-cad-produto-search">
              <span>Nome do Produto</span>
              <div className="pdv-cad-seg">
                <button type="button" data-on={mode === "pesquisa" ? "true" : undefined} onClick={() => setMode("pesquisa")}>
                  Pesquisa
                </button>
                <button type="button" data-on={mode === "grade" ? "true" : undefined} onClick={() => setMode("grade")}>
                  Cód. da Grade
                </button>
              </div>
              <input
                id={searchId}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="BUSCAR PRODUTOS [F2]"
                aria-keyshortcuts="F2"
                autoComplete="off"
              />
              <button className="pdv-cad-btn pdv-cad-btn-blue" type="submit">
                <Search size={16} aria-hidden="true" />
                Buscar
              </button>
            </div>
          </form>

          <div className="pdv-cad-box">
            <div className="pdv-cad-box-head">
              <h2>Código da Compra {purchaseCode}</h2>
            </div>
            <div className="pdv-cad-compra-meta">
              <div className="pdv-cad-compra-id">
                <button className="pdv-cad-icon-btn" type="button" aria-label="Atualizar fornecedor">
                  <RefreshCw size={16} aria-hidden="true" />
                </button>
                <div>
                  <p className="pdv-cad-compra-doc">
                    <FileText size={14} aria-hidden="true" />
                    {supplier?.document || "12.847.305/0001-66"}
                  </p>
                  <p>{supplierAddress(supplier)}</p>
                  <p className="pdv-cad-compra-phones">
                    <Phone size={14} aria-hidden="true" /> {phoneOrEmpty(supplier?.phone)}
                    <Phone size={14} aria-hidden="true" /> {phoneOrEmpty(supplier?.mobile)}
                  </p>
                </div>
              </div>
              <label>
                Cálculo de Lucro do Preço de Compra
                <span className="pdv-cad-inline">
                  <select value={profitCalc} onChange={(event) => setProfitCalc(event.target.value)}>
                    <option>Por Produto</option>
                    <option>Markup</option>
                  </select>
                  <button className="pdv-cad-btn pdv-cad-btn-back" type="button">
                    <RefreshCw size={14} aria-hidden="true" /> Atualizar Lucro
                  </button>
                </span>
                {profitCalc === "Markup" ? (
                  <button className="pdv-cad-btn pdv-cad-btn-ghost" type="button">
                    <Plus size={14} aria-hidden="true" /> Mark up
                  </button>
                ) : null}
              </label>
              <div>
                <span>Adicionar as despesas acessórias no custo do produto?</span>
                <button
                  className="pdv-cad-toggle"
                  type="button"
                  aria-pressed={addExpenses}
                  onClick={() => setAddExpenses((current) => !current)}
                >
                  {addExpenses ? "Sim" : "Não"}
                </button>
              </div>
            </div>

            <div className="pdv-cad-table-wrap">
              <table className="pdv-cad-table pdv-cad-table-compra">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Grade - Cód</th>
                    <th>Produto</th>
                    <th>
                      Estoque Atual <Info size={12} aria-hidden="true" />
                    </th>
                    <th>Valor Compra (R$)</th>
                    <th>Qtd</th>
                    <th>Desconto (R$)</th>
                    <th>Acréscimo (R$)</th>
                    <th>
                      Vl Venda Sug (R$) <Info size={12} className="pdv-cad-info-red" aria-hidden="true" />
                    </th>
                    <th className="pdv-cad-col-teal">Vl Venda Atual (R$)</th>
                    <th>Subtotal (R$)</th>
                    <th>
                      Excluir
                      <input type="checkbox" aria-label="Selecionar todos para excluir" />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="pdv-cad-totals">
                    <td />
                    <td />
                    <td>Totalizadores:</td>
                    <td />
                    <td>0,00</td>
                    <td>0</td>
                    <td>0,00</td>
                    <td>0,00</td>
                    <td>-</td>
                    <td className="pdv-cad-col-teal">-</td>
                    <td>0,00</td>
                    <td>
                      <button className="pdv-cad-btn pdv-cad-btn-red" type="button" disabled>
                        x Excluir
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="pdv-cad-note">* Representa produto que está em uma grade com Preço de Venda Universal</p>
          </div>

          <div className="pdv-cad-box">
            <div className="pdv-cad-box-head">
              <h2>Informações adicionais</h2>
            </div>
            <div className="pdv-cad-extra">
              <label>
                Data da Nota Fiscal
                <input value={invoiceDate} onChange={(event) => setInvoiceDate(event.target.value)} autoComplete="off" />
              </label>
              <label>
                Número da Nota Fiscal
                <input value={invoiceNumber} onChange={(event) => setInvoiceNumber(event.target.value)} autoComplete="off" />
              </label>
              <label>
                Usuário
                <select value={userName} onChange={(event) => setUserName(event.target.value)}>
                  <option>MARINA ALVES</option>
                  <option>CARLOS NUNES</option>
                  <option>JULIANA FREITAS</option>
                </select>
              </label>
              <label>
                Caixa
                <select value={caixa} onChange={(event) => setCaixa(event.target.value)}>
                  <option>INDEFINIDO</option>
                </select>
              </label>
              <label className="pdv-cad-extra-obs">
                Observação
                <textarea value={obs} onChange={(event) => setObs(event.target.value)} rows={3} />
              </label>
            </div>
            <button className="pdv-cad-cheques" type="button" onClick={() => setChequesOpen((current) => !current)}>
              <Plus size={14} aria-hidden="true" /> expandir
              <span>Cheques Disponíveis para repassar</span>
            </button>
            {chequesOpen ? <p className="pdv-cad-hint">Nenhum cheque disponível.</p> : null}
            <div className="pdv-cad-extra-foot">
              <div>
                <span>Total Cheques</span>
                <strong>R$ 0,00</strong>
              </div>
              <div>
                <span>Total da compra - Cheques</span>
                <strong>R$ 0,00</strong>
              </div>
              <button className="pdv-cad-btn pdv-cad-btn-blue" type="button">
                <Check size={16} aria-hidden="true" />
                Próximo Passo
              </button>
            </div>
          </div>
        </div>
      </section>
    </CadastroShell>
  );
}

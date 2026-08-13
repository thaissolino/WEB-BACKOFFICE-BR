import { FormEvent, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Check, Eraser, Info } from "lucide-react";
import { api } from "../../../../services/api";
import CadastroShell from "../CadastroShell";
import { MOCK_CUSTOMERS } from "../clientes/types";
import { MOCK_SUPPLIERS, type PdvSupplier } from "../fornecedores/types";

const EMPTY = {
  usuario: "Nenhum selecionado",
  nomeCliente: "",
  classificacao: "Todas",
  financeiro: "",
  venda: "",
  fornecedor: "Nenhum selecionado",
  tipoAtividade: "Nenhum selecionado",
  modo: "Em calendario",
  vencimento: "",
  atividade: "",
  observacao: "",
  realizada: "Todas",
};

const DEMO_USERS = ["Nenhum selecionado", "MARINA ALVES", "CARLOS NUNES", "JULIANA FREITAS"];

export default function RelatorioAtividades() {
  const [params] = useSearchParams();
  const [draft, setDraft] = useState(EMPTY);
  const [suppliers, setSuppliers] = useState<PdvSupplier[]>(MOCK_SUPPLIERS);

  useEffect(() => {
    api
      .get("/clients/suppliers")
      .then(({ data }) => {
        const list = (data.suppliers as PdvSupplier[]) ?? [];
        if (list.length) setSuppliers(list);
      })
      .catch(() => {
        setSuppliers(MOCK_SUPPLIERS);
      });
  }, []);

  useEffect(() => {
    const cliente = params.get("cliente")?.trim() ?? "";
    const fornecedor = params.get("fornecedor")?.trim() ?? "";
    setDraft((current) => {
      const next = { ...current };
      if (cliente) {
        const found = MOCK_CUSTOMERS.find((item) => item.code === cliente || item.id === cliente);
        next.nomeCliente = found?.name ?? cliente;
      }
      if (fornecedor) {
        const found = [...suppliers, ...MOCK_SUPPLIERS].find(
          (item) => String(item.code) === fornecedor || item.fantasia === fornecedor,
        );
        next.fornecedor = found ? String(found.code) : fornecedor;
      }
      return next;
    });
  }, [params, suppliers]);

  const supplierOptions = useMemo(() => {
    const seen = new Set<number>();
    return suppliers.filter((item) => {
      if (seen.has(item.code)) return false;
      seen.add(item.code);
      return true;
    });
  }, [suppliers]);

  function onSearch(event: FormEvent) {
    event.preventDefault();
  }

  function onClear() {
    setDraft(EMPTY);
  }

  return (
    <CadastroShell>
      <section className="pdv-cad-page" aria-labelledby="pdv-cad-ativ-title">
        <div className="pdv-cad-sheet">
          <h1 id="pdv-cad-ativ-title">RELATÓRIO DE ATIVIDADES</h1>

          <div className="pdv-cad-info">
            <Info size={22} aria-hidden="true" />
            <div>
              <p>Neste relatório voce pode:</p>
              <ul>
                <li>Gerenciar as Atividades</li>
                <li>Verificar pelo tipo de atividades</li>
              </ul>
            </div>
          </div>

          <form className="pdv-cad-ativ" onSubmit={onSearch}>
            <div className="pdv-cad-ativ-grid">
              <label>
                Usuário
                <select value={draft.usuario} onChange={(event) => setDraft({ ...draft, usuario: event.target.value })}>
                  {DEMO_USERS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Nome do Cliente
                <input
                  value={draft.nomeCliente}
                  onChange={(event) => setDraft({ ...draft, nomeCliente: event.target.value })}
                  autoComplete="off"
                />
              </label>
              <label>
                Classificação
                <select
                  value={draft.classificacao}
                  onChange={(event) => setDraft({ ...draft, classificacao: event.target.value })}
                >
                  <option>Todas</option>
                  <option>NENHUM</option>
                </select>
              </label>
              <label>
                Financeiro
                <input
                  value={draft.financeiro}
                  onChange={(event) => setDraft({ ...draft, financeiro: event.target.value })}
                  autoComplete="off"
                />
              </label>

              <label>
                Venda
                <input
                  value={draft.venda}
                  onChange={(event) => setDraft({ ...draft, venda: event.target.value })}
                  autoComplete="off"
                />
              </label>
              <label>
                Fornecedor
                <select
                  value={draft.fornecedor}
                  onChange={(event) => setDraft({ ...draft, fornecedor: event.target.value })}
                >
                  <option value="Nenhum selecionado">Nenhum selecionado</option>
                  {supplierOptions.map((item) => (
                    <option key={item.code} value={String(item.code)}>
                      {item.code} - {item.fantasia || item.razao}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Tipo de Atividade
                <select
                  value={draft.tipoAtividade}
                  onChange={(event) => setDraft({ ...draft, tipoAtividade: event.target.value })}
                >
                  <option>Nenhum selecionado</option>
                </select>
              </label>
              <label>
                Modo de visualização
                <select value={draft.modo} onChange={(event) => setDraft({ ...draft, modo: event.target.value })}>
                  <option>Em calendario</option>
                </select>
              </label>

              <label>
                Data de Vencimento
                <input
                  value={draft.vencimento}
                  onChange={(event) => setDraft({ ...draft, vencimento: event.target.value })}
                  autoComplete="off"
                />
              </label>
              <label>
                Atividade
                <input
                  value={draft.atividade}
                  onChange={(event) => setDraft({ ...draft, atividade: event.target.value })}
                  placeholder="Digite aqui o nome da atividade"
                  autoComplete="off"
                />
              </label>
              <label>
                Observação
                <textarea
                  value={draft.observacao}
                  onChange={(event) => setDraft({ ...draft, observacao: event.target.value })}
                  rows={1}
                />
              </label>
              <label>
                Atividade Realizada
                <select value={draft.realizada} onChange={(event) => setDraft({ ...draft, realizada: event.target.value })}>
                  <option>Todas</option>
                </select>
              </label>
            </div>

            <div className="pdv-cad-filters-go">
              <button className="pdv-cad-btn pdv-cad-btn-ghost" type="button" onClick={onClear}>
                <Eraser size={16} aria-hidden="true" />
                Limpar
              </button>
              <button className="pdv-cad-btn pdv-cad-btn-blue" type="submit">
                <Check size={16} aria-hidden="true" />
                Buscar
              </button>
            </div>
          </form>
        </div>
      </section>
    </CadastroShell>
  );
}

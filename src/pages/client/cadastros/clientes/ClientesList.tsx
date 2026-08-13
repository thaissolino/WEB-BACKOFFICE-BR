import { FormEvent, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Calendar, Plus, RefreshCw, Search, UserRound, X } from "lucide-react";
import { api } from "../../../../services/api";
import { formatCep, formatCpfCnpj, formatPhoneBr, PHONE_BR_MAX_LENGTH } from "../../../../utils/brMasks";
import CadastroShell from "../CadastroShell";
import GerenciarClienteModal from "./GerenciarClienteModal";
import MultiSelectClassificacao from "./MultiSelectClassificacao";
import {
  CITIES_BY_UF,
  MOCK_CUSTOMERS,
  UFS,
  classificationFilterLabel,
  type ClassificationRow,
  type PortfolioRow,
  type StoreCustomer,
} from "./types";

const EMPTY_FILTERS = {
  searchType: "Qualquer Parte",
  name: "",
  document: "",
  cep: "",
  state: "",
  city: "",
  phone: "",
  mobile: "",
  financialCode: "",
  portfolio: "Todas",
  pageSize: "500",
};

function matchesSearch(haystack: string, needle: string, type: string) {
  const h = haystack.toLowerCase();
  const n = needle.toLowerCase();
  if (!n) return true;
  if (type === "Início") return h.startsWith(n);
  return h.includes(n);
}

export default function ClientesList({ inactive = false }: { inactive?: boolean }) {
  const navigate = useNavigate();
  const location = useLocation();
  const isInactive = inactive || location.pathname.endsWith("/inativos");
  const [draft, setDraft] = useState(EMPTY_FILTERS);
  const [applied, setApplied] = useState(EMPTY_FILTERS);
  const [classifications, setClassifications] = useState<string[]>([]);
  const [classDraft, setClassDraft] = useState<string[]>([]);
  const [classApplied, setClassApplied] = useState<string[]>([]);
  const [portfolios, setPortfolios] = useState<string[]>(["Todas"]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [manage, setManage] = useState<StoreCustomer | null>(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    api
      .get("/clients/classifications")
      .then(({ data }) => {
        const rows = (data.classifications as ClassificationRow[]) ?? [];
        setClassifications(rows.map(classificationFilterLabel));
      })
      .catch(() => {
        setClassifications(["NENHUM", "Clube 1Desconto por Categoria"]);
      });

    api
      .get("/clients/portfolios")
      .then(({ data }) => {
        const names = ((data.portfolios as PortfolioRow[]) ?? []).map((item) => item.name).filter(Boolean);
        setPortfolios(["Todas", ...names]);
      })
      .catch(() => {
        setPortfolios(["Todas", "testes"]);
      });
  }, []);

  const rows = useMemo(() => {
    const base = MOCK_CUSTOMERS.filter((item) => item.active === !isInactive);
    const limit = Number(applied.pageSize) || 500;
    return base
      .filter((item) => {
        if (applied.name && !matchesSearch(item.name, applied.name, applied.searchType)) return false;
        if (applied.document && !item.document.includes(applied.document.replace(/\D/g, ""))) return false;
        if (applied.cep && !item.cep.replace(/\D/g, "").includes(applied.cep.replace(/\D/g, ""))) return false;
        if (applied.state && item.state !== applied.state) return false;
        if (applied.city && item.city !== applied.city) return false;
        if (applied.phone && !item.phone.replace(/\D/g, "").includes(applied.phone.replace(/\D/g, ""))) return false;
        if (applied.mobile && !item.phone.replace(/\D/g, "").includes(applied.mobile.replace(/\D/g, ""))) return false;
        if (applied.financialCode && !item.financialCode.includes(applied.financialCode)) return false;
        if (applied.portfolio !== "Todas" && item.portfolio !== applied.portfolio) return false;
        if (classApplied.length > 0) {
          const none = classApplied.includes("NENHUM") && !item.classification;
          const named = classApplied.some((label) => {
            if (label === "NENHUM") return false;
            return item.classification && label.startsWith(item.classification);
          });
          if (!none && !named) return false;
        }
        return true;
      })
      .slice(0, limit);
  }, [applied, classApplied, isInactive]);

  const allSelected = rows.length > 0 && rows.every((item) => selected[item.id]);
  const cities = draft.state ? CITIES_BY_UF[draft.state] ?? [] : [];

  function onFilter(event: FormEvent) {
    event.preventDefault();
    setApplied(draft);
    setClassApplied(classDraft);
  }

  function toggleAll(checked: boolean) {
    const next: Record<string, boolean> = { ...selected };
    rows.forEach((item) => {
      next[item.id] = checked;
    });
    setSelected(next);
  }

  return (
    <CadastroShell>
      <section className="pdv-cad-page" aria-labelledby="pdv-cad-clientes-title">
        <div className="pdv-cad-sheet">
          <h1 id="pdv-cad-clientes-title">CLIENTES</h1>
          <div className="pdv-cad-actions">
            <button
              className="pdv-cad-btn pdv-cad-btn-green"
              type="button"
              onClick={() => navigate("/client/clientes/cadastrar")}
            >
              <Plus size={16} strokeWidth={2.4} aria-hidden="true" />
              Cadastrar Cliente
            </button>
            {isInactive ? (
              <button
                className="pdv-cad-btn pdv-cad-btn-green"
                type="button"
                onClick={() => navigate("/client/clientes")}
              >
                <UserRound size={16} strokeWidth={2.2} aria-hidden="true" />
                Clientes Ativos
              </button>
            ) : (
              <button
                className="pdv-cad-btn pdv-cad-btn-red"
                type="button"
                onClick={() => navigate("/client/clientes/inativos")}
              >
                <X size={16} strokeWidth={2.4} aria-hidden="true" />
                Clientes Inativos
              </button>
            )}
          </div>

          <form className="pdv-cad-filters" onSubmit={onFilter}>
            <label>
              Tipo de Pesquisa
              <select
                value={draft.searchType}
                onChange={(event) => setDraft({ ...draft, searchType: event.target.value })}
              >
                <option>Qualquer Parte</option>
                <option>Início</option>
              </select>
            </label>
            <label>
              Nome/Fantasia/Razao
              <input
                value={draft.name}
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                autoComplete="off"
              />
            </label>
            <label>
              CPF/CNPJ/Doc. Estrangeiro
              <input
                value={draft.document}
                onChange={(event) => setDraft({ ...draft, document: formatCpfCnpj(event.target.value) })}
                inputMode="numeric"
                autoComplete="off"
              />
            </label>
            <label>
              CEP
              <input
                value={draft.cep}
                onChange={(event) => setDraft({ ...draft, cep: formatCep(event.target.value) })}
                inputMode="numeric"
                autoComplete="off"
              />
            </label>
            <label>
              Estado
              <select
                value={draft.state}
                onChange={(event) => setDraft({ ...draft, state: event.target.value, city: "" })}
              >
                <option value="">Selecione...</option>
                {UFS.map((uf) => (
                  <option key={uf} value={uf}>
                    {uf}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Cidade
              <select
                value={draft.city}
                onChange={(event) => setDraft({ ...draft, city: event.target.value })}
                disabled={!draft.state}
              >
                <option value="">{draft.state ? "Selecione..." : "Selecione primeiro o UF"}</option>
                {cities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Telefone
              <input
                value={draft.phone}
                onChange={(event) => setDraft({ ...draft, phone: formatPhoneBr(event.target.value) })}
                maxLength={PHONE_BR_MAX_LENGTH}
                inputMode="tel"
                autoComplete="off"
              />
            </label>
            <label>
              Celular
              <input
                value={draft.mobile}
                onChange={(event) => setDraft({ ...draft, mobile: formatPhoneBr(event.target.value) })}
                maxLength={PHONE_BR_MAX_LENGTH}
                inputMode="tel"
                autoComplete="off"
              />
            </label>
            <label>
              Cod. financeiro (C.Barra Crediário)
              <input
                value={draft.financialCode}
                onChange={(event) => setDraft({ ...draft, financialCode: event.target.value })}
                autoComplete="off"
              />
            </label>
            <label>
              Classificação
              <MultiSelectClassificacao options={classifications} selected={classDraft} onChange={setClassDraft} />
            </label>
            <label>
              Carteira de Clientes
              <select
                value={draft.portfolio}
                onChange={(event) => setDraft({ ...draft, portfolio: event.target.value })}
              >
                {portfolios.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Quantidade cliente por pagina
              <input
                value={draft.pageSize}
                onChange={(event) => setDraft({ ...draft, pageSize: event.target.value.replace(/\D/g, "").slice(0, 4) })}
                inputMode="numeric"
                autoComplete="off"
              />
            </label>
            <div className="pdv-cad-filters-go">
              <button className="pdv-cad-btn pdv-cad-btn-blue" type="submit">
                <Search size={16} strokeWidth={2.2} aria-hidden="true" />
                Filtrar
              </button>
            </div>
          </form>

          <div className="pdv-cad-table-wrap">
            <table className="pdv-cad-table">
              <thead>
                <tr>
                  <th>Gerenciar</th>
                  <th>Código</th>
                  <th>Nome</th>
                  <th>Responsável</th>
                  <th>Carteira de Clientes</th>
                  <th>Telefone</th>
                  <th>Data de Cadastro</th>
                  <th>Atividade</th>
                  <th>Atualizar</th>
                  <th>
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={(event) => toggleAll(event.target.checked)}
                      aria-label="Selecionar todos"
                    />
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <button
                        className="pdv-cad-icon-btn"
                        type="button"
                        aria-label={`Gerenciar ${item.name}`}
                        onClick={() => setManage(item)}
                      >
                        <Plus size={16} strokeWidth={2.6} aria-hidden="true" />
                      </button>
                    </td>
                    <td>{item.code}</td>
                    <td>{item.name}</td>
                    <td>{item.responsible || (isInactive ? "-" : "")}</td>
                    <td>{item.portfolio}</td>
                    <td>{item.phone}</td>
                    <td>{item.registeredAt}</td>
                    <td>
                      <button
                        className="pdv-cad-icon-btn"
                        type="button"
                        aria-label={`Atividade ${item.name}`}
                        onClick={() => navigate(`/client/atividades?cliente=${item.code}`)}
                      >
                        <Calendar size={16} strokeWidth={2.2} aria-hidden="true" />
                      </button>
                    </td>
                    <td>
                      <button
                        className="pdv-cad-icon-btn"
                        type="button"
                        aria-label={`Atualizar ${item.name}`}
                        onClick={() => setToast("atualizado")}
                      >
                        <RefreshCw size={16} strokeWidth={2.2} aria-hidden="true" />
                      </button>
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        checked={Boolean(selected[item.id])}
                        onChange={(event) => setSelected({ ...selected, [item.id]: event.target.checked })}
                        aria-label={`Selecionar ${item.name}`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="pdv-sr" aria-live="polite">
            {toast}
          </p>
        </div>
      </section>
      {manage ? (
        <GerenciarClienteModal
          name={manage.name}
          onClose={() => setManage(null)}
          onPick={(actionId, label) => {
            const id = manage.id;
            const code = manage.code;
            setManage(null);
            if (actionId === "agendar") {
              navigate(`/client/atividades?cliente=${code}`);
              return;
            }
            navigate(`/client/clientes/${id}/${actionId}`, { state: { title: label, name: manage.name } });
          }}
        />
      ) : null}
    </CadastroShell>
  );
}

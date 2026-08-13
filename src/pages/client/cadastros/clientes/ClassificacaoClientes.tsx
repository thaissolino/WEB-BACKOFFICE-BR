import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Info, Plus, RefreshCw, Wand2 } from "lucide-react";
import { api, parseError } from "../../../../services/api";
import CadastroShell from "../CadastroShell";
import {
  formatBrMoney,
  parseBrMoney,
  type ClassificationRow,
} from "./types";

const EMPTY_NEW: Omit<ClassificationRow, "code"> = {
  name: "",
  discountType: "categoria",
  discountPercent: 0,
  discountOnPromo: true,
  creditUnlimited: false,
  creditLimit: 0,
  consignado: true,
  blockFiscal: false,
  sortOrder: 1,
  active: true,
};

function payloadOf(row: Omit<ClassificationRow, "code">) {
  return {
    name: row.name,
    discountType: row.discountType,
    discountPercent: row.discountPercent,
    discountOnPromo: row.discountOnPromo,
    creditUnlimited: row.creditUnlimited,
    creditLimit: row.creditLimit,
    consignado: row.consignado,
    blockFiscal: row.blockFiscal,
    sortOrder: row.sortOrder,
    active: row.active,
  };
}

function RadioSimNao({
  name,
  value,
  onChange,
}: {
  name: string;
  value: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <fieldset className="pdv-cad-radios pdv-cad-radios-stack">
      <legend className="pdv-sr">{name}</legend>
      <label>
        <input type="radio" name={name} checked={value} onChange={() => onChange(true)} />
        Sim
      </label>
      <label>
        <input type="radio" name={name} checked={!value} onChange={() => onChange(false)} />
        Não
      </label>
    </fieldset>
  );
}

export default function ClassificacaoClientes() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const inactive = params.get("ativo") === "0";
  const [rows, setRows] = useState<ClassificationRow[]>([]);
  const [drafts, setDrafts] = useState<Record<number, ClassificationRow>>({});
  const [createRow, setCreateRow] = useState(EMPTY_NEW);
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");

  function load() {
    api
      .get("/clients/classifications", { params: { ativo: inactive ? "0" : "1" } })
      .then(({ data }) => {
        const list = (data.classifications as ClassificationRow[]) ?? [];
        setRows(list);
        setDrafts(Object.fromEntries(list.map((item) => [item.code, item])));
        setError("");
      })
      .catch((err) => {
        const parsed = parseError(err);
        setError(parsed.friend || parsed.message || "Não foi possível carregar as classificações.");
      });
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inactive]);

  const visible = useMemo(() => rows.map((item) => drafts[item.code] ?? item), [drafts, rows]);

  function patch(code: number, next: Partial<ClassificationRow>) {
    setDrafts((current) => ({ ...current, [code]: { ...current[code], ...next } }));
  }

  async function saveRow(row: ClassificationRow) {
    try {
      const { data } = await api.put(`/clients/classifications/${row.code}`, payloadOf(row));
      const saved = data.classification as ClassificationRow;
      setRows((current) => current.map((item) => (item.code === saved.code ? saved : item)));
      setDrafts((current) => ({ ...current, [saved.code]: saved }));
      setToast("atualizado");
      setError("");
    } catch (err) {
      const parsed = parseError(err);
      setError(parsed.friend || parsed.message || "Não foi possível atualizar.");
    }
  }

  async function addRow() {
    try {
      await api.post("/clients/classifications", payloadOf(createRow));
      setCreateRow(EMPTY_NEW);
      setToast("atualizado");
      load();
    } catch (err) {
      const parsed = parseError(err);
      setError(parsed.friend || parsed.message || "Não foi possível cadastrar.");
    }
  }

  return (
    <CadastroShell>
      <section className="pdv-cad-page" aria-labelledby="pdv-cad-class-title">
        <div className="pdv-cad-sheet pdv-cad-sheet-wide">
          <h1 id="pdv-cad-class-title">CLASSIFICAÇÃO DOS CLIENTES</h1>
          <div className="pdv-cad-actions">
            {inactive ? (
              <button
                className="pdv-cad-btn pdv-cad-btn-green"
                type="button"
                onClick={() => navigate("/client/clientes/classificacao")}
              >
                Ativos
              </button>
            ) : (
              <button
                className="pdv-cad-btn pdv-cad-btn-red"
                type="button"
                onClick={() => navigate("/client/clientes/classificacao?ativo=0")}
              >
                Inativos
              </button>
            )}
          </div>
          {error ? (
            <p className="pdv-cad-error" role="alert">
              {error}
            </p>
          ) : null}

          <div className="pdv-cad-table-wrap">
            <table className="pdv-cad-table pdv-cad-table-edit">
              <thead>
                <tr>
                  <th>Cod</th>
                  <th>Automação</th>
                  <th>Classificação</th>
                  <th>
                    Desconto na Venda % <Info size={14} aria-hidden="true" />
                  </th>
                  <th>
                    Desconto sobre Promoção <Info size={14} aria-hidden="true" />
                  </th>
                  <th>Limite de Crédito</th>
                  <th>Liberar Consignado</th>
                  <th>Bloquear Documentos Fiscais</th>
                  <th>Ordem</th>
                  <th>Ativo</th>
                  <th>Atualizar</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((row) => {
                  const locked = row.code === 0;
                  return (
                    <tr key={row.code}>
                      <td>{row.code}</td>
                      <td>
                        <Wand2 size={16} aria-hidden="true" />
                      </td>
                      <td>
                        {locked ? (
                          row.name
                        ) : (
                          <input
                            value={row.name}
                            onChange={(event) => patch(row.code, { name: event.target.value })}
                            aria-label="Classificação"
                          />
                        )}
                      </td>
                      <td>
                        <fieldset className="pdv-cad-radios pdv-cad-radios-stack">
                          <legend className="pdv-sr">Desconto na Venda %</legend>
                          <label>
                            <input
                              type="radio"
                              name={`disc-${row.code}`}
                              checked={row.discountType === "geral"}
                              onChange={() => patch(row.code, { discountType: "geral" })}
                            />
                            Desconto geral:
                            {row.discountType === "geral" ? (
                              <input
                                className="pdv-cad-mini"
                                value={formatBrMoney(row.discountPercent)}
                                onChange={(event) =>
                                  patch(row.code, { discountPercent: parseBrMoney(event.target.value) })
                                }
                              />
                            ) : null}
                          </label>
                          <label>
                            <input
                              type="radio"
                              name={`disc-${row.code}`}
                              checked={row.discountType === "categoria"}
                              onChange={() => patch(row.code, { discountType: "categoria" })}
                            />
                            Desconto categoria:
                          </label>
                        </fieldset>
                      </td>
                      <td>
                        {locked ? (
                          "Não"
                        ) : (
                          <RadioSimNao
                            name={`promo-${row.code}`}
                            value={row.discountOnPromo}
                            onChange={(next) => patch(row.code, { discountOnPromo: next })}
                          />
                        )}
                      </td>
                      <td>
                        {locked ? (
                          `Com Limite: R$ ${formatBrMoney(row.creditLimit)}`
                        ) : (
                          <fieldset className="pdv-cad-radios pdv-cad-radios-stack">
                            <legend className="pdv-sr">Limite de Crédito</legend>
                            <label>
                              <input
                                type="radio"
                                name={`cred-${row.code}`}
                                checked={row.creditUnlimited}
                                onChange={() => patch(row.code, { creditUnlimited: true })}
                              />
                              Ilimitado
                            </label>
                            <label>
                              <input
                                type="radio"
                                name={`cred-${row.code}`}
                                checked={!row.creditUnlimited}
                                onChange={() => patch(row.code, { creditUnlimited: false })}
                              />
                              Com Limite : R$
                              <input
                                className="pdv-cad-mini"
                                value={formatBrMoney(row.creditLimit)}
                                onChange={(event) =>
                                  patch(row.code, { creditLimit: parseBrMoney(event.target.value) })
                                }
                                disabled={row.creditUnlimited}
                              />
                            </label>
                          </fieldset>
                        )}
                      </td>
                      <td>
                        <RadioSimNao
                          name={`cons-${row.code}`}
                          value={row.consignado}
                          onChange={(next) => patch(row.code, { consignado: next })}
                        />
                      </td>
                      <td>
                        <RadioSimNao
                          name={`fisc-${row.code}`}
                          value={row.blockFiscal}
                          onChange={(next) => patch(row.code, { blockFiscal: next })}
                        />
                      </td>
                      <td>
                        <input
                          className="pdv-cad-mini"
                          value={row.sortOrder}
                          onChange={(event) =>
                            patch(row.code, { sortOrder: Number(event.target.value.replace(/\D/g, "")) || 0 })
                          }
                          aria-label="Ordem"
                        />
                      </td>
                      <td>
                        <RadioSimNao
                          name={`ativo-${row.code}`}
                          value={row.active}
                          onChange={(next) => patch(row.code, { active: next })}
                        />
                      </td>
                      <td>
                        <button
                          className="pdv-cad-icon-btn"
                          type="button"
                          aria-label={`Atualizar ${row.name}`}
                          onClick={() => saveRow(row)}
                        >
                          <RefreshCw size={16} aria-hidden="true" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {!inactive ? (
                  <tr>
                    <td />
                    <td>
                      <Wand2 size={16} aria-hidden="true" />
                    </td>
                    <td>
                      <input
                        value={createRow.name}
                        onChange={(event) => setCreateRow({ ...createRow, name: event.target.value })}
                        aria-label="Classificação"
                      />
                    </td>
                    <td>—</td>
                    <td>
                      <RadioSimNao
                        name="promo-new"
                        value={createRow.discountOnPromo}
                        onChange={(next) => setCreateRow({ ...createRow, discountOnPromo: next })}
                      />
                    </td>
                    <td>
                      <fieldset className="pdv-cad-radios pdv-cad-radios-stack">
                        <legend className="pdv-sr">Limite de Crédito</legend>
                        <label>
                          <input
                            type="radio"
                            name="cred-new"
                            checked={createRow.creditUnlimited}
                            onChange={() => setCreateRow({ ...createRow, creditUnlimited: true })}
                          />
                          Ilimitado
                        </label>
                        <label>
                          <input
                            type="radio"
                            name="cred-new"
                            checked={!createRow.creditUnlimited}
                            onChange={() => setCreateRow({ ...createRow, creditUnlimited: false })}
                          />
                          Com Limite : R$
                          <input
                            className="pdv-cad-mini"
                            value={formatBrMoney(createRow.creditLimit)}
                            onChange={(event) =>
                              setCreateRow({ ...createRow, creditLimit: parseBrMoney(event.target.value) })
                            }
                          />
                        </label>
                      </fieldset>
                    </td>
                    <td>
                      <RadioSimNao
                        name="cons-new"
                        value={createRow.consignado}
                        onChange={(next) => setCreateRow({ ...createRow, consignado: next })}
                      />
                    </td>
                    <td>
                      <RadioSimNao
                        name="fisc-new"
                        value={createRow.blockFiscal}
                        onChange={(next) => setCreateRow({ ...createRow, blockFiscal: next })}
                      />
                    </td>
                    <td>
                      <input
                        className="pdv-cad-mini"
                        value={createRow.sortOrder}
                        onChange={(event) =>
                          setCreateRow({
                            ...createRow,
                            sortOrder: Number(event.target.value.replace(/\D/g, "")) || 0,
                          })
                        }
                        aria-label="Ordem"
                      />
                    </td>
                    <td>
                      <RadioSimNao
                        name="ativo-new"
                        value={createRow.active}
                        onChange={(next) => setCreateRow({ ...createRow, active: next })}
                      />
                    </td>
                    <td>
                      <button className="pdv-cad-icon-btn pdv-cad-icon-add" type="button" aria-label="Adicionar" onClick={addRow}>
                        <Plus size={18} strokeWidth={2.6} aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <p className="pdv-sr" aria-live="polite">
            {toast}
          </p>
        </div>
      </section>
    </CadastroShell>
  );
}

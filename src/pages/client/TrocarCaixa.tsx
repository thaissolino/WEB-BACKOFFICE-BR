import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Check, ChevronDown, Search } from "lucide-react";
import { useClientAuth } from "../../hooks/clientAuth";
import { CODIGO_CRIAR_CAIXA, EVENTO_CRIAR_CAIXA, eventoPermitido } from "./cadastros/usuarios/groupEvents";
import { listCatalog } from "./cadastros/catalog/catalogApi";
import PdvShell, { PdvLoading } from "./dashboard/PdvShell";
import PdvTip from "./dashboard/PdvTip";
import { CAIXA_SNAP_KEY, CAIXA_STORAGE_KEY, NENHUM_CAIXA } from "./dashboard/mockData";
import { createLojaCaixa, listLojaCaixas, type LojaCaixa } from "./cadastros/financeiro/caixaApi";
import { parseError } from "../../services/api";

const ABRIR_PDV_TIP = `Troca a sessão do caixa.
Abre o PVD(tela de venda) e faz no caixa
selecionado retiradas e entradas necessárias
caso esteja com valores diferentes de zero(0,00)
e a 'Transferência de Saldo' esteja
parametrizado como 'Abertura de Caixa'.`;

function CaixaCombo({
  value,
  options,
  onChange,
}: {
  value: string;
  options: string[];
  onChange: (next: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return options;
    return options.filter((item) => item.toLowerCase().includes(q));
  }, [filter, options]);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setFilter("");
      window.requestAnimationFrame(() => searchRef.current?.focus());
    }
  }, [open]);

  return (
    <div className="pdv-caixa-combo" ref={wrapRef} data-open={open ? "true" : undefined}>
      <button
        id="pdv-caixa-trigger"
        className="pdv-caixa-trigger"
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls="pdv-caixa-list"
        onClick={() => setOpen((current) => !current)}
      >
        <span>{value}</span>
        <ChevronDown size={16} strokeWidth={2} aria-hidden="true" />
      </button>
      {open ? (
        <div className="pdv-caixa-panel-list" id="pdv-caixa-list">
          <div className="pdv-caixa-filter">
            <Search size={14} aria-hidden="true" />
            <input
              ref={searchRef}
              type="search"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              aria-label="Filtrar caixas"
              autoComplete="off"
            />
          </div>
          <ul className="pdv-caixa-options" role="listbox" aria-label="SELECIONAR CAIXA">
            {filtered.length === 0 ? (
              <li className="pdv-caixa-empty">Nenhum caixa encontrado.</li>
            ) : (
              filtered.map((item) => (
                <li key={item} role="presentation">
                  <button
                    className="pdv-caixa-option"
                    type="button"
                    role="option"
                    aria-selected={item === value}
                    onClick={() => {
                      onChange(item);
                      setOpen(false);
                    }}
                  >
                    {item}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function TrocarCaixaBoard() {
  const navigate = useNavigate();
  const { client } = useClientAuth();
  const [podeCriar, setPodeCriar] = useState(false);
  const [names, setNames] = useState<string[]>([NENHUM_CAIXA]);
  const [picked, setPicked] = useState(NENHUM_CAIXA);
  const [active, setActive] = useState(NENHUM_CAIXA);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [novo, setNovo] = useState("");
  const [creating, setCreating] = useState(false);
  const [rows, setRows] = useState<LojaCaixa[]>([]);
  const [passAsk, setPassAsk] = useState(false);
  const [passInput, setPassInput] = useState("");
  const [pendingAction, setPendingAction] = useState<"select" | "pdv" | null>(null);

  function loadCaixas(prefer?: string) {
    listLojaCaixas(true)
      .then((items) => {
        setRows(items);
        const next = [NENHUM_CAIXA, ...items.map((item) => item.name)];
        setNames(next);
        const stored =
          typeof sessionStorage === "undefined" ? "" : sessionStorage.getItem(CAIXA_STORAGE_KEY) || "";
        const wanted = prefer && next.includes(prefer) ? prefer : stored;
        const current = wanted && next.includes(wanted) ? wanted : NENHUM_CAIXA;
        setPicked(current);
        if (!prefer) setActive(current);
        setError("");
      })
      .catch((err) => {
        setError(parseError(err).friend || "Não foi possível carregar os caixas.");
      });
  }

  useEffect(() => {
    loadCaixas();
  }, []);

  useEffect(() => {
    if (!client) return;
    let ativo = true;
    Promise.all([listCatalog("user", true), listCatalog("group", true)])
      .then(([users, groups]) => {
        if (!ativo) return;
        const email = client.email.trim().toLowerCase();
        const username = client.username.trim().toLowerCase();
        const user = users.find((item) => {
          const mail = String(item.payload.email || "").trim().toLowerCase();
          const login = String(item.payload.usuario || "").trim().toLowerCase();
          return (email && mail === email) || (username && login === username);
        });
        if (!user) {
          setPodeCriar(false);
          return;
        }
        const group = groups.find((item) => item.name === String(user.payload.grupo || ""));
        setPodeCriar(eventoPermitido(group?.payload.eventos, EVENTO_CRIAR_CAIXA));
      })
      .catch(() => {
        if (ativo) setPodeCriar(false);
      });
    return () => {
      ativo = false;
    };
  }, [client]);

  async function onNovoCaixa() {
    const name = novo.trim();
    if (!name || creating || !podeCriar) return;
    setCreating(true);
    try {
      await createLojaCaixa(name);
      setNovo("");
      setNotice(`Caixa ${name} criado.`);
      loadCaixas(name);
    } catch (err) {
      setError(parseError(err).friend || "Não foi possível criar o caixa.");
    } finally {
      setCreating(false);
    }
  }

  function applyCaixa(name: string, persist = true) {
    if (name === NENHUM_CAIXA) {
      setNotice("Selecione um caixa.");
      return false;
    }
    if (persist) {
      setActive(name);
      sessionStorage.setItem(CAIXA_STORAGE_KEY, name);
      const item = rows.find((row) => row.name === name);
      if (item) {
        const payload = { ...item.payload };
        delete payload.senhaAcesso;
        sessionStorage.setItem(CAIXA_SNAP_KEY, JSON.stringify({ code: item.code, name: item.name, payload }));
      }
      setNotice("");
    }
    return true;
  }

  function caixaSenha(name: string) {
    const item = rows.find((row) => row.name === name);
    return String(item?.payload?.senhaAcesso || "").trim();
  }

  function runAfterAuth(name: string, action: "select" | "pdv") {
    if (!applyCaixa(name)) return;
    if (action === "select") return;
    navigate("/client/pdv");
  }

  function requestAction(name: string, action: "select" | "pdv") {
    setPicked(name);
    if (!applyCaixa(name, false)) return;
    const senha = caixaSenha(name);
    if (senha) {
      setPendingAction(action);
      setPassInput("");
      setPassAsk(true);
      return;
    }
    runAfterAuth(name, action);
  }

  function confirmPass() {
    const senha = caixaSenha(picked);
    if (passInput.trim() !== senha) {
      setError("Senha do caixa incorreta.");
      return;
    }
    setError("");
    setPendingAction(null);
    if (!applyCaixa(picked)) return;
    setPassAsk(false);
    navigate("/client/pdv");
  }

  return (
    <section className="pdv-caixa-page" aria-labelledby="pdv-caixa-title">
      <div className="pdv-caixa-sheet">
        <div className="pdv-caixa-head">
          <h1 id="pdv-caixa-title">Trocar de Caixa</h1>
        </div>

        <div className="pdv-caixa-row">
          <CaixaCombo value={picked} options={names} onChange={(next) => requestAction(next, "select")} />
          <PdvTip label="Abrir PDV" rich text={ABRIR_PDV_TIP}>
            <button className="pdv-wm-btn pdv-caixa-go" type="button" onClick={() => requestAction(picked, "pdv")}>
              <Check size={16} strokeWidth={2.6} aria-hidden="true" />
              Abrir PDV
            </button>
          </PdvTip>
        </div>

        <section className="pdv-caixa-store" aria-labelledby="pdv-caixa-store-title">
          <h2 id="pdv-caixa-store-title">Caixas da loja</h2>
          <span className={podeCriar ? "pdv-caixa-create-tip" : "pdv-tip pdv-caixa-create-tip"}>
            <form
              className="pdv-caixa-create"
              onSubmit={(event) => {
                event.preventDefault();
                void onNovoCaixa();
              }}
            >
              <input
                id="pdv-caixa-novo"
                value={novo}
                onChange={(event) => setNovo(event.target.value)}
                autoComplete="off"
                placeholder="Nome do caixa"
                aria-label="Nome do caixa"
                disabled={!podeCriar}
              />
              <button
                className="pdv-wm-btn"
                type="submit"
                disabled={creating || !novo.trim() || !podeCriar}
              >
                {creating ? "Criando..." : "Criar"}
              </button>
            </form>
            {podeCriar ? null : (
              <span className="pdv-tip-bubble" role="tooltip">
                Para liberar, permita o evento {CODIGO_CRIAR_CAIXA} em Funções do grupo, na área PDV.
              </span>
            )}
          </span>
          <div className="pdv-caixa-store-list">
            <table>
              <thead>
                <tr>
                  <th>Cód.</th>
                  <th>Nome</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={2}>Nenhum caixa nesta loja.</td>
                  </tr>
                ) : (
                  rows.map((item) => (
                    <tr key={item.code}>
                      <td>{item.code}</td>
                      <td>{item.name}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {error ? (
          <p className="pdv-caixa-notice" role="alert">
            {error}
          </p>
        ) : null}
        {notice ? (
          <p className="pdv-caixa-notice" role="status">
            {notice}
          </p>
        ) : null}
      </div>

      {passAsk ? (
        <div className="pdv-caixa-confirm">
          <div className="pdv-caixa-confirm-card cx-open-modal pdv-caixa-pass-card" role="dialog" aria-modal="true" aria-labelledby="pdv-caixa-pass-title">
            <header className="cx-open-head">
              <div>
                <h2 id="pdv-caixa-pass-title">Acesso ao caixa</h2>
                <p className="cx-open-sub">{picked}</p>
              </div>
            </header>
            <form
              className="cx-client-modal-form"
              onSubmit={(event) => {
                event.preventDefault();
                confirmPass();
              }}
            >
              <label>
                Senha de acesso
                <input
                  type="password"
                  value={passInput}
                  autoComplete="off"
                  autoFocus
                  onChange={(event) => setPassInput(event.target.value)}
                />
              </label>
              <div className="pdv-caixa-confirm-actions">
                <button className="pdv-cad-btn" type="button" onClick={() => { setPassAsk(false); setPendingAction(null); setPicked(active) }}>Cancelar</button>
                <button className="pdv-cad-btn pdv-cad-btn-green" type="submit">Entrar no caixa</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default function TrocarCaixa() {
  const { client, loadingClient } = useClientAuth();

  if (loadingClient) return <PdvLoading />;
  if (!client) return <Navigate to="/signin/lojista" replace />;

  return (
    <PdvShell variant="form">
      <TrocarCaixaBoard />
    </PdvShell>
  );
}

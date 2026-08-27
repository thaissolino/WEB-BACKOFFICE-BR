import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Check, ChevronDown, Search } from "lucide-react";
import { useClientAuth } from "../../hooks/clientAuth";
import PdvShell, { PdvLoading } from "./dashboard/PdvShell";
import PdvTip from "./dashboard/PdvTip";
import { CAIXA_STORAGE_KEY, NENHUM_CAIXA } from "./dashboard/mockData";
import { listCatalog } from "./cadastros/catalog/catalogApi";
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
  const [names, setNames] = useState<string[]>([NENHUM_CAIXA]);
  const [picked, setPicked] = useState(NENHUM_CAIXA);
  const [active, setActive] = useState(NENHUM_CAIXA);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    listCatalog("cash_register", true)
      .then((rows) => {
        const next = [NENHUM_CAIXA, ...rows.map((item) => item.name)];
        setNames(next);
        const stored =
          typeof sessionStorage === "undefined" ? "" : sessionStorage.getItem(CAIXA_STORAGE_KEY) || "";
        const current = stored && next.includes(stored) ? stored : NENHUM_CAIXA;
        setPicked(current);
        setActive(current);
        setError("");
      })
      .catch((err) => {
        setError(parseError(err).friend || "Não foi possível carregar os caixas.");
      });
  }, []);

  function applyCaixa() {
    if (picked === NENHUM_CAIXA) {
      setNotice("Selecione um caixa.");
      return false;
    }
    setActive(picked);
    sessionStorage.setItem(CAIXA_STORAGE_KEY, picked);
    setNotice("");
    return true;
  }

  function onSelecionarCaixa() {
    if (!applyCaixa()) return;
    setNotice(`Caixa ${picked} selecionado.`);
  }

  function onAbrirPdv() {
    if (!applyCaixa()) return;
    navigate("/client/pdv");
  }

  return (
    <section className="pdv-caixa-page" aria-labelledby="pdv-caixa-title">
      <div className="pdv-caixa-sheet">
        <div className="pdv-caixa-head">
          <h1 id="pdv-caixa-title">Trocar de Caixa</h1>
          <button className="pdv-wm-btn" type="button" onClick={() => navigate("/client/dashboard")}>
            Voltar
          </button>
        </div>

        <div className="pdv-caixa-row">
          <label htmlFor="pdv-caixa-trigger">SELECIONAR CAIXA</label>
          <CaixaCombo value={picked} options={names} onChange={setPicked} />
        </div>

        <div className="pdv-caixa-actions">
          <PdvTip label="Gerencia os caixas sem abrir a tela de PDV." rich>
            <button className="pdv-wm-btn" type="button" onClick={onSelecionarCaixa}>
              <Check size={16} strokeWidth={2.6} aria-hidden="true" />
              Selecionar Caixa
            </button>
          </PdvTip>
          <PdvTip label="Abrir PDV" rich text={ABRIR_PDV_TIP}>
            <button className="pdv-wm-btn" type="button" onClick={onAbrirPdv}>
              <Check size={16} strokeWidth={2.6} aria-hidden="true" />
              Abrir PDV
            </button>
          </PdvTip>
        </div>

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

      <p className="pdv-caixa-foot">
        Caixa: <strong>{active}</strong>
      </p>
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

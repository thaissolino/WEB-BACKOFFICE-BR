import { createContext, FormEvent, ReactNode, useContext, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Calendar,
  ChevronDown,
  Headphones,
  Home,
  LogOut,
  Package,
  Search,
  Settings,
  ShoppingCart,
} from "lucide-react";
import { useClientAuth } from "../../../hooks/clientAuth";
import { api } from "../../../services/api";
import { STORES, STORE_STORAGE_KEY, type StoreOption } from "./mockData";
import MenuBar from "./MenuBar";
import PdvTip from "./PdvTip";
import ConfigModal from "./ConfigModal";
import SupportModal from "./SupportModal";
import {
  EMPTY_PDV_UI_CONFIG,
  isDashboardVisible,
  normalizePdvUiConfig,
  type PdvUiConfig,
} from "./pdvUiConfig";
import "./dashboard.css";

type PdvSession = {
  query: string;
  storeId: string;
  storeName: string;
};

const PdvSessionContext = createContext<PdvSession>({
  query: "",
  storeId: STORES[0].id,
  storeName: STORES[0].name,
});

const PdvUiConfigContext = createContext<PdvUiConfig>(EMPTY_PDV_UI_CONFIG);

export function usePdvSession() {
  return useContext(PdvSessionContext);
}

export function usePdvUiConfig() {
  return useContext(PdvUiConfigContext);
}

export function PdvLoading() {
  return (
    <div className="pdv-root" lang="pt-BR">
      <main className="pdv-main">
        <p className="pdv-welcome">Carregando…</p>
      </main>
    </div>
  );
}

function readStoredStoreId() {
  if (typeof sessionStorage === "undefined") return STORES[0].id;
  const stored = sessionStorage.getItem(STORE_STORAGE_KEY);
  return STORES.some((item) => item.id === stored) ? stored! : STORES[0].id;
}

function StoreCluster({
  stores,
  value,
  onChange,
  onHome,
}: {
  stores: StoreOption[];
  value: string;
  onChange: (id: string) => void;
  onHome: () => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const selected = stores.find((item) => item.id === value) ?? stores[0];

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

  return (
    <div className="pdv-shop" ref={wrapRef} data-open={open ? "true" : undefined}>
      <button className="pdv-shop-home" type="button" aria-label="HOME" onClick={onHome}>
        <Home size={18} strokeWidth={2.2} aria-hidden="true" />
      </button>
      <div className="pdv-shop-pick">
        <PdvTip
          label="Lista de lojas"
          title="Lista de lojas"
          text="Selecione a loja que desejar gerenciar"
        >
          <button
            className="pdv-shop-trigger"
            type="button"
            aria-haspopup="listbox"
            aria-expanded={open}
            title="Lista de lojas"
            aria-label="Lista de lojas. Selecione a loja que desejar gerenciar"
            onClick={() => setOpen((current) => !current)}
          >
            <span>{selected.label}</span>
            <ChevronDown className="pdv-shop-caret" size={16} strokeWidth={2} aria-hidden="true" />
          </button>
        </PdvTip>
      </div>
      {open ? (
        <ul className="pdv-shop-list" role="listbox" aria-label="Lista de lojas">
          {stores.map((item) => (
            <li key={item.id} role="presentation">
              <button
                className="pdv-shop-option"
                type="button"
                role="option"
                aria-selected={item.id === selected.id}
                onClick={() => {
                  onChange(item.id);
                  setOpen(false);
                }}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export default function PdvShell({
  children,
  onClosePanels,
  onHome,
  variant = "board",
}: {
  children: ReactNode;
  onClosePanels?: () => void;
  onHome?: () => void;
  variant?: "board" | "form";
}) {
  const { clientLogout } = useClientAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [query, setQuery] = useState("");
  const [storeId, setStoreId] = useState(readStoredStoreId);
  const [pendingStoreId, setPendingStoreId] = useState<string | null>(null);
  const [periodFrom, setPeriodFrom] = useState("");
  const [periodTo, setPeriodTo] = useState("");
  const [chromeModal, setChromeModal] = useState<"config" | "support" | null>(null);
  const [uiConfig, setUiConfig] = useState<PdvUiConfig>(EMPTY_PDV_UI_CONFIG);

  const storeName = STORES.find((item) => item.id === storeId)?.name ?? STORES[0].name;
  const currentStore = STORES.find((item) => item.id === storeId) ?? STORES[0];
  const pendingStore = STORES.find((item) => item.id === pendingStoreId);

  useEffect(() => {
    sessionStorage.setItem(STORE_STORAGE_KEY, storeId);
  }, [storeId]);

  useEffect(() => {
    let active = true;
    let loaded = false;

    function applyFromDb() {
      api
        .get("/clients/ui-config")
        .then(({ data }) => {
          if (!active) return;
          loaded = true;
          setUiConfig(normalizePdvUiConfig(data));
        })
        .catch(() => {
          if (!active || loaded) return;
          setUiConfig(EMPTY_PDV_UI_CONFIG);
        });
    }

    applyFromDb();

    function onVisibility() {
      if (document.visibilityState === "visible") applyFromDb();
    }

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", applyFromDb);
    return () => {
      active = false;
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", applyFromDb);
    };
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "F1") {
        if (chromeModal) return;
        event.preventDefault();
        document.getElementById("pdv-q")?.focus();
      }
      if (event.key === "Escape" && pendingStoreId) {
        setPendingStoreId(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pendingStoreId, chromeModal]);

  function closePanels() {
    document.getElementById("pdv-main")?.querySelectorAll("details[open]").forEach((el) => {
      el.removeAttribute("open");
    });
    onClosePanels?.();
  }

  function handleHome() {
    setQuery("");
    closePanels();
    onHome?.();
    if (location.pathname !== "/client/dashboard") {
      navigate("/client/dashboard");
      return;
    }
    window.scrollTo(0, 0);
  }

  function onSearch(event: FormEvent) {
    event.preventDefault();
  }

  function requestStoreChange(nextId: string) {
    if (nextId === storeId) return;
    setPendingStoreId(nextId);
  }

  function confirmStoreChange() {
    if (pendingStoreId) setStoreId(pendingStoreId);
    setPendingStoreId(null);
  }

  function goCaixa() {
    navigate("/client/caixa");
  }

  const showCloseDemo = isDashboardVisible(uiConfig, "close-demo");
  const showPeriod = isDashboardVisible(uiConfig, "period");

  return (
    <PdvUiConfigContext.Provider value={uiConfig}>
    <PdvSessionContext.Provider value={{ query, storeId, storeName }}>
      <div className="pdv-root" lang="pt-BR">
        <a className="pdv-skip" href="#pdv-main">
          Ir para o conteúdo
        </a>

        <header className="pdv-header">
          <button className="pdv-catalog" type="button">
            CATÁLOGO DE PRODUTOS
          </button>

          <form className="pdv-search" onSubmit={onSearch} role="search">
            <div className="pdv-search-head">
              <label htmlFor="pdv-q">Pesquisa de Menu</label>
              <kbd className="pdv-search-kbd">F1</kbd>
            </div>
            <div className="pdv-search-row">
              <Search className="pdv-search-icon" size={16} aria-hidden="true" />
              <input
                id="pdv-q"
                className="pdv-search-input"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                type="search"
                autoComplete="off"
                aria-keyshortcuts="F1"
              />
            </div>
          </form>

          <nav className="pdv-icons" aria-label="Atalhos">
            <PdvTip label="Acessar a Home">
              <button
                className="pdv-ico pdv-ico-home"
                onClick={handleHome}
                type="button"
                aria-label="Acessar a Home"
              >
                <Home size={22} strokeWidth={2.2} aria-hidden="true" />
              </button>
            </PdvTip>
            <PdvTip label="Carrinho">
              <button
                className="pdv-ico pdv-ico-cart"
                type="button"
                aria-label="Carrinho"
                aria-current={location.pathname === "/client/caixa" ? "page" : undefined}
                onClick={goCaixa}
              >
                <ShoppingCart size={22} strokeWidth={2.2} aria-hidden="true" />
              </button>
            </PdvTip>
            <PdvTip label="Configure seu sistema">
              <button
                className="pdv-ico pdv-ico-gear"
                type="button"
                aria-label="Configure seu sistema"
                aria-haspopup="dialog"
                aria-expanded={chromeModal === "config"}
                data-open={chromeModal === "config" ? "true" : undefined}
                onClick={() => setChromeModal("config")}
              >
                <Settings size={22} strokeWidth={2.2} aria-hidden="true" />
              </button>
            </PdvTip>
            <PdvTip label="Visualizar os canais de atendimento">
              <button
                className="pdv-ico pdv-ico-headset"
                type="button"
                aria-label="Visualizar os canais de atendimento"
                aria-haspopup="dialog"
                aria-expanded={chromeModal === "support"}
                data-open={chromeModal === "support" ? "true" : undefined}
                onClick={() => setChromeModal("support")}
              >
                <Headphones size={22} strokeWidth={2.2} aria-hidden="true" />
              </button>
            </PdvTip>
            <PdvTip label="Sair">
              <button
                className="pdv-ico pdv-ico-exit"
                onClick={clientLogout}
                type="button"
                aria-label="Sair"
              >
                <LogOut size={22} strokeWidth={2.2} aria-hidden="true" />
              </button>
            </PdvTip>
          </nav>
        </header>

        <div className="pdv-strip">
          <MenuBar uiConfig={uiConfig} />

          <div className="pdv-toolbar">
            <div className="pdv-toolbar-start">
              {showCloseDemo ? (
                <PdvTip label="Clique aqui para fechar todas as caixas.">
                  <button
                    className="pdv-close-demo"
                    onClick={closePanels}
                    type="button"
                    title="Clique aqui para fechar todas as caixas."
                    aria-label="Clique aqui para fechar todas as caixas."
                  >
                    <Package size={16} strokeWidth={2.2} aria-hidden="true" />
                    Fechar demonstrativo
                  </button>
                </PdvTip>
              ) : null}
            </div>
            <div className="pdv-toolbar-end">
              {showPeriod ? (
                <div className="pdv-period" role="group" aria-label="Período">
                  <label className="pdv-period-kicker" htmlFor="pdv-de">
                    Período:
                  </label>
                  <span className="pdv-date-slot">
                    <Calendar className="pdv-date-icon" size={14} strokeWidth={2} aria-hidden="true" />
                    <input
                      id="pdv-de"
                      className="pdv-date"
                      type="date"
                      value={periodFrom}
                      onChange={(event) => setPeriodFrom(event.target.value)}
                    />
                  </span>
                  <label className="pdv-period-sep" htmlFor="pdv-ate">
                    até
                  </label>
                  <span className="pdv-date-slot">
                    <Calendar className="pdv-date-icon" size={14} strokeWidth={2} aria-hidden="true" />
                    <input
                      id="pdv-ate"
                      className="pdv-date"
                      type="date"
                      value={periodTo}
                      onChange={(event) => setPeriodTo(event.target.value)}
                    />
                  </span>
                </div>
              ) : null}
              <StoreCluster
                stores={STORES}
                value={storeId}
                onChange={requestStoreChange}
                onHome={handleHome}
              />
            </div>
          </div>
        </div>

        <main
          className={variant === "form" ? "pdv-main pdv-main-form" : "pdv-main"}
          id="pdv-main"
        >
          {children}
        </main>

        <ConfigModal
          open={chromeModal === "config"}
          onClose={() => setChromeModal(null)}
          uiConfig={uiConfig}
        />
        <SupportModal open={chromeModal === "support"} onClose={() => setChromeModal(null)} />

        {pendingStore ? (
          <div className="pdv-confirm-scrim">
            <div
              className="pdv-confirm-card"
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="pdv-store-confirm-title"
            >
              <p id="pdv-store-confirm-title">
                Deseja realmente sair da loja {currentStore.name} para acessar a loja{" "}
                {pendingStore.name}?
              </p>
              <div className="pdv-confirm-actions">
                <button type="button" onClick={confirmStoreChange}>
                  OK
                </button>
                <button type="button" onClick={() => setPendingStoreId(null)}>
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </PdvSessionContext.Provider>
    </PdvUiConfigContext.Provider>
  );
}

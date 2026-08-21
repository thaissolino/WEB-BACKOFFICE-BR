import { createContext, FormEvent, ReactNode, useContext, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Calendar,
  ChevronDown,
  Headphones,
  Home,
  ImagePlus,
  LogOut,
  Menu,
  Package,
  Search,
  Settings,
  ShoppingCart,
} from "lucide-react";
import { useClientAuth } from "../../../hooks/clientAuth";
import { api } from "../../../services/api";
import { usePdvLayoutMode, type PdvLayoutMode } from "../../../store/pdvLayoutMode";
import { CAIXA_STORAGE_KEY, NENHUM_CAIXA, STORE_STORAGE_KEY, toStoreOption, type StoreOption } from "./mockData";
import MenuBar from "./MenuBar";
import ClassicDrawer from "./ClassicDrawer";
import PdvTip from "./PdvTip";
import ConfigModal from "./ConfigModal";
import SupportModal from "./SupportModal";
import LogoModal from "./LogoModal";
import {
  EMPTY_PDV_UI_CONFIG,
  isDashboardVisible,
  normalizePdvUiConfig,
  type PdvUiConfig,
} from "./pdvUiConfig";
import "./dashboard.css";
import "./dashboard-classic.css";
import "./pdv-modals.css";

type PdvSession = {
  query: string;
  storeId: string;
  storeName: string;
  stores: StoreOption[];
};

const PdvSessionContext = createContext<PdvSession>({
  query: "",
  storeId: "",
  storeName: "",
  stores: [],
});

const PdvUiConfigContext = createContext<PdvUiConfig>(EMPTY_PDV_UI_CONFIG);

export function usePdvSession() {
  return useContext(PdvSessionContext);
}

export function usePdvUiConfig() {
  return useContext(PdvUiConfigContext);
}

export function PdvLoading() {
  const layoutMode = usePdvLayoutMode((state) => state.mode);
  return (
    <div className="pdv-root" data-surface="cream" data-layout={layoutMode} lang="pt-BR">
      <main className="pdv-main">
        <p className="pdv-welcome">Carregando…</p>
      </main>
    </div>
  );
}

function readStoredStoreId() {
  if (typeof sessionStorage === "undefined") return "";
  return sessionStorage.getItem(STORE_STORAGE_KEY) || "";
}

/** Toggle TEMPORÁRIO de layout (Clássico/Premium) — remover ao definir o layout final. */
function LayoutModeToggle() {
  const mode = usePdvLayoutMode((state) => state.mode);
  const setMode = usePdvLayoutMode((state) => state.setMode);

  const options: { value: PdvLayoutMode; label: string }[] = [
    { value: "classic", label: "Clássico" },
    { value: "premium", label: "Premium" },
  ];

  return (
    <div className="pdv-layout-toggle" role="group" aria-label="Estilo do painel">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={mode === option.value}
          title={`Usar layout ${option.label}`}
          onClick={() => setMode(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function StoreCluster({
  stores,
  value,
  onChange,
  onHome,
  home = true,
}: {
  stores: StoreOption[];
  value: string;
  onChange: (id: string) => void;
  onHome: () => void;
  home?: boolean;
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
      {home ? (
        <button className="pdv-shop-home" type="button" aria-label="HOME" onClick={onHome}>
          <Home size={18} strokeWidth={2.2} aria-hidden="true" />
        </button>
      ) : null}
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
            <span>{selected?.label ?? "Lista de lojas"}</span>
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
                aria-selected={item.id === selected?.id}
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
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [pendingStoreId, setPendingStoreId] = useState<string | null>(null);
  const [periodFrom, setPeriodFrom] = useState("");
  const [periodTo, setPeriodTo] = useState("");
  const [chromeModal, setChromeModal] = useState<"config" | "support" | "logo" | null>(null);
  const [uiConfig, setUiConfig] = useState<PdvUiConfig>(EMPTY_PDV_UI_CONFIG);
  const [logoSrc, setLogoSrc] = useState<string | null>(null);
  const [logoTick, setLogoTick] = useState(0);
  const layoutMode = usePdvLayoutMode((state) => state.mode);
  const isClassic = layoutMode === "classic";
  const [drawerOpen, setDrawerOpen] = useState(false);

  const currentStore = stores.find((item) => item.id === storeId) ?? stores[0];
  const storeName = currentStore?.name ?? "";
  const pendingStore = stores.find((item) => item.id === pendingStoreId);

  useEffect(() => {
    let active = true;
    api
      .get("/clients/stores")
      .then(({ data }) => {
        if (!active) return;
        const raw = Array.isArray(data?.stores) ? data.stores : Array.isArray(data) ? data : [];
        const list = (
          raw as Array<{ id: string; name: string; storeCode?: string | null; code?: string | null }>
        )
          .filter((item) => item?.id)
          .map(toStoreOption);
        setStores(list);
        setStoreId((current) => {
          if (current && list.some((item) => item.id === current)) return current;
          return list[0]?.id ?? "";
        });
      })
      .catch(() => {
        if (active) setStores([]);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (storeId) sessionStorage.setItem(STORE_STORAGE_KEY, storeId);
  }, [storeId]);

  useEffect(() => {
    if (!storeId) {
      setLogoSrc(null);
      return;
    }
    let active = true;
    let objectUrl: string | null = null;

    api
      .get("/clients/store-logo", { params: { storeKey: storeId } })
      .then(async ({ data }) => {
        const fileId = data?.current?.id;
        if (!active || !fileId) {
          if (active) setLogoSrc(null);
          return;
        }
        const blob = await api.get(`/clients/store-logo/file/${fileId}`, {
          params: { storeKey: storeId },
          responseType: "blob",
        });
        if (!active) return;
        objectUrl = URL.createObjectURL(blob.data);
        if (!active) {
          URL.revokeObjectURL(objectUrl);
          return;
        }
        setLogoSrc(objectUrl);
      })
      .catch(() => {
        if (active) setLogoSrc(null);
      });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [storeId, logoTick]);

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
    const caixa = typeof sessionStorage === "undefined" ? "" : sessionStorage.getItem(CAIXA_STORAGE_KEY) || "";
    if (caixa && caixa !== NENHUM_CAIXA) navigate("/client/pdv");
    else navigate("/client/caixa");
  }

  const showCloseDemo = isDashboardVisible(uiConfig, "close-demo");
  const showPeriod = isDashboardVisible(uiConfig, "period");
  const onDashboard = location.pathname === "/client/dashboard";

  // Controles compartilhados entre a toolbar premium e a faixa mínima do clássico.
  const closeDemoButton = showCloseDemo ? (
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
  ) : null;

  const periodControl = showPeriod ? (
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
  ) : null;

  return (
    <PdvUiConfigContext.Provider value={uiConfig}>
    <PdvSessionContext.Provider value={{ query, storeId, storeName, stores }}>
      <div className="pdv-root" data-surface="cream" data-layout={layoutMode} lang="pt-BR">
        <a className="pdv-skip" href="#pdv-main">
          Ir para o conteúdo
        </a>

        <header className="pdv-header">
          <div className="pdv-brand">
            {isClassic ? (
              <PdvTip label="Menu">
                <button
                  className="pdv-burger"
                  type="button"
                  aria-label="Abrir menu"
                  aria-haspopup="dialog"
                  aria-expanded={drawerOpen}
                  onClick={() => setDrawerOpen(true)}
                >
                  <Menu size={20} strokeWidth={2.2} aria-hidden="true" />
                </button>
              </PdvTip>
            ) : null}
            <PdvTip label="Logo da loja">
              <button
                className="pdv-store-logo"
                type="button"
                aria-label="Logo da loja"
                aria-haspopup="dialog"
                aria-expanded={chromeModal === "logo"}
                data-open={chromeModal === "logo" ? "true" : undefined}
                data-has-logo={logoSrc ? "true" : undefined}
                onClick={() => setChromeModal("logo")}
              >
                {logoSrc ? (
                  <img className="pdv-store-logo-img" src={logoSrc} alt="" />
                ) : (
                  <ImagePlus size={20} strokeWidth={2.2} aria-hidden="true" />
                )}
                <span className="pdv-store-logo-text" aria-hidden={logoSrc ? true : undefined}>
                  Logo da loja
                </span>
              </button>
            </PdvTip>
            {isClassic ? (
              <StoreCluster
                stores={stores}
                value={storeId}
                onChange={requestStoreChange}
                onHome={handleHome}
                home={false}
              />
            ) : (
              <button className="pdv-catalog" type="button">
                CATÁLOGO DE PRODUTOS
              </button>
            )}
          </div>

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
                placeholder={isClassic ? "Pesquisar no menu (F1)" : undefined}
              />
            </div>
          </form>

          <nav className="pdv-icons" aria-label="Atalhos">
            <LayoutModeToggle />
            <PdvTip label="Voltar ao painel">
              <button
                className="pdv-ico pdv-ico-home"
                onClick={handleHome}
                type="button"
                title="Voltar ao painel"
                aria-label="Voltar ao painel"
              >
                <Home size={22} strokeWidth={2.2} aria-hidden="true" />
              </button>
            </PdvTip>
            {!isClassic ? (
              <>
                <PdvTip label="Carrinho">
                  <button
                    className="pdv-ico pdv-ico-cart"
                    type="button"
                    aria-label="Carrinho"
                    aria-current={location.pathname === "/client/caixa" || location.pathname === "/client/pdv" ? "page" : undefined}
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
              </>
            ) : null}
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

        {!isClassic ? (
          <div className="pdv-strip">
            <MenuBar uiConfig={uiConfig} />

            <div className="pdv-toolbar">
              <div className="pdv-toolbar-start">{closeDemoButton}</div>
              <div className="pdv-toolbar-end">
                {periodControl}
                <StoreCluster
                  stores={stores}
                  value={storeId}
                  onChange={requestStoreChange}
                  onHome={handleHome}
                />
              </div>
            </div>
          </div>
        ) : onDashboard && (closeDemoButton || periodControl) ? (
          <div className="pdvc-tools">
            {closeDemoButton}
            {periodControl}
          </div>
        ) : null}

        <main
          className={variant === "form" ? "pdv-main pdv-main-form" : "pdv-main"}
          id="pdv-main"
        >
          {children}
        </main>

        <ClassicDrawer
          open={isClassic && drawerOpen}
          storeName={storeName}
          uiConfig={uiConfig}
          onClose={() => setDrawerOpen(false)}
          onCart={goCaixa}
          onConfig={() => setChromeModal("config")}
          onSupport={() => setChromeModal("support")}
        />

        <ConfigModal
          open={chromeModal === "config"}
          onClose={() => setChromeModal(null)}
          uiConfig={uiConfig}
        />
        <SupportModal open={chromeModal === "support"} onClose={() => setChromeModal(null)} />
        <LogoModal
          open={chromeModal === "logo"}
          storeKey={storeId}
          storeName={storeName}
          onClose={() => setChromeModal(null)}
          onSaved={() => setLogoTick((value) => value + 1)}
        />

        {pendingStore ? (
          <div className="pdv-confirm-scrim">
            <div
              className="pdv-confirm-card"
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="pdv-store-confirm-title"
            >
              <p id="pdv-store-confirm-title">
                Deseja realmente sair da loja {currentStore?.name} para acessar a loja{" "}
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

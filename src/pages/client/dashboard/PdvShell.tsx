import { createContext, FormEvent, ReactNode, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ChevronDown,
  Headphones,
  Home,
  LogOut,
  Image,
  Menu,
  Search,
  Settings,
  ShoppingCart,
  UserRound,
} from "lucide-react";
import { useClientAuth } from "../../../hooks/clientAuth";
import { PageJumps } from "./PageJumps";
import { api } from "../../../services/api";
import { usePdvLayoutMode } from "../../../store/pdvLayoutMode";
import { CAIXA_STORAGE_KEY, NENHUM_CAIXA, STORE_STORAGE_KEY, toStoreOption, type StoreOption } from "./mockData";
import MenuBar from "./MenuBar";
import ClassicDrawer from "./ClassicDrawer";
import PdvTip from "./PdvTip";
import ConfigModal from "./ConfigModal";
import SupportModal from "./SupportModal";
import LogoModal from "./LogoModal";
import { BankSwitchButton, BankSwitchOverlay, useBankSwitch } from "./BankSwitch";
import {
  EMPTY_PDV_UI_CONFIG,
  normalizePdvUiConfig,
  type PdvUiConfig,
} from "./pdvUiConfig";
import { openMenuHref, searchMenus } from "./menuData";
import { aquecerCatalogoPedido } from "../vendas/pedidoCatalogo";
import { aquecerTransferencias } from "../movimentacoes/transferenciasCache";
import { aguardandoEvento, bloqueioDaRota, carregarEventos, observarEventos, publicarSessao } from "../cadastros/usuarios/acessoEvento";
import "./dashboard.css";
import "./dashboard-classic.css";
import "./pdv-modals.css";

type PdvSession = {
  query: string;
  storeId: string;
  storeName: string;
  storeOwner: string;
  stores: StoreOption[];
  openStoreLogo: () => void;
};

const PdvSessionContext = createContext<PdvSession>({
  query: "",
  storeId: "",
  storeName: "",
  storeOwner: "",
  stores: [],
  openStoreLogo: () => undefined,
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
            <span>{selected?.name || "Lista de lojas"}</span>
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

export { PageJumps } from "./PageJumps";

type StoredLogo = { url: string; fileId: string };

const logoCache = new Map<string, StoredLogo>();
const LOGO_STORAGE = "pdv-store-logo:";

function rememberLogo(storeId: string): StoredLogo | null {
  if (!storeId) return null;
  const cached = logoCache.get(storeId);
  if (cached?.url) return cached;
  try {
    const raw = localStorage.getItem(LOGO_STORAGE + storeId);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredLogo;
    if (!parsed?.url || !parsed.fileId) return null;
    logoCache.set(storeId, parsed);
    return parsed;
  } catch {
    return null;
  }
}

function rememberLogoUrl(storeId: string) {
  return rememberLogo(storeId)?.url || null;
}

function shrinkLogo(blob: Blob) {
  return new Promise<string | null>((resolve) => {
    const objectUrl = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const size = 96;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx || !img.width || !img.height) {
        URL.revokeObjectURL(objectUrl);
        resolve(null);
        return;
      }
      const scale = Math.min(size / img.width, size / img.height);
      const width = img.width * scale;
      const height = img.height * scale;
      ctx.clearRect(0, 0, size, size);
      ctx.drawImage(img, (size - width) / 2, (size - height) / 2, width, height);
      URL.revokeObjectURL(objectUrl);
      resolve(canvas.toDataURL("image/webp", 0.82));
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(null);
    };
    img.src = objectUrl;
  });
}

const ShellFrame = createContext<null | { setClassName: (value?: string) => void }>(null);

export default function PdvShell(props: {
  children: ReactNode;
  onClosePanels?: () => void;
  onHome?: () => void;
  variant?: "board" | "form";
  className?: string;
  showStrip?: boolean;
}) {
  const frame = useContext(ShellFrame);
  useEffect(() => {
    if (!frame) return;
    frame.setClassName(props.className);
    return () => frame.setClassName(undefined);
  }, [frame, props.className]);
  if (frame) return props.children;
  return <PdvShellHost {...props} />;
}

function PdvShellHost(props: {
  children: ReactNode;
  onClosePanels?: () => void;
  onHome?: () => void;
  variant?: "board" | "form";
  className?: string;
  showStrip?: boolean;
}) {
  const [pageClass, setPageClass] = useState<string | undefined>();
  const frame = useMemo(() => ({ setClassName: setPageClass }), []);
  const className = [props.className, pageClass].filter(Boolean).join(" ") || undefined;
  return (
    <ShellFrame.Provider value={frame}>
      <PdvShellView {...props} className={className} />
    </ShellFrame.Provider>
  );
}

function PdvShellView({
  children,
  onClosePanels,
  onHome,
  variant = "board",
  className,
  showStrip = true,
}: {
  children: ReactNode;
  onClosePanels?: () => void;
  onHome?: () => void;
  variant?: "board" | "form";
  className?: string;
  showStrip?: boolean;
}) {
  const { client, clientLogout } = useClientAuth();
  const navigate = useNavigate();
  const location = useLocation();
  useLayoutEffect(() => {
    const main = document.getElementById("pdv-main");
    if (main) main.scrollTop = 0;
    window.scrollTo(0, 0);
  }, [location.pathname, location.search]);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLFormElement>(null);
  const menuHits = useMemo(() => searchMenus(query), [query]);
  const [storeId, setStoreId] = useState(readStoredStoreId);
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [pendingStoreId, setPendingStoreId] = useState<string | null>(null);
  const [chromeModal, setChromeModal] = useState<"config" | "support" | "logo" | null>(null);
  const bank = useBankSwitch();
  const [uiConfig, setUiConfig] = useState<PdvUiConfig>(EMPTY_PDV_UI_CONFIG);
  const [logoSrc, setLogoSrc] = useState<string | null>(() => rememberLogoUrl(readStoredStoreId()));
  const [logoTick, setLogoTick] = useState(0);
  const layoutMode = usePdvLayoutMode((state) => state.mode);
  const isClassic = layoutMode === "classic";
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [eventoTick, setEventoTick] = useState(0);

  useEffect(() => {
    aquecerCatalogoPedido();
    aquecerTransferencias();
    return observarEventos(() => setEventoTick((value) => value + 1));
  }, []);

  useEffect(() => {
    let ativo = true;
    if (!client) {
      publicarSessao({ pronto: true, catalogo: false, eventos: null });
      return;
    }
    publicarSessao({ pronto: false, catalogo: false, eventos: null });
    carregarEventos(client.email, client.username)
      .then((proxima) => {
        if (ativo) publicarSessao(proxima);
      })
      .catch(() => {
        if (ativo) publicarSessao({ pronto: true, catalogo: false, eventos: null });
      });
    return () => {
      ativo = false;
    };
  }, [client]);

  const currentStore = stores.find((item) => item.id === storeId) ?? stores[0];
  const storeName = currentStore?.name ?? "";
  const storeOwner = currentStore?.owner ?? "";
  const pendingStore = stores.find((item) => item.id === pendingStoreId);

  useEffect(() => {
    let active = true;
    api
      .get("/clients/stores")
      .then(async ({ data }) => {
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
        const named = await Promise.all(list.map(async (item) => {
          try {
            const loja = await api.get(`/clients/stores/${item.id}/loja`);
            const fantasia = String(loja.data?.store?.dados?.geral?.fantasia || "").trim();
            if (!fantasia) return item;
            return toStoreOption({ id: item.id, name: item.name, storeCode: item.code, fantasia, owner: item.owner });
          } catch {
            return item;
          }
        }));
        if (!active) return;
        setStores(named);
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
    function onStoreName(event: Event) {
      const detail = (event as CustomEvent<{ id?: string; name?: string }>).detail;
      const id = detail?.id;
      const fantasia = String(detail?.name || "").trim();
      if (!id || !fantasia) return;
      setStores((current) => current.map((item) => (
        item.id === id ? toStoreOption({ id: item.id, name: fantasia, storeCode: item.code, fantasia, owner: item.owner }) : item
      )));
    }
    window.addEventListener("pdv-store-name", onStoreName);
    return () => window.removeEventListener("pdv-store-name", onStoreName);
  }, []);

  useEffect(() => {
    if (!storeId) return;
    const remembered = rememberLogo(storeId);
    if (remembered) setLogoSrc(remembered.url);
    let active = true;

    api
      .get("/clients/store-logo/current", {
        params: { storeKey: storeId },
        responseType: "blob",
      })
      .then(async (response) => {
        if (!active) return;
        const fileId = String(response.headers?.["x-logo-file"] || "");
        const blob = response.data as Blob;
        if (response.status === 204 || !blob?.size) {
          if (!rememberLogo(storeId)) setLogoSrc(null);
          return;
        }
        const cached = logoCache.get(storeId);
        if (cached?.fileId && fileId && cached.fileId === fileId && cached.url.startsWith("blob:")) {
          setLogoSrc(cached.url);
          return;
        }
        const url = URL.createObjectURL(blob);
        logoCache.set(storeId, { url, fileId: fileId || cached?.fileId || "atual" });
        setLogoSrc(url);
        const preview = await shrinkLogo(blob);
        if (!active || !preview) return;
        try {
          localStorage.setItem(LOGO_STORAGE + storeId, JSON.stringify({ url: preview, fileId: fileId || "atual" }));
        } catch {
          /* a prévia fica só nesta sessão */
        }
      })
      .catch(() => {
        if (active && !rememberLogo(storeId)) setLogoSrc(null);
      });

    return () => {
      active = false;
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
        if (chromeModal || location.pathname === "/client/pdv") return;
        event.preventDefault();
        document.getElementById("pdv-q")?.focus();
      }
      if (event.key === "Escape" && pendingStoreId) {
        setPendingStoreId(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pendingStoreId, chromeModal, location.pathname]);

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

  function onLogoClick() {
    setQuery("");
    closePanels();
    onHome?.();
    if (location.pathname !== "/client/dashboard") {
      navigate("/client/dashboard");
      return;
    }
    window.location.reload();
  }

  function onSearch(event: FormEvent) {
    event.preventDefault();
    const first = menuHits[0];
    if (!first) return;
    setQuery("");
    setSearchOpen(false);
    openMenuHref(first.href, navigate);
  }

  function openMenuHit(href: string) {
    setQuery("");
    setSearchOpen(false);
    openMenuHref(href, navigate);
  }

  useEffect(() => {
    function onPointer(event: MouseEvent) {
      if (!searchRef.current?.contains(event.target as Node)) setSearchOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, []);

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

  const onDashboard = location.pathname === "/client/dashboard";
  const onSale = location.pathname === "/client/pdv" || location.pathname.startsWith("/client/movimentacoes/compras/nova");
  const showMenu = showStrip && !isClassic && !onSale;

  // Fechar demonstrativo e o filtro de período ficam fora da tela por enquanto.
  // const showCloseDemo = isDashboardVisible(uiConfig, "close-demo");
  // const showPeriod = isDashboardVisible(uiConfig, "period");
  // const closeDemoButton = showCloseDemo ? (
  //   <PdvTip label="Clique aqui para fechar todas as caixas.">
  //     <button className="pdv-close-demo" onClick={closePanels} type="button">
  //       Fechar demonstrativo
  //     </button>
  //   </PdvTip>
  // ) : null;
  // const periodControl = showPeriod ? <div className="pdv-period">Período</div> : null;
  const closeDemoButton = null;
  const periodControl = null;

  return (
    <PdvUiConfigContext.Provider value={uiConfig}>
    <PdvSessionContext.Provider value={{ query, storeId, storeName, storeOwner, stores, openStoreLogo: () => setChromeModal("logo") }}>
      <div
        className={className ? `pdv-root ${className}` : "pdv-root"}
        data-surface="cream"
        data-layout={layoutMode}
        data-pdv={onSale ? "sale" : undefined}
        lang="pt-BR"
      >
        <a className="pdv-skip" href="#pdv-main">
          Ir para o conteúdo
        </a>

        {onSale ? null : (
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
            <div className="pdv-logo-wrap">
              <button
                className="pdv-store-logo"
                type="button"
                aria-label={onDashboard ? "Recarregar painel" : "Voltar ao painel"}
                data-has-logo={logoSrc ? "true" : undefined}
                onClick={onLogoClick}
              >
                {logoSrc ? <img className="pdv-store-logo-img" src={logoSrc} alt="" /> : null}
              </button>
              <button
                className="pdv-logo-edit"
                type="button"
                aria-label="Alterar logo da loja"
                onClick={(event) => {
                  event.stopPropagation();
                  setChromeModal("logo");
                }}
              >
                <Image size={14} strokeWidth={2.2} aria-hidden="true" />
                Alterar logo da loja
              </button>
            </div>
            {showMenu ? <MenuBar uiConfig={uiConfig} /> : null}
            {isClassic ? (
              <StoreCluster
                stores={stores}
                value={storeId}
                onChange={requestStoreChange}
                onHome={handleHome}
                home={false}
              />
            ) : null}
          </div>

          <form className="pdv-search" onSubmit={onSearch} role="search" ref={searchRef}>
            <label htmlFor="pdv-q" className="pdv-search-head">Pesquisa de Menu</label>
            <div className="pdv-search-row">
              <Search className="pdv-search-icon" size={16} aria-hidden="true" />
              <input
                id="pdv-q"
                className="pdv-search-input"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setSearchOpen(true);
                }}
                onFocus={() => setSearchOpen(true)}
                type="search"
                autoComplete="off"
                aria-expanded={searchOpen && query.trim() ? true : undefined}
                aria-controls="pdv-menu-results"
                placeholder="Pesquisa de Menu"
              />
              {searchOpen && query.trim() ? (
                <div className="pdv-search-results" id="pdv-menu-results">
                  {menuHits.length === 0 ? (
                    <p className="pdv-search-empty">Nada encontrado no menu.</p>
                  ) : (
                    <ul>
                      {menuHits.map((hit) => {
                        const aviso = bloqueioDaRota(hit.href);
                        return (
                        <li key={hit.id}>
                          <button type="button" className="pdv-search-hit" title={aviso || undefined} data-locked={aviso ? "true" : undefined} onClick={() => { if (!aviso) openMenuHit(hit.href); }}>
                            <strong>{hit.label}</strong>
                            {hit.trail ? <small>{hit.trail}</small> : null}
                          </button>
                        </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              ) : null}
            </div>
          </form>

          <div className="pdv-header-side">
          <nav className="pdv-icons" aria-label="Atalhos">
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
            <BankSwitchButton onClick={bank.goToBank} />
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
            <PdvTip label="Meu perfil / trocar senha">
              <button
                className="pdv-ico pdv-ico-profile"
                type="button"
                aria-label="Meu perfil / trocar senha"
                aria-current={location.pathname === "/client/trocar-senha" ? "page" : undefined}
                onClick={() => navigate("/client/trocar-senha")}
              >
                <UserRound size={22} strokeWidth={2.2} aria-hidden="true" />
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
          {showMenu ? (
            <StoreCluster
              stores={stores}
              value={storeId}
              onChange={requestStoreChange}
              onHome={handleHome}
            />
          ) : null}
          </div>
        </header>
        )}

        {/* No PDV (/client/pdv) o menu Cadastros, Movimentações, Relatórios e a lista de lojas ficam fora. */}
        {showStrip && onDashboard && (closeDemoButton || periodControl) ? (
          <div className="pdvc-tools">
            {closeDemoButton}
            {periodControl}
          </div>
        ) : null}

        <main
          className={variant === "form" ? "pdv-main pdv-main-form" : "pdv-main"}
          id="pdv-main"
        >
          {(() => {
            const aqui = `${location.pathname}${location.search}`;
            if (aguardandoEvento(aqui)) return null;
            const trava = eventoTick >= 0 ? bloqueioDaRota(aqui) : "";
            if (trava) return <p className="pdv-evento-aviso">{trava}</p>;
            return children;
          })()}
        </main>
        <PageJumps />

        <ClassicDrawer
          open={isClassic && drawerOpen}
          storeName={storeName}
          uiConfig={uiConfig}
          onClose={() => setDrawerOpen(false)}
          onCart={goCaixa}
          onBank={bank.goToBank}
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

        {bank.phase === "run" || bank.phase === "error" ? (
          <BankSwitchOverlay phase={bank.phase} message={bank.message} onClose={bank.close} />
        ) : null}

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

import { useEffect, useState, type MouseEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Headphones, Settings, ShoppingCart, Star, X } from "lucide-react";
import { PDV_MENUS, hasKnownChildren, type PdvMenuItem, type PdvMenuRoot } from "./menuData";
import { filterMenuItems, isNavVisible, type PdvNavId, type PdvUiConfig } from "./pdvUiConfig";

/**
 * Drawer do layout Clássico: concentra a menubar (Cadastros/Movimentações/
 * Relatórios) e os atalhos secundários do header em um painel lateral,
 * deixando o header em uma linha só. Usado apenas com data-layout="classic".
 */

/** Acordeão exclusivo: dentro de um mesmo nível, abrir um item fecha os irmãos. */
function useExclusiveOpen() {
  const [openId, setOpenId] = useState<string | null>(null);

  function toggleProps(id: string) {
    return {
      open: openId === id,
      onSummaryClick(event: MouseEvent<HTMLElement>) {
        // Impede o toggle nativo do <details>; o estado passa a mandar.
        event.preventDefault();
        setOpenId((current) => (current === id ? null : id));
      },
    };
  }

  return toggleProps;
}

function DrawerItems({
  items,
  onNavigate,
}: {
  items: PdvMenuItem[];
  onNavigate: (href: string) => void;
}) {
  const toggleProps = useExclusiveOpen();

  return (
    <ul className="pdvd-list">
      {items.map((item) => (
        <li key={item.id}>
          {hasKnownChildren(item) ? (
            <details className="pdvd-group" open={toggleProps(item.id).open}>
              <summary className="pdvd-item" onClick={toggleProps(item.id).onSummaryClick}>
                <span className="pdvd-item-label">
                  {item.label}
                  {item.starred ? (
                    <Star className="pdvd-star" size={13} fill="currentColor" aria-hidden="true" />
                  ) : null}
                </span>
                <ChevronRight className="pdvd-caret" size={15} aria-hidden="true" />
              </summary>
              <DrawerItems items={item.children ?? []} onNavigate={onNavigate} />
            </details>
          ) : (
            <button
              className="pdvd-item"
              type="button"
              onClick={() => {
                if (item.href) onNavigate(item.href);
              }}
            >
              <span className="pdvd-item-label">
                {item.label}
                {item.starred ? (
                  <Star className="pdvd-star" size={13} fill="currentColor" aria-hidden="true" />
                ) : null}
              </span>
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

export default function ClassicDrawer({
  open,
  storeName,
  uiConfig,
  onClose,
  onCart,
  onConfig,
  onSupport,
}: {
  open: boolean;
  storeName: string;
  uiConfig: PdvUiConfig;
  onClose: () => void;
  onCart: () => void;
  onConfig: () => void;
  onSupport: () => void;
}) {
  const navigate = useNavigate();
  const rootToggleProps = useExclusiveOpen();

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const menus = PDV_MENUS.flatMap((root) => {
    if (!isNavVisible(uiConfig, root.id as PdvNavId)) return [];
    const items = filterMenuItems(root.items, uiConfig, root.id as PdvNavId);
    return [{ ...root, items } satisfies PdvMenuRoot];
  });

  function go(href: string) {
    onClose();
    navigate(href);
  }

  function run(action: () => void) {
    onClose();
    action();
  }

  return (
    <div className="pdvd-scrim" onClick={onClose}>
      <aside
        className="pdvd-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Menu do painel"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="pdvd-head">
          <div className="pdvd-head-text">
            <p className="pdvd-kicker">Menu</p>
            <p className="pdvd-store">{storeName || "Painel da loja"}</p>
          </div>
          <button
            className="pdvd-close"
            type="button"
            aria-label="Fechar menu"
            autoFocus
            onClick={onClose}
          >
            <X size={18} strokeWidth={2.2} aria-hidden="true" />
          </button>
        </div>

        <div className="pdvd-body">
          <nav aria-label="Menus">
            {menus.map((root) => (
              <details key={root.id} className="pdvd-root" open={rootToggleProps(root.id).open}>
                <summary
                  className="pdvd-root-trigger"
                  onClick={rootToggleProps(root.id).onSummaryClick}
                >
                  {root.label}
                  <ChevronRight className="pdvd-caret" size={16} aria-hidden="true" />
                </summary>
                <DrawerItems items={root.items} onNavigate={go} />
              </details>
            ))}
          </nav>

          <div className="pdvd-sep" role="presentation" />

          <p className="pdvd-kicker pdvd-kicker-pad">Ações</p>
          <div className="pdvd-actions">
            <button type="button" onClick={() => run(onCart)}>
              <ShoppingCart size={17} strokeWidth={2.2} aria-hidden="true" />
              Caixa / Carrinho
            </button>
            <button type="button" onClick={() => run(onConfig)}>
              <Settings size={17} strokeWidth={2.2} aria-hidden="true" />
              Configurar sistema
            </button>
            <button type="button" onClick={() => run(onSupport)}>
              <Headphones size={17} strokeWidth={2.2} aria-hidden="true" />
              Canais de atendimento
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}

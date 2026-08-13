import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent, type ReactNode, type RefObject } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ChevronRight, Star } from "lucide-react";
import {
  PDV_MENUS,
  hasKnownChildren,
  showsSubmenuArrow,
  type PdvMenuItem,
  type PdvMenuRoot,
} from "./menuData";
import { filterMenuItems, isNavVisible, type PdvNavId, type PdvUiConfig } from "./pdvUiConfig";

function pathStartsWith(openPath: string[], prefix: string[]) {
  return prefix.every((id, index) => openPath[index] === id);
}

function useFinePointer() {
  const [fine, setFine] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(hover: hover) and (pointer: fine)").matches
      : false,
  );

  useEffect(() => {
    const media = window.matchMedia("(hover: hover) and (pointer: fine)");
    const sync = () => setFine(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  return fine;
}

function CascadeFlyout({
  open,
  anchorRef,
  children,
}: {
  open: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  children: ReactNode;
}) {
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) return;

    const place = () => {
      const box = anchorRef.current?.getBoundingClientRect();
      if (!box) return;
      setPos({ top: box.top, left: box.right - 1 });
    };

    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, anchorRef]);

  if (!open) return null;

  return (
    <div className="pdv-menu-flyout" style={{ top: pos.top, left: pos.left }}>
      {children}
    </div>
  );
}

function MenuRow({
  item,
  parentPath,
  openPath,
  setOpenPath,
  finePointer,
}: {
  item: PdvMenuItem;
  parentPath: string[];
  openPath: string[];
  setOpenPath: (path: string[]) => void;
  finePointer: boolean;
}) {
  const navigate = useNavigate();
  const rowRef = useRef<HTMLLIElement>(null);
  const itemPath = [...parentPath, item.id];
  const canOpen = hasKnownChildren(item);
  const flyoutOpen = canOpen && pathStartsWith(openPath, itemPath);
  const showArrow = showsSubmenuArrow(item);

  function openBranch() {
    if (canOpen) setOpenPath(itemPath);
    else setOpenPath(parentPath);
  }

  function onClick() {
    if (!canOpen) {
      if (item.href) navigate(item.href);
      if (!showArrow) setOpenPath([]);
      return;
    }

    if (finePointer) {
      setOpenPath(itemPath);
      return;
    }

    setOpenPath(flyoutOpen ? parentPath : itemPath);
  }

  return (
    <li
      ref={rowRef}
      className="pdv-menu-row"
      onMouseEnter={() => {
        if (finePointer) openBranch();
      }}
    >
      <button
        className="pdv-menu-item"
        type="button"
        data-active={flyoutOpen ? "true" : undefined}
        aria-expanded={canOpen ? flyoutOpen : undefined}
        aria-haspopup={canOpen ? "true" : undefined}
        aria-label={item.starred ? `${item.label}, favorito` : undefined}
        onClick={onClick}
      >
        <span className="pdv-menu-label">
          {item.label}
          {item.starred ? (
            <Star className="pdv-menu-star" size={14} fill="currentColor" aria-hidden="true" />
          ) : null}
        </span>
        {showArrow ? <ChevronRight className="pdv-menu-arrow" size={14} aria-hidden="true" /> : null}
      </button>
      <CascadeFlyout open={Boolean(flyoutOpen && item.children)} anchorRef={rowRef}>
        <MenuBranch
          items={item.children ?? []}
          parentPath={itemPath}
          openPath={openPath}
          setOpenPath={setOpenPath}
          finePointer={finePointer}
        />
      </CascadeFlyout>
    </li>
  );
}

function MenuBranch({
  items,
  parentPath,
  openPath,
  setOpenPath,
  finePointer,
}: {
  items: PdvMenuItem[];
  parentPath: string[];
  openPath: string[];
  setOpenPath: (path: string[]) => void;
  finePointer: boolean;
}) {
  return (
    <ul className="pdv-menu-list">
      {items.map((item) => (
        <MenuRow
          key={item.id}
          item={item}
          parentPath={parentPath}
          openPath={openPath}
          setOpenPath={setOpenPath}
          finePointer={finePointer}
        />
      ))}
    </ul>
  );
}

export default function MenuBar({ uiConfig }: { uiConfig: PdvUiConfig }) {
  const [openPath, setOpenPath] = useState<string[]>([]);
  const finePointer = useFinePointer();
  const navRef = useRef<HTMLElement>(null);
  const closeTimer = useRef<number>();
  const visibleMenus = PDV_MENUS.flatMap((root) => {
    if (!isNavVisible(uiConfig, root.id as PdvNavId)) return [];
    const items = filterMenuItems(root.items, uiConfig, root.id as PdvNavId);
    return [{ ...root, items } satisfies PdvMenuRoot];
  });

  function cancelClose() {
    window.clearTimeout(closeTimer.current);
  }

  function scheduleClose() {
    cancelClose();
    closeTimer.current = window.setTimeout(() => setOpenPath([]), 140);
  }

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!navRef.current?.contains(event.target as Node)) setOpenPath([]);
    }

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenPath([]);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => () => cancelClose(), []);

  return (
    <nav
      ref={navRef}
      className="pdv-menubar"
      aria-label="Menus"
      data-open={openPath.length ? "true" : undefined}
      onMouseEnter={() => {
        if (finePointer) cancelClose();
      }}
      onMouseLeave={() => {
        if (finePointer) scheduleClose();
      }}
    >
      {visibleMenus.map((root) => {
        const open = openPath[0] === root.id;

        function onTriggerClick(event: MouseEvent<HTMLButtonElement>) {
          const keyboard = event.detail === 0;
          if (finePointer && !keyboard && open) return;
          setOpenPath(open ? [] : [root.id]);
        }

        return (
          <div key={root.id} className="pdv-dd" data-open={open ? "true" : undefined}>
            <button
              className="pdv-dd-trigger"
              type="button"
              aria-expanded={open}
              aria-haspopup="true"
              onClick={onTriggerClick}
              onMouseEnter={() => {
                if (finePointer) setOpenPath([root.id]);
              }}
            >
              {root.label}
              <ChevronDown size={16} aria-hidden="true" />
            </button>
            {open ? (
              <div className="pdv-menu-panel">
                <MenuBranch
                  items={root.items}
                  parentPath={[root.id]}
                  openPath={openPath}
                  setOpenPath={setOpenPath}
                  finePointer={finePointer}
                />
              </div>
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}

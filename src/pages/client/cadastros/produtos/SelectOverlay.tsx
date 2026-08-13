import { ReactNode, RefObject, useEffect } from "react";
import { Search, X } from "lucide-react";

export function useDismissable(
  open: boolean,
  onClose: () => void,
  ref: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!ref.current?.contains(event.target as Node)) onClose();
    }

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, ref]);
}

export function OverlaySearch({
  value,
  onChange,
  extra,
}: {
  value: string;
  onChange: (next: string) => void;
  extra?: ReactNode;
}) {
  return (
    <div className="pdv-prod-overlay-search">
      {extra}
      <Search size={14} strokeWidth={2.2} aria-hidden="true" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Pesquisar..."
        autoComplete="off"
      />
      <button type="button" aria-label="Limpar pesquisa" onClick={() => onChange("")}>
        <X size={12} strokeWidth={2.6} aria-hidden="true" />
      </button>
    </div>
  );
}

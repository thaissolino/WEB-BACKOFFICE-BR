import { ReactNode, useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import "./pdv-modals.css";

const FOCUSABLE =
  'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function PdvOverlayModal({
  open,
  title,
  titleId,
  size,
  icon,
  footer,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  titleId?: string;
  size: "wide" | "support" | "form";
  icon: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  children: ReactNode;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const fallbackId = useId();
  const labelledBy = titleId ?? fallbackId;
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;

    const card = cardRef.current;
    const previous = document.activeElement as HTMLElement | null;
    const closeBtn = card?.querySelector<HTMLElement>("[data-pdv-modal-close]");
    closeBtn?.focus();

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab" || !card) return;
      const list = Array.from(card.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => !el.hasAttribute("disabled") && el.tabIndex !== -1,
      );
      if (list.length === 0) return;
      const first = list[0];
      const last = list[list.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
      previous?.focus?.();
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="pdv-modal-scrim"
      data-size={size}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={cardRef}
        className="pdv-modal-card"
        data-size={size}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
      >
        <div className="pdv-modal-head">
          <span className="pdv-modal-mark" data-tone={size === "support" ? "support" : size === "form" ? "logo" : undefined} aria-hidden="true">
            {icon}
          </span>
          <h2 className="pdv-modal-title" id={labelledBy}>
            {title}
          </h2>
          <button
            className="pdv-modal-close"
            type="button"
            aria-label="Fechar"
            data-pdv-modal-close=""
            onClick={onClose}
          >
            <X size={22} strokeWidth={2.2} aria-hidden="true" />
          </button>
        </div>
        <div className="pdv-modal-body">{children}</div>
        {footer ? <div className="pdv-modal-foot">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  );
}

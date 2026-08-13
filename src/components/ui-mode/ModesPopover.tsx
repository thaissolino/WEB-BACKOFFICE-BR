import { useEffect, useId, useRef, useState } from "react";
import { IconButton, Popover } from "@mui/material";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import { PAGE_MODE_KEYS } from "../../store/uiMode";
import { useUiModeStore } from "../../store/uiModeStore";
import "./ModesPopover.css";

export function ModesPopover({ variant = "classic" }: { variant?: "classic" | "premium" }) {
  const titleId = useId();
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const [open, setOpen] = useState(false);
  const globalMode = useUiModeStore((state) => state.globalMode);
  const pages = useUiModeStore((state) => state.pages);
  const setGlobalMode = useUiModeStore((state) => state.setGlobalMode);
  const setPageEnabled = useUiModeStore((state) => state.setPageEnabled);
  const isPremiumChrome = variant === "premium";

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      {isPremiumChrome ? (
        <button
          ref={buttonRef}
          className="pdv-chrome-icon"
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-label="Alterar modos da interface"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={open ? "modes-popover" : undefined}
        >
          <SettingsOutlinedIcon fontSize="small" />
        </button>
      ) : (
        <IconButton
          ref={buttonRef}
          onClick={() => setOpen((current) => !current)}
          aria-label="Alterar modos da interface"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={open ? "modes-popover" : undefined}
        >
          <SettingsOutlinedIcon />
        </IconButton>
      )}
      <Popover
        id="modes-popover"
        open={open}
        anchorEl={buttonRef.current}
        onClose={() => setOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        PaperProps={{
          role: "dialog",
          "aria-labelledby": titleId,
          className: "modes-popover",
          sx: {
            mt: 1.25,
            width: { xs: "min(92vw, 360px)", sm: 360 },
            maxHeight: "min(48vh, 420px)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            p: 0,
            bgcolor: "#1a1714",
          },
        }}
      >
        <div className="modes-popover__head">
          <p className="modes-popover__kicker">GestorVix</p>
          <h2 className="modes-popover__title" id={titleId}>
            Alterar modos
          </h2>
          <p className="modes-popover__hint">
            Clássico mantém o layout atual. Premium só entra onde a página estiver ligada.
          </p>

          <div className="modes-popover__seg" role="group" aria-label="Modo global">
            <button
              type="button"
              aria-pressed={globalMode === "classic"}
              onClick={() => setGlobalMode("classic")}
            >
              Clássico
            </button>
            <button
              type="button"
              aria-pressed={globalMode === "premium"}
              onClick={() => setGlobalMode("premium")}
            >
              Premium
            </button>
          </div>

          {globalMode === "classic" ? (
            <p className="modes-popover__note">
              Modo clássico ativo: todas as páginas usam o layout original, mesmo com o toggle da
              página ligado.
            </p>
          ) : null}
        </div>

        <p className="modes-popover__list-label">Páginas</p>
        <ul className="modes-popover__list">
          {PAGE_MODE_KEYS.map((item) => (
            <li
              className="modes-popover__row"
              data-ready={item.premiumReady ? "true" : "false"}
              key={item.key}
            >
              <div className="modes-popover__copy">
                <p className="modes-popover__name">{item.label}</p>
                <p className="modes-popover__status">
                  {item.premiumReady ? "Layout premium disponível" : "Premium ainda não redesenhado"}
                </p>
              </div>
              <span className="modes-popover__toggle">
                <input
                  type="checkbox"
                  role="switch"
                  checked={pages[item.key]}
                  onChange={(event) => setPageEnabled(item.key, event.target.checked)}
                  aria-label={`Habilitar premium em ${item.label}`}
                />
                <i aria-hidden="true" />
              </span>
            </li>
          ))}
        </ul>
      </Popover>
    </>
  );
}

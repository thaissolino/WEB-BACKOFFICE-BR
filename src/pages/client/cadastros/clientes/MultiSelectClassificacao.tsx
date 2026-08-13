import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

export default function MultiSelectClassificacao({
  options,
  selected,
  onChange,
}: {
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const labelId = useId();

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

  function toggle(option: string) {
    onChange(selected.includes(option) ? selected.filter((item) => item !== option) : [...selected, option]);
  }

  const closedLabel = selected.length === 0 ? "Nenhum selecionado" : selected.join(", ");

  return (
    <div className="pdv-cad-ms" ref={wrapRef} data-open={open ? "true" : undefined}>
      <button
        className="pdv-cad-ms-trigger"
        type="button"
        aria-labelledby={labelId}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span>{closedLabel}</span>
        <ChevronDown size={16} aria-hidden="true" />
      </button>
      <span className="pdv-sr" id={labelId}>
        Classificação
      </span>
      {open ? (
        <ul className="pdv-cad-ms-list" role="listbox" aria-multiselectable="true" aria-label="Classificação">
          {options.map((option) => {
            const checked = selected.includes(option);
            return (
              <li key={option} role="option" aria-selected={checked}>
                <label>
                  <input type="checkbox" checked={checked} onChange={() => toggle(option)} />
                  {option}
                </label>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

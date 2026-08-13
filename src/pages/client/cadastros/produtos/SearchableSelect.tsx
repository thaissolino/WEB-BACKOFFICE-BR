import { useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { OverlaySearch, useDismissable } from "./SelectOverlay";

export default function SearchableSelect({
  value,
  onChange,
  options,
  emptyLabel = "<< Selecione >>",
  labelledBy,
}: {
  value: string;
  onChange: (next: string) => void;
  options: string[];
  emptyLabel?: string;
  labelledBy?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);
  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = [emptyLabel, ...options.filter((item) => item !== emptyLabel)];
    if (!q) return list;
    return list.filter((item) => item.toLowerCase().includes(q));
  }, [emptyLabel, options, query]);

  useDismissable(open, () => setOpen(false), wrapRef);

  const shown = value || emptyLabel;

  return (
    <div className="pdv-prod-select" ref={wrapRef} data-open={open ? "true" : undefined}>
      <button
        className="pdv-prod-select-trigger"
        type="button"
        aria-labelledby={labelledBy}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {
          setOpen((current) => !current);
          setQuery("");
        }}
      >
        <span>{shown}</span>
        <ChevronDown size={16} aria-hidden="true" />
      </button>
      {open ? (
        <div className="pdv-prod-overlay">
          <OverlaySearch value={query} onChange={setQuery} />
          <ul className="pdv-prod-opt-list" role="listbox" aria-label="Opções">
            {items.map((item, index) => {
              const active = item === shown || (shown === emptyLabel && index === 0);
              return (
                <li key={`${item}-${index}`}>
                  <button
                    className="pdv-prod-opt"
                    type="button"
                    role="option"
                    aria-selected={item === value}
                    data-active={active ? "true" : undefined}
                    onClick={() => {
                      onChange(item === emptyLabel ? "" : item);
                      setOpen(false);
                    }}
                  >
                    {item}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

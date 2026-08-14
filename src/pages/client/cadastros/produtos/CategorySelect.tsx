import { useMemo, useRef, useState } from "react";
import { ArrowLeftRight, ChevronDown } from "lucide-react";
import { OverlaySearch, useDismissable } from "./SelectOverlay";
import type { FlatOption } from "./categoryModel";

function matches(item: FlatOption, query: string) {
  if (!query) return true;
  return item.label.toLowerCase().includes(query);
}

export default function CategorySelect({
  selected,
  onChange,
  multiple = false,
  required = false,
  labelledBy,
  placeholder,
  options,
}: {
  selected: string[];
  onChange: (next: string[]) => void;
  multiple?: boolean;
  required?: boolean;
  labelledBy?: string;
  placeholder: string;
  options: FlatOption[];
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);
  const q = query.trim().toLowerCase();
  const items = useMemo(() => options.filter((item) => matches(item, q)), [options, q]);

  useDismissable(open, () => setOpen(false), wrapRef);

  const closedLabel =
    selected.length === 0
      ? placeholder
      : selected
          .map((id) => options.find((item) => item.id === id)?.label ?? id)
          .join(", ");

  function toggle(id: string) {
    if (!multiple) {
      onChange(id ? [id] : []);
      setOpen(false);
      return;
    }
    onChange(selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id]);
  }

  return (
    <div className="pdv-prod-select" ref={wrapRef} data-open={open ? "true" : undefined}>
      <button
        className="pdv-prod-select-trigger"
        type="button"
        aria-labelledby={labelledBy}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-required={required || undefined}
        data-invalid={required && selected.length === 0 ? "true" : undefined}
        onClick={() => {
          setOpen((current) => !current);
          setQuery("");
        }}
      >
        <span>{closedLabel}</span>
        <ChevronDown size={16} aria-hidden="true" />
      </button>
      {open ? (
        <div className="pdv-prod-overlay">
          <OverlaySearch
            value={query}
            onChange={setQuery}
            extra={<ArrowLeftRight size={14} strokeWidth={2.2} aria-hidden="true" />}
          />
          <ul
            className="pdv-prod-opt-list"
            role="listbox"
            aria-multiselectable={multiple || undefined}
            aria-label="Categoria"
          >
            <li>
              {multiple ? (
                <label className="pdv-prod-check">
                  <input
                    type="checkbox"
                    checked={false}
                    onChange={() => onChange([])}
                  />
                  Selecione
                </label>
              ) : (
                <button
                  className="pdv-prod-opt"
                  type="button"
                  role="option"
                  aria-selected={selected.length === 0}
                  data-active={selected.length === 0 ? "true" : undefined}
                  onClick={() => toggle("")}
                >
                  Selecione
                </button>
              )}
            </li>
            {items.map((item) => {
              const checked = selected.includes(item.id);
              const mark = item.depth > 0 ? `» ${item.label}` : item.label;
              if (multiple) {
                return (
                  <li key={item.id}>
                    <label className="pdv-prod-check" style={{ paddingLeft: 10 + item.depth * 18 }}>
                      <input type="checkbox" checked={checked} onChange={() => toggle(item.id)} />
                      {mark}
                    </label>
                  </li>
                );
              }
              return (
                <li key={item.id}>
                  <button
                    className="pdv-prod-opt"
                    type="button"
                    role="option"
                    aria-selected={checked}
                    data-active={checked ? "true" : undefined}
                    style={{ paddingLeft: 12 + item.depth * 18 }}
                    onClick={() => toggle(item.id)}
                  >
                    {mark}
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

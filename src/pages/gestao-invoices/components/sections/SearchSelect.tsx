import { ReactNode, useEffect, useRef, useState } from "react";

interface GenericSearchSelectProps<T> {
  items: T[];
  value: string;
  getLabel: (item: T) => ReactNode; // Suporta JSX com ícone e texto
  getId: (item: T) => string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
}

export function GenericSearchSelect<T>({
  items,
  value,
  onChange,
  getLabel,
  getId,
  label = "Selecione",
  placeholder = "Buscar...",
}: GenericSearchSelectProps<T>) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const getLabelAsString = (item: T) => {
    const label = getLabel(item);
    if (typeof label === "string") return label;
    const tempEl = document.createElement("div");
    tempEl.appendChild(document.createElement("span")).innerHTML = String(label);
    return tempEl.textContent || "";
  };

  const filtered = items.filter((item) => getLabelAsString(item).toLowerCase().includes(searchTerm.toLowerCase()));
  const selectedItem = items.find((item) => getId(item) === value);
  const selectedLabel = selectedItem ? getLabel(selectedItem) : label;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setFocusedIndex(-1); // Reset focus on close
      }
    };

    const handleKeyDownDocument = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        setFocusedIndex(-1); // Reset focus on close
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDownDocument);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDownDocument);
    };
  }, []);

  const handleKeyDownInput = (event: React.KeyboardEvent) => {
    if (isOpen && filtered.length > 0) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setFocusedIndex((prevIndex) => Math.min(prevIndex + 1, filtered.length - 1));
        if (listRef.current && focusedIndex + 1 < filtered.length) {
          listRef.current.children[focusedIndex + 1]?.scrollIntoView({ block: "nearest" });
        }
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setFocusedIndex((prevIndex) => Math.max(prevIndex - 1, -1));
        if (listRef.current && focusedIndex - 1 >= 0) {
          listRef.current.children[focusedIndex - 1]?.scrollIntoView({ block: "nearest" });
        }
      } else if (event.key === "Enter" && focusedIndex !== -1) {
        onChange(getId(filtered[focusedIndex]));
        setIsOpen(false);
        setSearchTerm("");
        setFocusedIndex(-1);
      }
    }
  };

  return (
    <div ref={dropdownRef} className="relative w-full ">
      {/* {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>} */}

      <div
        className="w-full border border-gray-300 rounded-md p-2 bg-white cursor-pointer flex items-center whitespace-nowrap overflow-hidden text-ellipsis"
        onClick={() => setIsOpen(!isOpen)}
      >
        {selectedLabel || label}
      </div>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-full border border-gray-300 bg-white rounded shadow">
          <input
            type="text"
            placeholder={placeholder}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setFocusedIndex(-1); // Reset focus on search
            }}
            onKeyDown={handleKeyDownInput}
            className="w-full p-2 border-b border-gray-200 focus:outline-none"
            autoFocus
          />
          <ul ref={listRef} className="max-h-48 overflow-y-auto">
            {filtered.map((item, index) => (
              <li
                key={getId(item)}
                onClick={() => {
                  onChange(getId(item));
                  setIsOpen(false);
                  setSearchTerm("");
                  setFocusedIndex(-1);
                }}
                className={`px-3 py-2 hover:bg-blue-100 cursor-pointer text-sm ${
                  index === focusedIndex ? "bg-blue-200" : ""
                }`}
              >
                {getLabel(item)}
              </li>
            ))}
            {filtered.length === 0 && <li className="px-3 py-2 text-gray-500 text-sm">Nenhum resultado</li>}
          </ul>
        </div>
      )}
    </div>
  );
}

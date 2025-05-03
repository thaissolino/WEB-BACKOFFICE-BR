import { useEffect, useRef, useState } from "react";

interface GenericSearchSelectProps<T> {
  items: T[];
  value: string;
  onChange: (value: string) => void;
  getLabel: (item: T) => string;
  getId: (item: T) => string;
  label?: string; // rótulo acima do campo
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

  const filtered = items.filter(item =>
    getLabel(item).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedItem = items.find(item => getId(item) === value);
  const selectedLabel = selectedItem ? getLabel(selectedItem) : "";

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

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
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-2 border-b border-gray-200 focus:outline-none"
            autoFocus
          />
          <ul className="max-h-48 overflow-y-auto">
            {filtered.map((item) => (
              <li
                key={getId(item)}
                onClick={() => {
                  onChange(getId(item));
                  setIsOpen(false);
                  setSearchTerm("");
                }}
                className="px-3 py-2 hover:bg-blue-100 cursor-pointer text-sm"
              >
                {getLabel(item)}
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-gray-500 text-sm">Nenhum resultado</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

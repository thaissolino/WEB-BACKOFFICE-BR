import React, { useState, useRef, useEffect } from "react";

type CellData = { [key: string]: string };

const SheetEditor: React.FC = () => {
  const [rows, setRows] = useState(20);
  const [cols, setCols] = useState(10);
  const [data, setData] = useState<CellData>({});
  const [selected, setSelected] = useState<string | null>(null);

  const inputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  const getCellValue = (cell: string): string => data[cell] || "";

  const handleChange = (key: string, value: string) => {
    setData((prev) => ({ ...prev, [key]: value }));
  };

  const handleKeyDown = (e: React.KeyboardEvent, row: number, col: number) => {
    const key = String.fromCharCode(65 + col) + row;
    const ref = inputRefs.current;

    if (e.key === "Enter" || e.key === "ArrowDown") {
      const next = `${String.fromCharCode(65 + col)}${row + 1}`;
      ref[next]?.focus();
    } else if (e.key === "ArrowRight") {
      const next = `${String.fromCharCode(65 + col + 1)}${row}`;
      ref[next]?.focus();
    } else if (e.key === "ArrowLeft") {
      const next = `${String.fromCharCode(65 + col - 1)}${row}`;
      ref[next]?.focus();
    } else if (e.key === "ArrowUp") {
      const next = `${String.fromCharCode(65 + col)}${row - 1}`;
      ref[next]?.focus();
    }
  };

  const parseFormula = (value: string): string => {
    try {
      if (!value.startsWith("=")) return value;
      const expr = value
        .substring(1)
        .replace(/[A-Z][0-9]+/g, (match) => parseFloat(data[match] || "0").toString());
      return eval(expr).toString();
    } catch {
      return "Erro";
    }
  };

  const renderTable = () => {
    const rowsArr = [];
    for (let r = 1; r <= rows; r++) {
      const colsArr = [];
      for (let c = 0; c < cols; c++) {
        const key = `${String.fromCharCode(65 + c)}${r}`;
        colsArr.push(
          <td key={key} className="border border-gray-300">
            <input
              ref={(el) => (inputRefs.current[key] = el)}
              value={data[key] || ""}
              onChange={(e) => handleChange(key, e.target.value)}
              onFocus={() => setSelected(key)}
              onBlur={() => {
                const val = data[key];
                if (val?.startsWith("=")) {
                  const result = parseFormula(val);
                  setData((prev) => ({ ...prev, [key]: result }));
                }
              }}
              onKeyDown={(e) => handleKeyDown(e, r, c)}
              className="w-full px-2 py-1 text-sm focus:outline-blue-500"
            />
          </td>
        );
      }
      rowsArr.push(
        <tr key={r}>
          <th className="bg-gray-200 w-8 border border-gray-300 text-center">{r}</th>
          {colsArr}
        </tr>
      );
    }
    return rowsArr;
  };

  return (
    <div className="bg-white shadow rounded-b-xl p-4">
      <div className="flex gap-2 mb-4 flex-wrap">
        <button
          onClick={() => setRows((prev) => prev + 1)}
          className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-full text-sm"
        >
          + Linha
        </button>
        <button
          onClick={() => setRows((prev) => Math.max(1, prev - 1))}
          className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-full text-sm"
        >
          - Linha
        </button>
        <button
          onClick={() => setCols((prev) => prev + 1)}
          className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-full text-sm"
        >
          + Coluna
        </button>
        <button
          onClick={() => setCols((prev) => Math.max(1, prev - 1))}
          className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-full text-sm"
        >
          - Coluna
        </button>
        <button
          onClick={() => alert("Salvar implementado depois")}
          className="bg-blue-700 hover:bg-blue-800 text-white px-3 py-1 rounded-full text-sm"
        >
          Salvar
        </button>
        <button
          onClick={() => alert("Voltar implementado depois")}
          className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded-full text-sm"
        >
          Voltar
        </button>
      </div>

      <div className="overflow-auto border rounded">
        <table className="w-full border-collapse table-fixed text-sm">
          <thead>
            <tr>
              <th className="w-8 bg-gray-200 border border-gray-300">#</th>
              {Array.from({ length: cols }).map((_, i) => (
                <th key={i} className="bg-gray-200 border border-gray-300 text-center font-medium">
                  {String.fromCharCode(65 + i)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{renderTable()}</tbody>
        </table>
      </div>
    </div>
  );
};

export default SheetEditor;

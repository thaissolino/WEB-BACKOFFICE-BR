import React from "react";

interface Props {
  onImport: () => void;
  onExport: () => void;
  onDuplicate: () => void;
  onClear: () => void;
  onNew: () => void;
}

const SpreadsheetHeader: React.FC<Props> = ({ onImport, onExport, onDuplicate, onClear, onNew }) => {
  return (
    <div className="w-full bg-white shadow-md rounded-t-xl px-4 py-3 flex flex-wrap items-center justify-between">
      <h1 className="text-2xl font-bold text-blue-600">BlueSheets</h1>
      <div className="flex flex-wrap gap-2 mt-2 sm:mt-0">
        <button onClick={onImport} className="bg-yellow-400 hover:bg-yellow-500 text-white font-semibold py-1 px-3 rounded-lg">
          Importar
        </button>
        <button onClick={onExport} className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-1 px-3 rounded-lg">
          Exportar
        </button>
        <button onClick={onDuplicate} className="bg-orange-500 hover:bg-orange-600 text-white font-semibold py-1 px-3 rounded-lg">
          Duplicar
        </button>
        <button onClick={onClear} className="bg-red-600 hover:bg-red-700 text-white font-semibold py-1 px-3 rounded-lg">
          Apagar Tudo
        </button>
        <button onClick={onNew} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-1 px-3 rounded-lg">
          Nova planilha
        </button>
      </div>
    </div>
  );
};

export default SpreadsheetHeader;

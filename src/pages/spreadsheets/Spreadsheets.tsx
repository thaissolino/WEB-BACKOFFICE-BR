import React from "react";
import SpreadsheetHeader from "./SpreadsheetHeader";
import SheetEditor from "./SheetEditor";

const Spreadsheets: React.FC = () => {
  const handleImport = () => {
    alert("Função de importar ainda será implementada.");
  };

  const handleExport = () => {
    alert("Função de exportar ainda será implementada.");
  };

  const handleDuplicate = () => {
    alert("Função de duplicar planilha ainda será implementada.");
  };

  const handleClear = () => {
    if (confirm("Tem certeza que deseja apagar todos os dados da planilha?")) {
      location.reload(); // por enquanto, reinicia
    }
  };

  const handleNew = () => {
    location.reload(); // por enquanto, reinicia também
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-blue-100 text-gray-900 p-2 sm:p-4">
      <div className="max-w-screen-xl mx-auto bg-white rounded-xl shadow-lg">
        <SpreadsheetHeader
          onImport={handleImport}
          onExport={handleExport}
          onDuplicate={handleDuplicate}
          onClear={handleClear}
          onNew={handleNew}
        />
        <SheetEditor />
      </div>
    </div>
  );
};

export default Spreadsheets;

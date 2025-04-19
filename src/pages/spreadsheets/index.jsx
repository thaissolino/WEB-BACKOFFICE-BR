import { useState, useEffect, useRef } from 'react';
import { FileText, Edit, Trash2, CornerUpLeft, CornerUpRight, Printer, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';

const excelFonts = [
  'Calibri', 'Arial', 'Times New Roman', 'Verdana', 'Courier New'
];

const excelFontSizes = [8, 9, 10, 11, 12, 14, 16, 18, 20];

const Spreadsheets = () => {
  const [sheets, setSheets] = useState([]);
  const [currentData, setCurrentData] = useState([]);
  const [currentSheetIndex, setCurrentSheetIndex] = useState(-1);
  const [sheetTitle, setSheetTitle] = useState('Planilha sem título');
  const [showEditor, setShowEditor] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [selectedCell, setSelectedCell] = useState([0, 0]);
  const [styles, setStyles] = useState([]);
  
  const fileInputRef = useRef(null);

  useEffect(() => {
    const savedSheets = localStorage.getItem('bluesheets');
    if (savedSheets) {
      setSheets(JSON.parse(savedSheets));
    }
  }, []);

  const saveSheets = (newSheets) => {
    setSheets(newSheets);
    localStorage.setItem('bluesheets', JSON.stringify(newSheets));
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target.result;
      const rows = content.split('\n').map(row => row.split(','));
      setCurrentData(rows);
      setSheetTitle(file.name.replace(/\.csv$/i, ''));
      setShowEditor(true);
      initHistory(rows);
    };
    reader.readAsText(file);
  };

  const initHistory = (data) => {
    setHistory([data]);
    setHistoryIndex(0);
  };

  const recordHistory = (newData) => {
    const newHistory = [...history.slice(0, historyIndex + 1), newData];
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      setCurrentData(history[historyIndex - 1]);
      setHistoryIndex(prev => prev - 1);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setCurrentData(history[historyIndex + 1]);
      setHistoryIndex(prev => prev + 1);
    }
  };

  const handleSave = (data, title) => {
    const newSheet = { title, rows: data };
    let newSheets;
    
    if (currentSheetIndex >= 0) {
      newSheets = [...sheets];
      newSheets[currentSheetIndex] = newSheet;
    } else {
      newSheets = [...sheets, newSheet];
    }
    
    saveSheets(newSheets);
    setShowEditor(false);
  };

  const handleSelectSheet = (index) => {
    setCurrentSheetIndex(index);
    setCurrentData([...sheets[index].rows]);
    setSheetTitle(sheets[index].title);
    setShowEditor(true);
    initHistory(sheets[index].rows);
  };

  const handleDeleteSheet = (index) => {
    const newSheets = sheets.filter((_, i) => i !== index);
    saveSheets(newSheets);
  };

  return (
    <div className="bg-gradient-to-b from-blue-50 to-blue-100 text-gray-900 min-h-screen">
      <header className="bg-white shadow-md sticky top-0 z-50 px-4 py-4 flex justify-between items-center rounded-b-2xl">
        <span className="text-2xl font-bold text-blue-600">BlueSheets</span>
        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            accept=".csv"
            className="hidden"
            onChange={handleImport}
          />
          <button
            onClick={() => fileInputRef.current.click()}
            className="bg-yellow-500 text-white px-4 py-2 rounded-lg"
          >
            Importar
          </button>
          <button
            onClick={() => {
              setCurrentData(Array(50).fill().map(() => Array(5).fill('')));
              setSheetTitle('Planilha sem título');
              setCurrentSheetIndex(-1);
              setShowEditor(true);
              initHistory(Array(50).fill().map(() => Array(5).fill('')));
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg"
          >
            Nova
          </button>
        </div>
      </header>

      {showEditor ? (
        <SheetEditor
          currentData={currentData}
          sheetTitle={sheetTitle}
          onClose={() => setShowEditor(false)}
          onSave={handleSave}
          onRename={() => setShowRenameModal(true)}
          onUndo={handleUndo}
          onRedo={handleRedo}
          canUndo={historyIndex > 0}
          canRedo={historyIndex < history.length - 1}
        />
      ) : (
        <SheetList
          sheets={sheets}
          onSelect={handleSelectSheet}
          onDelete={handleDeleteSheet}
          onNew={() => {
            setCurrentData(Array(50).fill().map(() => Array(5).fill('')));
            setShowEditor(true);
          }}
        />
      )}

      {showRenameModal && (
        <RenameModal
          currentName={sheetTitle}
          onClose={() => setShowRenameModal(false)}
          onSave={(newName) => {
            setSheetTitle(newName);
            setShowRenameModal(false);
          }}
        />
      )}
    </div>
  );
};

const SheetList = ({ sheets, onSelect, onDelete, onNew }) => {
  return (
    <main className="p-4">
      <button
        onClick={onNew}
        className="bg-blue-600 text-white px-4 py-2 rounded-lg mb-4"
      >
        Nova Planilha
      </button>
      <ul className="space-y-3">
        {sheets.map((sheet, i) => (
          <li
            key={i}
            className="sheet-item bg-white p-4 rounded-xl shadow flex justify-between items-center hover:bg-blue-50"
          >
            <div>
              <p className="font-semibold text-blue-700">{sheet.title}</p>
              <p className="text-sm text-gray-500">
                {sheet.rows.length} linhas, {sheet.rows[0]?.length || 0} colunas
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(i);
                }}
                className="text-blue-600 flex items-center gap-1"
              >
                <Edit size={16} /> Editar
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(i);
                }}
                className="text-red-500 flex items-center gap-1"
              >
                <Trash2 size={16} /> Excluir
              </button>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
};

const SheetEditor = ({ 
  currentData, 
  sheetTitle, 
  onClose, 
  onSave, 
  onRename,
  onUndo,
  onRedo,
  canUndo,
  canRedo
}) => {
  const [data, setData] = useState(currentData);
  const [title, setTitle] = useState(sheetTitle);
  const [selectedCell, setSelectedCell] = useState(null);

  useEffect(() => {
    setData(currentData);
  }, [currentData]);

  const handleCellChange = (row, col, value) => {
    const newData = [...data];
    newData[row][col] = value;
    setData(newData);
  };

  const handleCellFocus = (row, col) => {
    setSelectedCell([row, col]);
  };

  const addRow = () => {
    setData([...data, Array(data[0].length).fill('')]);
  };

  const removeRow = () => {
    if (data.length > 1) {
      setData(data.slice(0, -1));
    }
  };

  const addColumn = () => {
    setData(data.map(row => [...row, '']));
  };

  const removeColumn = () => {
    if (data[0].length > 1) {
      setData(data.map(row => row.slice(0, -1)));
    }
  };

  return (
    <section className="p-4">
      <div className="bg-white px-4 py-2 flex justify-between items-center border-b mb-4">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-gray-600" />
          <span className="font-medium text-lg">{title}</span>
          <button 
            onClick={onRename}
            className="ml-2 text-sm text-blue-600 hover:underline"
          >
            Editar nome
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={addRow}
            className="bg-green-200 text-green-800 px-2 py-1 rounded"
          >
            + Linha
          </button>
          <button
            onClick={removeRow}
            className="bg-red-200 text-red-800 px-2 py-1 rounded"
          >
            - Linha
          </button>
          <button
            onClick={addColumn}
            className="bg-green-200 text-green-800 px-2 py-1 rounded"
          >
            + Coluna
          </button>
          <button
            onClick={removeColumn}
            className="bg-red-200 text-red-800 px-2 py-1 rounded"
          >
            - Coluna
          </button>
          <button
            onClick={() => onSave(data, title)}
            className="bg-green-600 text-white px-4 py-1 rounded-lg"
          >
            Salvar
          </button>
          <button
            onClick={onClose}
            className="bg-gray-600 text-white px-4 py-1 rounded-lg"
          >
            Voltar
          </button>
        </div>
      </div>

      <div className="bg-white border-b px-4 py-2 flex flex-wrap gap-2 mb-4 text-sm">
        <button 
          onClick={onUndo} 
          disabled={!canUndo}
          className={`hover:bg-gray-200 p-1 rounded ${!canUndo ? 'opacity-50' : ''}`}
        >
          <CornerUpLeft className="w-4 h-4" />
        </button>
        <button 
          onClick={onRedo} 
          disabled={!canRedo}
          className={`hover:bg-gray-200 p-1 rounded ${!canRedo ? 'opacity-50' : ''}`}
        >
          <CornerUpRight className="w-4 h-4" />
        </button>
        <button className="hover:bg-gray-200 p-1 rounded">
          <Printer className="w-4 h-4" />
        </button>
        <select className="border rounded px-2 py-1 text-sm w-24 sm:w-32">
          {excelFonts.map(font => (
            <option key={font} value={font}>{font}</option>
          ))}
        </select>
        <select className="border rounded px-2 py-1 text-sm w-24 sm:w-32">
          {excelFontSizes.map(size => (
            <option key={size} value={size}>{size}</option>
          ))}
        </select>
        <button className="font-bold">B</button>
        <button className="italic">I</button>
        <button className="underline">U</button>
        <button onClick={() => {}}>
          <AlignLeft className="w-4 h-4" />
        </button>
        <button className="px-1">
          <AlignCenter className="w-4 h-4" />
        </button>
        <button className="px-1">
          <AlignRight className="w-4 h-4" />
        </button>
      </div>

      <div className="overflow-auto">
        <table className="min-w-full bg-white rounded-lg shadow">
          <thead className="bg-gray-100 sticky top-0">
            <tr>
              <th className="border p-2">#</th>
              {data[0]?.map((_, col) => (
                <th key={col} className="border p-2 text-center bg-gray-100">
                  {String.fromCharCode(65 + col)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIndex) => (
              <tr key={rowIndex}>
                <td className="border p-1 bg-gray-100 text-center">
                  {rowIndex + 1}
                </td>
                {row.map((cell, colIndex) => (
                  <td 
                    key={colIndex} 
                    className="border p-1"
                    onClick={() => handleCellFocus(rowIndex, colIndex)}
                  >
                    <input
                      type="text"
                      className="cell w-full text-center"
                      value={cell}
                      onChange={(e) => handleCellChange(rowIndex, colIndex, e.target.value)}
                      onFocus={() => handleCellFocus(rowIndex, colIndex)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

const RenameModal = ({ currentName, onClose, onSave }) => {
  const [newName, setNewName] = useState(currentName);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg w-11/12 max-w-sm p-4">
        <h2 className="text-lg font-medium mb-2">Novo nome da planilha</h2>
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="border border-gray-300 rounded w-full p-2 mb-4"
        />
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-gray-200"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              onSave(newName);
              onClose();
            }}
            className="px-4 py-2 rounded bg-blue-600 text-white"
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
};

export default Spreadsheets;
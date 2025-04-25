import React from 'react';
import { Edit, Trash2 } from 'lucide-react';

interface Props {
  sheets: { title: string; rows: string[][] }[];
  onSelect: (index: number) => void;
  onDelete: (index: number) => void;
  onDuplicate: () => void;
  onSelectSimple: (index: number) => void;
  selectedSheetIndex: number | null;
}

const SheetList: React.FC<Props> = ({
  sheets,
  onSelect,
  onDelete,
  onDuplicate,
  onSelectSimple,
  selectedSheetIndex
}) => {
  return (
    <main className="p-4">
      <ul className="space-y-3">
        {sheets.map((sheet, i) => (
          <li
            key={i}
            className={`sheet-item bg-white p-4 rounded-xl shadow flex justify-between items-center hover:bg-blue-50 ${
              selectedSheetIndex === i ? 'ring-2 ring-blue-500' : ''
            }`}
            onClick={() => onSelectSimple(i)}
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

export default SheetList;

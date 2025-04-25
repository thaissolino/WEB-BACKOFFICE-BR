import React, { useState } from 'react';

interface Props {
  currentName: string;
  onClose: () => void;
  onSave: (newName: string) => void;
}

const RenameModal: React.FC<Props> = ({ currentName, onClose, onSave }) => {
  const [newName, setNewName] = useState(currentName);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white rounded-lg p-4 w-11/12 max-w-sm">
        <h2 className="text-lg font-medium mb-2">Renomear planilha</h2>
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="border border-gray-300 rounded w-full p-2 mb-4"
        />
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded bg-gray-200">
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

export default RenameModal;

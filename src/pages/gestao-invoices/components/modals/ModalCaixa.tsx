import React, { useEffect, useState } from "react";

interface ModalCaixaProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (nome: string, taxa: number, userId: number) => void;
  fornecedorEdit?: {
    id: number;
    nome: string;
    taxa: number;
    saldo: number;
    userId: number;
    transacoes: any[];
  };
}

const usuariosMock = [
  { id: 1, nome: "João Silva" },
  { id: 2, nome: "Maria Oliveira" },
  { id: 3, nome: "Carlos Souza" },
  { id: 4, nome: "Ana Lima" },
  { id: 5, nome: "Fernanda Costa" },
  { id: 6, nome: "Bruno Rocha" },
  { id: 7, nome: "Juliana Martins" },
  { id: 8, nome: "Ricardo Pereira" },
  { id: 9, nome: "Larissa Melo" },
  { id: 10, nome: "Felipe Araújo" },
];

const ModalCaixa: React.FC<ModalCaixaProps> = ({ isOpen, onClose, onSave, fornecedorEdit }) => {
  const [nome, setNome] = useState("");
  const [saldo, setSaldo] = useState(""); // Inicializa como string vazia

  useEffect(() => {
    if (fornecedorEdit) {
      setNome(fornecedorEdit.nome || "");
      setSaldo(String(fornecedorEdit.taxa || 0)); // Converte para string ao editar
    } else {
      setNome("Caixa Padrão");
      setSaldo(""); // Inicializa como string vazia
    }
  }, [fornecedorEdit]);

  if (!isOpen) return null;

  const nomeUsuario = fornecedorEdit
    ? usuariosMock.find((u) => u.id === fornecedorEdit.userId)?.nome || "Usuário não encontrado"
    : "";

  const handleSave = () => {
    if (fornecedorEdit?.userId) {
      onSave(nome.trim(), Number(saldo), fornecedorEdit.userId); // Converte para Number ao salvar
    } else {
      alert("Usuário não definido.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-full max-w-md">
        <h2 className="text-lg font-semibold text-blue-500 mb-2">{fornecedorEdit ? "Editar Caixa" : "Nova Caixa"}</h2>

        {nomeUsuario && (
          <p className="text-sm text-gray-500 mb-4">
            <i className="fas fa-user mr-1 text-gray-400"></i> Usuário: <strong>{nomeUsuario}</strong>
          </p>
        )}

        <div className="space-y-4">

          <div>
            <label className="block text-sm font-medium text-gray-700">Saldo (USD)</label>
            <input
              type="number"

              value={saldo}
              onChange={(e) => setSaldo(e.target.value)} // Mantém como string no onChange
              className="mt-1 block w-full border border-gray-300 rounded p-2"
              placeholder="Ex: 1.05"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <button onClick={onClose} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded">
            Cancelar
          </button>
          <button
            onClick={handleSave} // Chama a função handleSave
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded"
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalCaixa;
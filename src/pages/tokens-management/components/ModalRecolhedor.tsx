import React, { useState, useEffect } from "react";

interface ModalRecolhedorProps {
  open: boolean;
  onClose: () => void;
}

const ModalRecolhedor: React.FC<ModalRecolhedorProps> = ({ open, onClose }) => {
  const [id, setId] = useState<string>("");
  const [nome, setNome] = useState<string>("");
  const [taxa, setTaxa] = useState<string>("1.025");

  useEffect(() => {
    if (!open) {
      setId("");
      setNome("");
      setTaxa("1.025");
    }
  }, [open]);

  const salvar = () => {
    if (!nome) return alert("POR FAVOR, INFORME O NOME DO RECOLHEDOR");
    if (parseFloat(taxa) <= 1) return alert("A TAXA DEVE SER MAIOR QUE 1");

    const novoRecolhedor = {
      id: id || Date.now().toString(),
      nome: nome.toUpperCase(),
      taxa: parseFloat(taxa),
      saldo: 0,
      transacoes: [],
    };

    const storage = localStorage.getItem("recolhedores") || "[]";
    const lista = JSON.parse(storage);

    const atualizada = id
      ? lista.map((r: any) => (r.id === id ? novoRecolhedor : r))
      : [...lista, novoRecolhedor];

    localStorage.setItem("recolhedores", JSON.stringify(atualizada));
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-full max-w-md">
        <h3 className="text-lg font-medium mb-4" id="tituloModalRecolhedor">
          {id ? "EDITAR RECOLHEDOR" : "ADICIONAR RECOLHEDOR"}
        </h3>
        <div className="space-y-4">
          <input type="hidden" value={id} />
          <div>
            <label className="block text-sm font-medium text-gray-700">NOME</label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md p-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              TAXA (PADRÃO: 1.025)
            </label>
            <input
              type="number"
              step="0.001"
              value={taxa}
              onChange={(e) => setTaxa(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md p-2"
            />
          </div>
        </div>
        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md"
          >
            CANCELAR
          </button>
          <button
            onClick={salvar}
            className="px-4 py-2 bg-blue-600 text-white rounded-md"
          >
            SALVAR
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalRecolhedor;
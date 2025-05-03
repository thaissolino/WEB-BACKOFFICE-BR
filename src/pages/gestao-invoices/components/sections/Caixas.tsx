import React, { useEffect, useState } from "react";
import ModalCaixa from "../modals/ModalCaixa";
import { api } from "../../../../services/api";
import Swal from "sweetalert2";
import { GenericSearchSelect } from "./SearchSelect";
import { Loader2 } from "lucide-react";


export interface Transaction {
  id: string;
  value: number;
  userId: string;
  date: string;
  direction: "IN" | "OUT";
  description: string;
  createdAt: string; // pode ser Date se você converter
  updatedAt: string;
}

export interface Caixa {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  input: number,
  output: number,
  balance: number
  transactions: Transaction[];
}


const CaixasTab: React.FC = () => {
  const [caixas, setCaixas] = useState<Caixa[]>([]);
  const [caixaUser, setCaixaUser] = useState<Caixa>();
  const [showModal, setShowModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [loadingFetch, setLoadingFetch] = useState(false);
  const [loadingFetch2, setLoadingFetch2] = useState(false);
  const [loadingFetch3, setLoadingFetch3] = useState(false);
  const [dataPagamento, setDataPagamento] = useState("");
  const [valorPagamento, setValorPagamento] = useState("");
  const [descricaoPagamento, setDescricaoPagamento] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  console.log(selectedUserId)

  const fetchData = async () => {
    setLoadingFetch(true);
    try {
      const res = await api.get("/invoice/box");
      setCaixas(res.data);
    } catch (error) {
      console.error("Erro ao buscar caixas:", error);
      // Swal.fire("Erro", "Erro ao carregar caixas.", "error");
    } finally {
      setLoadingFetch(false);
    }
  };

  const salvarCaixa = async (nome: string, description: string) => {
    // Implemente lógica de criação de caixa com POST
  };


  // const formatCurrency = (value: number) => `$${value.toFixed(2)}`;
  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString();

  const caixaAtual =  caixas?.find((c) => c.id === selectedUserId);
  console.log(caixaAtual)

  console.log()
  const fetchDatUser = async () => {
    // setLoadingFetch(true);
    try {
      if(!selectedUserId)return
      setLoadingFetch2(true)
      const res = await api.get(`/invoice/box/transaction/${selectedUserId}`);
      console.log(res.data)
      setCaixaUser(res.data);
    } catch (error) {
      console.error("Erro ao buscar caixas:", error);
      Swal.fire("Erro", "Erro ao carregar caixas.", "error");
    } finally {
      setLoadingFetch2(false)
    }
  };
  
  console.log(caixaUser)
  
  useEffect(()=>{
    fetchDatUser()
  },[selectedUserId])

  const submitPayment = async()=>{
    try {
      if(!dataPagamento){
        Swal.fire("Erro", "selecione um data", "error");
          return
      }
      if(Number(valorPagamento) === 0){
        Swal.fire("Erro", "selecione um valor", "error");
          return
      }
      if(!descricaoPagamento){
        Swal.fire("Erro", "informe uma descrição para o pagamento", "error");
          return
      }
      setLoadingFetch3(true)
      const res = await api.post(`/invoice/box/transaction`,{
        value: Math.abs(Number(valorPagamento)),
        userId: selectedUserId,
        direction: Number(valorPagamento) > 0 ? "IN" : "OUT",
        date: dataPagamento,
        description: descricaoPagamento
      });
      console.log(res.data)
      fetchDatUser()
    } catch (error) {
      console.error("Erro ao buscar caixas:", error);
      Swal.fire("Erro", "Erro ao resgistrar pagamento", "error");
    } finally {
      setLoadingFetch3(false)
    }
  }

  return (
    <div className="fade-in">
      {/* Seletor de usuário */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">

        {loadingFetch ? (
          <div className="flex items-center space-x-4">
          <p className="text-sm text-gray-500">Carregando caixas...</p>
          </div>
        ) : (
          <div className="flex items-center space-x-4">
          <GenericSearchSelect 
              items={caixas} 
              value={selectedUserId!} 
              getLabel={(p) => p.name}
              getId={(p) => p.id}
              onChange={setSelectedUserId}
              label="Selecione um usuário"
          />
           <button
              onClick={() => setShowModal(true)}
              className="bg-blue-500 flex flex-row text-center items-center hover:bg-blue-600 text-white px-4 py-2 rounded"
              disabled={loadingFetch}
            >
              <i className="fas fa-plus mr-2"></i> ADICIONAR
            </button>
          </div>
        )}
      </div>

      {/* Dados do caixa selecionado */}
      {caixaAtual && (
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-blue-600 font-semibold text-lg flex items-center">
              <i className="fas fa-store mr-2"></i> CAIXA DE {caixaAtual.name}
            </h2>
            <div className="text-sm text-right">
  Entradas:{" "}
  <span className="mr-4 font-bold text-green-600">
    {loadingFetch2 ? (
      <Loader2 className="inline w-4 h-4 animate-spin text-blue-500" />
    ) : (
      `$ ${(caixaUser?.input ?? 0).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`
    )}
  </span>

  Saídas:{" "}
  <span className="mr-4 font-bold text-red-600">
    {loadingFetch2 ? (
      <Loader2 className="inline w-4 h-4 animate-spin text-blue-500" />
    ) : (
      `$ ${(caixaUser?.output ?? 0).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`
    )}
  </span>

  SALDO:{" "}
  <span
    className={`mr-2 font-bold ${
      (caixaUser?.balance ?? 0) < 0 ? "text-red-600" : "text-green-600"
    }`}
  >
    {loadingFetch2 ? (
      <Loader2 className="inline w-4 h-4 animate-spin text-blue-500" />
    ) : (
      `$ ${(caixaUser?.balance ?? 0).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`
    )}
  </span>
</div>


          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Registrar pagamento */}
            <div className="bg-gray-50 p-4 rounded border">
              <h3 className="font-medium mb-3 text-blue-700 border-b pb-2 flex items-center">
                <i className="fas fa-hand-holding-usd mr-2"></i> REGISTRAR PAGAMENTO
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">DATA</label>
                  <input
                    type="date"
                    className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                    value={dataPagamento}
                    onChange={(e) => setDataPagamento(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">VALOR (USD)</label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500 appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    value={valorPagamento}
                    onChange={(e) => setValorPagamento(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">DESCRIÇÃO</label>
                  <input
                    type="text"
                    className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                    value={descricaoPagamento}
                    onChange={(e) => setDescricaoPagamento(e.target.value)}
                  />
                </div>
                <button
                  onClick={submitPayment}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded w-full flex items-center justify-center"
                  disabled={loadingFetch3}
                >
                  {loadingFetch3 ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Registrando...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-check mr-2"></i> REGISTRAR
                    </>
                  )}
                </button>

              </div>
            </div>

            {/* Histórico */}
            <div>
              <h3 className="font-medium mb-2 border-b pb-2">HISTÓRICO DE TRANSAÇÕES (ÚLTIMOS 6)</h3>
              <div className="overflow-x-auto max-h-96">
                <table className="min-w-full bg-white">
                  <thead>
                    <tr className="bg-gray-200">
                      <th className="py-2 px-4 border">DATA</th>
                      <th className="py-2 px-4 border">DESCRIÇÃO</th>
                      <th className="py-2 px-4 border">VALOR (USD)</th>
                    </tr>
                  </thead>
                  <tbody>
                  {loadingFetch2 ? (
                    <tr>
                      <td colSpan={3} className="text-center py-4 text-blue-600">
                        <Loader2 className="inline animate-spin w-4 h-4 mr-2" />
                        Carregando transações...
                      </td>
                    </tr>
                  ) : caixaUser?.transactions?.length ? (
                    caixaUser.transactions
                      .slice(-6)
                      .reverse()
                      .map((t) => (
                        <tr key={t.id} className="bg-red-50">
                          <td className="py-2 px-4 border text-center">{new Date(new Date(t.date).getTime() + 3 * 60 * 60 * 1000).toLocaleDateString("pt-BR")}</td>
                          <td className="py-2 px-4 border text-center">{t.description}</td>
                          <td
                            className={`py-2 px-4 border text-right ${
                              t.direction === "OUT" ? "text-red-600" : "text-green-600"
                            }`}
                          >
                            {`${t.direction === "OUT" ? "-" : "+"} $ ${t.value.toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}`}
                          </td>
                        </tr>
                      ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="text-center py-4 text-gray-500">
                        Nenhuma transação registrada.
                      </td>
                    </tr>
                  )}
                </tbody>
                  
                </table>
                
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de adicionar caixa */}
      <ModalCaixa
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSave={salvarCaixa}
        fetchDataUser={fetchData}
      />
    </div>
  );
};

export default CaixasTab;

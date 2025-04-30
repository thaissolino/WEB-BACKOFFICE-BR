import { useEffect, useState } from 'react';
import { DollarSign, Loader2, Plus, Save } from 'lucide-react';
import { formatCurrency } from '../../../cambiobackoffice/formatCurrencyUtil';
import { Product } from './ProductsTab';
import { InvoiceData } from './InvoiceHistory';
import { api } from '../../../../services/api';
import Swal from 'sweetalert2';

interface ExchangeTransaction {
  id: string;
  date: string;
  type: 'compra' | 'alocacao' | 'devolucao';
  usd: number;
  taxa: number;
  descricao: string;
}

export interface FinancialTransaction {
  id: string;
  date: Date; // ISO string, pode usar `Date` se for convertido
  type: "BUY" | "PAYMENT";
  usd: number;
  rate: number;
  description: string;
  invoiceId: string;
  createdAt: string;
  updatedAt: string;
}


export function ExchangeTab() {

  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([]);

    const [products, setProducts] = useState<Product[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [isSaving2, setIsSaving2] = useState(false);
    const [loading, setLoading] = useState(true);

    const [historyPaymentBuy, setHistoryPaymentBuy] = useState<FinancialTransaction[] | undefined>(undefined)

    const [dataPayment, setDataUpdated] = useState({
      invoiceId:"",
      date: new Date().toISOString().split("T")[0],
      usd: 0
    })

    
    const [addBalance, setAddBalance] = useState<{date:string, type: string, usd: number, rate: number, description: string}>(
      {
        date: new Date().toISOString().split("T")[0],
        rate:0,
        usd:0,
        type:'BUY',
        description:'Compra de dólares'
      }
    )

        console.log(addBalance)
    const [balance, setBalance] = useState<{balance:number, averageRate: number}>()

  const getBalance = async()=>{
    try {
      setLoading(true);
      const [ getBalance] = await Promise.all([
        api.get('/invoice/exchange-balance'),
      ]);

      setBalance(getBalance.data)
    } catch (error) {
      console.error('Erro ao atualizar balance:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleInputBalance = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setAddBalance({ ...addBalance, [name]: value });
  };

  const fetchData = async () => {
      try {
        setLoading(true);
        const [invoiceResponse, getBalance, history] = await Promise.all([
          api.get('/invoice/get'),
          api.get('/invoice/exchange-balance'),
          api.get('/invoice/exchange-records'),
        ]);

        setBalance(getBalance.data)
        setHistoryPaymentBuy(history.data)
        setInvoices(invoiceResponse.data);
      } catch (error) {
        console.error('Erro ao buscar dados:', error);
      } finally {
        setLoading(false);
      }
    };
    useEffect(() => {
      fetchData();
    }, []);

  const sendBuyDolar = async() => {
   if (!addBalance.date) {
      Swal.fire({
        icon: 'warning',
        title: 'Atenção',
        text: 'Selecione uma Data!',
        confirmButtonColor: '#27ee1a',
      });
      return;
    }

    if (!addBalance.rate) {
      Swal.fire({
        icon: 'warning',
        title: 'Atenção',
        text: 'Informe a Taxa de Câmbio (BRL)!',
        confirmButtonColor: '#27ee1a',
      });
      return;
    }

    if (!addBalance.date) {
      Swal.fire({
        icon: 'warning',
        title: 'Atenção',
        text: 'Informe a Quantidade (USD)!',
        confirmButtonColor: '#27ee1a',
      });
      return;
    }

    try {
      setIsSaving(true)
      const response = await api.post('/invoice/exchange-records', {
          ...addBalance, date: new Date(addBalance.date),rate: Number(addBalance.rate), usd: Number(addBalance.usd)})
      console.log(response.data)
     Swal.fire({
        icon: 'success',
        title: 'Sucesso!',
        text: 'Saldo adicionado com sucesso!',
        confirmButtonColor: '#3085d6',
      });
      setAddBalance(      {
        date: new Date().toISOString().split("T")[0],
        rate:0,
        usd:0,
        type:'BUY',
        description:'Compra de dólares'
      })
      
      await fetchData()
    } catch (error) {
     console.log("error")
     Swal.fire({
      icon: 'error',
      title: 'Atenção',
      text: 'Error ao Adicionar Saldo',
      confirmButtonColor: '#27ee1a',
    });
    } finally{
      setIsSaving(false)
    }
  }

  console.log(dataPayment)

  const registrarPagamento = async() => {
    if (!dataPayment.date) {
      Swal.fire({
        icon: 'warning',
        title: 'Atenção',
        text: 'Selecione uma Data!',
        confirmButtonColor: '#27ee1a',
      });
      return;
    }

    if (!dataPayment.invoiceId) {
      Swal.fire({
        icon: 'warning',
        title: 'Atenção',
        text: 'Informe a Invoice a ser paga!',
        confirmButtonColor: '#27ee1a',
      });
      return;
    }
    if(!balance) {
      Swal.fire({
        icon: 'warning',
        title: 'Atenção',
        text: 'Saldo ainda não validado!',
        confirmButtonColor: '#27ee1a',
      });
      return;
    }
    if (dataPayment.usd > (balance.balance)) {
      Swal.fire({
        icon: 'warning',
        title: 'Atenção',
        text: 'Saldo insuficiente!',
        confirmButtonColor: '#27ee1a',
      });
      return;
    }

    try {
      setIsSaving2(true)
      const response = await api.post('/invoice/exchange-records', {
          ...dataPayment, date: new Date(dataPayment.date), usd: Number(dataPayment.usd)})
     Swal.fire({
        icon: 'success',
        title: 'Sucesso!',
        text: 'Pagamento realizado com sucesso!',
        confirmButtonColor: '#3085d6',
      });
      setDataUpdated(      {
        invoiceId:"",
        date: new Date().toISOString().split("T")[0],
        usd: 0
      })
      
      await fetchData()
    } catch (error) {
     console.log("error")
     Swal.fire({
      icon: 'error',
      title: 'Atenção',
      text: 'Error ao Realizar pagamento',
      confirmButtonColor: '#27ee1a',
    });
    } finally{
      setIsSaving2(false)
    }
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-6 text-blue-700 border-b pb-2">
        <DollarSign className="mr-2 inline" size={18} />
        Média Dólar
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Seção Compra de Dólares */}
        <div className="p-4 bg-gray-50 rounded">
          <h3 className="font-medium mb-2">Registrar Compra de Dólares</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Data</label>
              <input
                type="date"
                name="date"
                value={addBalance.date}
                onChange={handleInputBalance}
                className="mt-1 block w-full border border-gray-300 rounded-md p-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Quantidade (USD)</label>
              <input
                type="number"
                step="0.01"
                name="usd"
                value={addBalance.usd}
                onChange={handleInputBalance}
                className="mt-1 block w-full border border-gray-300 rounded-md p-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Taxa de Câmbio (BRL)</label>
              <input
                type="number"
                step="0.0001"
                name="rate"
                value={addBalance.rate}
                onChange={handleInputBalance}
                className="mt-1 block w-full border border-gray-300 rounded-md p-2"
              />
            </div>
            <button
              onClick={sendBuyDolar}
              className="bg-yellow-500 hover:bg-yellow-600 flex justify-center text-white px-4 py-2 rounded w-full"
            >
              {isSaving ? (
          <>
            <Loader2 className="animate-spin mr-2" size={18} />
            Salvando...
          </>
        ) : (
          <>
            Registrar Compra
          </>
        )}
            </button>
          </div>
        </div>

        {/* Seção Saldo e Custo Médio */}
        <div className="p-4 bg-gray-50 rounded">
          <h3 className="font-medium mb-2">Saldo e Custo Médio</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-700">Saldo em Dólar:</span>
              <span className="font-bold">
                {loading ? 'Carregando...' : formatCurrency(balance?.balance ?? 0, 2, 'USD')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">Custo Médio:</span>
              <span className="font-bold">
              {loading ? 'Carregando...' : formatCurrency(balance?.averageRate ?? 0, 4)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Seção de Pagamentos */}
      <div className="mt-6 p-4 bg-gray-50 rounded">
        <h3 className="text-lg font-medium mb-4 text-blue-700 border-b pb-2">Registrar Pagamento</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Invoice</label>
            <select
              // value={paymentForm.invoiceId}
              onChange={(e) => {
                const invoiceId = e.target.value;
                if(!invoiceId)return setDataUpdated({invoiceId:"", date: new Date().toISOString().split("T")[0], usd: 0})
                const valueInvoice = invoices.find((item)=> item.id === invoiceId)
                setDataUpdated((prev)=>(
                  {
                    ...prev,
                    invoiceId: invoiceId,
                    type: "PAYMENT",
                    usd: valueInvoice?.subAmount || 0,
                    description: "Pagamento Invoice",
                  }
                ))
              }}
              className="w-full h-11 border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Selecione uma invoice</option>
              {loading?  <option>Carregando...</option>:<>{invoices.filter((item)=> item.completed && !item.paid).map((invoice) => (
                <option key={invoice.id} value={invoice.id}>
                  {invoice.number} - {invoice.supplier.name} ({formatCurrency(invoice.subAmount)})
                </option>
              ))}</> }
              
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data do Pagamento</label>
            <input
              type="date"
              // @ts-ignore
              value={dataPayment.date}
              onChange={(e) => setDataUpdated({ ...dataPayment, date: e.target.value })}
              className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="h-22 block text-sm font-medium text-gray-700 mb-1">Valor Pago ($)</label>
            <input
              type="number"
              step="0.01"
              // @ts-ignore
              value={dataPayment.usd}
              readOnly
              className="w-full border border-gray-300 rounded-md p-2 bg-gray-100 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <button
              onClick={registrarPagamento}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded flex items-center justify-center"
            >
              {isSaving2 ? (
          <>
            <Loader2 className="animate-spin mr-2" size={18} />
            Salvando...
          </>
        ) : (
          <>
            Registrar Pagamento
          </>
        )}
            </button>
          </div>
          <div className="bg-blue-100 p-2 rounded hidden" id="infoAlocacao"></div>
        </div>
      </div>

      {/* Histórico de Transações */}
      <div className="mt-6 p-4 bg-gray-50 rounded">
        <h3 className="font-medium mb-2">Histórico de Transações</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white">
            <thead>
              <tr className="bg-gray-200">
                <th className="py-2 px-4 border">Data</th>
                <th className="py-2 px-4 border">Tipo</th>
                <th className="py-2 px-4 border">USD</th>
                <th className="py-2 px-4 border">Taxa</th>
                <th className="py-2 px-4 border">Descrição</th>
              </tr>
            </thead>
            <tbody>
              {historyPaymentBuy && historyPaymentBuy.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-gray-500">
                    Nenhuma transação registrada
                  </td>
                </tr>
              ) : (
                (historyPaymentBuy ?? []).map((transacao) => {
                  const rowClass =
                    transacao.type === 'BUY'
                      ? 'bg-green-50'
                      : transacao.type === 'PAYMENT'
                      ? 'bg-blue-50'
                      : 'bg-yellow-50';

                  return (
                    <tr key={transacao.id} className="hover:bg-gray-50">
                      <td className={`py-2 px-2 border ${rowClass} text-center`}>
                      {new Date(new Date(transacao.date).getTime() + 3 * 60 * 60 * 1000).toLocaleDateString("pt-BR")}
                      </td>
                      <td className={`py-2 px-4 border ${rowClass} text-center`}>
                        {transacao.type === 'BUY'
                          ? 'Compra'
                          : transacao.type === 'PAYMENT'
                          ? 'Pagamento'
                          : 'Devolução'}
                      </td>
                      <td className={`py-2 px-4 border ${rowClass} text-center font-mono`}>
                        {transacao.type === "BUY" ? '+' : '-'}
                        {formatCurrency(transacao.usd, 2, 'USD') || "-"}
                      </td>
                      <td className={`py-2 px-4 border ${rowClass} text-center font-mono`}>
                        {formatCurrency(transacao.rate, 4)|| "-"}
                      </td>
                      <td className={`py-2 px-4 border ${rowClass} text-center`}>
                        {transacao.description}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
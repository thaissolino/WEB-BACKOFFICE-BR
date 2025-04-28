import { useState } from 'react';
import { DollarSign, Plus } from 'lucide-react';
import { formatCurrency } from '../../../cambiobackoffice/formatCurrencyUtil';

interface ExchangeTransaction {
  id: string;
  date: string;
  type: 'compra' | 'alocacao' | 'devolucao';
  usd: number;
  taxa: number;
  descricao: string;
}

export function ExchangeTab() {
  const [saldoDolar, setSaldoDolar] = useState(0);
  const [custoMedioDolar, setCustoMedioDolar] = useState(0);
  const [transacoes, setTransacoes] = useState<ExchangeTransaction[]>([]);

  const [paymentInvoices, setPaymentInvoices] = useState([
    { id: '1', number: 'INV-20230001', supplier: 'Fornecedor A', total: 150.75 },
    { id: '2', number: 'INV-20230002', supplier: 'Fornecedor B', total: 225.5 },
  ]);

  const [paymentForm, setPaymentForm] = useState({
    invoiceId: '',
    date: new Date().toISOString().split('T')[0],
    amount: '',
  });

  const [buyForm, setBuyForm] = useState({
    date: new Date().toISOString().split('T')[0],
    quantity: '',
    rate: '',
  });

  const registrarCompraDolar = () => {
    const quantidade = parseFloat(buyForm.quantity) || 0;
    const taxa = parseFloat(buyForm.rate) || 0;

    if (quantidade <= 0 || taxa <= 0) {
      alert('Por favor, informe valores válidos');
      return;
    }

    // Atualizar custo médio
    let novoCustoMedio = taxa;
    if (saldoDolar > 0) {
      novoCustoMedio = (saldoDolar * custoMedioDolar + quantidade * taxa) / (saldoDolar + quantidade);
    }

    // Atualizar saldos
    setSaldoDolar(saldoDolar + quantidade);
    setCustoMedioDolar(novoCustoMedio);

    // Registrar transação
    const novaTransacao: ExchangeTransaction = {
      id: Date.now().toString(),
      date: buyForm.date,
      type: 'compra',
      usd: quantidade,
      taxa,
      descricao: 'Compra de dólares',
    };

    setTransacoes([novaTransacao, ...transacoes]);

    // Limpar campos
    setBuyForm({
      ...buyForm,
      quantity: '',
      rate: '',
    });
  };

  const registrarPagamento = () => {
    const invoiceId = paymentForm.invoiceId;
    const date = paymentForm.date;
    const amount = parseFloat(paymentForm.amount) || 0;

    if (!invoiceId || !date || amount <= 0) {
      alert('Preencha todos os campos do pagamento!');
      return;
    }

    // Verificar saldo em dólares
    if (amount > saldoDolar) {
      alert('Saldo insuficiente de dólares!');
      return;
    }

    // Registrar alocação de dólares
    const alocacao: ExchangeTransaction = {
      id: Date.now().toString(),
      date,
      type: 'alocacao',
      usd: -amount,
      taxa: custoMedioDolar,
      descricao: `Pagamento invoice ${invoiceId}`,
    };

    setTransacoes([alocacao, ...transacoes]);
    setSaldoDolar(saldoDolar - amount);

    // Limpar campos
    setPaymentForm({
      ...paymentForm,
      invoiceId: '',
      amount: '',
    });

    alert('Pagamento registrado com sucesso!');
  };

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
                value={buyForm.date}
                onChange={(e) => setBuyForm({ ...buyForm, date: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md p-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Quantidade (USD)</label>
              <input
                type="number"
                step="0.01"
                value={buyForm.quantity}
                onChange={(e) => setBuyForm({ ...buyForm, quantity: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md p-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Taxa de Câmbio (BRL)</label>
              <input
                type="number"
                step="0.0001"
                value={buyForm.rate}
                onChange={(e) => setBuyForm({ ...buyForm, rate: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md p-2"
              />
            </div>
            <button
              onClick={registrarCompraDolar}
              className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded w-full"
            >
              Registrar Compra
            </button>
          </div>
        </div>

        {/* Seção Saldo e Custo Médio */}
        <div className="p-4 bg-gray-50 rounded">
          <h3 className="font-medium mb-2">Saldo e Custo Médio</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-700">Saldo em Dólar:</span>
              <span className="font-bold">{formatCurrency(saldoDolar, 2, 'USD')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">Custo Médio:</span>
              <span className="font-bold">{formatCurrency(custoMedioDolar, 4)}</span>
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
              value={paymentForm.invoiceId}
              onChange={(e) => {
                const invoiceId = e.target.value;
                const invoice = paymentInvoices.find((inv) => inv.id === invoiceId);
                setPaymentForm({
                  ...paymentForm,
                  invoiceId,
                  amount: invoice ? invoice.total.toString() : '',
                });
              }}
              className="w-full h-11 border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Selecione uma invoice</option>
              {paymentInvoices.map((invoice) => (
                <option key={invoice.id} value={invoice.id}>
                  {invoice.number} - {invoice.supplier} ({formatCurrency(invoice.total)})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data do Pagamento</label>
            <input
              type="date"
              value={paymentForm.date}
              onChange={(e) => setPaymentForm({ ...paymentForm, date: e.target.value })}
              className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="h-22 block text-sm font-medium text-gray-700 mb-1">Valor Pago ($)</label>
            <input
              type="number"
              step="0.01"
              value={paymentForm.amount}
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
              Registrar Pagamento
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
              {transacoes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-gray-500">
                    Nenhuma transação registrada
                  </td>
                </tr>
              ) : (
                transacoes.map((transacao) => {
                  const rowClass =
                    transacao.type === 'compra'
                      ? 'bg-green-50'
                      : transacao.type === 'alocacao'
                      ? 'bg-blue-50'
                      : 'bg-yellow-50';

                  return (
                    <tr key={transacao.id} className="hover:bg-gray-50">
                      <td className={`py-2 px-2 border ${rowClass} text-center`}>
                        {new Date(transacao.date).toLocaleDateString('pt-BR')}
                      </td>
                      <td className={`py-2 px-4 border ${rowClass} text-center`}>
                        {transacao.type === 'compra'
                          ? 'Compra'
                          : transacao.type === 'alocacao'
                          ? 'Retirado'
                          : 'Devolução'}
                      </td>
                      <td className={`py-2 px-4 border ${rowClass} text-center font-mono`}>
                        {transacao.usd > 0 ? '+' : ''}
                        {formatCurrency(transacao.usd, 2, 'USD')}
                      </td>
                      <td className={`py-2 px-4 border ${rowClass} text-center font-mono`}>
                        {formatCurrency(transacao.taxa, 4)}
                      </td>
                      <td className={`py-2 px-4 border ${rowClass} text-center`}>
                        {transacao.descricao}
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
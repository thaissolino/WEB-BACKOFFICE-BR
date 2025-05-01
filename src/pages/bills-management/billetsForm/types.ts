export interface Boleto {
    id: number;
    codigo: string;
    dataPagamento: string;
    valor: number;
    referencia: string;
    status: string;
  }
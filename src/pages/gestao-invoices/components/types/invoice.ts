export interface InvoiceProduct {
    id: string;
    name: string;
    quantity: number;
    value: number;
    weight: number;
    total: number;
    received: boolean;
    receivedQuantity: number;
  }
  
  export interface Invoice {
    id: string | null;
    number: string;
    date: string;
    supplierId: string;
    products: InvoiceProduct[];
    carrierId: string;
    taxValue: number;
    paid: boolean;
    paidDate: string | null;
    paidDollarRate: number | null;
    completed: boolean;
    completedDate: string | null;
  }
import { InvoiceProduct } from "../sections/InvoiceProducts";

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
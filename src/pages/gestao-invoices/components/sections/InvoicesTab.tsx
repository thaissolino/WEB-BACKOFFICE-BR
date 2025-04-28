import { useState } from "react";
import { NewInvoiceForm } from "./NewInvoiceForm";
import { InvoiceProducts } from "./InvoiceProducts";
import { InvoiceHistory } from "./InvoiceHistory";
import { Invoice } from "../types/invoice";

export function InvoicesTab() {
  const [currentInvoice, setCurrentInvoice] = useState<Invoice>({
    id: null,
    number: `INV-${Date.now()}`,
    date: new Date().toISOString().split("T")[0],
    supplierId: "",
    products: [],
    carrierId: "",
    taxValue: 5.0,
    paid: false,
    paidDate: null,
    paidDollarRate: null,
    completed: false,
    completedDate: null,
  });

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <NewInvoiceForm
          currentInvoice={currentInvoice}
          setCurrentInvoice={setCurrentInvoice}
        />
        <InvoiceProducts
          currentInvoice={currentInvoice}
          setCurrentInvoice={setCurrentInvoice}
        />
      </div>
      <InvoiceHistory />
    </div>
  );
}

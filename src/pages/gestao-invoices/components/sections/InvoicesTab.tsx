import { useEffect, useState } from "react";
import { NewInvoiceForm } from "./NewInvoiceForm";
import { InvoiceProducts } from "./InvoiceProducts";
import { InvoiceHistory } from "./InvoiceHistory";
import { Invoice } from "../types/invoice";

export function InvoicesTab() {
  const [reload, setReload] = useState(false);
  const [reloadInvoices, setReloadInvoices] = useState(false);

        {/* const [reloadInvoiceHistory, setReloadInvoiceHistory] = useState(false) /*} 

  const [currentInvoice, setCurrentInvoice] = useState<Invoice>({
    id: null,
    number: `INV-${Date.now()}`,
    date: new Date().toISOString().split("T")[0],
    supplierId: "",
    products: [],
    amountTaxcarrier: 0,
    amountTaxcarrier2: 0,
    taxaSpEs: "",
    carrierId: "",
    carrier2Id: "",
    paid: false,
    paidDate: null,
    paidDollarRate: null,
    completed: false,
    completedDate: null,
    amountTaxSpEs: 0,
    overallValue: 0,
    subAmount: 0,
  });

  console.log(currentInvoice);

  const handleInvoices = () => {
    setReloadInvoiceHistory(true);
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <NewInvoiceForm currentInvoice={currentInvoice} setCurrentInvoice={setCurrentInvoice} />
        <InvoiceProducts
          currentInvoice={currentInvoice}
          setCurrentInvoice={setCurrentInvoice}
          onInvoiceSaved={() => setReloadInvoices((prev) => !prev)}
        />
      </div>
      <InvoiceHistory reloadTrigger={reloadInvoices} />
        {*/     onInvoiceCreated={handleInvoices}
        />
      </div>
      <InvoiceHistory reloadInvoiceHistory={reloadInvoiceHistory} />
        /*} 
    </div>
  );
}

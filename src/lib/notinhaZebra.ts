export type NotinhaLine = {
  code: string;
  name: string;
  detail?: string;
  qty: string;
  amount: string;
};

export type Notinha = {
  code: string;
  issuedAt: string;
  seller?: string;
  clientName: string;
  clientMeta?: string;
  lines: NotinhaLine[];
  payment?: string;
  paymentMeta?: string;
  total: string;
  printedAt: string;
};

type NotinhaApi = {
  print: (receipt: Notinha) => Promise<void>;
};

declare global {
  interface Window {
    NotinhaZebra?: NotinhaApi;
  }
}

function loadApi() {
  if (window.NotinhaZebra) return Promise.resolve(window.NotinhaZebra);
  return new Promise<NotinhaApi>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "/notinha-zebra.js";
    script.async = true;
    script.onload = () => {
      if (window.NotinhaZebra) resolve(window.NotinhaZebra);
      else reject(new Error("Não achei o envio da notinha."));
    };
    script.onerror = () => reject(new Error("Não achei o envio da notinha."));
    document.head.appendChild(script);
  });
}

export async function printNotinha(receipt: Notinha) {
  const api = await loadApi();
  await api.print(receipt);
}

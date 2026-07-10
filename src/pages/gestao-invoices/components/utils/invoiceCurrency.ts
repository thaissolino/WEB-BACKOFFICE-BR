/** Moeda de compra do fornecedor. null/undefined = legado, tratado como USD. */
export type SupplierCurrency = "USD" | "BRL" | null | undefined;

/** Fornecedor em Real — mercadoria já comprada em R$, sem conversão para $. */
export function isBrlSupplierCurrency(currency: SupplierCurrency): boolean {
  return currency === "BRL";
}

/** Fornecedores antigos (sem moeda cadastrada) são tratados como Dólar ($). */
export function isUsdSupplierCurrency(currency: SupplierCurrency): boolean {
  return !isBrlSupplierCurrency(currency);
}

export function productCurrencySymbol(currency: SupplierCurrency): "$" | "R$" {
  return isBrlSupplierCurrency(currency) ? "R$" : "$";
}

export function formatProductMoney(value: number, currency: SupplierCurrency): string {
  if (isBrlSupplierCurrency(currency)) {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Converte valor unitário + frete SP para Real na exibição de relatórios.
 * - Fornecedor USD: produto está em $ → multiplica pelo câmbio da nota.
 * - Fornecedor BRL: produto já está em R$ → soma direto, sem câmbio.
 */
export function calcValorRealUnitario(
  valorUnitarioComTaxasFrete: number,
  freteSpEsRate: number,
  supplierCurrency: SupplierCurrency,
  dollarRate?: number | null
): number {
  if (isBrlSupplierCurrency(supplierCurrency)) {
    return valorUnitarioComTaxasFrete + freteSpEsRate;
  }
  return valorUnitarioComTaxasFrete * (dollarRate ?? 1) + freteSpEsRate;
}

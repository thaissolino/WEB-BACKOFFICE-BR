export interface Operacao {
  id: number;
  date: string;
  city: string;
  value: number;
  collectorId: number;
  supplierId: number;
  collectorTax: number;
  supplierTax: number;
  profit: number;
}

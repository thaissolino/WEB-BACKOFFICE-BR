const BARCODE_LENGTH = 12;

/** Código de 3 dígitos do produto, com zeros só na frente, para a leitora. */
export function barcodeFromProductCode(code: string): string {
  const digits = (code || "").replace(/\D/g, "").replace(/^0+/, "") || "0";
  const width = Math.max(BARCODE_LENGTH, digits.length + (digits.length % 2));
  return digits.padStart(width, "0");
}

/** A leitora devolve os zeros. Aqui eles saem e fica o código do produto. */
export function productCodeFromBarcode(value: string): string {
  const digits = (value || "").replace(/\D/g, "");
  if (!digits) return "";
  return digits.replace(/^0+/, "") || "0";
}

export function sameProductCode(stored: string, scanned: string): boolean {
  const left = (stored || "").trim().toLowerCase();
  const right = (scanned || "").trim().toLowerCase();
  if (left && left === right) return true;
  const fromStored = productCodeFromBarcode(stored);
  const fromScanned = productCodeFromBarcode(scanned);
  return Boolean(fromStored && fromScanned && fromStored === fromScanned);
}

export type IdentifierMergeResult = {
  merged: string[];
  addedCount: number;
  duplicateCount: number;
  invalidCount: number;
};

export type IdentifierInputPreview = {
  totalTokens: number;
  validCount: number;
  addedCount: number;
  duplicateCount: number;
  invalidCount: number;
  invalidTokens: string[];
};

const normalizeCandidate = (value: string): string => value.replace(/[^A-Za-z0-9]/g, "").toUpperCase();

/**
 * Normaliza IMEI/serial removendo espaços, hífens etc.
 * Casos de teste:
 * - "35 003523 653788 4" → "350035236537884"
 * - "35 003523 691618 7" → "350035236916187"
 */
export const normalizeImeiOrSerial = normalizeCandidate;

const isValidImei = (value: string): boolean => /^\d{15}$/.test(value);

/** Serial Apple: 10–12 pode ser só letras (Watch). 13–15 exige letra e número. */
const isValidSerial = (value: string): boolean => {
  if (value.length < 10 || value.length > 15) return false;
  if (!/^[A-Z0-9]+$/.test(value) || !/[A-Z]/.test(value)) return false;
  if (/\d+(GB|TB)/i.test(value)) return false;
  if (value.length <= 12) return true;
  return /\d/.test(value);
};

export const isValidImeiOrSerial = (value: string): boolean => {
  const normalized = normalizeCandidate(value);
  return isValidImei(normalized) || isValidSerial(normalized);
};

const isValidIdentifier = (value: string): boolean => isValidImei(value) || isValidSerial(value);

export const collectIdentifiers = (input: string): { valid: string[]; invalid: string[] } => {
  const valid: string[] = [];
  const invalid: string[] = [];
  const seen = new Set<string>();

  for (const token of tokenizeIdentifiers(input)) {
    const normalized = normalizeCandidate(token);
    if (!normalized || !isValidIdentifier(normalized)) {
      invalid.push(token);
      continue;
    }
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    valid.push(normalized);
  }

  return { valid, invalid };
};

const tokenizeIdentifiers = (input: string): string[] => {
  const chunks = input
    .split(/[,\n;:]+/g)
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  const tokens: string[] = [];

  for (const chunk of chunks) {
    // Linha só com dígitos/espaços formando um IMEI de 15 dígitos (ex. tela Sobre do iPhone)
    const digitsOnly = chunk.replace(/[^\d]/g, "");
    if (/^\d{15}$/.test(digitsOnly) && /^[\d\s]+$/.test(chunk)) {
      tokens.push(digitsOnly);
      continue;
    }

    tokens.push(
      ...chunk
        .split(/\s+/g)
        .map((item) => item.trim())
        .filter(Boolean),
    );
  }

  return tokens;
};

export const previewIdentifiersInput = (existing: string[], input: string): IdentifierInputPreview => {
  const tokens = tokenizeIdentifiers(input);
  const normalizedExisting = existing.map(normalizeCandidate).filter(Boolean);
  const seen = new Set(normalizedExisting);

  const invalidTokens: string[] = [];
  let validCount = 0;
  let addedCount = 0;
  let duplicateCount = 0;
  let invalidCount = 0;

  for (const token of tokens) {
    const normalized = normalizeCandidate(token);
    if (!normalized || !isValidIdentifier(normalized)) {
      invalidCount += 1;
      invalidTokens.push(token);
      continue;
    }

    validCount += 1;
    if (seen.has(normalized)) {
      duplicateCount += 1;
      continue;
    }
    seen.add(normalized);
    addedCount += 1;
  }

  return {
    totalTokens: tokens.length,
    validCount,
    addedCount,
    duplicateCount,
    invalidCount,
    invalidTokens,
  };
};

export const mergeValidatedIdentifiers = (existing: string[], input: string): IdentifierMergeResult => {
  const tokens = tokenizeIdentifiers(input);
  const normalizedExisting = existing.map(normalizeCandidate).filter(Boolean);
  const merged = [...existing];
  const seen = new Set(normalizedExisting);

  let addedCount = 0;
  let duplicateCount = 0;
  let invalidCount = 0;

  for (const token of tokens) {
    const normalized = normalizeCandidate(token);
    if (!normalized || !isValidIdentifier(normalized)) {
      invalidCount += 1;
      continue;
    }

    if (seen.has(normalized)) {
      duplicateCount += 1;
      continue;
    }

    seen.add(normalized);
    merged.push(normalized);
    addedCount += 1;
  }

  return {
    merged,
    addedCount,
    duplicateCount,
    invalidCount,
  };
};

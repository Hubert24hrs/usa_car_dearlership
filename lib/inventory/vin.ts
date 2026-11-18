/**
 * VIN helpers (ISO 3779 / 49 CFR 565). Client-safe.
 */

/** 17 characters, letters I, O and Q are never used. */
export const VIN_REGEX = /^[A-HJ-NPR-Z0-9]{17}$/;

const TRANSLITERATION: Record<string, number> = {
  A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8,
  J: 1, K: 2, L: 3, M: 4, N: 5, P: 7, R: 9,
  S: 2, T: 3, U: 4, V: 5, W: 6, X: 7, Y: 8, Z: 9,
};
const WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];

export function normalizeVin(input: string): string {
  return input.trim().toUpperCase().replace(/[\s-]/g, "");
}

export function isValidVinFormat(vin: string): boolean {
  return VIN_REGEX.test(vin);
}

function charValue(ch: string): number {
  if (ch >= "0" && ch <= "9") return Number(ch);
  const value = TRANSLITERATION[ch];
  if (value === undefined) throw new RangeError(`Invalid VIN character: ${ch}`);
  return value;
}

/** North-American check digit (position 9). Returns "0"–"9" or "X". */
export function computeVinCheckDigit(vin: string): string {
  const v = normalizeVin(vin);
  if (v.length !== 17) throw new RangeError("VIN must be 17 characters");
  let sum = 0;
  for (let i = 0; i < 17; i++) sum += charValue(v[i]!) * WEIGHTS[i]!;
  const remainder = sum % 11;
  return remainder === 10 ? "X" : String(remainder);
}

/**
 * True when the check digit matches. Only North-American VINs are required to
 * carry a valid check digit, so the importer treats a mismatch as a warning.
 */
export function hasValidCheckDigit(vin: string): boolean {
  const v = normalizeVin(vin);
  if (!isValidVinFormat(v)) return false;
  return v[8] === computeVinCheckDigit(v);
}

/** Replace position 9 with the correct check digit (used by the demo seed). */
export function withCheckDigit(vin: string): string {
  const v = normalizeVin(vin);
  return v.slice(0, 8) + computeVinCheckDigit(v) + v.slice(9);
}

/**
 * File parsing for admin uploads and feed downloads (CSV / JSON → records).
 */
import Papa from "papaparse";

export type ParseResult = {
  records: Record<string, unknown>[];
  errors: { row: number; message: string }[];
};

export function parseCsv(text: string): ParseResult {
  const result = Papa.parse<Record<string, string>>(text.replace(/^﻿/, ""), {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.trim(),
  });
  return {
    records: result.data,
    errors: result.errors.map((e) => ({
      // +2: header row + 1-based rows
      row: (e.row ?? 0) + 2,
      message: e.message,
    })),
  };
}

/**
 * Accepts `[...]`, `{ "vehicles": [...] }`, `{ "inventory": [...] }`,
 * `{ "data": [...] }` or `{ "items": [...] }`.
 */
export function parseJson(text: string): ParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text.replace(/^﻿/, ""));
  } catch (error) {
    return { records: [], errors: [{ row: 0, message: `Invalid JSON: ${(error as Error).message}` }] };
  }
  const list = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === "object"
      ? (["vehicles", "inventory", "data", "items", "results"]
          .map((k) => (parsed as Record<string, unknown>)[k])
          .find(Array.isArray) as unknown[] | undefined)
      : undefined;
  if (!list) {
    return { records: [], errors: [{ row: 0, message: "Expected an array of vehicles or { vehicles: [...] }" }] };
  }
  const records: Record<string, unknown>[] = [];
  const errors: ParseResult["errors"] = [];
  list.forEach((item, index) => {
    if (item && typeof item === "object" && !Array.isArray(item)) records.push(item as Record<string, unknown>);
    else errors.push({ row: index + 1, message: "Each vehicle must be a JSON object" });
  });
  return { records, errors };
}

export function parseInventoryFile(text: string, format: "csv" | "json"): ParseResult {
  return format === "csv" ? parseCsv(text) : parseJson(text);
}

export function detectFormat(fileName: string, text: string): "csv" | "json" {
  if (/\.json$/i.test(fileName)) return "json";
  if (/\.csv$/i.test(fileName)) return "csv";
  const first = text.trimStart()[0];
  return first === "[" || first === "{" ? "json" : "csv";
}

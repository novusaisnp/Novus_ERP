// CSV server-side — sem Blob/document/URL. Retorna Uint8Array pronto para upload.
// Escapa aspas, envolve campos com vírgula/aspas/quebra de linha. Encoding UTF-8 com BOM.

function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = typeof value === "string" ? value : String(value);
  const needsQuote = /[",\r\n]/.test(s);
  const escaped = s.replace(/"/g, '""');
  return needsQuote ? `"${escaped}"` : escaped;
}

export interface CsvExportInput {
  columns: string[];
  rows: Array<Record<string, unknown>>;
}

export function exportCsvServer(input: CsvExportInput): Uint8Array {
  const lines: string[] = [];
  lines.push(input.columns.map(escapeCell).join(","));
  for (const row of input.rows) {
    lines.push(input.columns.map((c) => escapeCell(row[c])).join(","));
  }
  const body = lines.join("\r\n");
  const bom = "\uFEFF";
  return new TextEncoder().encode(bom + body);
}

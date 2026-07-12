// XLSX server-side via exceljs (npm). Sem uso de Blob/document/URL.
// Retorna Uint8Array. Import dinâmico para evitar carregar em runs que só usam CSV/PDF.

export interface XlsxExportInput {
  sheetName: string;
  columns: string[];
  rows: Array<Record<string, unknown>>;
}

export async function exportXlsxServer(input: XlsxExportInput): Promise<Uint8Array> {
  // deno-lint-ignore no-explicit-any
  const ExcelJS: any = await import("npm:exceljs@4.4.0");
  const WorkbookCtor = ExcelJS.Workbook ?? ExcelJS.default?.Workbook;
  const wb = new WorkbookCtor();
  const ws = wb.addWorksheet(input.sheetName.slice(0, 31) || "Relatório");
  ws.columns = input.columns.map((c) => ({ header: c, key: c, width: 20 }));
  for (const row of input.rows) ws.addRow(row);
  ws.getRow(1).font = { bold: true };
  const buf = await wb.xlsx.writeBuffer();
  return new Uint8Array(buf);
}

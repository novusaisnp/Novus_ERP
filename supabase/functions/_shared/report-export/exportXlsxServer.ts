// XLSX server-side via exceljs (npm). Sem uso de Blob/document/URL.
// Retorna Uint8Array. Import dinâmico para evitar carregar em runs que só usam CSV/PDF.

import type { Branding } from "./branding.ts";

export interface XlsxExportInput {
  sheetName: string;
  columns: string[];
  rows: Array<Record<string, unknown>>;
  branding?: Branding | null;
}

export async function exportXlsxServer(input: XlsxExportInput): Promise<Uint8Array> {
  // deno-lint-ignore no-explicit-any
  const ExcelJS: any = await import("npm:exceljs@4.4.0");
  const WorkbookCtor = ExcelJS.Workbook ?? ExcelJS.default?.Workbook;
  const wb = new WorkbookCtor();
  const ws = wb.addWorksheet(input.sheetName.slice(0, 31) || "Relatório");

  let headerRowIndex = 1;
  const branding = input.branding ?? null;

  // Cabeçalho de branding (fallback resiliente).
  try {
    if (branding?.logo) {
      const imgId = wb.addImage({
        buffer: branding.logo.bytes,
        extension: branding.logo.extension.toLowerCase() as "png" | "jpeg",
      });
      ws.addImage(imgId, { tl: { col: 0, row: 0 }, ext: { width: 120, height: 40 } });
      // Reserva 3 linhas para o header visual.
      ws.getRow(1).height = 35;
      headerRowIndex = 3;
    }
    if (branding?.companyName) {
      const nameRow = ws.getRow(headerRowIndex);
      nameRow.getCell(1).value = branding.companyName;
      nameRow.getCell(1).font = { bold: true, size: 12 };
      headerRowIndex += 1;
    }
  } catch {
    // Falha no branding não impede geração do relatório.
    headerRowIndex = 1;
  }

  // Cabeçalhos das colunas.
  const headerRow = ws.getRow(headerRowIndex);
  input.columns.forEach((c, i) => {
    headerRow.getCell(i + 1).value = c;
  });
  headerRow.font = { bold: true };

  // Larguras.
  ws.columns = input.columns.map((c) => ({ key: c, width: 20, header: undefined }));

  // Dados.
  for (const row of input.rows) {
    ws.addRow(input.columns.map((c) => row[c] ?? ""));
  }

  const buf = await wb.xlsx.writeBuffer();
  return new Uint8Array(buf);
}

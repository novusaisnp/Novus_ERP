// Limites operacionais centralizados para geração de relatórios agendados (P5.3).
// Compartilhado entre run-report-schedules e futuros consumidores server-side.

export const MAX_ROWS_CSV = 100_000;
export const MAX_ROWS_XLSX = 50_000;
export const MAX_ROWS_PDF = 5_000;

/** Tamanho de página server-side na leitura paginada de escopo. */
export const PAGE_SIZE = 5_000;

/** Orçamento total (ms) por run — cobre queries, branding e geração. */
export const RUN_TIMEOUT_MS = 90_000;

export type ExportFormat = "csv" | "xlsx" | "pdf";

export function maxRowsForFormat(format: ExportFormat): number {
  switch (format) {
    case "csv":
      return MAX_ROWS_CSV;
    case "xlsx":
      return MAX_ROWS_XLSX;
    case "pdf":
      return MAX_ROWS_PDF;
  }
}

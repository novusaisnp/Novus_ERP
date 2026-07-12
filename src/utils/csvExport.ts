export interface CsvColumn<T> {
  header: string;
  accessor: (row: T) => string | number | null | undefined;
}

const escapeField = (val: string | number | null | undefined, sep: string): string => {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(sep) || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

export function toCsv<T>(rows: T[], columns: CsvColumn<T>[], separator = ';'): string {
  const head = columns.map((c) => escapeField(c.header, separator)).join(separator);
  const body = rows
    .map((row) => columns.map((c) => escapeField(c.accessor(row), separator)).join(separator))
    .join('\r\n');
  return body ? `${head}\r\n${body}` : head;
}

export function downloadCsv(filename: string, csv: string): void {
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

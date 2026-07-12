// PDF server-side via jsPDF + autotable. Sem Blob/document/URL.
// jsPDF em Deno usa Uint8Array via output('arraybuffer').

export interface PdfExportInput {
  title: string;
  columns: string[];
  rows: Array<Record<string, unknown>>;
}

export async function exportPdfServer(input: PdfExportInput): Promise<Uint8Array> {
  // deno-lint-ignore no-explicit-any
  const jspdfMod: any = await import("npm:jspdf@2.5.2");
  // deno-lint-ignore no-explicit-any
  const autotableMod: any = await import("npm:jspdf-autotable@3.8.4");
  const jsPDF = jspdfMod.jsPDF ?? jspdfMod.default;
  const autoTable = autotableMod.default ?? autotableMod;

  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  doc.setFontSize(14);
  doc.text(input.title, 40, 40);

  const body = input.rows.map((r) =>
    input.columns.map((c) => {
      const v = r[c];
      return v === null || v === undefined ? "" : String(v);
    }),
  );

  autoTable(doc, {
    head: [input.columns],
    body,
    startY: 60,
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [30, 41, 59] },
  });

  const buf = doc.output("arraybuffer") as ArrayBuffer;
  return new Uint8Array(buf);
}

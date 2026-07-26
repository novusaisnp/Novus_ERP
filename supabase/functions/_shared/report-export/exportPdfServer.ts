// PDF server-side via jsPDF + autotable. Sem Blob/document/URL.
// jsPDF em Deno usa Uint8Array via output('arraybuffer').

import type { Branding } from "./branding.ts";

export interface PdfExportInput {
  title: string;
  columns: string[];
  rows: Array<Record<string, unknown>>;
  branding?: Branding | null;
}

function parseHexColor(hex: string | null | undefined): [number, number, number] | null {
  if (!hex) return null;
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

export async function exportPdfServer(input: PdfExportInput): Promise<Uint8Array> {
  interface JsPdfInstance {
    setFontSize: (n: number) => void;
    setTextColor: (...args: number[]) => void;
    text: (text: string, x: number, y: number) => void;
    addImage: (uri: string, ext: string, x: number, y: number, w: number, h: number) => void;
    output: (type: string) => unknown;
  }
  const jspdfMod = (await import("npm:jspdf@2.5.2")) as Record<string, unknown>;
  const autotableMod = (await import("npm:jspdf-autotable@3.8.4")) as Record<string, unknown>;
  const jsPDF = (jspdfMod.jsPDF ?? jspdfMod.default) as new (opts: unknown) => JsPdfInstance;
  const autoTable = (autotableMod.default ?? autotableMod) as (doc: unknown, opts: unknown) => void;

  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const branding = input.branding ?? null;

  let cursorY = 40;

  // Header de branding (fallback resiliente).
  try {
    if (branding?.logo) {
      const b64 = btoa(String.fromCharCode(...branding.logo.bytes));
      const dataUri = `data:${branding.logo.contentType};base64,${b64}`;
      doc.addImage(dataUri, branding.logo.extension, 40, 20, 90, 30);
      cursorY = 65;
    }
    if (branding?.companyName) {
      doc.setFontSize(10);
      doc.setTextColor(80, 80, 80);
      doc.text(branding.companyName, 140, 38);
      cursorY = Math.max(cursorY, 65);
    }
  } catch {
    cursorY = 40;
  }

  doc.setFontSize(14);
  doc.setTextColor(20, 20, 20);
  doc.text(input.title, 40, cursorY);

  const body = input.rows.map((r) =>
    input.columns.map((c) => {
      const v = r[c];
      return v === null || v === undefined ? "" : String(v);
    }),
  );

  const headFill = parseHexColor(branding?.primaryColor ?? null) ?? [30, 41, 59];

  autoTable(doc, {
    head: [input.columns],
    body,
    startY: cursorY + 15,
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: headFill },
  });

  const buf = doc.output("arraybuffer") as ArrayBuffer;
  return new Uint8Array(buf);
}

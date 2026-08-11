// PDF server-side via jsPDF + autotable. Sem Blob/document/URL.
// jsPDF em Deno usa Uint8Array via output('arraybuffer').
//
// Header/rodapé aqui replicam visualmente src/utils/pdfReportLayout.ts (BRAND_NAVY,
// margem 40pt, régua fina, rótulo+título+meta à direita) — reimplementação paralela,
// não import cross-boundary: supabase/functions/** roda em Deno, fora do bundle do
// client e fora de typecheck/test (ver CLAUDE.md), então compartilhar código exigiria
// infraestrutura de build nova pra ~30 linhas. Qualquer mudança de design no client
// precisa ser replicada aqui manualmente.

import type { Branding } from "./branding.ts";

export interface PdfExportInput {
  title: string;
  columns: string[];
  rows: Array<Record<string, unknown>>;
  branding?: Branding | null;
}

const BRAND_NAVY: [number, number, number] = [7, 33, 84];
const BRAND_ACCENT: [number, number, number] = [27, 159, 220];
const MARGIN = 40;

function parseHexColor(hex: string | null | undefined): [number, number, number] | null {
  if (!hex) return null;
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

interface JsPdfInstance {
  setFontSize: (n: number) => void;
  setFont: (family: string, style: string) => void;
  setTextColor: (...args: number[]) => void;
  setDrawColor: (...args: number[]) => void;
  setLineWidth: (n: number) => void;
  line: (x1: number, y1: number, x2: number, y2: number) => void;
  text: (text: string, x: number, y: number, opts?: Record<string, unknown>) => void;
  addImage: (uri: string, ext: string, x: number, y: number, w: number, h: number) => void;
  output: (type: string) => unknown;
  internal: {
    pageSize: { getWidth: () => number; getHeight: () => number };
    pages: unknown[];
  };
  setPage: (n: number) => void;
}

export async function exportPdfServer(input: PdfExportInput): Promise<Uint8Array> {
  const jspdfMod = (await import("npm:jspdf@4.2.1")) as Record<string, unknown>;
  const autotableMod = (await import("npm:jspdf-autotable@5.0.8")) as Record<string, unknown>;
  const jsPDF = (jspdfMod.jsPDF ?? jspdfMod.default) as new (opts: unknown) => JsPdfInstance;
  const autoTable = (autotableMod.default ?? autotableMod) as (doc: unknown, opts: unknown) => void;

  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const branding = input.branding ?? null;
  const pageWidth = doc.internal.pageSize.getWidth();

  // ---- Cabeçalho (companhia à esquerda, título à direita, régua fina) ----
  let logoWidth = 0;
  let logoHeight = 0;
  try {
    if (branding?.logo) {
      const b64 = btoa(String.fromCharCode(...branding.logo.bytes));
      const dataUri = `data:${branding.logo.contentType};base64,${b64}`;
      logoWidth = 90;
      logoHeight = 30;
      doc.addImage(dataUri, branding.logo.extension, MARGIN, MARGIN - logoHeight * 0.7, logoWidth, logoHeight);
    }
  } catch {
    logoWidth = 0;
    logoHeight = 0;
  }

  const textX = logoWidth > 0 ? MARGIN + logoWidth + MARGIN * 0.2 : MARGIN;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11.5);
  doc.setTextColor(BRAND_NAVY[0], BRAND_NAVY[1], BRAND_NAVY[2]);
  doc.text(branding?.companyName || "Empresa", textX, MARGIN);

  let rightY = MARGIN - MARGIN * 0.4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(BRAND_ACCENT[0], BRAND_ACCENT[1], BRAND_ACCENT[2]);
  doc.text("RELATÓRIO", pageWidth - MARGIN, rightY, { align: "right" });

  rightY += MARGIN * 0.34;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(30, 30, 30);
  doc.text(input.title, pageWidth - MARGIN, rightY, { align: "right" });

  rightY += MARGIN * 0.3;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(110, 110, 110);
  doc.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, pageWidth - MARGIN, rightY, { align: "right" });
  rightY += MARGIN * 0.27;

  const headerBottom = Math.max(MARGIN + logoHeight * 0.3, rightY) + MARGIN * 0.15;
  doc.setDrawColor(BRAND_NAVY[0], BRAND_NAVY[1], BRAND_NAVY[2]);
  doc.setLineWidth(MARGIN * 0.02);
  doc.line(MARGIN, headerBottom, pageWidth - MARGIN, headerBottom);
  doc.setTextColor(0, 0, 0);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.2);

  const cursorY = headerBottom + MARGIN * 0.4;

  // ---- Tabela ----
  const body = input.rows.map((r) =>
    input.columns.map((c) => {
      const v = r[c];
      return v === null || v === undefined ? "" : String(v);
    }),
  );

  const headFill = parseHexColor(branding?.primaryColor ?? null) ?? BRAND_NAVY;

  autoTable(doc, {
    head: [input.columns],
    body,
    startY: cursorY,
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: headFill },
    margin: { left: MARGIN, right: MARGIN },
  });

  // ---- Rodapé (fonte de emissão + página X de Y, todas as páginas) ----
  const pageHeight = doc.internal.pageSize.getHeight();
  const ruleY = pageHeight - MARGIN * 0.85;
  const textY = pageHeight - MARGIN * 0.55;
  const totalPages = doc.internal.pages.length - 1;
  for (let i = 1; i <= totalPages; i += 1) {
    doc.setPage(i);
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(MARGIN * 0.015);
    doc.line(MARGIN, ruleY, pageWidth - MARGIN, ruleY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(140, 140, 140);
    doc.text("Emitido via NOVUS.AI ERP", MARGIN, textY);
    doc.text(`Página ${i} de ${totalPages}`, pageWidth - MARGIN, textY, { align: "right" });
  }

  const buf = doc.output("arraybuffer") as ArrayBuffer;
  return new Uint8Array(buf);
}

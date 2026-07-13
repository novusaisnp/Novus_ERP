// Exportação PDF executivo (P4.1). Dynamic import de jspdf + jspdf-autotable.
import type { ReportExportPayload } from './reportExportShared';
import { timestampSuffix } from './reportExportShared';
import { getLogoRenderSize, normalizeReportColor, resolveReportLogo } from './reportBranding';

/**
 * Gera PDF executivo 1-2 páginas com filtros, KPIs, insights e top agrupado.
 * Não rasteriza gráficos no MVP.
 */
export async function exportReportToPdf<T>(payload: ReportExportPayload<T>): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const autoTableMod = await import('jspdf-autotable');
  const autoTable = (autoTableMod as unknown as { default: (doc: unknown, opts: unknown) => void }).default;

  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const marginX = 40;
  let y = 48;

  const logo = await resolveReportLogo(payload.branding);
  if (logo) {
    const size = getLogoRenderSize(logo, 110, 42);
    try {
      doc.addImage(logo.dataUrl, logo.extension.toUpperCase(), marginX, 24, size.width, size.height);
      y = Math.max(y, 24 + size.height + 24);
    } catch {
      y = 48;
    }
  }

  if (payload.branding?.companyName) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(90);
    doc.text(payload.branding.companyName, logo ? 165 : marginX, logo ? 39 : 28);
    doc.setTextColor(0);
  }

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(payload.title, marginX, y);
  y += 20;

  if (payload.subtitle) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(payload.subtitle, marginX, y);
    y += 14;
  }

  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, marginX, y);
  doc.setTextColor(0);
  y += 16;

  if (payload.filters.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [['Filtro', 'Valor']],
      body: payload.filters.map((f) => [f.label, f.value]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: normalizeReportColor(payload.branding?.primaryColor) ?? [30, 41, 59] },
      margin: { left: marginX, right: marginX },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 14;
  }

  if (payload.kpis.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [['Indicador', 'Valor', 'Variação']],
      body: payload.kpis.map((k) => [k.label, k.value, k.delta ?? '—']),
      styles: { fontSize: 9 },
      headStyles: { fillColor: normalizeReportColor(payload.branding?.primaryColor) ?? [30, 41, 59] },
      margin: { left: marginX, right: marginX },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 14;
  }

  if (payload.insights.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [['Severidade', 'Insight', 'Detalhe']],
      body: payload.insights.map((i) => [i.severity, i.title, i.description ?? '']),
      styles: { fontSize: 9, cellPadding: 4 },
      headStyles: { fillColor: normalizeReportColor(payload.branding?.primaryColor) ?? [30, 41, 59] },
      margin: { left: marginX, right: marginX },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 14;
  }

  if (payload.aggregated && payload.aggregated.rows.length > 0) {
    const top = payload.aggregated.rows.slice(0, 10);
    autoTable(doc, {
      startY: y,
      head: [[payload.aggregated.groupLabel, 'Qtd', 'Valor', '%']],
      body: top.map((r) => [
        r.label,
        String(r.quantidade),
        r.valor_total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
        r.percentual.toFixed(2) + '%',
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: normalizeReportColor(payload.branding?.primaryColor) ?? [30, 41, 59] },
      margin: { left: marginX, right: marginX },
    });
  }

  doc.save(`${payload.filenameBase}-${timestampSuffix()}.pdf`);
}

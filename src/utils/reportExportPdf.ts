// Exportação PDF executivo (P4.1). Dynamic import de jspdf + jspdf-autotable.
import type { ReportExportPayload } from './reportExportShared';
import { timestampSuffix } from './reportExportShared';
import { normalizeReportColor, resolveReportLogo } from './reportBranding';
import { drawReportHeader, drawReportFooter, BRAND_NAVY } from './pdfReportLayout';

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

  const logo = await resolveReportLogo(payload.branding);
  let y = drawReportHeader(doc, {
    marginX,
    docTypeLabel: 'Relatório',
    title: payload.title,
    metaLines: [
      payload.subtitle,
      `Gerado em: ${new Date().toLocaleString('pt-BR')}`,
    ].filter((line): line is string => Boolean(line)),
    branding: payload.branding,
    logo,
  });

  if (payload.filters.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [['Filtro', 'Valor']],
      body: payload.filters.map((f) => [f.label, f.value]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: normalizeReportColor(payload.branding?.primaryColor) ?? BRAND_NAVY },
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
      headStyles: { fillColor: normalizeReportColor(payload.branding?.primaryColor) ?? BRAND_NAVY },
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
      headStyles: { fillColor: normalizeReportColor(payload.branding?.primaryColor) ?? BRAND_NAVY },
      margin: { left: marginX, right: marginX },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 14;
  }

  if (payload.detail.rows.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [payload.detail.columns.map((c) => c.header)],
      body: payload.detail.rows.map((row) => payload.detail.columns.map((c) => String(c.accessor(row)))),
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: normalizeReportColor(payload.branding?.primaryColor) ?? BRAND_NAVY },
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
      headStyles: { fillColor: normalizeReportColor(payload.branding?.primaryColor) ?? BRAND_NAVY },
      margin: { left: marginX, right: marginX },
    });
  }

  drawReportFooter(doc, { marginX });
  doc.save(`${payload.filenameBase}-${timestampSuffix()}.pdf`);
}

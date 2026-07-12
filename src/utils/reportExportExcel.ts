// Exportação Excel multi-aba (P4.1). Dynamic import de exceljs no clique.
import type { ReportExportPayload } from './reportExportShared';
import { brlPt, percentPt, timestampSuffix } from './reportExportShared';

/**
 * Dispara download de arquivo Excel com abas Resumo / Detalhado / Agrupado.
 * exceljs é importado dinamicamente para não inflar bundle inicial.
 */
export async function exportReportToExcel<T>(payload: ReportExportPayload<T>): Promise<void> {
  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'NOVUS ERP';
  workbook.created = new Date();

  // ---------- Aba Resumo ----------
  const resumo = workbook.addWorksheet('Resumo');
  resumo.columns = [
    { header: '', key: 'a', width: 30 },
    { header: '', key: 'b', width: 30 },
    { header: '', key: 'c', width: 30 },
  ];

  const titleRow = resumo.addRow([payload.title]);
  titleRow.font = { bold: true, size: 16 };
  if (payload.subtitle) resumo.addRow([payload.subtitle]);
  resumo.addRow([`Gerado em: ${new Date().toLocaleString('pt-BR')}`]);
  resumo.addRow([]);

  if (payload.filters.length > 0) {
    const h = resumo.addRow(['Filtros aplicados']);
    h.font = { bold: true };
    for (const f of payload.filters) resumo.addRow([f.label, f.value]);
    resumo.addRow([]);
  }

  if (payload.kpis.length > 0) {
    const h = resumo.addRow(['Indicadores']);
    h.font = { bold: true };
    const kpiHead = resumo.addRow(['Indicador', 'Valor', 'Variação']);
    kpiHead.font = { bold: true };
    for (const k of payload.kpis) resumo.addRow([k.label, k.value, k.delta ?? '—']);
    resumo.addRow([]);
  }

  if (payload.insights.length > 0) {
    const h = resumo.addRow(['Insights']);
    h.font = { bold: true };
    const insHead = resumo.addRow(['Severidade', 'Título', 'Descrição']);
    insHead.font = { bold: true };
    for (const i of payload.insights) {
      resumo.addRow([i.severity, i.title, i.description ?? '']);
    }
  }

  // ---------- Aba Detalhado ----------
  const detalhe = workbook.addWorksheet('Detalhado');
  detalhe.columns = payload.detail.columns.map((c) => ({ header: c.header, key: c.header, width: 22 }));
  const headerRow = detalhe.getRow(1);
  headerRow.font = { bold: true };
  for (const r of payload.detail.rows) {
    detalhe.addRow(payload.detail.columns.map((c) => c.accessor(r)));
  }

  // ---------- Aba Agrupado (opcional) ----------
  if (payload.aggregated && payload.aggregated.rows.length > 0) {
    const agr = workbook.addWorksheet('Agrupado');
    agr.columns = [
      { header: payload.aggregated.groupLabel, key: 'grupo', width: 30 },
      { header: 'Quantidade', key: 'qtd', width: 15 },
      { header: 'Valor Total', key: 'valor', width: 20 },
      { header: 'Percentual', key: 'pct', width: 15 },
    ];
    agr.getRow(1).font = { bold: true };
    for (const row of payload.aggregated.rows) {
      agr.addRow([row.label, row.quantidade, brlPt(row.valor_total), percentPt(row.percentual)]);
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${payload.filenameBase}-${timestampSuffix()}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

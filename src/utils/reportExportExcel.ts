// Exportação Excel multi-aba (P4.1). Dynamic import de exceljs no clique.
import type ExcelJS from 'exceljs';
import type { ReportExportPayload } from './reportExportShared';
import { brlPt, percentPt, timestampSuffix } from './reportExportShared';
import { resolveReportLogo } from './reportBranding';

/**
 * Layout padrão de impressão/exportação: sempre paisagem, ajustado à largura da
 * página — causa raiz do "sai desconfigurado" (nenhum gerador definia isso antes).
 */
export function applyStandardExportLayout(ws: ExcelJS.Worksheet): void {
  ws.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
}

/**
 * Dispara download de arquivo Excel com abas Resumo / Detalhado / Agrupado.
 * exceljs é importado dinamicamente para não inflar bundle inicial.
 */
export async function exportReportToExcel<T>(payload: ReportExportPayload<T>): Promise<void> {
  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'NOVUS ERP';
  workbook.created = new Date();
  const logo = await resolveReportLogo(payload.branding);

  const HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEF2F9' } } as const;

  // ---------- Aba Resumo ----------
  const resumo = workbook.addWorksheet('Resumo', { properties: { defaultRowHeight: 15 } });
  applyStandardExportLayout(resumo);
  resumo.columns = [
    { header: '', key: 'a', width: 30 },
    { header: '', key: 'b', width: 30 },
    { header: '', key: 'c', width: 30 },
  ];

  if (logo) {
    try {
      const imageId = workbook.addImage({
        base64: logo.dataUrl,
        extension: logo.extension,
      });
      resumo.addImage(imageId, { tl: { col: 0, row: 0 }, ext: { width: 140, height: 50 } });
      resumo.getRow(1).height = 38;
      resumo.addRow([]);
      resumo.addRow([]);
    } catch {
      // Branding é best-effort: falha no logo não bloqueia exportação.
    }
  }

  if (payload.branding?.companyName) {
    const companyRow = resumo.addRow([payload.branding.companyName]);
    companyRow.font = { bold: true, size: 12 };
  }

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
  const detalhe = workbook.addWorksheet('Detalhado', { properties: { defaultRowHeight: 15 } });
  applyStandardExportLayout(detalhe);
  detalhe.columns = payload.detail.columns.map((c) => ({ header: c.header, key: c.header, width: 22 }));
  const headerRow = detalhe.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = HEADER_FILL;
  for (const r of payload.detail.rows) {
    detalhe.addRow(payload.detail.columns.map((c) => c.accessor(r)));
  }
  // Colunas marcadas align:'right' são valor numérico — número real na
  // célula (Excel já alinha à direita sozinho) mais separador de milhar
  // (Excel aplica o formato usando o locale de quem abre o arquivo).
  payload.detail.columns.forEach((c, i) => {
    if (c.align === 'right') {
      const col = detalhe.getColumn(i + 1);
      col.numFmt = '#,##0.00';
      col.alignment = { horizontal: 'right' };
    }
  });

  // ---------- Aba Agrupado (opcional) ----------
  if (payload.aggregated && payload.aggregated.rows.length > 0) {
    const agr = workbook.addWorksheet('Agrupado', { properties: { defaultRowHeight: 15 } });
    applyStandardExportLayout(agr);
    agr.columns = [
      { header: payload.aggregated.groupLabel, key: 'grupo', width: 30 },
      { header: 'Quantidade', key: 'qtd', width: 15 },
      { header: 'Valor Total', key: 'valor', width: 20 },
      { header: 'Percentual', key: 'pct', width: 15 },
    ];
    agr.getRow(1).font = { bold: true };
    agr.getRow(1).fill = HEADER_FILL;
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

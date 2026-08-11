import { useCallback, useMemo } from 'react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { FluxoCaixaItem, FluxoCaixaResumo, FluxoCaixaFiltros } from '@/types/fluxoCaixa';
import { useEmpresasRepresentadas } from '@/hooks/useEmpresasRepresentadas';
import { useEmpresasLogosMap } from '@/hooks/useEmpresasLogosMap';
import type { ReportBranding } from '@/utils/reportExportShared';
import { normalizeReportColor, resolveReportLogo } from '@/utils/reportBranding';
import { drawReportHeader, drawReportFooter, BRAND_NAVY } from '@/utils/pdfReportLayout';
import { applyStandardExportLayout } from '@/utils/reportExportExcel';

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: Record<string, unknown>) => jsPDF;
  }
}

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const formatDate = (date: string): string => new Date(date).toLocaleDateString('pt-BR');

const getFilterDescription = (filtros: FluxoCaixaFiltros): string => {
  const descriptions: string[] = [];
  if (filtros.data_inicio) descriptions.push(`De: ${formatDate(filtros.data_inicio)}`);
  if (filtros.data_fim) descriptions.push(`Até: ${formatDate(filtros.data_fim)}`);
  if (filtros.tipo_movimento && filtros.tipo_movimento !== 'TODOS') descriptions.push(`Tipo: ${filtros.tipo_movimento}`);
  if (filtros.status && filtros.status !== 'TODOS') descriptions.push(`Status: ${filtros.status}`);
  if (filtros.tipo_fluxo && filtros.tipo_fluxo !== 'TODOS') descriptions.push(`Fluxo: ${filtros.tipo_fluxo}`);
  if (filtros.busca) descriptions.push(`Busca: "${filtros.busca}"`);
  return descriptions.join(' | ');
};

export const useFluxoCaixaExport = () => {
  const { empresas } = useEmpresasRepresentadas();
  const { data: logosMap, isLoading: brandingLoading } = useEmpresasLogosMap(empresas);

  const branding: ReportBranding | null = useMemo(() => {
    const empresa = empresas.find((item) => item.ativo !== false) ?? empresas[0];
    if (!empresa?.id) return null;
    const cfg = (empresa.configuracoes as Record<string, unknown> | null | undefined) ?? {};
    return {
      companyName: empresa.nome,
      logoUrl: logosMap?.get(empresa.id) ?? null,
      primaryColor: typeof cfg.primary_color === 'string' ? cfg.primary_color : null,
    };
  }, [empresas, logosMap]);

  const exportToPDF = useCallback(async (
    movimentacoes: FluxoCaixaItem[],
    resumo: FluxoCaixaResumo | undefined,
    filtros: FluxoCaixaFiltros,
  ) => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const headerColor = normalizeReportColor(branding?.primaryColor) ?? BRAND_NAVY;
    const logo = await resolveReportLogo(branding);

    let yPosition = drawReportHeader(doc, {
      marginX: margin,
      docTypeLabel: 'Relatório',
      title: 'Fluxo de Caixa',
      metaLines: [`Gerado em: ${new Date().toLocaleString('pt-BR')}`],
      branding,
      logo,
    });

    const filterDesc = getFilterDescription(filtros);
    if (filterDesc) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Filtros Aplicados: ', margin, yPosition);
      doc.setFont('helvetica', 'normal');
      doc.text(filterDesc, margin + 30, yPosition);
      yPosition += 10;
    }

    if (resumo) {
      yPosition += 5;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('Resumo Financeiro', margin, yPosition);
      yPosition += 8;
      doc.autoTable({
        startY: yPosition,
        head: [['Indicador', 'Valor']],
        body: [
          ['Total de Entradas', formatCurrency(resumo.total_entradas)],
          ['Total de Saídas', formatCurrency(resumo.total_saidas)],
          ['Saldo Atual', formatCurrency(resumo.saldo_atual)],
          ['Saldo Projetado (30d)', formatCurrency(resumo.saldo_projetado_30d)],
          ['Capital de Giro', formatCurrency(resumo.capital_giro)],
          ['Runway', `${resumo.runway_dias} dias`],
        ],
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: headerColor, textColor: 255, fontStyle: 'bold' },
        columnStyles: { 0: { cellWidth: 60 }, 1: { cellWidth: 40, halign: 'right' } },
        margin: { left: margin },
      });
      yPosition = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;
    }

    if (yPosition > pageHeight - 60) {
      doc.addPage();
      yPosition = margin;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Movimentações Detalhadas', margin, yPosition);
    yPosition += 8;

    if (movimentacoes.length > 0) {
      doc.autoTable({
        startY: yPosition,
        head: [['Data', 'Tipo', 'Descrição', 'Valor', 'Status', 'Conta', 'Plano de Contas']],
        body: movimentacoes.map((mov) => [
          formatDate(mov.data),
          mov.tipo === 'ENTRADA' ? 'Entrada' : 'Saída',
          mov.descricao.substring(0, 40) + (mov.descricao.length > 40 ? '...' : ''),
          formatCurrency(mov.valor),
          mov.status === 'REALIZADO' ? 'Realizado' : 'Previsto',
          mov.conta_bancaria?.titular || 'N/A',
          mov.plano_conta?.nome || 'N/A',
        ]),
        theme: 'striped',
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: headerColor, textColor: 255, fontStyle: 'bold' },
        columnStyles: {
          0: { cellWidth: 20 },
          1: { cellWidth: 20 },
          2: { cellWidth: 50 },
          3: { cellWidth: 25, halign: 'right' },
          4: { cellWidth: 20 },
          5: { cellWidth: 35 },
          6: { cellWidth: 35 },
        },
        margin: { left: margin, right: margin },
      });
    } else {
      doc.setFont('helvetica', 'italic');
      doc.text('Nenhuma movimentação encontrada com os filtros aplicados.', margin, yPosition);
    }

    drawReportFooter(doc, { marginX: margin });

    doc.save(`fluxo_caixa_${new Date().toISOString().split('T')[0]}.pdf`);
  }, [branding]);

  const exportToExcel = useCallback(async (
    movimentacoes: FluxoCaixaItem[],
    resumo: FluxoCaixaResumo | undefined,
    filtros: FluxoCaixaFiltros,
  ) => {
    const ExcelJS = (await import('exceljs')).default;
    const wb = new ExcelJS.Workbook();
    wb.creator = 'NOVUS ERP';
    wb.created = new Date();
    const logo = await resolveReportLogo(branding);
    const headerColor = normalizeReportColor(branding?.primaryColor) ?? BRAND_NAVY;
    const argb = `FF${headerColor.map((value) => value.toString(16).padStart(2, '0')).join('').toUpperCase()}`;

    const wsResumo = wb.addWorksheet('Resumo', { properties: { defaultRowHeight: 15 } });
    applyStandardExportLayout(wsResumo);
    let currentRow = 1;
    if (logo) {
      try {
        const imageId = wb.addImage({ base64: logo.dataUrl, extension: logo.extension });
        wsResumo.addImage(imageId, { tl: { col: 0, row: 0 }, ext: { width: 140, height: 50 } });
        wsResumo.getRow(1).height = 38;
        currentRow = 4;
      } catch {
        currentRow = 1;
      }
    }
    if (branding?.companyName) {
      wsResumo.getCell(currentRow, 1).value = branding.companyName;
      wsResumo.getCell(currentRow, 1).font = { bold: true, size: 12 };
      currentRow += 1;
    }
    wsResumo.getCell(currentRow, 1).value = 'Indicador';
    wsResumo.getCell(currentRow, 2).value = 'Valor';
    wsResumo.getRow(currentRow).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    wsResumo.getRow(currentRow).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb } };
    if (resumo) {
      wsResumo.addRows([
        ['Total de Entradas', formatCurrency(resumo.total_entradas)],
        ['Total de Saídas', formatCurrency(resumo.total_saidas)],
        ['Saldo Atual', formatCurrency(resumo.saldo_atual)],
        ['Saldo Projetado (7d)', formatCurrency(resumo.saldo_projetado_7d)],
        ['Saldo Projetado (14d)', formatCurrency(resumo.saldo_projetado_14d)],
        ['Saldo Projetado (30d)', formatCurrency(resumo.saldo_projetado_30d)],
        ['Capital de Giro', formatCurrency(resumo.capital_giro)],
        ['Runway (dias)', resumo.runway_dias.toString()],
        ['Saldo Mínimo', formatCurrency(resumo.saldo_minimo)],
      ]);
    }
    wsResumo.columns = [{ width: 30 }, { width: 24 }];

    const wsMovimentacoes = wb.addWorksheet('Movimentações', { properties: { defaultRowHeight: 15 } });
    applyStandardExportLayout(wsMovimentacoes);
    wsMovimentacoes.columns = [
      { header: 'Data', key: 'data', width: 16 },
      { header: 'Tipo', key: 'tipo', width: 14 },
      { header: 'Descrição', key: 'descricao', width: 40 },
      { header: 'Valor', key: 'valor', width: 18 },
      { header: 'Status', key: 'status', width: 16 },
      { header: 'Tipo de Fluxo', key: 'tipo_fluxo', width: 18 },
      { header: 'Conta Bancária', key: 'conta', width: 24 },
      { header: 'Plano de Contas', key: 'plano', width: 24 },
      { header: 'Centro de Custo', key: 'centro', width: 24 },
      { header: 'Observações', key: 'observacoes', width: 32 },
    ];
    wsMovimentacoes.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    wsMovimentacoes.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb } };
    movimentacoes.forEach((mov) => {
      wsMovimentacoes.addRow({
        data: formatDate(mov.data),
        tipo: mov.tipo,
        descricao: mov.descricao,
        valor: formatCurrency(mov.valor),
        status: mov.status,
        tipo_fluxo: mov.tipo_fluxo,
        conta: mov.conta_bancaria?.titular || '',
        plano: mov.plano_conta?.nome || '',
        centro: mov.centro_custo?.nome || '',
        observacoes: mov.observacoes || '',
      });
    });

    const wsFiltros = wb.addWorksheet('Filtros', { properties: { defaultRowHeight: 15 } });
    applyStandardExportLayout(wsFiltros);
    wsFiltros.columns = [{ width: 26 }, { width: 38 }];
    wsFiltros.addRows([
      ['Filtro', 'Valor'],
      ['Data Início', filtros.data_inicio || ''],
      ['Data Fim', filtros.data_fim || ''],
      ['Tipo de Movimento', filtros.tipo_movimento || ''],
      ['Status', filtros.status || ''],
      ['Tipo de Fluxo', filtros.tipo_fluxo || ''],
      ['Busca', filtros.busca || ''],
      ['Data/Hora da Exportação', new Date().toLocaleString('pt-BR')],
    ]);
    wsFiltros.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    wsFiltros.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb } };

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `fluxo_caixa_${new Date().toISOString().split('T')[0]}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
  }, [branding]);

  const exportToCSV = useCallback((
    movimentacoes: FluxoCaixaItem[],
    filtros: FluxoCaixaFiltros
  ) => {
    console.log('[FluxoCaixa] Exportando para CSV:', movimentacoes.length, 'movimentações');

    try {
      // Criar dados CSV
      const csvData = [
        ['Data', 'Tipo', 'Descrição', 'Valor', 'Status', 'Tipo de Fluxo', 'Conta Bancária', 'Plano de Contas', 'Centro de Custo', 'Observações']
      ];

      movimentacoes.forEach(mov => {
        csvData.push([
          formatDate(mov.data),
          mov.tipo,
          mov.descricao,
          mov.valor.toString(),
          mov.status,
          mov.tipo_fluxo,
          mov.conta_bancaria?.titular || '',
          mov.plano_conta?.nome || '',
          mov.centro_custo?.nome || '',
          mov.observacoes || ''
        ]);
      });

      // Converter para CSV
      const csvContent = csvData.map(row => 
        row.map(cell => `"${cell.toString().replace(/"/g, '""')}"`).join(',')
      ).join('\n');

      // Criar e baixar arquivo
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `fluxo_caixa_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      console.log('[FluxoCaixa] CSV exportado com sucesso');
    } catch (error) {
      console.error('[FluxoCaixa] Erro ao exportar CSV:', error);
      throw error;
    }
  }, []);

  return {
    exportToPDF,
    exportToExcel,
    exportToCSV,
    brandingLoading,
  };
};

export default useFluxoCaixaExport;
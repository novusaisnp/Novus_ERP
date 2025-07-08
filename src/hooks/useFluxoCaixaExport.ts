import { useCallback } from 'react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { FluxoCaixaItem, FluxoCaixaResumo, FluxoCaixaFiltros } from '@/types/fluxoCaixa';

// Declaração de tipo para jsPDF com plugin autotable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export const useFluxoCaixaExport = () => {
  console.log('[FluxoCaixa] Hook de exportação inicializado');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const getFilterDescription = (filtros: FluxoCaixaFiltros) => {
    const descriptions: string[] = [];
    
    if (filtros.data_inicio) {
      descriptions.push(`De: ${formatDate(filtros.data_inicio)}`);
    }
    if (filtros.data_fim) {
      descriptions.push(`Até: ${formatDate(filtros.data_fim)}`);
    }
    if (filtros.tipo_movimento && filtros.tipo_movimento !== 'TODOS') {
      descriptions.push(`Tipo: ${filtros.tipo_movimento}`);
    }
    if (filtros.status && filtros.status !== 'TODOS') {
      descriptions.push(`Status: ${filtros.status}`);
    }
    if (filtros.tipo_fluxo && filtros.tipo_fluxo !== 'TODOS') {
      descriptions.push(`Fluxo: ${filtros.tipo_fluxo}`);
    }
    if (filtros.busca) {
      descriptions.push(`Busca: "${filtros.busca}"`);
    }

    return descriptions.join(' | ');
  };

  const exportToPDF = useCallback((
    movimentacoes: FluxoCaixaItem[],
    resumo: FluxoCaixaResumo | undefined,
    filtros: FluxoCaixaFiltros
  ) => {
    console.log('[FluxoCaixa] Exportando para PDF:', movimentacoes.length, 'movimentações');

    try {
      // Criar documento em orientação horizontal
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      // Configurações
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      let yPosition = margin;

      // Cabeçalho com logo (simulado)
      doc.setFillColor(59, 130, 246); // Azul primário
      doc.rect(0, 0, pageWidth, 25, 'F');
      
      // Logo placeholder e título
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('NOVUS.AI', margin, 15);
      
      doc.setFontSize(16);
      doc.text('Relatório de Fluxo de Caixa', pageWidth - margin - 80, 15);
      
      yPosition = 35;

      // Informações do relatório
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, margin, yPosition);
      doc.text(`EGMX PARTICIPAÇÕES LTDA - CNPJ: 42.830.593/0001-63`, pageWidth - margin - 80, yPosition);
      
      yPosition += 10;

      // Filtros aplicados
      if (filtros) {
        const filterDesc = getFilterDescription(filtros);
        if (filterDesc) {
          doc.setFont('helvetica', 'bold');
          doc.text('Filtros Aplicados: ', margin, yPosition);
          doc.setFont('helvetica', 'normal');
          doc.text(filterDesc, margin + 30, yPosition);
          yPosition += 10;
        }
      }

      // Resumo financeiro
      if (resumo) {
        yPosition += 5;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text('Resumo Financeiro', margin, yPosition);
        yPosition += 8;

        // Tabela do resumo
        const resumoData = [
          ['Total de Entradas', formatCurrency(resumo.total_entradas)],
          ['Total de Saídas', formatCurrency(resumo.total_saidas)],
          ['Saldo Atual', formatCurrency(resumo.saldo_atual)],
          ['Saldo Projetado (30d)', formatCurrency(resumo.saldo_projetado_30d)],
          ['Capital de Giro', formatCurrency(resumo.capital_giro)],
          ['Runway', `${resumo.runway_dias} dias`]
        ];

        doc.autoTable({
          startY: yPosition,
          head: [['Indicador', 'Valor']],
          body: resumoData,
          theme: 'grid',
          styles: {
            fontSize: 9,
            cellPadding: 3
          },
          headStyles: {
            fillColor: [59, 130, 246],
            textColor: 255,
            fontStyle: 'bold'
          },
          columnStyles: {
            0: { cellWidth: 60 },
            1: { cellWidth: 40, halign: 'right' }
          },
          margin: { left: margin }
        });

        yPosition = (doc as any).lastAutoTable.finalY + 15;
      }

      // Verificar se há espaço na página
      if (yPosition > pageHeight - 60) {
        doc.addPage();
        yPosition = margin;
      }

      // Tabela de movimentações
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('Movimentações Detalhadas', margin, yPosition);
      yPosition += 8;

      if (movimentacoes.length > 0) {
        const tableData = movimentacoes.map(mov => [
          formatDate(mov.data),
          mov.tipo === 'ENTRADA' ? 'Entrada' : 'Saída',
          mov.descricao.substring(0, 40) + (mov.descricao.length > 40 ? '...' : ''),
          formatCurrency(mov.valor),
          mov.status === 'REALIZADO' ? 'Realizado' : 'Previsto',
          mov.conta_bancaria?.titular || 'N/A',
          mov.plano_conta?.nome || 'N/A'
        ]);

        doc.autoTable({
          startY: yPosition,
          head: [['Data', 'Tipo', 'Descrição', 'Valor', 'Status', 'Conta', 'Plano de Contas']],
          body: tableData,
          theme: 'striped',
          styles: {
            fontSize: 8,
            cellPadding: 2
          },
          headStyles: {
            fillColor: [59, 130, 246],
            textColor: 255,
            fontStyle: 'bold'
          },
          columnStyles: {
            0: { cellWidth: 20 },
            1: { cellWidth: 20 },
            2: { cellWidth: 50 },
            3: { cellWidth: 25, halign: 'right' },
            4: { cellWidth: 20 },
            5: { cellWidth: 35 },
            6: { cellWidth: 35 }
          },
          margin: { left: margin, right: margin }
        });
      } else {
        doc.setFont('helvetica', 'italic');
        doc.text('Nenhuma movimentação encontrada com os filtros aplicados.', margin, yPosition);
      }

      // Rodapé
      const totalPages = doc.internal.pages.length - 1;
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.text(
          `Página ${i} de ${totalPages}`,
          pageWidth - margin - 20,
          pageHeight - 10
        );
        doc.text(
          'Relatório gerado pelo ERP NOVUS.AI',
          margin,
          pageHeight - 10
        );
      }

      // Salvar o PDF
      const fileName = `fluxo_caixa_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);

      console.log('[FluxoCaixa] PDF exportado com sucesso:', fileName);
    } catch (error) {
      console.error('[FluxoCaixa] Erro ao exportar PDF:', error);
      throw error;
    }
  }, []);

  const exportToExcel = useCallback((
    movimentacoes: FluxoCaixaItem[],
    resumo: FluxoCaixaResumo | undefined,
    filtros: FluxoCaixaFiltros
  ) => {
    console.log('[FluxoCaixa] Exportando para Excel:', movimentacoes.length, 'movimentações');

    try {
      // Criar workbook
      const wb = XLSX.utils.book_new();

      // Aba 1: Resumo
      if (resumo) {
        const resumoData = [
          ['Indicador', 'Valor'],
          ['Total de Entradas', formatCurrency(resumo.total_entradas)],
          ['Total de Saídas', formatCurrency(resumo.total_saidas)],
          ['Saldo Atual', formatCurrency(resumo.saldo_atual)],
          ['Saldo Projetado (7d)', formatCurrency(resumo.saldo_projetado_7d)],
          ['Saldo Projetado (14d)', formatCurrency(resumo.saldo_projetado_14d)],
          ['Saldo Projetado (30d)', formatCurrency(resumo.saldo_projetado_30d)],
          ['Capital de Giro', formatCurrency(resumo.capital_giro)],
          ['Runway (dias)', resumo.runway_dias.toString()],
          ['Saldo Mínimo', formatCurrency(resumo.saldo_minimo)]
        ];

        const wsResumo = XLSX.utils.aoa_to_sheet(resumoData);
        XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo');
      }

      // Aba 2: Movimentações
      const movimentacoesData = [
        ['Data', 'Tipo', 'Descrição', 'Valor', 'Status', 'Tipo de Fluxo', 'Conta Bancária', 'Plano de Contas', 'Centro de Custo', 'Observações']
      ];

      movimentacoes.forEach(mov => {
        movimentacoesData.push([
          formatDate(mov.data),
          mov.tipo,
          mov.descricao,
          formatCurrency(mov.valor),
          mov.status,
          mov.tipo_fluxo,
          mov.conta_bancaria?.titular || '',
          mov.plano_conta?.nome || '',
          mov.centro_custo?.nome || '',
          mov.observacoes || ''
        ]);
      });

      const wsMovimentacoes = XLSX.utils.aoa_to_sheet(movimentacoesData);
      XLSX.utils.book_append_sheet(wb, wsMovimentacoes, 'Movimentações');

      // Aba 3: Filtros aplicados
      const filtrosData = [
        ['Filtro', 'Valor'],
        ['Data Início', filtros.data_inicio || ''],
        ['Data Fim', filtros.data_fim || ''],
        ['Tipo de Movimento', filtros.tipo_movimento || ''],
        ['Status', filtros.status || ''],
        ['Tipo de Fluxo', filtros.tipo_fluxo || ''],
        ['Busca', filtros.busca || ''],
        ['Data/Hora da Exportação', new Date().toLocaleString('pt-BR')]
      ];

      const wsFiltros = XLSX.utils.aoa_to_sheet(filtrosData);
      XLSX.utils.book_append_sheet(wb, wsFiltros, 'Filtros');

      // Salvar arquivo
      const fileName = `fluxo_caixa_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);

      console.log('[FluxoCaixa] Excel exportado com sucesso:', fileName);
    } catch (error) {
      console.error('[FluxoCaixa] Erro ao exportar Excel:', error);
      throw error;
    }
  }, []);

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
    exportToCSV
  };
};

export default useFluxoCaixaExport;
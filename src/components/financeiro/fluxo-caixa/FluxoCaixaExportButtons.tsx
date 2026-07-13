import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from '@/hooks/use-toast';
import { useFluxoCaixaExport } from '@/hooks/useFluxoCaixaExport';
import { FluxoCaixaItem, FluxoCaixaResumo, FluxoCaixaFiltros } from '@/types/fluxoCaixa';
import { 
  Download, 
  FileText, 
  FileSpreadsheet, 
  FileType,
  Loader2
} from 'lucide-react';

interface FluxoCaixaExportButtonsProps {
  movimentacoes: FluxoCaixaItem[];
  resumo?: FluxoCaixaResumo;
  filtros: FluxoCaixaFiltros;
  disabled?: boolean;
}

export const FluxoCaixaExportButtons = ({ 
  movimentacoes, 
  resumo, 
  filtros, 
  disabled = false 
}: FluxoCaixaExportButtonsProps) => {
  console.log('[FluxoCaixa] Renderizando botões de exportação');

  const [isExporting, setIsExporting] = useState(false);
  const [exportingType, setExportingType] = useState<string | null>(null);
  
  const { exportToPDF, exportToExcel, exportToCSV, brandingLoading } = useFluxoCaixaExport();

  const handleExport = async (type: 'pdf' | 'excel' | 'csv') => {
    console.log('[FluxoCaixa] Iniciando exportação:', type);
    
    setIsExporting(true);
    setExportingType(type);

    try {
      switch (type) {
        case 'pdf':
          await exportToPDF(movimentacoes, resumo, filtros);
          toast({
            title: 'PDF Exportado',
            description: 'Relatório em PDF foi gerado com sucesso!',
            duration: 3000,
          });
          break;
        
        case 'excel':
          await exportToExcel(movimentacoes, resumo, filtros);
          toast({
            title: 'Excel Exportado',
            description: 'Planilha Excel foi gerada com sucesso!',
            duration: 3000,
          });
          break;
        
        case 'csv':
          await exportToCSV(movimentacoes, filtros);
          toast({
            title: 'CSV Exportado',
            description: 'Arquivo CSV foi gerado com sucesso!',
            duration: 3000,
          });
          break;
      }
      
      console.log('[FluxoCaixa] Exportação concluída:', type);
    } catch (error) {
      console.error('[FluxoCaixa] Erro na exportação:', error);
      toast({
        title: 'Erro na Exportação',
        description: 'Não foi possível gerar o arquivo. Tente novamente.',
        variant: 'destructive',
        duration: 5000,
      });
    } finally {
      setIsExporting(false);
      setExportingType(null);
    }
  };

  const isTypeExporting = (type: string) => {
    return isExporting && exportingType === type;
  };

  return (
    <div className="flex gap-2">
      {/* Botão individual para PDF - mais visível */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleExport('pdf')}
        disabled={disabled || brandingLoading || isExporting || movimentacoes.length === 0}
        className="flex items-center gap-2"
      >
        {isTypeExporting('pdf') ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <FileText className="h-4 w-4" />
        )}
        {isTypeExporting('pdf') ? 'Gerando PDF...' : 'Exportar PDF'}
      </Button>

      {/* Dropdown para outras opções */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={disabled || brandingLoading || isExporting || movimentacoes.length === 0}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Mais Opções
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem 
            onClick={() => handleExport('excel')}
            disabled={isExporting}
            className="flex items-center gap-2"
          >
            {isTypeExporting('excel') ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="h-4 w-4" />
            )}
            {isTypeExporting('excel') ? 'Gerando Excel...' : 'Exportar Excel'}
          </DropdownMenuItem>
          
          <DropdownMenuItem 
            onClick={() => handleExport('csv')}
            disabled={isExporting}
            className="flex items-center gap-2"
          >
            {isTypeExporting('csv') ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileType className="h-4 w-4" />
            )}
            {isTypeExporting('csv') ? 'Gerando CSV...' : 'Exportar CSV'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Informação sobre dados vazios */}
      {movimentacoes.length === 0 && (
        <span className="text-xs text-muted-foreground self-center ml-2">
          Nenhum dado para exportar
        </span>
      )}
    </div>
  );
};

export default FluxoCaixaExportButtons;
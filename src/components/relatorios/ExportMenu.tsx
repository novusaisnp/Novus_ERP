// Menu de exportação (CSV | Excel | PDF) - P4.1
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { ReportExportPayload } from '@/utils/reportExportShared';

interface ExportMenuProps<T> {
  payload: ReportExportPayload<T>;
  onCsv: () => void;
  disabled?: boolean;
}

export function ExportMenu<T>({ payload, onCsv, disabled }: ExportMenuProps<T>): JSX.Element {
  const [busy, setBusy] = useState<null | 'excel' | 'pdf'>(null);

  const handleExcel = async (): Promise<void> => {
    try {
      setBusy('excel');
      const { exportReportToExcel } = await import('@/utils/reportExportExcel');
      await exportReportToExcel(payload);
    } catch (err) {
      console.error('Erro ao exportar Excel:', err);
      toast.error('Falha ao gerar Excel.');
    } finally {
      setBusy(null);
    }
  };

  const handlePdf = async (): Promise<void> => {
    try {
      setBusy('pdf');
      const { exportReportToPdf } = await import('@/utils/reportExportPdf');
      await exportReportToPdf(payload);
    } catch (err) {
      console.error('Erro ao exportar PDF:', err);
      toast.error('Falha ao gerar PDF.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button disabled={disabled || busy !== null}>
          {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
          Exportar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onCsv} disabled={disabled}>
          CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExcel} disabled={disabled || busy !== null}>
          Excel (.xlsx)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handlePdf} disabled={disabled || busy !== null}>
          PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

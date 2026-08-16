import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { MovimentacaoBancaria } from '@/types/movimentacoesBancarias';
import { currencyUtils } from '@/utils/currencyUtils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getTipoLabel } from './tipoMovimentacaoLabels';

interface DetalheMovimentacaoDialogProps {
  movimentacao: MovimentacaoBancaria | null;
  onClose: () => void;
}

const Campo: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <div className="text-xs text-muted-foreground">{label}</div>
    <div className="text-sm">{children}</div>
  </div>
);

export function DetalheMovimentacaoDialog({ movimentacao, onClose }: DetalheMovimentacaoDialogProps) {
  return (
    <Dialog open={!!movimentacao} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Detalhes da movimentação</DialogTitle>
        </DialogHeader>
        {movimentacao && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Campo label="Tipo">{getTipoLabel(movimentacao.tipo_movimentacao)}</Campo>
              <Campo label="Valor">{currencyUtils.formatCurrency(movimentacao.valor)}</Campo>
              <Campo label="Data">
                {format(new Date(`${movimentacao.data_movimentacao}T00:00:00`), 'dd/MM/yyyy', { locale: ptBR })}
              </Campo>
              <Campo label="Documento de referência">{movimentacao.documento_referencia || '—'}</Campo>
            </div>

            <Campo label="Descrição">{movimentacao.descricao}</Campo>

            {movimentacao.observacoes && <Campo label="Observações">{movimentacao.observacoes}</Campo>}

            <div className="flex gap-2">
              <Badge variant={movimentacao.conciliado ? 'default' : 'secondary'}>
                {movimentacao.conciliado ? 'Conciliado' : 'Não conciliado'}
              </Badge>
              {movimentacao.estornado && <Badge variant="destructive">Estornado</Badge>}
            </div>

            {movimentacao.estornado && (
              <Campo label="Motivo do estorno">{movimentacao.motivo_estorno || '—'}</Campo>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

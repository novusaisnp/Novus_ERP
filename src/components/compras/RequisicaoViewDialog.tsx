import React from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Printer } from 'lucide-react';
import type { RequisicaoCompra } from '@/types/requisicaoCompra';
import {
  downloadRequisicaoCompraPdf,
  printRequisicaoCompraPdf,
  type RequisicaoCompraPdfEmpresa,
} from '@/utils/requisicaoCompraPdf';

interface Props {
  requisicao: RequisicaoCompra | null;
  empresa?: RequisicaoCompraPdfEmpresa | null;
  solicitanteNome: string;
  centroCustoNome: string | null;
  nomeProduto: (produtoId: string) => string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const fmtDate = (d?: string | null) =>
  d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '-';

const statusLabel: Record<RequisicaoCompra['status'], string> = { ABERTA: 'Aberta', CANCELADA: 'Cancelada' };

export const RequisicaoViewDialog: React.FC<Props> = ({
  requisicao, empresa, solicitanteNome, centroCustoNome, nomeProduto, open, onOpenChange,
}) => {
  if (!requisicao) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Requisição de Compra — {requisicao.id.slice(0, 8).toUpperCase()}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div className="flex justify-between items-start border-b pb-3 gap-4">
            <div className="flex items-start gap-3">
              {empresa?.logoUrl && <img src={empresa.logoUrl} alt="" className="h-10 w-auto object-contain" />}
              <div>
                <p className="font-semibold">{empresa?.nome || 'Empresa'}</p>
                {empresa?.cnpj && <p className="text-xs text-muted-foreground">CNPJ: {empresa.cnpj}</p>}
              </div>
            </div>
            <Badge variant={requisicao.status === 'ABERTA' ? 'default' : 'secondary'}>
              {statusLabel[requisicao.status]}
            </Badge>
          </div>

          <div>
            <p className="font-medium text-muted-foreground text-xs uppercase mb-1">Solicitante</p>
            <p>{solicitanteNome}</p>
            {centroCustoNome && <p className="text-xs text-muted-foreground">Centro de Custo: {centroCustoNome}</p>}
            {requisicao.data_necessidade && (
              <p className="text-xs text-muted-foreground">Necessário até: {fmtDate(requisicao.data_necessidade)}</p>
            )}
          </div>

          <div>
            <p className="font-medium text-muted-foreground text-xs uppercase mb-1">Justificativa</p>
            <p>{requisicao.justificativa}</p>
          </div>

          <div>
            <p className="font-medium text-muted-foreground text-xs uppercase mb-1">Itens</p>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b">
                  <th className="py-1">Produto</th>
                  <th className="py-1 text-right">Qtd</th>
                  <th className="py-1">Observação</th>
                </tr>
              </thead>
              <tbody>
                {requisicao.itens.map((it) => (
                  <tr key={it.id} className="border-b last:border-0">
                    <td className="py-1">{nomeProduto(it.produto_id)}</td>
                    <td className="py-1 text-right">{it.quantidade}</td>
                    <td className="py-1 text-muted-foreground">{it.observacao || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => printRequisicaoCompraPdf(requisicao, empresa, solicitanteNome, centroCustoNome, nomeProduto)}
          >
            <Printer className="w-4 h-4 mr-2" />Imprimir
          </Button>
          <Button
            onClick={() => downloadRequisicaoCompraPdf(requisicao, empresa, solicitanteNome, centroCustoNome, nomeProduto)}
          >
            <Download className="w-4 h-4 mr-2" />Baixar PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

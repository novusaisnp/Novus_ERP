import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Printer } from 'lucide-react';
import type { Orcamento } from '@/services/orcamentosService';
import { calcItemTotal } from '@/services/orcamentosService';
import {
  downloadOrcamentoPdf,
  printOrcamentoPdf,
  type OrcamentoPdfCliente,
  type OrcamentoPdfEmpresa,
} from '@/utils/orcamentoPdf';

interface Props {
  orcamento: Orcamento | null;
  empresa?: OrcamentoPdfEmpresa | null;
  cliente?: OrcamentoPdfCliente | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const brl = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const fmtDate = (d?: string | null) =>
  d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '-';

const TIPO_LABEL: Record<string, string> = {
  P: 'Produtos (NF-e)',
  S: 'Serviços (NFS-e)',
  H: 'Híbrido',
};

export const OrcamentoViewDialog: React.FC<Props> = ({
  orcamento,
  empresa,
  cliente,
  open,
  onOpenChange,
}) => {
  if (!orcamento) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Orçamento {orcamento.numero}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div className="flex justify-between items-start border-b pb-3">
            <div>
              <div className="font-semibold text-base">
                {empresa?.nome ?? 'Empresa'}
              </div>
              {empresa?.cnpj && (
                <div className="text-muted-foreground text-xs">
                  CNPJ: {empresa.cnpj}
                </div>
              )}
              {(empresa?.endereco || empresa?.cidade) && (
                <div className="text-muted-foreground text-xs">
                  {[empresa?.endereco, empresa?.cidade, empresa?.estado]
                    .filter(Boolean)
                    .join(' - ')}
                </div>
              )}
            </div>
            <div className="text-right">
              <Badge>{TIPO_LABEL[orcamento.tipo] ?? orcamento.tipo}</Badge>
              <div className="text-xs text-muted-foreground mt-1">
                Emissão: {fmtDate(orcamento.dataEmissao)}
              </div>
              <div className="text-xs text-muted-foreground">
                Validade: {fmtDate(orcamento.dataValidade)}
              </div>
            </div>
          </div>

          <div>
            <div className="font-semibold mb-1">Cliente</div>
            <div>{cliente?.nome ?? orcamento.clienteNome ?? 'Não informado'}</div>
            {(cliente?.cnpj || cliente?.cpf) && (
              <div className="text-muted-foreground text-xs">
                Doc: {cliente?.cnpj ?? cliente?.cpf}
              </div>
            )}
            {(cliente?.email || cliente?.telefone) && (
              <div className="text-muted-foreground text-xs">
                {[cliente?.email, cliente?.telefone].filter(Boolean).join(' | ')}
              </div>
            )}
          </div>

          <div className="border rounded-md overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-2">#</th>
                  <th className="text-left p-2">Tipo</th>
                  <th className="text-left p-2">Descrição</th>
                  <th className="text-right p-2">Qtd</th>
                  <th className="text-right p-2">Unit.</th>
                  <th className="text-right p-2">Desc.</th>
                  <th className="text-right p-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {(orcamento.itens ?? []).map((it, idx) => (
                  <tr key={it.id ?? idx} className="border-t">
                    <td className="p-2">{idx + 1}</td>
                    <td className="p-2">{it.tipoItem === 'S' ? 'Serviço' : 'Produto'}</td>
                    <td className="p-2">{it.descricao}</td>
                    <td className="p-2 text-right">{it.quantidade}</td>
                    <td className="p-2 text-right">{brl(Number(it.precoUnitario) || 0)}</td>
                    <td className="p-2 text-right">{brl(Number(it.desconto) || 0)}</td>
                    <td className="p-2 text-right font-medium">
                      {brl(calcItemTotal(it))}
                    </td>
                  </tr>
                ))}
                {(orcamento.itens ?? []).length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center text-muted-foreground p-3">
                      Sem itens.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end">
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Valor Total</div>
              <div className="text-xl font-bold">
                {brl(Number(orcamento.valorTotal) || 0)}
              </div>
            </div>
          </div>

          {orcamento.observacoes && (
            <div>
              <div className="font-semibold mb-1">Observações</div>
              <div className="text-muted-foreground whitespace-pre-wrap">
                {orcamento.observacoes}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => printOrcamentoPdf(orcamento, empresa, cliente)}
          >
            <Printer className="h-4 w-4 mr-1" /> Imprimir
          </Button>
          <Button onClick={() => downloadOrcamentoPdf(orcamento, empresa, cliente)}>
            <Download className="h-4 w-4 mr-1" /> Baixar PDF
          </Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

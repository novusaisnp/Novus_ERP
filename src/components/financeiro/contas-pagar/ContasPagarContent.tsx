
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, FileText } from 'lucide-react';
import { ContasPagarEmptyState } from './ContasPagarEmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import type { ContaPagar } from '@/types/contasPagar';
import { format, parseISO, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ContasPagarContentProps {
  contasPagar: ContaPagar[];
  isLoading: boolean;
  onEdit: (conta: ContaPagar) => void;
  onDelete: (id: string) => void;
  onCreateClick: () => void;
  isDeleting: boolean;
}

export const ContasPagarContent = ({
  contasPagar,
  isLoading,
  onEdit,
  onDelete,
  onCreateClick,
  isDeleting,
}: ContasPagarContentProps) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return dateString;
    }
  };

  const getSituacaoVariant = (situacao: string, dataVencimento: string) => {
    switch (situacao) {
      case 'PAGA':
        return 'default';
      case 'CANCELADA':
        return 'secondary';
      case 'VENCIDA':
        return 'destructive';
      case 'ABERTA':
        // Verificar se está vencida
        if (isAfter(new Date(), parseISO(dataVencimento))) {
          return 'destructive';
        }
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getSituacaoText = (situacao: string, dataVencimento: string) => {
    if (situacao === 'ABERTA' && isAfter(new Date(), parseISO(dataVencimento))) {
      return 'VENCIDA';
    }
    return situacao;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Lista de Contas a Pagar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (contasPagar.length === 0) {
    return <ContasPagarEmptyState onCreateClick={onCreateClick} />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Lista de Contas a Pagar
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Documento</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Fornecedor</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Situação</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contasPagar.map((conta) => (
              <TableRow key={conta.id}>
                <TableCell className="font-medium">
                  {conta.numero_documento}
                </TableCell>
                <TableCell>
                  <div className="max-w-xs truncate">
                    {conta.descricao}
                  </div>
                </TableCell>
                <TableCell>
                  {conta.fornecedor ? (
                    <div>
                      <div className="font-medium">{conta.fornecedor.razao_social}</div>
                      {conta.fornecedor.nome_fantasia && (
                        <div className="text-sm text-muted-foreground">
                          {conta.fornecedor.nome_fantasia}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">{formatCurrency(conta.valor_atual)}</div>
                    {conta.valor_atual !== conta.valor_original && (
                      <div className="text-sm text-muted-foreground">
                        Original: {formatCurrency(conta.valor_original)}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {formatDate(conta.data_vencimento)}
                </TableCell>
                <TableCell>
                  <Badge variant={getSituacaoVariant(conta.situacao, conta.data_vencimento)}>
                    {getSituacaoText(conta.situacao, conta.data_vencimento)}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(conta)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(conta.id)}
                      disabled={isDeleting}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

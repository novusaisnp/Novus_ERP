import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Edit, Trash2, Eye, Calendar, DollarSign, User } from 'lucide-react';
import { ContasReceberEmptyState } from './ContasReceberEmptyState';
import type { ContaReceber } from '@/types/contasReceber';

interface ContasReceberContentProps {
  contasReceber: ContaReceber[];
  isLoading: boolean;
  onEdit: (conta: ContaReceber) => void;
  onDelete: (id: string) => void;
  onCreateClick: () => void;
  isDeleting: boolean;
}

export const ContasReceberContent = ({
  contasReceber,
  isLoading,
  onEdit,
  onDelete,
  onCreateClick,
  isDeleting,
}: ContasReceberContentProps) => {
  console.log('[ContasReceberContent] Renderizando conteúdo:', { 
    quantidade: contasReceber.length, 
    isLoading 
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getSituacaoBadge = (situacao: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      PENDENTE: 'default',
      ABERTA: 'default',
      PARCIAL: 'secondary',
      RECEBIDO: 'secondary',
      RECEBIDA: 'secondary',
      VENCIDO: 'destructive',
      VENCIDA: 'destructive',
      CANCELADO: 'outline',
      CANCELADA: 'outline',
    };

    const labels: Record<string, string> = {
      PENDENTE: 'Em Aberto',
      ABERTA: 'Em Aberto',
      PARCIAL: 'Parcial',
      RECEBIDO: 'Recebida',
      RECEBIDA: 'Recebida',
      VENCIDO: 'Vencida',
      VENCIDA: 'Vencida',
      CANCELADO: 'Cancelada',
      CANCELADA: 'Cancelada',
    };

    return (
      <Badge variant={variants[situacao] || 'default'}>
        {labels[situacao] || situacao}
      </Badge>
    );
  };


  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-48" />
                </div>
                <Skeleton className="h-6 w-20" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-24" />
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-8" />
                  <Skeleton className="h-8 w-8" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (contasReceber.length === 0) {
    return <ContasReceberEmptyState onCreateClick={onCreateClick} />;
  }

  return (
    <div className="space-y-4">
      {contasReceber.map((conta) => (
        <Card key={conta.id} className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
              <div className="space-y-1">
                <h3 className="font-semibold text-lg">
                  {conta.numero_documento}
                </h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {conta.cliente && (
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      <span>{conta.cliente.nome}</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {getSituacaoBadge(conta.situacao)}
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <DollarSign className="h-3 w-3" />
                  <span>Valor</span>
                </div>
                <p className="font-semibold">
                  {formatCurrency(conta.valor_original)}
                </p>
                {(conta.valor_pago ?? 0) > 0 && (
                  <p className="text-xs text-status-delivered">
                    Pago: {formatCurrency(conta.valor_pago)}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>Vencimento</span>
                </div>
                <p className="text-sm">
                  {formatDate(conta.data_vencimento)}
                </p>
              </div>

              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">
                  Forma de Pagamento
                </div>
                <p className="text-sm">
                  {conta.forma_pagamento || 'Não informado'}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onEdit(conta)}
                  className="flex items-center gap-1"
                >
                  <Edit className="h-3 w-3" />
                  Editar
                </Button>
                
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onDelete(conta.id)}
                  disabled={isDeleting}
                  className="flex items-center gap-1 text-status-cancelled hover:text-status-cancelled/80"
                >
                  <Trash2 className="h-3 w-3" />
                  Excluir
                </Button>
              </div>
            </div>

            {conta.observacoes && (
              <div className="mt-3 pt-3 border-t">
                <p className="text-sm text-muted-foreground">
                  <strong>Observações:</strong> {conta.observacoes}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

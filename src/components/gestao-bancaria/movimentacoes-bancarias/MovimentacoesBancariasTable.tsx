import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { MovimentacaoBancaria } from '@/types/movimentacoesBancarias';
import { useMovimentacoesBancarias } from '@/hooks/useMovimentacoesBancarias';
import { currencyUtils } from '@/utils/currencyUtils';
import { 
  MoreHorizontal, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  ArrowUpRight,
  ArrowDownLeft,
  ArrowRightLeft,
  Settings,
  Eye,
  Edit3,
  Trash2,
  RotateCcw
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MovimentacoesBancariasTableProps {
  movimentacoes: MovimentacaoBancaria[];
  isLoading: boolean;
  onRefresh: () => void;
}

export function MovimentacoesBancariasTable({
  movimentacoes,
  isLoading,
  onRefresh,
}: MovimentacoesBancariasTableProps) {
  const { estornar, conciliar, excluir } = useMovimentacoesBancarias();
  const [selectedMovimentacao, setSelectedMovimentacao] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    type: 'estornar' | 'excluir';
    movimentacao: MovimentacaoBancaria;
  } | null>(null);

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'DEPOSITO':
      case 'TRANSFERENCIA_ENTRADA':
      case 'AJUSTE_POSITIVO':
        return <ArrowDownLeft className="h-4 w-4 text-green-600" />;
      case 'SAQUE':
      case 'TRANSFERENCIA_SAIDA':
      case 'AJUSTE_NEGATIVO':
        return <ArrowUpRight className="h-4 w-4 text-red-600" />;
      default:
        return <ArrowRightLeft className="h-4 w-4 text-blue-600" />;
    }
  };

  const getTipoLabel = (tipo: string) => {
    const labels = {
      'DEPOSITO': 'Depósito',
      'SAQUE': 'Saque',
      'TRANSFERENCIA_SAIDA': 'Transf. Saída',
      'TRANSFERENCIA_ENTRADA': 'Transf. Entrada',
      'AJUSTE_POSITIVO': 'Ajuste +',
      'AJUSTE_NEGATIVO': 'Ajuste -',
    };
    return labels[tipo as keyof typeof labels] || tipo;
  };

  const getTipoVariant = (tipo: string) => {
    switch (tipo) {
      case 'DEPOSITO':
      case 'TRANSFERENCIA_ENTRADA':
      case 'AJUSTE_POSITIVO':
        return 'default';
      case 'SAQUE':
      case 'TRANSFERENCIA_SAIDA':
      case 'AJUSTE_NEGATIVO':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const handleEstorno = (movimentacao: MovimentacaoBancaria) => {
    setConfirmDialog({ type: 'estornar', movimentacao });
  };

  const handleConciliacao = (movimentacao: MovimentacaoBancaria) => {
    conciliar({
      movimentacao_id: movimentacao.id,
      observacoes: 'Conciliado via interface de movimentações bancárias',
    });
  };

  const handleExclusao = (movimentacao: MovimentacaoBancaria) => {
    setConfirmDialog({ type: 'excluir', movimentacao });
  };

  const executarAcaoConfirmada = () => {
    if (!confirmDialog) return;
    if (confirmDialog.type === 'estornar') {
      estornar({
        movimentacao_id: confirmDialog.movimentacao.id,
        motivo_estorno: 'Estorno manual pelo usuário',
        observacoes: 'Estornado via interface de movimentações bancárias',
      });
    } else {
      excluir(confirmDialog.movimentacao.id);
    }
    setConfirmDialog(null);
  };

  const formatarData = (data: string) => {
    return format(new Date(data), 'dd/MM/yyyy', { locale: ptBR });
  };

  const formatarDataHora = (data: string) => {
    return format(new Date(data), 'dd/MM/yyyy HH:mm', { locale: ptBR });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Movimentações</span>
            <RefreshCw className="h-4 w-4 animate-spin" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (movimentacoes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Movimentações</span>
            <Button variant="ghost" size="sm" onClick={onRefresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <ArrowRightLeft className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhuma movimentação encontrada</h3>
            <p className="text-muted-foreground">
              Nenhuma movimentação corresponde aos filtros aplicados.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Movimentações ({movimentacoes.length})</span>
          <Button variant="ghost" size="sm" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Conta</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movimentacoes.map((movimentacao) => (
                <TableRow 
                  key={movimentacao.id}
                  className={movimentacao.estornado ? 'opacity-60' : ''}
                >
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {getTipoIcon(movimentacao.tipo_movimentacao)}
                      <Badge variant={getTipoVariant(movimentacao.tipo_movimentacao)}>
                        {getTipoLabel(movimentacao.tipo_movimentacao)}
                      </Badge>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {formatarData(movimentacao.data_movimentacao)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatarDataHora(movimentacao.created_at)}
                      </div>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {movimentacao.conta_bancaria?.numero_conta || 'N/A'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {movimentacao.conta_bancaria?.titular}
                      </div>
                      {movimentacao.conta_destino && (
                        <div className="text-xs text-blue-600">
                          → {movimentacao.conta_destino.numero_conta}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div>
                      <div className="font-medium">{movimentacao.descricao}</div>
                      {movimentacao.observacoes && (
                        <div className="text-xs text-muted-foreground">
                          {movimentacao.observacoes}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  
                  <TableCell className="text-right">
                    <div className={`font-bold ${
                      ['DEPOSITO', 'TRANSFERENCIA_ENTRADA', 'AJUSTE_POSITIVO'].includes(movimentacao.tipo_movimentacao)
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}>
                      {currencyUtils.formatCurrency(movimentacao.valor)}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex flex-col space-y-1">
                      {movimentacao.estornado ? (
                        <Badge variant="destructive">
                          <XCircle className="h-3 w-3 mr-1" />
                          Estornado
                        </Badge>
                      ) : movimentacao.conciliado ? (
                        <Badge variant="default">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Conciliado
                        </Badge>
                      ) : (
                        <Badge variant="outline">
                          Pendente
                        </Badge>
                      )}
                      {movimentacao.lote && (
                        <Badge variant="secondary" className="text-xs">
                          Lote: {movimentacao.lote.numero_lote}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    {movimentacao.documento_referencia && (
                      <div className="text-xs font-mono">
                        {movimentacao.documento_referencia}
                      </div>
                    )}
                  </TableCell>
                  
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setSelectedMovimentacao(movimentacao.id)}>
                          <Eye className="h-4 w-4 mr-2" />
                          Visualizar
                        </DropdownMenuItem>
                        
                        {!movimentacao.estornado && (
                          <>
                            <DropdownMenuItem>
                              <Edit3 className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            
                            {!movimentacao.conciliado && (
                              <DropdownMenuItem onClick={() => handleConciliacao(movimentacao)}>
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                Conciliar
                              </DropdownMenuItem>
                            )}
                            
                            <DropdownMenuItem 
                              onClick={() => handleEstorno(movimentacao)}
                              className="text-orange-600"
                            >
                              <RotateCcw className="h-4 w-4 mr-2" />
                              Estornar
                            </DropdownMenuItem>
                            
                            <DropdownMenuItem 
                              onClick={() => handleExclusao(movimentacao)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
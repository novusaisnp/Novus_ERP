import { FluxoCaixaItem } from '@/types/fluxoCaixa';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw } from 'lucide-react';

interface FluxoCaixaTabelaProps {
  movimentacoes: FluxoCaixaItem[];
  isLoading: boolean;
  onRefresh: () => void;
}

export const FluxoCaixaTabela = ({ movimentacoes, isLoading, onRefresh }: FluxoCaixaTabelaProps) => {
  console.log('[FluxoCaixa] Renderizando tabela com', movimentacoes.length, 'movimentações');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const getStatusColor = (status: string) => {
    return status === 'REALIZADO' ? 'default' : 'secondary';
  };

  const getTipoColor = (tipo: string) => {
    return tipo === 'ENTRADA' ? 'text-green-600' : 'text-red-600';
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Movimentações</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Movimentações</CardTitle>
        <Button variant="outline" size="sm" onClick={onRefresh}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Conta</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movimentacoes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhuma movimentação encontrada
                  </TableCell>
                </TableRow>
              ) : (
                movimentacoes.map((mov) => (
                  <TableRow key={mov.id}>
                    <TableCell>{formatDate(mov.data)}</TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={getTipoColor(mov.tipo)}
                      >
                        {mov.tipo}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {mov.descricao}
                    </TableCell>
                    <TableCell className={getTipoColor(mov.tipo)}>
                      {formatCurrency(mov.valor)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(mov.status)}>
                        {mov.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {mov.conta_bancaria?.titular || 'N/A'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default FluxoCaixaTabela;
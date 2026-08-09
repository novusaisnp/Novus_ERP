import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Clock, 
  User, 
  FileText, 
  CreditCard, 
  RotateCcw, 
  Edit, 
  X,
  Activity 
} from 'lucide-react';
import { useHistoricoMovimentacoes } from '@/hooks/useMovimentacoesCompletas';
import { TituloFinanceiro } from '@/types/movimentacoesFinanceiras';
import { currencyUtils } from '@/utils/currencyUtils';

interface HistoricoTabProps {
  titulo: TituloFinanceiro;
}

export const HistoricoTab = ({ titulo }: HistoricoTabProps) => {
  const { data: historico = [], isLoading } = useHistoricoMovimentacoes(titulo.id, titulo.tipo);

  console.log('[HistoricoTab] Renderizando histórico para título:', titulo.id);

  const getOperacaoIcon = (tipoOperacao: string) => {
    switch (tipoOperacao) {
      case 'EDICAO':
        return <Edit className="w-4 h-4" />;
      case 'LIQUIDACAO':
        return <CreditCard className="w-4 h-4" />;
      case 'ESTORNO':
        return <RotateCcw className="w-4 h-4" />;
      case 'CANCELAMENTO':
        return <X className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  const getOperacaoBadge = (tipoOperacao: string) => {
    const variants = {
      'EDICAO': 'secondary',
      'LIQUIDACAO': 'secondary',
      'ESTORNO': 'destructive',
      'CANCELAMENTO': 'destructive',
    } as const;

    const labels = {
      'EDICAO': 'Edição',
      'LIQUIDACAO': 'Liquidação',
      'ESTORNO': 'Estorno',
      'CANCELAMENTO': 'Cancelamento',
    } as const;

    return (
      <Badge variant={variants[tipoOperacao as keyof typeof variants] || 'default'}>
        {labels[tipoOperacao as keyof typeof labels] || tipoOperacao}
      </Badge>
    );
  };

  const formatarDataHora = (data: string) => {
    return format(new Date(data), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  const renderDetalhesOperacao = (item: any) => {
    switch (item.tipo_movimentacao) {
      case 'LIQUIDACAO':
        return (
          <div className="mt-2 p-2 bg-status-delivered/10 rounded-md text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="font-medium">Valor Pago:</span>
                <span className="ml-2">
                  {currencyUtils.formatCurrency(item.valor_movimentado || 0)}
                </span>
              </div>
              {item.dados_novos?.forma_pagamento && (
                <div>
                  <span className="font-medium">Forma:</span>
                  <span className="ml-2">{item.dados_novos.forma_pagamento}</span>
                </div>
              )}
              {item.dados_novos?.data_pagamento && (
                <div>
                  <span className="font-medium">Data Pagamento:</span>
                  <span className="ml-2">
                    {format(new Date(item.dados_novos.data_pagamento), 'dd/MM/yyyy')}
                  </span>
                </div>
              )}
            </div>
          </div>
        );

      case 'ESTORNO':
        return (
          <div className="mt-2 p-2 bg-status-cancelled/10 rounded-md text-sm">
            <div>
              <span className="font-medium">Motivo do Estorno:</span>
              <p className="mt-1">{item.dados_novos?.motivo || 'Não informado'}</p>
            </div>
          </div>
        );

      case 'EDICAO':
        return (
          <div className="mt-2 p-2 bg-status-confirmed/10 rounded-md text-sm">
            <div className="space-y-1">
              <span className="font-medium">Alterações realizadas:</span>
              {item.dados_anteriores && item.dados_novos && (
                <div className="grid grid-cols-1 gap-1 mt-1">
                  {Object.keys(item.dados_novos).map(campo => {
                    const valorAnterior = item.dados_anteriores[campo];
                    const valorNovo = item.dados_novos[campo];
                    
                    if (valorAnterior !== valorNovo) {
                      return (
                        <div key={campo} className="flex justify-between">
                          <span className="font-medium capitalize">{campo.replace('_', ' ')}:</span>
                          <span>
                            <span className="line-through text-muted-foreground">
                              {String(valorAnterior)}
                            </span>
                            {' → '}
                            <span>{String(valorNovo)}</span>
                          </span>
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
              )}
            </div>
          </div>
        );

      case 'CANCELAMENTO':
        return (
          <div className="mt-2 p-2 bg-status-draft/10 rounded-md text-sm">
            <div>
              <span className="font-medium">Motivo do Cancelamento:</span>
              <p className="mt-1">{item.dados_novos?.motivo_cancelamento || 'Não informado'}</p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex space-x-4">
            <div className="w-4 h-4 bg-muted rounded-full animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded animate-pulse" />
              <div className="h-3 bg-muted rounded w-2/3 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (historico.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <Clock className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Nenhum histórico encontrado</h3>
          <p className="text-muted-foreground text-center">
            Este título ainda não possui movimentações registradas.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Resumo do histórico */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Resumo do Histórico
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-status-confirmed">
                {historico.filter(h => h.tipo_movimentacao === 'EDICAO').length}
              </div>
              <div className="text-sm text-muted-foreground">Edições</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-status-delivered">
                {historico.filter(h => h.tipo_movimentacao === 'LIQUIDACAO').length}
              </div>
              <div className="text-sm text-muted-foreground">Liquidações</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-status-cancelled">
                {historico.filter(h => h.tipo_movimentacao === 'ESTORNO').length}
              </div>
              <div className="text-sm text-muted-foreground">Estornos</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-status-draft">
                {historico.filter(h => h.tipo_movimentacao === 'CANCELAMENTO').length}
              </div>
              <div className="text-sm text-muted-foreground">Cancelamentos</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timeline do histórico */}
      <Card>
        <CardHeader>
          <CardTitle>Timeline de Movimentações</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <div className="relative">
              {/* Linha vertical da timeline */}
              <div className="absolute left-6 top-0 bottom-0 w-px bg-border" />
              
              <div className="space-y-6">
                {historico.map((item, index) => (
                  <div key={item.id} className="relative flex items-start space-x-4">
                    {/* Ícone da operação */}
                    <div className="relative flex h-12 w-12 items-center justify-center rounded-full border-2 border-background bg-card shadow-sm">
                      {getOperacaoIcon(item.tipo_movimentacao)}
                    </div>
                    
                    {/* Conteúdo da movimentação */}
                    <div className="flex-1 min-w-0 pb-4">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          {getOperacaoBadge(item.tipo_movimentacao)}
                          <span className="font-medium">
                            {item.tipo_movimentacao === 'LIQUIDACAO' && 'Título liquidado'}
                            {item.tipo_movimentacao === 'EDICAO' && 'Título editado'}
                            {item.tipo_movimentacao === 'ESTORNO' && 'Liquidação estornada'}
                            {item.tipo_movimentacao === 'CANCELAMENTO' && 'Título cancelado'}
                          </span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {formatarDataHora(item.data_movimentacao)}
                        </span>
                      </div>
                      
                      {/* Informações do usuário */}
                      <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                        <User className="w-3 h-3" />
                        <span>{item.usuario_nome || 'Sistema'}</span>
                        {item.ip_origem && (
                          <>
                            <span>•</span>
                            <span>IP: {item.ip_origem}</span>
                          </>
                        )}
                      </div>
                      
                      {/* Observações */}
                      {item.observacoes && (
                        <p className="mt-2 text-sm">{item.observacoes}</p>
                      )}
                      
                      {/* Detalhes específicos da operação */}
                      {renderDetalhesOperacao(item)}
                      
                      {/* Separador */}
                      {index < historico.length - 1 && (
                        <Separator className="mt-4" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};
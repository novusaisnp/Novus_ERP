import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { 
  CreditCard, 
  RotateCcw, 
  Pencil, 
  Trash2, 
  Eye, 
  Calendar, 
  DollarSign,
  Clock,
  User,
  Building,
  AlertTriangle
} from 'lucide-react';

import { RateiosTab } from './movimentacoes/RateiosTab';
import { HistoricoTab } from './movimentacoes/HistoricoTab';
import { DocumentosTab } from './movimentacoes/DocumentosTab';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Toaster } from '@/components/ui/toaster';

import { 
  TituloFinanceiro, 
  PermissoesMovimentacao,
  StatusTitulo,
  TipoTitulo
} from '@/types/movimentacoesFinanceiras';
import { currencyUtils } from '@/utils/currencyUtils';

interface MovimentacoesGestaoPopupProps {
  isOpen: boolean;
  onClose: () => void;
  titulo: TituloFinanceiro;
  permissoes: PermissoesMovimentacao;
  /** [LOTE 3B] Delegar liquidação exclusivamente ao LiquidacaoTituloModal. */
  onLiquidar?: (titulo: TituloFinanceiro) => void;
}

export const MovimentacoesGestaoPopup = ({
  isOpen,
  onClose,
  titulo,
  permissoes,
  onLiquidar,
}: MovimentacoesGestaoPopupProps) => {
  console.log('[MovimentacoesGestaoPopup] Renderizando popup para título:', titulo.id);

  const navigate = useNavigate();
  const [tabAtiva, setTabAtiva] = useState('detalhes');
  const [operacaoAtiva, setOperacaoAtiva] = useState<string | null>(null);

  const getStatusBadge = (situacao: StatusTitulo) => {
    const variants = {
      'ABERTA': 'default',
      'PAGA': 'secondary',
      'RECEBIDA': 'secondary', 
      'VENCIDA': 'destructive',
      'CANCELADA': 'outline'
    } as const;
    
    return (
      <Badge variant={variants[situacao] || 'default'}>
        {situacao}
      </Badge>
    );
  };

  const getTipoBadge = (tipo: TipoTitulo) => {
    return (
      <Badge variant={tipo === 'CONTAS_PAGAR' ? 'destructive' : 'default'}>
        {tipo === 'CONTAS_PAGAR' ? 'A Pagar' : 'A Receber'}
      </Badge>
    );
  };

  const isVencido = () => {
    const hoje = new Date();
    const vencimento = new Date(titulo.data_vencimento);
    return vencimento < hoje && (titulo.situacao === 'ABERTA');
  };

  const podeRealizar = (operacao: string) => {
    switch (operacao) {
      case 'liquidar':
        return permissoes.pode_liquidar && (titulo.situacao === 'ABERTA' || titulo.situacao === 'VENCIDA');
      case 'estornar':
        return permissoes.pode_estornar && (titulo.situacao === 'PAGA' || titulo.situacao === 'RECEBIDA');
      case 'editar':
        return permissoes.pode_editar && titulo.situacao !== 'CANCELADA';
      case 'cancelar':
        return permissoes.pode_cancelar && titulo.situacao !== 'CANCELADA';
      default:
        return false;
    }
  };

  const handleOperacao = async (operacao: string) => {
    console.log('[MovimentacoesGestaoPopup] Operação selecionada:', operacao);
    setOperacaoAtiva(operacao);
    
    // TODO: Implementar modais específicos para cada operação
    // Por enquanto, mostrar toast de feedback
    const { toast } = await import('@/hooks/use-toast');
    
    switch (operacao) {
      case 'liquidar':
        // [LOTE 3B] Único caminho de liquidação: LiquidacaoTituloModal (via parent).
        if (onLiquidar) {
          onLiquidar(titulo);
        } else {
          toast({
            title: 'Baixar Título',
            description: 'Fluxo de liquidação indisponível neste contexto',
            variant: 'destructive',
          });
        }
        return;
      case 'editar':
        // Fechar o modal e navegar para a página de edição
        onClose();
        if (titulo.tipo === 'CONTAS_PAGAR') {
          navigate('/financeiro/contas-pagar', {
            state: { editarTitulo: titulo.id, origem: 'movimentacoes' }
          });
        } else {
          navigate('/financeiro/contas-receber', {
            state: { editarTitulo: titulo.id, origem: 'movimentacoes' }
          });
        }
        return;
      case 'cancelar':
        toast({
          title: "Cancelar Título",
          description: "Modal de cancelamento será implementado em breve",
        });
        break;
      case 'estornar':
        toast({
          title: "Estornar Título",
          description: "Modal de estorno será implementado em breve",
        });
        break;
      default:
        toast({
          title: "Operação Selecionada",
          description: `Operação ${operacao} será implementada em breve`,
        });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full h-[80vh] max-h-[80vh] p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-semibold flex items-center gap-2">
                Gestão do Título: {titulo.numero_documento}
                {getTipoBadge(titulo.tipo)}
                {getStatusBadge(titulo.situacao)}
              </DialogTitle>
              {isVencido() && (
                <div className="flex items-center gap-1 text-red-600 text-sm mt-1">
                  <AlertTriangle className="w-4 h-4" />
                  Título vencido há {Math.floor((new Date().getTime() - new Date(titulo.data_vencimento).getTime()) / (1000 * 60 * 60 * 24))} dias
                </div>
              )}
            </div>
            <div className="flex gap-2">
              {podeRealizar('liquidar') && (
                <Button onClick={() => handleOperacao('liquidar')}>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Baixar
                </Button>
              )}
              {podeRealizar('estornar') && (
                <Button variant="outline" onClick={() => handleOperacao('estornar')}>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Estornar
                </Button>
              )}
              {podeRealizar('editar') && (
                <Button variant="outline" onClick={() => handleOperacao('editar')}>
                  <Pencil className="w-4 h-4 mr-2" />
                  Editar
                </Button>
              )}
              {podeRealizar('cancelar') && (
                <Button variant="destructive" onClick={() => handleOperacao('cancelar')}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Cancelar
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <Tabs value={tabAtiva} onValueChange={setTabAtiva} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-4 mx-6 mt-4">
              <TabsTrigger value="detalhes">Detalhes</TabsTrigger>
              <TabsTrigger value="rateios">Rateios</TabsTrigger>
              <TabsTrigger value="historico">Histórico</TabsTrigger>
              <TabsTrigger value="documentos">Documentos</TabsTrigger>
            </TabsList>

            <TabsContent value="detalhes" className="flex-1 overflow-hidden px-6 pb-6">
              <ScrollArea className="h-full">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Informações Gerais */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <DollarSign className="w-5 h-5" />
                        Informações Financeiras
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Valor Original</label>
                          <div className="text-lg font-semibold">
                            {currencyUtils.formatCurrency(titulo.valor_original)}
                          </div>
                        </div>
                        {titulo.valor_atual && (
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Valor Atual</label>
                            <div className="text-lg font-semibold">
                              {currencyUtils.formatCurrency(titulo.valor_atual)}
                            </div>
                          </div>
                        )}
                        {titulo.valor_pago && titulo.valor_pago > 0 && (
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Valor Pago</label>
                            <div className="text-lg font-semibold text-green-600">
                              {currencyUtils.formatCurrency(titulo.valor_pago)}
                            </div>
                          </div>
                        )}
                      </div>

                      <Separator />

                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm font-medium text-muted-foreground">Número do Documento:</span>
                          <span className="font-medium">{titulo.numero_documento}</span>
                        </div>
                        {titulo.descricao && (
                          <div className="flex justify-between">
                            <span className="text-sm font-medium text-muted-foreground">Descrição:</span>
                            <span className="font-medium text-right max-w-xs">{titulo.descricao}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-sm font-medium text-muted-foreground">Status:</span>
                          {getStatusBadge(titulo.situacao)}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Informações de Datas */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Calendar className="w-5 h-5" />
                        Datas
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm font-medium text-muted-foreground">Data de Emissão:</span>
                          <span className="font-medium">{format(new Date(titulo.data_emissao), 'dd/MM/yyyy')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm font-medium text-muted-foreground">Data de Vencimento:</span>
                          <span className={`font-medium ${isVencido() ? 'text-red-600' : ''}`}>
                            {format(new Date(titulo.data_vencimento), 'dd/MM/yyyy')}
                          </span>
                        </div>
                        {titulo.data_pagamento && (
                          <div className="flex justify-between">
                            <span className="text-sm font-medium text-muted-foreground">Data de Pagamento:</span>
                            <span className="font-medium text-green-600">
                              {format(new Date(titulo.data_pagamento), 'dd/MM/yyyy')}
                            </span>
                          </div>
                        )}
                      </div>

                      <Separator />

                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm font-medium text-muted-foreground">Criado em:</span>
                          <span className="text-sm">{format(new Date(titulo.created_at), 'dd/MM/yyyy HH:mm')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm font-medium text-muted-foreground">Atualizado em:</span>
                          <span className="text-sm">{format(new Date(titulo.updated_at), 'dd/MM/yyyy HH:mm')}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Informações da Pessoa (Cliente/Fornecedor) */}
                  {titulo.pessoa && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <User className="w-5 h-5" />
                          {titulo.pessoa.tipo === 'cliente' ? 'Cliente' : 'Fornecedor'}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm font-medium text-muted-foreground">Nome:</span>
                          <span className="font-medium text-right max-w-xs">{titulo.pessoa.nome}</span>
                        </div>
                        {titulo.pessoa.cpf_cnpj && (
                          <div className="flex justify-between">
                            <span className="text-sm font-medium text-muted-foreground">CPF/CNPJ:</span>
                            <span className="font-medium">{titulo.pessoa.cpf_cnpj}</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Informações Contábeis */}
                  {(titulo.plano_conta || titulo.centro_custo) && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Building className="w-5 h-5" />
                          Informações Contábeis
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {titulo.plano_conta && (
                          <div className="flex justify-between">
                            <span className="text-sm font-medium text-muted-foreground">Plano de Contas:</span>
                            <span className="font-medium text-right max-w-xs">
                              {titulo.plano_conta.codigo} - {titulo.plano_conta.nome}
                            </span>
                          </div>
                        )}
                        {titulo.centro_custo && (
                          <div className="flex justify-between">
                            <span className="text-sm font-medium text-muted-foreground">Centro de Custo:</span>
                            <span className="font-medium text-right max-w-xs">
                              {titulo.centro_custo.codigo ? `${titulo.centro_custo.codigo} - ` : ''}{titulo.centro_custo.nome}
                            </span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Observações */}
                {titulo.observacoes && (
                  <Card className="mt-6">
                    <CardHeader>
                      <CardTitle>Observações</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm whitespace-pre-wrap">{titulo.observacoes}</p>
                    </CardContent>
                  </Card>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="rateios" className="flex-1 overflow-hidden px-6 pb-6">
              <RateiosTab 
                titulo={titulo} 
                podeEditar={podeRealizar('editar')} 
              />
            </TabsContent>

            <TabsContent value="historico" className="flex-1 overflow-hidden px-6 pb-6">
              <HistoricoTab titulo={titulo} />
            </TabsContent>

            <TabsContent value="documentos" className="flex-1 overflow-hidden px-6 pb-6">
              <DocumentosTab 
                titulo={titulo} 
                podeEditar={podeRealizar('editar')} 
              />
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
      <Toaster />
    </Dialog>
  );
};
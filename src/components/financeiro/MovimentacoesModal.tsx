import { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Eye, 
  CreditCard, 
  RotateCcw, 
  Pencil, 
  Trash2,
  Download,
  Calendar,
  DollarSign
} from 'lucide-react';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { MovimentacoesGestaoPopup } from './MovimentacoesGestaoPopup';
import { LiquidacaoTituloModal } from './LiquidacaoTituloModal';
import { 
  TituloFinanceiro, 
  FiltrosMovimentacao, 
  EstatisticasMovimentacao,
  PermissoesMovimentacao,
  TipoTitulo,
  StatusTitulo
} from '@/types/movimentacoesFinanceiras';
import { useMovimentacoesFinanceiras } from '@/hooks/useMovimentacoesFinanceiras';
import { currencyUtils } from '@/utils/currencyUtils';

interface MovimentacoesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MovimentacoesModal = ({ isOpen, onClose }: MovimentacoesModalProps) => {
  console.log('[MovimentacoesModal] Renderizando modal');

  const [filtros, setFiltros] = useState<FiltrosMovimentacao>({
    tipo_titulo: 'TODOS',
    situacao: 'TODOS',
    incluir_cancelados: false,
  });
  
  const [tituloSelecionado, setTituloSelecionado] = useState<TituloFinanceiro | null>(null);
  const [isGestaoPopupOpen, setIsGestaoPopupOpen] = useState(false);
  const [isLiquidacaoModalOpen, setIsLiquidacaoModalOpen] = useState(false);
  const [tabAtiva, setTabAtiva] = useState('lista');

  const {
    titulos,
    estatisticas,
    isLoading,
    error,
    permissoes,
    refetch
  } = useMovimentacoesFinanceiras(filtros);

  const handleFiltroChange = (campo: keyof FiltrosMovimentacao, valor: any) => {
    console.log('[MovimentacoesModal] Alterando filtro:', campo, valor);
    setFiltros(prev => ({ ...prev, [campo]: valor }));
  };

  const handleTituloClick = (titulo: TituloFinanceiro) => {
    console.log('[MovimentacoesModal] Título selecionado:', titulo.id);
    setTituloSelecionado(titulo);
    setIsGestaoPopupOpen(true);
  };

  const handleLiquidacaoClick = (titulo: TituloFinanceiro) => {
    console.log('[MovimentacoesModal] Liquidação selecionada:', titulo.id);
    setTituloSelecionado(titulo);
    setIsLiquidacaoModalOpen(true);
  };

  const handlePopupClose = () => {
    setIsGestaoPopupOpen(false);
    // [LOTE 3B] Mantém tituloSelecionado se liquidação foi aberta em cadeia.
    if (!isLiquidacaoModalOpen) {
      setTituloSelecionado(null);
    }
    refetch();
  };

  const handleLiquidacaoClose = () => {
    setIsLiquidacaoModalOpen(false);
    setTituloSelecionado(null);
  };

  const handleLiquidacaoSuccess = () => {
    refetch(); // Recarregar dados após liquidação
  };

  // [LOTE 3B] Popup delega liquidação para o modal único.
  const handleLiquidarFromPopup = (t: TituloFinanceiro) => {
    setTituloSelecionado(t);
    setIsGestaoPopupOpen(false);
    setIsLiquidacaoModalOpen(true);
  };

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

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-[95vw] w-full h-[90vh] max-h-[90vh] p-0">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle className="text-xl font-semibold">
              Movimentações Financeiras
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-hidden">
            <Tabs value={tabAtiva} onValueChange={setTabAtiva} className="h-full flex flex-col">
              <TabsList className="grid w-full grid-cols-3 mx-6 mt-4">
                <TabsTrigger value="lista">Lista de Títulos</TabsTrigger>
                <TabsTrigger value="estatisticas">Estatísticas</TabsTrigger>
                <TabsTrigger value="filtros">Filtros Avançados</TabsTrigger>
              </TabsList>

              <TabsContent value="lista" className="flex-1 overflow-hidden px-6 pb-6">
                {/* Filtros Rápidos */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por documento, pessoa..."
                      value={filtros.busca || ''}
                      onChange={(e) => handleFiltroChange('busca', e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  <Select
                    value={filtros.tipo_titulo || 'TODOS'}
                    onValueChange={(value) => handleFiltroChange('tipo_titulo', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TODOS">Todos os Tipos</SelectItem>
                      <SelectItem value="CONTAS_PAGAR">Contas a Pagar</SelectItem>
                      <SelectItem value="CONTAS_RECEBER">Contas a Receber</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={filtros.situacao || 'TODOS'}
                    onValueChange={(value) => handleFiltroChange('situacao', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TODOS">Todos os Status</SelectItem>
                      <SelectItem value="ABERTA">Aberta</SelectItem>
                      <SelectItem value="PAGA">Paga</SelectItem>
                      <SelectItem value="RECEBIDA">Recebida</SelectItem>
                      <SelectItem value="VENCIDA">Vencida</SelectItem>
                      <SelectItem value="CANCELADA">Cancelada</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button 
                    variant="outline" 
                    onClick={() => setTabAtiva('filtros')}
                    className="w-full"
                  >
                    <Filter className="w-4 h-4 mr-2" />
                    Mais Filtros
                  </Button>
                </div>

                {/* Lista de Títulos */}
                <ScrollArea className="h-[calc(90vh-280px)]">
                  {isLoading ? (
                    <div className="flex items-center justify-center h-32">
                      <div className="text-muted-foreground">Carregando títulos...</div>
                    </div>
                  ) : error ? (
                    <div className="flex items-center justify-center h-32">
                      <div className="text-destructive">Erro ao carregar títulos</div>
                    </div>
                  ) : titulos.length === 0 ? (
                    <div className="flex items-center justify-center h-32">
                      <div className="text-muted-foreground">Nenhum título encontrado</div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {titulos.map((titulo) => (
                        <Card 
                          key={titulo.id} 
                          className="cursor-pointer hover:bg-accent/50 transition-colors"
                          onClick={() => handleTituloClick(titulo)}
                        >
                          <CardContent className="p-4">
                            <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-center">
                              <div className="space-y-1">
                                <div className="font-medium">{titulo.numero_documento}</div>
                                <div className="text-sm text-muted-foreground">
                                  {titulo.descricao}
                                </div>
                              </div>

                              <div className="flex flex-col gap-1">
                                {getTipoBadge(titulo.tipo)}
                                {getStatusBadge(titulo.situacao)}
                              </div>

                              <div className="text-sm">
                                <div className="font-medium">
                                  {titulo.pessoa?.nome || 'Não informado'}
                                </div>
                                <div className="text-muted-foreground">
                                  {titulo.pessoa?.cpf_cnpj}
                                </div>
                              </div>

                              <div className="text-sm">
                                <div>Venc: {format(new Date(titulo.data_vencimento), 'dd/MM/yyyy')}</div>
                                {titulo.data_pagamento && (
                                  <div className="text-green-600">
                                    Pago: {format(new Date(titulo.data_pagamento), 'dd/MM/yyyy')}
                                  </div>
                                )}
                              </div>

                              <div className="text-right">
                                <div className="font-semibold">
                                  {currencyUtils.formatCurrency(titulo.valor_original)}
                                </div>
                                {titulo.valor_pago && titulo.valor_pago > 0 && (
                                  <div className="text-sm text-green-600">
                                    Pago: {currencyUtils.formatCurrency(titulo.valor_pago)}
                                  </div>
                                )}
                              </div>

                              <div className="flex gap-2">
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleTituloClick(titulo)}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                {permissoes.pode_liquidar && (titulo.situacao === 'ABERTA' || titulo.situacao === 'VENCIDA') && (
                                  <Button 
                                    size="sm" 
                                    variant="default"
                                    onClick={() => handleLiquidacaoClick(titulo)}
                                  >
                                    <CreditCard className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="estatisticas" className="flex-1 overflow-hidden px-6 pb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Total de Títulos</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{estatisticas?.total_titulos || 0}</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Em Aberto</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-yellow-600">
                        {estatisticas?.total_abertos || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {currencyUtils.formatCurrency(estatisticas?.valor_total_aberto || 0)}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Pagos/Recebidos</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">
                        {estatisticas?.total_pagos || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {currencyUtils.formatCurrency(estatisticas?.valor_total_pago || 0)}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Vencidos</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-red-600">
                        {estatisticas?.total_vencidos || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {currencyUtils.formatCurrency(estatisticas?.valor_total_vencido || 0)}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="filtros" className="flex-1 overflow-hidden px-6 pb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Data Início</label>
                    <Input
                      type="date"
                      value={filtros.data_inicio || ''}
                      onChange={(e) => handleFiltroChange('data_inicio', e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Data Fim</label>
                    <Input
                      type="date"
                      value={filtros.data_fim || ''}
                      onChange={(e) => handleFiltroChange('data_fim', e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Valor Mínimo</label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={filtros.valor_min || ''}
                      onChange={(e) => handleFiltroChange('valor_min', parseFloat(e.target.value) || undefined)}
                      placeholder="0,00"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Valor Máximo</label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={filtros.valor_max || ''}
                      onChange={(e) => handleFiltroChange('valor_max', parseFloat(e.target.value) || undefined)}
                      placeholder="0,00"
                    />
                  </div>

                  <div className="flex items-center space-x-2 pt-6">
                    <input
                      type="checkbox"
                      id="incluir-cancelados"
                      checked={filtros.incluir_cancelados || false}
                      onChange={(e) => handleFiltroChange('incluir_cancelados', e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <label htmlFor="incluir-cancelados" className="text-sm font-medium">
                      Incluir títulos cancelados
                    </label>
                  </div>
                </div>

                <div className="flex gap-2 mt-6">
                  <Button onClick={() => setTabAtiva('lista')}>
                    Aplicar Filtros
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setFiltros({ tipo_titulo: 'TODOS', situacao: 'TODOS', incluir_cancelados: false })}
                  >
                    Limpar Filtros
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>

      {/* Popup de Gestão do Título */}
      {tituloSelecionado && (
        <MovimentacoesGestaoPopup
          isOpen={isGestaoPopupOpen}
          onClose={handlePopupClose}
          titulo={tituloSelecionado}
          permissoes={permissoes}
        />
      )}

      {/* Modal de Liquidação */}
      {tituloSelecionado && (
        <LiquidacaoTituloModal
          isOpen={isLiquidacaoModalOpen}
          onClose={handleLiquidacaoClose}
          titulo={tituloSelecionado}
          onSuccess={handleLiquidacaoSuccess}
        />
      )}
    </>
  );
};
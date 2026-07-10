import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useMovimentacoesBancarias } from '@/hooks/useMovimentacoesBancarias';
import { useContasBancarias } from '@/hooks/useContasBancarias';
import { FiltrosMovimentacoes } from '@/types/movimentacoesBancarias';
import { MovimentacoesBancariasFilters } from './MovimentacoesBancariasFilters';
import { MovimentacoesBancariasStats } from './MovimentacoesBancariasStats';
import { MovimentacoesBancariasTable } from './MovimentacoesBancariasTable';
import { NovaMovimentacaoModal } from './NovaMovimentacaoModal';
import { TransferenciaModal } from './TransferenciaModal';
import { X, Plus, ArrowRightLeft, Download, Upload } from 'lucide-react';


interface MovimentacoesBancariasModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MovimentacoesBancariasModal({
  isOpen,
  onClose,
}: MovimentacoesBancariasModalProps) {
  const [filtros, setFiltros] = useState<FiltrosMovimentacoes>({});
  const [novaMovimentacaoOpen, setNovaMovimentacaoOpen] = useState(false);
  const [transferenciaOpen, setTransferenciaOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('movimentacoes');

  const { movimentacoes, estatisticas, isLoading, refetch } = useMovimentacoesBancarias(filtros);
  const { contasBancarias } = useContasBancarias();

  // Atualizar dados quando o modal abrir
  useEffect(() => {
    if (isOpen) {
      refetch();
    }
  }, [isOpen, refetch]);

  const handleFiltrosChange = (novosFiltros: FiltrosMovimentacoes) => {
    setFiltros(novosFiltros);
  };

  const handleExportarExtrato = () => {
    // TODO: Implementar exportação
  };

  const contasOptions = contasBancarias.map(conta => ({
    value: conta.id,
    label: `${conta.numero_conta} - ${conta.titular}`,
    conta: conta,
  }));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] h-[90vh] flex flex-col">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center space-x-2">
            <DialogTitle className="text-xl font-semibold">
              Movimentações Bancárias
            </DialogTitle>
            <Badge variant="outline" className="ml-2">
              {movimentacoes.length} movimentações
            </Badge>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportarExtrato}
              disabled={movimentacoes.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
            <Button
              variant="outline" 
              size="sm"
              onClick={() => setTransferenciaOpen(true)}
            >
              <ArrowRightLeft className="h-4 w-4 mr-2" />
              Transferência
            </Button>
            <Button
              size="sm"
              onClick={() => setNovaMovimentacaoOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nova Movimentação
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 flex flex-col min-h-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="movimentacoes">Movimentações</TabsTrigger>
              <TabsTrigger value="extrato">Extrato Avançado</TabsTrigger>
              <TabsTrigger value="historico">Histórico</TabsTrigger>
            </TabsList>

            <TabsContent value="movimentacoes" className="flex-1 flex flex-col space-y-4">
              <MovimentacoesBancariasFilters
                filtros={filtros}
                contasOptions={contasOptions}
                onFiltrosChange={handleFiltrosChange}
              />

              {estatisticas && (
                <MovimentacoesBancariasStats estatisticas={estatisticas} />
              )}

              <div className="flex-1 min-h-0">
                <MovimentacoesBancariasTable
                  movimentacoes={movimentacoes}
                  isLoading={isLoading}
                  onRefresh={refetch}
                />
              </div>
            </TabsContent>

            <TabsContent value="extrato" className="flex-1 flex flex-col">
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Extrato Avançado</h3>
                  <p className="text-muted-foreground">
                    Em desenvolvimento - Visualização avançada de extratos
                  </p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="historico" className="flex-1 flex flex-col">
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Histórico de Operações</h3>
                  <p className="text-muted-foreground">
                    Em desenvolvimento - Histórico detalhado de todas as operações
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Modais */}
        <NovaMovimentacaoModal
          isOpen={novaMovimentacaoOpen}
          onClose={() => setNovaMovimentacaoOpen(false)}
          contasOptions={contasOptions}
          onSuccess={() => {
            setNovaMovimentacaoOpen(false);
            refetch();
          }}
        />

        <TransferenciaModal
          isOpen={transferenciaOpen}
          onClose={() => setTransferenciaOpen(false)}
          contasOptions={contasOptions}
          onSuccess={() => {
            setTransferenciaOpen(false);
            refetch();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
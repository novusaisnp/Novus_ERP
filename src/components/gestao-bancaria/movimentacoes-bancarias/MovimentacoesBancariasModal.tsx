import React, { useState, useEffect, useMemo } from 'react';
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
import { PaginationFooter } from '@/components/shared/PaginationFooter';
import { NovaMovimentacaoModal } from './NovaMovimentacaoModal';
import { TransferenciaModal } from './TransferenciaModal';
import { HistoricoMovimentacoes } from './HistoricoMovimentacoes';
import { X, Plus, ArrowRightLeft } from 'lucide-react';
import { toCsv, downloadCsv } from '@/utils/csvExport';
import { ExportMenu } from '@/components/relatorios/ExportMenu';
import { groupBy } from '@/utils/relatoriosAgg';
import { brlPt, type ReportExportPayload } from '@/utils/reportExportShared';
import { useEmpresasRepresentadas } from '@/hooks/useEmpresasRepresentadas';
import { useEmpresasLogosMap } from '@/hooks/useEmpresasLogosMap';
import type { MovimentacaoBancaria } from '@/types/movimentacoesBancarias';
import { getTipoLabel } from './tipoMovimentacaoLabels';


const PAGE_SIZE = 50;

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
  const [page, setPage] = useState(0);

  const { movimentacoes, total, estatisticas, isLoading, isFetching, refetch } = useMovimentacoesBancarias(
    filtros,
    { page, pageSize: PAGE_SIZE },
  );
  const { contasBancarias } = useContasBancarias();
  const { empresas } = useEmpresasRepresentadas();
  const { data: logosMap, isLoading: logosLoading } = useEmpresasLogosMap(empresas);

  // Atualizar dados quando o modal abrir
  useEffect(() => {
    if (isOpen) {
      refetch();
    }
  }, [isOpen, refetch]);

  const handleFiltrosChange = (novosFiltros: FiltrosMovimentacoes) => {
    setFiltros(novosFiltros);
    setPage(0);
  };

  const detailColumns = useMemo(() => [
    { header: 'Data', accessor: (m: MovimentacaoBancaria) => m.data_movimentacao },
    { header: 'Tipo', accessor: (m: MovimentacaoBancaria) => getTipoLabel(m.tipo_movimentacao) },
    { header: 'Conta', accessor: (m: MovimentacaoBancaria) => m.conta_bancaria ? `${m.conta_bancaria.numero_conta} - ${m.conta_bancaria.titular}` : '' },
    { header: 'Conta Destino', accessor: (m: MovimentacaoBancaria) => m.conta_destino ? `${m.conta_destino.numero_conta} - ${m.conta_destino.titular}` : '' },
    { header: 'Descrição', accessor: (m: MovimentacaoBancaria) => m.descricao },
    { header: 'Valor', accessor: (m: MovimentacaoBancaria) => m.valor },
    { header: 'Documento', accessor: (m: MovimentacaoBancaria) => m.documento_referencia ?? '' },
    { header: 'Conciliado', accessor: (m: MovimentacaoBancaria) => m.conciliado ? 'Sim' : 'Não' },
    { header: 'Estornado', accessor: (m: MovimentacaoBancaria) => m.estornado ? 'Sim' : 'Não' },
    { header: 'Observações', accessor: (m: MovimentacaoBancaria) => m.observacoes ?? '' },
  ], []);

  const handleExportarCsv = () => {
    const csv = toCsv(movimentacoes, detailColumns);
    downloadCsv(`movimentacoes-bancarias-${new Date().toISOString().split('T')[0]}.csv`, csv);
  };

  const reportBranding = useMemo(() => {
    const empresa = empresas.find((e) => e.ativo !== false) ?? empresas[0];
    if (!empresa?.id) return null;
    const cfg = (empresa.configuracoes as Record<string, unknown> | null | undefined) ?? {};
    return {
      companyName: empresa.nome,
      logoUrl: logosMap?.get(empresa.id) ?? null,
      primaryColor: typeof cfg.primary_color === 'string' ? cfg.primary_color : null,
    };
  }, [empresas, logosMap]);

  const exportPayload: ReportExportPayload<MovimentacaoBancaria> = useMemo(() => ({
    title: 'Movimentações Bancárias',
    subtitle: filtros.data_inicio || filtros.data_fim
      ? `Período: ${filtros.data_inicio || '—'} a ${filtros.data_fim || '—'}`
      : undefined,
    branding: reportBranding,
    filters: [
      { label: 'Conta', value: contasBancarias.find((c) => c.id === filtros.conta_bancaria_id)?.numero_conta ?? 'Todas' },
      { label: 'Tipo', value: filtros.tipo_movimentacao ?? 'Todos' },
    ],
    kpis: estatisticas ? [
      { label: 'Entradas', value: brlPt(estatisticas.valor_total_entradas) },
      { label: 'Saídas', value: brlPt(estatisticas.valor_total_saidas) },
      { label: 'Saldo Líquido', value: brlPt(estatisticas.saldo_liquido) },
    ] : [],
    insights: [],
    detail: { columns: detailColumns, rows: movimentacoes },
    aggregated: movimentacoes.length > 0 ? {
      groupLabel: 'Tipo',
      rows: groupBy(movimentacoes, (m) => m.tipo_movimentacao, (m) => m.valor, getTipoLabel),
    } : null,
    filenameBase: 'movimentacoes-bancarias',
  }), [filtros, contasBancarias, estatisticas, movimentacoes, detailColumns, reportBranding]);

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
              {total} movimentações
            </Badge>
          </div>
          <div className="flex items-center space-x-2">
            <ExportMenu
              payload={exportPayload}
              onCsv={handleExportarCsv}
              disabled={movimentacoes.length === 0 || logosLoading}
            />
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
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="movimentacoes">Movimentações</TabsTrigger>
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

              {!isLoading && movimentacoes.length > 0 && (
                <PaginationFooter
                  page={page}
                  pageSize={PAGE_SIZE}
                  total={total}
                  isFetching={isFetching}
                  onPageChange={setPage}
                />
              )}
            </TabsContent>

            <TabsContent value="historico" className="flex-1 flex flex-col">
              <HistoricoMovimentacoes movimentacoes={movimentacoes} />
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
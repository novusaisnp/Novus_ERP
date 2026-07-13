// P14.1: Página Kardex por Produto
import React, { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Download, ScrollText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresaAtual } from '@/hooks/estoque/useEmpresaAtual';
import { useKardex } from '@/hooks/estoque/useKardex';
import {
  downloadCsv, kardexToCsv,
} from '@/services/estoque/relatoriosService';
import { KardexTable } from './KardexTable';

const PAGE_SIZE = 100;

const todayIso = () => new Date().toISOString().slice(0, 10);
const daysAgoIso = (d: number) => {
  const dt = new Date();
  dt.setDate(dt.getDate() - d);
  return dt.toISOString().slice(0, 10);
};

const KardexPage: React.FC = () => {
  const { produtoId = '' } = useParams<{ produtoId: string }>();
  const navigate = useNavigate();
  const { data: empresaId } = useEmpresaAtual();

  const [dataInicio, setDataInicio] = useState<string>(daysAgoIso(30));
  const [dataFim, setDataFim] = useState<string>(todayIso());
  const [localizacaoId, setLocalizacaoId] = useState<string>('');
  const [page, setPage] = useState(0);

  const { data: produto } = useQuery({
    queryKey: ['produto-kardex', produtoId],
    enabled: !!produtoId,
    queryFn: async () => {
      const { data, error } = await (supabase as unknown as {
        from: (t: string) => {
          select: (c: string) => {
            eq: (k: string, v: string) => {
              maybeSingle: () => Promise<{
                data: { id: string; nome: string; codigo: string | null } | null;
                error: unknown;
              }>;
            };
          };
        };
      })
        .from('produtos')
        .select('id, nome, codigo')
        .eq('id', produtoId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: localizacoes = [] } = useQuery({
    queryKey: ['locs-kardex', empresaId],
    enabled: !!empresaId,
    queryFn: async () => {
      const { data, error } = await (supabase as unknown as {
        from: (t: string) => {
          select: (c: string) => {
            eq: (k: string, v: string) => Promise<{
              data: Array<{ id: string; nome: string }> | null;
              error: unknown;
            }>;
          };
        };
      })
        .from('localizacoes_estoque')
        .select('id, nome')
        .eq('empresa_representada_id', empresaId as string);
      if (error) throw error;
      return data ?? [];
    },
  });

  const kardexParams = useMemo(() => {
    if (!empresaId || !produtoId) return null;
    return {
      empresaId,
      produtoId,
      localizacaoId: localizacaoId || null,
      dataInicio: dataInicio || null,
      dataFim: dataFim || null,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    };
  }, [empresaId, produtoId, localizacaoId, dataInicio, dataFim, page]);

  const { data, isLoading, isFetching } = useKardex(kardexParams);
  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleExport = () => {
    if (rows.length === 0) return;
    const csv = kardexToCsv(rows);
    const codigo = produto?.codigo ?? produtoId.slice(0, 8);
    downloadCsv(`kardex_${codigo}_${todayIso()}.csv`, csv);
  };

  return (
    <div className="container mx-auto px-6 py-8 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Voltar">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
              <ScrollText className="h-8 w-8" />
              Kardex
            </h1>
            <p className="text-muted-foreground">
              {produto ? (
                <>
                  <span className="font-medium text-foreground">{produto.nome}</span>
                  {produto.codigo && <span className="ml-2 font-mono text-sm">({produto.codigo})</span>}
                </>
              ) : (
                'Extrato cronológico de movimentações'
              )}
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={handleExport} disabled={rows.length === 0}>
          <Download className="h-4 w-4 mr-2" /> Exportar CSV
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label htmlFor="data-inicio">Data início</Label>
            <Input
              id="data-inicio"
              type="date"
              value={dataInicio}
              onChange={(e) => { setDataInicio(e.target.value); setPage(0); }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="data-fim">Data fim</Label>
            <Input
              id="data-fim"
              type="date"
              value={dataFim}
              onChange={(e) => { setDataFim(e.target.value); setPage(0); }}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Localização</Label>
            <Select
              value={localizacaoId || 'ALL'}
              onValueChange={(v) => { setLocalizacaoId(v === 'ALL' ? '' : v); setPage(0); }}
            >
              <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todas as localizações</SelectItem>
                {localizacoes.map((l) => (
                  <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <KardexTable rows={rows} isLoading={isLoading} />
        </CardContent>
      </Card>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div>
          {total > 0 ? (
            <>Mostrando {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} de {total}</>
          ) : (
            'Sem resultados'
          )}
          {isFetching && <span className="ml-2 italic">atualizando…</span>}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline" size="sm"
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            Anterior
          </Button>
          <Button
            variant="outline" size="sm"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
          >
            Próxima
          </Button>
        </div>
      </div>
    </div>
  );
};

export default KardexPage;

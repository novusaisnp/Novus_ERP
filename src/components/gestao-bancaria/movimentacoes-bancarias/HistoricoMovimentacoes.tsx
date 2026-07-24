import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { obterHistoricoMovimentacao } from '@/services/movimentacoesBancariasService';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, History } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { MovimentacaoBancaria } from '@/types/movimentacoesBancarias';

interface Props {
  movimentacoes: MovimentacaoBancaria[];
}

const CAMPOS_IGNORADOS = new Set(['created_at', 'updated_at']);

interface DiffEntry {
  campo: string;
  de: unknown;
  para: unknown;
}

const computarDiff = (
  anteriores: Record<string, unknown> | null | undefined,
  novos: Record<string, unknown> | null | undefined,
): DiffEntry[] => {
  const diffs: DiffEntry[] = [];
  const chaves = new Set([
    ...Object.keys(anteriores || {}),
    ...Object.keys(novos || {}),
  ]);
  chaves.forEach((k) => {
    if (CAMPOS_IGNORADOS.has(k)) return;
    const antes = anteriores?.[k];
    const depois = novos?.[k];
    if (JSON.stringify(antes) !== JSON.stringify(depois)) {
      diffs.push({ campo: k, de: antes, para: depois });
    }
  });
  return diffs;
};

const formatValor = (v: unknown) => {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
};

export function HistoricoMovimentacoes({ movimentacoes }: Props) {
  const [movimentacaoId, setMovimentacaoId] = useState<string>('');

  const { data: historico = [], isLoading, error } = useQuery({
    queryKey: ['historico-movimentacao', movimentacaoId],
    queryFn: () => obterHistoricoMovimentacao(movimentacaoId),
    enabled: !!movimentacaoId,
  });

  return (
    <Card className="flex-1 flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Histórico de Operações
        </CardTitle>
        <div className="space-y-2 pt-2">
          <Label htmlFor="mov-select">Selecione uma movimentação</Label>
          <select
            id="mov-select"
            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={movimentacaoId}
            onChange={(e) => setMovimentacaoId(e.target.value)}
          >
            <option value="">-- Escolha --</option>
            {movimentacoes.map((m) => (
              <option key={m.id} value={m.id}>
                {format(new Date(m.data_movimentacao), 'dd/MM/yyyy', { locale: ptBR })} · {m.tipo_movimentacao} · {m.descricao}
              </option>
            ))}
          </select>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto">
        {!movimentacaoId && (
          <p className="text-muted-foreground text-sm text-center py-8">
            Selecione uma movimentação para visualizar o histórico.
          </p>
        )}
        {movimentacaoId && isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
        {movimentacaoId && error && (
          <p className="text-destructive text-sm text-center py-8">
            Erro ao carregar histórico.
          </p>
        )}
        {movimentacaoId && !isLoading && historico.length === 0 && (
          <p className="text-muted-foreground text-sm text-center py-8">
            Nenhum registro de auditoria encontrado.
          </p>
        )}
        {historico.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data / Hora</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Alterações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {historico.map((h) => {
                const diffs = h.acao === 'UPDATE'
                  ? computarDiff(h.dados_anteriores, h.dados_novos)
                  : [];
                return (
                  <TableRow key={h.id}>
                    <TableCell className="whitespace-nowrap text-xs">
                      {format(new Date(h.created_at), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          h.acao === 'INSERT' ? 'default' :
                          h.acao === 'DELETE' ? 'destructive' : 'secondary'
                        }
                      >
                        {h.acao}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-mono">
                      {h.usuario_id ? String(h.usuario_id).slice(0, 8) : '—'}
                    </TableCell>
                    <TableCell className="text-xs">
                      {h.acao === 'INSERT' && 'Registro criado'}
                      {h.acao === 'DELETE' && 'Registro removido'}
                      {h.acao === 'UPDATE' && diffs.length === 0 && 'Sem alterações relevantes'}
                      {h.acao === 'UPDATE' && diffs.length > 0 && (
                        <ul className="space-y-1">
                          {diffs.map((d) => (
                            <li key={d.campo}>
                              <span className="font-semibold">{d.campo}:</span>{' '}
                              <span className="text-muted-foreground line-through">{formatValor(d.de)}</span>
                              {' → '}
                              <span className="text-foreground">{formatValor(d.para)}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

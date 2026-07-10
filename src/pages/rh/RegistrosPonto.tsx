import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase as _supabase } from '@/integrations/supabase/client';
import { colaboradorService } from '@/services/colaboradorService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Clock } from 'lucide-react';

const supabase: any = _supabase;

interface Registro {
  id: string;
  colaborador_id: string;
  data_registro: string;
  entrada_1: string | null;
  saida_1: string | null;
  entrada_2: string | null;
  saida_2: string | null;
  total_horas: number | null;
  status: string | null;
}

const fmtTime = (t: string | null) => t ? t.slice(0, 5) : '—';

const RegistrosPonto: React.FC = () => {
  const [filtroColaborador, setFiltroColaborador] = useState<string>('all');
  const [dataInicio, setDataInicio] = useState<string>('');
  const [dataFim, setDataFim] = useState<string>('');

  const { data: colaboradores = [] } = useQuery({
    queryKey: ['colaboradores'],
    queryFn: colaboradorService.fetchColaboradores,
  });

  const { data: registros = [], isLoading, error } = useQuery<Registro[]>({
    queryKey: ['registros_ponto'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('registros_ponto')
        .select('*')
        .order('data_registro', { ascending: false })
        .limit(500);
      if (error) throw error;
      return data || [];
    },
  });

  const colaboradorMap = useMemo(() => {
    const m: Record<string, string> = {};
    (colaboradores as any[]).forEach((c) => { m[c.id] = c.nome; });
    return m;
  }, [colaboradores]);

  const filtered = registros.filter((r) => {
    if (filtroColaborador !== 'all' && r.colaborador_id !== filtroColaborador) return false;
    if (dataInicio && r.data_registro < dataInicio) return false;
    if (dataFim && r.data_registro > dataFim) return false;
    return true;
  });

  return (
    <div className="container mx-auto px-6 py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-primary mb-2">Registros de Ponto</h1>
        <p className="text-muted-foreground">Consulte os registros de ponto por colaborador e período</p>
      </div>

      <Card>
        <CardContent className="p-4 grid gap-4 md:grid-cols-3">
          <div>
            <Label>Colaborador</Label>
            <Select value={filtroColaborador} onValueChange={setFiltroColaborador}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {(colaboradores as any[]).map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Data Início</Label><Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} /></div>
          <div><Label>Data Fim</Label><Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Registros</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : error ? (
            <div className="text-center py-8 text-destructive">Erro ao carregar registros</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">Nenhum registro encontrado</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Colaborador</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Entrada 1</TableHead>
                  <TableHead>Saída 1</TableHead>
                  <TableHead>Entrada 2</TableHead>
                  <TableHead>Saída 2</TableHead>
                  <TableHead>Total Horas</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{colaboradorMap[r.colaborador_id] || '—'}</TableCell>
                    <TableCell>{new Date(r.data_registro).toLocaleDateString('pt-BR')}</TableCell>
                    <TableCell>{fmtTime(r.entrada_1)}</TableCell>
                    <TableCell>{fmtTime(r.saida_1)}</TableCell>
                    <TableCell>{fmtTime(r.entrada_2)}</TableCell>
                    <TableCell>{fmtTime(r.saida_2)}</TableCell>
                    <TableCell className="font-medium">{r.total_horas != null ? `${r.total_horas.toFixed(2)}h` : '—'}</TableCell>
                    <TableCell><Badge variant="outline">{r.status || 'NORMAL'}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RegistrosPonto;

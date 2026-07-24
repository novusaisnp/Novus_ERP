import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, Plus, Pencil, Trash2 } from 'lucide-react';
import { ConfirmDeleteWithDeps } from '@/components/shared/ConfirmDeleteWithDeps';
import { useContratos } from '@/hooks/useContratos';
import { ContratoFormModal } from '@/components/contratos/ContratoFormModal';
import { Contrato, ContratoStatus, ContratoFiltros } from '@/types/contratos';
import { clienteService } from '@/services/clienteService';
import { useEmpresaAtual } from '@/hooks/estoque/useEmpresaAtual';

const STATUS: ContratoStatus[] = ['RASCUNHO', 'ATIVO', 'SUSPENSO', 'ENCERRADO', 'CANCELADO'];

const Contratos: React.FC = () => {
  const [filtros, setFiltros] = useState<ContratoFiltros>({});
  const { contratos, loading, excluirContrato } = useContratos(filtros);
  const { data: empresaId } = useEmpresaAtual();
  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes', empresaId],
    queryFn: () => clienteService.fetchClientes(empresaId!),
    enabled: !!empresaId,
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Contrato | null>(null);
  const [toDelete, setToDelete] = useState<Contrato | null>(null);

  const abrirNovo = () => { setEditing(null); setModalOpen(true); };
  const abrirEdit = (c: Contrato) => { setEditing(c); setModalOpen(true); };

  return (
    <div className="container mx-auto px-6 py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-primary mb-1">Contratos</h1>
          <p className="text-muted-foreground">Gestão de contratos com clientes</p>
        </div>
        <Button onClick={abrirNovo}><Plus className="h-4 w-4 mr-2" />Novo Contrato</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Filtros</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>Status</Label>
            <Select
              value={filtros.status || '__ALL__'}
              onValueChange={(v) => setFiltros((p) => ({ ...p, status: v === '__ALL__' ? '' : (v as ContratoStatus) }))}
            >
              <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__ALL__">Todos</SelectItem>
                {STATUS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Cliente</Label>
            <Select
              value={filtros.cliente_id || '__ALL__'}
              onValueChange={(v) => setFiltros((p) => ({ ...p, cliente_id: v === '__ALL__' ? '' : v }))}
            >
              <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__ALL__">Todos</SelectItem>
                {(clientes as any[]).filter((c) => c.id).map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Buscar título</Label>
            <Input value={filtros.busca || ''} onChange={(e) => setFiltros((p) => ({ ...p, busca: e.target.value }))} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : contratos.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">Nenhum contrato encontrado</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Início</TableHead>
                  <TableHead>Fim</TableHead>
                  <TableHead className="text-right">Valor Mensal</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contratos.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>{c.titulo}</TableCell>
                    <TableCell>{c.cliente?.nome || '-'}</TableCell>
                    <TableCell><Badge variant="outline">{c.status}</Badge></TableCell>
                    <TableCell>{c.data_inicio || '-'}</TableCell>
                    <TableCell>{c.data_fim || '-'}</TableCell>
                    <TableCell className="text-right">
                      {(c.valor_mensal || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button size="icon" variant="ghost" onClick={() => abrirEdit(c)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => setToDelete(c)}><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ContratoFormModal open={modalOpen} onOpenChange={setModalOpen} contrato={editing} />

      <ConfirmDeleteWithDeps
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        entidade="contratos"
        id={toDelete?.id ?? null}
        nomeRegistro={toDelete?.titulo || undefined}
        onConfirm={async () => { if (toDelete?.id) await excluirContrato(toDelete.id); setToDelete(null); }}
      />

    </div>
  );
};

export default Contratos;

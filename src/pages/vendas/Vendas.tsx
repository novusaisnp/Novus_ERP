import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ShoppingCart, Plus, Pencil, Trash2, Ban, FileText } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ConfirmDeleteWithDeps } from '@/components/shared/ConfirmDeleteWithDeps';

import { useVendas } from '@/hooks/useVendas';
import { VendaFormModal } from '@/components/vendas/VendaFormModal';
import { GerarTitulosButton } from '@/components/vendas/GerarTitulosButton';
import { VendaAcoesMenu } from '@/components/vendas/VendaAcoesMenu';
import { VendaViewDialog } from '@/components/vendas/VendaViewDialog';
import { Venda, VendaStatus, VendaFiltros } from '@/types/vendas';

import EmitirNFeDialog from '@/components/fiscal/EmitirNFeDialog';
import DetalheNFeDrawer from '@/components/fiscal/DetalheNFeDrawer';
import FiscalStatusBadge from '@/components/fiscal/FiscalStatusBadge';
import { useFiscalStatusPorVenda } from '@/hooks/fiscal/useFiscalStatusPorVenda';
import { useClientes } from '@/hooks/useClientes';
import { VENDA_STATUS_LABEL, VENDA_STATUS_BADGE_CLASS } from '@/utils/vendaStatusBadge';
import { useEmpresasRepresentadas } from '@/hooks/useEmpresasRepresentadas';
import { useEmpresasLogosMap } from '@/hooks/useEmpresasLogosMap';
import { useEmpresaAtual } from '@/hooks/estoque/useEmpresaAtual';

const STATUS: VendaStatus[] = ['RASCUNHO', 'CONFIRMADO', 'EM_PRODUCAO', 'FATURADO', 'ENTREGUE', 'CANCELADO'];
const STATUS_EMISSAO_OK: VendaStatus[] = ['FATURADO', 'ENTREGUE'];

interface EmissaoCheck { ok: boolean; motivo?: string; }

const podeEmitir = (v: Venda, fiscalStatus?: string): EmissaoCheck => {
  if (!STATUS_EMISSAO_OK.includes(v.status as VendaStatus)) {
    return { ok: false, motivo: 'Venda precisa estar FATURADO ou ENTREGUE.' };
  }
  if (!v.cliente_id) return { ok: false, motivo: 'Venda sem cliente vinculado.' };
  if (!v.valor_total || v.valor_total <= 0) return { ok: false, motivo: 'Valor total precisa ser positivo.' };
  if (fiscalStatus && ['autorizada', 'processando'].includes(fiscalStatus)) {
    return { ok: false, motivo: 'Já existe NF-e ativa para esta venda.' };
  }
  return { ok: true };
};

const Vendas: React.FC = () => {
  const [filtros, setFiltros] = useState<VendaFiltros>({});
  const { vendas, loading, excluirVenda, cancelarVenda } = useVendas(filtros);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Venda | null>(null);
  const [toDelete, setToDelete] = useState<Venda | null>(null);
  const [toCancel, setToCancel] = useState<Venda | null>(null);
  const [emitirVenda, setEmitirVenda] = useState<Venda | null>(null);
  const [detalheDocId, setDetalheDocId] = useState<string | null>(null);
  const [viewVenda, setViewVenda] = useState<Venda | null>(null);

  const vendaIds = useMemo(() => vendas.map((v) => v.id), [vendas]);
  const { data: fiscalMap = {} } = useFiscalStatusPorVenda(vendaIds);

  const { data: empresaId } = useEmpresaAtual();
  const { clientes } = useClientes(empresaId ?? null);
  const { empresas } = useEmpresasRepresentadas();
  const logosMapQ = useEmpresasLogosMap(empresas);
  const logoOf = (id: string) => logosMapQ.data?.get(id) ?? null;

  const empresaById = useMemo(() => {
    const m = new Map<string, (typeof empresas)[number]>();
    (empresas ?? []).forEach((e) => e.id && m.set(e.id, e));
    return m;
  }, [empresas]);

  const clienteById = useMemo(() => {
    const m = new Map<string, (typeof clientes)[number]>();
    (clientes ?? []).forEach((c) => c.id && m.set(c.id, c));
    return m;
  }, [clientes]);

  const empresaPdfOf = (empresaRepresentadaId?: string | null) => {
    if (!empresaRepresentadaId) return null;
    const e = empresaById.get(empresaRepresentadaId);
    if (!e) return null;
    return {
      nome: e.nome,
      cnpj: e.cnpj,
      email: e.email,
      telefone: e.telefone,
      endereco: e.endereco,
      cidade: e.cidade,
      estado: e.estado,
      cep: e.cep,
      logoUrl: logoOf(empresaRepresentadaId),
    };
  };

  const clientePdfOf = (v: Venda) => {
    if (!v.cliente_id) return { nome: v.cliente?.nome };
    const c = clienteById.get(v.cliente_id);
    if (!c) return { nome: v.cliente?.nome };
    return {
      nome: c.nome,
      cnpj: c.tipo === 'J' ? c.cpfCnpj : null,
      cpf: c.tipo === 'F' ? c.cpfCnpj : null,
      email: c.emails?.[0] ?? null,
      telefone: c.telefones?.[0] ?? null,
      cidade: c.endereco?.cidade ?? null,
      estado: c.endereco?.uf ?? null,
    };
  };

  const abrirNovo = () => { setEditing(null); setModalOpen(true); };
  const abrirEdit = (v: Venda) => { setEditing(v); setModalOpen(true); };

  return (
    <TooltipProvider>
      <div className="container mx-auto px-6 py-8 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-primary mb-1">Vendas</h1>
            <p className="text-muted-foreground">Gerencie os pedidos de venda</p>
          </div>
          <Button onClick={abrirNovo}><Plus className="h-4 w-4 mr-2" />Nova Venda</Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ShoppingCart className="h-5 w-5" /> Filtros</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>Status</Label>
              <Select
                value={filtros.status || '__ALL__'}
                onValueChange={(v) => setFiltros((p) => ({ ...p, status: v === '__ALL__' ? '' : (v as VendaStatus) }))}
              >
                <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__ALL__">Todos</SelectItem>
                  {STATUS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Data Início</Label>
              <Input type="date" value={filtros.data_inicio || ''} onChange={(e) => setFiltros((p) => ({ ...p, data_inicio: e.target.value }))} />
            </div>
            <div>
              <Label>Data Fim</Label>
              <Input type="date" value={filtros.data_fim || ''} onChange={(e) => setFiltros((p) => ({ ...p, data_fim: e.target.value }))} />
            </div>
            <div>
              <Label>Buscar Nº</Label>
              <Input value={filtros.busca || ''} onChange={(e) => setFiltros((p) => ({ ...p, busca: e.target.value }))} placeholder="Nº da venda" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Carregando...</div>
            ) : vendas.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">Nenhuma venda encontrada</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nº</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>NF-e</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vendas.map((v) => {
                    const fiscal = fiscalMap[v.id];
                    const check = podeEmitir(v, fiscal?.status);
                    return (
                      <TableRow key={v.id}>
                        <TableCell>{v.numero_venda || '-'}</TableCell>
                        <TableCell>{v.data_venda}</TableCell>
                        <TableCell>{v.cliente?.nome || '-'}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={VENDA_STATUS_BADGE_CLASS[v.status]}>
                            {VENDA_STATUS_LABEL[v.status] ?? v.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <FiscalStatusBadge
                            status={fiscal?.status}
                            onClick={fiscal ? () => setDetalheDocId(fiscal.documento_id) : undefined}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          {(v.valor_total || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  disabled={!check.ok}
                                  onClick={() => check.ok && setEmitirVenda(v)}
                                  title="Emitir NF-e"
                                >
                                  <FileText className="h-4 w-4" />
                                </Button>
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>{check.ok ? 'Emitir NF-e' : check.motivo}</TooltipContent>
                          </Tooltip>
                          <Button size="icon" variant="ghost" onClick={() => abrirEdit(v)}><Pencil className="h-4 w-4" /></Button>
                          <GerarTitulosButton venda={v} />
                          <VendaAcoesMenu
                            venda={v}
                            empresa={empresaPdfOf(v.empresa_representada_id)}
                            cliente={clientePdfOf(v)}
                            clienteTelefone={v.cliente_id ? clienteById.get(v.cliente_id)?.telefones?.[0] : undefined}
                            clienteEmail={v.cliente_id ? clienteById.get(v.cliente_id)?.emails?.[0] : undefined}
                            onView={() => setViewVenda(v)}
                          />
                          {v.status !== 'CANCELADO' && (
                            <Button size="icon" variant="ghost" onClick={() => setToCancel(v)} title="Cancelar">
                              <Ban className="h-4 w-4" />
                            </Button>
                          )}
                          <Button size="icon" variant="ghost" onClick={() => setToDelete(v)} title="Excluir">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <VendaFormModal open={modalOpen} onOpenChange={setModalOpen} venda={editing} />

        <ConfirmDeleteWithDeps
          open={!!toDelete}
          onOpenChange={(o) => !o && setToDelete(null)}
          entidade="vendas"
          id={toDelete?.id ?? null}
          nomeRegistro={toDelete?.numero_venda ? `venda ${toDelete.numero_venda}` : undefined}
          onConfirm={async () => { if (toDelete?.id) await excluirVenda(toDelete.id); setToDelete(null); }}
        />

        <ConfirmDialog
          open={!!toCancel}
          onOpenChange={(o) => !o && setToCancel(null)}
          title="Cancelar venda?"
          description="A venda será marcada como CANCELADA."
          onConfirm={async () => { if (toCancel?.id) await cancelarVenda(toCancel.id); setToCancel(null); }}
        />

        <EmitirNFeDialog
          open={!!emitirVenda}
          onOpenChange={(o) => { if (!o) setEmitirVenda(null); }}
          venda={emitirVenda ? {
            id: emitirVenda.id,
            numero_venda: emitirVenda.numero_venda,
            cliente_nome: emitirVenda.cliente?.nome,
            valor_total: emitirVenda.valor_total,
            data_venda: emitirVenda.data_venda,
          } : null}
          onEmitida={(docId) => setDetalheDocId(docId)}
        />

        <DetalheNFeDrawer
          open={!!detalheDocId}
          onOpenChange={(o) => { if (!o) setDetalheDocId(null); }}
          documentoId={detalheDocId}
        />

        <VendaViewDialog
          venda={viewVenda}
          empresa={viewVenda ? empresaPdfOf(viewVenda.empresa_representada_id) : null}
          cliente={viewVenda ? clientePdfOf(viewVenda) : null}
          open={!!viewVenda}
          onOpenChange={(v) => !v && setViewVenda(null)}
        />
      </div>
    </TooltipProvider>
  );
};

export default Vendas;

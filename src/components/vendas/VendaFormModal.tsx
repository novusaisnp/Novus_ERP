import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Venda, ItemVenda, VendaStatus } from '@/types/vendas';
import { vendasService } from '@/services/vendasService';
import { clienteService } from '@/services/clienteService';
import { planosPagamentoService } from '@/services/configBasicasService';
import { pagamentoCatalogoService } from '@/services/pagamentoCatalogoService';
import { porta3Service } from '@/services/porta3Service';
import { usuarioService } from '@/services/usuarioService';
import { useLocalizacoes } from '@/hooks/useLocalizacoes';
import { QuickAddLocalizacao } from '@/components/shared/QuickAddLookups';
import { useVendas } from '@/hooks/useVendas';
import { useEmpresaAtual } from '@/hooks/estoque/useEmpresaAtual';
import { useAuth } from '@/contexts/AuthContext';
import { useCatalogoProdutos } from '@/hooks/useCatalogoOrcamento';
import { CatalogoItemPicker } from './CatalogoItemPicker';
import { AutorizacaoExcecaoVendaDialog } from './AutorizacaoExcecaoVendaDialog';
import { VendaPagamentoSection } from './VendaPagamentoSection';
import type { Bloqueio } from '@/types/porta3';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  venda?: Venda | null;
}

const STATUS: VendaStatus[] = ['RASCUNHO', 'CONFIRMADO', 'EM_PRODUCAO', 'FATURADO', 'ENTREGUE', 'CANCELADO'];

const emptyItem = (): ItemVenda => ({
  tipo_item: 'P',
  descricao: '',
  quantidade: 1,
  preco_unitario: 0,
  desconto_item: 0,
  acrescimo_item: 0,
});

export const VendaFormModal: React.FC<Props> = ({ open, onOpenChange, venda }) => {
  const { saveVenda, saving } = useVendas();
  const { data: empresaId } = useEmpresaAtual();
  const { user: authUser } = useAuth();
  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes', empresaId],
    queryFn: () => clienteService.fetchClientes(empresaId!),
    enabled: !!empresaId,
  });
  const { data: usuarios = [] } = useQuery({
    queryKey: ['usuarios-ativos-vendedor', empresaId],
    queryFn: () => usuarioService.fetchUsuariosAtivos(),
    enabled: !!empresaId,
  });
  const { data: planos = [] } = useQuery({ queryKey: ['planos-pagamento'], queryFn: planosPagamentoService.getAll });
  const { data: naturezas = [] } = useQuery({
    queryKey: ['naturezas-pagamento'],
    queryFn: () => pagamentoCatalogoService.listarNaturezas(),
  });
  const { data: localizacoes = [] } = useLocalizacoes();
  const produtosCatalogo = useCatalogoProdutos(empresaId ?? undefined);
  const estoquePorProduto = useMemo(() => {
    const m = new Map<string, { estoque: number; controla: boolean; nome: string }>();
    (produtosCatalogo.data ?? []).forEach((p) =>
      m.set(p.id, { estoque: p.estoque, controla: p.controlaEstoque, nome: p.nome }),
    );
    return m;
  }, [produtosCatalogo.data]);

  const [bloqueioDialog, setBloqueioDialog] = useState<{ open: boolean; bloqueios: Bloqueio[] }>({
    open: false,
    bloqueios: [],
  });
  const [autorizando, setAutorizando] = useState(false);

  const [form, setForm] = useState<Venda>({
    data_venda: new Date().toISOString().slice(0, 10),
    status: 'RASCUNHO',
    desconto: 0,
    acrescimo: 0,
    valor_frete: 0,
    itens: [emptyItem()],
  });

  useEffect(() => {
    if (!open) return;
    if (venda) setForm({ ...venda, itens: venda.itens?.length ? venda.itens : [emptyItem()] });
    else
      setForm({
        data_venda: new Date().toISOString().slice(0, 10),
        status: 'RASCUNHO',
        desconto: 0,
        acrescimo: 0,
        valor_frete: 0,
        itens: [emptyItem()],
      });
  }, [open, venda]);

  // Vendedor/operador: em venda nova, auto-preenche com o usuário logado
  // (editável via Select) — nunca sobrescreve uma escolha já feita.
  useEffect(() => {
    if (!open || venda?.id || !authUser?.id || usuarios.length === 0) return;
    setForm((p) => {
      if (p.vendedor_id) return p;
      const meu = usuarios.find((u) => u.user_id === authUser.id);
      return meu ? { ...p, vendedor_id: meu.id } : p;
    });
  }, [open, venda, authUser?.id, usuarios]);

  // Localização de estoque: em venda nova, auto-preenche com a primeira
  // cadastrada (editável via Select) — nunca sobrescreve uma escolha já
  // feita. Antes disso a baixa de estoque sempre usava a primeira
  // localização sem o usuário poder ver ou trocar (AUDITORIA_NOVA Fase 3).
  useEffect(() => {
    if (!open || venda?.id || localizacoes.length === 0) return;
    setForm((p) => (p.localizacao_estoque_id ? p : { ...p, localizacao_estoque_id: localizacoes[0].id }));
  }, [open, venda, localizacoes]);

  const totais = useMemo(() => vendasService.calcTotais(form), [form]);

  const naturezaCrediarioId = naturezas.find((n) => n.codigo === 'CREDIARIO_PROPRIO')?.id;
  const planoSelecionado = planos.find((p) => p.id === form.plano_pagamento_id);
  // Porta 3 (docs/CONTRATOS_CANONICOS_ERP.md §6): só faz sentido checar crédito/
  // inadimplência quando a venda é a prazo (natureza CREDIARIO_PROPRIO do plano
  // de pagamento selecionado) — venda à vista não tem o que checar.
  const isCrediario = !!planoSelecionado?.natureza_id && planoSelecionado.natureza_id === naturezaCrediarioId;

  const setField = <K extends keyof Venda>(k: K, v: Venda[K]) => setForm((p) => ({ ...p, [k]: v }));

  const updateItem = (idx: number, patch: Partial<ItemVenda>) =>
    setForm((p) => ({
      ...p,
      itens: (p.itens || []).map((it, i) => (i === idx ? { ...it, ...patch } : it)),
    }));

  const addItem = () => setForm((p) => ({ ...p, itens: [...(p.itens || []), emptyItem()] }));
  const removeItem = (idx: number) =>
    setForm((p) => ({ ...p, itens: (p.itens || []).filter((_, i) => i !== idx) }));

  const doSave = async () => {
    const itens = (form.itens || []).filter((i) => (i.descricao || '').trim().length > 0);
    await saveVenda({ ...form, itens });
    onOpenChange(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Validação client-side (SM1-A)
    if (!form.cliente_id) {
      toast.error('Selecione o cliente antes de salvar.');
      return;
    }
    const itens = (form.itens || []).filter((i) => (i.descricao || '').trim().length > 0);
    if (itens.length === 0) {
      toast.error('Adicione ao menos um item com descrição.');
      return;
    }
    for (const it of itens) {
      if (it.tipo_item !== 'S' && it.produto_id) {
        const info = estoquePorProduto.get(it.produto_id);
        if (info?.controla && Number(it.quantidade) > info.estoque) {
          toast.error(
            `Estoque insuficiente para "${info.nome}". Disponível: ${info.estoque}, solicitado: ${it.quantidade}.`,
          );
          return;
        }
      }
    }
    try {
      // Porta 3 (§6): venda a prazo passa pela pré-checagem de crédito/
      // inadimplência antes de persistir. Bloqueado -> abre o modal de
      // exceção em vez de salvar direto.
      if (isCrediario && empresaId) {
        const preflight = await porta3Service.verificarAutorizacaoVenda(
          form.cliente_id,
          empresaId,
          totais.valor_total || 0
        );
        if (!preflight.autorizado) {
          setBloqueioDialog({ open: true, bloqueios: preflight.bloqueios });
          return;
        }
      }
      await doSave();
    } catch (err) {
      // Não fechar o modal em erro. Preservar estado do usuário.
      const msg = err instanceof Error ? err.message : 'Falha ao salvar venda';
      toast.error(msg);
    }
  };

  const handleAutorizarExcecao = async (justificativa: string) => {
    if (!form.cliente_id || !empresaId) return;
    setAutorizando(true);
    try {
      for (const b of bloqueioDialog.bloqueios) {
        await porta3Service.autorizarExcecaoVenda({
          clienteId: form.cliente_id,
          empresaId,
          bloqueioCodigo: b.codigo,
          valorPretendido: totais.valor_total || 0,
          justificativa,
        });
      }
      setBloqueioDialog({ open: false, bloqueios: [] });
      await doSave();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha ao autorizar exceção';
      toast.error(msg);
    } finally {
      setAutorizando(false);
    }
  };


  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{venda?.id ? 'Editar Venda' : 'Nova Venda'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>Cliente</Label>
              <Select
                value={form.cliente_id || ''}
                onValueChange={(v) => setField('cliente_id', v)}
              >
                <SelectTrigger data-testid="venda-cliente-select"><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
                <SelectContent>
                  {clientes
                    .filter((c) => c.id && (c.ativo ?? true))
                    .map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Data da Venda *</Label>
              <Input
                type="date"
                value={form.data_venda}
                onChange={(e) => setField('data_venda', e.target.value)}
                required
              />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setField('status', v as VendaStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Data Entrega Prevista</Label>
              <Input
                type="date"
                value={form.data_entrega_prevista || ''}
                onChange={(e) => setField('data_entrega_prevista', e.target.value)}
              />
            </div>
            <div>
              <Label>Vendedor</Label>
              <Select
                value={form.vendedor_id || ''}
                onValueChange={(v) => setField('vendedor_id', v)}
              >
                <SelectTrigger><SelectValue placeholder="Selecione o vendedor" /></SelectTrigger>
                <SelectContent>
                  {usuarios.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Localização de Estoque</Label>
              <div className="flex gap-2">
                <Select
                  value={form.localizacao_estoque_id || ''}
                  onValueChange={(v) => setField('localizacao_estoque_id', v)}
                >
                  <SelectTrigger><SelectValue placeholder="De onde sai o estoque" /></SelectTrigger>
                  <SelectContent>
                    {localizacoes.map((l) => (
                      <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <QuickAddLocalizacao
                  empresaId={empresaId ?? undefined}
                  onCreated={({ id }) => setField('localizacao_estoque_id', id)}
                />
              </div>
            </div>
            <div className="md:col-span-2">
              <Label>Plano de Pagamento</Label>
              <Select
                value={form.plano_pagamento_id || ''}
                onValueChange={(v) => setField('plano_pagamento_id', v)}
              >
                <SelectTrigger><SelectValue placeholder="Selecione um plano" /></SelectTrigger>
                <SelectContent>
                  {planos.filter((p) => p.id).map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isCrediario && (
                <p className="text-xs text-muted-foreground mt-1">
                  Venda a prazo (crediário) — sujeita a checagem de crédito/inadimplência do cliente ao salvar.
                </p>
              )}
            </div>
          </div>

          <div className="border rounded-md p-3 space-y-2">
            <div className="flex justify-between items-center">
              <h4 className="font-medium">Itens da Venda</h4>
              <Button type="button" size="sm" variant="outline" onClick={addItem} data-testid="venda-adicionar-item-btn">
                <Plus className="h-4 w-4 mr-1" /> Adicionar Item
              </Button>
            </div>
            <div className="space-y-2">
              {(form.itens || []).map((it, idx) => {
                const bruto = (Number(it.quantidade) || 0) * (Number(it.preco_unitario) || 0);
                const total = bruto - (Number(it.desconto_item) || 0) + (Number(it.acrescimo_item) || 0);
                return (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-end border-b pb-2">
                    <div className="col-span-3 md:col-span-1">
                      <Label className="text-xs">Tipo</Label>
                      <Select
                        value={it.tipo_item ?? 'P'}
                        onValueChange={(v) =>
                          updateItem(idx, {
                            tipo_item: v as 'P' | 'S',
                            produto_id: null,
                            servico_id: null,
                            descricao: '',
                            preco_unitario: 0,
                          })
                        }
                      >
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="P">Produto</SelectItem>
                          <SelectItem value="S">Serviço</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-9 md:col-span-3">
                      <Label className="text-xs">Descrição *</Label>
                      <CatalogoItemPicker
                        tipoItem={it.tipo_item === 'S' ? 'S' : 'P'}
                        empresaId={empresaId ?? ''}
                        value={it.descricao}
                        selectedId={it.tipo_item === 'S' ? it.servico_id ?? undefined : it.produto_id ?? undefined}
                        onSelect={(sel) =>
                          updateItem(idx, {
                            descricao: sel.descricao,
                            preco_unitario: sel.preco,
                            produto_id: it.tipo_item === 'S' ? null : sel.id,
                            servico_id: it.tipo_item === 'S' ? sel.id : null,
                          })
                        }
                        onChangeText={(txt) =>
                          updateItem(idx, {
                            descricao: txt,
                            produto_id: null,
                            servico_id: null,
                          })
                        }
                      />
                    </div>
                    <div className="col-span-4 md:col-span-2">
                      <Label className="text-xs">Qtd</Label>
                      <Input
                        type="number"
                        step="0.001"
                        value={it.quantidade}
                        onChange={(e) => updateItem(idx, { quantidade: parseFloat(e.target.value) || 0 })}
                        data-testid={`venda-item-qtd-input-${idx}`}
                      />
                    </div>
                    <div className="col-span-4 md:col-span-2">
                      <Label className="text-xs">Preço Unit.</Label>
                      <CurrencyInput
                        value={it.preco_unitario}
                        onValueChange={(v) => updateItem(idx, { preco_unitario: v })}
                      />
                    </div>
                    <div className="col-span-4 md:col-span-2">
                      <Label className="text-xs">Desc.</Label>
                      <CurrencyInput
                        value={it.desconto_item || 0}
                        onValueChange={(v) => updateItem(idx, { desconto_item: v })}
                      />
                    </div>
                    <div className="col-span-10 md:col-span-1 text-sm">
                      <Label className="text-xs">Total</Label>
                      <div className="h-9 flex items-center font-medium">
                        {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </div>
                    </div>
                    <div className="col-span-2 md:col-span-1 flex justify-end">
                      <Button type="button" size="icon" variant="ghost" onClick={() => removeItem(idx)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
              {(form.itens || []).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum item adicionado</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label>Subtotal</Label>
              <Input value={(totais.subtotal || 0).toFixed(2)} readOnly disabled />
            </div>
            <div>
              <Label>Desconto</Label>
              <CurrencyInput
                value={form.desconto || 0}
                onValueChange={(v) => setField('desconto', v)}
              />
            </div>
            <div>
              <Label>Acréscimo</Label>
              <CurrencyInput
                value={form.acrescimo || 0}
                onValueChange={(v) => setField('acrescimo', v)}
              />
            </div>
            <div>
              <Label>Frete</Label>
              <CurrencyInput
                value={form.valor_frete || 0}
                onValueChange={(v) => setField('valor_frete', v)}
              />
            </div>
            <div className="col-span-2 md:col-span-4">
              <Label>Valor Total</Label>
              <Input
                value={(totais.valor_total || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                readOnly disabled className="font-bold text-lg"
              />
            </div>
          </div>

          <div>
            <Label>Observações</Label>
            <Textarea
              value={form.observacoes || ''}
              onChange={(e) => setField('observacoes', e.target.value)}
            />
          </div>

          {/* Só depois de a venda existir: FIN-E5 (botão "Gerar títulos" na lista)
              lê venda_pagamento/venda_pagamento_parcelas pra criar as contas a
              receber — sem isso preenchido, "Gerar títulos" sempre reporta
              "nenhuma parcela elegível" e não gera nada (AUDITORIA_NOVA Fase 3). */}
          {venda?.id && empresaId && (
            <VendaPagamentoSection
              vendaId={venda.id}
              empresaId={empresaId}
              clienteId={form.cliente_id}
              valorTotalVenda={totais.valor_total || 0}
              dataVenda={form.data_venda}
            />
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving} data-testid="venda-salvar-btn">{saving ? 'Salvando...' : 'Salvar'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    <AutorizacaoExcecaoVendaDialog
      open={bloqueioDialog.open}
      onOpenChange={(o) => setBloqueioDialog((p) => ({ ...p, open: o }))}
      bloqueios={bloqueioDialog.bloqueios}
      onAutorizar={handleAutorizarExcecao}
      autorizando={autorizando}
    />
    </>
  );
};

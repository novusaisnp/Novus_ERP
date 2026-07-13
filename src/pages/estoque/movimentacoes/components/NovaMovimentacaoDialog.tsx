// P12: Dialog para criar nova movimentação de estoque
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useCriarMovimentacao } from '@/hooks/estoque/useEstoque';
import { useToast } from '@/hooks/use-toast';
import type { EstoqueMovimentacaoTipo } from '@/types/estoque';

interface Props {
  empresaId: string;
  open: boolean;
  onClose: () => void;
}

type Aba = 'ENTRADA' | 'SAIDA' | 'TRANSFERENCIA';

export const NovaMovimentacaoDialog: React.FC<Props> = ({ empresaId, open, onClose }) => {
  const [aba, setAba] = useState<Aba>('ENTRADA');
  const [produtoId, setProdutoId] = useState<string>('');
  const [origemId, setOrigemId] = useState<string>('');
  const [destinoId, setDestinoId] = useState<string>('');
  const [quantidade, setQuantidade] = useState<string>('');
  const [custo, setCusto] = useState<string>('');
  const [documento, setDocumento] = useState<string>('');
  const [observacoes, setObservacoes] = useState<string>('');
  const { toast } = useToast();
  const criar = useCriarMovimentacao();

  const { data: produtos = [] } = useQuery({
    queryKey: ['produtos-select', empresaId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('produtos')
        .select('id, nome, codigo')
        .eq('empresa_representada_id', empresaId)
        .is('deleted_at', null)
        .eq('ativo', true)
        .order('nome');
      return (data ?? []) as { id: string; nome: string; codigo: string | null }[];
    },
  });

  const { data: locs = [] } = useQuery({
    queryKey: ['locs-select', empresaId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('localizacoes_estoque')
        .select('id, nome')
        .eq('empresa_representada_id', empresaId)
        .eq('ativo', true)
        .order('nome');
      return (data ?? []) as { id: string; nome: string }[];
    },
  });

  const reset = () => {
    setProdutoId(''); setOrigemId(''); setDestinoId('');
    setQuantidade(''); setCusto(''); setDocumento(''); setObservacoes('');
  };

  const handleSubmit = async () => {
    const qtd = Number(quantidade);
    if (!produtoId || !qtd || qtd <= 0) {
      toast({ title: 'Dados inválidos', description: 'Selecione um produto e informe uma quantidade > 0.', variant: 'destructive' });
      return;
    }
    if (aba === 'ENTRADA' && !destinoId) {
      toast({ title: 'Localização de destino obrigatória', variant: 'destructive' }); return;
    }
    if (aba === 'SAIDA' && !origemId) {
      toast({ title: 'Localização de origem obrigatória', variant: 'destructive' }); return;
    }
    if (aba === 'TRANSFERENCIA' && (!origemId || !destinoId)) {
      toast({ title: 'Origem e destino são obrigatórios', variant: 'destructive' }); return;
    }
    if (aba === 'TRANSFERENCIA' && origemId === destinoId) {
      toast({ title: 'Origem e destino devem ser diferentes', variant: 'destructive' }); return;
    }

    const tipo: EstoqueMovimentacaoTipo = aba;
    try {
      await criar.mutateAsync({
        empresa_representada_id: empresaId,
        produto_id: produtoId,
        tipo,
        quantidade: qtd,
        custo_unitario: Number(custo) || 0,
        localizacao_origem_id: aba === 'ENTRADA' ? null : origemId,
        localizacao_destino_id: aba === 'SAIDA' ? null : destinoId,
        documento_ref: documento || null,
        observacoes: observacoes || null,
      });
      toast({ title: 'Movimentação registrada com sucesso' });
      reset();
      onClose();
    } catch (e: any) {
      toast({
        title: 'Erro ao registrar movimentação',
        description: e?.message ?? 'Falha desconhecida',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nova Movimentação</DialogTitle>
        </DialogHeader>

        <Tabs value={aba} onValueChange={(v) => setAba(v as Aba)}>
          <TabsList className="grid grid-cols-3 w-full" data-testid="estoque-mov-tipo-tabs">
            <TabsTrigger value="ENTRADA" data-testid="estoque-mov-tipo-ENTRADA">Entrada</TabsTrigger>
            <TabsTrigger value="SAIDA" data-testid="estoque-mov-tipo-SAIDA">Saída</TabsTrigger>
            <TabsTrigger value="TRANSFERENCIA" data-testid="estoque-mov-tipo-TRANSFERENCIA">Transferência</TabsTrigger>
          </TabsList>

          {(['ENTRADA', 'SAIDA', 'TRANSFERENCIA'] as Aba[]).map((t) => (
            <TabsContent key={t} value={t} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Produto *</Label>
                <Select value={produtoId} onValueChange={setProdutoId}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {produtos.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.codigo ? `[${p.codigo}] ` : ''}{p.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Quantidade *</Label>
                  <Input type="number" step="0.001" min="0" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Custo unitário</Label>
                  <Input type="number" step="0.01" min="0" value={custo} onChange={(e) => setCusto(e.target.value)} />
                </div>
              </div>

              {(t === 'SAIDA' || t === 'TRANSFERENCIA') && (
                <div className="space-y-2">
                  <Label>Localização de Origem *</Label>
                  <Select value={origemId} onValueChange={setOrigemId}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {locs.map((l) => <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {(t === 'ENTRADA' || t === 'TRANSFERENCIA') && (
                <div className="space-y-2">
                  <Label>Localização de Destino *</Label>
                  <Select value={destinoId} onValueChange={setDestinoId}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {locs.map((l) => <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>Documento de referência</Label>
                <Input value={documento} onChange={(e) => setDocumento(e.target.value)} placeholder="NF, pedido, etc." />
              </div>

              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows={2} />
              </div>
            </TabsContent>
          ))}
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={criar.isPending}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={criar.isPending}>
            {criar.isPending ? 'Registrando...' : 'Registrar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

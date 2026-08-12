// P12: Dialog para criar novo inventário
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { estoqueService } from '@/services/estoque/estoqueService';
import { useCriarInventario } from '@/hooks/estoque/useEstoque';
import { useToast } from '@/hooks/use-toast';
import { QuickAddLocalizacao } from '@/components/shared/QuickAddLookups';

interface Props {
  empresaId: string;
  open: boolean;
  onClose: () => void;
}

export const NovoInventarioDialog: React.FC<Props> = ({ empresaId, open, onClose }) => {
  const [codigo, setCodigo] = useState(`INV-${new Date().toISOString().slice(0, 10)}-${Math.floor(Math.random() * 1000)}`);
  const [localizacaoId, setLocalizacaoId] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const { toast } = useToast();
  const criar = useCriarInventario();

  const { data: locs = [] } = useQuery({
    queryKey: ['locs-select', empresaId],
    queryFn: () => estoqueService.listLocalizacoes(empresaId, { apenasAtivas: true }),
  });

  const handleSubmit = async () => {
    if (!codigo.trim() || !localizacaoId) {
      toast({ title: 'Preencha código e localização', variant: 'destructive' });
      return;
    }
    try {
      await criar.mutateAsync({
        empresa_representada_id: empresaId,
        codigo: codigo.trim(),
        localizacao_id: localizacaoId,
        observacoes: observacoes || null,
      });
      toast({ title: 'Inventário iniciado', description: 'Itens carregados a partir dos saldos atuais' });
      onClose();
    } catch (e: any) {
      toast({ title: 'Erro ao criar inventário', description: e?.message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Novo Inventário</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Código *</Label>
            <Input value={codigo} onChange={(e) => setCodigo(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Localização *</Label>
            <div className="flex gap-2">
            <Select value={localizacaoId} onValueChange={setLocalizacaoId}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {locs.map((l) => <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>)}
              </SelectContent>
            </Select>
              <QuickAddLocalizacao empresaId={empresaId} onCreated={({ id }) => setLocalizacaoId(id)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={criar.isPending}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={criar.isPending}>
            {criar.isPending ? 'Criando...' : 'Iniciar Inventário'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

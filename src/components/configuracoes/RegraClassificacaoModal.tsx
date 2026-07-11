import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import type { AlvoTipoRegra, RegraClassificacaoInput, RegraClassificacaoReceita } from '@/types/classificacaoReceita';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  regra?: RegraClassificacaoReceita | null;
  onSubmit: (input: RegraClassificacaoInput) => Promise<unknown>;
}

const ALVOS: AlvoTipoRegra[] = ['PRODUTO', 'SERVICO', 'CONTRATO', 'CATEGORIA', 'TIPO', 'EMPRESA'];

export const RegraClassificacaoModal: React.FC<Props> = ({ open, onOpenChange, regra, onSubmit }) => {
  const [form, setForm] = useState<RegraClassificacaoInput>({
    empresa_representada_id: '',
    alvo_tipo: 'PRODUTO',
    prioridade: 100,
    versao: 1,
    ativo: true,
  });

  useEffect(() => {
    if (regra) {
      setForm({
        empresa_representada_id: regra.empresa_representada_id,
        alvo_tipo: regra.alvo_tipo,
        alvo_id: regra.alvo_id,
        tipo_item: regra.tipo_item,
        categoria_id: regra.categoria_id,
        plano_conta_id: regra.plano_conta_id,
        centro_custo_id: regra.centro_custo_id,
        natureza_receita_id: regra.natureza_receita_id,
        prioridade: regra.prioridade,
        versao: regra.versao,
        vigencia_ini: regra.vigencia_ini,
        vigencia_fim: regra.vigencia_fim,
        ativo: regra.ativo,
      });
    } else {
      setForm({ empresa_representada_id: '', alvo_tipo: 'PRODUTO', prioridade: 100, versao: 1, ativo: true });
    }
  }, [regra, open]);

  const handleSubmit = async () => {
    await onSubmit(form);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{regra ? 'Editar Regra' : 'Nova Regra'} de Classificação</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-4">
          <div>
            <Label>Alvo</Label>
            <Select value={form.alvo_tipo} onValueChange={(v) => setForm((p) => ({ ...p, alvo_tipo: v as AlvoTipoRegra }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ALVOS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Tipo Item (para alvo TIPO)</Label>
            <Select
              value={form.tipo_item || '__none__'}
              onValueChange={(v) => setForm((p) => ({ ...p, tipo_item: v === '__none__' ? null : (v as 'P' | 'S' | 'C') }))}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">—</SelectItem>
                <SelectItem value="P">Produto</SelectItem>
                <SelectItem value="S">Serviço</SelectItem>
                <SelectItem value="C">Contrato</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Alvo ID (UUID quando aplicável)</Label>
            <Input value={form.alvo_id || ''} onChange={(e) => setForm((p) => ({ ...p, alvo_id: e.target.value || null }))} />
          </div>
          <div>
            <Label>Categoria ID</Label>
            <Input value={form.categoria_id || ''} onChange={(e) => setForm((p) => ({ ...p, categoria_id: e.target.value || null }))} />
          </div>

          <div>
            <Label>Plano de Conta ID</Label>
            <Input value={form.plano_conta_id || ''} onChange={(e) => setForm((p) => ({ ...p, plano_conta_id: e.target.value || null }))} />
          </div>
          <div>
            <Label>Centro de Custo ID</Label>
            <Input value={form.centro_custo_id || ''} onChange={(e) => setForm((p) => ({ ...p, centro_custo_id: e.target.value || null }))} />
          </div>

          <div>
            <Label>Natureza Receita ID</Label>
            <Input value={form.natureza_receita_id || ''} onChange={(e) => setForm((p) => ({ ...p, natureza_receita_id: e.target.value || null }))} />
          </div>
          <div>
            <Label>Prioridade</Label>
            <Input type="number" value={form.prioridade ?? 100} onChange={(e) => setForm((p) => ({ ...p, prioridade: Number(e.target.value) }))} />
          </div>

          <div>
            <Label>Vigência Início</Label>
            <Input type="date" value={form.vigencia_ini || ''} onChange={(e) => setForm((p) => ({ ...p, vigencia_ini: e.target.value || null }))} />
          </div>
          <div>
            <Label>Vigência Fim</Label>
            <Input type="date" value={form.vigencia_fim || ''} onChange={(e) => setForm((p) => ({ ...p, vigencia_fim: e.target.value || null }))} />
          </div>

          <div className="flex items-center gap-2">
            <Switch checked={form.ativo ?? true} onCheckedChange={(v) => setForm((p) => ({ ...p, ativo: v }))} />
            <Label>Ativo</Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

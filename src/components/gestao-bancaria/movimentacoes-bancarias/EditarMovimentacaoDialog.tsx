import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { MovimentacaoBancaria } from '@/types/movimentacoesBancarias';
import { useMovimentacoesBancarias } from '@/hooks/useMovimentacoesBancarias';

interface EditarMovimentacaoDialogProps {
  movimentacao: MovimentacaoBancaria | null;
  onClose: () => void;
}

// Só campos que não afetam saldo/conciliação/rastreio contábil (valor, conta,
// tipo e data ficam de fora de propósito — mudar isso exige estornar e
// recriar, não editar). AUDITORIA_NOVA Fase 3: o backend (atualizarMovimentacaoBancaria)
// já existia pronto, só faltava esta tela.
export function EditarMovimentacaoDialog({ movimentacao, onClose }: EditarMovimentacaoDialogProps) {
  const { atualizar, isUpdating } = useMovimentacoesBancarias();
  const [descricao, setDescricao] = useState('');
  const [documentoReferencia, setDocumentoReferencia] = useState('');
  const [observacoes, setObservacoes] = useState('');

  useEffect(() => {
    if (movimentacao) {
      setDescricao(movimentacao.descricao ?? '');
      setDocumentoReferencia(movimentacao.documento_referencia ?? '');
      setObservacoes(movimentacao.observacoes ?? '');
    }
  }, [movimentacao]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!movimentacao) return;
    atualizar(
      {
        id: movimentacao.id,
        input: {
          descricao,
          documento_referencia: documentoReferencia || undefined,
          observacoes: observacoes || undefined,
        },
      },
      { onSuccess: () => onClose() },
    );
  };

  return (
    <Dialog open={!!movimentacao} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar movimentação</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-mov-descricao">Descrição</Label>
            <Input
              id="edit-mov-descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-mov-documento">Documento de referência</Label>
            <Input
              id="edit-mov-documento"
              value={documentoReferencia}
              onChange={(e) => setDocumentoReferencia(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-mov-observacoes">Observações</Label>
            <Textarea
              id="edit-mov-observacoes"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={3}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Valor, conta e data não são editáveis aqui — para corrigir algum desses, estorne e
            lance de novo, preservando o rastreio contábil.
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isUpdating}>
              {isUpdating ? 'Salvando…' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

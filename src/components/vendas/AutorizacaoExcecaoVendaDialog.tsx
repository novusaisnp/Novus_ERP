import { useState } from 'react';
import { Loader2, AlertTriangle, ShieldAlert } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import type { Bloqueio } from '@/types/porta3';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bloqueios: Bloqueio[];
  onAutorizar: (justificativa: string) => Promise<void>;
  autorizando?: boolean;
}

// Porta 3 (docs/CONTRATOS_CANONICOS_ERP.md §6): quando verificar_autorizacao_venda
// bloqueia, este modal mostra os bloqueios e — se todos forem superáveis — pede
// justificativa para autorizar_excecao_venda (auditado, permissão reconfirmada no servidor).
export const AutorizacaoExcecaoVendaDialog: React.FC<Props> = ({
  open,
  onOpenChange,
  bloqueios,
  onAutorizar,
  autorizando,
}) => {
  const [justificativa, setJustificativa] = useState('');
  const podeSuperar = bloqueios.length > 0 && bloqueios.every((b) => b.pode_ser_superado);
  const valid = justificativa.trim().length >= 15 && justificativa.trim().length <= 255;

  const handleConfirm = async () => {
    if (!valid) return;
    await onAutorizar(justificativa.trim());
    setJustificativa('');
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) setJustificativa('');
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Venda bloqueada por crédito/inadimplência</DialogTitle>
          <DialogDescription>
            {podeSuperar
              ? 'Esta venda a prazo precisa de autorização para prosseguir. A exceção fica registrada em auditoria.'
              : 'Esta venda não pode prosseguir — o bloqueio abaixo não admite exceção.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {bloqueios.map((b) => (
            <Alert key={b.codigo} variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="font-mono text-xs">{b.codigo}</Badge>
                  {!b.pode_ser_superado && (
                    <Badge variant="destructive" className="text-xs">Sem exceção possível</Badge>
                  )}
                </div>
                {b.motivo}
              </AlertDescription>
            </Alert>
          ))}
        </div>

        {podeSuperar && (
          <div className="space-y-2">
            <Label htmlFor="justificativa-excecao-venda">Justificativa (mínimo 15 caracteres)</Label>
            <Textarea
              id="justificativa-excecao-venda"
              rows={4}
              maxLength={255}
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              placeholder="Descreva o motivo da autorização desta exceção"
            />
            <p className="text-xs text-muted-foreground text-right">{justificativa.trim().length}/255</p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={autorizando}>
            {podeSuperar ? 'Cancelar venda' : 'Fechar'}
          </Button>
          {podeSuperar && (
            <Button variant="destructive" onClick={handleConfirm} disabled={!valid || autorizando}>
              {autorizando ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Autorizando…
                </>
              ) : (
                <>
                  <ShieldAlert className="h-4 w-4 mr-2" /> Autorizar e continuar
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AutorizacaoExcecaoVendaDialog;

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  webhookNome: string;
  onConfirm: () => Promise<{ secret_token: string } | void>;
}

export const RotateSecretDialog: React.FC<Props> = ({ open, onOpenChange, webhookNome, onConfirm }) => {
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const result = await onConfirm();
      if (result && 'secret_token' in result) setNewSecret(result.secret_token);
    } finally {
      setLoading(false);
    }
  };

  const copy = async () => {
    if (!newSecret) return;
    await navigator.clipboard.writeText(newSecret);
    setCopied(true);
    toast.success('Secret copiado');
    setTimeout(() => setCopied(false), 2000);
  };

  const close = () => {
    setNewSecret(null);
    setCopied(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? onOpenChange(v) : close())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rotacionar Secret — {webhookNome}</DialogTitle>
          <DialogDescription>
            Esta ação invalida imediatamente o secret anterior. Sistemas integrados que usam o valor antigo pararão de funcionar até serem atualizados.
          </DialogDescription>
        </DialogHeader>

        {!newSecret ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              O novo secret será exibido apenas uma vez. Copie e armazene em local seguro antes de fechar.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-2">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>Este é o novo secret. Ele não será exibido novamente.</AlertDescription>
            </Alert>
            <div className="flex items-center gap-2">
              <code className="flex-1 p-2 bg-muted rounded text-xs break-all">{newSecret}</code>
              <Button variant="outline" size="icon" onClick={copy}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        )}

        <DialogFooter>
          {!newSecret ? (
            <>
              <Button variant="outline" onClick={close} disabled={loading}>Cancelar</Button>
              <Button variant="destructive" onClick={handleConfirm} disabled={loading}>
                {loading ? 'Rotacionando...' : 'Confirmar rotação'}
              </Button>
            </>
          ) : (
            <Button onClick={close}>Concluído</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

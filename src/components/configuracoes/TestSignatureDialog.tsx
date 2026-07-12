import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { webhookConfigService } from '@/services/webhookConfigService';
import { toast } from 'sonner';
import { Copy } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  webhookNome: string;
  secret: string | null;
}

export const TestSignatureDialog: React.FC<Props> = ({ open, onOpenChange, webhookNome, secret }) => {
  const [payload, setPayload] = useState('');
  const [signature, setSignature] = useState('');
  const [headers, setHeaders] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open || !secret) return;
    const sample = {
      event: 'cliente.created',
      table: 'clientes',
      data: { id: 'sample-uuid', nome: 'Cliente Exemplo' },
      timestamp: new Date().toISOString(),
      source_system: webhookNome,
    };
    webhookConfigService.testSignatureLocal(secret, sample).then((r) => {
      setPayload(r.payload);
      setSignature(r.signature);
      setHeaders(r.headers);
    });
  }, [open, secret, webhookNome]);

  const copy = (v: string) => {
    navigator.clipboard.writeText(v);
    toast.success('Copiado');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Testar assinatura — {webhookNome}</DialogTitle>
          <DialogDescription>
            Assinatura HMAC-SHA256 calculada localmente com o secret atual. Nenhuma requisição externa é feita.
          </DialogDescription>
        </DialogHeader>

        {!secret ? (
          <p className="text-sm text-muted-foreground">Nenhum secret configurado.</p>
        ) : (
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">Payload</span>
                <Button size="sm" variant="ghost" onClick={() => copy(payload)}><Copy className="h-3 w-3" /></Button>
              </div>
              <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-40">{payload}</pre>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">Assinatura (sha256=)</span>
                <Button size="sm" variant="ghost" onClick={() => copy(signature)}><Copy className="h-3 w-3" /></Button>
              </div>
              <code className="text-xs bg-muted p-2 rounded block break-all">{signature}</code>
            </div>
            <div>
              <span className="text-sm font-medium">Headers</span>
              <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-40">
{Object.entries(headers).map(([k, v]) => `${k}: ${v}`).join('\n')}
              </pre>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

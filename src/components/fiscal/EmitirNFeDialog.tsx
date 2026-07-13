import { useState } from "react";
import { Loader2, FileText, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { useEmitirNFe } from "@/hooks/fiscal/useEmissaoNFe";
import { cn } from "@/lib/utils";

interface VendaResumo {
  id: string;
  numero_venda?: string | number | null;
  cliente_nome?: string | null;
  valor_total?: number | null;
  data_venda?: string | null;
  qtd_itens?: number;
}

interface EmitirNFeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  venda: VendaResumo | null;
  environment?: 'homologation' | 'production';
  onEmitida?: (documentoId: string) => void;
}

const currency = (v?: number | null) =>
  typeof v === 'number' ? v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—';

const EmitirNFeDialog = ({
  open,
  onOpenChange,
  venda,
  environment = 'homologation',
  onEmitida,
}: EmitirNFeDialogProps) => {
  const [confirmando, setConfirmando] = useState(false);
  const emitir = useEmitirNFe();

  const handleEmitir = async () => {
    if (!venda) return;
    setConfirmando(true);
    try {
      const result = await emitir.mutateAsync({ vendaId: venda.id, environment });
      onEmitida?.(result.documento_id);
      onOpenChange(false);
    } catch {
      // toast já é exibido pelo hook
    } finally {
      setConfirmando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Emitir NF-e
          </DialogTitle>
          <DialogDescription>
            Revise os dados da venda antes de transmitir à SEFAZ.
          </DialogDescription>
        </DialogHeader>

        {environment === 'homologation' && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Ambiente de <strong>homologação</strong> — as notas emitidas não têm valor fiscal.
            </AlertDescription>
          </Alert>
        )}

        {venda ? (
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Venda</span>
              <span className="font-medium">#{venda.numero_venda ?? venda.id.slice(0, 8)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Cliente</span>
              <span className="font-medium">{venda.cliente_nome ?? '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Itens</span>
              <span>{venda.qtd_itens ?? '—'}</span>
            </div>
            <Separator />
            <div className="flex justify-between text-base">
              <span className="text-muted-foreground">Valor total</span>
              <span className="font-semibold">{currency(venda.valor_total)}</span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhuma venda selecionada.</p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={confirmando}>
            Cancelar
          </Button>
          <Button
            onClick={handleEmitir}
            disabled={!venda || confirmando}
            className={cn(confirmando && "opacity-70")}
          >
            {confirmando ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Emitindo…
              </>
            ) : (
              'Confirmar emissão'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EmitirNFeDialog;

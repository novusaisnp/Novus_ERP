import { useEffect, useState } from "react";
import { Loader2, FileText, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useEmitirNFe } from "@/hooks/fiscal/useEmissaoNFe";
import type { FiscalFunctionError } from "@/services/fiscal/emissaoService";
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
  tipo?: 'NFE' | 'NFCE';
  onEmitida?: (documentoId: string) => void;
}

const currency = (v?: number | null) =>
  typeof v === 'number' ? v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—';

const EmitirNFeDialog = ({
  open,
  onOpenChange,
  venda,
  tipo = 'NFE',
  onEmitida,
}: EmitirNFeDialogProps) => {
  const label = tipo === 'NFCE' ? 'NFC-e' : 'NF-e';
  const [confirmando, setConfirmando] = useState(false);
  const [sefazIndisponivel, setSefazIndisponivel] = useState(false);
  const emitir = useEmitirNFe();

  useEffect(() => {
    if (open) setSefazIndisponivel(false);
  }, [open, venda?.id]);

  const handleEmitir = async (contingencia = false) => {
    if (!venda) return;
    setConfirmando(true);
    setSefazIndisponivel(false);
    try {
      const result = await emitir.mutateAsync({ vendaId: venda.id, tipo, contingencia });
      onEmitida?.(result.documento_id);
      onOpenChange(false);
    } catch (err) {
      if (tipo === 'NFCE' && !contingencia && (err as FiscalFunctionError)?.code === 'sefaz_indisponivel') {
        setSefazIndisponivel(true);
      }
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
            Emitir {label}
          </DialogTitle>
          <DialogDescription>
            Revise os dados da venda antes de transmitir à SEFAZ.
          </DialogDescription>
        </DialogHeader>

        <p className="text-xs text-muted-foreground">
          Ambiente e provedor seguem a configuração fiscal ativa da empresa.
        </p>

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

        {sefazIndisponivel && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>SEFAZ/provedor fiscal indisponível</AlertTitle>
            <AlertDescription>
              Não foi possível transmitir agora. Você pode emitir em contingência — a NFC-e
              sai com numeração própria e é sincronizada com a SEFAZ automaticamente assim
              que a comunicação normalizar.
            </AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={confirmando}>
            Cancelar
          </Button>
          {sefazIndisponivel && (
            <Button
              variant="secondary"
              onClick={() => handleEmitir(true)}
              disabled={!venda || confirmando}
            >
              Emitir em contingência
            </Button>
          )}
          <Button
            onClick={() => handleEmitir(false)}
            disabled={!venda || confirmando}
            className={cn(confirmando && "opacity-70")}
          >
            {confirmando ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Emitindo…
              </>
            ) : sefazIndisponivel ? (
              'Tentar novamente'
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

import { useState } from "react";
import { Loader2, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useCancelarNFe } from "@/hooks/fiscal/useEmissaoNFe";

interface CancelarNFeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentoId: string | null;
  numero?: number | null;
}

const CancelarNFeDialog = ({ open, onOpenChange, documentoId, numero }: CancelarNFeDialogProps) => {
  const [justificativa, setJustificativa] = useState("");
  const cancelar = useCancelarNFe();
  const valid = justificativa.trim().length >= 15 && justificativa.trim().length <= 255;

  const handleConfirm = async () => {
    if (!documentoId || !valid) return;
    try {
      await cancelar.mutateAsync({ documentoId, justificativa: justificativa.trim() });
      setJustificativa("");
      onOpenChange(false);
    } catch { /* toast já no hook */ }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) setJustificativa(""); onOpenChange(o); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Cancelar NF-e {numero ? `#${numero}` : ""}</DialogTitle>
          <DialogDescription>Esta ação é irreversível e será registrada em auditoria.</DialogDescription>
        </DialogHeader>

        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            O cancelamento é definitivo e comunicado à SEFAZ. Confirme os dados antes de prosseguir.
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label htmlFor="justificativa">Justificativa (mínimo 15 caracteres)</Label>
          <Textarea
            id="justificativa"
            rows={4}
            maxLength={255}
            value={justificativa}
            onChange={(e) => setJustificativa(e.target.value)}
            placeholder="Descreva o motivo do cancelamento"
          />
          <p className="text-xs text-muted-foreground text-right">
            {justificativa.trim().length}/255
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={cancelar.isPending}>
            Voltar
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={!valid || cancelar.isPending}>
            {cancelar.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Cancelando…</> : "Confirmar cancelamento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CancelarNFeDialog;

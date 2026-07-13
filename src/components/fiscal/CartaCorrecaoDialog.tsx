import { useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useCartaCorrecao } from "@/hooks/fiscal/useEmissaoNFe";

interface CartaCorrecaoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentoId: string | null;
  numero?: number | null;
  proximaSequencia?: number;
}

const CartaCorrecaoDialog = ({ open, onOpenChange, documentoId, numero, proximaSequencia }: CartaCorrecaoDialogProps) => {
  const [correcao, setCorrecao] = useState("");
  const cce = useCartaCorrecao();
  const len = correcao.trim().length;
  const valid = len >= 15 && len <= 1000;

  const handleConfirm = async () => {
    if (!documentoId || !valid) return;
    try {
      await cce.mutateAsync({ documentoId, correcao: correcao.trim() });
      setCorrecao("");
      onOpenChange(false);
    } catch { /* toast já no hook */ }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) setCorrecao(""); onOpenChange(o); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Carta de Correção {numero ? `NF-e #${numero}` : ""}</DialogTitle>
          <DialogDescription>
            Use para corrigir informações da nota, exceto valores, quantidades ou destinatário.
            {proximaSequencia && ` Sequência: ${proximaSequencia}.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="correcao">Correção (mínimo 15 caracteres, até 1000)</Label>
          <Textarea
            id="correcao"
            rows={6}
            maxLength={1000}
            value={correcao}
            onChange={(e) => setCorrecao(e.target.value)}
            placeholder="Descreva a correção conforme regras da SEFAZ"
          />
          <p className="text-xs text-muted-foreground text-right">{len}/1000</p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={cce.isPending}>
            Voltar
          </Button>
          <Button onClick={handleConfirm} disabled={!valid || cce.isPending}>
            {cce.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Enviando…</> : "Enviar CC-e"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CartaCorrecaoDialog;

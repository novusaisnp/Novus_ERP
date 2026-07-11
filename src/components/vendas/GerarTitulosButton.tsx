import { Button } from '@/components/ui/button';
import { FileText, Loader2 } from 'lucide-react';
import { useGerarContasReceber } from '@/hooks/useGerarContasReceber';
import type { Venda, VendaStatus } from '@/types/vendas';

interface Props {
  venda: Venda;
}

const STATUS_ELEGIVEIS: VendaStatus[] = ['CONFIRMADO', 'EM_PRODUCAO', 'FATURADO', 'ENTREGUE'];

export const GerarTitulosButton: React.FC<Props> = ({ venda }) => {
  const mutation = useGerarContasReceber();

  if (!venda.id) return null;
  const status = String(venda.status || '').toUpperCase() as VendaStatus;
  if (!STATUS_ELEGIVEIS.includes(status)) return null;

  return (
    <Button
      size="icon"
      variant="ghost"
      title="Gerar títulos a receber"
      disabled={mutation.isPending}
      onClick={() => mutation.mutate({ vendaId: venda.id! })}
    >
      {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
    </Button>
  );
};

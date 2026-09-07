import React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Ban, Download, Eye, Mail, MessageCircle, MoreVertical, Printer } from 'lucide-react';
import { toast } from 'sonner';
import type { RequisicaoCompra } from '@/types/requisicaoCompra';
import {
  downloadRequisicaoCompraPdf,
  printRequisicaoCompraPdf,
  requisicaoCompraWhatsAppText,
  type RequisicaoCompraPdfEmpresa,
} from '@/utils/requisicaoCompraPdf';

interface Props {
  requisicao: RequisicaoCompra;
  empresa?: RequisicaoCompraPdfEmpresa | null;
  solicitanteNome: string;
  centroCustoNome: string | null;
  nomeProduto: (produtoId: string) => string;
  podeCancelar: boolean;
  onView: () => void;
  onCancel: () => void;
}

export const RequisicaoAcoesMenu: React.FC<Props> = ({
  requisicao, empresa, solicitanteNome, centroCustoNome, nomeProduto, podeCancelar, onView, onCancel,
}) => {
  const handleDownload = () => downloadRequisicaoCompraPdf(requisicao, empresa, solicitanteNome, centroCustoNome, nomeProduto);
  const handlePrint = () => printRequisicaoCompraPdf(requisicao, empresa, solicitanteNome, centroCustoNome, nomeProduto);

  const handleEmail = () => {
    const assunto = encodeURIComponent(`Requisição de compra — ${solicitanteNome}`);
    const corpo = encodeURIComponent(requisicaoCompraWhatsAppText(requisicao, solicitanteNome, nomeProduto));
    window.location.href = `mailto:?subject=${assunto}&body=${corpo}`;
    toast.info('Lembre-se de anexar o PDF baixado ao e-mail — envio direto ainda não integrado.');
  };

  const handleWhats = () => {
    const texto = encodeURIComponent(requisicaoCompraWhatsAppText(requisicao, solicitanteNome, nomeProduto));
    window.open(`https://wa.me/?text=${texto}`, '_blank');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon" variant="ghost"><MoreVertical className="w-4 h-4" /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onView}><Eye className="w-4 h-4 mr-2" />Visualizar</DropdownMenuItem>
        <DropdownMenuItem onClick={handlePrint}><Printer className="w-4 h-4 mr-2" />Imprimir</DropdownMenuItem>
        <DropdownMenuItem onClick={handleDownload}><Download className="w-4 h-4 mr-2" />Baixar PDF</DropdownMenuItem>
        <DropdownMenuItem onClick={handleEmail}><Mail className="w-4 h-4 mr-2" />E-mail</DropdownMenuItem>
        <DropdownMenuItem onClick={handleWhats}><MessageCircle className="w-4 h-4 mr-2" />WhatsApp</DropdownMenuItem>
        {podeCancelar && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onCancel} className="text-destructive focus:text-destructive">
              <Ban className="w-4 h-4 mr-2" />Cancelar
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

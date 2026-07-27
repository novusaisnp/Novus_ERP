import React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Download, Eye, Mail, MessageCircle, MoreVertical, Printer } from 'lucide-react';
import { toast } from 'sonner';
import type { Venda } from '@/types/vendas';
import {
  downloadVendaPdf,
  printVendaPdf,
  vendaWhatsAppText,
  type VendaPdfCliente,
  type VendaPdfEmpresa,
} from '@/utils/vendaPdf';

interface Props {
  venda: Venda;
  empresa?: VendaPdfEmpresa | null;
  cliente?: VendaPdfCliente | null;
  clienteTelefone?: string | null;
  clienteEmail?: string | null;
  onView: () => void;
}

const digits = (s?: string | null) => (s ?? '').replace(/\D/g, '');

export const VendaAcoesMenu: React.FC<Props> = ({
  venda,
  empresa,
  cliente,
  clienteTelefone,
  clienteEmail,
  onView,
}) => {
  const handleEmail = () => {
    const assunto = encodeURIComponent(`Venda ${venda.numero_venda ?? ''}`);
    const corpo = encodeURIComponent(
      `Olá,\n\nSegue em anexo a venda ${venda.numero_venda ?? ''} no valor de ${(
        Number(venda.valor_total) || 0
      ).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}.\n\nAtenciosamente.`,
    );
    const to = clienteEmail ?? '';
    window.location.href = `mailto:${to}?subject=${assunto}&body=${corpo}`;
    toast.info('Lembre-se de anexar o PDF baixado ao e-mail.');
  };

  const handleWhats = () => {
    const tel = digits(clienteTelefone);
    const texto = encodeURIComponent(vendaWhatsAppText(venda));
    const url = tel ? `https://wa.me/${tel}?text=${texto}` : `https://wa.me/?text=${texto}`;
    window.open(url, '_blank');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" title="Documento">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Documento</DropdownMenuLabel>
        <DropdownMenuItem onClick={onView}>
          <Eye className="h-4 w-4 mr-2" /> Visualizar
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => printVendaPdf(venda, empresa, cliente)}>
          <Printer className="h-4 w-4 mr-2" /> Imprimir
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => downloadVendaPdf(venda, empresa, cliente)}>
          <Download className="h-4 w-4 mr-2" /> Baixar PDF
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleEmail}>
          <Mail className="h-4 w-4 mr-2" /> Enviar por e-mail
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleWhats}>
          <MessageCircle className="h-4 w-4 mr-2" /> WhatsApp
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

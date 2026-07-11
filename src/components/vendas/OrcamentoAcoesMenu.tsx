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
import {
  Copy,
  Download,
  Eye,
  Mail,
  MessageCircle,
  MoreVertical,
  Printer,
  ShoppingCart,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Orcamento } from '@/services/orcamentosService';
import {
  downloadOrcamentoPdf,
  orcamentoWhatsAppText,
  printOrcamentoPdf,
  type OrcamentoPdfCliente,
  type OrcamentoPdfEmpresa,
} from '@/utils/orcamentoPdf';

interface Props {
  orcamento: Orcamento;
  empresa?: OrcamentoPdfEmpresa | null;
  cliente?: OrcamentoPdfCliente | null;
  clienteTelefone?: string | null;
  clienteEmail?: string | null;
  onView: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onConverter: () => void;
}

const digits = (s?: string | null) => (s ?? '').replace(/\D/g, '');

export const OrcamentoAcoesMenu: React.FC<Props> = ({
  orcamento,
  empresa,
  cliente,
  clienteTelefone,
  clienteEmail,
  onView,
  onDuplicate,
  onDelete,
  onConverter,
}) => {
  const handleEmail = () => {
    const assunto = encodeURIComponent(`Orçamento ${orcamento.numero}`);
    const corpo = encodeURIComponent(
      `Olá,\n\nSegue em anexo o orçamento ${orcamento.numero} no valor de ${(
        Number(orcamento.valorTotal) || 0
      ).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}.\n\nAtenciosamente.`,
    );
    const to = clienteEmail ?? '';
    window.location.href = `mailto:${to}?subject=${assunto}&body=${corpo}`;
    toast.info('Lembre-se de anexar o PDF baixado ao e-mail.');
  };

  const handleWhats = () => {
    const tel = digits(clienteTelefone);
    const texto = encodeURIComponent(orcamentoWhatsAppText(orcamento));
    const url = tel ? `https://wa.me/${tel}?text=${texto}` : `https://wa.me/?text=${texto}`;
    window.open(url, '_blank');
  };

  const isConvertido = orcamento.status === 'convertido';
  const podeConverter = orcamento.status === 'aprovado';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Ações</DropdownMenuLabel>
        <DropdownMenuItem onClick={onView}>
          <Eye className="h-4 w-4 mr-2" /> Visualizar
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => printOrcamentoPdf(orcamento, empresa, cliente)}>
          <Printer className="h-4 w-4 mr-2" /> Imprimir
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => downloadOrcamentoPdf(orcamento, empresa, cliente)}>
          <Download className="h-4 w-4 mr-2" /> Baixar PDF
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleEmail}>
          <Mail className="h-4 w-4 mr-2" /> Enviar por e-mail
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleWhats}>
          <MessageCircle className="h-4 w-4 mr-2" /> WhatsApp
        </DropdownMenuItem>
        {!isConvertido && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDuplicate}>
              <Copy className="h-4 w-4 mr-2" /> Duplicar
            </DropdownMenuItem>
            <DropdownMenuItem disabled={!podeConverter} onClick={onConverter}>
              <ShoppingCart className="h-4 w-4 mr-2" /> Converter em Venda
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4 mr-2" /> Excluir
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};


import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Orcamento, OrcamentoItem } from '@/services/orcamentosService';
import { calcItemTotal } from '@/services/orcamentosService';

export interface OrcamentoPdfEmpresa {
  nome?: string | null;
  cnpj?: string | null;
  email?: string | null;
  telefone?: string | null;
  endereco?: string | null;
  cidade?: string | null;
  estado?: string | null;
  cep?: string | null;
  logoUrl?: string | null;
}

export interface OrcamentoPdfCliente {
  nome?: string | null;
  cpf?: string | null;
  cnpj?: string | null;
  email?: string | null;
  telefone?: string | null;
  cidade?: string | null;
  estado?: string | null;
}

const brl = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const fmtDate = (d?: string | null) =>
  d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '-';

const TIPO_LABEL: Record<string, string> = {
  P: 'Produtos (NF-e)',
  S: 'Serviços (NFS-e)',
  H: 'Híbrido (NF-e + NFS-e)',
};

export const buildOrcamentoPdf = (
  orc: Orcamento,
  empresa?: OrcamentoPdfEmpresa | null,
  cliente?: OrcamentoPdfCliente | null,
): jsPDF => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 15;
  let y = 15;

  // Cabeçalho empresa
  doc.setFont('helvetica', 'bold').setFontSize(14);
  doc.text(empresa?.nome ?? 'Empresa', marginX, y);
  doc.setFont('helvetica', 'normal').setFontSize(9);
  y += 5;
  const empresaLinhas: string[] = [];
  if (empresa?.cnpj) empresaLinhas.push(`CNPJ: ${empresa.cnpj}`);
  const end = [empresa?.endereco, empresa?.cidade, empresa?.estado, empresa?.cep]
    .filter(Boolean)
    .join(' - ');
  if (end) empresaLinhas.push(end);
  const contato = [empresa?.email, empresa?.telefone].filter(Boolean).join(' | ');
  if (contato) empresaLinhas.push(contato);
  empresaLinhas.forEach((l) => {
    doc.text(l, marginX, y);
    y += 4;
  });

  // Título orçamento (direita)
  doc.setFont('helvetica', 'bold').setFontSize(16);
  doc.text('ORÇAMENTO', pageWidth - marginX, 17, { align: 'right' });
  doc.setFont('helvetica', 'normal').setFontSize(10);
  doc.text(`Nº ${orc.numero}`, pageWidth - marginX, 23, { align: 'right' });
  doc.setFontSize(9);
  doc.text(`Emissão: ${fmtDate(orc.dataEmissao)}`, pageWidth - marginX, 28, { align: 'right' });
  doc.text(
    `Validade: ${fmtDate(orc.dataValidade)}`,
    pageWidth - marginX,
    32,
    { align: 'right' },
  );
  doc.text(`Tipo: ${TIPO_LABEL[orc.tipo] ?? orc.tipo}`, pageWidth - marginX, 36, {
    align: 'right',
  });

  y = Math.max(y, 42);
  doc.setDrawColor(200);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 5;

  // Cliente
  doc.setFont('helvetica', 'bold').setFontSize(10);
  doc.text('Cliente', marginX, y);
  y += 5;
  doc.setFont('helvetica', 'normal').setFontSize(9);
  const clienteLinhas: string[] = [];
  clienteLinhas.push(cliente?.nome ?? orc.clienteNome ?? 'Não informado');
  const docCli = cliente?.cnpj || cliente?.cpf;
  if (docCli) clienteLinhas.push(`Documento: ${docCli}`);
  const contCli = [cliente?.email, cliente?.telefone].filter(Boolean).join(' | ');
  if (contCli) clienteLinhas.push(contCli);
  const locCli = [cliente?.cidade, cliente?.estado].filter(Boolean).join(' / ');
  if (locCli) clienteLinhas.push(locCli);
  clienteLinhas.forEach((l) => {
    doc.text(l, marginX, y);
    y += 4;
  });
  y += 3;

  // Itens
  const body = (orc.itens ?? []).map((it, idx) => [
    String(idx + 1),
    it.tipoItem === 'S' ? 'Serviço' : 'Produto',
    it.descricao,
    String(it.quantidade),
    brl(Number(it.precoUnitario) || 0),
    brl(Number(it.desconto) || 0),
    brl(calcItemTotal(it)),
  ]);

  autoTable(doc, {
    startY: y,
    head: [['#', 'Tipo', 'Descrição', 'Qtd', 'Unitário', 'Desc.', 'Total']],
    body,
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [30, 41, 59], textColor: 255 },
    columnStyles: {
      0: { cellWidth: 8, halign: 'right' },
      1: { cellWidth: 18 },
      3: { cellWidth: 14, halign: 'right' },
      4: { cellWidth: 25, halign: 'right' },
      5: { cellWidth: 20, halign: 'right' },
      6: { cellWidth: 25, halign: 'right' },
    },
    margin: { left: marginX, right: marginX },
  });

  const afterTableY =
    (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y;
  let yy = afterTableY + 6;

  // Totais
  doc.setFont('helvetica', 'bold').setFontSize(11);
  doc.text(`Valor Total: ${brl(Number(orc.valorTotal) || 0)}`, pageWidth - marginX, yy, {
    align: 'right',
  });
  yy += 8;

  // Observações
  if (orc.observacoes) {
    doc.setFont('helvetica', 'bold').setFontSize(10);
    doc.text('Observações', marginX, yy);
    yy += 5;
    doc.setFont('helvetica', 'normal').setFontSize(9);
    const linhas = doc.splitTextToSize(orc.observacoes, pageWidth - marginX * 2);
    doc.text(linhas, marginX, yy);
    yy += linhas.length * 4 + 4;
  }

  // Rodapé
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFont('helvetica', 'italic').setFontSize(8).setTextColor(120);
  doc.text(
    `Este orçamento é válido até ${fmtDate(orc.dataValidade)}. Documento sem valor fiscal.`,
    marginX,
    pageHeight - 10,
  );
  doc.setTextColor(0);

  return doc;
};

export const downloadOrcamentoPdf = (
  orc: Orcamento,
  empresa?: OrcamentoPdfEmpresa | null,
  cliente?: OrcamentoPdfCliente | null,
) => {
  const doc = buildOrcamentoPdf(orc, empresa, cliente);
  doc.save(`${orc.numero}.pdf`);
};

export const printOrcamentoPdf = (
  orc: Orcamento,
  empresa?: OrcamentoPdfEmpresa | null,
  cliente?: OrcamentoPdfCliente | null,
) => {
  const doc = buildOrcamentoPdf(orc, empresa, cliente);
  const blob = doc.output('blob');
  const url = URL.createObjectURL(blob);
  const w = window.open(url, '_blank');
  if (w) {
    w.addEventListener('load', () => {
      try {
        w.focus();
        w.print();
      } catch {
        /* noop */
      }
    });
  }
};

export const orcamentoWhatsAppText = (orc: Orcamento): string => {
  const linhas = [
    `Olá! Segue o orçamento *${orc.numero}*`,
    `Emissão: ${fmtDate(orc.dataEmissao)}`,
    `Validade: ${fmtDate(orc.dataValidade)}`,
    `Itens: ${orc.itens?.length ?? 0}`,
    `Valor total: ${brl(Number(orc.valorTotal) || 0)}`,
  ];
  return linhas.join('\n');
};

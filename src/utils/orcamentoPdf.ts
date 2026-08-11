import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Orcamento, OrcamentoItem } from '@/services/orcamentosService';
import { calcItemTotal } from '@/services/orcamentosService';
import { resolveReportLogo } from '@/utils/reportBranding';
import { drawReportHeader, drawReportFooter, BRAND_NAVY } from '@/utils/pdfReportLayout';
import type { ReportBranding } from '@/utils/reportExportShared';

const SERVICOS_COLOR: [number, number, number] = [100, 116, 139];

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

export const buildOrcamentoPdf = async (
  orc: Orcamento,
  empresa?: OrcamentoPdfEmpresa | null,
  cliente?: OrcamentoPdfCliente | null,
): Promise<jsPDF> => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 15;

  const brandingForPdf: ReportBranding = {
    companyName: empresa?.nome ?? null,
    logoUrl: empresa?.logoUrl ?? null,
    primaryColor: null,
  };
  const logo = await resolveReportLogo(brandingForPdf);

  const companyExtraLines: string[] = [];
  if (empresa?.cnpj) companyExtraLines.push(`CNPJ: ${empresa.cnpj}`);
  const end = [empresa?.endereco, empresa?.cidade, empresa?.estado, empresa?.cep]
    .filter(Boolean)
    .join(' - ');
  if (end) companyExtraLines.push(end);
  const contato = [empresa?.email, empresa?.telefone].filter(Boolean).join(' | ');
  if (contato) companyExtraLines.push(contato);

  let y = drawReportHeader(doc, {
    marginX,
    docTypeLabel: 'Orçamento',
    title: `Nº ${orc.numero}`,
    metaLines: [
      `Emissão: ${fmtDate(orc.dataEmissao)}`,
      `Validade: ${fmtDate(orc.dataValidade)}`,
      `Tipo: ${TIPO_LABEL[orc.tipo] ?? orc.tipo}`,
    ],
    branding: brandingForPdf,
    logo,
    companyExtraLines,
  });

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

  // Itens — separados por bloco (Produtos / Serviços)
  const itens = orc.itens ?? [];
  const produtos = itens.filter((i) => i.tipoItem === 'P');
  const servicos = itens.filter((i) => i.tipoItem === 'S');

  const somaBloco = (arr: OrcamentoItem[]) =>
    arr.reduce((s, i) => s + calcItemTotal(i), 0);

  const renderBloco = (
    titulo: string,
    corHeader: [number, number, number],
    arr: OrcamentoItem[],
    startY: number,
  ): number => {
    if (arr.length === 0) return startY;
    doc.setFont('helvetica', 'bold').setFontSize(11);
    doc.setTextColor(corHeader[0], corHeader[1], corHeader[2]);
    doc.text(titulo, marginX, startY);
    doc.setTextColor(0, 0, 0);
    autoTable(doc, {
      startY: startY + 2,
      head: [['#', 'Descrição', 'Qtd', 'Unitário', 'Desc.', 'Total']],
      body: arr.map((it, idx) => [
        String(idx + 1),
        it.descricao,
        String(it.quantidade),
        brl(Number(it.precoUnitario) || 0),
        brl(Number(it.desconto) || 0),
        brl(calcItemTotal(it)),
      ]),
      foot: [[
        '',
        `Subtotal ${titulo}`,
        '',
        '',
        '',
        brl(somaBloco(arr)),
      ]],
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: corHeader, textColor: 255 },
      footStyles: { fillColor: [241, 245, 249], textColor: 20, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 10, halign: 'right' },
        2: { cellWidth: 16, halign: 'right' },
        3: { cellWidth: 28, halign: 'right' },
        4: { cellWidth: 22, halign: 'right' },
        5: { cellWidth: 28, halign: 'right' },
      },
      margin: { left: marginX, right: marginX },
    });
    return (
      (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? startY
    ) + 6;
  };

  let cursor = y;
  cursor = renderBloco('Produtos', BRAND_NAVY, produtos, cursor);
  cursor = renderBloco('Serviços', SERVICOS_COLOR, servicos, cursor);

  let yy = cursor + 2;

  // Totais consolidados
  doc.setDrawColor(200);
  doc.line(marginX, yy, pageWidth - marginX, yy);
  yy += 6;
  doc.setFont('helvetica', 'normal').setFontSize(9);
  if (produtos.length) {
    doc.text(
      `Subtotal Produtos: ${brl(somaBloco(produtos))}`,
      pageWidth - marginX,
      yy,
      { align: 'right' },
    );
    yy += 4;
  }
  if (servicos.length) {
    doc.text(
      `Subtotal Serviços: ${brl(somaBloco(servicos))}`,
      pageWidth - marginX,
      yy,
      { align: 'right' },
    );
    yy += 4;
  }
  doc.setFont('helvetica', 'bold').setFontSize(12);
  doc.text(`Valor Total: ${brl(Number(orc.valorTotal) || 0)}`, pageWidth - marginX, yy + 2, {
    align: 'right',
  });
  yy += 10;

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
  drawReportFooter(doc, {
    marginX,
    sourceLabel: `Válido até ${fmtDate(orc.dataValidade)} — documento sem valor fiscal`,
  });

  return doc;
};

export const downloadOrcamentoPdf = async (
  orc: Orcamento,
  empresa?: OrcamentoPdfEmpresa | null,
  cliente?: OrcamentoPdfCliente | null,
) => {
  const doc = await buildOrcamentoPdf(orc, empresa, cliente);
  doc.save(`${orc.numero}.pdf`);
};

export const printOrcamentoPdf = async (
  orc: Orcamento,
  empresa?: OrcamentoPdfEmpresa | null,
  cliente?: OrcamentoPdfCliente | null,
) => {
  const doc = await buildOrcamentoPdf(orc, empresa, cliente);
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

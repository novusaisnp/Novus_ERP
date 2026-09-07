import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { resolveReportLogo } from '@/utils/reportBranding';
import { drawReportHeader, drawReportFooter, BRAND_NAVY } from '@/utils/pdfReportLayout';
import type { ReportBranding } from '@/utils/reportExportShared';
import type { RequisicaoCompra } from '@/types/requisicaoCompra';

export interface RequisicaoCompraPdfEmpresa {
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

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const fmtDate = (d?: string | null) =>
  d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '-';

const fmtDateTime = (d?: string | null) => (d ? new Date(d).toLocaleString('pt-BR') : '-');

const STATUS_LABEL: Record<RequisicaoCompra['status'], string> = {
  ABERTA: 'Aberta',
  CANCELADA: 'Cancelada',
};

export const buildRequisicaoCompraPdf = async (
  req: RequisicaoCompra,
  empresa: RequisicaoCompraPdfEmpresa | null | undefined,
  solicitanteNome: string,
  centroCustoNome: string | null,
  nomeProduto: (produtoId: string) => string,
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
    docTypeLabel: 'Requisição de Compra',
    title: `Nº ${req.id.slice(0, 8).toUpperCase()}`,
    metaLines: [
      `Aberta em: ${fmtDateTime(req.created_at)}`,
      `Status: ${STATUS_LABEL[req.status]}`,
    ],
    branding: brandingForPdf,
    logo,
    companyExtraLines,
  });

  doc.setFont('helvetica', 'bold').setFontSize(10);
  doc.text('Solicitante', marginX, y);
  y += 5;
  doc.setFont('helvetica', 'normal').setFontSize(9);
  doc.text(solicitanteNome, marginX, y);
  y += 4;
  if (centroCustoNome) {
    doc.text(`Centro de Custo: ${centroCustoNome}`, marginX, y);
    y += 4;
  }
  if (req.data_necessidade) {
    doc.text(`Necessário até: ${fmtDate(req.data_necessidade)}`, marginX, y);
    y += 4;
  }
  y += 3;

  doc.setFont('helvetica', 'bold').setFontSize(10);
  doc.text('Justificativa', marginX, y);
  y += 5;
  doc.setFont('helvetica', 'normal').setFontSize(9);
  const justLinhas = doc.splitTextToSize(req.justificativa, pageWidth - marginX * 2);
  doc.text(justLinhas, marginX, y);
  y += justLinhas.length * 4 + 4;

  doc.setFont('helvetica', 'bold').setFontSize(11);
  doc.setTextColor(BRAND_NAVY[0], BRAND_NAVY[1], BRAND_NAVY[2]);
  doc.text('Itens', marginX, y);
  doc.setTextColor(0, 0, 0);

  autoTable(doc, {
    startY: y + 2,
    head: [['#', 'Produto', 'Quantidade', 'Observação']],
    body: req.itens.map((it, idx) => [
      String(idx + 1),
      nomeProduto(it.produto_id),
      String(it.quantidade),
      it.observacao || '-',
    ]),
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: BRAND_NAVY, textColor: 255 },
    columnStyles: {
      0: { cellWidth: 10, halign: 'right' },
      2: { cellWidth: 24, halign: 'right' },
    },
    margin: { left: marginX, right: marginX },
  });

  drawReportFooter(doc, {
    marginX,
    sourceLabel: 'Requisição interna — sem valor fiscal, não substitui pedido de compra formal',
  });

  return doc;
};

export const downloadRequisicaoCompraPdf = async (
  req: RequisicaoCompra,
  empresa: RequisicaoCompraPdfEmpresa | null | undefined,
  solicitanteNome: string,
  centroCustoNome: string | null,
  nomeProduto: (produtoId: string) => string,
) => {
  const doc = await buildRequisicaoCompraPdf(req, empresa, solicitanteNome, centroCustoNome, nomeProduto);
  doc.save(`requisicao-${req.id.slice(0, 8)}.pdf`);
};

export const printRequisicaoCompraPdf = async (
  req: RequisicaoCompra,
  empresa: RequisicaoCompraPdfEmpresa | null | undefined,
  solicitanteNome: string,
  centroCustoNome: string | null,
  nomeProduto: (produtoId: string) => string,
) => {
  const doc = await buildRequisicaoCompraPdf(req, empresa, solicitanteNome, centroCustoNome, nomeProduto);
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

export const requisicaoCompraWhatsAppText = (
  req: RequisicaoCompra,
  solicitanteNome: string,
  nomeProduto: (produtoId: string) => string,
): string => {
  const linhas = [
    `Requisição de compra de *${solicitanteNome}*`,
    `Status: ${STATUS_LABEL[req.status]}`,
    `Justificativa: ${req.justificativa}`,
    'Itens:',
    ...req.itens.map((it) => `- ${nomeProduto(it.produto_id)} (${it.quantidade})`),
  ];
  return linhas.join('\n');
};

// Cabeçalho/rodapé compartilhado dos relatórios em PDF (padronização visual).
// Agnóstico de unidade (mm ou pt) — usa doc.internal.pageSize, que já reflete a
// unidade configurada em `new jsPDF({ unit })`; marginX/marginBottom vêm do chamador
// na mesma unidade do documento.
import type jsPDF from 'jspdf';
import type { ReportBranding } from './reportExportShared';
import { getLogoRenderSize, type ResolvedReportLogo } from './reportBranding';

export const BRAND_NAVY: [number, number, number] = [7, 33, 84];
export const BRAND_ACCENT: [number, number, number] = [27, 159, 220];

export interface DrawReportHeaderOptions {
  /** Margem esquerda/direita, na unidade do documento (mm ou pt). */
  marginX: number;
  /** Topo do bloco de cabeçalho, na unidade do documento. */
  startY?: number;
  /** Rótulo pequeno em maiúsculas acima do título (ex.: "RELATÓRIO", "VENDA"). */
  docTypeLabel: string;
  title: string;
  /** Linhas pequenas abaixo do título, alinhadas à direita (período, nº, status...). */
  metaLines?: string[];
  branding?: ReportBranding | null;
  /** Logo já resolvida (uma vez por documento) via resolveReportLogo. */
  logo?: ResolvedReportLogo | null;
  /** Linhas pequenas abaixo do nome da empresa (CNPJ, endereço, contato...). */
  companyExtraLines?: string[];
  logoMaxWidth?: number;
  logoMaxHeight?: number;
}

/** Desenha o cabeçalho e retorna o Y (na unidade do documento) onde o conteúdo deve começar. */
export function drawReportHeader(doc: jsPDF, opts: DrawReportHeaderOptions): number {
  const {
    marginX,
    startY = marginX,
    docTypeLabel,
    title,
    metaLines = [],
    branding,
    logo,
    companyExtraLines = [],
    logoMaxWidth = marginX * 2.6,
    logoMaxHeight = marginX * 1.4,
  } = opts;

  const pageWidth = doc.internal.pageSize.getWidth();
  let logoWidth = 0;
  let logoHeight = 0;

  // Tudo no cabeçalho é ancorado no mesmo topo (headerTop) e cresce pra baixo.
  // Bug real corrigido aqui: a logo era posicionada com um offset escalado pela
  // PRÓPRIA altura dela (startY - size.height * 0.7), enquanto o bloco de texto
  // da direita usava um offset fixo (startY - marginX * 0.4) — os dois só
  // coincidiam visualmente pra logos de altura "média"; uma logo mais alta (ex.:
  // quadrada) subia bem mais que o título, desalinhando os dois blocos.
  const headerTop = startY - marginX * 0.5;

  if (logo) {
    const size = getLogoRenderSize(logo, logoMaxWidth, logoMaxHeight);
    try {
      doc.addImage(
        logo.dataUrl,
        logo.extension.toUpperCase(),
        marginX,
        headerTop,
        size.width,
        size.height,
      );
      logoWidth = size.width;
      logoHeight = size.height;
    } catch {
      // logo inválida não deve bloquear a geração do documento
    }
  }

  const textX = logoWidth > 0 ? marginX + logoWidth + marginX * 0.2 : marginX;

  // Bloco esquerdo: mede a largura REAL de cada linha (nome da empresa +
  // linhas extra) pra saber onde ele termina de verdade — um chute em % da
  // página (tentativa anterior) ainda colidia com o bloco direito sempre
  // que o nome da empresa era comprido, porque o texto nunca era medido,
  // só desenhado sem limite nenhum.
  //
  // Centraliza o bloco de texto (nome + linhas extra) na vertical contra a
  // logo — sem isto, o texto sempre começava no topo (headerTop + offset
  // fixo), e uma logo mais alta que o bloco de texto deixava o nome da
  // empresa "flutuando" acima do centro da logo, desalinhado. Quando não
  // há logo, o offset de centralização é 0 e o comportamento é o mesmo de
  // antes (ancorado perto do topo).
  const companyNameLineHeight = marginX * 0.32;
  const extraLineHeight = marginX * 0.27;
  const leftTextBlockHeight = companyNameLineHeight + companyExtraLines.length * extraLineHeight;
  const leftBlockVerticalCenterOffset = Math.max(0, (logoHeight - leftTextBlockHeight) / 2);

  let leftY = headerTop + leftBlockVerticalCenterOffset + marginX * 0.3;
  doc.setFont('helvetica', 'bold').setFontSize(11.5);
  doc.setTextColor(BRAND_NAVY[0], BRAND_NAVY[1], BRAND_NAVY[2]);
  const companyName = branding?.companyName || 'Empresa';
  doc.text(companyName, textX, leftY);
  let leftBlockRightEdge = textX + doc.getTextWidth(companyName);

  leftY += marginX * 0.32;
  doc.setFont('helvetica', 'normal').setFontSize(8.5);
  doc.setTextColor(110);
  companyExtraLines.forEach((line) => {
    doc.text(line, textX, leftY);
    leftBlockRightEdge = Math.max(leftBlockRightEdge, textX + doc.getTextWidth(line));
    leftY += marginX * 0.27;
  });

  // Bloco direito (rótulo/título/meta) nunca pode invadir leftBlockRightEdge
  // — a largura disponível é derivada da medição real acima, não de uma
  // fração fixa da página.
  const maxRightWidth = Math.max(
    pageWidth * 0.2,
    pageWidth - marginX - leftBlockRightEdge - marginX * 0.4,
  );

  let rightY = headerTop + marginX * 0.22;
  doc.setFont('helvetica', 'bold').setFontSize(7.5);
  doc.setTextColor(BRAND_ACCENT[0], BRAND_ACCENT[1], BRAND_ACCENT[2]);
  doc.text(docTypeLabel.toUpperCase(), pageWidth - marginX, rightY, { align: 'right' });

  rightY += marginX * 0.34;
  doc.setFont('helvetica', 'bold').setFontSize(13);
  doc.setTextColor(30);
  const titleLines = doc.splitTextToSize(title, maxRightWidth) as string[];
  titleLines.forEach((line, i) => {
    doc.text(line, pageWidth - marginX, rightY, { align: 'right' });
    rightY += i === titleLines.length - 1 ? marginX * 0.3 : marginX * 0.32;
  });
  doc.setFont('helvetica', 'normal').setFontSize(8.5);
  doc.setTextColor(110);
  metaLines.forEach((line) => {
    const wrapped = doc.splitTextToSize(line, maxRightWidth) as string[];
    wrapped.forEach((l) => {
      doc.text(l, pageWidth - marginX, rightY, { align: 'right' });
      rightY += marginX * 0.27;
    });
  });

  const headerBottom = Math.max(leftY, rightY, headerTop + logoHeight) + marginX * 0.15;
  doc.setDrawColor(BRAND_NAVY[0], BRAND_NAVY[1], BRAND_NAVY[2]);
  doc.setLineWidth(marginX * 0.02);
  doc.line(marginX, headerBottom, pageWidth - marginX, headerBottom);
  doc.setTextColor(0);
  doc.setDrawColor(0);
  doc.setLineWidth(0.2);

  return headerBottom + marginX * 0.4;
}

export interface DrawReportFooterOptions {
  marginX: number;
  sourceLabel?: string;
}

/** Escreve o rodapé (fonte de emissão + página X de Y) em todas as páginas já geradas. */
export function drawReportFooter(doc: jsPDF, opts: DrawReportFooterOptions): void {
  const { marginX, sourceLabel = 'Emitido via NOVUS.AI ERP' } = opts;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const ruleY = pageHeight - marginX * 0.85;
  const textY = pageHeight - marginX * 0.55;
  const totalPages = doc.internal.pages.length - 1;

  for (let i = 1; i <= totalPages; i += 1) {
    doc.setPage(i);
    doc.setDrawColor(220);
    doc.setLineWidth(marginX * 0.015);
    doc.line(marginX, ruleY, pageWidth - marginX, ruleY);
    doc.setFont('helvetica', 'normal').setFontSize(7.5);
    doc.setTextColor(140);
    doc.text(sourceLabel, marginX, textY);
    doc.text(`Página ${i} de ${totalPages}`, pageWidth - marginX, textY, { align: 'right' });
  }
  doc.setTextColor(0);
  doc.setDrawColor(0);
}

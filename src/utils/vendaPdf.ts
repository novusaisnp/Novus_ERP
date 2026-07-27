import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Venda, ItemVenda } from '@/types/vendas';
import { resolveVendaPagamentoInfo, type VendaPagamentoInfo } from '@/utils/vendaPagamentoInfo';

export interface VendaPdfEmpresa {
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

export interface VendaPdfCliente {
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

const STATUS_LABEL: Record<string, string> = {
  RASCUNHO: 'Rascunho',
  CONFIRMADO: 'Confirmado',
  EM_PRODUCAO: 'Em produção',
  FATURADO: 'Faturado',
  ENTREGUE: 'Entregue',
  CANCELADO: 'Cancelado',
};

export const calcItemVendaTotal = (it: ItemVenda): number => {
  if (it.valor_total_item != null) return Number(it.valor_total_item);
  const bruto = (Number(it.quantidade) || 0) * (Number(it.preco_unitario) || 0);
  return bruto - (Number(it.desconto_item) || 0) + (Number(it.acrescimo_item) || 0);
};

const fetchImageAsDataUrl = async (
  url: string,
): Promise<{ data: string; format: 'PNG' | 'JPEG'; w: number; h: number } | null> => {
  try {
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const blob = await resp.blob();
    const data = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = () => reject(new Error('read fail'));
      r.readAsDataURL(blob);
    });
    const dims = await new Promise<{ w: number; h: number }>((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.width, h: img.height });
      img.onerror = () => resolve({ w: 0, h: 0 });
      img.src = data;
    });
    const format: 'PNG' | 'JPEG' = /jpe?g/i.test(blob.type) ? 'JPEG' : 'PNG';
    return { data, format, w: dims.w, h: dims.h };
  } catch {
    return null;
  }
};

const renderPagamento = (
  doc: jsPDF,
  info: VendaPagamentoInfo,
  marginX: number,
  pageWidth: number,
  startY: number,
): number => {
  let yy = startY;
  doc.setDrawColor(200);
  doc.line(marginX, yy, pageWidth - marginX, yy);
  yy += 6;
  doc.setFont('helvetica', 'bold').setFontSize(10);
  doc.text('Pagamento', marginX, yy);
  yy += 5;
  doc.setFont('helvetica', 'normal').setFontSize(9);

  if (info.origem === 'pagamento') {
    info.linhas.forEach((linha) => {
      const parcelaLabel = linha.qtdParcelas > 1 ? `${linha.qtdParcelas}x` : 'à vista';
      const linhaTexto = [
        `Forma: ${linha.modalidadeNome}`,
        linha.naturezaNome ? linha.naturezaNome : null,
        `${parcelaLabel} — ${brl(linha.valorLiquido)}`,
      ]
        .filter(Boolean)
        .join(' | ');
      doc.text(linhaTexto, marginX, yy);
      yy += 4;

      if (linha.parcelas.length > 1) {
        autoTable(doc, {
          startY: yy,
          head: [['Parcela', 'Vencimento', 'Valor']],
          body: linha.parcelas.map((p) => [
            p.isEntrada ? `${p.numero} (entrada)` : String(p.numero),
            fmtDate(p.dataVencimento),
            brl(p.valor),
          ]),
          styles: { fontSize: 8, cellPadding: 1.5 },
          headStyles: { fillColor: [30, 41, 59], textColor: 255 },
          margin: { left: marginX, right: marginX },
          tableWidth: 90,
        });
        yy =
          ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ??
            yy) + 4;
      } else if (linha.parcelas.length === 1) {
        doc.text(
          `Vencimento: ${fmtDate(linha.parcelas[0].dataVencimento)}`,
          marginX,
          yy,
        );
        yy += 4;
      }
    });
  } else if (info.origem === 'plano') {
    const partes = [
      `Plano: ${info.planoNome}`,
      info.planoNaturezaNome ? info.planoNaturezaNome : null,
      `${info.planoQtdParcelas ?? 1}x prevista(s)`,
      info.planoDiasPrimeiraParcela != null
        ? `1ª parcela em ${info.planoDiasPrimeiraParcela} dias`
        : null,
      info.planoIntervaloDias != null ? `intervalo de ${info.planoIntervaloDias} dias` : null,
    ].filter(Boolean);
    doc.text(partes.join(' | '), marginX, yy);
    yy += 4;
  } else {
    doc.text('Forma de pagamento não informada.', marginX, yy);
    yy += 4;
  }

  return yy + 2;
};

export const buildVendaPdf = async (
  v: Venda,
  empresa?: VendaPdfEmpresa | null,
  cliente?: VendaPdfCliente | null,
): Promise<jsPDF> => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 15;
  let y = 15;

  const pagamentoInfo = await resolveVendaPagamentoInfo(v);

  // Timbrado: logo da empresa (se cadastrada) + dados
  let logoAlturaMm = 0;
  if (empresa?.logoUrl) {
    const logo = await fetchImageAsDataUrl(empresa.logoUrl);
    if (logo && logo.w > 0 && logo.h > 0) {
      const maxW = 40;
      const maxH = 22;
      const ratio = Math.min(maxW / (logo.w * 0.264583), maxH / (logo.h * 0.264583));
      const w = logo.w * 0.264583 * ratio;
      const h = logo.h * 0.264583 * ratio;
      try {
        doc.addImage(logo.data, logo.format, marginX, y - 3, w, h);
        logoAlturaMm = h;
      } catch {
        /* fallback abaixo */
      }
    }
  }

  const textoOffsetX = logoAlturaMm > 0 ? marginX + 45 : marginX;
  doc.setFont('helvetica', 'bold').setFontSize(12);
  doc.text(empresa?.nome ?? 'Empresa', textoOffsetX, y);
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
    doc.text(l, textoOffsetX, y);
    y += 4;
  });
  if (logoAlturaMm > 0) {
    y = Math.max(y, 15 + logoAlturaMm + 2);
  }

  // Título venda (direita)
  doc.setFont('helvetica', 'bold').setFontSize(16);
  doc.text('VENDA', pageWidth - marginX, 17, { align: 'right' });
  doc.setFont('helvetica', 'normal').setFontSize(10);
  doc.text(`Nº ${v.numero_venda ?? '-'}`, pageWidth - marginX, 23, { align: 'right' });
  doc.setFontSize(9);
  doc.text(`Emissão: ${fmtDate(v.data_venda)}`, pageWidth - marginX, 28, { align: 'right' });
  doc.text(
    `Entrega prevista: ${fmtDate(v.data_entrega_prevista)}`,
    pageWidth - marginX,
    32,
    { align: 'right' },
  );
  doc.text(`Status: ${STATUS_LABEL[v.status] ?? v.status}`, pageWidth - marginX, 36, {
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
  clienteLinhas.push(cliente?.nome ?? v.cliente?.nome ?? 'Não informado');
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
  const itens = v.itens ?? [];
  const produtos = itens.filter((i) => i.tipo_item !== 'S');
  const servicos = itens.filter((i) => i.tipo_item === 'S');

  const somaBloco = (arr: ItemVenda[]) => arr.reduce((s, i) => s + calcItemVendaTotal(i), 0);

  const renderBloco = (
    titulo: string,
    corHeader: [number, number, number],
    arr: ItemVenda[],
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
        brl(Number(it.preco_unitario) || 0),
        brl(Number(it.desconto_item) || 0),
        brl(calcItemVendaTotal(it)),
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
  cursor = renderBloco('Produtos', [30, 41, 59], produtos, cursor);
  cursor = renderBloco('Serviços', [15, 118, 110], servicos, cursor);

  let yy = cursor + 2;

  // Totais consolidados
  doc.setDrawColor(200);
  doc.line(marginX, yy, pageWidth - marginX, yy);
  yy += 6;
  doc.setFont('helvetica', 'normal').setFontSize(9);
  doc.text(`Subtotal: ${brl(Number(v.subtotal) || 0)}`, pageWidth - marginX, yy, { align: 'right' });
  yy += 4;
  if (Number(v.desconto) > 0) {
    doc.text(`Desconto: -${brl(Number(v.desconto))}`, pageWidth - marginX, yy, { align: 'right' });
    yy += 4;
  }
  if (Number(v.acrescimo) > 0) {
    doc.text(`Acréscimo: +${brl(Number(v.acrescimo))}`, pageWidth - marginX, yy, { align: 'right' });
    yy += 4;
  }
  if (Number(v.valor_frete) > 0) {
    doc.text(`Frete: +${brl(Number(v.valor_frete))}`, pageWidth - marginX, yy, { align: 'right' });
    yy += 4;
  }
  doc.setFont('helvetica', 'bold').setFontSize(12);
  doc.text(`Valor Total: ${brl(Number(v.valor_total) || 0)}`, pageWidth - marginX, yy + 2, {
    align: 'right',
  });
  yy += 10;

  // Pagamento
  yy = renderPagamento(doc, pagamentoInfo, marginX, pageWidth, yy);

  // Observações
  if (v.observacoes) {
    doc.setFont('helvetica', 'bold').setFontSize(10);
    doc.text('Observações', marginX, yy);
    yy += 5;
    doc.setFont('helvetica', 'normal').setFontSize(9);
    const linhas = doc.splitTextToSize(v.observacoes, pageWidth - marginX * 2);
    doc.text(linhas, marginX, yy);
    yy += linhas.length * 4 + 4;
  }

  // Rodapé
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFont('helvetica', 'italic').setFontSize(8).setTextColor(120);
  doc.text(
    'Este documento é um registro interno da venda e não substitui a Nota Fiscal.',
    marginX,
    pageHeight - 10,
  );
  doc.setTextColor(0);

  return doc;
};

export const downloadVendaPdf = async (
  v: Venda,
  empresa?: VendaPdfEmpresa | null,
  cliente?: VendaPdfCliente | null,
) => {
  const doc = await buildVendaPdf(v, empresa, cliente);
  doc.save(`${v.numero_venda ?? 'venda'}.pdf`);
};

export const printVendaPdf = async (
  v: Venda,
  empresa?: VendaPdfEmpresa | null,
  cliente?: VendaPdfCliente | null,
) => {
  const doc = await buildVendaPdf(v, empresa, cliente);
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

export const vendaWhatsAppText = (v: Venda): string => {
  const linhas = [
    `Olá! Segue a venda *${v.numero_venda ?? ''}*`,
    `Emissão: ${fmtDate(v.data_venda)}`,
    `Status: ${STATUS_LABEL[v.status] ?? v.status}`,
    `Itens: ${v.itens?.length ?? 0}`,
    `Valor total: ${brl(Number(v.valor_total) || 0)}`,
  ];
  return linhas.join('\n');
};

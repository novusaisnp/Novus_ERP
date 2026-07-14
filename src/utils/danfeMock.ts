// DANFE / NF-e mock builders — geram documentos com aparência próxima ao
// padrão SEFAZ para uso quando FISCAL_MOCK=true. Sem validade fiscal.

export interface DanfeMockEndereco {
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  cep?: string | null;
}

export interface DanfeMockEmitente extends DanfeMockEndereco {
  razao_social?: string | null;
  nome_fantasia?: string | null;
  cnpj?: string | null;
  inscricao_estadual?: string | null;
  telefone?: string | null;
}

export interface DanfeMockDestinatario extends DanfeMockEndereco {
  nome?: string | null;
  razao_social?: string | null;
  cnpj?: string | null;
  cpf?: string | null;
  inscricao_estadual?: string | null;
  email?: string | null;
  telefone?: string | null;
}

export interface DanfeMockItem {
  codigo?: string | null;
  descricao?: string | null;
  ncm?: string | null;
  cfop?: string | null;
  unidade?: string | null;
  quantidade?: number | null;
  preco_unitario?: number | null;
  valor_total?: number | null;
}

export interface DanfeMockData {
  numero?: number | null;
  serie?: number | null;
  chave_acesso?: string | null;
  protocolo?: string | null;
  data_emissao?: string | null;
  natureza_operacao?: string | null;
  status?: string | null;
  ambiente?: string | null;
  valor_total?: number | null;
  emitente: DanfeMockEmitente;
  destinatario: DanfeMockDestinatario;
  itens: DanfeMockItem[];
  observacoes?: string | null;
}

const fmtMoney = (v?: number | null) =>
  typeof v === 'number'
    ? v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '';

const fmtQtd = (v?: number | null) =>
  typeof v === 'number' ? v.toLocaleString('pt-BR', { minimumFractionDigits: 4 }) : '';

const fmtDoc = (v?: string | null) => {
  if (!v) return '';
  const d = v.replace(/\D/g, '');
  if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  return v;
};

const fmtCep = (v?: string | null) => {
  const d = (v ?? '').replace(/\D/g, '');
  return d.length === 8 ? d.replace(/(\d{5})(\d{3})/, '$1-$2') : (v ?? '');
};

const fmtChave = (v?: string | null) =>
  (v ?? '').replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim();

const fmtDate = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : d.toLocaleString('pt-BR');
};

const esc = (v: unknown) =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const enderecoLinha = (e: DanfeMockEndereco) => {
  const parts = [
    [e.logradouro, e.numero].filter(Boolean).join(', '),
    e.complemento,
    e.bairro,
    [e.cidade, e.estado].filter(Boolean).join(' - '),
    fmtCep(e.cep),
  ].filter((x) => x && String(x).trim().length);
  return parts.join(' • ');
};

export const buildNFeMockXml = (d: DanfeMockData): string => {
  const emit = d.emitente;
  const dest = d.destinatario;
  const itens = d.itens
    .map((it, i) => {
      const q = it.quantidade ?? 0;
      const p = it.preco_unitario ?? 0;
      const t = it.valor_total ?? q * p;
      return `    <det nItem="${i + 1}"><prod>
      <cProd>${esc(it.codigo ?? String(i + 1).padStart(3, '0'))}</cProd>
      <xProd>${esc(it.descricao ?? '')}</xProd>
      <NCM>${esc(it.ncm ?? '00000000')}</NCM>
      <CFOP>${esc(it.cfop ?? '5102')}</CFOP>
      <uCom>${esc(it.unidade ?? 'UN')}</uCom>
      <qCom>${q.toFixed(4)}</qCom>
      <vUnCom>${p.toFixed(4)}</vUnCom>
      <vProd>${t.toFixed(2)}</vProd>
    </prod></det>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<!-- DOCUMENTO SIMULADO (FISCAL_MOCK=true) — SEM VALIDADE FISCAL -->
<nfeProc versao="4.00" xmlns="http://www.portalfiscal.inf.br/nfe">
  <NFe>
    <infNFe Id="NFe${esc(d.chave_acesso ?? '')}" versao="4.00">
      <ide>
        <cUF>35</cUF>
        <natOp>${esc(d.natureza_operacao ?? 'VENDA DE MERCADORIA')}</natOp>
        <mod>55</mod>
        <serie>${d.serie ?? 1}</serie>
        <nNF>${d.numero ?? 0}</nNF>
        <dhEmi>${esc(d.data_emissao ?? '')}</dhEmi>
        <tpNF>1</tpNF>
        <tpAmb>${d.ambiente === 'production' ? 1 : 2}</tpAmb>
      </ide>
      <emit>
        <CNPJ>${esc((emit.cnpj ?? '').replace(/\D/g, ''))}</CNPJ>
        <xNome>${esc(emit.razao_social ?? '')}</xNome>
        <xFant>${esc(emit.nome_fantasia ?? '')}</xFant>
        <enderEmit>
          <xLgr>${esc(emit.logradouro ?? '')}</xLgr>
          <nro>${esc(emit.numero ?? '')}</nro>
          <xBairro>${esc(emit.bairro ?? '')}</xBairro>
          <xMun>${esc(emit.cidade ?? '')}</xMun>
          <UF>${esc(emit.estado ?? '')}</UF>
          <CEP>${esc((emit.cep ?? '').replace(/\D/g, ''))}</CEP>
        </enderEmit>
        <IE>${esc(emit.inscricao_estadual ?? '')}</IE>
      </emit>
      <dest>
        <${dest.cnpj ? 'CNPJ' : 'CPF'}>${esc(((dest.cnpj ?? dest.cpf) ?? '').replace(/\D/g, ''))}</${dest.cnpj ? 'CNPJ' : 'CPF'}>
        <xNome>${esc(dest.razao_social ?? dest.nome ?? '')}</xNome>
        <enderDest>
          <xLgr>${esc(dest.logradouro ?? '')}</xLgr>
          <nro>${esc(dest.numero ?? '')}</nro>
          <xBairro>${esc(dest.bairro ?? '')}</xBairro>
          <xMun>${esc(dest.cidade ?? '')}</xMun>
          <UF>${esc(dest.estado ?? '')}</UF>
          <CEP>${esc((dest.cep ?? '').replace(/\D/g, ''))}</CEP>
        </enderDest>
        <IE>${esc(dest.inscricao_estadual ?? 'ISENTO')}</IE>
        <email>${esc(dest.email ?? '')}</email>
      </dest>
${itens}
      <total><ICMSTot>
        <vBC>0.00</vBC><vICMS>0.00</vICMS>
        <vProd>${(d.valor_total ?? 0).toFixed(2)}</vProd>
        <vNF>${(d.valor_total ?? 0).toFixed(2)}</vNF>
      </ICMSTot></total>
      <infAdic><infCpl>${esc(d.observacoes ?? 'Documento gerado em modo simulação — sem validade fiscal.')}</infCpl></infAdic>
    </infNFe>
  </NFe>
  <protNFe><infProt>
    <tpAmb>${d.ambiente === 'production' ? 1 : 2}</tpAmb>
    <chNFe>${esc(d.chave_acesso ?? '')}</chNFe>
    <dhRecbto>${esc(d.data_emissao ?? '')}</dhRecbto>
    <nProt>${esc(d.protocolo ?? 'MOCK')}</nProt>
    <cStat>100</cStat>
    <xMotivo>Autorizado o uso da NF-e</xMotivo>
  </infProt></protNFe>
</nfeProc>`;
};

export const buildDanfeMockHtml = (d: DanfeMockData): string => {
  const emit = d.emitente;
  const dest = d.destinatario;
  const totalProd = d.itens.reduce((s, it) => s + (it.valor_total ?? (it.quantidade ?? 0) * (it.preco_unitario ?? 0)), 0);
  const valorNF = d.valor_total ?? totalProd;

  const itensRows = d.itens.length
    ? d.itens
        .map((it, i) => {
          const q = it.quantidade ?? 0;
          const p = it.preco_unitario ?? 0;
          const t = it.valor_total ?? q * p;
          return `<tr>
  <td class="c">${String(i + 1).padStart(3, '0')}</td>
  <td>${esc(it.descricao ?? '')}</td>
  <td class="c">${esc(it.ncm ?? '')}</td>
  <td class="c">${esc(it.cfop ?? '5102')}</td>
  <td class="c">${esc(it.unidade ?? 'UN')}</td>
  <td class="r">${fmtQtd(q)}</td>
  <td class="r">${fmtMoney(p)}</td>
  <td class="r">${fmtMoney(t)}</td>
</tr>`;
        })
        .join('')
    : `<tr><td colspan="8" class="c muted">Sem itens registrados</td></tr>`;

  const chaveFmt = fmtChave(d.chave_acesso);
  const emitCnpjFmt = fmtDoc(emit.cnpj);
  const destDocFmt = fmtDoc(dest.cnpj ?? dest.cpf);
  const isHom = (d.ambiente ?? '').toLowerCase() !== 'production';

  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8">
<title>DANFE — NF-e ${d.numero ?? ''}</title>
<style>
  @page { size: A4; margin: 8mm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 9pt; color: #000; margin: 0; padding: 12px; background: #fff; }
  .wrap { max-width: 210mm; margin: 0 auto; position: relative; }
  .wm { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; pointer-events: none; z-index: 0; }
  .wm span { font-size: 140px; color: rgba(220,38,38,0.08); font-weight: 900; letter-spacing: 12px; transform: rotate(-30deg); border: 8px solid rgba(220,38,38,0.10); padding: 12px 40px; }
  .box { border: 1px solid #000; }
  .box + .box { border-top: 0; }
  .row { display: flex; }
  .col { border-right: 1px solid #000; padding: 4px 6px; flex: 1; min-height: 22px; }
  .col:last-child { border-right: 0; }
  .lbl { font-size: 6.5pt; text-transform: uppercase; color: #333; display: block; letter-spacing: 0.3px; }
  .val { font-size: 9.5pt; font-weight: 600; line-height: 1.15; }
  .strong { font-weight: 700; }
  .c { text-align: center; }
  .r { text-align: right; }
  .muted { color: #666; }
  .header { display: grid; grid-template-columns: 22% 46% 32%; }
  .header > div { padding: 8px; border-right: 1px solid #000; }
  .header > div:last-child { border-right: 0; }
  .brand { display: flex; align-items: center; justify-content: center; text-align: center; font-weight: 800; font-size: 11pt; line-height: 1.15; }
  .title { text-align: center; }
  .title .t1 { font-size: 14pt; font-weight: 800; letter-spacing: 1px; }
  .title .t2 { font-size: 9pt; margin-top: 2px; }
  .title .meta { margin-top: 4px; font-size: 8.5pt; }
  .barcode { font-family: 'Libre Barcode 128', 'Courier New', monospace; font-size: 26pt; letter-spacing: 1px; text-align: center; line-height: 1; overflow: hidden; }
  .chave { font-family: 'Courier New', monospace; font-size: 8.5pt; text-align: center; margin-top: 4px; word-break: break-all; }
  table.itens { width: 100%; border-collapse: collapse; }
  table.itens th, table.itens td { border: 1px solid #000; padding: 3px 4px; font-size: 8pt; }
  table.itens thead th { background: #eaeaea; font-weight: 700; text-align: center; }
  .section-title { background: #eaeaea; padding: 3px 6px; font-size: 7.5pt; font-weight: 700; text-transform: uppercase; border-bottom: 1px solid #000; }
  .amb-hom { background: #fff3cd; border: 2px dashed #b45309; padding: 6px 10px; text-align: center; font-weight: 800; font-size: 10pt; color: #7c2d12; margin-bottom: 6px; letter-spacing: 1px; }
  @media print { .noprint { display: none !important; } .amb-hom { background: #fff3cd !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  .noprint { position: fixed; top: 12px; right: 12px; z-index: 10; }
  .noprint button { padding: 8px 14px; background: #111; color: #fff; border: 0; border-radius: 4px; cursor: pointer; font-size: 12px; }
</style>
</head>
<body>
<div class="wm"><span>SIMULAÇÃO</span></div>
<div class="noprint"><button onclick="window.print()">Imprimir / Salvar PDF</button></div>
<div class="wrap">
${isHom ? '<div class="amb-hom">⚠ AMBIENTE DE HOMOLOGAÇÃO / SIMULAÇÃO — SEM VALOR FISCAL</div>' : ''}

<!-- CABEÇALHO -->
<div class="box">
  <div class="header">
    <div class="brand">${esc(emit.nome_fantasia ?? emit.razao_social ?? 'EMITENTE')}</div>
    <div class="title">
      <div class="t1">DANFE</div>
      <div class="t2">Documento Auxiliar da Nota Fiscal Eletrônica</div>
      <div class="meta">
        <div>0 - ENTRADA &nbsp; <strong>1 - SAÍDA</strong></div>
        <div style="margin-top:4px">Nº <strong>${String(d.numero ?? 0).padStart(9, '0')}</strong> &nbsp; Série <strong>${String(d.serie ?? 1).padStart(3, '0')}</strong></div>
        <div style="margin-top:2px">Folha 1/1</div>
      </div>
    </div>
    <div>
      <span class="lbl">Controle do Fisco</span>
      <div class="barcode">*${(d.chave_acesso ?? '').replace(/\D/g, '').slice(0, 44)}*</div>
      <div class="chave">${chaveFmt}</div>
    </div>
  </div>
</div>

<div class="box">
  <div class="row">
    <div class="col" style="flex:2"><span class="lbl">Natureza da operação</span><span class="val">${esc(d.natureza_operacao ?? 'VENDA DE MERCADORIA')}</span></div>
    <div class="col"><span class="lbl">Protocolo de autorização</span><span class="val">${esc(d.protocolo ?? '—')}</span></div>
    <div class="col"><span class="lbl">Data/Hora emissão</span><span class="val">${fmtDate(d.data_emissao)}</span></div>
  </div>
  <div class="row" style="border-top:1px solid #000">
    <div class="col"><span class="lbl">CNPJ</span><span class="val">${emitCnpjFmt || '—'}</span></div>
    <div class="col"><span class="lbl">Inscrição Estadual</span><span class="val">${esc(emit.inscricao_estadual ?? '—')}</span></div>
    <div class="col"><span class="lbl">Ambiente</span><span class="val">${isHom ? 'HOMOLOGAÇÃO' : 'PRODUÇÃO'}</span></div>
  </div>
</div>

<!-- EMITENTE -->
<div class="box">
  <div class="section-title">Emitente</div>
  <div class="row">
    <div class="col" style="flex:2"><span class="lbl">Razão social</span><span class="val strong">${esc(emit.razao_social ?? '—')}</span></div>
    <div class="col"><span class="lbl">Nome fantasia</span><span class="val">${esc(emit.nome_fantasia ?? '—')}</span></div>
  </div>
  <div class="row" style="border-top:1px solid #000">
    <div class="col" style="flex:3"><span class="lbl">Endereço</span><span class="val">${esc(enderecoLinha(emit)) || '—'}</span></div>
    <div class="col"><span class="lbl">Telefone</span><span class="val">${esc(emit.telefone ?? '—')}</span></div>
  </div>
</div>

<!-- DESTINATÁRIO -->
<div class="box">
  <div class="section-title">Destinatário / Remetente</div>
  <div class="row">
    <div class="col" style="flex:2"><span class="lbl">Nome / Razão social</span><span class="val strong">${esc(dest.razao_social ?? dest.nome ?? '—')}</span></div>
    <div class="col"><span class="lbl">${dest.cnpj ? 'CNPJ' : 'CPF / CNPJ'}</span><span class="val">${destDocFmt || '—'}</span></div>
    <div class="col"><span class="lbl">Inscrição Estadual</span><span class="val">${esc(dest.inscricao_estadual ?? 'ISENTO')}</span></div>
  </div>
  <div class="row" style="border-top:1px solid #000">
    <div class="col" style="flex:3"><span class="lbl">Endereço</span><span class="val">${esc(enderecoLinha(dest)) || '—'}</span></div>
    <div class="col"><span class="lbl">E-mail</span><span class="val">${esc(dest.email ?? '—')}</span></div>
  </div>
</div>

<!-- CÁLCULO DO IMPOSTO -->
<div class="box">
  <div class="section-title">Cálculo do imposto</div>
  <div class="row">
    <div class="col"><span class="lbl">Base cálc. ICMS</span><span class="val">0,00</span></div>
    <div class="col"><span class="lbl">Valor do ICMS</span><span class="val">0,00</span></div>
    <div class="col"><span class="lbl">Base cálc. ICMS-ST</span><span class="val">0,00</span></div>
    <div class="col"><span class="lbl">Valor ICMS-ST</span><span class="val">0,00</span></div>
    <div class="col"><span class="lbl">Valor total produtos</span><span class="val">${fmtMoney(totalProd)}</span></div>
  </div>
  <div class="row" style="border-top:1px solid #000">
    <div class="col"><span class="lbl">Frete</span><span class="val">0,00</span></div>
    <div class="col"><span class="lbl">Seguro</span><span class="val">0,00</span></div>
    <div class="col"><span class="lbl">Desconto</span><span class="val">0,00</span></div>
    <div class="col"><span class="lbl">Outras despesas</span><span class="val">0,00</span></div>
    <div class="col" style="background:#f4f4f4"><span class="lbl">Valor total da nota</span><span class="val strong" style="font-size:11pt">R$ ${fmtMoney(valorNF)}</span></div>
  </div>
</div>

<!-- TRANSPORTADOR -->
<div class="box">
  <div class="section-title">Transportador / Volumes transportados</div>
  <div class="row">
    <div class="col" style="flex:2"><span class="lbl">Razão social</span><span class="val">—</span></div>
    <div class="col"><span class="lbl">Frete por conta</span><span class="val">9 - Sem frete</span></div>
    <div class="col"><span class="lbl">Placa veículo</span><span class="val">—</span></div>
    <div class="col"><span class="lbl">UF</span><span class="val">—</span></div>
  </div>
</div>

<!-- ITENS -->
<div class="box">
  <div class="section-title">Dados dos produtos / serviços</div>
  <table class="itens">
    <thead>
      <tr>
        <th style="width:6%">Cód.</th>
        <th>Descrição do produto / serviço</th>
        <th style="width:9%">NCM</th>
        <th style="width:6%">CFOP</th>
        <th style="width:5%">Un.</th>
        <th style="width:9%">Qtd.</th>
        <th style="width:11%">Vlr. Unit.</th>
        <th style="width:11%">Vlr. Total</th>
      </tr>
    </thead>
    <tbody>${itensRows}</tbody>
  </table>
</div>

<!-- INFORMAÇÕES COMPLEMENTARES -->
<div class="box">
  <div class="section-title">Informações complementares</div>
  <div class="col" style="border:0; min-height:70px">
    <span class="val" style="font-weight:400; font-size:8.5pt">
      ${esc(d.observacoes ?? '')}
      ${isHom ? '<br><strong>Emitida em ambiente de homologação — SEM VALOR FISCAL.</strong>' : ''}
      <br>Documento gerado pelo NOVUS ERP • Modo simulação (FISCAL_MOCK).
    </span>
  </div>
</div>

</div>
</body></html>`;
};

// Auxiliares fiscais simulados para validar o fluxo antes da homologacao real.
// Nunca substituem o PDF autorizado pelo provedor/SEFAZ.

export interface DanfeMockEndereco {
  logradouro?: string | null;
  endereco?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  cep?: string | null;
}

export interface DanfeMockEmitente extends DanfeMockEndereco {
  nome?: string | null;
  razao_social?: string | null;
  nome_fantasia?: string | null;
  cnpj?: string | null;
  inscricao_estadual?: string | null;
  telefone?: string | null;
  email?: string | null;
  logo_url?: string | null;
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

export interface DanfeMockMDFe {
  uf_inicio?: string | null;
  uf_fim?: string | null;
  municipios_carregamento?: Array<{ codigo?: string; nome?: string }>;
  municipios_descarregamento?: Array<{ codigo?: string; nome?: string }>;
  percursos?: string[];
  valor_total_carga?: number | null;
  peso_bruto?: number | null;
  unidade_peso?: string | null;
  descricao_produto_predominante?: string | null;
  veiculo_tracao?: { placa?: string; renavam?: string; uf_licenciamento?: string; tara?: number };
  condutores?: Array<{ nome?: string; cpf?: string }>;
  documentos?: Array<{ tipo?: string; chave_acesso?: string; nome_municipio_descarregamento?: string }>;
}

export interface DanfeMockData {
  tipo?: 'NFE' | 'NFCE' | 'MDFE';
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
  pagamentos?: Array<{ nome?: string | null; valor?: number | null }>;
  mdfe?: DanfeMockMDFe | null;
  observacoes?: string | null;
}

const money = (v?: number | null) => (v ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const qty = (v?: number | null) => (v ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
const esc = (v: unknown) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const digits = (v?: string | null) => (v ?? '').replace(/\D/g, '');
const key = (v?: string | null) => digits(v).replace(/(.{4})/g, '$1 ').trim();
const date = (v?: string | null) => {
  if (!v) return '';
  const parsed = new Date(v);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toLocaleString('pt-BR');
};
const doc = (v?: string | null) => {
  const value = digits(v);
  if (value.length === 14) return value.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  if (value.length === 11) return value.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  return v ?? '';
};
const address = (e: DanfeMockEndereco) => [
  [e.logradouro ?? e.endereco, e.numero].filter(Boolean).join(', '), e.complemento, e.bairro,
  [e.cidade, e.estado].filter(Boolean).join(' - '), e.cep,
].filter(Boolean).join(' • ');
const companyName = (e: DanfeMockEmitente) => e.razao_social ?? e.nome_fantasia ?? e.nome ?? 'EMITENTE';
const logo = (e: DanfeMockEmitente) => e.logo_url
  ? `<img class="logo" src="${esc(e.logo_url)}" alt="Logo de ${esc(companyName(e))}">`
  : `<div class="logo-fallback">${esc(companyName(e))}</div>`;
const homologation = (d: DanfeMockData) => (d.ambiente ?? '').toLowerCase() !== 'production';

const printAction = '<div class="no-print"><button onclick="window.print()">Imprimir / salvar PDF</button></div>';
const warning = '<div class="warning">AMBIENTE DE HOMOLOGAÇÃO / SIMULAÇÃO — SEM VALOR FISCAL</div>';
const watermark = '<div class="watermark">SIMULAÇÃO</div>';

const baseCss = `
  *{box-sizing:border-box} body{margin:0;background:#eef0f2;color:#111;font-family:Arial,Helvetica,sans-serif}
  .page{background:#fff;margin:16px auto;position:relative}.no-print{position:fixed;right:18px;top:18px;z-index:10}
  .no-print button{border:0;border-radius:6px;background:#111;color:#fff;padding:10px 15px;font-weight:700;cursor:pointer}
  .warning{border:2px solid #9a3412;background:#fff7ed;color:#7c2d12;padding:7px;text-align:center;font-size:9pt;font-weight:800;letter-spacing:.5px;margin-bottom:5px}
  .watermark{position:fixed;inset:45% 0 auto;text-align:center;transform:rotate(-28deg);font-size:78pt;font-weight:900;letter-spacing:10px;color:rgba(185,28,28,.07);pointer-events:none;z-index:2}
  .box{border:1px solid #111;margin-top:3px}.row{display:flex}.cell{flex:1;padding:4px 5px;border-right:1px solid #111}.cell:last-child{border-right:0}
  .row+.row{border-top:1px solid #111}.label{display:block;text-transform:uppercase;font-size:6pt;color:#444;letter-spacing:.25px}.value{display:block;font-size:8.5pt;font-weight:700;line-height:1.25;min-height:10px}
  .section{background:#e5e7eb;border-bottom:1px solid #111;padding:3px 5px;text-transform:uppercase;font-size:6.5pt;font-weight:800;letter-spacing:.35px}
  .logo{display:block;max-width:100%;max-height:24mm;object-fit:contain;margin:auto}.logo-fallback{text-align:center;font-size:11pt;font-weight:800}
  .key{font:700 8pt Consolas,'Courier New',monospace;letter-spacing:.35px;word-break:break-word}.center{text-align:center}.right{text-align:right}
  table{width:100%;border-collapse:collapse}th,td{border:1px solid #111;padding:3px 4px;font-size:7pt}th{background:#e5e7eb;text-transform:uppercase;font-size:6pt}
  @media print{body{background:#fff}.page{margin:0}.no-print{display:none}.warning{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
`;

const itemRows = (d: DanfeMockData) => d.itens.length ? d.itens.map((item, index) => {
  const total = item.valor_total ?? (item.quantidade ?? 0) * (item.preco_unitario ?? 0);
  return `<tr><td class="center">${esc(item.codigo ?? String(index + 1).padStart(3, '0'))}</td><td>${esc(item.descricao)}</td><td class="center">${esc(item.ncm)}</td><td class="center">${esc(item.cfop)}</td><td class="center">${esc(item.unidade ?? 'UN')}</td><td class="right">${qty(item.quantidade)}</td><td class="right">${money(item.preco_unitario)}</td><td class="right">${money(total)}</td></tr>`;
}).join('') : '<tr><td colspan="8" class="center">Sem itens registrados</td></tr>';

export const buildNFeMockXml = (d: DanfeMockData): string => {
  const model = d.tipo === 'NFCE' ? 65 : 55;
  const items = d.itens.map((item, index) => `<det nItem="${index + 1}"><prod><cProd>${esc(item.codigo ?? index + 1)}</cProd><xProd>${esc(item.descricao)}</xProd><NCM>${esc(item.ncm)}</NCM><CFOP>${esc(item.cfop)}</CFOP><uCom>${esc(item.unidade ?? 'UN')}</uCom><qCom>${(item.quantidade ?? 0).toFixed(4)}</qCom><vUnCom>${(item.preco_unitario ?? 0).toFixed(4)}</vUnCom><vProd>${(item.valor_total ?? 0).toFixed(2)}</vProd></prod></det>`).join('');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<!-- SIMULAÇÃO SEM VALIDADE FISCAL -->\n<nfeProc versao="4.00" xmlns="http://www.portalfiscal.inf.br/nfe"><NFe><infNFe Id="NFe${esc(d.chave_acesso)}" versao="4.00"><ide><natOp>${esc(d.natureza_operacao ?? 'VENDA')}</natOp><mod>${model}</mod><serie>${d.serie ?? 1}</serie><nNF>${d.numero ?? 0}</nNF><dhEmi>${esc(d.data_emissao)}</dhEmi><tpAmb>2</tpAmb></ide><emit><CNPJ>${digits(d.emitente.cnpj)}</CNPJ><xNome>${esc(companyName(d.emitente))}</xNome><IE>${esc(d.emitente.inscricao_estadual)}</IE></emit>${items}<total><ICMSTot><vProd>${(d.valor_total ?? 0).toFixed(2)}</vProd><vNF>${(d.valor_total ?? 0).toFixed(2)}</vNF></ICMSTot></total></infNFe></NFe></nfeProc>`;
};

export const buildMDFeMockXml = (d: DanfeMockData): string => {
  const m = d.mdfe ?? {};
  const documents = m.documentos?.map(item => `<infMunDescarga><xMunDescarga>${esc(item.nome_municipio_descarregamento)}</xMunDescarga><infNFe><chNFe>${digits(item.chave_acesso)}</chNFe></infNFe></infMunDescarga>`).join('') ?? '';
  return `<?xml version="1.0" encoding="UTF-8"?>\n<!-- SIMULAÇÃO SEM VALIDADE FISCAL -->\n<mdfeProc versao="3.00" xmlns="http://www.portalfiscal.inf.br/mdfe"><MDFe><infMDFe Id="MDFe${digits(d.chave_acesso)}" versao="3.00"><ide><mod>58</mod><serie>${d.serie ?? 1}</serie><nMDF>${d.numero ?? 0}</nMDF><dhEmi>${esc(d.data_emissao)}</dhEmi><UFIni>${esc(m.uf_inicio)}</UFIni><UFFim>${esc(m.uf_fim)}</UFFim><tpAmb>2</tpAmb></ide><emit><CNPJ>${digits(d.emitente.cnpj)}</CNPJ><xNome>${esc(companyName(d.emitente))}</xNome><IE>${esc(d.emitente.inscricao_estadual)}</IE></emit><infDoc>${documents}</infDoc><tot><qNFe>${m.documentos?.length ?? 0}</qNFe><vCarga>${(m.valor_total_carga ?? d.valor_total ?? 0).toFixed(2)}</vCarga><cUnid>${esc(m.unidade_peso ?? '01')}</cUnid><qCarga>${(m.peso_bruto ?? 0).toFixed(4)}</qCarga></tot></infMDFe></MDFe></mdfeProc>`;
};

export const buildDanfeMockHtml = (d: DanfeMockData): string => {
  const e = d.emitente;
  const customer = d.destinatario;
  const totalProducts = d.itens.reduce((sum, item) => sum + (item.valor_total ?? 0), 0);
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>DANFE ${esc(d.numero)}</title><style>@page{size:A4;margin:7mm}${baseCss}.page{width:196mm;min-height:283mm;padding:0 1mm}.header{display:grid;grid-template-columns:34% 27% 39%;border:1px solid #111}.header>div{padding:6px;border-right:1px solid #111}.header>div:last-child{border:0}.title{font-size:15pt;font-weight:900;letter-spacing:1px}.subtitle{font-size:7pt;line-height:1.3}.number{margin-top:5px;font-size:10pt;font-weight:800}.receipt{height:16mm;font-size:6.5pt;padding:4px;border:1px solid #111;border-bottom:0}.receipt-sign{display:grid;grid-template-columns:55% 20% 25%;margin-top:5px;border-top:1px solid #111}.receipt-sign span{padding:2px;border-right:1px solid #111}.receipt-sign span:last-child{border:0}.totals .value{font-size:10pt}</style></head><body>${printAction}${watermark}<main class="page">${homologation(d) ? warning : ''}
  <div class="receipt">RECEBEMOS DE <strong>${esc(companyName(e))}</strong> OS PRODUTOS/SERVIÇOS CONSTANTES DA NOTA FISCAL INDICADA AO LADO.<div class="receipt-sign"><span>DATA DE RECEBIMENTO</span><span>IDENTIFICAÇÃO E ASSINATURA</span><span class="center"><strong>NF-e Nº ${String(d.numero ?? 0).padStart(9, '0')}<br>SÉRIE ${String(d.serie ?? 1).padStart(3, '0')}</strong></span></div></div>
  <header class="header"><div>${logo(e)}<div class="center"><strong>${esc(companyName(e))}</strong><br><span class="subtitle">${esc(address(e))}<br>${esc(e.telefone)} ${e.email ? `• ${esc(e.email)}` : ''}</span></div></div><div class="center"><div class="title">DANFE</div><div class="subtitle">Documento Auxiliar da Nota Fiscal Eletrônica</div><div class="number">1 — SAÍDA<br>Nº ${String(d.numero ?? 0).padStart(9, '0')}<br>SÉRIE ${String(d.serie ?? 1).padStart(3, '0')} · FOLHA 1/1</div></div><div><span class="label">Controle do Fisco / Chave de acesso</span><div class="key center">${key(d.chave_acesso) || 'CHAVE GERADA PELO PROVEDOR NA HOMOLOGAÇÃO'}</div><p class="subtitle center">Consulta de autenticidade no portal nacional da NF-e</p><span class="label">Protocolo de autorização</span><span class="value">${esc(d.protocolo ?? 'PENDENTE DE HOMOLOGAÇÃO')}</span></div></header>
  <section class="box"><div class="row"><div class="cell" style="flex:2"><span class="label">Natureza da operação</span><span class="value">${esc(d.natureza_operacao ?? 'VENDA DE MERCADORIA')}</span></div><div class="cell"><span class="label">Data e hora da emissão</span><span class="value">${date(d.data_emissao)}</span></div></div><div class="row"><div class="cell"><span class="label">CNPJ</span><span class="value">${doc(e.cnpj)}</span></div><div class="cell"><span class="label">Inscrição estadual</span><span class="value">${esc(e.inscricao_estadual ?? '—')}</span></div><div class="cell"><span class="label">Ambiente</span><span class="value">${homologation(d) ? 'HOMOLOGAÇÃO' : 'PRODUÇÃO'}</span></div></div></section>
  <section class="box"><div class="section">Destinatário / remetente</div><div class="row"><div class="cell" style="flex:2"><span class="label">Nome / razão social</span><span class="value">${esc(customer.razao_social ?? customer.nome ?? '—')}</span></div><div class="cell"><span class="label">CPF / CNPJ</span><span class="value">${doc(customer.cnpj ?? customer.cpf)}</span></div><div class="cell"><span class="label">Inscrição estadual</span><span class="value">${esc(customer.inscricao_estadual ?? 'ISENTO')}</span></div></div><div class="row"><div class="cell" style="flex:3"><span class="label">Endereço</span><span class="value">${esc(address(customer) || '—')}</span></div><div class="cell"><span class="label">E-mail / telefone</span><span class="value">${esc([customer.email, customer.telefone].filter(Boolean).join(' • ') || '—')}</span></div></div></section>
  <section class="box totals"><div class="section">Cálculo do imposto</div><div class="row"><div class="cell"><span class="label">Base ICMS</span><span class="value">0,00</span></div><div class="cell"><span class="label">Valor ICMS</span><span class="value">0,00</span></div><div class="cell"><span class="label">Total produtos</span><span class="value">R$ ${money(totalProducts)}</span></div><div class="cell"><span class="label">Valor total da NF-e</span><span class="value">R$ ${money(d.valor_total ?? totalProducts)}</span></div></div></section>
  <section class="box"><div class="section">Dados dos produtos / serviços</div><table><thead><tr><th>Cód.</th><th>Descrição</th><th>NCM</th><th>CFOP</th><th>Un.</th><th>Qtd.</th><th>Vlr. unit.</th><th>Vlr. total</th></tr></thead><tbody>${itemRows(d)}</tbody></table></section>
  <section class="box"><div class="section">Informações complementares</div><div style="min-height:26mm;padding:5px;font-size:7.5pt">${esc(d.observacoes)}<br><strong>Documento simulado pelo NOVUS ERP; código de barras e protocolo oficiais são gerados pelo provedor fiscal.</strong></div></section>
</main></body></html>`;
};

export const buildDanfceMockHtml = (d: DanfeMockData): string => {
  const e = d.emitente;
  const customerDoc = doc(d.destinatario.cnpj ?? d.destinatario.cpf);
  const items = d.itens.map((item, index) => `<tr><td>${esc(item.codigo ?? index + 1)} ${esc(item.descricao)}<br><small>${qty(item.quantidade)} ${esc(item.unidade ?? 'UN')} × ${money(item.preco_unitario)}</small></td><td class="right"><strong>${money(item.valor_total)}</strong></td></tr>`).join('');
  const payments = d.pagamentos?.length ? d.pagamentos.map(p => `<div class="line"><span>${esc(p.nome ?? 'Pagamento')}</span><strong>R$ ${money(p.valor)}</strong></div>`).join('') : `<div class="line"><span>Valor pago</span><strong>R$ ${money(d.valor_total)}</strong></div>`;
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>DANFCE ${esc(d.numero)}</title><style>@page{size:80mm auto;margin:3mm}${baseCss}.page{width:80mm;min-height:140mm;padding:4mm;font-size:8pt}.logo{max-width:48mm;max-height:16mm}.company{text-align:center;line-height:1.35}.doc-title{text-align:center;border-top:1px dashed #111;border-bottom:1px dashed #111;margin:8px 0;padding:6px 0;font-weight:900}.consumer{text-align:center;padding:5px}.line{display:flex;justify-content:space-between;gap:8px;padding:2px 0}.total{font-size:12pt;border-top:1px solid #111;margin-top:4px;padding-top:5px}.qr{border:1px solid #111;padding:10px;margin:8px auto;text-align:center;font-size:7pt;max-width:58mm}.key{font-size:7pt}table td{border:0;border-bottom:1px dotted #aaa;padding:4px 0}small{font-size:7pt;color:#444}</style></head><body>${printAction}${watermark}<main class="page">${homologation(d) ? warning : ''}<div class="company">${logo(e)}<strong>${esc(companyName(e))}</strong><br>CNPJ ${doc(e.cnpj)} · IE ${esc(e.inscricao_estadual ?? '—')}<br><small>${esc(address(e))}<br>${esc(e.telefone)}</small></div><div class="doc-title">DANFCE — DOCUMENTO AUXILIAR DA NFC-e<br><small>NÃO PERMITE APROVEITAMENTO DE CRÉDITO DE ICMS</small></div><table><tbody>${items || '<tr><td>Sem itens registrados</td></tr>'}</tbody></table><div class="line"><span>Qtd. total de itens</span><strong>${d.itens.length}</strong></div><div class="line total"><span>VALOR TOTAL R$</span><strong>${money(d.valor_total)}</strong></div><div style="border-top:1px dashed #111;margin-top:6px;padding-top:4px"><strong>FORMA DE PAGAMENTO</strong>${payments}</div><div class="consumer"><strong>CONSUMIDOR</strong><br>${customerDoc || 'NÃO IDENTIFICADO'}<br>${esc(d.destinatario.nome ?? d.destinatario.razao_social)}</div><div class="center"><strong>NFC-e nº ${String(d.numero ?? 0).padStart(9, '0')} · Série ${String(d.serie ?? 1).padStart(3, '0')}</strong><br>${date(d.data_emissao)}<br><span class="key">${key(d.chave_acesso)}</span></div><div class="qr"><strong>QR CODE FISCAL</strong><br>Será incorporado ao DANFCE oficial retornado pelo provedor na homologação.</div><div class="center"><strong>Protocolo: ${esc(d.protocolo ?? 'PENDENTE DE HOMOLOGAÇÃO')}</strong><br>Documento simulado pelo NOVUS ERP — sem valor fiscal.</div></main></body></html>`;
};

export const buildDamdfeMockHtml = (d: DanfeMockData): string => {
  const e = d.emitente;
  const m = d.mdfe ?? {};
  const vehicle = m.veiculo_tracao ?? {};
  const drivers = m.condutores?.map(driver => `${esc(driver.nome)} — CPF ${doc(driver.cpf)}`).join('<br>') || '—';
  const linked = m.documentos?.map(item => `<tr><td>${esc(item.tipo ?? 'NF-e')}</td><td class="key">${key(item.chave_acesso)}</td><td>${esc(item.nome_municipio_descarregamento)}</td></tr>`).join('') || '<tr><td colspan="3" class="center">Nenhum documento vinculado</td></tr>';
  const route = [m.uf_inicio, ...(m.percursos ?? []), m.uf_fim].filter(Boolean).join(' → ');
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>DAMDFE ${esc(d.numero)}</title><style>@page{size:A4;margin:7mm}${baseCss}.page{width:196mm;min-height:283mm;padding:1mm}.header{display:grid;grid-template-columns:36% 25% 39%;border:1px solid #111}.header>div{padding:7px;border-right:1px solid #111}.header>div:last-child{border:0}.title{font-size:15pt;font-weight:900}.route{font-size:15pt;font-weight:900;text-align:center;padding:8px}.cargo .value{font-size:11pt}</style></head><body>${printAction}${watermark}<main class="page">${homologation(d) ? warning : ''}<header class="header"><div>${logo(e)}<div class="center"><strong>${esc(companyName(e))}</strong><br><small>${esc(address(e))}<br>CNPJ ${doc(e.cnpj)} · IE ${esc(e.inscricao_estadual ?? '—')}</small></div></div><div class="center"><div class="title">DAMDFE</div><small>Documento Auxiliar do Manifesto Eletrônico de Documentos Fiscais</small><p><strong>Modelo 58<br>Nº ${String(d.numero ?? 0).padStart(9, '0')}<br>Série ${String(d.serie ?? 1).padStart(3, '0')}</strong></p></div><div><span class="label">Chave de acesso</span><div class="key">${key(d.chave_acesso) || 'GERADA PELO PROVEDOR'}</div><p><span class="label">Protocolo de autorização</span><span class="value">${esc(d.protocolo ?? 'PENDENTE DE HOMOLOGAÇÃO')}</span></p><span class="label">Data e hora de emissão</span><span class="value">${date(d.data_emissao)}</span></div></header><section class="box"><div class="section">Percurso</div><div class="route">${esc(route || 'UF INICIAL → UF FINAL')}</div><div class="row"><div class="cell"><span class="label">Município(s) de carregamento</span><span class="value">${esc(m.municipios_carregamento?.map(x => x.nome).filter(Boolean).join(', ') || '—')}</span></div><div class="cell"><span class="label">Município(s) de descarregamento</span><span class="value">${esc(m.municipios_descarregamento?.map(x => x.nome).filter(Boolean).join(', ') || '—')}</span></div></div></section><section class="box cargo"><div class="section">Informações da carga</div><div class="row"><div class="cell"><span class="label">Produto predominante</span><span class="value">${esc(m.descricao_produto_predominante ?? '—')}</span></div><div class="cell"><span class="label">Valor total da carga</span><span class="value">R$ ${money(m.valor_total_carga ?? d.valor_total)}</span></div><div class="cell"><span class="label">Peso bruto</span><span class="value">${qty(m.peso_bruto)} ${m.unidade_peso === '02' ? 'TON' : 'KG'}</span></div></div></section><section class="box"><div class="section">Modal rodoviário</div><div class="row"><div class="cell"><span class="label">Placa / UF</span><span class="value">${esc(vehicle.placa ?? '—')} / ${esc(vehicle.uf_licenciamento ?? '—')}</span></div><div class="cell"><span class="label">RENAVAM</span><span class="value">${esc(vehicle.renavam ?? '—')}</span></div><div class="cell"><span class="label">Tara</span><span class="value">${qty(vehicle.tara)} kg</span></div></div><div class="row"><div class="cell"><span class="label">Condutor(es)</span><span class="value">${drivers}</span></div></div></section><section class="box"><div class="section">Documentos fiscais vinculados</div><table><thead><tr><th>Tipo</th><th>Chave de acesso</th><th>Município de descarregamento</th></tr></thead><tbody>${linked}</tbody></table></section><section class="box"><div class="section">Observações</div><div style="min-height:34mm;padding:6px;font-size:8pt">${esc(d.observacoes)}<br><strong>Documento simulado pelo NOVUS ERP; código de barras e protocolo oficiais são gerados pelo provedor fiscal.</strong></div></section></main></body></html>`;
};

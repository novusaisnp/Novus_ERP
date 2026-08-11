import { assertEquals, assertThrows } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { pagamentosToNFCe, vendaToNFePayload, VendaMapperError } from '../vendaToNFePayload.ts';

const dadosFiscais = {
  icms_situacao_tributaria: '00', icms_aliquota: 18,
  pis_situacao_tributaria: '01', pis_aliquota: 1.65,
  cofins_situacao_tributaria: '01', cofins_aliquota: 7.6,
  ibs_cbs_situacao_tributaria: '000', ibs_cbs_classificacao_tributaria: '000001',
  ibs_uf_aliquota: 0.1, ibs_mun_aliquota: 0, cbs_aliquota: 0.9,
};

const baseCtx = () => ({
  venda: {
    id: '00000000-0000-0000-0000-000000000001',
    empresa_representada_id: '00000000-0000-0000-0000-000000000010',
    cliente_id: '00000000-0000-0000-0000-000000000020',
    numero_venda: 42,
    data_venda: '2026-01-15T10:00:00-03:00',
    valor_total: 250,
    observacoes: 'Venda teste',
  },
  cliente: {
    id: '00000000-0000-0000-0000-000000000020',
    tipo_pessoa: 'juridica',
    nome: 'CLIENTE TESTE LTDA',
    razao_social: 'CLIENTE TESTE LTDA',
    cnpj: '12345678000199',
    inscricao_estadual: '123456789',
    email: 'contato@teste.com',
    logradouro: 'Rua A',
    numero: '100',
    bairro: 'Centro',
    cidade: 'São Paulo',
    estado: 'SP',
    cep: '01001000',
    qualificacao_fiscal: { indicador_ie: '1', consumidor_final: false },
  },
  empresa: {
    id: '00000000-0000-0000-0000-000000000010',
    nome: 'Novus Teste',
    cnpj: '11.222.333/0001-81',
    estado: 'SP',
  },
  itens: [
    {
      id: '00000000-0000-0000-0000-000000000100',
      descricao: 'Produto A',
      quantidade: 2,
      unidade: 'UN',
      preco_unitario: 100,
      valor_total_item: 200,
      produto: { codigo: 'P001', ncm: '22030000', origem_produto: '0', dados_fiscais: dadosFiscais },
      tipo_item: 'P',
      cfop: '5102',
    },
    {
      id: '00000000-0000-0000-0000-000000000101',
      descricao: 'Produto B',
      quantidade: 1,
      unidade: 'UN',
      preco_unitario: 50,
      valor_total_item: 50,
      produto: { codigo: 'P002', ncm: '49019900', origem_produto: '0', dados_fiscais: dadosFiscais },
      tipo_item: 'P',
    },
  ],
  configFiscal: {
    serieNfe: 1,
    naturezaOperacao: 'Venda',
    regimeTributario: 'LUCRO_PRESUMIDO',
    cnpjEmitente: '11222333000181',
    inscricaoEstadual: '123456789',
  },
});

Deno.test('vendaToNFePayload: mapeia campos essenciais', () => {
  const payload = vendaToNFePayload(baseCtx());
  assertEquals(payload.idempotencyKey, 'venda-00000000-0000-0000-0000-000000000001');
  assertEquals(payload.destinatario.cnpjCpf, '12345678000199');
  assertEquals(payload.destinatario.endereco.uf, 'SP');
  assertEquals(payload.itens.length, 2);
  assertEquals(payload.itens[0].ncm, '22030000');
  assertEquals(payload.itens[1].ncm, '49019900');
  assertEquals(payload.valorTotal, 250);
});

Deno.test('vendaToNFePayload: rejeita CNPJ inválido', () => {
  const ctx = baseCtx();
  (ctx.cliente as { cnpj: string }).cnpj = '123';
  assertThrows(() => vendaToNFePayload(ctx), VendaMapperError, 'cliente');
});

Deno.test('vendaToNFePayload: rejeita venda sem itens', () => {
  const ctx = baseCtx();
  ctx.itens = [];
  assertThrows(() => vendaToNFePayload(ctx), VendaMapperError, 'itens');
});

Deno.test('vendaToNFePayload: usa CFOP interestadual quando UFs diferem', () => {
  const ctx = baseCtx();
  (ctx.cliente as { estado: string }).estado = 'RJ';
  ctx.itens[1] = { ...ctx.itens[1], cfop: undefined };
  const payload = vendaToNFePayload(ctx);
  assertEquals(payload.itens[1].cfop, '6102');
});

Deno.test('vendaToNFePayload: rejeita NCM ausente', () => {
  const ctx = baseCtx();
  ctx.itens[1] = { ...ctx.itens[1], produto: { ...ctx.itens[1].produto, ncm: '' } };
  assertThrows(() => vendaToNFePayload(ctx), VendaMapperError, 'NCM obrigatório');
});

Deno.test('vendaToNFePayload: rejeita serviço em NF-e', () => {
  const ctx = baseCtx();
  ctx.itens[1] = { ...ctx.itens[1], tipo_item: 'S' };
  assertThrows(() => vendaToNFePayload(ctx), VendaMapperError, 'apenas produtos');
});

Deno.test('pagamentosToNFCe: converte códigos e exige total exato', () => {
  const pagamentos = pagamentosToNFCe([
    { valor_liquido: 100, bandeira: null, autorizacao_nsu: null, modalidade: { codigo: 'PIX' } },
    { valor_liquido: 150, bandeira: '01', autorizacao_nsu: 'ABC', modalidade: { codigo: 'CARTAO_CREDITO' } },
  ], 250);
  assertEquals(pagamentos, [
    { formaPagamento: '17', valorPagamento: 100, bandeiraOperadora: undefined, numeroAutorizacao: undefined },
    { formaPagamento: '03', valorPagamento: 150, bandeiraOperadora: '01', numeroAutorizacao: 'ABC' },
  ]);
  assertThrows(() => pagamentosToNFCe([
    { valor_liquido: 249, modalidade: { codigo: 'DINHEIRO' } },
  ], 250), VendaMapperError, 'Total dos pagamentos');
});

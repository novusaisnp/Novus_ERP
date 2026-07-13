import { assertEquals, assertThrows } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { vendaToNFePayload, VendaMapperError } from '../vendaToNFePayload.ts';

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
  },
  empresa: {
    id: '00000000-0000-0000-0000-000000000010',
    nome: 'Novus Teste',
    cnpj: '11.222.333/0001-81',
  },
  itens: [
    {
      id: '00000000-0000-0000-0000-000000000100',
      descricao: 'Produto A',
      quantidade: 2,
      unidade: 'UN',
      preco_unitario: 100,
      valor_total_item: 200,
      produto_codigo: 'P001',
      produto_ncm: '22030000',
      cfop: '5102',
    },
    {
      id: '00000000-0000-0000-0000-000000000101',
      descricao: 'Serviço B',
      quantidade: 1,
      unidade: 'UN',
      preco_unitario: 50,
      valor_total_item: 50,
    },
  ],
  configFiscal: { serieNfe: 1, naturezaOperacao: 'Venda' },
});

Deno.test('vendaToNFePayload: mapeia campos essenciais', () => {
  const payload = vendaToNFePayload(baseCtx());
  assertEquals(payload.idempotencyKey, 'venda-00000000-0000-0000-0000-000000000001');
  assertEquals(payload.destinatario.cnpjCpf, '12345678000199');
  assertEquals(payload.destinatario.endereco.uf, 'SP');
  assertEquals(payload.itens.length, 2);
  assertEquals(payload.itens[0].ncm, '22030000');
  assertEquals(payload.itens[1].ncm, '00000000'); // padrão quando ausente
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

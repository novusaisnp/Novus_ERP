import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  clienteCanonicalSchema,
  entidadeCanonicalSchema,
  produtoCanonicalSchema,
  vendaCanonicalSchema,
  contaReceberCanonicalSchema,
  contratoCanonicalSchema,
  estoqueMovimentacaoCanonicalSchema,
  liquidacaoCanonicalSchema,
} from '../entities.ts';

const EMPRESA = '00000000-0000-0000-0000-000000000010';

Deno.test('clienteCanonicalSchema aceita CNPJ válido para tipo J', () => {
  const result = clienteCanonicalSchema.safeParse({
    empresa_representada_id: EMPRESA,
    nome: 'ACME LTDA',
    tipo: 'J',
    cpf_cnpj: '11222333000181',
  });
  assertEquals(result.success, true);
});

Deno.test('clienteCanonicalSchema rejeita CNPJ com dígito verificador inválido', () => {
  const result = clienteCanonicalSchema.safeParse({
    empresa_representada_id: EMPRESA,
    nome: 'ACME LTDA',
    tipo: 'J',
    cpf_cnpj: '11222333000199',
  });
  assertEquals(result.success, false);
});

Deno.test('clienteCanonicalSchema rejeita CPF em cliente tipo J', () => {
  const result = clienteCanonicalSchema.safeParse({
    empresa_representada_id: EMPRESA,
    nome: 'Fulano',
    tipo: 'J',
    cpf_cnpj: '52998224725', // CPF válido, mas inválido para tipo J
  });
  assertEquals(result.success, false);
});

Deno.test('entidadeCanonicalSchema aceita PJ com papel CLIENTE', () => {
  const result = entidadeCanonicalSchema.safeParse({
    empresa_representada_id: EMPRESA,
    tipo_pessoa: 'PJ',
    nome: 'ACME LTDA',
    cnpj: '11222333000181',
    papeis: ['CLIENTE'],
  });
  assertEquals(result.success, true);
});

Deno.test('entidadeCanonicalSchema rejeita papel COLABORADOR em entidade PJ', () => {
  const result = entidadeCanonicalSchema.safeParse({
    empresa_representada_id: EMPRESA,
    tipo_pessoa: 'PJ',
    nome: 'ACME LTDA',
    cnpj: '11222333000181',
    papeis: ['COLABORADOR'],
  });
  assertEquals(result.success, false);
});

Deno.test('entidadeCanonicalSchema aceita PF com papel COLABORADOR + CLIENTE simultâneos', () => {
  const result = entidadeCanonicalSchema.safeParse({
    empresa_representada_id: EMPRESA,
    tipo_pessoa: 'PF',
    nome: 'Fulano',
    cpf: '52998224725',
    papeis: ['COLABORADOR', 'CLIENTE'],
  });
  assertEquals(result.success, true);
});

Deno.test('entidadeCanonicalSchema exige ao menos um papel', () => {
  const result = entidadeCanonicalSchema.safeParse({
    empresa_representada_id: EMPRESA,
    tipo_pessoa: 'PF',
    nome: 'Fulano',
    cpf: '52998224725',
    papeis: [],
  });
  assertEquals(result.success, false);
});

Deno.test('entidadeCanonicalSchema rejeita CPF com dígito verificador inválido', () => {
  const result = entidadeCanonicalSchema.safeParse({
    empresa_representada_id: EMPRESA,
    tipo_pessoa: 'PF',
    nome: 'Fulano',
    cpf: '52998224799',
    papeis: ['CLIENTE'],
  });
  assertEquals(result.success, false);
});

Deno.test('produtoCanonicalSchema exige preco_venda não-negativo', () => {
  const ok = produtoCanonicalSchema.safeParse({
    empresa_representada_id: EMPRESA,
    nome: 'Produto X',
    preco_venda: 10,
  });
  assertEquals(ok.success, true);

  const bad = produtoCanonicalSchema.safeParse({
    empresa_representada_id: EMPRESA,
    nome: 'Produto X',
    preco_venda: -1,
  });
  assertEquals(bad.success, false);
});

Deno.test('vendaCanonicalSchema aceita venda com origem de sistema satélite (PDV)', () => {
  const result = vendaCanonicalSchema.safeParse({
    empresa_representada_id: EMPRESA,
    data_venda: '2026-07-24',
    status: 'CONFIRMADO',
    origem_sistema: 'pdv-loja-01',
    idempotency_key: 'pdv-loja-01:venda:9981',
    itens: [
      { descricao: 'Item A', quantidade: 1, preco_unitario: 50 },
    ],
  });
  assertEquals(result.success, true);
});

Deno.test('vendaCanonicalSchema aceita vendedor_id opcional (satélite que já resolve o usuário NOVUS)', () => {
  const result = vendaCanonicalSchema.safeParse({
    empresa_representada_id: EMPRESA,
    data_venda: '2026-07-24',
    status: 'CONFIRMADO',
    origem_sistema: 'pdv-loja-01',
    vendedor_id: '00000000-0000-0000-0000-0000000000aa',
    itens: [
      { descricao: 'Item A', quantidade: 1, preco_unitario: 50 },
    ],
  });
  assertEquals(result.success, true);
});

Deno.test('vendaCanonicalSchema rejeita array de itens vazio quando presente', () => {
  const result = vendaCanonicalSchema.safeParse({
    empresa_representada_id: EMPRESA,
    data_venda: '2026-07-24',
    status: 'CONFIRMADO',
    itens: [],
  });
  assertEquals(result.success, false);
});

Deno.test('contaReceberCanonicalSchema rejeita vencimento anterior à emissão', () => {
  const result = contaReceberCanonicalSchema.safeParse({
    empresa_representada_id: EMPRESA,
    descricao: 'Mensalidade',
    valor_original: 100,
    data_emissao: '2026-08-01',
    data_vencimento: '2026-07-01',
  });
  assertEquals(result.success, false);
});

Deno.test('estoqueMovimentacaoCanonicalSchema exige localização de origem em SAIDA', () => {
  const bad = estoqueMovimentacaoCanonicalSchema.safeParse({
    empresa_representada_id: EMPRESA,
    produto_id: '00000000-0000-0000-0000-000000000200',
    tipo: 'SAIDA',
    quantidade: 5,
  });
  assertEquals(bad.success, false);

  const ok = estoqueMovimentacaoCanonicalSchema.safeParse({
    empresa_representada_id: EMPRESA,
    produto_id: '00000000-0000-0000-0000-000000000200',
    tipo: 'SAIDA',
    quantidade: 5,
    localizacao_origem_id: '00000000-0000-0000-0000-000000000300',
    venda_id: '00000000-0000-0000-0000-000000000400',
    origem_sistema: 'pdv-loja-01',
  });
  assertEquals(ok.success, true);
});

Deno.test('estoqueMovimentacaoCanonicalSchema exige origem e destino em TRANSFERENCIA', () => {
  const result = estoqueMovimentacaoCanonicalSchema.safeParse({
    empresa_representada_id: EMPRESA,
    produto_id: '00000000-0000-0000-0000-000000000200',
    tipo: 'TRANSFERENCIA',
    quantidade: 5,
    localizacao_origem_id: '00000000-0000-0000-0000-000000000300',
  });
  assertEquals(result.success, false);
});

Deno.test('liquidacaoCanonicalSchema aceita baixa simples ligada a um título de venda', () => {
  const result = liquidacaoCanonicalSchema.safeParse({
    titulo_id: '00000000-0000-0000-0000-000000000500',
    tipo_titulo: 'CONTAS_RECEBER',
    valor_pago: 87.50,
    data_pagamento: '2026-07-24',
    forma_pagamento: 'PIX',
    origem_sistema: 'pdv-loja-01',
    idempotency_key: 'pdv-loja-01:cupom:CF-000482:liquidacao',
  });
  assertEquals(result.success, true);
});

Deno.test('liquidacaoCanonicalSchema rejeita multi_baixa cuja soma diverge de valor_pago', () => {
  const result = liquidacaoCanonicalSchema.safeParse({
    titulo_id: '00000000-0000-0000-0000-000000000500',
    tipo_titulo: 'CONTAS_RECEBER',
    valor_pago: 100,
    data_pagamento: '2026-07-24',
    forma_pagamento: 'CARTAO_CREDITO',
    multi_baixa: [
      { conta_bancaria_id: '00000000-0000-0000-0000-000000000600', valor: 40 },
      { conta_bancaria_id: '00000000-0000-0000-0000-000000000601', valor: 40 },
    ],
  });
  assertEquals(result.success, false);
});

Deno.test('contratoCanonicalSchema rejeita data_fim anterior/igual a data_inicio', () => {
  const result = contratoCanonicalSchema.safeParse({
    empresa_representada_id: EMPRESA,
    titulo: 'Contrato mensalidade',
    status: 'ATIVO',
    data_inicio: '2026-01-01',
    data_fim: '2026-01-01',
  });
  assertEquals(result.success, false);
});

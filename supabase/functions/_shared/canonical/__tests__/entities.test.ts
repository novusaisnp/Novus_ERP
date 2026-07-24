import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  clienteCanonicalSchema,
  produtoCanonicalSchema,
  vendaCanonicalSchema,
  contaReceberCanonicalSchema,
  contratoCanonicalSchema,
  estoqueMovimentacaoCanonicalSchema,
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

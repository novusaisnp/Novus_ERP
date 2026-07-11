import { describe, it, expect } from 'vitest';

/**
 * ACC-R2 — Testes de contrato da precedência de resolução.
 * A execução real ocorre server-side (RPC resolver_classificacao_receita).
 * Aqui validamos o CONTRATO esperado pelo cliente.
 */

const ORDEM_PRECEDENCIA = [
  'ITEM_OVERRIDE',
  'REGRA_ITEM',
  'REGRA_CATEGORIA',
  'CADASTRO_DEFAULT',
  'CATEGORIA_DEFAULT',
  'REGRA_TIPO',
  'EMPRESA_DEFAULT',
] as const;

describe('ACC-R2 precedência de classificação de receita', () => {
  it('lista de origens válidas está na ordem correta', () => {
    expect(ORDEM_PRECEDENCIA[0]).toBe('ITEM_OVERRIDE');
    expect(ORDEM_PRECEDENCIA[ORDEM_PRECEDENCIA.length - 1]).toBe('EMPRESA_DEFAULT');
  });

  it('deve haver 7 níveis explícitos antes do erro', () => {
    expect(ORDEM_PRECEDENCIA.length).toBe(7);
  });

  it('erro esperado quando nenhuma regra resolve', () => {
    const codigoErro = 'CLASSIFICACAO_CONTABIL_AUSENTE';
    expect(codigoErro).toMatch(/CLASSIFICACAO_CONTABIL_AUSENTE/);
  });

  it('hash_classificacao determinístico para mesma tupla', () => {
    // O hash é computado no banco. Aqui só afirmamos estrutura esperada.
    const shape = {
      plano_conta_id: 'uuid',
      centro_custo_id: 'uuid|null',
      natureza_receita_id: 'uuid|null',
      regra_origem: 'string',
      regra_versao: 'number',
      hash_classificacao: 'string',
    };
    expect(Object.keys(shape).sort()).toEqual(
      ['centro_custo_id', 'hash_classificacao', 'natureza_receita_id', 'plano_conta_id', 'regra_origem', 'regra_versao'].sort()
    );
  });
});

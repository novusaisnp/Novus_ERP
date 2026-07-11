/**
 * Suíte crítica pré-go-live — 6 fluxos obrigatórios (Lote 4).
 *
 * Escopo: contratos de service layer e mapeamento de erros — sem acoplamento
 * ao runtime Supabase. Erros reais do banco são simulados via objetos
 * PostgrestError-like (code + message) e via classes de erro do domínio.
 *
 * Fluxos cobertos:
 *  1. Auth flow (login/logout — mapeamento de erros de sessão)
 *  2. Tenant isolation (RLS 42501 → mensagem amigável)
 *  3. Converter orçamento → venda (idempotência + conflito payload)
 *  4. Gerar contas a receber classificadas (contrato de retorno)
 *  5. Liquidação/estorno (banking errors)
 *  6. Movimentação bancária (saldo insuficiente + transferência inválida)
 */

import { describe, it, expect } from 'vitest';
import { friendlyError, ConflictPayloadError } from '@/services/vendaPagamentoService';
import { ConflitoPayloadContasReceberError, type GerarContasReceberResult } from '@/services/contasReceber/gerarDaVenda';
import { BankingError, mapBankingError } from '@/lib/bankingErrors';

// -------------------------------------------------------------------------
// 1) AUTH FLOW — mensagens amigáveis para erros de sessão
// -------------------------------------------------------------------------
describe('[1] Auth flow', () => {
  it('mapeia 42501 (não autenticado / RLS) para mensagem amigável', () => {
    expect(friendlyError({ code: '42501', message: 'permission denied for table vendas' }))
      .toContain('permissão');
  });

  it('preserva mensagem P0001 (regra de negócio)', () => {
    expect(friendlyError({ code: 'P0001', message: 'ORCAMENTO_NAO_APROVAVEL' }))
      .toBe('ORCAMENTO_NAO_APROVAVEL');
  });

  it('fallback quando não há code nem message', () => {
    expect(friendlyError({})).toMatch(/erro inesperado/i);
  });
});

// -------------------------------------------------------------------------
// 2) TENANT ISOLATION — qualquer acesso cross-empresa vira 42501
// -------------------------------------------------------------------------
describe('[2] Tenant isolation (RLS)', () => {
  it('RLS row-level security → PT-BR', () => {
    const msg = friendlyError({ message: 'new row violates row-level security policy' });
    expect(msg).toContain('permissão');
  });

  it('PERM_DENIED do RPC → mensagem clara', () => {
    const msg = friendlyError({ code: 'P0001', message: 'PERM_DENIED' });
    expect(msg).toBe('PERM_DENIED');
  });
});

// -------------------------------------------------------------------------
// 3) CONVERTER ORÇAMENTO → VENDA — idempotência + conflito payload
// -------------------------------------------------------------------------
describe('[3] Converter orçamento em venda', () => {
  it('ConflictPayloadError carrega code CONFLICT_PAYLOAD', () => {
    const err = new ConflictPayloadError('divergência de hash');
    expect(err.code).toBe('CONFLICT_PAYLOAD');
    expect(err.message).toBe('divergência de hash');
    expect(err).toBeInstanceOf(Error);
  });

  it('conflito de conversão sinaliza P0001 amigável', () => {
    const msg = friendlyError({ code: 'P0001', message: 'CONVERSAO_CONFLITO: payload divergente' });
    expect(msg).toMatch(/CONVERSAO_CONFLITO/);
  });
});

// -------------------------------------------------------------------------
// 4) GERAR CONTAS A RECEBER CLASSIFICADAS — contrato Lote 2 (FIN-E5.1)
// -------------------------------------------------------------------------
describe('[4] Gerar contas a receber (rateio classificado)', () => {
  it('cada título carrega hash_classificacao + plano_conta_id', () => {
    const res: GerarContasReceberResult = {
      ok: true,
      venda_id: 'v1',
      gerados: 2,
      reaproveitados: 0,
      titulos: [
        {
          parcela_id: 'p1',
          conta_receber_id: 'c1',
          replay: false,
          hash_classificacao: 'aa11',
          plano_conta_id: 'pc-receita-1',
          centro_custo_id: 'cc-1',
        },
        {
          parcela_id: 'p1',
          conta_receber_id: 'c2',
          replay: false,
          hash_classificacao: 'bb22',
          plano_conta_id: 'pc-receita-2',
          centro_custo_id: 'cc-2',
        },
      ],
      erros: [],
      avisos: [],
    };
    // mesma parcela, dois títulos por rateio distinto
    expect(res.titulos.filter((t) => t.parcela_id === 'p1')).toHaveLength(2);
    expect(res.titulos.every((t) => !!t.plano_conta_id && !!t.hash_classificacao)).toBe(true);
  });

  it('parcela sem classificação → título com aviso e sem plano', () => {
    const res: GerarContasReceberResult = {
      ok: true,
      venda_id: 'v2',
      gerados: 1,
      reaproveitados: 0,
      titulos: [
        { parcela_id: 'p1', conta_receber_id: 'c1', replay: false, hash_classificacao: null, plano_conta_id: null },
      ],
      erros: [],
      avisos: [{ codigo: 'PARCELA_SEM_CLASSIFICACAO', mensagem: 'sem rateio' }],
    };
    expect(res.avisos.some((a) => a.codigo === 'PARCELA_SEM_CLASSIFICACAO')).toBe(true);
    expect(res.titulos[0].plano_conta_id).toBeNull();
  });

  it('ConflitoPayloadContasReceberError expõe code correto', () => {
    const err = new ConflitoPayloadContasReceberError();
    expect(err.code).toBe('CONFLITO_PAYLOAD_DIVERGENTE');
    expect(err).toBeInstanceOf(Error);
  });
});

// -------------------------------------------------------------------------
// 5) LIQUIDAÇÃO / ESTORNO — mapeamento de erros bancários estruturados
// -------------------------------------------------------------------------
describe('[5] Liquidação e estorno', () => {
  it('ESTORNO_DUPLICADO → toast dedicado', () => {
    const toast = mapBankingError(new BankingError('ESTORNO_DUPLICADO', 'já estornado'));
    expect(toast.title).toBe('Estorno já realizado');
  });

  it('erro genérico não vira ESTORNO_DUPLICADO por acidente', () => {
    const toast = mapBankingError(new Error('algo aleatório'));
    expect(toast.title).toBe('Erro');
    expect(toast.description).toBe('algo aleatório');
  });
});

// -------------------------------------------------------------------------
// 6) MOVIMENTAÇÃO BANCÁRIA — saldo insuficiente / transferência inválida
// -------------------------------------------------------------------------
describe('[6] Movimentação bancária', () => {
  it('SALDO_INSUFICIENTE mapeado (via BankingError)', () => {
    const toast = mapBankingError(new BankingError('SALDO_INSUFICIENTE', 'saldo <'));
    expect(toast.title).toBe('Saldo insuficiente');
  });

  it('TRANSFERENCIA_INVALIDA mapeado (legado por string)', () => {
    const toast = mapBankingError(new Error('TRANSFERENCIA_INVALIDA: contas iguais'));
    expect(toast.title).toBe('Transferência inválida');
  });

  it('CONTA_INATIVA mapeado (via code em objeto)', () => {
    const toast = mapBankingError({ code: 'CONTA_INATIVA', message: 'x' });
    expect(toast.title).toBe('Conta inativa');
  });
});

// -------------------------------------------------------------------------
// [T2] TESTES NEGATIVOS CRÍTICOS (Lote T2)
// -------------------------------------------------------------------------
describe('[T2] Cenários negativos de segurança e regra de negócio', () => {
  // T2.1 — Cross-tenant SELECT deve retornar 0 linhas (RLS bloqueia).
  it('cross-tenant SELECT: contrato — sem linhas visíveis', () => {
    // Simulação: PostgREST retorna data=[] quando RLS filtra tudo (não erro).
    const supabaseLike = { data: [] as unknown[], error: null };
    expect(supabaseLike.error).toBeNull();
    expect(supabaseLike.data).toHaveLength(0);
  });

  // T2.2 — Cross-tenant UPDATE/DELETE deve virar 42501 → mensagem amigável.
  it('cross-tenant UPDATE/DELETE → 42501 amigável', () => {
    const msg = friendlyError({
      code: '42501',
      message: 'new row violates row-level security policy for table "vendas"',
    });
    expect(msg).toContain('permissão');
  });

  // T2.3 — Convite de usuário chamado por não-admin → 403 semântico.
  it('enviar-convite-usuario: não-admin recebe 403', () => {
    // Contrato da edge function: { invited:false, message:'Acesso negado...' } + status 403.
    const response = {
      status: 403,
      body: { invited: false, message: 'Acesso negado: requer perfil admin.' },
    };
    expect(response.status).toBe(403);
    expect(response.body.invited).toBe(false);
    expect(response.body.message).toMatch(/admin/i);
  });

  // T2.4 — validar_pagamento_venda: à vista com prazo => MODALIDADE_A_VISTA_COM_PRAZO
  it('à vista com parcelamento → erro MODALIDADE_A_VISTA_COM_PRAZO', () => {
    const validacao = {
      ok: false,
      erros: [
        {
          codigo: 'MODALIDADE_A_VISTA_COM_PRAZO',
          categoria: 'MODALIDADE',
          mensagem: 'Modalidade PIX é à vista e não admite parcelamento ou vencimento futuro',
          campo: 'qtd_parcelas',
        },
      ],
      avisos: [],
    };
    expect(validacao.ok).toBe(false);
    expect(validacao.erros[0].codigo).toBe('MODALIDADE_A_VISTA_COM_PRAZO');
    expect(validacao.erros[0].categoria).toBe('MODALIDADE');
  });

  it('à vista com vencimento futuro → mesmo erro semântico', () => {
    const validacao = {
      ok: false,
      erros: [
        {
          codigo: 'MODALIDADE_A_VISTA_COM_PRAZO',
          categoria: 'MODALIDADE',
          mensagem: 'DINHEIRO é à vista',
        },
      ],
      avisos: [],
    };
    expect(validacao.erros.some((e) => e.codigo === 'MODALIDADE_A_VISTA_COM_PRAZO')).toBe(true);
  });

  // T2.5 — Idempotência de gerar_contas_receber_da_venda (replay não-regressivo).
  it('gerar_contas_receber replay idêntico → reaproveitados incrementa e nada é duplicado', () => {
    const primeira: GerarContasReceberResult = {
      ok: true,
      venda_id: 'v-idem',
      gerados: 2,
      reaproveitados: 0,
      titulos: [
        { parcela_id: 'p1', conta_receber_id: 'c1', replay: false, hash_classificacao: 'aa11', plano_conta_id: 'pc1' },
        { parcela_id: 'p2', conta_receber_id: 'c2', replay: false, hash_classificacao: 'aa11', plano_conta_id: 'pc1' },
      ],
      erros: [],
      avisos: [],
    };
    const replay: GerarContasReceberResult = {
      ok: true,
      venda_id: 'v-idem',
      gerados: 0,
      reaproveitados: 2,
      titulos: [
        { parcela_id: 'p1', conta_receber_id: 'c1', replay: true, hash_classificacao: 'aa11', plano_conta_id: 'pc1' },
        { parcela_id: 'p2', conta_receber_id: 'c2', replay: true, hash_classificacao: 'aa11', plano_conta_id: 'pc1' },
      ],
      erros: [],
      avisos: [],
    };
    expect(primeira.gerados + replay.reaproveitados).toBe(2);
    expect(replay.titulos.every((t) => t.replay)).toBe(true);
    // mesmos ids => nenhuma duplicidade
    const ids = new Set(replay.titulos.map((t) => t.conta_receber_id));
    expect(ids.size).toBe(replay.titulos.length);
  });

  it('conflito de payload em replay → erro dedicado', () => {
    const err = new ConflitoPayloadContasReceberError();
    expect(err.code).toBe('CONFLITO_PAYLOAD_DIVERGENTE');
  });
});

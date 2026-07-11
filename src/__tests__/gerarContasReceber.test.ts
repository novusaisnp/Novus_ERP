import { describe, it, expect } from 'vitest';
import type { GerarContasReceberResult } from '@/services/contasReceber/gerarDaVenda';

describe('gerar_contas_receber_da_venda — contrato de retorno', () => {
  it('normaliza retorno com títulos gerados', () => {
    const res: GerarContasReceberResult = {
      ok: true,
      venda_id: '00000000-0000-0000-0000-000000000001',
      gerados: 3,
      reaproveitados: 0,
      titulos: [
        { parcela_id: 'p1', conta_receber_id: 'c1', replay: false },
        { parcela_id: 'p2', conta_receber_id: 'c2', replay: false },
        { parcela_id: 'p3', conta_receber_id: 'c3', replay: false },
      ],
      erros: [],
      avisos: [],
    };
    expect(res.gerados).toBe(3);
    expect(res.titulos.every((t) => !t.replay)).toBe(true);
  });

  it('trata replay idêntico', () => {
    const res: GerarContasReceberResult = {
      ok: true,
      venda_id: 'v1',
      gerados: 0,
      reaproveitados: 2,
      titulos: [
        { parcela_id: 'p1', conta_receber_id: 'c1', replay: true },
        { parcela_id: 'p2', conta_receber_id: 'c2', replay: true },
      ],
      erros: [],
      avisos: [],
    };
    expect(res.reaproveitados).toBe(2);
    expect(res.titulos.every((t) => t.replay)).toBe(true);
  });
});

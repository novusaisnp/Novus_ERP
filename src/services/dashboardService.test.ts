import { beforeEach, describe, expect, it, vi } from 'vitest';

const from = vi.fn();
const empresaAtiva = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (...args: unknown[]) => from(...args) },
}));

vi.mock('@/lib/empresaAtiva', () => ({
  getEmpresaAtivaIdOuFalha: () => empresaAtiva(),
}));

import { dashboardService } from './dashboardService';

/**
 * Zero é uma resposta sobre dinheiro. Estes testes existem para impedir que uma falha volte a
 * ser apresentada como "R$ 0,00", que é indistinguível de uma empresa sem saldo.
 */
describe('dashboardService', () => {
  beforeEach(() => {
    from.mockReset();
    empresaAtiva.mockReset();
    empresaAtiva.mockResolvedValue('empresa-1');
  });

  const mockSelect = (resultado: unknown) =>
    from.mockReturnValue({
      select: () => ({
        eq: () => ({ eq: () => Promise.resolve(resultado) }),
      }),
    });

  it('soma os títulos pendentes da empresa ativa', async () => {
    mockSelect({ data: [{ valor_original: 10 }, { valor_original: 5.5 }], error: null });

    await expect(dashboardService.fetchSumContas('contas_receber')).resolves.toBe(15.5);
  });

  it('propaga falha da consulta em vez de devolver zero', async () => {
    mockSelect({ data: null, error: { message: 'permissao negada' } });

    await expect(dashboardService.fetchSumContas('contas_pagar')).rejects.toBeTruthy();
  });

  it('propaga falha do saldo bancario em vez de devolver zero', async () => {
    mockSelect({ data: null, error: { message: 'falha de rede' } });

    await expect(dashboardService.fetchSaldoBancario()).rejects.toBeTruthy();
  });

  it('nao inventa zero quando a empresa ativa nao resolve', async () => {
    empresaAtiva.mockRejectedValue(new Error('Empresa não identificada'));

    await expect(dashboardService.fetchSaldoBancario()).rejects.toThrow('Empresa');
    expect(from).not.toHaveBeenCalled();
  });

  it('zero continua valendo quando o dado realmente e zero', async () => {
    mockSelect({ data: [], error: null });

    await expect(dashboardService.fetchSumContas('contas_receber')).resolves.toBe(0);
  });
});

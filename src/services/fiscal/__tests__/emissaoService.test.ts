import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FunctionsHttpError } from '@supabase/supabase-js';

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke } },
}));

import { emitirNFe, type FiscalFunctionError } from '../emissaoService';

const fakeResponse = (body: unknown) => ({ json: async () => body }) as unknown as Response;

describe('emissaoService invokeOrThrow (via emitirNFe)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lê o corpo estruturado de um FunctionsHttpError e expõe .code/.message', async () => {
    const body = { error: 'sefaz_indisponivel', message: 'SEFAZ fora do ar.', documento_id: 'doc-1' };
    invoke.mockResolvedValue({ data: null, error: new FunctionsHttpError(fakeResponse(body)) });

    await expect(emitirNFe({ vendaId: 'venda-1', tipo: 'NFCE' })).rejects.toMatchObject({
      message: 'SEFAZ fora do ar.',
      code: 'sefaz_indisponivel',
      documentoId: 'doc-1',
    } satisfies Partial<FiscalFunctionError>);
  });

  it('usa o campo error como mensagem quando não há message', async () => {
    const body = { error: 'duplicate_emission' };
    invoke.mockResolvedValue({ data: null, error: new FunctionsHttpError(fakeResponse(body)) });

    await expect(emitirNFe({ vendaId: 'venda-1' })).rejects.toMatchObject({
      message: 'duplicate_emission',
      code: 'duplicate_emission',
    });
  });

  it('repassa o erro original quando o corpo não é JSON válido', async () => {
    const original = new FunctionsHttpError({ json: async () => { throw new Error('not json'); } } as unknown as Response);
    invoke.mockResolvedValue({ data: null, error: original });

    await expect(emitirNFe({ vendaId: 'venda-1' })).rejects.toBe(original);
  });

  it('retorna os dados quando não há erro', async () => {
    const result = { ok: true, documento_id: 'doc-2', status: 'autorizada' };
    invoke.mockResolvedValue({ data: result, error: null });

    await expect(emitirNFe({ vendaId: 'venda-1' })).resolves.toEqual(result);
  });
});

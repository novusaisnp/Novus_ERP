import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

vi.mock('@/services/fiscal/emissaoService', () => ({
  emitirNFe: vi.fn(),
  cancelarNFe: vi.fn(),
  enviarCartaCorrecao: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), info: vi.fn(), warning: vi.fn(), error: vi.fn() },
}));

import { emitirNFe } from '@/services/fiscal/emissaoService';
import { useEmitirNFe } from '../useEmissaoNFe';

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
};

describe('useEmitirNFe', () => {
  beforeEach(() => vi.clearAllMocks());

  it('chama emitirNFe do service com o vendaId', async () => {
    (emitirNFe as unknown as Mock).mockResolvedValue({
      ok: true,
      documento_id: 'doc-1',
      status: 'processando',
      mock: true,
    });

    const { result } = renderHook(() => useEmitirNFe(), { wrapper });
    result.current.mutate({ vendaId: 'venda-42' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(emitirNFe).toHaveBeenCalledWith({ vendaId: 'venda-42' });
    expect(result.current.data?.documento_id).toBe('doc-1');
  });

  it('propaga erro quando service falha', async () => {
    (emitirNFe as unknown as Mock).mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useEmitirNFe(), { wrapper });
    result.current.mutate({ vendaId: 'venda-x' });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('boom');
  });
});

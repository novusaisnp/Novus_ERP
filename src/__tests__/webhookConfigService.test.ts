import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase client
const insertMock = vi.fn();
const updateMock = vi.fn();
const selectMock = vi.fn();
const eqMock = vi.fn();

vi.mock('@/integrations/supabase/client', () => {
  const chain: any = {
    from: vi.fn(() => chain),
    select: vi.fn(() => chain),
    insert: vi.fn(() => chain),
    update: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    order: vi.fn(() => chain),
    maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
    single: vi.fn(() => Promise.resolve({ data: { id: 'w1' }, error: null })),
    then: undefined,
  };
  // list/assertNomeUnico return arrays via awaited chain
  chain.select.mockImplementation(() => chain);
  return { supabase: chain };
});

import { webhookConfigService } from '@/services/webhookConfigService';
import { generateSecretToken } from '@/types/webhookConfig';

const VALID_EMPRESA = '00000000-0000-0000-0000-000000000001';

const validInput = () => ({
  nome: 'NOVUS_TEST',
  url_destino: 'https://api.exemplo.com/hook',
  eventos: ['cliente.created'] as any,
  ativo: true,
  metodo: 'POST' as const,
  max_tentativas: 5,
  timeout_segundos: 10,
  empresa_representada_id: VALID_EMPRESA,
});

describe('webhookConfigService — validações', () => {
  it('rejeita create sem nome', async () => {
    const bad = { ...validInput(), nome: '' } as any;
    await expect(webhookConfigService.create(bad)).rejects.toThrow();
  });

  it('rejeita create sem empresa_representada_id (uuid)', async () => {
    const bad = { ...validInput(), empresa_representada_id: '' } as any;
    await expect(webhookConfigService.create(bad)).rejects.toThrow();
  });

  it('rejeita url não-HTTPS', async () => {
    const bad = { ...validInput(), url_destino: 'http://insecure.exemplo.com' } as any;
    await expect(webhookConfigService.create(bad)).rejects.toThrow();
  });

  it('rejeita eventos vazios', async () => {
    const bad = { ...validInput(), eventos: [] } as any;
    await expect(webhookConfigService.create(bad)).rejects.toThrow();
  });
});

describe('generateSecretToken', () => {
  it('gera tokens distintos e com tamanho esperado', () => {
    const a = generateSecretToken();
    const b = generateSecretToken();
    expect(a).not.toEqual(b);
    expect(a).toHaveLength(64); // 32 bytes -> 64 hex chars
  });
});

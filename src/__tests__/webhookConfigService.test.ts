import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase client
const insertMock = vi.fn();
const updateMock = vi.fn();
const selectMock = vi.fn();
const eqMock = vi.fn();

interface SupabaseChainMock {
  from: ReturnType<typeof vi.fn>;
  select: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
}

vi.mock('@/integrations/supabase/client', () => {
  const chain = {} as SupabaseChainMock;
  chain.from = vi.fn(() => chain);
  chain.select = vi.fn(() => chain);
  chain.insert = vi.fn(() => chain);
  chain.update = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.order = vi.fn(() => chain);
  chain.maybeSingle = vi.fn(() => Promise.resolve({ data: null, error: null }));
  chain.single = vi.fn(() => Promise.resolve({ data: { id: 'w1' }, error: null }));
  return { supabase: chain };
});

import { webhookConfigService } from '@/services/webhookConfigService';
import { generateSecretToken, type WebhookConfigInput } from '@/types/webhookConfig';

const VALID_EMPRESA = '00000000-0000-0000-0000-000000000001';

const validInput = (): WebhookConfigInput => ({
  nome: 'NOVUS_TEST',
  url_destino: 'https://api.exemplo.com/hook',
  eventos: ['cliente.created'],
  ativo: true,
  metodo: 'POST' as const,
  max_tentativas: 5,
  timeout_segundos: 10,
  empresa_representada_id: VALID_EMPRESA,
});

describe('webhookConfigService — validações', () => {
  it('rejeita create sem nome', async () => {
    const bad = { ...validInput(), nome: '' };
    await expect(webhookConfigService.create(bad)).rejects.toThrow();
  });

  it('rejeita create sem empresa_representada_id (uuid)', async () => {
    const bad = { ...validInput(), empresa_representada_id: '' };
    await expect(webhookConfigService.create(bad)).rejects.toThrow();
  });

  it('rejeita url não-HTTPS', async () => {
    const bad = { ...validInput(), url_destino: 'http://insecure.exemplo.com' };
    await expect(webhookConfigService.create(bad)).rejects.toThrow();
  });

  it('rejeita eventos vazios', async () => {
    const bad = { ...validInput(), eventos: [] };
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

// Executar com: `deno test supabase/functions/_shared/fiscal/providers/__tests__/isProviderUnavailable.test.ts`

import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { isProviderUnavailable, FiscalProviderError } from '../FiscalProvider.ts';

Deno.test('isProviderUnavailable: true para erro de rede genérico', () => {
  assertEquals(isProviderUnavailable(new TypeError('fetch failed')), true);
});

Deno.test('isProviderUnavailable: true para FiscalProviderError 5xx/408', () => {
  for (const status of [408, 500, 502, 503, 504]) {
    assertEquals(isProviderUnavailable(new FiscalProviderError('falhou', status)), true);
  }
});

Deno.test('isProviderUnavailable: false para FiscalProviderError 4xx de negócio', () => {
  for (const status of [400, 401, 403, 404, 422]) {
    assertEquals(isProviderUnavailable(new FiscalProviderError('rejeitado', status)), false);
  }
});

Deno.test('isProviderUnavailable: false para valor que não é Error', () => {
  assertEquals(isProviderUnavailable('string qualquer'), false);
  assertEquals(isProviderUnavailable(null), false);
});

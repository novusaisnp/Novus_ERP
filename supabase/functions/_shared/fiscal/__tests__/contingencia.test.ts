// Executar com: `deno test supabase/functions/_shared/fiscal/__tests__/contingencia.test.ts`

import { assertEquals, assertMatch } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { gerarCodigoUnico } from '../contingencia.ts';

Deno.test('gerarCodigoUnico gera 8 dígitos numéricos', () => {
  const codigo = gerarCodigoUnico();
  assertEquals(codigo.length, 8);
  assertMatch(codigo, /^[0-9]{8}$/);
});

Deno.test('gerarCodigoUnico nunca é todo-zero', () => {
  for (let i = 0; i < 200; i++) {
    assertEquals(gerarCodigoUnico() === '00000000', false);
  }
});

Deno.test('gerarCodigoUnico produz valores distintos entre chamadas', () => {
  const valores = new Set(Array.from({ length: 20 }, () => gerarCodigoUnico()));
  assertEquals(valores.size > 1, true);
});

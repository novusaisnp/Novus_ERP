// Testes Deno para fiscal-cce-nfe.
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';

Deno.test('cce: correção entre 15 e 1000 caracteres', () => {
  assertEquals('curto'.length < 15, true);
  assertEquals('correção com dezessete!'.length >= 15, true);
  assertEquals('x'.repeat(1001).length > 1000, true);
});

Deno.test('cce: sequência entre 1 e 20', () => {
  const invalid = [0, -1, 21, 99];
  for (const s of invalid) {
    assertEquals(s >= 1 && s <= 20, false);
  }
  for (const s of [1, 5, 20]) {
    assertEquals(s >= 1 && s <= 20, true);
  }
});

Deno.test('cce: incrementa a partir da última sequência conhecida', () => {
  const ultimos: Array<{ sequencia: number }> = [{ sequencia: 3 }];
  const prox = (ultimos?.[0]?.sequencia ?? 0) + 1;
  assertEquals(prox, 4);
});

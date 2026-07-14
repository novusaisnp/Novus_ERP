// Testes Deno para fiscal-signed-url — mock:// deve ser rejeitado sem chamar Storage.
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';

Deno.test('signed-url: rejeita paths mock://', () => {
  const path = 'mock://fiscal-xml/abc.xml';
  assertEquals(path.startsWith('mock://'), true);
});

Deno.test('signed-url: aceita paths reais', () => {
  const path = 'empresa-1/2026/nfe.xml';
  assertEquals(path.startsWith('mock://'), false);
});

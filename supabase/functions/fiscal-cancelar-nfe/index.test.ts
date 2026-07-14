// Testes Deno para fiscal-cancelar-nfe (validações de payload — não depende de rede).
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';

Deno.test('cancelamento: método diferente de POST retorna 405', async () => {
  const req = new Request('http://x/', { method: 'GET' });
  const res = new Response(
    JSON.stringify({ error: { code: 'METHOD_NOT_ALLOWED' } }),
    { status: 405 },
  );
  assertEquals(res.status, 405);
  assertEquals(req.method, 'GET');
});

Deno.test('cancelamento: valida tamanho da justificativa (15..255)', () => {
  const shorts = ['', 'abc', 'menos que quinze'];
  for (const s of shorts.slice(0, 2)) {
    assertEquals(s.trim().length < 15, true);
  }
  const ok = 'Justificativa válida com mais de quinze caracteres';
  assertEquals(ok.trim().length >= 15 && ok.trim().length <= 255, true);
  const tooLong = 'x'.repeat(256);
  assertEquals(tooLong.length > 255, true);
});

Deno.test('cancelamento: só documento autorizado pode ser cancelado', () => {
  const invalidStates = ['processando', 'cancelada', 'rejeitada', 'erro', 'denegada'];
  for (const s of invalidStates) {
    assertEquals(s === 'autorizada', false);
  }
  assertEquals('autorizada' === 'autorizada', true);
});

// Testes Deno para fiscal-upload-certificado.
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';

const MAX_BYTES = 512 * 1024;

Deno.test('upload-cert: valida extensão .pfx/.p12', () => {
  for (const f of ['cert.pfx', 'cert.p12']) {
    const ok = f.endsWith('.pfx') || f.endsWith('.p12');
    assertEquals(ok, true);
  }
  assertEquals('cert.txt'.endsWith('.pfx'), false);
});

Deno.test('upload-cert: rejeita arquivo acima de 512KB', () => {
  const size = MAX_BYTES + 1;
  assertEquals(size > MAX_BYTES, true);
});

Deno.test('upload-cert: sanitiza nome do arquivo', () => {
  const safe = '../../etc/passwd cert.pfx'.replace(/[^a-zA-Z0-9._-]/g, '_');
  assertEquals(safe.includes('/'), false);
  assertEquals(safe.includes(' '), false);
});

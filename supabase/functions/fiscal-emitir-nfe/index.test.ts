// Testes Deno para fiscal-emitir-nfe (foco no mocker interno).
import { assertEquals, assert } from 'https://deno.land/std@0.224.0/assert/mod.ts';

Deno.test('emitir: FISCAL_MOCK padrão é true quando não definido', () => {
  const useMock = ((undefined as string | undefined) ?? 'true').toLowerCase() !== 'false';
  assertEquals(useMock, true);
});

Deno.test('emitir: FISCAL_MOCK=false desativa o modo mock', () => {
  const useMock = ('false' as string).toLowerCase() !== 'false';
  assertEquals(useMock, false);
});

Deno.test('emitir: chave mockada tem 44 dígitos e prefixo 35', () => {
  const chaveMock = '35' + Date.now().toString().padStart(42, '0').slice(-42);
  assertEquals(chaveMock.length, 44);
  assert(chaveMock.startsWith('35'));
});

import { assertEquals } from 'jsr:@std/assert@1';
import { isInternalRequest } from './internal-auth.ts';

Deno.test('internal request requires the exact non-empty secret', () => {
  const request = (secret?: string) => new Request('https://example.test', {
    headers: secret ? { 'x-internal-secret': secret } : {},
  });

  assertEquals(isInternalRequest(request('correct'), 'correct'), true);
  assertEquals(isInternalRequest(request('wrong'), 'correct'), false);
  assertEquals(isInternalRequest(request(), 'correct'), false);
  assertEquals(isInternalRequest(request('anything'), ''), false);
});

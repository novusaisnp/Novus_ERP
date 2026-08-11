import { hmacSha256Hex, retryDelaySeconds } from './outbound-webhook.ts';

Deno.test('retry usa backoff exponencial com teto de uma hora', () => {
  if (retryDelaySeconds(1) !== 60 || retryDelaySeconds(3) !== 240 || retryDelaySeconds(20) !== 3600) {
    throw new Error('backoff inesperado');
  }
});

Deno.test('HMAC SHA-256 assina exatamente o corpo transmitido', async () => {
  const signature = await hmacSha256Hex('NOVUS', 'secret');
  if (signature !== '24be1c9a09ae5228c431dd8cf41fea6dbef4dd0f2e1d25382cc282920402f4c4') {
    throw new Error(`assinatura inesperada: ${signature}`);
  }
});

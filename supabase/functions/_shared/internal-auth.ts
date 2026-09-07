const encoder = new TextEncoder();

export function isInternalRequest(
  req: Request,
  expected = Deno.env.get('INTERNAL_FUNCTION_SECRET') ?? '',
): boolean {
  const actualBytes = encoder.encode(req.headers.get('x-internal-secret') ?? '');
  const expectedBytes = encoder.encode(expected);
  let diff = actualBytes.length ^ expectedBytes.length;

  for (let index = 0; index < Math.max(actualBytes.length, expectedBytes.length); index++) {
    diff |= (actualBytes[index] ?? 0) ^ (expectedBytes[index] ?? 0);
  }

  return expectedBytes.length > 0 && diff === 0;
}
